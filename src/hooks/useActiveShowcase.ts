"use client";
import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { selectActiveShowcase } from "@/lib/services/showcase.service";
import { useAuth } from "@/hooks/use-auth";
import { useEntitlement } from "@/context/EntitlementContext";
import type { FeatureShowcase } from "@/types/ai";

export function useActiveShowcase(context: "landing" | "dashboard") {
  const { profile } = useAuth();
  const { entitlement, loading } = useEntitlement();
  const [active, setActive] = useState<FeatureShowcase | null>(null);
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || (context === "dashboard" && !profile)) return;
    let settings: Record<string, unknown> = {}, items: FeatureShowcase[] = [];
    let gotSettings = false, gotItems = false;
    const update = () => { if (gotSettings && gotItems) setActive(selectActiveShowcase(items, settings, context, profile?.role, entitlement?.plan.id)); };
    const stopSettings = onSnapshot(doc(db, "siteSettings", "feature_showcase_settings"), snap => { settings = snap.data() || {}; gotSettings = true; update(); }, () => setActive(null));
    const stopItems = onSnapshot(collection(db, "feature_showcases"), snap => { items = snap.docs.map(d => ({ ...d.data(), id: d.id } as FeatureShowcase)); gotItems = true; update(); }, () => setActive(null));
    const timer = setInterval(update, 30_000);
    return () => { stopSettings(); stopItems(); clearInterval(timer); };
  }, [context, profile?.role, profile?.schoolId, entitlement?.plan.id]);
  return context === "dashboard" && profile?.role !== "super_admin" && loading ? null : active;
}
