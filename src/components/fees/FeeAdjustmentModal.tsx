"use client";

import { useState, useEffect } from "react";
import { X, SlidersHorizontal, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { MonthLedgerItem } from "@/types";
import { adjustStudentMonthLedger } from "@/lib/services/fee.service";
import { toast } from "sonner";

interface FeeAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    className: string;
  };
  ledgerItem: MonthLedgerItem | null;
  onSuccess: () => void;
}

export function FeeAdjustmentModal({
  isOpen,
  onClose,
  schoolId,
  student,
  ledgerItem,
  onSuccess,
}: FeeAdjustmentModalProps) {
  if (!isOpen || !ledgerItem) return null;

  const [expectedFee, setExpectedFee] = useState(ledgerItem.amountPaise / 100);
  const [paidAmount, setPaidAmount] = useState(ledgerItem.paidAmountPaise / 100);
  const [discount, setDiscount] = useState(ledgerItem.discountPaise / 100);
  const [previousDue, setPreviousDue] = useState((ledgerItem.previousDuePaise || 0) / 100);
  const [lateFee, setLateFee] = useState(ledgerItem.lateFeePaise / 100);
  const [notes, setNotes] = useState(ledgerItem.adjustmentNote || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setExpectedFee(ledgerItem.amountPaise / 100);
    setPaidAmount(ledgerItem.paidAmountPaise / 100);
    setDiscount(ledgerItem.discountPaise / 100);
    setPreviousDue((ledgerItem.previousDuePaise || 0) / 100);
    setLateFee(ledgerItem.lateFeePaise / 100);
    setNotes(ledgerItem.adjustmentNote || "");
  }, [ledgerItem]);

  const finalDue = Math.max(
    0,
    (Number(expectedFee || 0) + Number(lateFee || 0) + Number(previousDue || 0)) -
      (Number(paidAmount || 0) + Number(discount || 0))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const adjustmentData = {
        expectedFeeRupees: Number(expectedFee || 0),
        paidAmountRupees: Number(paidAmount || 0),
        discountRupees: Number(discount || 0),
        previousDueRupees: Number(previousDue || 0),
        lateFeeRupees: Number(lateFee || 0),
        notes: notes.trim(),
      };

      let success = false;
      // 1. Try server API
      try {
        const res = await fetch("/api/fees/adjustments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId,
            studentId: student.id,
            monthName: ledgerItem.month,
            adjustment: adjustmentData,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          success = true;
        }
      } catch (apiErr) {
        console.warn("API adjustment failed, falling back to authenticated client SDK:", apiErr);
      }

      // 2. Resilient Client Fallback
      if (!success) {
        await adjustStudentMonthLedger(
          schoolId,
          student.id,
          ledgerItem.month,
          adjustmentData,
          "school_admin"
        );
        success = true;
      }

      toast.success(`Ledger for ${ledgerItem.month} updated and locked against overwrites.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Adjustment error:", err);
      toast.error(err.message || "Failed to save adjustment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            <span>Manual Ledger Adjustment &mdash; {ledgerItem.month}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Student Context Bar */}
        <div className="px-6 py-3 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-900 dark:text-white">{student.name}</span>
            <span className="text-slate-500 ml-1.5">({student.className} &bull; Adm #{student.admissionNumber})</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
            {ledgerItem.month}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Expected Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={expectedFee}
                onChange={(e) => setExpectedFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-emerald-600">
                Paid Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-transparent font-bold text-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Discount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-medium text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Previous Due (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={previousDue}
                onChange={(e) => setPreviousDue(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-medium text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Late Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={lateFee}
                onChange={(e) => setLateFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-medium text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Calculated Due Display */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-semibold block text-[11px]">Calculated Outstanding for {ledgerItem.month}</span>
              <span className="text-[10px] text-slate-400">(Expected + Late Fee + Prev Due) &minus; (Paid + Discount)</span>
            </div>
            <div className="text-right">
              <span className={`text-xl font-black ${finalDue === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                ₹{finalDue.toFixed(2)}
              </span>
              <span className="block text-[10px] font-bold uppercase text-slate-400 mt-0.5">
                {finalDue === 0 ? "STATUS: PAID" : paidAmount > 0 ? "STATUS: PARTIAL" : "STATUS: PENDING"}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Adjustment Notes / Justification
            </label>
            <input
              type="text"
              placeholder="e.g. Initial setup advance payment / approved concession"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              This correction will be locked as authoritative source data. Future monthly calculations will NOT overwrite it.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save &amp; Lock Adjustment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
