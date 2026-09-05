import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing/plans";
import { resolveSubscriptionStatus } from "@/lib/billing/subscriptionEngine";
import { getActiveAccessOverrides, getActiveLimitOverrides } from "@/lib/billing/subscriptionAdjustmentEngine";
import type { SchoolSubscription, School } from "@/types";

/**
 * GET /api/super-admin/subscriptions
 * Global subscription visibility with school info, overrides, penalties, search, and multi-field filters
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const statusFilter = (searchParams.get("status") || "ALL").toUpperCase();
    const planFilter = searchParams.get("plan") || "ALL";
    const cycleFilter = searchParams.get("cycle") || "ALL";
    const overrideFilter = searchParams.get("override") || "ALL";
    const penaltyFilter = searchParams.get("penalty") || "ALL";
    const sortBy = searchParams.get("sort") || "newest";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const db = getFirebaseDb();
    let subscriptions: SchoolSubscription[] = [];
    const schoolsMap = new Map<string, { schoolName: string; adminName: string; email: string; phone: string }>();
    const overridesCountMap = new Map<string, number>();
    const penaltiesMap = new Map<string, { pendingAmount: number; count: number }>();

    if (db) {
      try {
        const [subSnap, schoolSnap, overrideSnap, penaltySnap] = await Promise.all([
          getDocs(collection(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS)),
          getDocs(collection(db, "schools")),
          getDocs(collection(db, BILLING_COLLECTIONS.ACCESS_OVERRIDES)),
          getDocs(collection(db, BILLING_COLLECTIONS.PENALTIES)),
        ]);

        subSnap.forEach((d) => {
          subscriptions.push({ id: d.id, ...d.data() } as SchoolSubscription);
        });

        schoolSnap.forEach((d) => {
          const s = d.data() as any;
          schoolsMap.set(d.id, {
            schoolName: s.name || s.schoolName || `School (${d.id})`,
            adminName: s.adminName || s.contactPerson || "Admin",
            email: s.email || s.contactEmail || "",
            phone: s.phone || s.contactPhone || "",
          });
        });

        const now = new Date().toISOString();
        overrideSnap.forEach((d) => {
          const o = d.data() as any;
          if (o.status === "ACTIVE" && o.endAt > now) {
            overridesCountMap.set(o.schoolId, (overridesCountMap.get(o.schoolId) || 0) + 1);
          }
        });

        penaltySnap.forEach((d) => {
          const p = d.data() as any;
          if (p.status === "PENDING") {
            const cur = penaltiesMap.get(p.schoolId) || { pendingAmount: 0, count: 0 };
            penaltiesMap.set(p.schoolId, {
              pendingAmount: cur.pendingAmount + (p.amount || 0),
              count: cur.count + 1,
            });
          }
        });
      } catch (err) {
        console.warn("Notice: Subscriptions fetch warning:", err);
      }
    }

    // Default system fallback subscription if collection is empty
    if (subscriptions.length === 0) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 86400000);
      subscriptions.push({
        id: "school_default",
        schoolId: "school_default",
        planId: "plan_professional",
        planVersionId: "plan_professional_v1",
        status: "ACTIVE",
        billingCycle: "monthly",
        startsAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: expiresAt.toISOString(),
        graceEndsAt: new Date(expiresAt.getTime() + 7 * 86400000).toISOString(),
        cancelAtPeriodEnd: false,
        renewalStatus: "NONE",
        source: "system_trial",
        lastPaymentId: null,
        lastOrderId: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      schoolsMap.set("school_default", {
        schoolName: "Demo High School",
        adminName: "Principal Sharma",
        email: "principal@demohigh.edu",
        phone: "+91 98765 43210",
      });
    }

    // Resolve live status & metrics for each subscription
    const enrichedSubscriptions = subscriptions.map((sub) => {
      const resolved = resolveSubscriptionStatus(sub);
      const schoolInfo = schoolsMap.get(sub.schoolId) || {
        schoolName: `School (${sub.schoolId})`,
        adminName: "School Admin",
        email: "",
        phone: "",
      };
      const activeOverrides = overridesCountMap.get(sub.schoolId) || 0;
      const penaltyInfo = penaltiesMap.get(sub.schoolId) || { pendingAmount: 0, count: 0 };

      return {
        ...sub,
        schoolName: schoolInfo.schoolName,
        adminName: schoolInfo.adminName,
        email: schoolInfo.email,
        phone: schoolInfo.phone,
        status: resolved.status,
        daysRemaining: resolved.daysRemaining,
        accessMode: resolved.accessMode,
        isInGrace: resolved.isInGrace,
        isExpired: resolved.isExpired,
        hasOverride: activeOverrides > 0,
        activeOverridesCount: activeOverrides,
        hasPenalty: penaltyInfo.count > 0,
        pendingPenaltyAmount: penaltyInfo.pendingAmount,
      };
    });

    // Summary counts
    const counts = {
      total: enrichedSubscriptions.length,
      active: enrichedSubscriptions.filter((s) => s.status === "ACTIVE" || s.status === "TRIAL").length,
      expiring: enrichedSubscriptions.filter((s) => s.status === "EXPIRING").length,
      grace: enrichedSubscriptions.filter((s) => s.status === "GRACE_PERIOD" || s.isInGrace).length,
      expired: enrichedSubscriptions.filter((s) => s.status === "EXPIRED" || s.isExpired).length,
      suspended: enrichedSubscriptions.filter((s) => s.status === "SUSPENDED").length,
      hasOverrides: enrichedSubscriptions.filter((s) => s.hasOverride).length,
      hasPenalties: enrichedSubscriptions.filter((s) => s.hasPenalty).length,
    };

    // Filter Logic
    let filtered = enrichedSubscriptions;

    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.id.toLowerCase().includes(search) ||
          s.schoolId.toLowerCase().includes(search) ||
          s.schoolName.toLowerCase().includes(search) ||
          s.adminName.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search) ||
          s.phone.toLowerCase().includes(search) ||
          s.planId.toLowerCase().includes(search)
      );
    }

    if (statusFilter !== "ALL") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    if (planFilter !== "ALL") {
      filtered = filtered.filter((s) => s.planId === planFilter);
    }

    if (cycleFilter !== "ALL") {
      filtered = filtered.filter((s) => s.billingCycle === cycleFilter);
    }

    if (overrideFilter === "YES") {
      filtered = filtered.filter((s) => s.hasOverride);
    } else if (overrideFilter === "NO") {
      filtered = filtered.filter((s) => !s.hasOverride);
    }

    if (penaltyFilter === "YES") {
      filtered = filtered.filter((s) => s.hasPenalty);
    } else if (penaltyFilter === "NO") {
      filtered = filtered.filter((s) => !s.hasPenalty);
    }

    // Sort Logic
    filtered.sort((a, b) => {
      if (sortBy === "daysRemaining") {
        return a.daysRemaining - b.daysRemaining;
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "schoolName") {
        return a.schoolName.localeCompare(b.schoolName);
      }
      // default: newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
    // Background run of expiring subscriptions notifier (idempotent)
    const { checkAndNotifyExpiringSchools } = await import("@/lib/billing/expiryNotifier");
    checkAndNotifyExpiringSchools().catch((err) => console.warn("[SubscriptionsRoute] Expiry notifier notice:", err));

    return NextResponse.json({
      success: true,
      subscriptions: paginated,
      counts,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("GET Super Admin Subscriptions Error:", error);
    return NextResponse.json(
      { error: "Failed to load subscriptions: " + (error.message || "") },
      { status: 500 }
    );
  }
}
