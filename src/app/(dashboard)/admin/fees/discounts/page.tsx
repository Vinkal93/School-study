"use client";
import { useFeeSession } from "@/components/fees/FeeSessionProvider";

import { feeFetch } from "@/lib/fees/client-request";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Tag,
  User,
  Calendar,
  FileText,
  Clock,
  ArrowRight,
  Percent,
} from "lucide-react";
import { getStudents } from "@/lib/services/student.service";
import { getStudentFeeAssignment } from "@/lib/services/fee.service";
import type { StudentProfile } from "@/types";
import type { FeeDemand, FeeAdjustment, AdjustmentType } from "@/types/fee-foundation";
import { formatINR, paiseToRupees } from "@/lib/services/fee-foundation.service";
import { toast } from "sonner";

export default function AdminFeeDiscountsPage() {
  const { academicYearId } = useFeeSession();
  const { profile } = useAuth();
  const effectiveSchoolId =
    profile?.schoolId ||
    (typeof window !== "undefined"
      ? localStorage.getItem("currentSchoolId") || ""
      : "");
  const schoolId = effectiveSchoolId;

  // Student search & selection
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);

  // Student demands
  const [demands, setDemands] = useState<FeeDemand[]>([]);
  const [loadingDemands, setLoadingDemands] = useState(false);
  const [selectedDemandId, setSelectedDemandId] = useState<string>("");

  // Form State
  const [discountType, setDiscountType] = useState<AdjustmentType>("SCHOLARSHIP");
  const [amountRupees, setAmountRupees] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const requestKey = useRef<{ fingerprint: string; key: string } | null>(null);

  // History State
  const [adjustments, setAdjustments] = useState<FeeAdjustment[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(true);

  // 1. Fetch Students
  useEffect(() => {
    if (!schoolId) return;
    setLoadingStudents(true);
    getStudents(schoolId, { status: "active" })
      .then((data) => setStudents(data || []))
      .catch((err) => {
        console.error("Failed to load students:", err);
        toast.error("Failed to load students list.");
      })
      .finally(() => setLoadingStudents(false));
  }, [schoolId, academicYearId]);

  // 2. Fetch Adjustments History
  const fetchAdjustments = async () => {
    if (!schoolId) return;
    setLoadingAdjustments(true);
    try {
      const res = await feeFetch(
        `/api/fees/foundation/adjustments?schoolId=${encodeURIComponent(schoolId)}&academicYearId=${encodeURIComponent(academicYearId)}`
      );
      const data = await res.json();
      if (data.success) {
        setAdjustments(data.adjustments || []);
      }
    } catch (err) {
      console.warn("Failed to load fee adjustments:", err);
    } finally {
      setLoadingAdjustments(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, [schoolId, academicYearId]);

  // Discounts always target a real invoice, never a synthetic legacy row.
  useEffect(() => {
    let cancelled = false;
    setDemands([]); setSelectedDemandId("");
    if (!schoolId || !selectedStudent) return;
    setLoadingDemands(true);
    feeFetch(`/api/fees/foundation/demands?schoolId=${encodeURIComponent(schoolId)}&studentId=${encodeURIComponent(selectedStudent.id)}&academicYearId=${encodeURIComponent(academicYearId)}`)
      .then(async response => { const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || "Invoices unavailable."); return data.demands as FeeDemand[]; })
      .then(list => { if (cancelled) return; const unpaid = list.filter(d => d.status !== "CANCELLED" && d.balanceAmountPaise > 0); setDemands(unpaid); setSelectedDemandId(unpaid[0]?.id || ""); })
      .catch(error => { if (!cancelled) toast.error(error.message); })
      .finally(() => { if (!cancelled) setLoadingDemands(false); });
    return () => { cancelled = true; };
  }, [schoolId, selectedStudent, academicYearId]);

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students.slice(0, 10);
    const q = studentSearch.toLowerCase().trim();
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q)) ||
          (s.className && s.className.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [students, studentSearch]);

  const selectedDemand = useMemo(() => {
    return demands.find((d) => d.id === selectedDemandId) || null;
  }, [demands, selectedDemandId]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending.current) return;
    if (!selectedStudent) {
      toast.error("Please search and select a student first.");
      return;
    }
    if (!selectedDemandId) {
      toast.error("Please select a fee invoice/demand to apply the discount to.");
      return;
    }
    const amt = parseFloat(amountRupees);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid discount amount greater than ₹0.");
      return;
    }
    if (
      selectedDemand &&
      amt > paiseToRupees(selectedDemand.balanceAmountPaise)
    ) {
      toast.error(
        `Discount amount (₹${amt}) cannot exceed remaining demand balance (${formatINR(selectedDemand.balanceAmountPaise)}).`
      );
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason or justification.");
      return;
    }

    const fingerprint = JSON.stringify([selectedDemandId, discountType, amt, reason.trim()]);
    if (requestKey.current?.fingerprint !== fingerprint) requestKey.current = { fingerprint, key: crypto.randomUUID() };
    pending.current = true;
    setSubmitting(true);
    try {
      const res = await feeFetch("/api/fees/foundation/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          academicYearId: selectedDemand?.academicYearId || "all",
          demandId: selectedDemandId,
          type: discountType,
          amountRupees: amt,
          idempotencyKey: requestKey.current.key,
          reason: reason.trim(),
          approvedBy: profile?.name || "Administrator",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to apply discount.");
      }

      toast.success(
        `Discount of ₹${amt} successfully applied for ${selectedStudent.name}!`
      );
      setAmountRupees("");
      setReason("");
      requestKey.current = null;
      fetchAdjustments();

      // Refresh student's unpaid demands
      if (selectedStudent) {
        feeFetch(
          `/api/fees/foundation/demands?schoolId=${encodeURIComponent(schoolId)}&studentId=${encodeURIComponent(selectedStudent.id)}&academicYearId=${encodeURIComponent(academicYearId)}`
        )
          .then((r) => r.json())
          .then((d) => {
            if (d.success && Array.isArray(d.demands)) {
              setDemands(
                d.demands.filter((dm: FeeDemand) => dm.balanceAmountPaise > 0)
              );
            }
          });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to apply discount.");
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <EntitlementGate
      feature="fee_discounts"
      title="Discounts & Concessions"
      requiredPlan="Professional Plan"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Fee Discounts & Scholarships
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure student scholarships, staff child concessions, and fee waivers connected to authoritative ledgers.
          </p>
        </div>

        {/* Form Container */}
        <form
          onSubmit={handleApply}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm text-xs"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student Search & Selection */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Student
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student by name, admission no..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Student Dropdown / Selection List */}
              <div className="mt-2 max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                {loadingStudents ? (
                  <div className="p-3 text-center text-slate-400">Loading students...</div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-3 text-center text-slate-400">No matching active students.</div>
                ) : (
                  filteredStudents.map((s) => {
                    const isSelected = selectedStudent?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudent(s);
                          setStudentSearch(s.name);
                        }}
                        className={`w-full flex items-center justify-between p-2 text-left transition-colors ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 font-bold"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div>
                          <p className="leading-tight">{s.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {s.className} {s.sectionName ? `(${s.sectionName})` : ""} • Adm: {s.admissionNumber || s.id}
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Target Fee Invoice / Demand */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Fee Invoice (Demand)
              </label>
              {loadingDemands ? (
                <div className="py-8 text-center text-slate-400">Loading student fee demands...</div>
              ) : !selectedStudent ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400">
                  Select a student to view pending demands.
                </div>
              ) : demands.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-center text-emerald-600">
                  <CheckCircle2 className="mx-auto mb-1 h-5 w-5" />
                  All fee dues are already clear for this student.
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedDemandId}
                    onChange={(e) => setSelectedDemandId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    {demands.map((d) => (
                      <option key={d.id} value={d.id}>
                        {`${d.academicYearId} · ${d.period}` || "Fee Demand"} ({d.feeHeadName || "Tuition"}) — Due: {formatINR(d.balanceAmountPaise)}
                      </option>
                    ))}
                  </select>

                  {selectedDemand && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-2.5 dark:border-blue-900/40 dark:bg-blue-950/30 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gross Amount:</span>
                        <span className="font-bold">{formatINR(selectedDemand.grossAmountPaise)}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-slate-500">Remaining Due:</span>
                        <span className="font-black text-rose-600">{formatINR(selectedDemand.balanceAmountPaise)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Discount / Concession Type
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as AdjustmentType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="SCHOLARSHIP">Merit Scholarship</option>
                <option value="CONCESSION">Staff Child Concession</option>
                <option value="DISCOUNT">Sibling / Early Bird Discount</option>
                <option value="WAIVER">Management Discretion Waiver</option>
                <option value="FINE_REDUCTION">Late Fee / Fine Reduction</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Discount Amount (₹)
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 500"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reason / Justification (Mandatory for Financial Audit)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Board topper scholarship or staff ward discount"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !selectedStudent || !selectedDemandId}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Apply & Post to Ledger</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* History Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Applied Discounts & Concessions History
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              {adjustments.length} records recorded
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            {loadingAdjustments ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : adjustments.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                <Percent className="mx-auto mb-2 h-7 w-7 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  No discounts or concessions recorded yet
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Applied scholarships and waivers will be listed here with double-entry audit trails.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {adjustments.map((adj) => (
                      <tr
                        key={adj.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                      >
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {adj.studentName}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {adj.studentId}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block rounded px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                            {adj.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {adj.period || "General"}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-emerald-600">
                          {formatINR(adj.amountPaise)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {adj.reason}
                        </td>
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(adj.date || adj.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              adj.status === "APPLIED"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                                : "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                            }`}
                          >
                            {adj.status}
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
      </div>
    </EntitlementGate>
  );
}
