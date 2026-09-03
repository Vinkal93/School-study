import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS, getActivePlanVersion } from "@/lib/billing";
import { createRazorpayOrder, loadRazorpayCredentials, mapRazorpayError } from "@/lib/payments/razorpay";
import type { Plan, PlanVersion } from "@/types";
import { InternalOrder } from "@/lib/payments/fulfillment";

/**
 * POST /api/billing/orders
 * Creates an authoritative server-side billing order and Razorpay payment order.
 * Strictly validates inputs, calculates pricing in integer paise, and returns safe JSON payloads.
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  console.log("[BillingOrdersAPI] Processing new order creation request...");

  try {
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      console.warn("[BillingOrdersAPI] Invalid request JSON body.");
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload. Please provide a valid JSON body.",
          code: "INVALID_JSON_BODY",
        },
        { status: 400 }
      );
    }

    const { schoolId, userId, planId, billingCycle = "monthly", couponCode } = body || {};

    // 1. Validation: Required Session & Order Parameters
    if (!schoolId || typeof schoolId !== "string" || !schoolId.trim()) {
      console.warn("[BillingOrdersAPI] Validation failed: Missing or invalid schoolId.");
      return NextResponse.json(
        {
          success: false,
          error: "schoolId is required and must be a non-empty string.",
          code: "VALIDATION_MISSING_SCHOOL_ID",
        },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== "string" || !userId.trim()) {
      console.warn("[BillingOrdersAPI] Validation failed: Missing or invalid userId.");
      return NextResponse.json(
        {
          success: false,
          error: "userId is required and must be a non-empty string.",
          code: "VALIDATION_MISSING_USER_ID",
        },
        { status: 400 }
      );
    }

    if (!planId || typeof planId !== "string" || !planId.trim()) {
      console.warn("[BillingOrdersAPI] Validation failed: Missing or invalid planId.");
      return NextResponse.json(
        {
          success: false,
          error: "planId is required and must be a non-empty string.",
          code: "VALIDATION_MISSING_PLAN_ID",
        },
        { status: 400 }
      );
    }

    const normalizedCycle = String(billingCycle).toLowerCase().trim();
    if (normalizedCycle !== "monthly" && normalizedCycle !== "annual") {
      console.warn(`[BillingOrdersAPI] Validation failed: Invalid billingCycle '${billingCycle}'.`);
      return NextResponse.json(
        {
          success: false,
          error: "billingCycle must be either 'monthly' or 'annual'.",
          code: "VALIDATION_INVALID_BILLING_CYCLE",
        },
        { status: 400 }
      );
    }

    console.log(`[BillingOrdersAPI] Context - User: ${userId}, School: ${schoolId}, Plan: ${planId}, Cycle: ${normalizedCycle}`);

    let planData: Plan | null = null;
    let planVersion: PlanVersion | null = null;

    // 2. Authoritative Plan & Version Resolution
    // Primary: Firebase Admin SDK lookup
    if (adminDb) {
      try {
        let planSnap = await adminDb.collection(BILLING_COLLECTIONS.PLANS).doc(planId).get();

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
      } catch (adminErr: any) {
        console.warn("[BillingOrdersAPI] Admin DB plan lookup notice:", adminErr?.message || adminErr);
      }
    }

    // Secondary: Client SDK lookup fallback
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
      } catch (err: any) {
        console.warn("[BillingOrdersAPI] Client DB plan lookup notice:", err?.message || err);
      }
    }

    // Tertiary: Static catalog fallback for default starter / professional plans
    if (!planData || !planVersion) {
      const cleanId = planId.toLowerCase();
      if (cleanId.includes("starter")) {
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
      } else if (cleanId.includes("professional")) {
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
          monthlyPrice: 999900,
          annualPrice: 799900,
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

    // 3. Custom Offer Lookup
    let activeCustomOffer: any = null;
    try {
      const { getSchoolActiveCustomOffer } = await import("@/lib/billing/customOffers");
      activeCustomOffer = await getSchoolActiveCustomOffer(schoolId, planId);
    } catch (e) {}

    // 4. Server-Side Authoritative Price Calculation (in Integer PAISE)
    let baseAmountPaise = normalizedCycle === "annual" ? planVersion.annualPrice * 12 : planVersion.monthlyPrice;
    let discountPaise = 0;
    let taxPaise = 0;

    if (activeCustomOffer && typeof activeCustomOffer.customPricePaise === "number") {
      if (normalizedCycle === "monthly") {
        baseAmountPaise = activeCustomOffer.customPricePaise;
      }
    }

    if (couponCode && !activeCustomOffer) {
      const cleanCoupon = String(couponCode).trim().toUpperCase();
      if (cleanCoupon === "SAVE20" || cleanCoupon === "WELCOME20") {
        discountPaise = Math.round(baseAmountPaise * 0.2);
      } else if (cleanCoupon === "FLAT500") {
        discountPaise = 50000;
      }
    }

    // Calculate final amount in integer paise using Math.round
    const finalAmountPaise = Math.round(Math.max(0, baseAmountPaise - discountPaise + taxPaise));

    console.log(`[BillingOrdersAPI] Pricing Calculated - Base: ${baseAmountPaise} paise, Discount: ${discountPaise} paise, Final: ${finalAmountPaise} paise (₹${finalAmountPaise / 100})`);

    if (finalAmountPaise <= 0) {
      console.warn(`[BillingOrdersAPI] Invalid computed amount ${finalAmountPaise} paise.`);
      return NextResponse.json(
        {
          success: false,
          error: `Plan "${planData?.name || planId}" requires a valid positive price amount. Please contact sales for custom options.`,
          code: "INVALID_PLAN_PRICE",
        },
        { status: 400 }
      );
    }

    // 5. Load & Validate Razorpay Server Credentials
    const creds = await loadRazorpayCredentials();
    if (!creds.keyId || !creds.keySecret) {
      console.error("[BillingOrdersAPI] Razorpay Server Credentials Missing!");
      return NextResponse.json(
        {
          success: false,
          error: "Razorpay API credentials (Key ID or Secret) are not configured on the server. Please check environment variables or Super Admin Settings.",
          code: "RAZORPAY_CONFIG_ERROR",
        },
        { status: 500 }
      );
    }

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const expiresAtIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 6. Create Razorpay Order via SDK
    let razorpayOrder: any;
    try {
      razorpayOrder = await createRazorpayOrder({
        amount: finalAmountPaise,
        currency: "INR",
        receipt: orderId,
        notes: {
          schoolId,
          userId,
          planId: planData.id,
          billingCycle: normalizedCycle,
        },
      });
      console.log(`[BillingOrdersAPI] Razorpay Order Created: ${razorpayOrder.id} for ₹${finalAmountPaise / 100}`);
    } catch (err: any) {
      const mapped = mapRazorpayError(err);
      console.error(`[BillingOrdersAPI] Razorpay Gateway Call Failed [${mapped.code}]:`, mapped.message);
      return NextResponse.json(
        {
          success: false,
          error: mapped.userMessage || "Failed to create Razorpay payment order.",
          code: mapped.code || "RAZORPAY_GATEWAY_ERROR",
        },
        { status: mapped.httpStatus || 500 }
      );
    }

    // 7. Store Internal Order Record
    const internalOrder: InternalOrder = {
      id: orderId,
      schoolId,
      userId,
      planId: planData.id,
      planVersionId: planVersion.id || `${planData.id}_v1`,
      billingCycle: normalizedCycle as any,
      baseAmount: baseAmountPaise,
      discountAmount: discountPaise,
      taxAmount: taxPaise,
      finalAmount: finalAmountPaise,
      currency: "INR",
      couponId: couponCode ? String(couponCode).toUpperCase() : null,
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
    } catch (err: any) {
      console.warn("[BillingOrdersAPI] Internal order doc creation notice:", err?.message || err);
    }

    const elapsedMs = Date.now() - startTime;
    console.log(`[BillingOrdersAPI] Completed successfully in ${elapsedMs}ms. OrderId: ${orderId}`);

    // 8. Return Safe Checkout Payload
    return NextResponse.json({
      success: true,
      orderId: internalOrder.id,
      razorpayOrderId: razorpayOrder.id,
      amount: finalAmountPaise,
      currency: "INR",
      key: creds.keyId,
      planName: planData.name,
      billingCycle: normalizedCycle,
      code: "SUCCESS",
    });
  } catch (error: any) {
    const mapped = mapRazorpayError(error);
    console.error(`[BillingOrdersAPI] Unexpected Error [${mapped.code}]:`, error?.stack || error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: mapped.userMessage || "An unexpected error occurred while creating your subscription order.",
        code: mapped.code || "BILLING_ORDER_UNEXPECTED_ERROR",
      },
      { status: mapped.httpStatus || 500 }
    );
  }
}
