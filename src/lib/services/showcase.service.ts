import { collection, doc, getDocs, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseDb, getFirebaseAuth } from "@/lib/firebase/client";
import type { FeatureShowcase } from "@/types/ai";

export async function showcaseAdminRequest(_url: string, options?: RequestInit): Promise<Response> {
  const db = getFirebaseDb();
  const user = getFirebaseAuth()?.currentUser;
  if (!db || !user) throw new Error("Sign in to manage showcases.");
  const profile = await getDoc(doc(db, "users", user.uid));
  if (profile.data()?.role !== "super_admin") throw new Error("Super admin access required.");
  const settingsRef = doc(db, "siteSettings", "feature_showcase_settings");
  if (options?.method === "POST") {
    const data = JSON.parse(String(options.body || "{}"));
    if (data.action === "toggle_all") await setDoc(settingsRef, { enabled: Boolean(data.enabled) }, { merge: true });
    else if (data.action === "toggle_landing") await setDoc(settingsRef, { landingBannerEnabled: Boolean(data.enabled) }, { merge: true });
    else {
      if (!data.id || !data.title?.trim()) throw new Error("Showcase title and ID are required.");
      await setDoc(doc(db, "feature_showcases", data.id), { ...data, updatedBy: user.uid, updatedAt: new Date().toISOString() }, { merge: true });
    }
    return Response.json({ success: true });
  }
  const [items, settings] = await Promise.all([getDocs(collection(db, "feature_showcases")), getDoc(settingsRef)]);
  return Response.json({ showcases: items.docs.map(d => ({ ...d.data(), id: d.id })), settings: settings.data() || { enabled: false } });
}

export function selectActiveShowcase(items: FeatureShowcase[], settings: Record<string, unknown>, context: "landing" | "dashboard", role?: string, planId?: string, now = Date.now()) {
  if (settings.enabled !== true || (context === "landing" && settings.landingBannerEnabled === false) || (context === "dashboard" && settings.dashboardModalEnabled === false)) return null;
  return items.filter(s => s.status === "PUBLISHED" && s.enabled !== false &&
    (context === "landing" ? s.showOnLandingPage : s.showOnDashboard) &&
    (!s.startDate || Date.parse(s.startDate) <= now) && (!s.endDate || Date.parse(s.endDate) > now) &&
    (context === "landing" || ((!s.targetPortals?.length || s.targetPortals.includes(role as never)) && (!s.targetPlans?.length || s.targetPlans.includes("ALL") || (!!planId && s.targetPlans.includes(planId)))))
  ).sort((a, b) => (b.priority || 0) - (a.priority || 0))[0] || null;
}
