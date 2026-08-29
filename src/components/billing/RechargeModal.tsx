"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { triggerRazorpayCheckout } from "@/lib/payments/clientCheckout";
import type { SchoolUsage } from "@/types";

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  userId: string;
  initialPlanId?: string;
  initialBillingCycle?: "monthly" | "annual";
  currentPlanId?: string;
  currentUsage?: SchoolUsage;
  onSuccess?: (orderId: string) => void;
}

interface PriceBreakdown {
  baseAmount: number; // paise
  discountAmount: number; // paise
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
  onSuccess,
}: RechargeModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(initialBillingCycle);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [breakdown, setBreakdown] = useState<PriceBreakdown>({
    baseAmount: 99900,
    discountAmount: 0,
    finalAmount: 99900,
    currency: "INR",
    couponValid: false,
  });

  // Keep state in sync with initial props
  useEffect(() => {
    if (initialPlanId) setSelectedPlanId(initialPlanId);
    if (initialBillingCycle) setBillingCycle(initialBillingCycle);
  }, [initialPlanId, initialBillingCycle]);

  // Recalculate price server-side when plan, billing cycle, or coupon changes
  const calculatePrice = async (planId: string, cycle: "monthly" | "annual", coupon?: string) => {
    setIsCalculating(true);
    try {
      const res = await fetch("/api/billing/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingCycle: cycle,
          couponCode: coupon || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBreakdown({
          baseAmount: data.baseAmount,
          discountAmount: data.discountAmount,
          finalAmount: data.finalAmount,
          currency: data.currency || "INR",
          couponValid: data.couponValid,
          couponMessage: data.couponMessage,
        });

        if (coupon && data.couponValid) {
          toast.success(data.couponMessage || "Coupon applied successfully!");
        } else if (coupon && !data.couponValid) {
          toast.error(data.couponMessage || "Invalid coupon code.");
        }
      } else {
        toast.error(data.error || "Failed to calculate pricing.");
      }
    } catch (err: any) {
      console.error("Price calculate error:", err);
      toast.error("Failed to calculate server-side pricing.");
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      calculatePrice(selectedPlanId, billingCycle, appliedCoupon);
    }
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
    calculatePrice(selectedPlanId, billingCycle, "");
  };

  const handleProceedToPayment = async () => {
    if (!schoolId || !userId) {
      toast.error("Authentication session missing. Please reload the page.");
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
    } catch (err: any) {
      setIsCheckingOut(false);
      toast.error(err.message || "Failed to open Razorpay Checkout.");
    }
  };

  // Downgrade check
  const isDowngrade =
    currentPlanId === "plan_professional" && selectedPlanId === "plan_starter";
  const studentCount = currentUsage?.students || 0;
  const isOverLimitOnDowngrade = isDowngrade && studentCount > 500;

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Starter Plan */}
              <div
                onClick={() => setSelectedPlanId("plan_starter")}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedPlanId === "plan_starter"
                    ? "border-blue-600 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-950/30"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Starter Plan</h3>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {billingCycle === "annual" ? "₹799/mo" : "₹999/mo"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Up to 500 students, 20 teachers, 15 classes & basic attendance.
                </p>
              </div>

              {/* Professional Plan */}
              <div
                onClick={() => setSelectedPlanId("plan_professional")}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${
                  selectedPlanId === "plan_professional"
                    ? "border-blue-600 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-950/30"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase">
                  Popular
                </span>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Professional</h3>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {billingCycle === "annual" ? "₹1,599/mo" : "₹1,999/mo"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Up to 2,000 students, 100 teachers, reports & automated alerts.
                </p>
              </div>
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
                  Your school currently has <strong>{studentCount} students</strong>, which exceeds the Starter plan limit (500). Your existing data will remain completely intact, but you won't be able to enroll new students until you upgrade.
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

          {/* Order Breakdown Summary (Section 8) */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Base Subscription Price ({billingCycle === "annual" ? "12 Months" : "1 Month"})</span>
              <span className="font-mono">{formatPaise(breakdown.baseAmount)}</span>
            </div>

            {breakdown.discountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-600 font-semibold">
                <span>Coupon Discount ({appliedCoupon || "Special Promo"})</span>
                <span className="font-mono">-{formatPaise(breakdown.discountAmount)}</span>
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
          <div className="pt-2">
            <button
              onClick={handleProceedToPayment}
              disabled={isCheckingOut || isCalculating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:scale-98 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Opening Razorpay Secure Checkout...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Pay {formatPaise(breakdown.finalAmount)} with Razorpay</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              🔒 256-bit Encrypted. Razorpay Verified Payment Gateway.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
