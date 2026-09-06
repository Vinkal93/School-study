"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Lock, Sparkles, ArrowRight, ShieldAlert, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { canAccessFeature, checkPlanLimit } from "@/lib/billing";
import { useEntitlement } from "@/context/EntitlementContext";
import type { FeatureCheckResult, ResourceLimitKey, FeatureAccessMode } from "@/types";

export interface EntitlementGateProps {
  feature?: string;
  action?: string;
  capability?: string;
  limitKey?: ResourceLimitKey;
  currentCount?: number;
  type?: "page" | "tab" | "section" | "action" | "button" | "module" | "limit" | "export";
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
  action,
  capability,
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
  const targetCapability = capability || action || feature;
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const role = profile?.role;
  const entitlementCtx = useEntitlement();

  const [loading, setLoading] = useState(true);
  const [accessResult, setAccessResult] = useState<FeatureCheckResult | null>(null);
  const [accessMode, setAccessMode] = useState<FeatureAccessMode>("FULL_ACCESS");
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
          setAccessMode("FULL_ACCESS");
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
          setAccessMode("HIDDEN");
          setLoading(false);
        }
        return;
      }

      // 2. Feature / Action / Capability Check Evaluation FIRST
      let isAllowed = true;
      let denialMessage = "";
      let resolvedMode: FeatureAccessMode = "FULL_ACCESS";

      if (targetCapability) {
        if (entitlementCtx?.entitlement) {
          isAllowed = entitlementCtx.canAccess(targetCapability);
          resolvedMode = entitlementCtx.getCapabilityAccessMode(targetCapability);
          if (!isAllowed) {
            denialMessage = `Capability "${targetCapability}" is not included in your current plan (${entitlementCtx.entitlement.plan.name}).`;
          }
        } else {
          try {
            const res = await canAccessFeature(schoolId, targetCapability);
            isAllowed = res.allowed;
            denialMessage = res.message;
            resolvedMode = res.code === "FEATURE_SHOWCASE" ? "SHOWCASE" : res.allowed ? "FULL_ACCESS" : "HIDDEN";
          } catch (err) {
            isAllowed = false;
            denialMessage = "Unable to verify plan access.";
            resolvedMode = "HIDDEN";
          }
        }
      }

      if (!isAllowed) {
        if (isMounted) {
          setLimitExceeded(false);
          setAccessMode(resolvedMode);
          setAccessResult({
            allowed: false,
            reason: resolvedMode === "SHOWCASE" ? "FEATURE_SHOWCASE" : "FEATURE_NOT_INCLUDED",
            code: resolvedMode === "SHOWCASE" ? "FEATURE_SHOWCASE" : "FEATURE_NOT_INCLUDED",
            message: denialMessage || "Feature not included in plan.",
            accessMode: (entitlementCtx?.accessMode as any) || "NO_ACCESS",
          });
          setLoading(false);
        }
        return;
      }

      // 3. Limit Check Evaluation SECOND
      if (limitKey) {
        let isOver = false;
        let limitMsg = "";

        if (entitlementCtx?.entitlement?.limits?.[limitKey]) {
          const limitStatus = entitlementCtx.entitlement.limits[limitKey];
          isOver = limitStatus.isOverLimit || (currentCount !== undefined && !limitStatus.isUnlimited && currentCount >= limitStatus.limit);
          limitMsg = isOver ? `Capacity limit reached for ${limitKey}. Upgrade plan for higher limits.` : "Within capacity limits.";
        } else {
          try {
            const limitRes = await checkPlanLimit(schoolId, limitKey);
            isOver = !limitRes.allowed;
            limitMsg = limitRes.message;
          } catch (e) {}
        }

        if (isOver) {
          if (isMounted) {
            setLimitExceeded(true);
            setAccessMode("SHOWCASE");
            setAccessResult({
              allowed: false,
              reason: "LIMIT_EXCEEDED",
              code: "LIMIT_EXCEEDED",
              message: limitMsg,
              accessMode: (entitlementCtx?.accessMode as any) || "FULL_ACCESS",
            });
            setLoading(false);
          }
          return;
        }
      }

      // All checks passed!
      if (isMounted) {
        setLimitExceeded(false);
        setAccessMode("FULL_ACCESS");
        setAccessResult({
          allowed: true,
          reason: "ALLOWED",
          code: "ALLOWED",
          message: "Access granted.",
          accessMode: (entitlementCtx?.accessMode as any) || "FULL_ACCESS",
        });
        setLoading(false);
      }
    }

    evaluateAccess();

    return () => {
      isMounted = false;
    };
  }, [schoolId, role, targetCapability, limitKey, currentCount, entitlementCtx?.entitlement]);

  if (loading) {
    if (!showLoading) return null;
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }

  // 1. Full Access granted
  if (accessResult?.allowed) {
    return <>{children}</>;
  }

  // 2. Custom Fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // 3. If access mode is HIDDEN, completely omit from UI
  if (accessMode === "HIDDEN" && (type === "action" || type === "button" || type === "export")) {
    return null;
  }

  // Format readable title and capability description
  const formattedFeatureName =
    title ||
    (targetCapability
      ? targetCapability
          .split(/[_.]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : limitKey
      ? `${limitKey.charAt(0).toUpperCase() + limitKey.slice(1)} Limit Reached`
      : "Feature Locked");

  // Dynamic Required Plan Resolution
  const currentPlanName = entitlementCtx?.entitlement?.plan?.name || "Starter Plan";
  const dynamicRequiredPlan =
    (targetCapability && entitlementCtx?.getRequiredPlanForCapability ? entitlementCtx.getRequiredPlanForCapability(targetCapability) : null) ||
    (targetCapability && entitlementCtx?.getRequiredPlanForFeature ? entitlementCtx.getRequiredPlanForFeature(targetCapability) : null) ||
    (targetCapability && entitlementCtx?.entitlement?.availableFromMap?.[targetCapability]) ||
    requiredPlan;

  // Action / Button / Export level gating (SHOWCASE mode)
  if (type === "action" || type === "button" || type === "export") {
    return (
      <div className="relative inline-block group">
        <div className="pointer-events-none select-none opacity-40 cursor-not-allowed">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-xs rounded-xl">
          <Link
            href="/admin/billing"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold shadow-md hover:bg-amber-700 transition-all"
            title={`${formattedFeatureName} requires ${dynamicRequiredPlan}`}
          >
            <Lock className="h-3 w-3" />
            <span>Locked (Upgrade)</span>
          </Link>
        </div>
      </div>
    );
  }

  // Page / Tab / Module / Section level locked showcase card
  // CRITICAL SECURITY RULE: children is explicitly NOT rendered here to prevent any protected queries/data leaks
  return (
    <div className="w-full flex items-center justify-center p-4 sm:p-8 min-h-[420px] my-4">
      <div className="w-full max-w-lg rounded-3xl border border-amber-200/90 bg-white/95 p-6 sm:p-10 text-center shadow-xl dark:border-amber-900/80 dark:bg-slate-900/95 transition-all">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-inner dark:bg-amber-950/80 dark:text-amber-400">
          <Lock className="h-8 w-8 stroke-[2.5]" />
        </div>

        <div className="mt-5 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100/90 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{limitExceeded ? "Limit Reached" : "Showcase & Locked Feature"}</span>
          </div>

          <h3 className="text-2xl font-black text-gray-900 dark:text-white">
            {formattedFeatureName}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {description ||
              (limitExceeded
                ? `You have reached your ${limitKey} capacity limit on your current plan.`
                : `This module is not included in your current subscription plan. Upgrade to unlock full access.`)}
          </p>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-semibold">
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Current Plan: <strong>{currentPlanName}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Available From: <strong>{dynamicRequiredPlan}</strong>
            </span>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/admin/billing"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
          >
            <span>Upgrade Plan Now</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// Export FeatureGate as alias for backward compatibility
export const FeatureGate = EntitlementGate;
