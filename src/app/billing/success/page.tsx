"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, FileText, ArrowRight, ShieldCheck, Calendar, CreditCard } from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import { InternalOrder, PaymentRecord, InvoiceRecord } from "@/lib/payments/fulfillment";

function formatRupees(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<InternalOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
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
          setOrder({ id: snap.id, ...snap.data() } as InternalOrder);
        }
      } catch (err) {
        console.error("Failed to load order:", err);
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderId]);

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl text-center space-y-6">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border-4 border-emerald-50 dark:border-emerald-900/50">
          <CheckCircle2 className="h-9 w-9 stroke-[2.2]" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Payment Successful!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Your subscription has been activated and updated cleanly.
          </p>
        </div>

        {/* Order Details Grid */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 text-left space-y-2.5 text-xs sm:text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-semibold">Plan Selected</span>
            <span className="font-extrabold text-slate-900 dark:text-white capitalize">
              {order?.planId || "Professional"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-semibold">Billing Cycle</span>
            <span className="font-extrabold text-slate-900 dark:text-white uppercase">
              {order?.billingCycle || "Annual"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-semibold">Amount Billed</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
              {order ? formatRupees(order.finalAmount) : "₹1,999"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-semibold">Order Reference</span>
            <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
              {order?.id || orderId || "ord_demo"}
            </span>
          </div>
        </div>

        {/* Buttons (Section 21) */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <Link
            href="/admin/dashboard"
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md active:scale-95 transition-all"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/admin/billing"
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all"
          >
            <FileText className="h-4 w-4" />
            View Invoices
          </Link>
        </div>
      </div>
    </div>
  );
}
