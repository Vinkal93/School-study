"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Shield,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Loader2,
  X,
  ArrowRight,
  CornerDownLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { GlobalSearchResultItem } from "@/app/api/super-admin/search/route";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const { profile: currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim() || !currentUser) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/super-admin/search?performerUid=${currentUser.uid}&q=${encodeURIComponent(
            query
          )}`
        );
        const data = await res.json();
        if (res.ok) {
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.warn("Search query error:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, currentUser?.uid]);

  // Keyboard navigation listener (Escape, Up, Down, Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (item: GlobalSearchResultItem) => {
    onClose();
    router.push(item.url);
  };

  if (!isOpen) return null;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "school":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <Building2 className="h-3 w-3" />
            School
          </span>
        );
      case "school_admin":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
            <Shield className="h-3 w-3" />
            School Admin
          </span>
        );
      case "teacher":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            <BookOpen className="h-3 w-3" />
            Teacher
          </span>
        );
      case "student":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
            <GraduationCap className="h-3 w-3" />
            Student
          </span>
        );
      case "super_admin":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400">
            <Shield className="h-3 w-3" />
            Super Admin
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Active
          </span>
        );
      case "restricted":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <ShieldAlert className="h-2.5 w-2.5" />
            Restricted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="h-2.5 w-2.5" />
            {status}
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-950 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-800">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search School Study across Schools, Users, Teachers, Students..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent px-3 py-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />}
          {query && !loading && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim() === "" ? (
            <div className="py-12 text-center text-xs text-gray-400">
              <Search className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-700 mb-2" />
              Type a name, email, school code, or ID to search platform-wide.
            </div>
          ) : loading && results.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
              Searching platform records...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              No matching Schools, Users, Teachers, or Students found for "
              <strong className="text-gray-700 dark:text-gray-300">{query}</strong>".
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item, idx) => (
                <div
                  key={item.id + idx}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedIndex === idx
                      ? "bg-blue-50/80 dark:bg-blue-900/30 text-blue-950 dark:text-blue-100"
                      : "hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0">
                      {item.type === "school" ? (
                        <Building2 className="h-4 w-4" />
                      ) : item.type === "teacher" ? (
                        <BookOpen className="h-4 w-4" />
                      ) : item.type === "student" ? (
                        <GraduationCap className="h-4 w-4" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        {getTypeBadge(item.type)}
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {item.subtitle}
                        {item.schoolName && (
                          <span className="text-gray-400"> · {item.schoolName}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0 ml-2">
                    {selectedIndex === idx && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">
                        Select <CornerDownLeft className="h-3 w-3" />
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-[11px] text-gray-400">
          <span>
            Search School Study — Press <kbd className="font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">ESC</kbd> to exit
          </span>
          <span className="flex items-center gap-2">
            <span>Navigate <kbd className="font-mono bg-white dark:bg-gray-800 px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700">↑</kbd><kbd className="font-mono bg-white dark:bg-gray-800 px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700">↓</kbd></span>
          </span>
        </div>
      </div>
    </div>
  );
}
