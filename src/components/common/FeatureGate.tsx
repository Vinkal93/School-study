"use client";

import React from "react";
import { useEntitlement } from "@/context/EntitlementContext";
import { AlertTriangle } from "lucide-react";

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showNotice?: boolean;
  inlineNotice?: string;
}

export function FeatureGate({
  featureKey,
  children,
  fallback,
  showNotice = false,
  inlineNotice,
}: FeatureGateProps) {
  const { canAccess, loading } = useEntitlement();

  if (loading) return null;

  const allowed = canAccess(featureKey);

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (inlineNotice) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 italic">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>{inlineNotice}</span>
      </span>
    );
  }

  if (showNotice) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-amber-500 mb-2" />
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          Feature Currently Unavailable
        </p>
        <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">
          This operation has been temporarily restricted by platform administration.
        </p>
      </div>
    );
  }

  return null;
}
