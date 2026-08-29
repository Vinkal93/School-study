"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Lock, Sparkles, ArrowRight, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { canAccessFeature } from "@/lib/billing";
import type { FeatureCheckResult } from "@/types";

interface FeatureGateProps {
  feature: string;
  fallback?: ReactNode;
  children: ReactNode;
  showLoading?: boolean;
}

export function FeatureGate({
  feature,
  fallback,
  children,
  showLoading = true,
}: FeatureGateProps) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const role = profile?.role;

  const [loading, setLoading] = useState(true);
  const [accessResult, setAccessResult] = useState<FeatureCheckResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function check() {
      // Super admins always have global access
      if (role === "super_admin") {
        if (isMounted) {
          setAccessResult({
            allowed: true,
            reason: "ALLOWED",
            code: "ALLOWED",
            message: "Super admin access granted.",
            accessMode: "FULL_ACCESS",
          });
          setLoading(false);
        }
        return;
      }

      if (!schoolId) {
        if (isMounted) {
          setAccessResult({
            allowed: false,
            reason: "NO_SCHOOL",
            code: "UNAUTHORIZED",
            message: "No associated school found.",
            accessMode: "NO_ACCESS",
          });
          setLoading(false);
        }
        return;
      }

      try {
        const res = await canAccessFeature(schoolId, feature);
        if (isMounted) {
          setAccessResult(res);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setAccessResult({
            allowed: false,
            reason: "ERROR",
            code: "AUTHORIZATION_ERROR",
            message: "Unable to verify plan access.",
            accessMode: "NO_ACCESS",
          });
          setLoading(false);
        }
      }
    }

    check();

    return () => {
      isMounted = false;
    };
  }, [schoolId, role, feature]);

  if (loading) {
    if (!showLoading) return null;
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }

  if (accessResult?.allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Format readable feature name
  const formattedFeatureName = feature
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="w-full rounded-3xl border border-amber-200/80 bg-gradient-to-b from-amber-50/40 via-white to-white p-8 text-center shadow-xs dark:border-amber-900/50 dark:from-amber-950/20 dark:via-gray-950 dark:to-gray-950">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-inner dark:bg-amber-950/80 dark:text-amber-400">
        <Lock className="h-6 w-6 stroke-[2.5]" />
      </div>

      <div className="mt-4 space-y-2 max-w-md mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-bold">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Plan Upgrade Required</span>
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {formattedFeatureName} is not available on your current plan
        </h3>

        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {accessResult?.message ||
            `Upgrade to a higher tier plan to unlock ${formattedFeatureName} and advanced institutional management capabilities.`}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/admin/billing"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
        >
          <span>View Plans & Upgrade</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
