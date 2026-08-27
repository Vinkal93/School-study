"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { ShieldAlert, LogOut, UserCheck } from "lucide-react";

export function ImpersonationBanner() {
  const { isImpersonating, profile, originalSuperAdminProfile, stopImpersonating } = useAuth();

  if (!isImpersonating || !profile) return null;

  return (
    <div className="w-full bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 shadow-md border-b border-amber-600 sticky top-0 z-[99999]">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0 text-slate-950 animate-pulse" />
        <span>
          <strong>LIVE IMPRESSION MODE:</strong> Viewing portal as{" "}
          <span className="underline decoration-2 font-black">{profile.name}</span> (
          <span className="uppercase text-[11px] bg-slate-950 text-amber-300 px-2 py-0.5 rounded-md font-mono">
            {profile.role}
          </span>
          {profile.schoolId && ` • School ID: ${profile.schoolId}`})
        </span>
      </div>

      <button
        onClick={() => stopImpersonating()}
        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 hover:bg-slate-900 text-amber-400 font-extrabold text-xs rounded-lg shadow-sm active:scale-95 transition-all cursor-pointer"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span>Exit Live Mode & Return to Super Admin</span>
      </button>
    </div>
  );
}
