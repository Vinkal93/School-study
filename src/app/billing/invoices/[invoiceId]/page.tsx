"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FileText, Printer, ArrowLeft, ShieldCheck, CheckCircle2, Building2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import { InvoiceRecord, PaymentRecord, InternalOrder } from "@/lib/payments/fulfillment";

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.invoiceId as string;
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [schoolName, setSchoolName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    async function loadInvoice() {
      if (!invoiceId || authLoading) return;

      // Section 14 & 25: Server/Client Authorization check
      if (!profile?.role || (profile.role !== "super_admin" && profile.role !== "school_admin")) {
        setForbidden(true);
        setLoading(false);
        return;
      }

      try {
        const db = getFirebaseDb();
        if (!db) return;

        const invRef = doc(db, BILLING_COLLECTIONS.INVOICES || "invoices", invoiceId);
        const invSnap = await getDoc(invRef);

        if (!invSnap.exists()) {
          setLoading(false);
          return;
        }

        const invData = { id: invSnap.id, ...invSnap.data() } as InvoiceRecord;

        // Section 14: Tenant Isolation Check — School Admin can only view invoices of their school
        if (profile.role === "school_admin" && invData.schoolId !== profile.schoolId) {
          setForbidden(true);
          setLoading(false);
          return;
        }

        setInvoice(invData);

        // Fetch School Name
        const schoolRef = doc(db, "schools", invData.schoolId);
        const schoolSnap = await getDoc(schoolRef);
        if (schoolSnap.exists()) {
          setSchoolName((schoolSnap.data() as any).name || invData.schoolId);
        } else {
          setSchoolName(invData.schoolId);
        }
      } catch (err) {
        console.error("Failed to load invoice:", err);
      } finally {
        setLoading(false);
      }
    }

    loadInvoice();
  }, [invoiceId, profile, authLoading]);

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center max-w-md w-full space-y-4">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">403 — Unauthorized Access</h1>
          <p className="text-xs text-slate-500">You do not have authorization to view this billing invoice.</p>
          <Link href="/pricing" className="inline-block px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs">
            Return to Pricing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 flex justify-center">
      <div className="max-w-3xl w-full space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm transition-all"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / Download PDF
          </button>
        </div>

        {/* Printable Invoice Card (Section 13) */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center text-slate-400">
            Loading invoice details...
          </div>
        ) : !invoice ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center text-slate-400">
            Invoice not found.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-xl space-y-8 print:border-none print:shadow-none">
            {/* Invoice Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  SCHOOL STUDY
                </h1>
                <p className="text-xs text-slate-500">Official Subscription Invoice</p>
                <p className="text-xs text-slate-400 mt-1">SBCI Online SaaS Platform</p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold rounded-full uppercase">
                  {invoice.status}
                </span>
                <p className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                  {invoice.invoiceNumber}
                </p>
                <p className="text-xs text-slate-500">
                  Issued: {new Date(invoice.issuedAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>

            {/* Customer / Billed To Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Billed To</span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                  {schoolName}
                </h3>
                <p className="text-xs text-slate-500 font-mono">School ID: {invoice.schoolId}</p>
              </div>

              <div className="space-y-1 sm:text-right">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Reference</span>
                <p className="text-xs font-mono text-slate-700 dark:text-slate-300">
                  Payment ID: {invoice.paymentId}
                </p>
                <p className="text-xs font-mono text-slate-700 dark:text-slate-300">
                  Order ID: {invoice.orderId}
                </p>
              </div>
            </div>

            {/* Line Items Table (Section 13 & 21) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50">
                    <th className="p-3">Description</th>
                    <th className="p-3">Billing Cycle</th>
                    <th className="p-3">Plan Version</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-3 font-bold text-slate-900 dark:text-white capitalize">
                      School Study Subscription Plan — {invoice.planId}
                    </td>
                    <td className="p-3 font-semibold uppercase">{invoice.billingCycle}</td>
                    <td className="p-3 font-mono text-slate-500">{invoice.planVersionId}</td>
                    <td className="p-3 font-bold text-right text-slate-900 dark:text-white">
                      {formatRupees(invoice.subtotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Invoice Totals */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col items-end space-y-2 text-xs">
              <div className="flex justify-between w-full max-w-xs text-slate-600 dark:text-slate-400 font-semibold">
                <span>Subtotal</span>
                <span>{formatRupees(invoice.subtotal)}</span>
              </div>

              {invoice.discount > 0 && (
                <div className="flex justify-between w-full max-w-xs text-amber-600 font-semibold">
                  <span>Discount Applied</span>
                  <span>-{formatRupees(invoice.discount)}</span>
                </div>
              )}

              {invoice.tax > 0 && (
                <div className="flex justify-between w-full max-w-xs text-slate-600 font-semibold">
                  <span>Tax</span>
                  <span>{formatRupees(invoice.tax)}</span>
                </div>
              )}

              <div className="flex justify-between w-full max-w-xs pt-2 border-t border-slate-200 dark:border-slate-800 font-extrabold text-sm text-slate-900 dark:text-white">
                <span>Total Paid</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatRupees(invoice.total)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-500">Thank you for subscribing to School Study!</p>
              <p className="text-[11px] text-slate-400">For billing & support inquiries, contact SBCI224234@gmail.com | Helpline: +91 9118245636 (Mon - Sat 9:00 AM - 7:00 PM IST)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
