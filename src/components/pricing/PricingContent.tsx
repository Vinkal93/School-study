"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Check,
  Minus,
  Sparkles,
  Shield,
  Users,
  Smartphone,
  Headphones,
  Loader2,
  X,
  Layers,
  ChevronRight,
  HelpCircle,
  ArrowRight,
  Info,
} from "lucide-react";
import { getAllPlans, getActivePlanVersion } from "@/lib/billing";
import type { Plan, PlanVersion } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { triggerRazorpayCheckout } from "@/lib/payments/clientCheckout";
import { toast } from "sonner";
import {
  getCuratedCardFeatures,
  getGroupedPlanFeatures,
  getFeatureMetadata,
  type FeatureMetadata,
} from "@/lib/billing/feature-registry";

const DEFAULT_FALLBACK_PLANS: Plan[] = [
  {
    id: "plan_base",
    name: "Base",
    slug: "base",
    description: "Essential school administration, student records & basic portal tools.",
    status: "ACTIVE",
    displayOrder: 1,
    isPopular: false,
    publicVisible: true,
    features: [
      "student_management",
      "teacher_management",
      "school_dashboard",
      "student_portal_access",
      "teacher_portal_access",
      "class_management",
    ],
    limits: { maxStudents: 50, maxTeachers: 10, maxClasses: 8, maxStaffAccounts: 2 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  {
    id: "plan_free",
    name: "Free Plan",
    slug: "free",
    description: "Essential modules for evaluation, trials, and new academies.",
    status: "ACTIVE",
    displayOrder: 0,
    isPopular: false,
    publicVisible: true,
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "school_dashboard",
      "subscription_billing",
    ],
    limits: { maxStudents: 100, maxTeachers: 10, maxClasses: 5, maxStaffAccounts: 1 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan_starter",
    name: "Starter Plan",
    slug: "starter",
    description: "Core school administration tools for small schools.",
    status: "ACTIVE",
    displayOrder: 1,
    isPopular: false,
    publicVisible: true,
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "school_dashboard",
      "notices_announcements",
      "subscription_billing",
    ],
    limits: { maxStudents: 500, maxTeachers: 20, maxClasses: 15, maxStaffAccounts: 2 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan_professional",
    name: "Professional Plan",
    slug: "professional",
    description: "Advanced fee automation, WhatsApp alerts & complete analytics.",
    status: "ACTIVE",
    displayOrder: 2,
    isPopular: true,
    publicVisible: true,
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "attendance_automation",
      "fee_management",
      "Fee Whatsapp Reminder",
      "advanced_reports",
      "inquiries_portal",
      "school_dashboard",
    ],
    limits: { maxStudents: 2000, maxTeachers: 100, maxClasses: 60, maxStaffAccounts: 10 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan_enterprise",
    name: "Enterprise Plan",
    slug: "enterprise",
    description: "Custom limits, multi-campus governance & dedicated support.",
    status: "ACTIVE",
    displayOrder: 3,
    isPopular: false,
    publicVisible: true,
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "attendance_automation",
      "fee_management",
      "Fee Whatsapp Reminder",
      "advanced_reports",
      "rules_policies",
      "timetable_bells",
    ],
    limits: { maxStudents: -1, maxTeachers: -1, maxClasses: -1, maxStaffAccounts: -1 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const DEFAULT_FALLBACK_VERSIONS: Record<string, PlanVersion> = {
  plan_base: {
    id: "plan_base_v1",
    planId: "plan_base",
    version: 1,
    monthlyPrice: 39900,
    annualPrice: 29900,
    currency: "INR",
    features: [],
    limits: { maxStudents: 50, maxTeachers: 10, maxClasses: 8, maxStaffAccounts: 2 },
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  },

  plan_free: {
    id: "plan_free_v1",
    planId: "plan_free",
    version: 1,
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "INR",
    features: [],
    limits: { maxStudents: 100, maxTeachers: 10, maxClasses: 5, maxStaffAccounts: 1 },
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  plan_starter: {
    id: "plan_starter_v1",
    planId: "plan_starter",
    version: 1,
    monthlyPrice: 99900,
    annualPrice: 79900,
    currency: "INR",
    features: [],
    limits: { maxStudents: 500, maxTeachers: 20, maxClasses: 15, maxStaffAccounts: 2 },
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  plan_professional: {
    id: "plan_professional_v1",
    planId: "plan_professional",
    version: 1,
    monthlyPrice: 199900,
    annualPrice: 159900,
    currency: "INR",
    features: [],
    limits: { maxStudents: 2000, maxTeachers: 100, maxClasses: 60, maxStaffAccounts: 10 },
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  plan_enterprise: {
    id: "plan_enterprise_v1",
    planId: "plan_enterprise",
    version: 1,
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "INR",
    features: [],
    limits: { maxStudents: -1, maxTeachers: -1, maxClasses: -1, maxStaffAccounts: -1 },
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};

export function PricingContent() {
  const { profile } = useAuth();
  const [isAnnual, setIsAnnual] = useState(true);
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_FALLBACK_PLANS);
  const [activeVersions, setActiveVersions] = useState<Record<string, PlanVersion>>(DEFAULT_FALLBACK_VERSIONS);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  // "View all features" modal state
  const [featureModalPlan, setFeatureModalPlan] = useState<Plan | null>(null);

  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountRupees: number;
    discountPaise: number;
    discountType?: string;
    discountValue?: number;
    terms?: string;
  } | null>(null);
  const [showPromoInput, setShowPromoInput] = useState(false);

  // Modal portal mount status
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (featureModalPlan) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [featureModalPlan]);

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) {
      toast.error("Please enter a coupon or promo code.");
      return;
    }
    setValidatingPromo(true);
    try {
      const res = await fetch("/api/billing/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCodeInput.trim().toUpperCase(),
          planId: plans[0]?.id || "plan_starter",
          billingCycle: isAnnual ? "annual" : "monthly",
          schoolId: profile?.schoolId,
          userId: profile?.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.isValid) {
        throw new Error(data.error || "Invalid promo code.");
      }
      setAppliedCoupon({
        code: data.code,
        discountRupees: data.discountRupees,
        discountPaise: data.discountPaise,
        discountType: data.discountType,
        discountValue: data.discountValue,
        terms: data.terms,
      });
      toast.success(`Promo code "${data.code}" applied! Save ₹${data.discountRupees.toLocaleString("en-IN")}`);
    } catch (e: any) {
      toast.error(e.message || "Invalid coupon code.");
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedCoupon(null);
    setPromoCodeInput("");
    toast.info("Promo code removed.");
  };

  useEffect(() => {
    async function loadPublicPlans() {
      try {
        const res = await fetch("/api/pricing");
        if (res.ok) {
          const data = await res.json();
          if (data.plans && data.plans.length > 0) {
            setPlans(data.plans);
            const versionMap: Record<string, PlanVersion> = {};
            for (const p of data.plans) {
              if (p.activeVersion) {
                versionMap[p.id] = p.activeVersion;
              }
            }
            setActiveVersions(versionMap);
            setLoading(false);
            return;
          }
        }

        const fetchedPlans = await getAllPlans();
        if (fetchedPlans && fetchedPlans.length > 0) {
          setPlans(fetchedPlans);
          const versionMap: Record<string, PlanVersion> = {};
          for (const p of fetchedPlans) {
            const v = await getActivePlanVersion(p.id);
            if (v) versionMap[p.id] = v;
          }
          setActiveVersions(versionMap);
        } else {
          setPlans(DEFAULT_FALLBACK_PLANS);
          setActiveVersions(DEFAULT_FALLBACK_VERSIONS);
        }
      } catch (err) {
        console.warn("Failed to fetch public pricing catalog, using defaults:", err);
        setPlans(DEFAULT_FALLBACK_PLANS);
        setActiveVersions(DEFAULT_FALLBACK_VERSIONS);
      } finally {
        setLoading(false);
      }
    }
    loadPublicPlans();
  }, []);

  // Auto-checkout effect when returning from login/registration
  useEffect(() => {
    if (!profile?.uid || !profile?.schoolId || loading) return;

    try {
      const stored = sessionStorage.getItem("pending_checkout");
      const urlParams = new URLSearchParams(window.location.search);
      const autoCheckoutParam = urlParams.get("autoCheckout");
      const checkoutPlanId = urlParams.get("checkoutPlanId");
      const checkoutCycle = urlParams.get("billingCycle");

      let targetPlanId = checkoutPlanId;
      let targetCycle = checkoutCycle;

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!targetPlanId) targetPlanId = parsed.planId;
          if (!targetCycle) targetCycle = parsed.billingCycle;
        } catch (e) {}
      }

      if (targetPlanId && (autoCheckoutParam === "true" || stored)) {
        sessionStorage.removeItem("pending_checkout");
        const foundPlan = plans.find((p) => p.id === targetPlanId || p.slug === targetPlanId);
        if (foundPlan) {
          if (targetCycle === "monthly") setIsAnnual(false);
          else if (targetCycle === "annual") setIsAnnual(true);
          toast.success(`Welcome back! Resuming checkout for ${foundPlan.name}...`);
          handleSelectPlan(foundPlan);
        }
      }
    } catch (e) {
      console.warn("Auto-checkout retrieval notice:", e);
    }
  }, [profile, loading, plans]);

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.slug === "enterprise") {
      window.location.href = "/contact";
      return;
    }

    if (plan.slug === "free" || plan.id === "plan_free") {
      window.location.href = "/register";
      return;
    }

    if (!profile?.uid || !profile?.schoolId) {
      toast.info("Please sign in or register your school to continue checkout.");
      const checkoutData = {
        planId: plan.id,
        planSlug: plan.slug,
        billingCycle: isAnnual ? "annual" : "monthly",
      };
      try {
        sessionStorage.setItem("pending_checkout", JSON.stringify(checkoutData));
      } catch (e) {}

      window.location.href = `/login?redirect=/pricing%3FautoCheckout%3Dtrue%26checkoutPlanId%3D${plan.id}%26billingCycle%3D${isAnnual ? "annual" : "monthly"}`;
      return;
    }

    setProcessingPlanId(plan.id);

    try {
      await triggerRazorpayCheckout({
        planId: plan.id,
        billingCycle: isAnnual ? "annual" : "monthly",
        couponCode: appliedCoupon?.code || undefined,
        schoolId: profile.schoolId,
        userId: profile.uid,
        prefillData: {
          name: profile.name || "",
          email: profile.email || "",
        },
        onSuccess: (orderId) => {
          toast.success("Payment verified! Subscription activated.");
        },
        onError: (err) => {
          toast.error(err || "Payment failed or was cancelled.");
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate payment checkout.");
    } finally {
      setProcessingPlanId(null);
    }
  };

  const activePlans = plans.length > 0 ? plans : DEFAULT_FALLBACK_PLANS;

  // Dynamically calculate the maximum annual savings percentage across all active plans
  const maxSavingsPercent = React.useMemo(() => {
    let max = 0;
    for (const p of activePlans) {
      const ver = activeVersions[p.id] || (p as any).activeVersion || DEFAULT_FALLBACK_VERSIONS[p.id];
      const m = ver?.monthlyPrice
        ? Math.round(ver.monthlyPrice / 100)
        : (p as any).monthlyPrice
        ? Math.round((p as any).monthlyPrice / 100)
        : (p.limits as any)?.monthlyPrice
        ? Math.round((p.limits as any).monthlyPrice / 100)
        : (p.slug === "base" ? 399 : p.slug === "starter" ? 999 : p.slug === "professional" ? 1999 : 0);

      const a = ver?.annualPrice
        ? Math.round(ver.annualPrice / 100)
        : (p as any).annualPrice
        ? Math.round((p as any).annualPrice / 100)
        : (p.limits as any)?.annualPrice
        ? Math.round((p.limits as any).annualPrice / 100)
        : (p.slug === "base" ? 299 : p.slug === "starter" ? 799 : p.slug === "professional" ? 1599 : 0);

      if (m > 0 && a > 0 && m > a) {
        const pct = Math.round(((m - a) / m) * 100);
        if (pct > max) max = pct;
      }
    }
    return max || 25;
  }, [activePlans, activeVersions]);

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Simple, Transparent Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Choose the Right Plan for Your School
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
          Everything you need to automate admissions, attendance, fees, and faculty management.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <span className={`text-sm font-semibold ${!isAnnual ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            aria-label="Toggle annual billing discount"
            className="relative w-14 h-8 bg-blue-600 rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <span
              className={`block w-6 h-6 bg-white rounded-full transition-transform ${
                isAnnual ? "transform translate-x-6" : ""
              }`}
            />
          </button>
          <span className={`text-sm font-semibold flex items-center gap-1.5 ${isAnnual ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>
            Annual <span className="text-xs bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">Save up to {maxSavingsPercent}%</span>
          </span>
        </div>

        {/* Promo Code Input Accordion */}
        <div className="pt-2 flex flex-col items-center justify-center">
          {!appliedCoupon ? (
            !showPromoInput ? (
              <button
                type="button"
                onClick={() => setShowPromoInput(true)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Have a coupon or promotion code?</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  placeholder="Enter code (e.g. WELCOME20)"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  className="px-3 py-1.5 text-xs font-mono uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 text-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={validatingPromo}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {validatingPromo ? "Applying..." : "Apply"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPromoInput(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              <span>🎉 Promo code <strong>{appliedCoupon.code}</strong> applied!</span>
              <button
                type="button"
                onClick={handleRemovePromo}
                className="text-slate-400 hover:text-red-500 font-bold ml-1 text-xs cursor-pointer"
                title="Remove Coupon"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Cards Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12 text-slate-500 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-sm">Fetching active plans catalog...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {activePlans.map((p) => {
            const ver = activeVersions[p.id] || (p as any).activeVersion || DEFAULT_FALLBACK_VERSIONS[p.id];
            const monthlyRs = ver?.monthlyPrice
              ? Math.round(ver.monthlyPrice / 100)
              : (p as any).monthlyPrice
              ? Math.round((p as any).monthlyPrice / 100)
              : (p.limits as any)?.monthlyPrice
              ? Math.round((p.limits as any).monthlyPrice / 100)
              : (p.slug === "base" ? 399 : p.slug === "starter" ? 999 : p.slug === "professional" ? 1999 : 0);

            const annualRs = ver?.annualPrice
              ? Math.round(ver.annualPrice / 100)
              : (p as any).annualPrice
              ? Math.round((p as any).annualPrice / 100)
              : (p.limits as any)?.annualPrice
              ? Math.round((p.limits as any).annualPrice / 100)
              : (p.slug === "base" ? 299 : p.slug === "starter" ? 799 : p.slug === "professional" ? 1599 : 0);

            const savingsPercent =
              monthlyRs > 0 && annualRs > 0 && monthlyRs > annualRs
                ? Math.round(((monthlyRs - annualRs) / monthlyRs) * 100)
                : 0;

            const isFree = p.slug === "free" || p.id === "plan_free" || monthlyRs === 0;
            const isEnterprise = p.slug === "enterprise" || p.id === "plan_enterprise";

            const planDescription =
              p.description && p.description !== "No description provided."
                ? p.description
                : p.slug === "base"
                ? "Essential school administration, student records & basic portal tools."
                : p.slug === "free"
                ? "Essential modules for evaluation, trials, and new academies."
                : p.slug === "starter"
                ? "Core school administration tools for small schools."
                : p.slug === "professional"
                ? "Advanced fee automation, WhatsApp alerts & complete analytics."
                : "Custom limits, multi-campus governance & dedicated support.";

            const curatedFeatures = getCuratedCardFeatures(p, 6);
            const totalModulesCount = p.features?.length || curatedFeatures.length;
            const isProcessing = processingPlanId === p.id;

            return (
              <div
                key={p.id}
                className={`relative flex flex-col justify-between p-6 rounded-2xl border transition-all h-full ${
                  p.isPopular
                    ? "border-blue-600 dark:border-blue-500 shadow-xl shadow-blue-500/10 bg-white dark:bg-gray-900 ring-2 ring-blue-600 dark:ring-blue-500 scale-[1.02] z-10"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md"
                }`}
              >
                {p.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-full shadow-md">
                    Most Popular
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{p.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px] leading-relaxed">
                      {planDescription}
                    </p>
                  </div>

                  {/* Price Block */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    {isFree ? (
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            ₹0
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            / forever
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                          Free forever • No credit card required
                        </p>
                      </div>
                    ) : isEnterprise ? (
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Contact Sales
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                          Custom limits & dedicated support
                        </p>
                      </div>
                    ) : isAnnual ? (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            ₹{annualRs.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            / mo
                          </span>
                          {monthlyRs > annualRs && (
                            <span className="text-xs text-slate-400 line-through">
                              ₹{monthlyRs.toLocaleString("en-IN")}/mo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-slate-500 dark:text-slate-400">
                            Billed annually (₹{(annualRs * 12).toLocaleString("en-IN")}/yr)
                          </span>
                          {savingsPercent > 0 && (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              Save {savingsPercent}% on Annual
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            ₹{monthlyRs.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            / month
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-slate-500 dark:text-slate-400">
                            Billed monthly
                          </span>
                          {savingsPercent > 0 && (
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              Save {savingsPercent}% yearly
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Capacity Limits Grid (Students, Teachers, Classes, Staff) */}
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                      <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Students</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {!p.limits?.maxStudents || p.limits.maxStudents === -1
                            ? "Unlimited"
                            : p.limits.maxStudents.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Teachers</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {!p.limits?.maxTeachers || p.limits.maxTeachers === -1
                            ? "Unlimited"
                            : p.limits.maxTeachers.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Classes</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {!p.limits?.maxClasses || p.limits.maxClasses === -1
                            ? "Unlimited"
                            : p.limits.maxClasses.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Staff</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {!p.limits?.maxStaffAccounts || p.limits.maxStaffAccounts === -1
                            ? "Unlimited"
                            : p.limits.maxStaffAccounts.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Key Highlights */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Key Highlights:
                      </p>
                      {totalModulesCount > 0 && (
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                          {totalModulesCount} features
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      {curatedFeatures.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="font-medium leading-snug">{feat.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => setFeatureModalPlan(p)}
                    className="w-full text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-1.5 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>View all features</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleSelectPlan(p)}
                    disabled={isProcessing}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                      p.isPopular
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95"
                        : isFree
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95"
                        : isEnterprise
                        ? "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95"
                        : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95"
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing Order...</span>
                      </>
                    ) : isFree ? (
                      "Get Started Free"
                    ) : isEnterprise ? (
                      "Contact Sales"
                    ) : (
                      `Choose ${p.name}`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

{/* Feature Breakdown Modal */}
      {mounted && featureModalPlan && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="all-features-modal-title"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setFeatureModalPlan(null)}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
              <div>
                <h3 id="all-features-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  {featureModalPlan.name} — Feature Directory
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detailed capabilities included in this tier.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeatureModalPlan(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900 dark:text-white">
              {Object.entries(getGroupedPlanFeatures(featureModalPlan)).map(([category, items]) => (
                <div key={category} className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                    <span>{category}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {items.map((feat) => (
                      <div
                        key={feat.key}
                        className={`p-3 rounded-xl border flex items-start gap-2.5 transition-colors ${
                          feat.enabled
                            ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60"
                            : "bg-slate-50/30 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/40 opacity-50"
                        }`}
                      >
                        {feat.enabled ? (
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Minus className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                            {feat.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                            {feat.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-20 flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md">
              <span className="text-xs text-slate-500">
                Need specialized institutional requirements?
              </span>
              <button
                type="button"
                onClick={() => {
                  setFeatureModalPlan(null);
                  handleSelectPlan(featureModalPlan);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer"
              >
                Continue with {featureModalPlan.name}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Dynamic Plan Comparison Table */}
      <div className="space-y-6 pt-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Compare Plan Features</h2>
          <p className="text-sm text-slate-500">
            Comprehensive breakdown of capabilities across all subscription tiers.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-gray-950 shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                <th className="py-4 px-6 font-bold text-slate-900 dark:text-white w-1/3">Feature</th>
                {activePlans.map((p) => (
                  <th key={p.id} className="py-4 px-4 font-bold text-slate-900 dark:text-white text-center">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {/* Capacity: Students */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white">Student Capacity</td>
                {activePlans.map((p) => (
                  <td key={p.id} className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-300">
                    {p.limits?.maxStudents && p.limits.maxStudents > 0 ? `Up to ${p.limits.maxStudents}` : "Unlimited"}
                  </td>
                ))}
              </tr>

              {/* Capacity: Teachers */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white">Faculty & Staff Accounts</td>
                {activePlans.map((p) => (
                  <td key={p.id} className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-300">
                    {p.limits?.maxTeachers && p.limits.maxTeachers > 0 ? `Up to ${p.limits.maxTeachers}` : "Unlimited"}
                  </td>
                ))}
              </tr>

              {/* Daily Attendance */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white">Daily Attendance Roll-Call</td>
                {activePlans.map((p) => (
                  <td key={p.id} className="py-3.5 px-4 text-center">
                    <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                  </td>
                ))}
              </tr>

              {/* Attendance Automation & SMS */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white">Automated Absentee Alerts</td>
                {activePlans.map((p) => {
                  const hasAuto = (p.features || []).some((f) => f.includes("automation") || f.includes("attendance_automation"));
                  return (
                    <td key={p.id} className="py-3.5 px-4 text-center">
                      {hasAuto ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <Minus className="w-4 h-4 text-slate-300 dark:text-slate-700 mx-auto" />}
                    </td>
                  );
                })}
              </tr>

              {/* Fee Collection & Invoicing */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white">Fee Invoicing & Dues Ledger</td>
                {activePlans.map((p) => {
                  const hasFees = (p.features || []).some((f) => f.includes("fee"));
                  return (
                    <td key={p.id} className="py-3.5 px-4 text-center">
                      {hasFees ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <Minus className="w-4 h-4 text-slate-300 dark:text-slate-700 mx-auto" />}
                    </td>
                  );
                })}
              </tr>

              {/* WhatsApp Reminders */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white">WhatsApp Fee Reminders</td>
                {activePlans.map((p) => {
                  const hasWa = (p.features || []).some((f) => f.toLowerCase().includes("whatsapp"));
                  return (
                    <td key={p.id} className="py-3.5 px-4 text-center">
                      {hasWa ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <Minus className="w-4 h-4 text-slate-300 dark:text-slate-700 mx-auto" />}
                    </td>
                  );
                })}
              </tr>

              {/* Advanced Analytics */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white">Advanced Reports & Exports</td>
                {activePlans.map((p) => {
                  const hasReports = (p.features || []).some((f) => f.includes("reports") || f.includes("advanced"));
                  return (
                    <td key={p.id} className="py-3.5 px-4 text-center">
                      {hasReports ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <Minus className="w-4 h-4 text-slate-300 dark:text-slate-700 mx-auto" />}
                    </td>
                  );
                })}
              </tr>

              {/* Support SLA */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white">Customer Support SLA</td>
                {activePlans.map((p) => {
                  const isEnt = p.slug === "enterprise" || p.id === "plan_enterprise";
                  const isPro = p.slug === "professional" || p.id === "plan_professional";
                  return (
                    <td key={p.id} className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-300">
                      {isEnt ? "Dedicated 24/7 Account Mgr" : isPro ? "Priority Helpdesk" : "Standard Email"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
