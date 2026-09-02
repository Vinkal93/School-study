"use client";

import React from "react";
import { Check, X, Sparkles, Layers, ShieldCheck, ArrowRight } from "lucide-react";
import type { Plan } from "@/types";

export interface FeatureComparisonMatrixProps {
  currentPlanSlug: string;
  allPlans: Plan[];
  onSelectUpgrade: (planSlug: string) => void;
}

export function FeatureComparisonMatrix({
  currentPlanSlug,
  allPlans = [],
  onSelectUpgrade,
}: FeatureComparisonMatrixProps) {
  const comparisonRows = [
    { key: "students", title: "Students Limit", starter: "500", pro: "2,000", ent: "Unlimited" },
    { key: "teachers", title: "Faculty / Teachers", starter: "20", pro: "100", ent: "Unlimited" },
    { key: "classes", title: "Classes & Sections", starter: "15", pro: "60", ent: "Unlimited" },
    { key: "storage", title: "Cloud Storage", starter: "2 GB", pro: "10 GB", ent: "50 GB+" },
    { key: "attendance", title: "Daily Attendance", starter: true, pro: true, ent: true },
    { key: "fees", title: "Fees & Invoicing", starter: false, pro: true, ent: true },
    { key: "reports", title: "Reports & Exports", starter: "Basic", pro: "Advanced", ent: "Custom Exports" },
    { key: "notices", title: "Notices & Circulars", starter: false, pro: true, ent: true },
    { key: "parent_portal", title: "Parent Portal Access", starter: false, pro: true, ent: true },
    { key: "student_portal", title: "Student Portal Access", starter: true, pro: true, ent: true },
    { key: "support", title: "Customer Support", starter: "Standard Email", pro: "Priority Support", ent: "24/7 Dedicated Manager" },
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <span>Compare Subscription Plans</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          See feature differences and unlock advanced modules by upgrading your tier.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="py-3 px-4 text-slate-500 font-bold uppercase tracking-wider text-[10px] w-1/4">Features</th>
              
              {/* Starter Plan Column */}
              <th className={`py-3 px-4 text-center rounded-t-2xl ${currentPlanSlug === "starter" ? "bg-blue-50/80 dark:bg-blue-950/40" : ""}`}>
                <div className="flex flex-col items-center">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Starter Plan</span>
                  <span className="text-[11px] text-slate-500">₹999 / mo</span>
                  {currentPlanSlug === "starter" ? (
                    <span className="mt-1 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-extrabold uppercase">
                      CURRENT PLAN
                    </span>
                  ) : null}
                </div>
              </th>

              {/* Professional Plan Column */}
              <th className={`py-3 px-4 text-center rounded-t-2xl ${currentPlanSlug === "professional" ? "bg-blue-50/80 dark:bg-blue-950/40" : "bg-purple-50/30 dark:bg-purple-950/20"}`}>
                <div className="flex flex-col items-center">
                  <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1">
                    <span>Professional</span>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  </span>
                  <span className="text-[11px] text-slate-500">₹1,999 / mo</span>
                  {currentPlanSlug === "professional" ? (
                    <span className="mt-1 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-extrabold uppercase">
                      CURRENT PLAN
                    </span>
                  ) : currentPlanSlug === "starter" ? (
                    <span className="mt-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold uppercase">
                      RECOMMENDED UPGRADE
                    </span>
                  ) : null}
                </div>
              </th>

              {/* Enterprise Plan Column */}
              <th className={`py-3 px-4 text-center rounded-t-2xl ${currentPlanSlug === "enterprise" ? "bg-blue-50/80 dark:bg-blue-950/40" : ""}`}>
                <div className="flex flex-col items-center">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Enterprise Plan</span>
                  <span className="text-[11px] text-slate-500">Custom Pricing</span>
                  {currentPlanSlug === "enterprise" ? (
                    <span className="mt-1 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-extrabold uppercase">
                      CURRENT PLAN
                    </span>
                  ) : null}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {comparisonRows.map((row) => (
              <tr key={row.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{row.title}</td>

                {/* Starter Cell */}
                <td className={`py-3 px-4 text-center font-medium ${currentPlanSlug === "starter" ? "bg-blue-50/40 dark:bg-blue-950/20" : ""}`}>
                  {typeof row.starter === "boolean" ? (
                    row.starter ? (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-slate-300 dark:text-slate-600 mx-auto" />
                    )
                  ) : (
                    <span className="text-slate-700 dark:text-slate-300">{row.starter}</span>
                  )}
                </td>

                {/* Pro Cell */}
                <td className={`py-3 px-4 text-center font-medium ${currentPlanSlug === "professional" ? "bg-blue-50/40 dark:bg-blue-950/20" : "bg-purple-50/20 dark:bg-purple-950/10"}`}>
                  {typeof row.pro === "boolean" ? (
                    row.pro ? (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-slate-300 dark:text-slate-600 mx-auto" />
                    )
                  ) : (
                    <span className="font-bold text-slate-900 dark:text-white">{row.pro}</span>
                  )}
                </td>

                {/* Enterprise Cell */}
                <td className={`py-3 px-4 text-center font-medium ${currentPlanSlug === "enterprise" ? "bg-blue-50/40 dark:bg-blue-950/20" : ""}`}>
                  {typeof row.ent === "boolean" ? (
                    row.ent ? (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-slate-300 dark:text-slate-600 mx-auto" />
                    )
                  ) : (
                    <span className="font-bold text-slate-900 dark:text-white">{row.ent}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-2">
        {currentPlanSlug !== "enterprise" && (
          <button
            onClick={() => onSelectUpgrade(currentPlanSlug === "starter" ? "plan_professional" : "plan_enterprise")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <span>Upgrade to Higher Tier</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
