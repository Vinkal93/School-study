"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Search,
  Filter,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import type { SecurityControlItem } from "@/types/architecture-intelligence";

interface Props {
  controls: SecurityControlItem[];
}

export default function SecurityComplianceView({ controls }: Props) {
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("ALL");

  const filtered = controls.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.implementationMechanism.toLowerCase().includes(search.toLowerCase());
    const matchesDomain = selectedDomain === "ALL" || item.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Enterprise Security & Compliance Matrix</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            OWASP ASVS 5.0 Level 2/3 and NIST SP 800-207 zero-trust security controls implemented in School Study.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search security controls..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-48 sm:w-64 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none shadow-sm"
            />
          </div>

          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none shadow-sm"
          >
            <option value="ALL">All Security Domains</option>
            <option value="IDENTITY_MFA">Identity & MFA</option>
            <option value="TENANT_ISOLATION">Tenant Isolation & BOLA</option>
            <option value="DATABASE_RULES">Database & Storage Rules</option>
            <option value="ABUSE_FIREWALL">Abuse & Rate Limiting</option>
            <option value="PAYMENT_INTEGRITY">Payment Cryptography</option>
            <option value="SECRETS">CSP & Secrets</option>
            <option value="BACKUP_DISASTER_RECOVERY">Disaster Recovery</option>
          </select>
        </div>
      </div>

      {/* Control Items Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {item.domain.replace(/_/g, " ")}
                </span>
                <span className="rounded bg-slate-900 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                  ASVS {item.asvsLevel.replace(/_/g, " ")}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-bold text-slate-900 mt-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                {item.name}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {item.description}
              </p>

              {/* Implementation Mechanism */}
              <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Implementation Mechanism
                </span>
                <code className="text-indigo-900 font-mono text-[11px] mt-1 block">
                  {item.implementationMechanism}
                </code>
              </div>
            </div>

            {/* Verification Status & Evidence */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {item.status.replace(/_/g, " ")}
              </span>

              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[210px]">
                {item.verificationEvidence}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
