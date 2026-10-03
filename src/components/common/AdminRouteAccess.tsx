"use client";
import { usePathname } from "next/navigation";
import { ADMIN_FEATURE_REGISTRY } from "@/lib/features/adminFeatureRegistry";
import { EntitlementGate } from "./EntitlementGate";
import type { ReactNode } from "react";

export function AdminRouteAccess({ children }: { children: ReactNode }) {
  const path = usePathname();
  const feature = ADMIN_FEATURE_REGISTRY.filter(f => {
    const route = f.route?.split("?")[0];
    return route && (path === route || (route !== "/admin" && path.startsWith(`${route}/`)));
  }).sort((a, b) => (b.route?.length || 0) - (a.route?.length || 0) || (a.type === "module" ? 1 : -1))[0];
  if (!feature || path === "/admin" || path === "/admin/billing") return children;
  return <EntitlementGate capability={feature.key} title={feature.label}>{children}</EntitlementGate>;
}
