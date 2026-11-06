"use client";

import React from "react";
import {
  TrendingUp,
  DollarSign,
  Building,
  Users,
  PieChart,
  Percent,
  CheckCircle2,
  Calendar,
  Info,
} from "lucide-react";
import type { BusinessIntelligenceMetrics } from "@/types/architecture-intelligence";

interface Props {
  metrics: BusinessIntelligenceMetrics;
}

export default function BusinessIntelligenceView({ metrics }: Props) {
  return (
    <div className="space-y-8">
      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Monthly Recurring Revenue</span>
            <span className="rounded-full bg-emerald-50 p-2 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">
            ₹{metrics.monthlyRecurringRevenueInr.toLocaleString()}
          </h3>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> Reconciled Active Subscriptions
          </p>
        </div>

        {/* ARR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Annual Run Rate (ARR)</span>
            <span className="rounded-full bg-indigo-50 p-2 text-indigo-600">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">
            ₹{(metrics.annualRecurringRevenueRunRateInr / 100000).toFixed(2)} L
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            ₹{metrics.annualRecurringRevenueRunRateInr.toLocaleString()} Annualized
          </p>
        </div>

        {/* ARPU */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Avg Revenue Per School (ARPU)</span>
            <span className="rounded-full bg-blue-50 p-2 text-blue-600">
              <Building className="h-4 w-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">
            ₹{metrics.averageRevenuePerPaidSchoolInr.toLocaleString()}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Per paid institution / month</p>
        </div>

        {/* Gross Margin */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Gross Margin Estimate</span>
            <span className="rounded-full bg-purple-50 p-2 text-purple-600">
              <Percent className="h-4 w-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">
            {metrics.grossMarginEstimatePercent}%
          </h3>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            Serverless Efficiency Tier
          </p>
        </div>
      </div>

      {/* SECTION 2: School Adoption & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Adoption Funnel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Institutional Adoption Breakdown</h3>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-slate-600">Total Registered Schools</span>
                <span className="text-slate-900 font-bold">{metrics.totalRegisteredSchools}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-slate-600">Active Operational Schools</span>
                <span className="text-slate-900 font-bold">{metrics.activeSchools}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(metrics.activeSchools / Math.max(1, metrics.totalRegisteredSchools)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-slate-600">Paying Subscribed Schools</span>
                <span className="text-slate-900 font-bold">{metrics.paidSchools}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${(metrics.paidSchools / Math.max(1, metrics.totalRegisteredSchools)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-slate-600">Trial / Free Tier Schools</span>
                <span className="text-slate-900 font-bold">{metrics.trialSchools}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${(metrics.trialSchools / Math.max(1, metrics.totalRegisteredSchools)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Free-to-Paid Conversion:</span>
            <span className="font-bold text-emerald-600 text-sm">{metrics.conversionRatePercent}%</span>
          </div>
        </div>

        {/* Plan Revenue Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-indigo-600" />
            Plan Tier Distribution & Revenue Contributions
          </h3>

          <div className="space-y-4">
            {metrics.planDistribution.map((plan) => {
              const planRevenueInr = Math.round(plan.revenuePaise / 100);
              const percentage =
                metrics.monthlyRecurringRevenueInr > 0
                  ? Math.round((planRevenueInr / metrics.monthlyRecurringRevenueInr) * 100)
                  : 33;

              return (
                <div key={plan.planName} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{plan.planName}</h4>
                      <span className="text-xs text-slate-500 font-medium">
                        {plan.schoolCount} Active Subscriptions
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900">
                        ₹{planRevenueInr.toLocaleString()} / mo
                      </span>
                      <span className="text-[11px] text-indigo-600 font-semibold block">
                        {percentage}% of Total MRR
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reconciliation Footnote */}
          <div className="mt-6 pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
            <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              <strong>Authoritative Reconciliation:</strong> {metrics.reconciliationNotes} Last refreshed at{" "}
              {new Date(metrics.lastCalculatedAt).toLocaleString()}.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
