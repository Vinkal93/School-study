"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { AlertCircle, Search, Printer, CreditCard, Loader2 } from "lucide-react";
import type { StudentFeeAssignment } from "@/types";
import { getDefaultersList } from "@/lib/services/fee.service";
import { toast } from "sonner";

export default function AdminFeeDefaultersPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [defaulters, setDefaulters] = useState<StudentFeeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("all");

  const fetchDefaulters = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const list = await getDefaultersList(schoolId, selectedClass);
      setDefaulters(list);
    } catch (err) {
      toast.error("Failed to load defaulters list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaulters();
  }, [schoolId, selectedClass]);

  return (
    <EntitlementGate feature="fee_management" title="Dues & Fee Defaulters" requiredPlan="Professional Plan">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fee Defaulters & Dues List</h1>
            <p className="text-xs text-slate-500 mt-1">Real-time list of students with outstanding pending fee balances.</p>
          </div>
          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value="all">All Classes</option>
              <option value="Class 10">Class 10</option>
              <option value="Class 9">Class 9</option>
              <option value="Class 8">Class 8</option>
            </select>
          </div>
        </div>

        {/* Defaulters Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : defaulters.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              🎉 No fee defaulters found! All student fees are up-to-date.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Student Name</th>
                    <th className="py-3.5 px-4">Admission No</th>
                    <th className="py-3.5 px-4">Class</th>
                    <th className="py-3.5 px-4 text-right">Total Assigned</th>
                    <th className="py-3.5 px-4 text-right">Total Paid</th>
                    <th className="py-3.5 px-4 text-right">Overdue Dues</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {defaulters.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{d.studentName}</td>
                      <td className="py-3.5 px-4 text-slate-500">{d.admissionNumber}</td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{d.className} ({d.sectionName})</td>
                      <td className="py-3.5 px-4 text-right">₹{(d.totalAssignedPaise / 100).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right text-emerald-600 font-bold">₹{(d.totalPaidPaise / 100).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-red-600">₹{(d.totalPendingPaise / 100).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href="/admin/fees/collect"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-all shadow-sm"
                        >
                          <CreditCard className="h-3 w-3" />
                          <span>Collect</span>
                        </Link>
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
