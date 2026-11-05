"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Search,
  Filter,
  DollarSign,
  Activity,
  Layers,
  Terminal,
} from "lucide-react";
import type { IntegrationEntity } from "@/types/architecture-intelligence";

interface Props {
  integrations: IntegrationEntity[];
}

export default function IntegrationRegistryView({ integrations }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const filtered = integrations.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.provider.toLowerCase().includes(search.toLowerCase()) ||
      item.businessPurpose.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Verified Platform Integrations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-world cloud services, billing gateways, messaging hubs, and telemetry APIs configured in School Study.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search integrations..."
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
            <option value="DATABASE">Cloud Database</option>
            <option value="CLOUD_HOSTING">Hosting & CDN</option>
            <option value="PAYMENTS">Payments & Billing</option>
            <option value="MESSAGING">Messaging Hub</option>
            <option value="MONITORING">Monitoring & Sentry</option>
            <option value="SECURITY">Security & Edge WAF</option>
          </select>
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Category & Status */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  {item.category.replace(/_/g, " ")}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  {item.connectionStatus.replace(/_/g, " ")}
                </span>
              </div>

              {/* Title & Provider */}
              <h3 className="text-base font-bold text-slate-900 mt-3">{item.name}</h3>
              <p className="text-xs text-slate-500 font-medium">Provider: {item.provider}</p>

              {/* Business Purpose */}
              <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                {item.businessPurpose}
              </p>

              {/* Features Integrated */}
              <div className="mt-3.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Integrated Features
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.integratedFeatures.map((feat) => (
                    <span
                      key={feat}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 font-medium"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Operational Metadata */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 text-[10px] block">Failure Impact</span>
                  <span
                    className={`font-semibold ${
                      item.failureImpact === "CRITICAL"
                        ? "text-rose-600"
                        : "text-amber-600"
                    }`}
                  >
                    {item.failureImpact.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Estimated Cost</span>
                  <span className="font-semibold text-slate-800">{item.estimatedMonthlyCost}</span>
                </div>
              </div>
            </div>

            {/* Completeness & Doc Link */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">Readiness:</span>
                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${item.configurationCompleteness}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-700">{item.configurationCompleteness}%</span>
              </div>

              <a
                href={item.documentationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
              >
                Docs <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
