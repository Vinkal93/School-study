import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS, getActivePlanVersion } from "@/lib/billing";
import { createRazorpayOrder, loadRazorpayCredentials, mapRazorpayError } from "@/lib/payments/razorpay";
import type { Plan, PlanVersion } from "@/types";
import { InternalOrder } from "@/lib/payments/fulfillment";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, userId, planId, billingCycle = "monthly", couponCode } = body;

    // 1. Validate required session parameters
    if (!schoolId || !userId || !planId) {
      return NextResponse.json(
        { error: "Missing required request parameters (schoolId, userId, planId)." },
        { status: 400 }
      );
    }

    if (billingCycle !== "monthly" && billingCycle !== "annual") {
      return NextResponse.json(
        { error: "Invalid billingCycle. Must be 'monthly' or 'annual'." },
        { status: 400 }
      );
    }

    let planData: Plan | null = null;
    let planVersion: PlanVersion | null = null;

    // 1. Primary: Authoritative Server-Side Plan Lookup via Firebase Admin SDK
    if (adminDb) {
      try {
        let planSnap = await adminDb.collection(BILLING_COLLECTIONS.PLANS).doc(planId).get();

        // If not found by doc ID, try looking up by slug or stripped ID
        if (!planSnap.exists) {
          const cleanSlug = planId.replace(/^plan_/, "").toLowerCase();
          const slugQuery = await adminDb
            .collection(BILLING_COLLECTIONS.PLANS)
            .where("slug", "==", cleanSlug)
            .limit(1)
            .get();
          if (!slugQuery.empty) {
            planSnap = slugQuery.docs[0];
          }
        }

        if (planSnap.exists) {
          planData = { id: planSnap.id, ...planSnap.data() } as Plan;

          // Fetch active version for this plan
          const versionSnap = await adminDb
            .collection(BILLING_COLLECTIONS.PLAN_VERSIONS)
            .where("planId", "==", planSnap.id)
            .where("status", "==", "ACTIVE")
            .get();

          if (!versionSnap.empty) {
            const versions = versionSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as PlanVersion[];
            planVersion = versions.sort((a, b) => b.version - a.version)[0];
          }
        }
      } catch (adminErr) {
        console.warn("[Orders] adminDb plan lookup notice:", adminErr);
      }
    }

    // 2. Secondary: Client SDK Fallback if Admin SDK lookup returned nothing
    if (!planData || !planVersion) {
      try {
        const db = getFirebaseDb();
        if (db) {
          const planRef = doc(db, BILLING_COLLECTIONS.PLANS, planId);
          const planSnap = await getDoc(planRef);

          if (planSnap.exists()) {
            planData = { id: planSnap.id, ...planSnap.data() } as Plan;
            planVersion = await getActivePlanVersion(planId);
          }
        }
      } catch (err) {
        console.warn("[Orders] Firestore client plan lookup notice:", err);
      }
    }

    // 3. Tertiary: Static catalog fallback for default starter / professional plans
    if (!planData || !planVersion) {
      if (planId === "starter" || planId === "plan_starter") {
        planData = {
          id: "plan_starter",
          name: "Starter Plan",
          slug: "starter",
          description: "Essential school management tools for small institutions.",
          status: "ACTIVE",
          displayOrder: 1,
          isPopular: false,
          features: ["Student Management", "Teacher Management", "Class & Section Management", "Basic Attendance", "Student Portal", "Teacher Portal", "Basic Support"],
          limits: { maxStudents: 500, maxTeachers: 20, maxClasses: 15, maxStaffAccounts: 2 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        planVersion = {
          id: "plan_starter_v1",
          planId: "plan_starter",
          version: 1,
          monthlyPrice: 99900,
          annualPrice: 79900,
          currency: "INR",
          features: planData.features,
          limits: planData.limits,
          effectiveFrom: new Date().toISOString(),
          effectiveUntil: null,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        };
      } else if (planId === "professional" || planId === "plan_professional") {
        planData = {
          id: "plan_professional",
          name: "Professional Plan",
          slug: "professional",
          description: "Advanced controls & analytics for growing institutions.",
          status: "ACTIVE",
          displayOrder: 2,
          isPopular: true,
          features: ["Everything in Starter", "Advanced Attendance & Leave", "School Admin Dashboard", "Notices & Announcements", "Advanced Reports & Analytics", "Priority Support", "More Staff Accounts"],
          limits: { maxStudents: 2000, maxTeachers: 100, maxClasses: 60, maxStaffAccounts: 10 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        planVersion = {
          id: "plan_professional_v1",
          planId: "plan_professional",
          version: 1,
          monthlyPrice: 199900,
          annualPrice: 159900,
          currency: "INR",
          features: planData.features,
          limits: planData.limits,
          effectiveFrom: new Date().toISOString(),
          effectiveUntil: null,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        };
      } else {
        planData = {
          id: "plan_enterprise",
          name: "Enterprise Plan",
          slug: "enterprise",
          description: "Custom limits and dedicated support for large networks.",
          status: "ACTIVE",
          displayOrder: 3,
          isPopular: false,
          features: ["Everything in Professional", "Multiple School Support", "Custom Requirements & Modules", "Dedicated Account Manager", "Advanced Data Controls", "Custom Onboarding"],
          limits: { maxStudents: -1, maxTeachers: -1, maxClasses: -1, maxStaffAccounts: -1 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        planVersion = {
          id: "plan_enterprise_v1",
          planId: "plan_enterprise",
          version: 1,
          monthlyPrice: 0,
          annualPrice: 0,
          currency: "INR",
          features: planData.features,
          limits: planData.limits,
          effectiveFrom: new Date().toISOString(),
          effectiveUntil: null,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        };
      }
    }

    // Check for active custom offer for this school
    let activeCustomOffer: any = null;
    try {
      const { getSchoolActiveCustomOffer } = await import("@/lib/billing/customOffers");
      activeCustomOffer = await getSchoolActiveCustomOffer(schoolId, planId);
    } catch (e) {}

    // 2. Server-side authoritative price calculation in integer PAISE
    let baseAmount = billingCycle === "annual" ? planVersion.annualPrice * 12 : planVersion.monthlyPrice;
    let discountAmount = 0;
    let taxAmount = 0;

    if (activeCustomOffer && activeCustomOffer.customPricePaise !== undefined) {
      if (billingCycle === "monthly") {
        baseAmount = activeCustomOffer.customPricePaise;
      }
    }

    if (couponCode && !activeCustomOffer) {
      const cleanCoupon = couponCode.trim().toUpperCase();
      if (cleanCoupon === "SAVE20" || cleanCoupon === "WELCOME20") {
        discountAmount = Math.round(baseAmount * 0.2); // 20% discount
      } else if (cleanCoupon === "FLAT500") {
        discountAmount = 50000; // ₹500 in paise
      }
    }

    const finalAmount = Math.max(0, baseAmount - discountAmount + taxAmount);

    if (finalAmount <= 0) {
      return NextResponse.json(
        { error: `Plan "${planData?.name || planId}" is an Enterprise or custom quote plan. Please click "Contact Sales" to request a custom quote.` },
        { status: 400 }
      );
    }

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const expiresAtIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 3. Resolve Razorpay credentials
    const creds = await loadRazorpayCredentials();
    if (!creds.keyId || !creds.keySecret) {
      console.error("[Razorpay] Credentials missing on server.");
      return NextResponse.json(
        {
          error:
            "Razorpay API credentials (Key ID or Secret) are not configured. Please check your environment variables or Super Admin Settings.",
          code: "CONFIGURATION_ERROR",
        },
        { status: 500 }
      );
    }

    console.log(`[Razorpay] Order creation started for plan: ${planData.name}, mode: ${creds.isLiveMode ? "LIVE" : "TEST"}`);

    // 4. Create Razorpay Order via SDK
    let razorpayOrder: any;
    try {
      razorpayOrder = await createRazorpayOrder({
        amount: finalAmount,
        currency: "INR",
        receipt: orderId,
        notes: {
          schoolId,
          userId,
          planId,
          billingCycle,
        },
      });
      console.log(`[Razorpay] Order created successfully: ${razorpayOrder.id}`);
    } catch (err: any) {
      const mapped = mapRazorpayError(err);
      console.error(`[Razorpay] Order creation failed [${mapped.code}]:`, mapped.message);
      return NextResponse.json(
        {
          error: mapped.userMessage,
          code: mapped.code,
        },
        { status: mapped.httpStatus }
      );
    }

    // 5. Store Internal Order Record
    const internalOrder: InternalOrder = {
      id: orderId,
      schoolId,
      userId,
      planId,
      planVersionId: planVersion.id || `${planId}_v1`,
      billingCycle,
      baseAmount,
      discountAmount,
      taxAmount,
      finalAmount,
      currency: "INR",
      couponId: couponCode ? couponCode.toUpperCase() : null,
      status: "CREATED",
      razorpayOrderId: razorpayOrder.id,
      createdAt: nowIso,
      expiresAt: expiresAtIso,
    };

    try {
      if (adminDb) {
        await adminDb.collection(BILLING_COLLECTIONS.ORDERS || "orders").doc(orderId).set(internalOrder);
      } else {
        const db = getFirebaseDb();
        if (db) {
          const orderRef = doc(db, BILLING_COLLECTIONS.ORDERS || "orders", orderId);
          await setDoc(orderRef, internalOrder);
        }
      }
    } catch (err) {
      console.warn("[Orders] Notice: Internal order doc creation error:", err);
    }

    // 6. Return safe checkout payload
    return NextResponse.json({
      orderId: internalOrder.id,
      razorpayOrderId: razorpayOrder.id,
      amount: finalAmount,
      currency: "INR",
      key: creds.keyId,
      planName: planData.name,
      billingCycle,
    });
  } catch (error: any) {
    const mapped = mapRazorpayError(error);
    console.error(`[Razorpay] API Order Creation Unexpected Error [${mapped.code}]:`, mapped.message);
    return NextResponse.json(
      { error: mapped.userMessage, code: mapped.code },
      { status: mapped.httpStatus }
    );
  }
}
