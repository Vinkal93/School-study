"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  ArrowRight,
  ShieldCheck,
  Calendar,
  CreditCard,
  Loader2,
  AlertCircle,
  Receipt,
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import type { SchoolSubscription } from "@/types";
import type { InternalOrder } from "@/lib/payments/fulfillment";

function formatRupees(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<InternalOrder | null>(null);
  const [subscription, setSubscription] = useState<SchoolSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    async function verifyAndLoadOrder() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const db = getFirebaseDb();
        if (!db) return;

        const orderRef = doc(db, BILLING_COLLECTIONS.ORDERS || "orders", orderId);
        const snap = await getDoc(orderRef);

        if (snap.exists()) {
          const oData = { id: snap.id, ...snap.data() } as InternalOrder;
          setOrder(oData);

          // If order is PAID, load updated subscription
          if (oData.status === "PAID" && oData.schoolId) {
            const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, oData.schoolId);
            const subSnap = await getDoc(subRef);
            if (subSnap.exists()) {
              setSubscription(subSnap.data() as SchoolSubscription);
            }
            setLoading(false);
          } else if (pollCount < 5) {
            // Poll for webhook completion
            timer = setTimeout(() => {
              setPollCount((prev) => prev + 1);
            }, 2000);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load order:", err);
        setLoading(false);
      }
    }

    verifyAndLoadOrder();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [orderId, pollCount]);

  const isConfirmed = order?.status === "PAID";
  const invId = `inv_${order?.id}`;

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl text-center space-y-6">
        {loading ? (
          <div className="py-12 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Confirming your payment...
              </h2>
              <p className="text-xs text-slate-500">
                Verifying transaction signature and activating your school subscription.
              </p>
            </div>
          </div>
        ) : isConfirmed ? (
          <>
            {/* Success Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border-4 border-emerald-50 dark:border-emerald-900/50">
              <CheckCircle2 className="h-9 w-9 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Payment Successful!
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Your school subscription has been renewed and activated with full privileges.
              </p>
            </div>

            {/* Order Details Grid (Section 11) */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 text-left space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Plan Activated</span>
                <span className="font-extrabold text-slate-900 dark:text-white capitalize">
                  {order?.planId?.replace("plan_", "") || "Professional"} Plan
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Billing Cycle</span>
                <span className="font-extrabold text-slate-900 dark:text-white uppercase">
                  {order?.billingCycle || "Annual"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Amount Paid</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {order ? formatRupees(order.finalAmount) : "₹1,999"}
                </span>
              </div>

              {subscription?.expiresAt && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Valid Until</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {new Date(subscription.expiresAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-700">
                <span className="text-slate-400 font-semibold text-[11px]">Order Reference</span>
                <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                  {order?.id || orderId}
                </span>
              </div>
            </div>

            {/* Action Buttons (Section 11) */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <Link
                href="/admin"
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md active:scale-95 transition-all"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href={`/billing/invoices/${invId}`}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all"
              >
                <FileText className="h-4 w-4" />
                View Invoice
              </Link>
            </div>
          </>
        ) : (
          <div className="py-6 space-y-4">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Payment Verification Pending
              </h2>
              <p className="text-xs text-slate-500">
                Your payment is currently being confirmed by the banking network. Please check your billing dashboard in a moment.
              </p>
            </div>
            <Link
              href="/admin/billing"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs"
            >
              Go to Billing
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
