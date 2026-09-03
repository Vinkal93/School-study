"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { Search, UserCheck, Calendar, DollarSign, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import type { StudentFeeAssignment } from "@/types";
import { getStudentFeeAssignment, provisionStudentFeeAssignment } from "@/lib/services/fee.service";
import { toast } from "sonner";

export default function AdminStudentFeesPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [studentId, setStudentId] = useState("std_demo_1");
  const [studentName, setStudentName] = useState("Rahul Kumar");
  const [className, setClassName] = useState("Class 10");
  const [assignment, setAssignment] = useState<StudentFeeAssignment | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStudentLedger = async () => {
    if (!schoolId || !studentId) return;
    setLoading(true);
    try {
      let data = await getStudentFeeAssignment(schoolId, studentId);
      if (!data) {
        data = await provisionStudentFeeAssignment(schoolId, {
          id: studentId,
          name: studentName,
          admissionNumber: "ADM-2026-001",
          className,
          sectionName: "A",
        });
      }
      setAssignment(data);
    } catch (err) {
      toast.error("Failed to load student fee ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentLedger();
  }, [schoolId]);

  return (
    <EntitlementGate feature="fee_management" title="Student Fee Ledger" requiredPlan="Professional Plan">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Fee Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">View individual student month-wise fee status, payment breakdown, and total pending balances.</p>
        </div>

        {/* Student Selector Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center font-bold text-lg">
              {studentName.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{studentName}</h3>
              <p className="text-xs text-slate-500">Class: {className} (Section A) | Adm No: ADM-2026-001</p>
            </div>
          </div>
          <button
            onClick={fetchStudentLedger}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 transition-all"
          >
            Refresh Ledger
          </button>
        </div>

        {/* Month-Wise Fee Ledger Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : !assignment ? (
            <div className="p-8 text-center text-xs text-slate-500">No fee ledger found for student.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Month / Period</th>
                    <th className="py-3.5 px-4 text-right">Fee Amount</th>
                    <th className="py-3.5 px-4 text-right">Paid Amount</th>
                    <th className="py-3.5 px-4 text-right">Discount</th>
                    <th className="py-3.5 px-4 text-right">Late Fee</th>
                    <th className="py-3.5 px-4 text-right">Pending Balance</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {assignment.monthLedger.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{m.month}</td>
                      <td className="py-3.5 px-4 text-right">₹{(m.amountPaise / 100).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">₹{(m.paidAmountPaise / 100).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right text-blue-600">₹{(m.discountPaise / 100).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right text-amber-600">₹{(m.lateFeePaise / 100).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 dark:text-white">
                        ₹{(m.pendingAmountPaise / 100).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            m.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : m.status === "PARTIAL"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </EntitlementGate>
  );
}
