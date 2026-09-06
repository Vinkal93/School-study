"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ModernInquiryPortal2_0 } from "@/components/inquiries/ModernInquiryPortal2_0";
import { useSearchParams } from "next/navigation";
import { usePortalUI } from "@/context/portal-ui-context";
import { MessageSquare, RefreshCw, Sparkles, AlertCircle } from "lucide-react";

export default function SchoolAdminInquiriesPage() {
  const { profile, loading } = useAuth();
  const searchParams = useSearchParams();
  const { getPortalVersion } = usePortalUI();

  const urlView = searchParams?.get("v") || searchParams?.get("view");
  const [viewVersion, setViewVersion] = useState<"classic" | "new">(() => {
    if (urlView === "classic" || urlView === "1") return "classic";
    if (urlView === "new" || urlView === "2" || urlView === "2.0") return "new";
    return getPortalVersion("schoolAdmin") === "classic" ? "new" : "new";
  });

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <ModernInquiryPortal2_0
        portalType="schoolAdmin"
        schoolId={profile?.schoolId || undefined}
        onSwitchToClassic={() => setViewVersion("classic")}
        currentVersion={viewVersion}
      />
    </div>
  );
}
