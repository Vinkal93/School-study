import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, addDoc, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import type { AiUsageRecord, AiPortalType } from "@/types/ai";

export async function recordAiUsage(usage: Omit<AiUsageRecord, "id" | "monthKey">): Promise<void> {
  const monthKey = new Date().toISOString().substring(0, 7); // e.g. "2026-09"
  const record: Omit<AiUsageRecord, "id"> = {
    ...usage,
    monthKey,
  };

  const adminDb = getSafeAdminDb();
  if (adminDb) {
    try {
      await adminDb.collection("ai_usage").add(record);
      return;
    } catch (e) {}
  }

  const clientDb = getFirebaseDb();
  if (clientDb) {
    try {
      await addDoc(collection(clientDb, "ai_usage"), record);
    } catch (e) {}
  }
}

/**
 * Checks how many requests an institute or user made in the current calendar month.
 */
export async function getMonthlyAiUsageCount(params: {
  instituteId?: string;
  userId?: string;
}): Promise<number> {
  const { instituteId, userId } = params;
  const monthKey = new Date().toISOString().substring(0, 7);
  const adminDb = getSafeAdminDb();

  if (adminDb) {
    try {
      let q = adminDb.collection("ai_usage").where("monthKey", "==", monthKey);
      if (instituteId) {
        q = q.where("instituteId", "==", instituteId);
      } else if (userId) {
        q = q.where("userId", "==", userId);
      }
      const snap = await q.get();
      return snap.size;
    } catch (e) {}
  }

  return 0;
}

/**
 * Aggregates platform-wide AI usage statistics for Super Admin dashboard.
 */
export async function getSuperAdminAiAnalytics(): Promise<{
  totalRequests: number;
  requestsThisMonth: number;
  byPortal: Record<string, number>;
  byPlan: Record<string, number>;
  recentRequests: any[];
}> {
  const monthKey = new Date().toISOString().substring(0, 7);
  const adminDb = getSafeAdminDb();

  const result = {
    totalRequests: 0,
    requestsThisMonth: 0,
    byPortal: {} as Record<string, number>,
    byPlan: {} as Record<string, number>,
    recentRequests: [] as any[],
  };

  if (!adminDb) return result;

  try {
    const snap = await adminDb.collection("ai_usage").limit(500).get();
    result.totalRequests = snap.size;

    snap.docs.forEach((d: any) => {
      const data = d.data();
      if (data.monthKey === monthKey) {
        result.requestsThisMonth++;
      }
      const portal = data.portal || "unknown";
      result.byPortal[portal] = (result.byPortal[portal] || 0) + 1;

      const plan = data.planId || "free";
      result.byPlan[plan] = (result.byPlan[plan] || 0) + 1;
    });

    result.recentRequests = snap.docs.slice(0, 20).map((d: any) => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (e) {}

  return result;
}
