"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  ExternalLink,
  Code2,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import type { FeatureCapability } from "@/types/architecture-intelligence";

interface Props {
  features: FeatureCapability[];
}

export default function FeatureExplorerView({ features }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const filtered = features.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.route.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Platform Feature Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified modules, routes, API contracts, and role-based capabilities from the Central Feature Registry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search features or routes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-48 sm:w-64 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none shadow-sm"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none shadow-sm"
          >
            <option value="ALL">All Categories</option>
            <option value="CORE">Core</option>
            <option value="ACADEMIC">Academic</option>
            <option value="FINANCIAL">Financial & Fees</option>
            <option value="COMMUNICATION">Communication</option>
            <option value="AI">AI Workspace</option>
            <option value="ANALYTICS">Analytics</option>
            <option value="SECURITY">Security</option>
          </select>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Category & Test Status */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  {item.category}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  {item.testCoverage.replace(/_/g, " ")}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-bold text-slate-900 mt-3">{item.name}</h3>
              <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                {item.description}
              </p>

              {/* Route & Endpoint Badges */}
              <div className="mt-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="text-slate-400 font-mono text-[10px] uppercase">Route:</span>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-indigo-700">
                    {item.route}
                  </code>
                </div>

                {item.apiEndpoints.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="text-slate-400 font-mono text-[10px] uppercase">API:</span>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 truncate max-w-[200px]">
                      {item.apiEndpoints[0]}
                    </code>
                  </div>
                )}
              </div>

              {/* Intended Roles */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Intended Audience
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.intendedRoles.map((role) => (
                    <span
                      key={role}
                      className="rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 font-medium"
                    >
                      {role.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Business Benefit Footnote */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 italic block line-clamp-2">
                &ldquo;{item.businessBenefit}&rdquo;
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
