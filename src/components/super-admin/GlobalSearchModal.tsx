"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Shield,
  CreditCard,
  Banknote,
  Receipt,
  FileText,
  SlidersHorizontal,
  Loader2,
  X,
  ArrowRight,
  CornerDownLeft,
  CheckCircle2,
  Sparkles,
  Layers,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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
  const { profile: currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [results, setResults] = useState<UnifiedSearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = currentUser?.role === "super_admin";

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
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setSelectedCategory("all");
      setShowFilterDropdown(false);
    }
  }, [isOpen]);

  // Debounced Search
  useEffect(() => {
    if (!query.trim() || !currentUser?.uid) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const endpoint = isSuperAdmin
          ? `/api/super-admin/search?performerUid=${currentUser.uid}&q=${encodeURIComponent(
              query
            )}&category=${selectedCategory}`
          : `/api/admin/search?performerUid=${currentUser.uid}&q=${encodeURIComponent(
              query
            )}&category=${selectedCategory}`;

        const res = await fetch(endpoint);
        const data = await res.json();
        if (res.ok) {
          const rawResults = data.results || [];
          // Normalize results
          const normalized: UnifiedSearchResultItem[] = rawResults.map((item: any) => ({
            id: item.id,
            type: item.type || "item",
            category: item.category,
            name: item.name || item.title,
            subtitle: item.subtitle,
            schoolName: item.schoolName,
            schoolCode: item.schoolCode,
            badge: item.badge,
            badgeColor: item.badgeColor,
            status: item.status,
            url: item.url,
            metadata: item.metadata,
          }));

          setResults(normalized);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.warn("Global search error:", err);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, selectedCategory, currentUser?.uid, isSuperAdmin]);

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
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isSuperAdmin
                ? "Search across schools, users, teachers, students, emails, codes..."
                : "Search students, roll no, reg no, staff, fee receipts, vouchers..."
            }
            className="w-full bg-transparent px-3 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
          />

          {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0 mr-2" />}

          {/* Filter Icon Button */}
          <button
            type="button"
            onClick={() => setShowFilterDropdown((prev) => !prev)}
            title="Filter search category"
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
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

        {/* Category Pills Bar (Toggled or Always visible for convenience) */}
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
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
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
          {query.trim().length === 0 ? (
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
              No matching records found for &quot;<strong className="text-slate-700 dark:text-slate-200">{query}</strong>&quot;
              {selectedCategory !== "all" ? ` in ${selectedCategory}` : ""}.
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={`${item.id}_${idx}`}
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
