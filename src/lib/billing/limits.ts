import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { PlanLimits, PlanLimitCheckResult } from "@/types";
import { getSchoolAccess } from "./accessEngine";

/**
 * Section 10 & 12: Reusable Limit Engine Foundation (checkPlanLimit).
 * Reads actual Firestore collection count (no fake counters) and checks against active plan limits.
 * Explicitly supports Unlimited capacity represented by -1.
 */
export async function checkPlanLimit(
  schoolId: string,
  resourceType: "students" | "teachers" | "classes" | "staff" | "storage"
): Promise<PlanLimitCheckResult> {
  const db = getFirebaseDb();
  const summary = await getSchoolAccess(schoolId);

  const limitKeyMap: Record<string, keyof PlanLimits> = {
    students: "maxStudents",
    teachers: "maxTeachers",
    classes: "maxClasses",
    staff: "maxStaffAccounts",
  };

  const limitKey = limitKeyMap[resourceType];
  const limit = (summary.limits && typeof summary.limits[limitKey] === "number")
    ? summary.limits[limitKey]
    : 500;

  let currentCount = 0;
  if (db) {
    try {
      if (resourceType === "students") {
        const snap = await getDocs(collection(db, "schools", schoolId, "students"));
        currentCount = snap.size;
      } else if (resourceType === "teachers") {
        const snap = await getDocs(collection(db, "schools", schoolId, "teachers"));
        currentCount = snap.size;
      } else if (resourceType === "classes") {
        const snap = await getDocs(collection(db, "schools", schoolId, "classes"));
        currentCount = snap.size;
      } else if (resourceType === "staff") {
        const snap = await getDocs(
          query(
            collection(db, "users"),
            where("schoolId", "==", schoolId),
            where("role", "==", "school_admin")
          )
        );
        currentCount = snap.size;
      }
    } catch (err) {
      console.warn("Failed to fetch collection count for plan limit check:", err);
    }
  }

  // Explicit Unlimited check (-1 represents unlimited)
  if (limit === -1) {
    return {
      allowed: true,
      current: currentCount,
      limit: -1,
      remaining: Infinity,
      message: "Unlimited capacity available.",
    };
  }

  const allowed = currentCount < limit;
  const remaining = Math.max(0, limit - currentCount);

  if (!allowed) {
    return {
      allowed: false,
      current: currentCount,
      limit,
      remaining: 0,
      reason: "LIMIT_REACHED",
      message: `You have reached the ${resourceType} limit for your current plan.`,
    };
  }

  return {
    allowed: true,
    current: currentCount,
    limit,
    remaining,
    message: "Capacity available.",
  };
}
