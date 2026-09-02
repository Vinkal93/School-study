"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Lock, Sparkles, ArrowRight, ShieldAlert, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { canAccessFeature, checkPlanLimit } from "@/lib/billing";
import { useEntitlement } from "@/context/EntitlementContext";
import type { FeatureCheckResult, ResourceLimitKey } from "@/types";

export interface EntitlementGateProps {
  feature?: string;
  limitKey?: ResourceLimitKey;
  currentCount?: number;
  type?: "page" | "tab" | "section" | "action" | "button" | "module" | "limit";
  title?: string;
  description?: string;
  requiredPlan?: string;
  fallback?: ReactNode;
  children: ReactNode;
  showLoading?: boolean;
  blurred?: boolean;
}

export function EntitlementGate({
  feature,
  limitKey,
  currentCount,
  type = "page",
  title,
  description,
  requiredPlan = "Professional Plan",
  fallback,
  children,
  showLoading = true,
  blurred = true,
}: EntitlementGateProps) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const role = profile?.role;
  const entitlementCtx = useEntitlement();

  const [loading, setLoading] = useState(true);
  const [accessResult, setAccessResult] = useState<FeatureCheckResult | null>(null);
  const [limitExceeded, setLimitExceeded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function evaluateAccess() {
      // 1. Super Admin always bypasses frontend feature gates
      if (role === "super_admin") {
        if (isMounted) {
          setAccessResult({
            allowed: true,
            reason: "ALLOWED",
            code: "ALLOWED",
            message: "Super admin access granted.",
            accessMode: "FULL_ACCESS",
          });
          setLimitExceeded(false);
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

      // 2. Limit Check Evaluation
      if (limitKey) {
        if (entitlementCtx?.entitlement?.limits?.[limitKey]) {
          const limitStatus = entitlementCtx.entitlement.limits[limitKey];
          const isOver = limitStatus.isOverLimit || (currentCount !== undefined && !limitStatus.isUnlimited && currentCount >= limitStatus.limit);
          if (isMounted) {
            setLimitExceeded(isOver);
            setAccessResult({
              allowed: !isOver,
              reason: isOver ? "LIMIT_EXCEEDED" : "ALLOWED",
              code: isOver ? "LIMIT_EXCEEDED" : "ALLOWED",
              message: isOver ? `Capacity limit reached for ${limitKey}. Upgrade plan for higher limits.` : "Within capacity limits.",
              accessMode: entitlementCtx.accessMode as any,
            });
            setLoading(false);
          }
          return;
        } else {
          try {
            const limitRes = await checkPlanLimit(schoolId, limitKey);
            if (isMounted) {
              const isOver = !limitRes.allowed;
              setLimitExceeded(isOver);
              setAccessResult({
                allowed: !isOver,
                reason: isOver ? "LIMIT_EXCEEDED" : "ALLOWED",
                code: isOver ? "LIMIT_EXCEEDED" : "ALLOWED",
                message: limitRes.message,
                accessMode: "FULL_ACCESS",
              });
              setLoading(false);
            }
            return;
          } catch (e) {}
        }
      }

      // 3. Feature Key Evaluation via Real-Time Entitlement Context
      if (feature && entitlementCtx?.entitlement) {
        const isAllowed = entitlementCtx.canAccess(feature);
        if (isMounted) {
          setAccessResult({
            allowed: isAllowed,
            reason: isAllowed ? "ALLOWED" : "FEATURE_NOT_INCLUDED",
            code: isAllowed ? "ALLOWED" : "FEATURE_NOT_INCLUDED",
            message: isAllowed
              ? "Access granted."
              : `Feature "${feature}" is not included in your current plan (${entitlementCtx.entitlement.plan.name}).`,
            accessMode: entitlementCtx.accessMode as any,
          });
          setLoading(false);
        }
        return;
      }

      // 4. Fallback async feature check
      if (feature) {
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
        return;
      }

      // Default fallback
      if (isMounted) {
        setAccessResult({ allowed: true, reason: "ALLOWED", code: "ALLOWED", message: "Allowed", accessMode: "FULL_ACCESS" });
        setLoading(false);
      }
    }

    evaluateAccess();

    return () => {
      isMounted = false;
    };
  }, [schoolId, role, feature, limitKey, currentCount, entitlementCtx?.entitlement]);

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

  // Format readable title and feature description
  const formattedFeatureName =
    title ||
    (feature
      ? feature
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : limitKey
      ? `${limitKey.charAt(0).toUpperCase() + limitKey.slice(1)} Limit Reached`
      : "Feature Locked");

  const currentPlanName = entitlementCtx?.entitlement?.plan?.name || "Starter Plan";

  // Action / Button level gating
  if (type === "action" || type === "button") {
    return (
      <div className="relative inline-block group">
        <div className="pointer-events-none select-none opacity-50 cursor-not-allowed filter blur-[1px]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px] rounded-xl">
          <Link
            href="/admin/billing"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold shadow-md hover:bg-amber-700 transition-all"
            title={`${formattedFeatureName} requires ${requiredPlan}`}
          >
            <Lock className="h-3 w-3" />
            <span>Locked (Upgrade)</span>
          </Link>
        </div>
      </div>
    );
  }

  // Page / Tab / Module / Section level blurred gating
  return (
    <div className="relative w-full overflow-hidden rounded-3xl min-h-[360px] my-2">
      {/* Background Content in Blurred & Non-Interactive State */}
      <div
        className="pointer-events-none select-none filter blur-md opacity-30 transition-all aria-hidden"
        aria-hidden="true"
        tabIndex={-1}
      >
        {children}
      </div>

      {/* Centered Lock Overlay Card */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 bg-slate-900/30 backdrop-blur-xs z-20">
        <div className="w-full max-w-md rounded-3xl border border-amber-200/90 bg-white/95 p-6 sm:p-8 text-center shadow-2xl dark:border-amber-900/80 dark:bg-slate-900/95 transition-all">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-inner dark:bg-amber-950/80 dark:text-amber-400">
            <Lock className="h-6 w-6 stroke-[2.5]" />
          </div>

          <div className="mt-4 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/90 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{limitExceeded ? "Limit Reached" : "Feature Locked"}</span>
            </div>

            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
              {formattedFeatureName}
            </h3>

            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1">
              <p>
                {description ||
                  (limitExceeded
                    ? `You have reached your ${limitKey} capacity limit on your current plan.`
                    : `This feature is not available on your current plan.`)}
              </p>
              <div className="pt-2 flex items-center justify-center gap-3 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Current Plan: <strong>{currentPlanName}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  Required: <strong>{requiredPlan}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/admin/billing"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all"
            >
              <span>Upgrade Plan Now</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export FeatureGate as alias for backward compatibility
export const FeatureGate = EntitlementGate;
