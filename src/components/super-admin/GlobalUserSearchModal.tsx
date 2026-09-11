"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Search, User, Phone, Mail, Building2, Shield, X, ArrowRight, Sparkles, Loader2, Copy, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge, computeUserActivityStatus } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";

export interface GlobalUserSearchModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function GlobalUserSearchModal({
  open: controlledOpen,
  onOpenChange,
  trigger,
}: GlobalUserSearchModalProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpen = (val: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(val);
    }
    onOpenChange?.(val);
  };

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!isOpen);
      }
      if (e.key === "Escape" && isOpen) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim() || !profile?.uid) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/super-admin/search?performerUid=${profile.uid}&q=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, profile?.uid]);

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success("User ID copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectResult = (item: any) => {
    setOpen(false);
    router.push(item.url);
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 w-64 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs transition-colors cursor-pointer"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left truncate">Search phone, ID, email, name...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-500 shadow-2xs">
            ⌘K
          </kbd>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-20 sm:pt-28 px-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setOpen(false)}
          />

          <div className="relative z-50 w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <Search className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across all users by Name, Email, Phone number, or User ID..."
                className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
              {loading && <Loader2 className="h-4 w-4 text-slate-400 animate-spin shrink-0" />}
              {query && !loading && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md border border-slate-200 dark:border-slate-700">
                ESC
              </kbd>
            </div>

            {/* Search Results / Empty State */}
            <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60">
              {query.trim() === "" ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <div className="mx-auto w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Global Super Admin User & School Lookup
                  </p>
                  <p className="text-xs mt-1 text-slate-500 max-w-sm mx-auto">
                    Type a 10-digit phone number, user UID, school code, name, or email to inspect accounts across the entire platform.
                  </p>
                </div>
              ) : results.length === 0 && !loading ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <p className="text-sm font-medium">No accounts found matching &quot;{query}&quot;</p>
                  <p className="text-xs mt-1 text-slate-400">Check spelling or try searching with partial phone number or ID.</p>
                </div>
              ) : (
                results.map((item) => {
                  const isSchool = item.type === "school";
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectResult(item)}
                      className="group flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar size="sm" className="shrink-0">
                          <AvatarFallback className={isSchool ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
                            {isSchool ? <Building2 className="h-4 w-4" /> : item.name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {item.name}
                            </span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] uppercase font-bold px-2 py-0.2",
                                isSchool ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"
                              )}
                            >
                              {item.type.replace("_", " ")}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            <span className="truncate">{item.subtitle}</span>
                            {item.schoolName && !isSchool && (
                              <span className="text-[11px] text-slate-400 truncate">
                                • {item.schoolName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleCopy(item.id, e)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                          title="Copy ID"
                        >
                          {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span>{results.length > 0 ? `${results.length} result(s) found` : "Global Directory"}</span>
              <span className="text-[10px] text-slate-400">Use ↑ ↓ arrows to navigate • Return to view</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
