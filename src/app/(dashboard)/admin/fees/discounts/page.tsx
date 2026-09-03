"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { Sparkles, Percent, Tag, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminFeeDiscountsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [studentName, setStudentName] = useState("Rahul Kumar");
  const [discountType, setDiscountType] = useState("SCHOLARSHIP");
  const [amountRupees, setAmountRupees] = useState("100");
  const [reason, setReason] = useState("Merit Scholarship 2026");

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Discount of ₹${amountRupees} applied for ${studentName}`);
    setAmountRupees("");
  };

  return (
    <EntitlementGate feature="fee_discounts" title="Discounts & Concessions" requiredPlan="Professional Plan">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fee Discounts & Scholarships</h1>
          <p className="text-xs text-slate-500 mt-1">Configure student scholarships, staff child concessions, and custom fee adjustments.</p>
        </div>

        <form onSubmit={handleApply} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm text-xs">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="SCHOLARSHIP">Merit Scholarship</option>
                <option value="CONCESSION">Staff Concession</option>
                <option value="FIXED">Fixed Discount</option>
                <option value="CUSTOM">Custom Adjustment</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Discount Amount (₹)</label>
              <input
                type="number"
                required
                min="1"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reason / Justification</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Apply Discount</span>
            </button>
          </div>
        </form>
      </div>
    </EntitlementGate>
  );
}
