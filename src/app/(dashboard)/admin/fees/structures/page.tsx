"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { Plus, Edit2, Trash2, Power, Layers, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { FeeStructure, FeeType, FeeFrequency } from "@/types";
import { toast } from "sonner";

export default function AdminFeeStructuresPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [className, setClassName] = useState("Class 10");
  const [feeType, setFeeType] = useState<FeeType>("tuition");
  const [frequency, setFrequency] = useState<FeeFrequency>("monthly");
  const [amountRupees, setAmountRupees] = useState("500");

  const fetchStructures = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/fees/structures?schoolId=${schoolId}`);
      const data = await res.json();
      if (data.success) {
        setStructures(data.structures);
      }
    } catch (err) {
      toast.error("Failed to load fee structures.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, [schoolId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amountRupees) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/fees/structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          academicYearId: "ay_current",
          className,
          feeType,
          title,
          amountRupees: parseFloat(amountRupees),
          frequency,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Fee structure created successfully!");
        setShowModal(false);
        setTitle("");
        fetchStructures();
      } else {
        toast.error(data.error || "Failed to create fee structure.");
      }
    } catch (err) {
      toast.error("Server error creating fee structure.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fee structure?")) return;
    try {
      const res = await fetch(`/api/fees/structures?schoolId=${schoolId}&id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Fee structure deleted.");
        fetchStructures();
      } else {
        toast.error(data.error || "Cannot delete fee structure.");
      }
    } catch (err) {
      toast.error("Failed to delete fee structure.");
    }
  };

  return (
    <EntitlementGate feature="fee_structure" title="Fee Structure Management" requiredPlan="Professional Plan">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fee Structure Management</h1>
            <p className="text-xs text-slate-500 mt-1">Configure class-wise fee heads, frequencies, and tuition rules.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create Fee Structure</span>
          </button>
        </div>

        {/* Fee Structures Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : structures.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Layers className="h-10 w-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No fee structures configured yet.</p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
              >
                + Add tuition fee structure
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Fee Title</th>
                    <th className="py-3.5 px-4">Class</th>
                    <th className="py-3.5 px-4">Fee Type</th>
                    <th className="py-3.5 px-4">Frequency</th>
                    <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {structures.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{s.title}</td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{s.className}</td>
                      <td className="py-3.5 px-4 capitalize font-semibold text-blue-600">{s.feeType}</td>
                      <td className="py-3.5 px-4 capitalize text-slate-600 dark:text-slate-400">{s.frequency}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 dark:text-white">
                        ₹{(s.amountPaise / 100).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold">
                          <CheckCircle2 className="h-3 w-3" />
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-all"
                          title="Delete Fee Structure"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Fee Structure</h3>
              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fee Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monthly Tuition Fee Class 10"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Class</label>
                    <select
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="Class 10">Class 10</option>
                      <option value="Class 9">Class 9</option>
                      <option value="Class 8">Class 8</option>
                      <option value="all">All Classes</option>
                    </select>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as FeeFrequency)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium capitalize"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                      <option value="one_time">One Time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="500"
                      value={amountRupees}
                      onChange={(e) => setAmountRupees(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-bold text-sm"
                    />
                  </div>
                </div>
                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700"
                  >
                    {submitting ? "Saving..." : "Save Structure"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </EntitlementGate>
  );
}
