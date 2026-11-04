"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  X,
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Check,
  Lock,
  RefreshCw,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { safeFetchJson } from "@/lib/utils/safeFetch";
import { triggerRazorpaySubscriptionCheckout } from "@/lib/payments/clientCheckout";
import type { Plan, SchoolUsage } from "@/types";

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  userId: string;
  initialPlanId?: string;
  initialBillingCycle?: "monthly" | "annual";
  currentPlanId?: string;
  currentUsage?: any;
  plans?: any[];
  onSuccess?: (orderId?: string) => void;
}

interface PriceBreakdown {
  baseAmount: number; // paise
  discountAmount: number; // paise
  taxableAmount?: number; // paise
  gstEnabled?: boolean;
  gstRate?: number;
  gstAmount?: number; // paise
  finalAmount: number; // paise
  currency: string;
  couponValid: boolean;
  couponMessage?: string;
}

interface GatewayStatus {
  isConfigured: boolean;
  mode: "TEST" | "LIVE" | "UNCONFIGURED";
  keyIdPreview?: string | null;
}

function formatPaise(paise: number): string {
  if (!paise || paise <= 0) return "₹0";
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export function RechargeModal({
  isOpen,
  onClose,
  schoolId,
  userId,
  initialPlanId = "plan_starter",
  initialBillingCycle = "monthly",
  currentPlanId = "plan_starter",
  currentUsage,
  plans = [],
  onSuccess,
}: RechargeModalProps) {
  const { firebaseUser, profile } = useAuth();
  const priceRequest = useRef(0);

  // Filter eligible active plans
  const eligiblePlans = plans.filter(
    (p) => p.status === "ACTIVE" && !p.isArchived && p.publicVisible !== false
  );

  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    initialPlanId || (eligiblePlans[0]?.id ?? "plan_starter")
  );
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(initialBillingCycle);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");

  // Gateway status state
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>({
    isConfigured: true,
    mode: "TEST",
  });
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  // Calculation and checkout states
  const [priceReady, setPriceReady] = useState(false);
  const [pricedSelection, setPricedSelection] = useState("");
  const selectionKey = `${selectedPlanId}:${billingCycle}:${appliedCoupon}`;
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [breakdown, setBreakdown] = useState<PriceBreakdown>({
    baseAmount: 0,
    discountAmount: 0,
    finalAmount: 0,
    currency: "INR",
    couponValid: false,
  });

  // Verify Payment Gateway Readiness from Server
  useEffect(() => {
    if (!isOpen) return;
    let isSubscribed = true;

    async function checkGateway() {
      try {
        const res = await safeFetchJson<GatewayStatus>("/api/billing/gateway-status");
        if (isSubscribed && res.ok && res.data) {
          setGatewayStatus(res.data);
        }
      } catch (e) {
        console.warn("[RechargeModal] Could not fetch gateway status:", e);
      }
    }

    checkGateway();
    return () => {
      isSubscribed = false;
    };
  }, [isOpen]);

  // Recalculate price server-side when plan, billing cycle, or coupon changes
  const calculatePrice = async (planId: string, cycle: "monthly" | "annual", coupon?: string) => {
    const requestId = ++priceRequest.current;
    try {
      const token = await firebaseUser?.getIdToken();
      if (requestId !== priceRequest.current) return;
      setIsCalculating(true);
      setPriceReady(false);
      setGatewayError(null);

      const res = await safeFetchJson("/api/billing/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          planId,
          billingCycle: cycle,
          couponCode: coupon || undefined,
          schoolId,
        }),
      });

      if (requestId !== priceRequest.current) return;

      if (res.ok && res.data && res.data.calculation) {
        const calc = res.data.calculation;
        setPricedSelection(`${planId}:${cycle}:${coupon || ""}`);
        setPriceReady(true);
        setBreakdown({
          baseAmount: calc.baseAmountPaise,
          discountAmount: calc.discountAmountPaise,
          taxableAmount: calc.taxableAmountPaise,
          gstEnabled: calc.gstEnabled,
          gstRate: calc.gstRate,
          gstAmount: calc.gstAmountPaise,
          finalAmount: calc.finalAmountPaise,
          currency: calc.currency || "INR",
          couponValid: Boolean(calc.couponCode),
          couponMessage: calc.couponCode
            ? `Coupon "${calc.couponCode}" applied successfully!`
            : undefined,
        });

        if (coupon && calc.couponCode) {
          toast.success(`Coupon "${calc.couponCode}" applied!`);
        } else if (coupon && !calc.couponCode) {
          toast.error("Invalid, expired, or non-applicable coupon code.");
        }
      } else {
        toast.error(res.error || "Failed to calculate pricing.");
      }
    } catch (err: unknown) {
      if (requestId !== priceRequest.current) return;
      console.error("Price calculate error:", err);
      toast.error("Failed to calculate server-side pricing.");
    } finally {
      if (requestId === priceRequest.current) setIsCalculating(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (isOpen) {
      void Promise.resolve().then(() => {
        if (!cancelled) return calculatePrice(selectedPlanId, billingCycle, appliedCoupon);
      });
    }
    return () => {
      cancelled = true;
      priceRequest.current++;
    };
  }, [isOpen, selectedPlanId, billingCycle, appliedCoupon]);

  if (!isOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponInput.trim().toUpperCase();
    if (!clean) {
      toast.error("Please enter a coupon code.");
      return;
    }
    setAppliedCoupon(clean);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon("");
    setCouponInput("");
  };

  // Plan metadata resolution with robust fallback across version, paise, and rupees
  const resolvePrice = (p: any, cycle: "monthly" | "annual"): number => {
    if (!p) return 0;
    const isFree = p.id === "plan_free" || p.slug === "free" || p.name?.toLowerCase().includes("free");
    if (isFree) return 0;

    let m = p.monthlyPrice ?? p.pricePerMonth ?? p.limits?.monthlyPrice ?? (p.price ? p.price * 100 : 0);
    // If m was given in rupees (e.g. 299 or 499), convert to paise
    if (m > 0 && m < 1000) m = m * 100;
    let a = p.annualPrice ?? p.limits?.annualPrice ?? (m > 0 ? Math.round(m * 0.8) : 0);
    if (a > 0 && a < 1000) a = a * 100;

    // Guaranteed fallbacks for known paid tiers if prices were not populated
    if (m === 0) {
      const slug = (p.slug || p.id || "").toLowerCase();
      if (slug.includes("base")) { m = 39900; a = 29900; }
      else if (slug.includes("starter")) { m = 99900; a = 79900; }
      else if (slug.includes("growth")) { m = 199900; a = 159900; }
      else { m = 49900; a = 39900; }
    }

    if (cycle === "annual") {
      return a > 0 ? a : (m > 0 ? Math.round(m * 0.8) : 0);
    }
    return m;
  };

  const currentPlan = plans.find((p) => p.id === currentPlanId);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const isCurrentSelection = selectedPlanId === currentPlanId;
  const isFreePlan =
    selectedPlan?.id === "plan_free" ||
    selectedPlan?.slug === "free" ||
    (breakdown.baseAmount === 0 && resolvePrice(selectedPlan, "monthly") === 0);

  const isDowngrade =
    !!currentPlan && !!selectedPlan && (selectedPlan.displayOrder ?? 0) < (currentPlan.displayOrder ?? 0);
  const studentCount =
    typeof currentUsage?.students === "object"
      ? (currentUsage?.students?.current ?? 0)
      : Number(currentUsage?.students ?? 0);
  const targetLimit = selectedPlan?.limits?.maxStudents ?? 0;
  const isOverLimitOnDowngrade = isDowngrade && targetLimit !== -1 && studentCount > targetLimit;

  // Real annual savings percentage calculation
  const calculateSavingsPercent = (plan?: any): number => {
    if (!plan) return 0;
    const m = resolvePrice(plan, "monthly");
    const a = resolvePrice(plan, "annual");
    if (m <= 0 || a >= m) return 0;
    return Math.round(((m * 12 - a * 12) / (m * 12)) * 100);
  };

  const annualSavingsPercent = calculateSavingsPercent(selectedPlan);

  // Execution: Free Plan Activation or Paid Subscription Checkout
  const handleProceedToPayment = async () => {
    if (!priceReady || pricedSelection !== selectionKey) return;
    if (!schoolId) {
      toast.error("Authentication session missing. Please reload the page.");
      return;
    }

    // 1. FREE PLAN ACTIVATION PATH
    if (isFreePlan) {
      setIsCheckingOut(true);
      try {
        const res = await safeFetchJson("/api/billing/onboarding/free-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schoolId }),
        });

        if (res.ok && res.data?.success) {
          toast.success("Free Starter Plan activated successfully!");
          setIsCheckingOut(false);
          onClose();
          if (onSuccess) onSuccess("free_activated");
          window.location.reload();
        } else {
          toast.error(res.data?.error || "Failed to activate Free plan.");
          setIsCheckingOut(false);
        }
      } catch (err: any) {
        setIsCheckingOut(false);
        toast.error(err?.message || "Failed to activate plan.");
      }
      return;
    }

    // 2. PAID PLAN RECURRING CHECKOUT PATH
    setIsCheckingOut(true);
    setGatewayError(null);

    try {
      await triggerRazorpaySubscriptionCheckout({
        planId: selectedPlanId,
        billingCycle,
        couponCode: appliedCoupon || undefined,
        schoolId,
        prefillData: {
          name: profile?.name || "School Administrator",
          email: profile?.email || "",
          phone: (profile as any)?.phone || "",
        },
        onSuccess: (subscriptionId) => {
          setIsCheckingOut(false);
          toast.success("Subscription upgraded & AutoPay mandate verified!");
          onClose();
          if (onSuccess) onSuccess(subscriptionId);
          window.location.reload();
        },
        onError: (errMsg) => {
          setIsCheckingOut(false);
          setGatewayError(errMsg);
          toast.error(errMsg || "Checkout failed.");
        },
      });
    } catch (err: unknown) {
      setIsCheckingOut(false);
      const msg = err instanceof Error ? err.message : "Failed to open Razorpay Checkout.";
      setGatewayError(msg);
      toast.error(msg);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                Recharge / Upgrade Subscription
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select an institutional plan backed by Super Admin entitlements.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 pt-5">
          {/* Gateway Warning Notice if Error Occurred */}
          {gatewayError && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Payment Gateway Notice</p>
                <p className="mt-0.5 leading-relaxed">{gatewayError}</p>
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                  Ensure Razorpay Key ID and Secret are configured in Super Admin → Settings → Payment Gateway.
                </p>
              </div>
            </div>
          )}

          {/* Billing Duration Switch */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Billing Frequency
              </label>
              {annualSavingsPercent > 0 && (
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  Save {annualSavingsPercent}% with Annual Billing
                </span>
              )}
            </div>
            <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  billingCycle === "annual"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>Annual Billing</span>
                {annualSavingsPercent > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold">
                    -{annualSavingsPercent}%
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Dynamic Plan Selector Cards Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Subscription Plan
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[320px] overflow-y-auto pr-1">
              {eligiblePlans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const isCurrent = plan.id === currentPlanId;
                const isFree = plan.id === "plan_free" || plan.slug === "free";
                const mPrice = resolvePrice(plan, "monthly");
                const aPrice = resolvePrice(plan, "annual");
                const displayPrice = isFree
                  ? "₹0 / Free"
                  : billingCycle === "annual"
                  ? `${formatPaise(aPrice)} / mo`
                  : `${formatPaise(mPrice)} / mo`;

                return (
                  <button
                    type="button"
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`relative rounded-2xl border p-4 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm ring-2 ring-blue-500/20"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                        Current Plan
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {plan.name}
                        </span>
                        {plan.isPopular && !isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Popular
                          </span>
                        )}
                      </div>

                      <div className="mt-1">
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          {displayPrice}
                        </span>
                        {!isFree && billingCycle === "annual" && (
                          <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                            {formatPaise(aPrice * 12)} / year
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {plan.description || "School Study institutional tier."}
                      </p>

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                        <p>
                          👥 <strong>{plan.limits?.maxStudents === -1 ? "Unlimited" : plan.limits?.maxStudents ?? 10}</strong> Students
                        </p>
                        <p>
                          👨‍🏫 <strong>{plan.limits?.maxTeachers === -1 ? "Unlimited" : plan.limits?.maxTeachers ?? 2}</strong> Teachers
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Downgrade Capacity Notice */}
          {isOverLimitOnDowngrade && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-4 flex items-start gap-3 text-amber-900 dark:text-amber-300 text-xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Capacity Notice for Downgrade</p>
                <p className="mt-0.5 text-amber-800 dark:text-amber-400 leading-relaxed">
                  Your school currently has <strong>{studentCount} active students</strong>, which exceeds the {selectedPlan?.name} limit ({targetLimit}). Existing records will remain safe, but new admissions will require upgrading capacity.
                </p>
              </div>
            </div>
          )}

          {/* Coupon Code Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              <span>Discount Coupon</span>
            </label>
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>
                    Coupon <strong>{appliedCoupon}</strong> active ({formatPaise(breakdown.discountAmount)} discount applied)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="font-bold text-red-600 hover:underline cursor-pointer ml-3"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter coupon code (e.g. WELCOME20)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
                <button
                  type="submit"
                  disabled={isCalculating || !couponInput.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 transition-all cursor-pointer shrink-0"
                >
                  Apply
                </button>
              </form>
            )}
          </div>

          {/* Order Breakdown Summary */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Base Plan Price ({billingCycle === "annual" ? "12 Months" : "1 Month"})</span>
              <span className="font-mono">{formatPaise(breakdown.baseAmount)}</span>
            </div>

            {breakdown.discountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-600 font-semibold">
                <span>Coupon Discount ({appliedCoupon || "Special Promo"})</span>
                <span className="font-mono">-{formatPaise(breakdown.discountAmount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span>Net Taxable Amount</span>
              <span className="font-mono">
                {formatPaise(
                  breakdown.taxableAmount !== undefined
                    ? breakdown.taxableAmount
                    : Math.max(0, breakdown.baseAmount - breakdown.discountAmount)
                )}
              </span>
            </div>

            {breakdown.gstEnabled && (breakdown.gstRate || 0) > 0 ? (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>GST ({breakdown.gstRate}%)</span>
                <span className="font-mono">+{formatPaise(breakdown.gstAmount || 0)}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-slate-400 italic">
                <span>GST (Tax Exempt / Not Configured)</span>
                <span className="font-mono">₹0</span>
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white">
              <span>Total Amount Payable</span>
              <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                {isCalculating ? "Calculating..." : formatPaise(breakdown.finalAmount)}
              </span>
            </div>
          </div>

          {/* Action CTA Button */}
          <div className="pt-2 space-y-3">
            <button
              onClick={handleProceedToPayment}
              disabled={
                isCheckingOut ||
                isCalculating ||
                !priceReady ||
                pricedSelection !== selectionKey ||
                isCurrentSelection
              }
              className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                isCurrentSelection
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                  : "bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:scale-98 disabled:opacity-50"
              }`}
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {isFreePlan ? "Activating Free Starter..." : "Opening Razorpay Secure AutoPay..."}
                  </span>
                </>
              ) : isCurrentSelection ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Current Active Plan</span>
                </>
              ) : isFreePlan ? (
                <>
                  <span>Activate Free Starter Plan</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : isDowngrade ? (
                <>
                  <span>Confirm Plan Change</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Subscribe &amp; Enable AutoPay</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>256-bit Secure Razorpay Checkout</span>
              </span>
              <span>Cancel or adjust anytime in Settings</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
