"use client";

import React, { useState } from "react";
import { X, CheckCircle2, Lock, ShieldCheck, Search, Filter } from "lucide-react";
import { GRANULAR_PERMISSIONS } from "@/lib/billing/permissions";

export interface ViewAllFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  allowedFeatures: string[];
  permissions?: Record<string, boolean>;
}

export function ViewAllFeaturesModal({
  isOpen,
  onClose,
  planName,
  allowedFeatures = [],
  permissions = {},
}: ViewAllFeaturesModalProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  if (!isOpen) return null;

  // Group items by category
  const categories = [
    { id: "all", name: "All Features" },
    { id: "module", name: "Modules" },
    { id: "page", name: "Pages & Directories" },
    { id: "tab", name: "Sub-Tabs" },
    { id: "action", name: "Actions & Buttons" },
  ];

  const items = GRANULAR_PERMISSIONS.filter((p) => {
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Complete Feature Matrix for {planName}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review included capabilities and protected features under your current plan tier.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search feature capability by name..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                  selectedCategory === c.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grid List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {items.map((item) => {
            const isIncluded = permissions[item.id] ?? allowedFeatures.includes(item.featureKey);

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all text-xs flex items-start justify-between gap-3 ${
                  isIncluded
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40"
                    : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{item.name}</span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.description}</p>
                </div>

                <div className="shrink-0 mt-0.5">
                  {isIncluded ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" />
                      Included
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
