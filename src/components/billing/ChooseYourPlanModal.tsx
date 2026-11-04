"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  Tag,
  AlertCircle,
  Loader2,
  Lock,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { safeFetchJson } from "@/lib/utils/safeFetch";
import { triggerRazorpaySubscriptionCheckout } from "@/lib/payments/clientCheckout";

export interface ChooseYourPlanModalProps {
  isOpen: boolean;
  schoolId: string;
  adminName?: string;
  adminEmail?: string;
  onPlanActivated?: () => void;
  canDismiss?: boolean;
  onClose?: () => void;
}

interface PlanItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
  isPopular: boolean;
  features: string[];
  limits: {
    maxStudents: number;
    maxTeachers: number;
    [key: string]: any;
  };
  monthlyPrice: number; // paise
  annualPrice: number; // paise
  currency: string;
}

export function ChooseYourPlanModal({
  isOpen,
  schoolId,
  adminName = "Administrator",
  adminEmail = "",
  onPlanActivated,
  canDismiss = false,
  onClose,
}: ChooseYourPlanModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  // Selected plan & checkout states
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPaise: number;
    discountType: string;
    finalPricePaise: number;
    message?: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Load active plans from Super Admin pricing API
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function loadPlans() {
      setIsLoadingPlans(true);
      setPlansError(null);
      try {
        const res = await safeFetchJson("/api/pricing");
        if (res.ok && res.data?.plans && Array.isArray(res.data.plans)) {
          if (isMounted) {
            const sorted = [...res.data.plans].sort(
              (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
            );
            setPlans(sorted);
            // Default select popular or second plan if available
            const pop = sorted.find((p) => p.isPopular);
            if (pop) setSelectedPlanId(pop.id);
            else if (sorted.length > 0) setSelectedPlanId(sorted[0].id);
          }
        } else {
          if (isMounted) {
            setPlansError("Unable to load subscription plans. Please retry.");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setPlansError(err?.message || "Failed to load pricing catalog.");
        }
      } finally {
        if (isMounted) setIsLoadingPlans(false);
      }
    }

    loadPlans();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle coupon validation
  const handleApplyCoupon = async () => {
    const trimmed = couponCode.trim().toUpperCase();
    if (!trimmed) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const activePlan = plans.find((p) => p.id === selectedPlanId);
      const baseAmountPaise = activePlan
        ? billingCycle === "annual"
          ? activePlan.annualPrice
          : activePlan.monthlyPrice
        : 99900;

      const res = await safeFetchJson("/api/billing/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: trimmed,
          planId: selectedPlanId || "plan_starter",
          billingCycle,
          schoolId,
          baseAmountPaise,
          isFirstPurchase: true,
        }),
      });

      if (res.ok && res.data?.isValid) {
        setAppliedCoupon({
          code: trimmed,
          discountPaise: res.data.discountAmountPaise || res.data.discountPaise || 0,
          discountType: res.data.discountType || "percentage",
          finalPricePaise: res.data.finalPricePaise || res.data.finalAmountPaise || baseAmountPaise,
          message: res.data.message || `Coupon ${trimmed} applied!`,
        });
        toast.success(`Coupon "${trimmed}" applied successfully!`);
      } else {
        const msg = res.data?.error || "This coupon is invalid or expired.";
        setCouponError(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      setCouponError(err.message || "Could not validate coupon.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  // Plan Selection Handler
  const handleSelectPlan = async (plan: PlanItem) => {
    const isFree =
      plan.id === "plan_free" ||
      plan.slug === "free" ||
      (plan.monthlyPrice === 0 && plan.annualPrice === 0);

    setProcessingPlanId(plan.id);
    setCheckoutError(null);

    if (isFree) {
      // Free Tier Activation
      try {
        const res = await safeFetchJson("/api/billing/onboarding/free-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schoolId }),
        });

        if (res.ok && res.data?.success) {
          toast.success("Free Starter Plan activated! Welcome to SchoolStudy.");
          if (onPlanActivated) onPlanActivated();
          window.location.href = res.data.redirectUrl || "/admin";
        } else {
          toast.error(res.data?.error || "Failed to activate Free plan. Please try again.");
        }
      } catch (err: any) {
        toast.error(err.message || "Network error while activating Free plan.");
      } finally {
        setProcessingPlanId(null);
      }
    } else {
      // Paid Plan — Initiate genuine Razorpay recurring subscription
      try {
        await triggerRazorpaySubscriptionCheckout({
          planId: plan.id,
          billingCycle,
          couponCode: appliedCoupon?.code,
          schoolId,
          prefillData: {
            name: adminName,
            email: adminEmail,
          },
          onSuccess: () => {
            toast.success("Subscription activated! Setting up your institution...");
            if (onPlanActivated) onPlanActivated();
          },
          onError: (errMsg) => {
            setCheckoutError(errMsg || "Checkout was interrupted.");
            toast.error(errMsg || "Checkout was interrupted.");
            setProcessingPlanId(null);
          },
        });
      } catch (err: any) {
        toast.error(err?.message || "Failed to start checkout.");
        setProcessingPlanId(null);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 my-auto overflow-hidden animate-fadeIn">
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Step 2 of 2 — Institutional Entitlements</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Choose Your School Plan
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Select a plan to activate student capacity, attendance modules, gradebooks, and guardian portals. You can upgrade, downgrade, or cancel anytime.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-6 inline-flex items-center p-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-inner">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === "annual"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-extrabold tracking-wide rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingPlans && (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Fetching current verified plans from Super Admin catalog...
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoadingPlans && plansError && (
          <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm font-bold text-red-800 dark:text-red-300">{plansError}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Checkout Gateway Error Banner */}
        {checkoutError && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">Payment Gateway Notice</p>
                <p className="text-amber-700 dark:text-amber-300 mt-0.5">{checkoutError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const freePlan = plans.find((p) => p.id === "plan_free" || p.slug === "free");
                if (freePlan) handleSelectPlan(freePlan);
              }}
              className="shrink-0 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition self-start sm:self-center"
            >
              Activate Free Plan Instead
            </button>
          </div>
        )}

        {/* Plans Grid */}
        {!isLoadingPlans && !plansError && plans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isFree =
                plan.id === "plan_free" ||
                plan.slug === "free" ||
                (plan.monthlyPrice === 0 && plan.annualPrice === 0);

              let rawPricePaise =
                billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
              if ((!rawPricePaise || rawPricePaise === 0) && !isFree) {
                const s = (plan.slug || plan.id || "").toLowerCase();
                if (s.includes("base")) rawPricePaise = billingCycle === "annual" ? 29900 : 39900;
                else if (s.includes("starter")) rawPricePaise = billingCycle === "annual" ? 79900 : 99900;
                else if (s.includes("growth")) rawPricePaise = billingCycle === "annual" ? 159900 : 199900;
                else rawPricePaise = billingCycle === "annual" ? 39900 : 49900;
              }
              const priceDisplay = isFree
                ? "₹0"
                : `₹${Math.round(rawPricePaise / 100).toLocaleString("en-IN")}`;

              const isProcessing = processingPlanId === plan.id;
              const isHighlighted = plan.isPopular;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between p-6 rounded-3xl border transition-all duration-200 ${
                    isHighlighted
                      ? "border-blue-600 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-lg shadow-blue-500/10 ring-2 ring-blue-600/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {isHighlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Most Popular</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {plan.name}
                      </h3>
                      {isFree && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Forever Free
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 min-h-[32px]">
                      {plan.description || "Essential academic and administrative infrastructure."}
                    </p>

                    {/* Price Header */}
                    <div className="mt-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                          {priceDisplay}
                        </span>
                        {!isFree && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            / {billingCycle === "annual" ? "month (billed annually)" : "month"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Up to{" "}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {plan.limits?.maxStudents ?? 10} Students
                        </strong>{" "}
                        &amp;{" "}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {plan.limits?.maxTeachers ?? 2} Teachers
                        </strong>
                      </p>
                    </div>

                    {/* Feature List */}
                    <div className="mt-4 space-y-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Included Features:
                      </p>
                      {(plan.features || []).slice(0, 6).map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="capitalize">{feat.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        isHighlighted
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 active:scale-95"
                          : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 active:scale-95"
                      } disabled:opacity-50`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{isFree ? "Activating..." : "Opening Checkout..."}</span>
                        </>
                      ) : (
                        <>
                          <span>{isFree ? "Activate Free Plan" : "Subscribe with AutoPay"}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Real-time Coupon Bar for Paid Plans */}
        <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Have an Institutional Coupon?
              </span>
            </div>

            <div className="flex items-center gap-2">
              {appliedCoupon ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <span>Code &quot;{appliedCoupon.code}&quot; Active</span>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-red-600 dark:text-red-400 hover:underline text-[11px] font-semibold ml-2"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="e.g. WELCOME20"
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon || !couponCode.trim()}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    {isValidatingCoupon ? "Validating..." : "Apply"}
                  </button>
                </div>
              )}
            </div>
          </div>
          {couponError && (
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-2 font-medium">
              {couponError}
            </p>
          )}
        </div>

        {/* Security & Guarantees Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Razorpay Verified Gateway</span>
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>256-bit Mandate Encryption</span>
            </span>
          </div>
          <p className="text-[11px]">
            Taxes calculated at checkout if applicable. Subscriptions renew automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
