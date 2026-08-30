import React, { useState } from "react";
import { Building2, ShieldCheck } from "lucide-react";
import { VerifyIcon, VerifyBadge } from "@/components/common/VerifyBadge";
import { TenantCardData } from "./types";

interface TenantBrandingProps {
  tenant: TenantCardData & { verificationBadge?: string | null };
}

export function TenantBranding({ tenant }: TenantBrandingProps) {
  const [logoError, setLogoError] = useState(false);

  const schoolName = tenant.name || "School Study Institute";
  const shortName = tenant.shortName || tenant.name?.split(" ")[0] || "School";

  return (
    <div className="flex items-center gap-2 justify-end text-right max-w-[150px] sm:max-w-[200px] shrink-0">
      {/* Logo Image or Fallback Shield Icon */}
      <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center overflow-hidden">
        {tenant.logoUrl && !logoError ? (
          <img
            src={tenant.logoUrl}
            alt={`${schoolName} logo`}
            onError={() => setLogoError(true)}
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        )}
      </div>

      {/* School Name & Verification */}
      <div className="min-w-0">
        <div className="flex items-center justify-end gap-1">
          <p className="text-xs sm:text-sm font-extrabold text-blue-950 dark:text-blue-200 tracking-tight leading-tight truncate">
            {shortName}
          </p>
          {tenant.verificationBadge && tenant.verificationBadge !== "none" && (
            <VerifyIcon type={tenant.verificationBadge as any} size="xs" />
          )}
        </div>
        <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-tight truncate">
          {schoolName}
        </p>
      </div>
    </div>
  );
}
