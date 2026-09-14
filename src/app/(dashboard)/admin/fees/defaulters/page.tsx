"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  AlertCircle,
  Search,
  CreditCard,
  Loader2,
  Phone,
  MessageSquare,
  Share2,
  PhoneCall,
  User,
  Clock,
  Calendar,
  Filter,
} from "lucide-react";
import type { StudentFeeAssignment, SchoolClass } from "@/types";
import { getDefaultersList } from "@/lib/services/fee.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { ShareFeeModal } from "@/components/fees/ShareFeeModal";
import { FeeFollowUpModal } from "@/components/fees/FeeFollowUpModal";
import { toast } from "sonner";

export default function AdminFeeDefaultersPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [defaulters, setDefaulters] = useState<StudentFeeAssignment[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [shareModalTarget, setShareModalTarget] = useState<StudentFeeAssignment | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<StudentFeeAssignment | null>(null);

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [list, clsList] = await Promise.all([
        getDefaultersList(schoolId, selectedClass),
        getClassesWithSections(schoolId),
      ]);
      setDefaulters(list);
      setClasses(clsList);
    } catch (err) {
      toast.error("Failed to load defaulters list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId, selectedClass]);

  const filteredDefaulters = useMemo(() => {
    return defaulters.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        d.studentName?.toLowerCase().includes(q) ||
        d.admissionNumber?.toLowerCase().includes(q) ||
        d.className?.toLowerCase().includes(q) ||
        (d.phone && d.phone.includes(q))
      );
    });
  }, [defaulters, searchQuery]);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <EntitlementGate feature="fee_management" title="Dues & Fee Defaulters" requiredPlan="Professional Plan">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Fee Defaulters & Overdue Ledger</h1>
            <p className="text-xs text-slate-500 mt-1">
              Active CRM tracking students with overdue balances, follow-up logs, and instant WhatsApp reminders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-56">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search student, adm no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white shadow-xs"
              />
            </div>

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white shadow-xs"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.name}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Defaulters Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-xs font-semibold">Loading fee defaulters roster...</p>
            </div>
          ) : filteredDefaulters.length === 0 ? (
            <div className="p-16 text-center space-y-2">
              <p className="text-3xl">🎉</p>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zero Pending Dues Found</h3>
              <p className="text-xs text-slate-500">
                {searchQuery ? "No defaulters matched your search filters." : "All student accounts are currently settled and up to date!"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Class & Section</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4 text-right">Total Assigned</th>
                    <th className="py-3.5 px-4 text-right">Paid</th>
                    <th className="py-3.5 px-4 text-right">Pending Dues</th>
                    <th className="py-3.5 px-4 text-center">Follow-up Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredDefaulters.map((d) => {
                    // Compute overdue months count and earliest overdue date
                    const unpaidMonths = d.monthLedger?.filter((m) => m.pendingAmountPaise > 0) || [];
                    const earliestOverdueDate = unpaidMonths.find((m) => m.dueDate && m.dueDate.slice(0, 10) < todayIso)?.dueDate;
                    
                    let daysOverdue = 0;
                    if (earliestOverdueDate) {
                      const diffTime = Math.abs(new Date().getTime() - new Date(earliestOverdueDate).getTime());
                      daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    }

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <Link href={`/admin/students/${d.studentId}`} className="hover:underline">
                            <p className="font-extrabold text-slate-900 dark:text-white hover:text-blue-600 transition-colors">
                              {d.studentName}
                            </p>
                          </Link>
                          <p className="font-mono text-[10px] text-slate-400">Adm #{d.admissionNumber}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {d.className} ({d.sectionName || "A"})
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {d.phone || d.parentPhone ? (
                            <a
                              href={`tel:${d.phone || d.parentPhone}`}
                              className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              <span>{d.phone || d.parentPhone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">No phone</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right text-slate-600 dark:text-slate-300 font-semibold">
                          ₹{(d.totalAssignedPaise / 100).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right text-emerald-600 font-bold">
                          ₹{(d.totalPaidPaise / 100).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <p className="font-black text-rose-600 text-sm">
                            ₹{(d.totalPendingPaise / 100).toFixed(2)}
                          </p>
                          {daysOverdue > 0 && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                              {daysOverdue}d overdue
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setFollowUpTarget(d)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer border transition-all hover:scale-105"
                            style={{
                              backgroundColor: d.latestFollowUpStatus === "Promised" ? "#eff6ff" : d.latestFollowUpStatus === "Contacted" ? "#faf5ff" : "#fef2f2",
                              color: d.latestFollowUpStatus === "Promised" ? "#2563eb" : d.latestFollowUpStatus === "Contacted" ? "#7c3aed" : "#dc2626",
                              borderColor: d.latestFollowUpStatus === "Promised" ? "#bfdbfe" : d.latestFollowUpStatus === "Contacted" ? "#e9d5ff" : "#fecaca",
                            }}
                          >
                            <PhoneCall className="h-2.5 w-2.5" />
                            <span>{d.latestFollowUpStatus || "Pending"}</span>
                          </button>
                          {d.lastFollowUpDate && (
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              {new Date(d.lastFollowUpDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShareModalTarget(d)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all cursor-pointer"
                              title="Share Fee Details / WhatsApp"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setFollowUpTarget(d)}
                              className="p-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-all cursor-pointer"
                              title="Record Follow-up CRM Note"
                            >
                              <PhoneCall className="h-3.5 w-3.5" />
                            </button>

                            <Link
                              href={`/admin/fees/collect?studentId=${d.studentId}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all shadow-xs"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>Collect</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Centralized Share Fee Modal */}
        {shareModalTarget && (
          <ShareFeeModal
            isOpen={Boolean(shareModalTarget)}
            onClose={() => setShareModalTarget(null)}
            schoolId={schoolId}
            initialMode="PAYMENT_REMINDER"
            student={{
              id: shareModalTarget.studentId,
              name: shareModalTarget.studentName,
              admissionNumber: shareModalTarget.admissionNumber,
              className: shareModalTarget.className,
              sectionName: shareModalTarget.sectionName,
              phone: shareModalTarget.phone,
              parentPhone: shareModalTarget.parentPhone,
            }}
          />
        )}

        {/* Follow-up Note Modal */}
        {followUpTarget && (
          <FeeFollowUpModal
            isOpen={Boolean(followUpTarget)}
            onClose={() => setFollowUpTarget(null)}
            schoolId={schoolId}
            assignment={followUpTarget}
            onFollowUpRecorded={fetchData}
          />
        )}
      </div>
    </EntitlementGate>
  );
}
