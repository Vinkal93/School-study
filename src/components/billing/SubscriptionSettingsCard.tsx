"use client";

import React, { useState } from "react";
import {
  Sliders,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  Check,
  X,
  Loader2,
  Ban,
  Calendar,
  CreditCard,
  CheckCircle2,
  Sparkles,
  Info,
} from "lucide-react";
import type { SchoolSubscription } from "@/types";
import { toast } from "sonner";

export interface SubscriptionSettingsCardProps {
  schoolId: string;
  subscription: SchoolSubscription | null;
  planName?: string;
  nextBillingAmountRupees?: number;
  paymentMethodText?: string;
  onCancel: () => Promise<void>;
  onResume: () => Promise<void>;
  onRefresh: () => void;
}

export function SubscriptionSettingsCard({
  schoolId,
  subscription,
  planName = "Professional Plan",
  nextBillingAmountRupees = 2999,
  paymentMethodText = "Razorpay Autopay (UPI / Card)",
  onCancel,
  onResume,
  onRefresh,
}: SubscriptionSettingsCardProps) {
  const [autoRenew, setAutoRenew] = useState(subscription?.autoRenew ?? true);
  const [showAutoRenewModal, setShowAutoRenewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (!subscription) return null;

  const isCancelPending = subscription.cancelAtPeriodEnd || subscription.status === "CANCELLED";
  const formattedExpiry = new Date(subscription.expiresAt).toLocaleDateString("en-IN", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedNextBilling = new Date(
    subscription.nextBillingDate || subscription.expiresAt
  ).toLocaleDateString("en-IN", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleConfirmAutoRenewToggle = async () => {
    const targetState = !autoRenew;
    setTogglingAutoRenew(true);
    try {
      const res = await fetch("/api/billing/auto-renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, autoRenew: targetState }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update auto-renewal.");

      setAutoRenew(targetState);
      toast.success(json.message || "Auto-renewal preference saved.");
      setShowAutoRenewModal(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update auto-renewal.");
    } finally {
      setTogglingAutoRenew(false);
    }
  };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    try {
      await onCancel();
      setShowCancelModal(false);
    } catch (err) {
      // Toast handled by parent
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            <span>Subscription Controls & Renewal Details</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure auto-renewal mandate preferences and review upcoming renewal details.
          </p>
        </div>
      </div>

      {/* Requirement 11: Renewal Details Card */}
      <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-4 text-xs">
        <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-slate-400">
          Renewal Details
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-medium">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Current Plan</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm block">{planName}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Renewal Date</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm block">{formattedNextBilling}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Renewal Amount</span>
            <span className="font-black text-slate-900 dark:text-white text-sm block">
              ₹{nextBillingAmountRupees.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Payment Method</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 block">{paymentMethodText}</span>
          </div>

          <div className="space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Auto-Renewal Status</span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                autoRenew
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {autoRenew ? "ON (ACTIVE)" : "OFF (MANUAL)"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 text-xs">
        {/* Requirement 7 & 8: Auto Renewal Toggle Row */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-sm block">Automatic Renewal</span>
            <span className="text-slate-500 text-xs mt-0.5 block font-medium">
              {autoRenew
                ? "Your subscription will automatically renew at the end of the current billing cycle."
                : "Your subscription will remain active until the current expiry date."}
            </span>
          </div>

          <button
            onClick={() => setShowAutoRenewModal(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              autoRenew
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            {autoRenew ? "ON" : "OFF"}
          </button>
        </div>

        {/* Cancellation Row */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-sm block">Subscription Lifecycle</span>
            <span className="text-slate-500 text-xs mt-0.5 block font-medium">
              {isCancelPending
                ? `Subscription is scheduled to cancel at period end (${formattedExpiry}). Full access remains active.`
                : "You can set your subscription to cancel gracefully at the end of your paid billing period."}
            </span>
          </div>

          {isCancelPending ? (
            <button
              onClick={onResume}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm cursor-pointer shrink-0"
            >
              Resume Subscription
            </button>
          ) : (
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/60 dark:hover:text-red-300 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer shrink-0"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Requirement 10: Auto-Renewal Confirmation Modal */}
      {showAutoRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Turn {autoRenew ? "off" : "on"} auto-renewal?
              </h3>
              <button onClick={() => setShowAutoRenewModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Requirement 10 Modal Details */}
            <div className="space-y-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 font-medium">
                <p>
                  <strong>Current Plan:</strong> {planName}
                </p>
                <p>
                  <strong>Current Expiry Date:</strong> {formattedExpiry}
                </p>
                <p>
                  <strong>Next Billing Amount:</strong> ₹{nextBillingAmountRupees.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-[11px] font-semibold">
                <strong>Consequence of disabling auto-renewal:</strong> Your subscription will remain active until{" "}
                {formattedExpiry}. After that date, automatic mandate charges will stop and access will convert to restricted
                mode unless manually renewed.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAutoRenewModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                Keep Auto-Renewal
              </button>
              <button
                type="button"
                onClick={handleConfirmAutoRenewToggle}
                disabled={togglingAutoRenew}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer disabled:opacity-50"
              >
                {togglingAutoRenew ? <Loader2 className="h-4 w-4 animate-spin" /> : "Turn Off Auto-Renewal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 my-auto">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Cancel Subscription at Period End?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              You will continue to have full access to all features until <strong>{formattedExpiry}</strong>. No data will be
              deleted immediately.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                Keep Subscription
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer disabled:opacity-50"
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Cancel at Period End"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
