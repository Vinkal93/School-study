"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Users,
  GraduationCap,
  Shield,
  Banknote,
  Receipt,
  SlidersHorizontal,
  Loader2,
  X,
  ArrowRight,
  CornerDownLeft,
  Sparkles,
  Layers,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs, query as firestoreQuery, where, limit } from "firebase/firestore";
import {
  SCHOOL_ADMIN_NAV_ITEMS,
  SUPER_ADMIN_NAV_ITEMS,
  type NavigationShortcut,
} from "@/lib/search/navigation-items";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
}

interface UnifiedSearchResultItem {
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
  metadata?: Record<string, any>;
}

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
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQueryText("");
      setResults([]);
      setSelectedIndex(0);
      setSelectedCategory("all");
      setShowFilterDropdown(false);
    }
  }, [isOpen]);

  // Synchronous Client-Side Navigation Matching (0ms instant feedback)
  const navShortcuts = useMemo(() => {
    const q = queryText.toLowerCase().trim();
    if (!q) return [];
    if (selectedCategory !== "all" && selectedCategory !== "navigation") return [];

    const pool = isSuperAdmin ? SUPER_ADMIN_NAV_ITEMS : SCHOOL_ADMIN_NAV_ITEMS;
    return pool
      .filter((nav) => {
        const matchTitle = nav.title.toLowerCase().includes(q);
        const matchSub = nav.subtitle.toLowerCase().includes(q);
        const matchKey = nav.keywords.some((k) => k.includes(q) || q.includes(k));
        return matchTitle || matchSub || matchKey;
      })
      .map(
        (nav): UnifiedSearchResultItem => ({
          id: nav.id,
          type: "navigation",
          category: "navigation",
          name: nav.title,
          subtitle: nav.subtitle,
          badge: "Page",
          badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
          url: nav.url,
        })
      );
  }, [queryText, selectedCategory, isSuperAdmin]);

  // Debounced Search Engine (Server API + Direct Client Firestore Fallback)
  useEffect(() => {
    const q = queryText.toLowerCase().trim();
    let cancelled = false;
    if (!q || !isOpen || !currentUser?.uid) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Immediately display navigation matches while async search queries execute
    setResults(navShortcuts);

    const timer = setTimeout(async () => {
      setLoading(true);
      const combined = new Map<string, UnifiedSearchResultItem>();

      // Add instant navigation items
      navShortcuts.forEach((item) => combined.set(`${item.type}_${item.id}`, item));

      try {
        let token = "";
        try {
          if (firebaseUser) token = await firebaseUser.getIdToken();
        } catch {}

        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const endpoint = isSuperAdmin
          ? `/api/super-admin/search?performerUid=${encodeURIComponent(
              currentUser?.uid || ""
            )}&q=${encodeURIComponent(q)}&category=${selectedCategory}`
          : `/api/admin/search?performerUid=${encodeURIComponent(
              currentUser?.uid || ""
            )}&schoolId=${encodeURIComponent(schoolId)}&q=${encodeURIComponent(
              q
            )}&category=${selectedCategory}`;

        const res = await fetch(endpoint, { headers, cache: "no-store" }).catch(() => null);

        let serverItems: UnifiedSearchResultItem[] = [];
        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          const raw = Array.isArray(data.results) ? data.results : [];
          serverItems = raw.map((item: any) => ({
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
            metadata: item.metadata,
          }));
        }

        serverItems.forEach((item) => combined.set(`${item.type}_${item.id}`, item));

        // If server returned few/no items (e.g. offline client or local dev), execute client Firestore queries
        if ((!res || res.status === 503) && firebaseUser) {
          const db = getFirebaseDb();
          if (db) {
            if (isSuperAdmin) {
              // Super Admin Client-Side Fallback: Query schools & users
              if (selectedCategory === "all" || selectedCategory === "schools") {
                const sSnap = await getDocs(firestoreQuery(collection(db, "schools"), limit(50))).catch(() => null);
                if (sSnap) {
                  sSnap.docs.forEach((d) => {
                    const data = d.data();
                    const name = String(data.name || "");
                    const code = String(data.code || "");
                    const city = String(data.city || "");
                    if (name.toLowerCase().includes(q) || code.toLowerCase().includes(q) || city.toLowerCase().includes(q)) {
                      combined.set(`school_${d.id}`, {
                        id: d.id,
                        type: "school",
                        category: "schools",
                        name,
                        subtitle: `Code: ${code || "N/A"} · ${city || "School"}`,
                        schoolName: name,
                        schoolCode: code,
                        badge: "School",
                        badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
                        url: `/super-admin/schools/${d.id}`,
                      });
                    }
                  });
                }
              }

              if (selectedCategory === "all" || selectedCategory === "users" || selectedCategory === "school_admins" || selectedCategory === "teachers" || selectedCategory === "students") {
                const uSnap = await getDocs(firestoreQuery(collection(db, "users"), limit(80))).catch(() => null);
                if (uSnap) {
                  uSnap.docs.forEach((d) => {
                    const data = d.data();
                    const name = String(data.name || "");
                    const email = String(data.email || "");
                    const role = String(data.role || "user");
                    if (selectedCategory === "school_admins" && role !== "school_admin") return;
                    if (selectedCategory === "teachers" && role !== "teacher") return;
                    if (selectedCategory === "students" && role !== "student") return;
                    if (name.toLowerCase().includes(q) || email.toLowerCase().includes(q)) {
                      combined.set(`user_${d.id}`, {
                        id: d.id,
                        type: role,
                        category: "users",
                        name: name || email,
                        subtitle: `${email} · Role: ${role}`,
                        badge: role.toUpperCase(),
                        badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
                        url: `/super-admin/users/${d.id}`,
                      });
                    }
                  });
                }
              }
            } else if (schoolId) {
              // School Admin Client-Side Fallback: Query students & teachers & receipts for this school
              if (selectedCategory === "all" || selectedCategory === "students") {
                const stuSnap = await getDocs(firestoreQuery(collection(db, "schools", schoolId, "students"), limit(60))).catch(() => null);
                if (stuSnap) {
                  stuSnap.docs.forEach((d) => {
                    const s = d.data();
                    const name = String(s.name || "");
                    const adm = String(s.admissionNumber || s.studentId || "");
                    const cls = String(s.className || "");
                    const sec = String(s.sectionName || "");
                    const phone = String(s.guardianPhone || s.phone || "");
                    if (name.toLowerCase().includes(q) || adm.toLowerCase().includes(q) || cls.toLowerCase().includes(q) || phone.includes(q)) {
                      combined.set(`student_${d.id}`, {
                        id: d.id,
                        type: "student",
                        category: "students",
                        name,
                        subtitle: `Class ${cls}${sec ? `-${sec}` : ""} · Reg: ${adm || d.id}${phone ? ` · 📞 ${phone}` : ""}`,
                        badge: "Student",
                        badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                        url: `/admin/students`,
                      });
                    }
                  });
                }
              }

              if (selectedCategory === "all" || selectedCategory === "teachers") {
                const teaSnap = await getDocs(firestoreQuery(collection(db, "schools", schoolId, "teachers"), limit(30))).catch(() => null);
                if (teaSnap) {
                  teaSnap.docs.forEach((d) => {
                    const t = d.data();
                    const name = String(t.name || "");
                    const desig = String(t.designation || "Teacher");
                    const emp = String(t.employeeId || "");
                    if (name.toLowerCase().includes(q) || desig.toLowerCase().includes(q) || emp.toLowerCase().includes(q)) {
                      combined.set(`teacher_${d.id}`, {
                        id: d.id,
                        type: "teacher",
                        category: "teachers",
                        name,
                        subtitle: `${desig}${emp ? ` · ID: ${emp}` : ""}`,
                        badge: "Teacher",
                        badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
                        url: `/admin/teachers`,
                      });
                    }
                  });
                }
              }

              if (selectedCategory === "all" || selectedCategory === "fees") {
                const feeSnap = await getDocs(firestoreQuery(collection(db, "financialPayments"), where("schoolId", "==", schoolId), limit(40))).catch(() => null);
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
                        badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                        url: `/admin/fees/paid-slip`,
                      });
                    }
                  });
                }
              }
            }
          }
        }

        if (cancelled) return;
        setResults(Array.from(combined.values()));
        setSelectedIndex(0);
      } catch (err) {
        console.warn("Global search error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 120);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [queryText, selectedCategory, currentUser?.uid, isSuperAdmin, schoolId, firebaseUser, navShortcuts, isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  const handleSelect = (item: UnifiedSearchResultItem) => {
    onClose();
    router.push(item.url);
  };

  const getItemIcon = (item: UnifiedSearchResultItem) => {
    switch (item.type) {
      case "student":
        return <GraduationCap className="h-4 w-4 text-blue-500" />;
      case "teacher":
        return <Users className="h-4 w-4 text-purple-500" />;
      case "school":
        return <Building2 className="h-4 w-4 text-indigo-500" />;
      case "receipt":
        return <Receipt className="h-4 w-4 text-emerald-500" />;
      case "account":
        return <Banknote className="h-4 w-4 text-amber-500" />;
      case "navigation":
        return <ArrowRight className="h-4 w-4 text-slate-400" />;
      case "school_admin":
        return <Shield className="h-4 w-4 text-rose-500" />;
      default:
        return <Search className="h-4 w-4 text-slate-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 sm:pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Scope Header Banner */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-xs font-semibold dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                isSuperAdmin
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              {isSuperAdmin ? "Super Admin Full Database" : "School Admin Portal"}
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              {isSuperAdmin
                ? "Full platform access: schools, users, roles & system"
                : "Strictly scoped: your school's students, staff, fees & accounts"}
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Input Bar with Filter Button */}
        <div className="relative flex items-center border-b border-slate-100 px-4 dark:border-slate-800">
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
            className="w-full bg-transparent px-3 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
          />

          {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0 mr-2" />}

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setShowFilterDropdown((prev) => !prev)}
            title="Filter search category"
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              selectedCategory !== "all" || showFilterDropdown
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {activeCategories.find((c) => c.id === selectedCategory)?.label || "Filter"}
            </span>
          </button>
        </div>

        {/* Category Pills Bar */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 bg-slate-50/50 px-4 py-2 dark:border-slate-800 dark:bg-slate-800/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
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
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Results Body */}
        <div className="max-h-[380px] overflow-y-auto p-2">
          {queryText.trim().length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {isSuperAdmin
                  ? "Universal Platform Database Search"
                  : "School Management Global Search"}
              </p>
              <p className="mt-1">
                {isSuperAdmin
                  ? "Type any school code, institution name, admin email, student or teacher phone..."
                  : "Type student name, admission number, roll no, teacher name, receipt number, or accounts head..."}
              </p>
            </div>
          ) : loading && results.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Searching database records...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching records found for &quot;<strong className="text-slate-700 dark:text-slate-200">{queryText}</strong>&quot;
              {selectedCategory !== "all" ? ` in ${selectedCategory}` : ""}.
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={`${item.type}_${item.id}_${idx}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between gap-3 rounded-xl p-3 cursor-pointer transition ${
                      isSelected
                        ? "bg-blue-50/90 text-blue-900 dark:bg-blue-950/60 dark:text-blue-100"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                        {getItemIcon(item)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
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

                    <div className="shrink-0 text-slate-400">
                      <CornerDownLeft className="h-3.5 w-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer with Keyboard Shortcuts */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                ↑↓
              </kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                ↵
              </kbd>{" "}
              open
            </span>
            <span>
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                esc
              </kbd>{" "}
              close
            </span>
          </div>

          <span className="font-semibold text-slate-400">
            {results.length > 0 ? `${results.length} matches` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
