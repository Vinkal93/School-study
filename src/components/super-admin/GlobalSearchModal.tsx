"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Users,
  GraduationCap,
  Shield,
  Banknote,
  Receipt,
  Loader2,
  X,
  ArrowRight,
  CornerDownLeft,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Command,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs, query as firestoreQuery, where, limit } from "firebase/firestore";
import {
  SCHOOL_ADMIN_NAV_ITEMS,
  SUPER_ADMIN_NAV_ITEMS,
} from "@/lib/search/navigation-items";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
}

export interface UnifiedSearchResultItem {
  id: string;
  type: string;
  category?: string;
  name: string;
  subtitle: string;
  schoolName?: string;
  schoolCode?: string;
  badge?: string;
  badgeColor?: string;
  status?: string;
  url: string;
  score?: number;
  metadata?: Record<string, any>;
}

// In-memory client search cache with 30s TTL
const CLIENT_SEARCH_CACHE = new Map<string, { timestamp: number; items: UnifiedSearchResultItem[] }>();

export function GlobalSearchModal({
  isOpen,
  onClose,
  initialCategory = "all",
}: GlobalSearchModalProps) {
  const router = useRouter();
  const { profile: currentUser, firebaseUser } = useAuth();
  const [queryText, setQueryText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [results, setResults] = useState<UnifiedSearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const isSuperAdmin = currentUser?.role === "super_admin";
  const schoolId = currentUser?.schoolId || "";

  // Category Options based on Role
  const superAdminCategories = useMemo(
    () => [
      { id: "all", label: "All Items", icon: Layers },
      { id: "schools", label: "Schools", icon: Building2 },
      { id: "users", label: "All Users", icon: Users },
      { id: "school_admins", label: "School Admins", icon: Shield },
      { id: "teachers", label: "Teachers", icon: Users },
      { id: "students", label: "Students", icon: GraduationCap },
      { id: "navigation", label: "Navigation", icon: ArrowRight },
    ],
    []
  );

  const schoolAdminCategories = useMemo(
    () => [
      { id: "all", label: "All School Data", icon: Layers },
      { id: "students", label: "Students", icon: GraduationCap },
      { id: "teachers", label: "Teachers & Staff", icon: Users },
      { id: "fees", label: "Fee Receipts", icon: Receipt },
      { id: "accounts", label: "Accounts & Vouchers", icon: Banknote },
      { id: "navigation", label: "Shortcuts & Pages", icon: ArrowRight },
    ],
    []
  );

  const activeCategories = isSuperAdmin ? superAdminCategories : schoolAdminCategories;

  // Reset or focus on open
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
      return () => clearTimeout(timer);
    } else {
      setQueryText("");
      setResults([]);
      setSelectedIndex(0);
      setSelectedCategory("all");
    }
  }, [isOpen]);

  // Synchronous Instant Navigation Matching (0ms instant response)
  const navShortcuts = useMemo(() => {
    const q = queryText.toLowerCase().trim();
    if (!q) return [];
    if (selectedCategory !== "all" && selectedCategory !== "navigation") return [];

    const pool = isSuperAdmin ? SUPER_ADMIN_NAV_ITEMS : SCHOOL_ADMIN_NAV_ITEMS;
    return pool
      .filter((nav) => {
        const title = (isSuperAdmin ? (nav as any).name : (nav as any).title || "").toLowerCase();
        const sub = (nav.subtitle || "").toLowerCase();
        const keyMatch = (nav.keywords || []).some(
          (k: string) => k.toLowerCase().includes(q) || q.includes(k.toLowerCase())
        );
        return title.includes(q) || sub.includes(q) || keyMatch;
      })
      .map(
        (nav): UnifiedSearchResultItem => ({
          id: nav.id,
          type: "navigation",
          category: "navigation",
          name: isSuperAdmin ? (nav as any).name : (nav as any).title,
          subtitle: nav.subtitle || "Quick page navigation",
          badge: "Page",
          badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
          url: nav.url,
          score: 50,
        })
      );
  }, [queryText, selectedCategory, isSuperAdmin]);

  // Scroll active item into view
  useEffect(() => {
    if (results.length > 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex, results.length]);

  // Debounced Search Engine with In-Memory Caching & Zero Quota Waste
  useEffect(() => {
    const q = queryText.toLowerCase().trim();
    let cancelled = false;

    if (!q || !isOpen) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Immediately present instant navigation matches while remote search executes
    setResults(navShortcuts);

    const cacheKey = `${isSuperAdmin ? "super" : schoolId}:${selectedCategory}:${q}`;
    const cached = CLIENT_SEARCH_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30_000) {
      setResults(cached.items);
      setSelectedIndex(0);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const combined = new Map<string, UnifiedSearchResultItem>();

      // Instant navigation matches
      navShortcuts.forEach((item) => combined.set(`${item.type}_${item.id}`, item));

      try {
        let token = "";
        try {
          if (firebaseUser) token = await firebaseUser.getIdToken();
        } catch {}

        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const endpoint = isSuperAdmin
          ? `/api/super-admin/search?q=${encodeURIComponent(q)}&category=${encodeURIComponent(
              selectedCategory
            )}`
          : `/api/admin/search?schoolId=${encodeURIComponent(
              schoolId
            )}&q=${encodeURIComponent(q)}&category=${encodeURIComponent(selectedCategory)}`;

        const res = await fetch(endpoint, { headers, cache: "no-store" }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          const raw = Array.isArray(data.results) ? data.results : [];
          raw.forEach((item: any) => {
            combined.set(`${item.type}_${item.id}`, {
              id: item.id,
              type: item.type || "item",
              category: item.category,
              name: item.name || item.title || "Record",
              subtitle: item.subtitle || "",
              schoolName: item.schoolName,
              schoolCode: item.schoolCode,
              badge: item.badge,
              badgeColor: item.badgeColor,
              status: item.status,
              url: item.url,
              score: item.score,
              metadata: item.metadata,
            });
          });
        }

        // Direct Client Firestore Fallback (only if server returned nothing or was 503)
        if ((!res || res.status === 503) && firebaseUser) {
          const db = getFirebaseDb();
          if (db) {
            if (isSuperAdmin) {
              if (selectedCategory === "all" || selectedCategory === "schools") {
                const sSnap = await getDocs(
                  firestoreQuery(collection(db, "schools"), limit(40))
                ).catch(() => null);
                if (sSnap) {
                  sSnap.docs.forEach((d) => {
                    const data = d.data();
                    const name = String(data.name || "");
                    const code = String(data.code || "");
                    const city = String(data.city || "");
                    if (
                      name.toLowerCase().includes(q) ||
                      code.toLowerCase().includes(q) ||
                      city.toLowerCase().includes(q)
                    ) {
                      combined.set(`school_${d.id}`, {
                        id: d.id,
                        type: "school",
                        category: "schools",
                        name,
                        subtitle: `Code: ${code || "N/A"} · ${city || "School"}`,
                        schoolName: name,
                        schoolCode: code,
                        badge: "School",
                        badgeColor:
                          "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
                        url: `/super-admin/schools/${d.id}`,
                      });
                    }
                  });
                }
              }

              if (
                selectedCategory === "all" ||
                selectedCategory === "users" ||
                selectedCategory === "teachers" ||
                selectedCategory === "students"
              ) {
                const uSnap = await getDocs(
                  firestoreQuery(collection(db, "users"), limit(60))
                ).catch(() => null);
                if (uSnap) {
                  uSnap.docs.forEach((d) => {
                    const data = d.data();
                    const name = String(data.name || "");
                    const email = String(data.email || "");
                    const role = String(data.role || "user");
                    if (name.toLowerCase().includes(q) || email.toLowerCase().includes(q)) {
                      combined.set(`user_${d.id}`, {
                        id: d.id,
                        type: role,
                        category: "users",
                        name: name || email,
                        subtitle: `${email} · Role: ${role}`,
                        badge: role.toUpperCase(),
                        badgeColor:
                          "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
                        url: `/super-admin/users/${d.id}`,
                      });
                    }
                  });
                }
              }
            } else if (schoolId) {
              if (selectedCategory === "all" || selectedCategory === "students") {
                const stuSnap = await getDocs(
                  firestoreQuery(collection(db, "schools", schoolId, "students"), limit(50))
                ).catch(() => null);
                if (stuSnap) {
                  stuSnap.docs.forEach((d) => {
                    const s = d.data();
                    const name = String(s.name || "");
                    const adm = String(s.admissionNumber || s.studentId || "");
                    const cls = String(s.className || "");
                    const sec = String(s.sectionName || "");
                    const phone = String(s.guardianPhone || s.phone || "");
                    if (
                      name.toLowerCase().includes(q) ||
                      adm.toLowerCase().includes(q) ||
                      cls.toLowerCase().includes(q) ||
                      phone.includes(q)
                    ) {
                      combined.set(`student_${d.id}`, {
                        id: d.id,
                        type: "student",
                        category: "students",
                        name,
                        subtitle: `Class ${cls}${sec ? `-${sec}` : ""} · Reg: ${adm || d.id}${
                          phone ? ` · 📞 ${phone}` : ""
                        }`,
                        badge: "Student",
                        badgeColor:
                          "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                        url: `/admin/students?search=${encodeURIComponent(name || adm)}`,
                      });
                    }
                  });
                }
              }

              if (selectedCategory === "all" || selectedCategory === "teachers") {
                const teaSnap = await getDocs(
                  firestoreQuery(collection(db, "schools", schoolId, "teachers"), limit(30))
                ).catch(() => null);
                if (teaSnap) {
                  teaSnap.docs.forEach((d) => {
                    const t = d.data();
                    const name = String(t.name || "");
                    const desig = String(t.designation || "Teacher");
                    const emp = String(t.employeeId || "");
                    if (
                      name.toLowerCase().includes(q) ||
                      desig.toLowerCase().includes(q) ||
                      emp.toLowerCase().includes(q)
                    ) {
                      combined.set(`teacher_${d.id}`, {
                        id: d.id,
                        type: "teacher",
                        category: "teachers",
                        name,
                        subtitle: `${desig}${emp ? ` · ID: ${emp}` : ""}`,
                        badge: "Teacher",
                        badgeColor:
                          "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
                        url: `/admin/teachers?search=${encodeURIComponent(name || emp)}`,
                      });
                    }
                  });
                }
              }

              if (selectedCategory === "all" || selectedCategory === "fees") {
                const feeSnap = await getDocs(
                  firestoreQuery(
                    collection(db, "financialPayments"),
                    where("schoolId", "==", schoolId),
                    limit(30)
                  )
                ).catch(() => null);
                if (feeSnap) {
                  feeSnap.docs.forEach((d) => {
                    const p = d.data();
                    const rec = String(p.receiptNumber || "");
                    const stu = String(p.studentName || "");
                    const amt = p.amountPaidPaise ? p.amountPaidPaise / 100 : p.amount || 0;
                    if (rec.toLowerCase().includes(q) || stu.toLowerCase().includes(q)) {
                      combined.set(`receipt_${d.id}`, {
                        id: d.id,
                        type: "receipt",
                        category: "fees",
                        name: `Receipt #${rec}`,
                        subtitle: `Student: ${stu} · ₹${amt.toFixed(2)}`,
                        badge: "Fee Receipt",
                        badgeColor:
                          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                        url: `/admin/fees/paid-slip?receipt=${encodeURIComponent(rec)}`,
                      });
                    }
                  });
                }
              }

              if (selectedCategory === "all" || selectedCategory === "accounts") {
                const jSnap = await getDocs(
                  firestoreQuery(
                    collection(db, "journalEntries"),
                    where("schoolId", "==", schoolId),
                    limit(25)
                  )
                ).catch(() => null);
                if (jSnap) {
                  jSnap.docs.forEach((d) => {
                    const j = d.data();
                    const vNum = String(j.voucherNumber || "");
                    const narr = String(j.narration || "");
                    const amt = j.totalDebitRupees ?? (j.totalDebitPaise ? j.totalDebitPaise / 100 : 0);
                    if (vNum.toLowerCase().includes(q) || narr.toLowerCase().includes(q)) {
                      combined.set(`voucher_${d.id}`, {
                        id: d.id,
                        type: "account",
                        category: "accounts",
                        name: `Voucher #${vNum}`,
                        subtitle: `₹${amt.toFixed(2)} · ${narr}`,
                        badge: "Voucher",
                        badgeColor:
                          "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                        url: `/admin/fees/accounting?tab=journal&voucher=${encodeURIComponent(vNum)}`,
                      });
                    }
                  });
                }
              }
            }
          }
        }

        if (cancelled) return;
        const finalItems = Array.from(combined.values()).slice(0, 40);
        setResults(finalItems);
        CLIENT_SEARCH_CACHE.set(cacheKey, { timestamp: Date.now(), items: finalItems });
        setSelectedIndex(0);
      } catch (err) {
        console.warn("Global search query notice:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    queryText,
    selectedCategory,
    isSuperAdmin,
    schoolId,
    firebaseUser,
    navShortcuts,
    isOpen,
  ]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : Math.max(0, results.length - 1)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  const handleSelect = useCallback(
    (item: UnifiedSearchResultItem) => {
      onClose();
      router.push(item.url);
    },
    [onClose, router]
  );

  const getItemIcon = (item: UnifiedSearchResultItem) => {
    switch (item.type) {
      case "student":
        return <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "teacher":
        return <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "school":
        return <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case "receipt":
        return <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "account":
        return <Banknote className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "navigation":
        return <ArrowRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />;
      case "school_admin":
        return <Shield className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      default:
        return <Search className="h-4 w-4 text-slate-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Search Command Center"
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-[8vh] sm:pt-[12vh] bg-slate-900/60 backdrop-blur-xs transition-opacity duration-150 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[700px] max-h-[70vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-xl ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-900/95 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Scope Header Banner */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold shrink-0 ${
                isSuperAdmin
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              {isSuperAdmin ? "Universal Command Center" : "School Admin Command Center"}
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
              {isSuperAdmin
                ? "Full platform search: schools, users, roles & system"
                : "Strictly scoped: your school's students, staff, fees & accounts"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Input Bar (Sticky Header) */}
        <div className="relative flex items-center border-b border-slate-100 px-4 py-1 dark:border-slate-800 shrink-0">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder={
              isSuperAdmin
                ? "Search across schools, users, teachers, students, emails, codes..."
                : "Search students, roll no, reg no, staff, fee receipts, vouchers..."
            }
            className="w-full bg-transparent px-3 py-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
          />

          {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0 mr-2" />}

          {queryText.length > 0 && !loading && (
            <button
              type="button"
              onClick={() => {
                setQueryText("");
                inputRef.current?.focus();
              }}
              title="Clear search"
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer mr-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <div className="hidden sm:flex items-center shrink-0">
            <kbd className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              <Command className="h-3 w-3" />K
            </kbd>
          </div>
        </div>

        {/* Compact Category Filter Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 bg-slate-50/50 px-4 py-2 scrollbar-none dark:border-slate-800 dark:bg-slate-800/30 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
            Filter:
          </span>
          {activeCategories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs dark:bg-blue-600"
                    : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700/80"
                }`}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Results Body */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-2 sm:p-2.5 divide-y divide-slate-100 dark:divide-slate-800/50"
        >
          {queryText.trim().length === 0 ? (
            <div className="py-12 sm:py-16 text-center text-xs text-slate-400 dark:text-slate-500">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                <Search className="h-5 w-5" />
              </div>
              <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                {isSuperAdmin
                  ? "Universal Platform Database Search"
                  : "School Management Global Search"}
              </p>
              <p className="mt-1 max-w-sm mx-auto text-slate-400">
                {isSuperAdmin
                  ? "Type any school code, institution name, admin email, student or teacher phone..."
                  : "Type student name, admission number, roll no, teacher name, receipt number, or accounts head..."}
              </p>
            </div>
          ) : loading && results.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span>Searching authorized records...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching records found for &quot;
              <strong className="text-slate-700 dark:text-slate-200">{queryText}</strong>&quot;
              {selectedCategory !== "all" ? ` in ${selectedCategory}` : ""}.
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={`${item.type}_${item.id}_${idx}`}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`group flex items-center justify-between gap-3 rounded-xl p-2.5 sm:p-3 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50/90 text-blue-900 border-l-3 border-blue-600 dark:bg-blue-950/50 dark:text-blue-100 dark:border-blue-500 shadow-2xs"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 border-l-3 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          isSelected
                            ? "bg-white dark:bg-slate-800 shadow-2xs"
                            : "bg-slate-100 dark:bg-slate-800"
                        }`}
                      >
                        {getItemIcon(item)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs sm:text-sm font-semibold truncate text-slate-900 dark:text-white">
                            {item.name}
                          </p>
                          {item.badge && (
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                item.badgeColor ||
                                "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {item.schoolName && (
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 truncate max-w-[120px]">
                              {item.schoolName}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`shrink-0 transition-opacity ${
                        isSelected ? "opacity-100 text-blue-600 dark:text-blue-400" : "opacity-0 text-slate-400"
                      }`}
                    >
                      <CornerDownLeft className="h-4 w-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer with Keyboard Shortcuts (Sticky Footer) */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                ↑↓
              </kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                ↵
              </kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                esc
              </kbd>
              <span>close</span>
            </span>
          </div>

          <span className="font-semibold text-slate-400 text-[10px] sm:text-[11px]">
            {results.length > 0 ? `${results.length} matches` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
