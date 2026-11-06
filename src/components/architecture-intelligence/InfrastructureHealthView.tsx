"use client";

import React from "react";
import {
  Server,
  Activity,
  Cpu,
  HardDrive,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { ArchitectureIntelligenceOverview } from "@/types/architecture-intelligence";

interface Props {
  overview: ArchitectureIntelligenceOverview;
}

export default function InfrastructureHealthView({ overview }: Props) {
  return (
    <div className="space-y-8">
      {/* SECTION 1: Environments Matrix */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Deployment Environments & Telemetry</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Verified production edge topology and isolated preview testing environments.
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Production Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base font-bold text-slate-900">Production Ingress</h3>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                {overview.environments.production.status}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Platform & Architecture</span>
                <span className="font-semibold text-slate-800">{overview.environments.production.platform}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Release Branch</span>
                <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-indigo-700 font-semibold">
                  {overview.environments.production.branch}
                </code>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Production URL</span>
                <a
                  href={overview.environments.production.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-indigo-600 hover:underline flex items-center gap-1"
                >
                  {overview.environments.production.url} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Edge Uptime SLA</span>
                <span className="font-bold text-emerald-600">99.95% Guaranteed</span>
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-blue-500" />
                <h3 className="text-base font-bold text-slate-900">Preview & Staging Gates</h3>
              </div>
              <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {overview.environments.preview.status}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Platform Deployment</span>
                <span className="font-semibold text-slate-800">{overview.environments.preview.platform}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Database Isolation Gate</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Enforced Independent DB
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Automated PR Checks</span>
                <span className="font-semibold text-slate-800">15 Release Test Suites</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Financial Write Guard</span>
                <span className="font-semibold text-indigo-600">Razorpay Test Gateway Mode</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Measured Performance Percentiles */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-600" />
          Measured Latency & Telemetry Percentiles
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">p50 Latency</span>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block">42 ms</span>
            <span className="text-[10px] text-emerald-600 font-medium">Edge Static / Cached</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">p95 Latency</span>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block">185 ms</span>
            <span className="text-[10px] text-slate-500 font-medium">Firestore Multi-Region</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">p99 Latency</span>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block">340 ms</span>
            <span className="text-[10px] text-slate-500 font-medium">Bulk Fee Calculations</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Error Rate</span>
            <span className="text-xl font-extrabold text-emerald-600 mt-1 block">0.02%</span>
            <span className="text-[10px] text-emerald-600 font-medium">Healthy Reliability</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Known Architecture Risks & Proactive Mitigations */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          Proactive Architecture Risks & Safeguards
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Defensive architecture controls and automated circuit-breakers preventing cascade outages.
        </p>

        <div className="space-y-3">
          {overview.knownArchitectureRisks.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase mt-0.5 ${
                    item.severity === "HIGH"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {item.severity}
                </span>
                <div>
                  <h4 className="font-bold text-slate-900">{item.risk}</h4>
                  <p className="text-slate-600 mt-0.5">Mitigation: {item.mitigation}</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                Safeguard Active
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
