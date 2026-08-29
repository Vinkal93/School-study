import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS, getActivePlanVersion } from "@/lib/billing";
import type { Plan } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { planId, billingCycle = "monthly", couponCode } = body;

    if (!planId) {
      return NextResponse.json(
        { error: "Missing required parameter 'planId'." },
        { status: 400 }
      );
    }

    if (billingCycle !== "monthly" && billingCycle !== "annual") {
      return NextResponse.json(
        { error: "Invalid billingCycle. Must be 'monthly' or 'annual'." },
        { status: 400 }
      );
    }

    const db = getFirebaseDb();
    let planData: Plan | null = null;
    let planVersion: any = null;

    if (db) {
      try {
        const planRef = doc(db, BILLING_COLLECTIONS.PLANS, planId);
        const planSnap = await getDoc(planRef);

        if (planSnap.exists()) {
          planData = { id: planSnap.id, ...planSnap.data() } as Plan;
          planVersion = await getActivePlanVersion(planId);
        }
      } catch (err) {
        console.warn("Firestore plan lookup notice, using fallback catalog:", err);
      }
    }

    // Fallback static catalog mapping if database document is missing
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
          monthlyPrice: 99900,
          annualPrice: 79900,
          limits: planData.limits,
          features: planData.features,
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
          monthlyPrice: 199900,
          annualPrice: 159900,
          limits: planData.limits,
          features: planData.features,
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
          monthlyPrice: 0,
          annualPrice: 0,
          limits: planData.limits,
          features: planData.features,
        };
      }
    }

    // 2. Server-side price calculation in integer PAISE
    const baseAmount =
      billingCycle === "annual"
        ? planVersion.annualPrice * 12
        : planVersion.monthlyPrice;

    let discountAmount = 0;
    let couponValid = false;
    let couponMessage = "";

    if (couponCode) {
      const cleanCoupon = couponCode.trim().toUpperCase();
      if (cleanCoupon === "SAVE20" || cleanCoupon === "WELCOME20") {
        discountAmount = Math.round(baseAmount * 0.2); // 20% discount
        couponValid = true;
        couponMessage = "20% discount coupon applied successfully!";
      } else if (cleanCoupon === "FLAT500") {
        discountAmount = 50000; // ₹500 discount in paise
        couponValid = true;
        couponMessage = "₹500 flat discount applied successfully!";
      } else {
        couponValid = false;
        couponMessage = "Invalid or expired coupon code.";
      }
    }

    const taxAmount = 0;
    const finalAmount = Math.max(0, baseAmount - discountAmount + taxAmount);

    return NextResponse.json({
      planId,
      planName: planData.name,
      planSlug: planData.slug,
      billingCycle,
      baseAmount,
      discountAmount,
      taxAmount,
      finalAmount,
      currency: "INR",
      couponCode: couponCode ? couponCode.trim().toUpperCase() : null,
      couponValid,
      couponMessage,
      limits: planVersion.limits || planData.limits,
      features: planVersion.features || planData.features,
    });
  } catch (error: any) {
    console.error("API Billing Calculate Error:", error);
    return NextResponse.json(
      { error: "Failed to calculate server-side pricing: " + (error.message || "") },
      { status: 500 }
    );
  }
}
