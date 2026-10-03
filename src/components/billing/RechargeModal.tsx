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
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { safeFetchJson } from "@/lib/utils/safeFetch";
import { triggerRazorpayCheckout } from "@/lib/payments/clientCheckout";
import type { Plan, SchoolUsage } from "@/types";

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  userId: string;
  initialPlanId?: string;
  initialBillingCycle?: "monthly" | "annual";
  currentPlanId?: string;
  currentUsage?: SchoolUsage;
  plans?: Plan[];
  onSuccess?: (orderId: string) => void;
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

function formatPaise(paise: number): string {
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
  const { firebaseUser } = useAuth();
  const priceRequest = useRef(0);
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(initialBillingCycle);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
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

  // Recalculate price server-side when plan, billing cycle, or coupon changes
  const calculatePrice = async (planId: string, cycle: "monthly" | "annual", coupon?: string) => {
    const requestId = ++priceRequest.current;
    try {
      const token = await firebaseUser?.getIdToken();
      if (requestId !== priceRequest.current) return;
      setIsCalculating(true);
      setPriceReady(false);
      const res = await safeFetchJson("/api/billing/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
          couponMessage: calc.couponCode ? `Coupon "${calc.couponCode}" applied successfully!` : undefined,
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
      void Promise.resolve().then(() => { if (!cancelled) return calculatePrice(selectedPlanId, billingCycle, appliedCoupon); });
    }
    return () => { cancelled = true; priceRequest.current++; };
  }, [isOpen, selectedPlanId, billingCycle, appliedCoupon]);

  if (!isOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) {
      toast.error("Please enter a coupon code.");
      return;
    }
    setAppliedCoupon(couponInput.trim());
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon("");
    setCouponInput("");
  };

  const handleProceedToPayment = async () => {
    if (!priceReady || pricedSelection !== selectionKey) return;
    if (!schoolId || !userId) {
      toast.error("Authentication session missing. Please reload the page.");
      return;
    }

    // Payment Gateway Temporary State: Online payments are currently Coming Soon
    const isPaymentGatewayLive = process.env.NEXT_PUBLIC_PAYMENT_GATEWAY_LIVE === "true";
    if (!isPaymentGatewayLive) {
      toast.info(
        "Online payments are coming soon! Payment gateway integration is currently being prepared. Please contact your Super Administrator for plan activation.",
        { duration: 6000 }
      );
      return;
    }

    setIsCheckingOut(true);
    try {
      await triggerRazorpayCheckout({
        planId: selectedPlanId,
        billingCycle,
        couponCode: appliedCoupon || undefined,
        schoolId,
        userId,
        onSuccess: (orderId) => {
          setIsCheckingOut(false);
          onClose();
          if (onSuccess) onSuccess(orderId);
        },
        onError: (errMsg) => {
          setIsCheckingOut(false);
          toast.error(errMsg || "Payment checkout failed.");
        },
      });
    } catch (err: unknown) {
      setIsCheckingOut(false);
      toast.error(err instanceof Error ? err.message : "Failed to open Razorpay Checkout.");
    }
  };

  const current = plans.find(p => p.id === currentPlanId);
  const selected = plans.find(p => p.id === selectedPlanId);
  const isDowngrade = !!current && !!selected && selected.displayOrder < current.displayOrder;
  const studentCount = currentUsage?.students ?? 0;
  const targetLimit = selected?.limits.maxStudents ?? 0;
  const isOverLimitOnDowngrade = isDowngrade && targetLimit !== -1 && studentCount > targetLimit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Recharge / Upgrade Subscription
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a plan and billing cycle for your school.
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
          {/* Plan Selector Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Subscription Plan
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.filter(p => p.status === "ACTIVE" && !p.isArchived && p.publicVisible !== false).map(p => <button type="button" key={p.id} onClick={() => setSelectedPlanId(p.id)} className={`rounded-2xl border p-4 text-left ${selectedPlanId === p.id ? "border-blue-600 bg-blue-50 dark:bg-blue-950" : "border-slate-200 dark:border-slate-700"}`}><strong>{p.name}</strong><p className="mt-2 text-xs">{p.description}</p></button>)}
            </div>
          </div>
          {/* Billing Cycle Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Billing Duration
            </label>
            <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  billingCycle === "annual"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px]">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Downgrade Warning */}
          {isOverLimitOnDowngrade && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-4 flex items-start gap-3 text-amber-900 dark:text-amber-300 text-xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Capacity Notice for Downgrade</p>
                <p className="mt-0.5 text-amber-800 dark:text-amber-400 leading-relaxed">
                  Your school currently has <strong>{studentCount} students</strong>, which exceeds the {selected?.name} plan limit ({targetLimit}). Review capacity before changing plans.
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
                    Coupon <strong>{appliedCoupon}</strong> applied ({formatPaise(breakdown.discountAmount)} discount)
                  </span>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="font-bold text-red-600 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter coupon (e.g. SAVE20)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
                <button
                  type="submit"
                  disabled={isCalculating}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 transition-all cursor-pointer shrink-0"
                >
                  Apply
                </button>
              </form>
            )}
          </div>

          {/* Order Breakdown Summary with GST */}
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
                {formatPaise(breakdown.taxableAmount !== undefined ? breakdown.taxableAmount : Math.max(0, breakdown.baseAmount - breakdown.discountAmount))}
              </span>
            </div>

            {breakdown.gstEnabled && (breakdown.gstRate || 0) > 0 ? (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>GST ({breakdown.gstRate}%)</span>
                <span className="font-mono">+{formatPaise(breakdown.gstAmount || 0)}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-slate-400 italic">
                <span>GST (Tax Exempt / OFF)</span>
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

          {/* Checkout CTA */}
          <div className="pt-2 space-y-3">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
              <div className="flex items-center gap-2 font-bold mb-1">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Online Payments Coming Soon</span>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
                Payment gateway integration is currently being prepared. To activate or change your school plan immediately, please contact your Super Administrator.
              </p>
            </div>

            <button
              onClick={handleProceedToPayment}
              disabled={isCheckingOut || isCalculating || !priceReady || pricedSelection !== selectionKey}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:scale-98 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Opening Razorpay Secure Checkout...</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4" />
                  <span>Online Payments Coming Soon</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-slate-400">
              🔒 Payment gateway is in preparation. Super Admin can manually assign any plan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
