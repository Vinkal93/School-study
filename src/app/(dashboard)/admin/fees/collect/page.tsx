"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import { CreditCard, User, Calendar, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { FeePayment, FeeType } from "@/types";
import { toast } from "sonner";

export default function AdminCollectFeePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [studentId, setStudentId] = useState("std_demo_1");
  const [studentName, setStudentName] = useState("Rahul Kumar");
  const [admissionNumber, setAdmissionNumber] = useState("ADM-2026-001");
  const [className, setClassName] = useState("Class 10");
  const [sectionName, setSectionName] = useState("A");
  const [feeType, setFeeType] = useState<FeeType>("tuition");
  const [amountPaidRupees, setAmountPaidRupees] = useState("500");
  const [discountRupees, setDiscountRupees] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<FeePayment["paymentMethod"]>("Cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [selectedMonths, setSelectedMonths] = useState<string[]>(["April 2026"]);

  const [submitting, setSubmitting] = useState(false);
  const [issuedPayment, setIssuedPayment] = useState<FeePayment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const monthsList = [
    "April 2026", "May 2026", "June 2026", "July 2026", "August 2026", "September 2026",
    "October 2026", "November 2026", "December 2026", "January 2027", "February 2027", "March 2027"
  ];

  const handleMonthToggle = (month: string) => {
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter((m) => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month]);
    }
  };

  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountPaidRupees || parseFloat(amountPaidRupees) <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/fees/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          studentId,
          studentName,
          admissionNumber,
          className,
          sectionName,
          academicYearId: "ay_current",
          feeType,
          periodMonths: selectedMonths,
          amountPaidRupees: parseFloat(amountPaidRupees),
          discountRupees: parseFloat(discountRupees || "0"),
          paymentMethod,
          transactionRef,
          remarks,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Fee collected successfully! Receipt #${data.receiptNumber}`);
        setIssuedPayment(data.payment);
        setShowReceiptModal(true);
      } else {
        toast.error(data.error || "Failed to process fee payment.");
      }
    } catch (err) {
      toast.error("Server error processing payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EntitlementGate feature="fee_collection" title="Collect Fee Payment" requiredPlan="Professional Plan">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Collect Student Fee</h1>
          <p className="text-xs text-slate-500 mt-1">Record fee payment, calculate server-side late fee/discount, and issue official receipt.</p>
        </div>

        <form onSubmit={handleCollect} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Student Identification Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-600">1. Student Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Student Name</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Admission Number</label>
                <input
                  type="text"
                  required
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Class & Section</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                  />
                  <input
                    type="text"
                    required
                    value={sectionName}
                    onChange={(e) => setSectionName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fee Type</label>
                <select
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value as FeeType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium capitalize"
                >
                  <option value="tuition">Tuition Fee</option>
                  <option value="admission">Admission Fee</option>
                  <option value="annual">Annual Fee</option>
                  <option value="exam">Exam Fee</option>
                  <option value="computer">Computer Fee</option>
                  <option value="transport">Transport Fee</option>
                  <option value="library">Library Fee</option>
                  <option value="other">Other Fee</option>
                </select>
              </div>
            </div>
          </div>

          {/* Period Selection */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-600">2. Fee Period Months</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {monthsList.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => handleMonthToggle(m)}
                  className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                    selectedMonths.includes(m)
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Amount & Payment Method Section */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-600">3. Payment & Amount Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amountPaidRupees}
                  onChange={(e) => setAmountPaidRupees(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-extrabold text-base"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={discountRupees}
                  onChange={(e) => setDiscountRupees(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online Payment">Online Payment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Transaction Ref / Cheque No.</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/123456789"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-600 text-white font-extrabold text-xs shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>Submit Payment & Generate Receipt</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Receipt Modal */}
        <FeeReceiptModal
          payment={issuedPayment}
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
        />
      </div>
    </EntitlementGate>
  );
}
