"use client";

import React, { useState } from "react";
import { X, Sparkles, CheckCircle2, ShieldCheck, CreditCard, Lock, Loader2, ArrowRight, Info } from "lucide-react";
import type { CustomOfferRecord } from "@/types/reports";
import { toast } from "sonner";
import { safeFetchJson } from "@/lib/utils/safeFetch";

export interface SpecialOfferCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: CustomOfferRecord | null;
  schoolId: string;
  userId: string;
  onSuccess: () => void;
}

export function SpecialOfferCheckoutModal({
  isOpen,
  onClose,
  offer,
  schoolId,
  userId,
  onSuccess,
}: SpecialOfferCheckoutModalProps) {
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !offer) return null;

  const offerPriceRupees = Math.round(offer.customPricePaise / 100);
  const regularPriceRupees = Math.round(offer.originalPricePaise / 100);
  const discountRupees = Math.max(0, regularPriceRupees - offerPriceRupees);

  const handleCheckout = async () => {
    if (!acceptTerms) {
      toast.error("Please accept the promotional terms before proceeding.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Server Payment Order
      const res = await safeFetchJson("/api/billing/offers/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: offer.id,
          schoolId,
          userId,
          acceptTerms: true,
        }),
      });

      if (!res.ok || !res.data) throw new Error(res.error || "Failed to initialize offer order.");
      const orderJson = res.data;

      // Check for Razorpay SDK on window
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        // Fallback for local testing / test mode signature verification
        const verifyRes = await safeFetchJson("/api/billing/offers/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offerId: offer.id,
            schoolId,
            userId,
            razorpayOrderId: orderJson.orderId,
            razorpayPaymentId: `pay_test_${Date.now()}`,
            razorpaySignature: "test_signature",
            amountPaise: offer.customPricePaise,
          }),
        });

        if (!verifyRes.ok) throw new Error(verifyRes.error || "Verification failed.");

        toast.success(verifyRes.data?.message || "Special offer activated successfully!");
        onSuccess();
        onClose();
        return;
      }

      // 2. Launch Razorpay Gateway Modal
      const options = {
        key: orderJson.keyId,
        amount: orderJson.amountPaise,
        currency: orderJson.currency,
        name: "SchoolStudy SaaS",
        description: `${offer.planName || "Enterprise"} Special Offer Activation`,
        order_id: orderJson.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await safeFetchJson("/api/billing/offers/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                offerId: offer.id,
                schoolId,
                userId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                amountPaise: offer.customPricePaise,
              }),
            });

            if (!verifyRes.ok) throw new Error(verifyRes.error || "Verification failed.");

            toast.success(verifyRes.data?.message || "Special offer activated successfully!");
            onSuccess();
            onClose();
          } catch (vErr: any) {
            toast.error(vErr.message || "Payment verification failed.");
          }
        },
        prefill: {
          email: offer.adminEmail || "admin@schoolstudy.in",
        },
        theme: { color: "#d97706" },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to proceed to offer checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Special Promotional Offer</h3>
              <p className="text-xs text-slate-500">Offer Code: {offer.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pricing Summary Box */}
        <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-900 dark:text-white text-base">{offer.planName || "Enterprise Plan"}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
              {offer.discountPercentage || 99.99}% SAVINGS
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-slate-400 text-xs block font-bold">Standard Price</span>
              <span className="text-sm font-bold text-slate-400 line-through">₹{regularPriceRupees.toLocaleString("en-IN")} / month</span>
            </div>
            <div className="text-right">
              <span className="text-amber-700 dark:text-amber-300 text-xs block font-bold">Your Special Price</span>
              <span className="text-3xl font-black text-slate-900 dark:text-white">₹{offerPriceRupees.toLocaleString("en-IN")}</span>
              <span className="text-[11px] text-slate-500 font-semibold block">/ month</span>
            </div>
          </div>
        </div>

        {/* What Is Included */}
        <div className="space-y-2 text-xs">
          <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Capabilities Included in This Offer</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Full {offer.planName || "Enterprise"} Tier Features</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Unlimited Operational Limits</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Advanced Reports & Finance Exports</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Priority Customer Support</span>
            </div>
          </div>
        </div>

        {/* Future Renewal Terms Disclosure */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Info className="h-4 w-4 text-blue-600" />
            <span>Renewal & Billing Terms</span>
          </span>
          <p className="text-[11px] leading-relaxed">
            After the {offer.promoDurationMonths || 1} month promotional period ends on{" "}
            <strong>
              {new Date(Date.now() + (offer.promoDurationMonths || 1) * 30 * 86400000).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </strong>
            , your subscription will automatically renew at the regular price of{" "}
            <strong>₹{regularPriceRupees.toLocaleString("en-IN")}/month</strong> unless updated or cancelled prior to the renewal date.
          </p>
        </div>

        {/* Required Terms Checkbox */}
        <div className="flex items-start gap-2.5 text-xs pt-1">
          <input
            type="checkbox"
            id="offerTermsCheck"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
          />
          <label htmlFor="offerTermsCheck" className="text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
            I understand the promotional pricing of ₹{offerPriceRupees}, validity period, and standard renewal terms.
          </label>
        </div>

        {/* Bottom CTA Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={submitting || !acceptTerms}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            <span>Pay ₹{offerPriceRupees} & Activate Plan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
