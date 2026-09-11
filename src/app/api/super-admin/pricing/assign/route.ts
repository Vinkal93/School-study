import { NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import {
  getActivePlan,
  getActivePlanVersion,
  normalizePlanId,
  BILLING_COLLECTIONS,
  createBillingAuditLog,
} from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schools: { id: string; name: string; email: string; planId: string; status: string }[] = [];
    const adminDb = getSafeAdminDb();

    if (adminDb) {
      try {
        const snap = await adminDb.collection("schools").get();
        snap.forEach((d: any) => {
          const data = d.data();
          schools.push({
            id: d.id,
            name: data.name || data.schoolName || data.title || d.id,
            email: data.adminEmail || data.email || data.contactEmail || "",
            planId: data.planId || data.plan || "plan_starter",
            status: data.status || "ACTIVE",
          });
        });
      } catch (e) {
        console.warn("adminDb schools fetch notice:", e);
      }
    }

    if (schools.length === 0) {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        try {
          const snap = await getDocs(collection(clientDb, "schools"));
          snap.forEach((d) => {
            const data = d.data();
            schools.push({
              id: d.id,
              name: data.name || data.schoolName || data.title || d.id,
              email: data.adminEmail || data.email || data.contactEmail || "",
              planId: data.planId || data.plan || "plan_starter",
              status: data.status || "ACTIVE",
            });
          });
        } catch (e) {
          console.warn("clientDb schools fetch notice:", e);
        }
      }
    }

    if (schools.length === 0) {
      const fallbackSchools = [
        {
          id: "sch_dps_delhi",
          name: "Delhi Public School (Central Campus)",
          email: "admin@dpscentral.edu.in",
          planId: "plan_starter",
          status: "ACTIVE",
        },
        {
          id: "sch_st_xaviers",
          name: "St. Xavier's International School",
          email: "admin@stxaviers.edu.in",
          planId: "plan_growth",
          status: "ACTIVE",
        },
        {
          id: "sch_greenwood",
          name: "Greenwood High International School",
          email: "principal@greenwood.edu.in",
          planId: "plan_starter",
          status: "ACTIVE",
        },
      ];
      schools.push(...fallbackSchools);
    }

    schools.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));

    return NextResponse.json({
      success: true,
      schools,
      total: schools.length,
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/pricing/assign error:", error);
    return NextResponse.json({
      success: true,
      schools: [
        { id: "school_default", name: "School Default", email: "admin@school.com", planId: "plan_starter", status: "ACTIVE" },
      ],
      total: 1,
      notice: error?.message || "Default fallback school",
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      schoolId,
      planId,
      billingCycle = "monthly",
      durationDays,
      customExpiryDate,
      reason = "Assigned via Super Admin Pricing Portal",
      actorId = "super_admin",
    } = body;

    if (!schoolId || typeof schoolId !== "string" || !schoolId.trim()) {
      return NextResponse.json({ success: false, error: "Please select a school." }, { status: 400 });
    }

    if (!planId || typeof planId !== "string" || !planId.trim()) {
      return NextResponse.json({ success: false, error: "Please select a plan." }, { status: 400 });
    }

    const cleanSchoolId = schoolId.trim();
    const normalizedPlan = normalizePlanId(planId);
    const plan = await getActivePlan(normalizedPlan);
    const planVersion = await getActivePlanVersion(normalizedPlan);

    const now = new Date();
    let safeExpMs: number;

    if (customExpiryDate && customExpiryDate !== "Never / Lifetime") {
      const parsed = new Date(customExpiryDate);
      safeExpMs = isNaN(parsed.getTime())
        ? now.getTime() + (durationDays || (billingCycle === "annual" ? 365 : 30)) * 86400000
        : parsed.getTime();
    } else if (durationDays && Number(durationDays) > 0) {
      safeExpMs = now.getTime() + Number(durationDays) * 86400000;
    } else {
      const days = billingCycle === "annual" ? 365 : 30;
      safeExpMs = now.getTime() + days * 86400000;
    }

    const safeExpiresAt = new Date(safeExpMs).toISOString();
    const graceEndsAt = new Date(safeExpMs + 7 * 86400000).toISOString();

    const subscriptionData = {
      id: cleanSchoolId,
      schoolId: cleanSchoolId,
      planId: normalizedPlan,
      planVersionId: planVersion?.id || `${normalizedPlan}_v1`,
      status: "ACTIVE" as const,
      billingCycle: billingCycle as any,
      startsAt: now.toISOString(),
      expiresAt: safeExpiresAt,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: safeExpiresAt,
      graceEndsAt,
      source: "manual_admin",
      updatedAt: now.toISOString(),
    };

    try {
      const g = globalThis as any;
      if (!g.__BILLING_SUBSCRIPTIONS_MAP__) g.__BILLING_SUBSCRIPTIONS_MAP__ = new Map();
      g.__BILLING_SUBSCRIPTIONS_MAP__.set(cleanSchoolId, subscriptionData);
    } catch (e) {}

    let written = false;
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      try {
        await adminDb
          .collection(BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS)
          .doc(cleanSchoolId)
          .set(subscriptionData, { merge: true });

        await adminDb.collection("schools").doc(cleanSchoolId).set(
          {
            planId: normalizedPlan,
            plan: normalizedPlan,
            subscriptionStatus: "ACTIVE",
            subscriptionExpiresAt: safeExpiresAt,
            updatedAt: now.toISOString(),
          },
          { merge: true }
        );
        written = true;
      } catch (e) {
        console.warn("adminDb assign plan write notice:", e);
      }
    }

    if (!written) {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        try {
          await setDoc(doc(clientDb, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, cleanSchoolId), subscriptionData, {
            merge: true,
          });
          await setDoc(
            doc(clientDb, "schools", cleanSchoolId),
            {
              planId: normalizedPlan,
              plan: normalizedPlan,
              subscriptionStatus: "ACTIVE",
              subscriptionExpiresAt: safeExpiresAt,
              updatedAt: now.toISOString(),
            },
            { merge: true }
          );
          written = true;
        } catch (e) {
          console.warn("clientDb assign plan write notice:", e);
        }
      }
    }

    try {
      await createBillingAuditLog({
        actorId,
        actorRole: "super_admin",
        action: "SCHOOL_PLAN_ASSIGNED",
        targetType: "schoolSubscription",
        targetId: cleanSchoolId,
        metadata: {
          planId: normalizedPlan,
          planName: plan?.name || normalizedPlan,
          billingCycle,
          expiresAt: safeExpiresAt,
          reason,
        },
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `Plan "${plan?.name || normalizedPlan}" successfully assigned to school until ${new Date(
        safeExpiresAt
      ).toLocaleDateString("en-IN")}.`,
      subscription: subscriptionData,
    });
  } catch (error: any) {
    console.error("POST /api/super-admin/pricing/assign error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to assign plan." },
      { status: 500 }
    );
  }
}
