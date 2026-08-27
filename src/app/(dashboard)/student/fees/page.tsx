"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  FileText,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
} from "lucide-react";
import { StudentDashboardLayout } from "@/components/student/StudentDashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { triggerRazorpayCheckout } from "@/lib/payments/clientCheckout";
import { toast } from "sonner";

export default function StudentFeesPage() {
  const { profile } = useAuth();
  const [processing, setProcessing] = useState(false);

  const feeSummary = {
    totalFees: 34000,
    paidFees: 32500,
    outstanding: 1500,
    dueMonth: "August 2024",
  };

  const feeDetails = [
    { month: "August 2024", amount: 1500, status: "Due", badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
    { month: "July 2024", amount: 2000, status: "Paid", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
    { month: "June 2024", amount: 2000, status: "Paid", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
    { month: "May 2024", amount: 2000, status: "Paid", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
    { month: "April 2024", amount: 2000, status: "Paid", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  ];

  const handlePayNow = async () => {
    if (!profile?.schoolId || !profile?.uid) {
      toast.info("Please log in to make fee payments.");
      return;
    }

    setProcessing(true);
    try {
      await triggerRazorpayCheckout({
        planId: "student_fee_august",
        billingCycle: "monthly",
        schoolId: profile.schoolId,
        userId: profile.uid,
        prefillData: {
          name: profile.name || "Rahul Kumar",
          email: profile.email || "",
        },
        onSuccess: (orderId) => {
          toast.success("Fee payment completed successfully!");
        },
        onError: (err) => {
          toast.error(err || "Payment failed.");
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger checkout.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <StudentDashboardLayout
      student={{ id: "student_demo", firstName: "Rahul", fullName: "Rahul Kumar" }}
      notifications={{ unreadCount: 3 }}
    >
      <div className="w-full space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/student"
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/40">
              <Wallet className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Fees
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage your fee payments
              </p>
            </div>
          </div>

          <button className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all">
            <FileText className="h-4 w-4" />
          </button>
        </div>

        {/* Section 1: Outstanding Amount Card (Pink Background matching Reference UI) */}
        <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-rose-700/80 dark:text-rose-300 uppercase tracking-wider">
              Outstanding Amount
            </span>
            <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
              ₹1,500
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Due for {feeSummary.dueMonth}
            </p>
          </div>

          <button
            onClick={handlePayNow}
            disabled={processing}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Pay Now"
            )}
          </button>
        </div>

        {/* Section 2: Fee Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Fee Summary
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Total Fees
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                ₹{feeSummary.totalFees.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Paid Fees
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                ₹{feeSummary.paidFees.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Outstanding
              </span>
              <span className="font-extrabold text-rose-600 dark:text-rose-400">
                ₹{feeSummary.outstanding.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Fee Details List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Fee Details
          </h2>

          <div className="space-y-2.5">
            {feeDetails.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3"
              >
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {item.month}
                  </h3>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ₹{item.amount.toLocaleString("en-IN")}
                  </p>
                </div>

                <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${item.badge}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StudentDashboardLayout>
  );
}
