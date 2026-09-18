"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  Plus,
  Edit2,
  Trash2,
  Power,
  Layers,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Calendar,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Clock,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import type { FeeHead, FeeStructureDefinition } from "@/types/fee-foundation";
import type { FeeFrequency, AcademicYear } from "@/types";
import { getAcademicYears, getClassesWithSections } from "@/lib/services/academic.service";
import { toast } from "sonner";

export default function AdminFeeStructuresPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  // Data States
  const [structures, setStructures] = useState<FeeStructureDefinition[]>([]);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classList, setClassList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State for Create / Edit
  const [editingStructureId, setEditingStructureId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formAcademicYearId, setFormAcademicYearId] = useState("ay_current");
  const [formAcademicYearName, setFormAcademicYearName] = useState("2026-2027");
  const [formClass, setFormClass] = useState("Class 10");
  const [formSection, setFormSection] = useState("all");
  const [formFeeHeadId, setFormFeeHeadId] = useState("");
  const [formFrequency, setFormFrequency] = useState<FeeFrequency>("monthly");
  const [formAmountRupees, setFormAmountRupees] = useState("1500");
  const [formDueDay, setFormDueDay] = useState("10");
  const [formGraceDays, setFormGraceDays] = useState("5");
  const [formLateFeeEnabled, setFormLateFeeEnabled] = useState(false);
  const [formLateFeeType, setFormLateFeeType] = useState<"FIXED" | "PERCENTAGE" | "DAILY">("FIXED");
  const [formLateFeeAmountRupees, setFormLateFeeAmountRupees] = useState("50");

  // Duplicate Modal State
  const [sourceYearId, setSourceYearId] = useState("");
  const [targetYearId, setTargetYearId] = useState("");
  const [targetYearName, setTargetYearName] = useState("");

  // Bulk Generation Dialog State
  const [genClass, setGenClass] = useState("all");
  const [genPeriod, setGenPeriod] = useState("all");
  const [genIncludeArrears, setGenIncludeArrears] = useState(false);
  const [genPreview, setGenPreview] = useState<any | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  // 1. Load Initial Auxiliary Data
  useEffect(() => {
    async function loadAuxData() {
      if (!schoolId) return;
      try {
        // Load Academic Years
        const years = await getAcademicYears(schoolId);
        setAcademicYears(years);
        if (years.length > 0) {
          const current = years.find((y) => y.isCurrent) || years[0];
          setFormAcademicYearId(current.id);
          setFormAcademicYearName(current.name);
          setSourceYearId(current.id);
          setSelectedAcademicYear(current.id);
        }

        // Load Classes
        const classes = await getClassesWithSections(schoolId);
        const uniqueNames = Array.from(new Set(classes.map((c) => c.name))).sort();
        setClassList(uniqueNames);

        // Load Fee Heads
        const headsRes = await fetch(`/api/fees/foundation/heads?schoolId=${schoolId}`);
        const headsData = await headsRes.json();
        if (headsData.success && headsData.heads?.length > 0) {
          setFeeHeads(headsData.heads);
          setFormFeeHeadId(headsData.heads[0].id);
        }
      } catch (err) {
        console.warn("Error loading auxiliary fee structure data:", err);
      }
    }
    loadAuxData();
  }, [schoolId]);

  // 2. Fetch Real Structures
  const fetchStructures = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/fees/foundation/structures?schoolId=${schoolId}`);
      const data = await res.json();
      if (data.success) {
        setStructures(data.structures || []);
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

  // Filtered Structures
  const filteredStructures = useMemo(() => {
    return structures.filter((s) => {
      if (selectedAcademicYear !== "all" && s.academicYearId !== selectedAcademicYear) return false;
      if (selectedClass !== "all" && s.className !== selectedClass && s.className !== "all") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (s.title || "").toLowerCase().includes(q);
        const matchHead = (s.feeHeadName || "").toLowerCase().includes(q);
        const matchClass = (s.className || "").toLowerCase().includes(q);
        if (!matchTitle && !matchHead && !matchClass) return false;
      }
      return true;
    });
  }, [structures, selectedAcademicYear, selectedClass, searchQuery]);

  // Handle Create or Edit
  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmountRupees) {
      toast.error("Title and amount are required.");
      return;
    }

    const amt = parseFloat(formAmountRupees);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Fee amount must be greater than zero.");
      return;
    }

    const selectedHead = feeHeads.find((h) => h.id === formFeeHeadId);
    setSubmitting(true);

    try {
      if (editingStructureId) {
        // PUT update
        const res = await fetch("/api/fees/foundation/structures", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingStructureId,
            schoolId,
            title: formTitle.trim(),
            amountRupees: amt,
            dueDayOfMonth: parseInt(formDueDay, 10) || 10,
            gracePeriodDays: parseInt(formGraceDays, 10) || 5,
            lateFeeRule: {
              enabled: formLateFeeEnabled,
              gracePeriodDays: parseInt(formGraceDays, 10) || 5,
              type: formLateFeeType,
              amountPaise: Math.round(parseFloat(formLateFeeAmountRupees || "50") * 100),
            },
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to update fee structure");
        toast.success("Fee structure updated with new version!");
      } else {
        // POST create
        const res = await fetch("/api/fees/foundation/structures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId,
            academicYearId: formAcademicYearId,
            academicYearName: formAcademicYearName,
            feeHeadId: formFeeHeadId || "fh_tuition",
            feeHeadName: selectedHead?.name || "Tuition Fee",
            className: formClass,
            sectionName: formSection,
            title: formTitle.trim(),
            amountRupees: amt,
            frequency: formFrequency,
            dueDayOfMonth: parseInt(formDueDay, 10) || 10,
            gracePeriodDays: parseInt(formGraceDays, 10) || 5,
            lateFeeRule: {
              enabled: formLateFeeEnabled,
              gracePeriodDays: parseInt(formGraceDays, 10) || 5,
              type: formLateFeeType,
              amountPaise: Math.round(parseFloat(formLateFeeAmountRupees || "50") * 100),
            },
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to create fee structure");
        toast.success("Fee structure created successfully!");
      }

      setShowCreateModal(false);
      setEditingStructureId(null);
      setFormTitle("");
      fetchStructures();
    } catch (err: any) {
      toast.error(err.message || "Failed to save fee structure.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (s: FeeStructureDefinition) => {
    const nextStatus = s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch("/api/fees/foundation/structures", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: s.id,
          schoolId,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update status");
      toast.success(`Fee structure marked as ${nextStatus}.`);
      fetchStructures();
    } catch (err: any) {
      toast.error(err.message || "Status update failed.");
    }
  };

  // Delete / Deactivate Structure
  const handleDelete = async (s: FeeStructureDefinition) => {
    if (!confirm(`Are you sure you want to delete or deactivate "${s.title}"?`)) return;
    try {
      const res = await fetch(`/api/fees/foundation/structures?schoolId=${schoolId}&id=${s.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete structure");
      toast.success(data.message || "Fee structure deleted.");
      fetchStructures();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete fee structure.");
    }
  };

  // Duplicate for Next Year
  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceYearId || !targetYearId) {
      toast.error("Please specify both source and target academic sessions.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/fees/foundation/structures/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          sourceAcademicYearId: sourceYearId,
          targetAcademicYearId: targetYearId,
          targetAcademicYearName: targetYearName || targetYearId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Duplication failed");
      toast.success(`Successfully duplicated ${data.count} fee structures to session ${targetYearName || targetYearId}!`);
      setShowDuplicateModal(false);
      fetchStructures();
    } catch (err: any) {
      toast.error(err.message || "Duplication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk Generation Preview
  const handleRunPreview = async () => {
    setGenLoading(true);
    try {
      const currentYearObj = academicYears.find((y) => y.id === selectedAcademicYear) || academicYears[0];
      const res = await fetch("/api/fees/foundation/demands/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          action: "preview",
          academicYearId: selectedAcademicYear !== "all" ? selectedAcademicYear : currentYearObj?.id || "ay_current",
          academicYearName: currentYearObj?.name || "2026-2027",
          className: genClass,
          periodName: genPeriod,
          includeArrears: genIncludeArrears,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Preview failed");
      setGenPreview(data);
    } catch (err: any) {
      toast.error(err.message || "Demand preview failed.");
    } finally {
      setGenLoading(false);
    }
  };

  // Execute Bulk Generation
  const handleExecuteGeneration = async () => {
    setGenLoading(true);
    try {
      const currentYearObj = academicYears.find((y) => y.id === selectedAcademicYear) || academicYears[0];
      const res = await fetch("/api/fees/foundation/demands/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          action: "generate",
          academicYearId: selectedAcademicYear !== "all" ? selectedAcademicYear : currentYearObj?.id || "ay_current",
          academicYearName: currentYearObj?.name || "2026-2027",
          className: genClass,
          periodName: genPeriod,
          includeArrears: genIncludeArrears,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Demand generation failed");
      toast.success(`Generated ${data.newlyGenerated} fee demand invoices successfully!`);
      setShowGenerateModal(false);
      setGenPreview(null);
    } catch (err: any) {
      toast.error(err.message || "Demand generation failed.");
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <EntitlementGate feature="fee_structures" title="Fee Structure Management" requiredPlan="Professional Plan">
      <div className="space-y-6 pb-16">
        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Fee Structure Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure class-wise fee heads, frequencies, due dates, and late fee policies with demand immutability.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setShowGenerateModal(true);
                setGenPreview(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-xs shadow-xs hover:bg-blue-100 transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate Dues</span>
            </button>

            <button
              onClick={() => setShowDuplicateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              <Copy className="h-4 w-4" />
              <span>Duplicate for Next Year</span>
            </button>

            <button
              onClick={() => {
                setEditingStructureId(null);
                setFormTitle("");
                setFormAmountRupees("1500");
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Fee Structure</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Academic Year Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-[11px] font-bold text-slate-500">Session:</span>
              <select
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-800 dark:text-white cursor-pointer focus:outline-none"
              >
                <option value="all">All Sessions</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.isCurrent ? "(Active)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <Layers className="w-4 h-4 text-purple-600" />
              <span className="text-[11px] font-bold text-slate-500">Class:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-800 dark:text-white cursor-pointer focus:outline-none"
              >
                <option value="all">All Classes</option>
                {classList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search title or head..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Fee Structures Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              <p className="text-xs font-bold text-slate-500">Loading fee structures...</p>
            </div>
          ) : filteredStructures.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Layers className="h-10 w-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No fee structures match your filter.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                + Create new fee structure
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase border-b border-slate-100 dark:border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Fee Structure</th>
                    <th className="py-3.5 px-3">Class</th>
                    <th className="py-3.5 px-3">Fee Head</th>
                    <th className="py-3.5 px-3">Frequency</th>
                    <th className="py-3.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-3.5 px-3">Due Day</th>
                    <th className="py-3.5 px-3">Late Fee</th>
                    <th className="py-3.5 px-3 text-center">Version</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredStructures.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 dark:text-white">{s.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{s.academicYearName || s.academicYearId}</p>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        {s.className} {s.sectionName && s.sectionName !== "all" ? `(${s.sectionName})` : ""}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-[10px]">
                          {s.feeHeadName || "Tuition"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 capitalize text-slate-600 dark:text-slate-400">
                        {s.frequency}
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-slate-900 dark:text-white text-sm">
                        ₹{(s.amountPaise / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 font-mono">
                        {s.dueDayOfMonth || 10}th
                      </td>
                      <td className="py-3.5 px-3 text-[11px]">
                        {s.lateFeeRule?.enabled ? (
                          <span className="text-amber-600 font-bold">
                            ₹{(s.lateFeeRule.amountPaise / 100)} ({s.lateFeeRule.type.toLowerCase()})
                          </span>
                        ) : (
                          <span className="text-slate-400">Disabled</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[10px]">
                          v{s.version || 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(s)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                            s.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{s.status}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingStructureId(s.id);
                              setFormTitle(s.title);
                              setFormAmountRupees(String(s.amountPaise / 100));
                              setFormDueDay(String(s.dueDayOfMonth || 10));
                              setFormGraceDays(String(s.gracePeriodDays || 5));
                              setFormLateFeeEnabled(Boolean(s.lateFeeRule?.enabled));
                              setFormLateFeeType(s.lateFeeRule?.type || "FIXED");
                              setFormLateFeeAmountRupees(String((s.lateFeeRule?.amountPaise || 5000) / 100));
                              setShowCreateModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-all"
                            title="Edit Structure"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-all"
                            title="Delete / Deactivate"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ========================================================
            MODAL 1: CREATE / EDIT FEE STRUCTURE
        ======================================================== */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {editingStructureId ? "Edit Fee Structure (Version Bump)" : "Create Fee Structure"}
                </h3>
                <span className="text-[10px] font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 px-2 py-0.5 rounded-md font-bold">
                  {editingStructureId ? "Preserves Historical Demands" : "New Definition"}
                </span>
              </div>

              <form onSubmit={handleSaveStructure} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fee Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monthly Tuition Fee Class 10"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                  />
                </div>

                {!editingStructureId && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Academic Session</label>
                        <select
                          value={formAcademicYearId}
                          onChange={(e) => {
                            setFormAcademicYearId(e.target.value);
                            const found = academicYears.find((y) => y.id === e.target.value);
                            if (found) setFormAcademicYearName(found.name);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        >
                          {academicYears.map((ay) => (
                            <option key={ay.id} value={ay.id}>
                              {ay.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fee Head</label>
                        <select
                          value={formFeeHeadId}
                          onChange={(e) => setFormFeeHeadId(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        >
                          {feeHeads.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Class</label>
                        <select
                          value={formClass}
                          onChange={(e) => setFormClass(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        >
                          <option value="all">All Classes</option>
                          {classList.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
                        <select
                          value={formFrequency}
                          onChange={(e) => setFormFrequency(e.target.value as FeeFrequency)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium capitalize"
                        >
                          <option value="monthly">Monthly (12 periods)</option>
                          <option value="quarterly">Quarterly (4 periods)</option>
                          <option value="half_yearly">Half Yearly (2 periods)</option>
                          <option value="annual">Annual (1 period)</option>
                          <option value="one_time">One Time</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      placeholder="1500"
                      value={formAmountRupees}
                      onChange={(e) => setFormAmountRupees(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Due Day</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formDueDay}
                      onChange={(e) => setFormDueDay(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Grace Days</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={formGraceDays}
                      onChange={(e) => setFormGraceDays(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>

                {/* Late Fee Rule Panel */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formLateFeeEnabled}
                      onChange={(e) => setFormLateFeeEnabled(e.target.checked)}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">Enable Automatic Late Fee Rule</span>
                  </label>

                  {formLateFeeEnabled && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block font-bold text-slate-500 mb-1">Late Fee Type</label>
                        <select
                          value={formLateFeeType}
                          onChange={(e) => setFormLateFeeType(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                        >
                          <option value="FIXED">Fixed Amount (₹)</option>
                          <option value="DAILY">Daily Rate (₹/day)</option>
                          <option value="PERCENTAGE">Percentage (%)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-500 mb-1">Penalty Value</label>
                        <input
                          type="number"
                          min="1"
                          value={formLateFeeAmountRupees}
                          onChange={(e) => setFormLateFeeAmountRupees(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer shadow-md"
                  >
                    {submitting ? "Saving..." : editingStructureId ? "Update Structure" : "Save Structure"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 2: DUPLICATE FOR NEXT ACADEMIC YEAR
        ======================================================== */}
        {showDuplicateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Copy className="w-4 h-4 text-blue-600" />
                <span>Duplicate Structures for New Session</span>
              </h3>
              <p className="text-xs text-slate-500">
                Copies all active fee structures from a source session to a new session with version reset to 1.
              </p>

              <form onSubmit={handleDuplicate} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Source Session</label>
                  <select
                    value={sourceYearId}
                    onChange={(e) => setSourceYearId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Academic Session ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ay_2027_28"
                    value={targetYearId}
                    onChange={(e) => setTargetYearId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Session Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2027-2028"
                    value={targetYearName}
                    onChange={(e) => setTargetYearName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowDuplicateModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer shadow-md"
                  >
                    {submitting ? "Duplicating..." : "Duplicate Structures"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 3: BULK GENERATE FEE DEMANDS
        ======================================================== */}
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Bulk Generate Fee Dues</span>
              </h3>
              <p className="text-xs text-slate-500">
                Authoritatively generates invoice demands for active students based on active class structures.
                Deterministic keys guarantee 0 duplicate invoices on re-run.
              </p>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Class</label>
                    <select
                      value={genClass}
                      onChange={(e) => {
                        setGenClass(e.target.value);
                        setGenPreview(null);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="all">All Classes</option>
                      {classList.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Billing Period</label>
                    <select
                      value={genPeriod}
                      onChange={(e) => {
                        setGenPeriod(e.target.value);
                        setGenPreview(null);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="all">Full Academic Session (All Months)</option>
                      <option value="April">April</option>
                      <option value="May">May</option>
                      <option value="June">June</option>
                      <option value="July">July</option>
                      <option value="August">August</option>
                      <option value="September">September</option>
                      <option value="October">October</option>
                      <option value="November">November</option>
                      <option value="December">December</option>
                      <option value="January">January</option>
                      <option value="February">February</option>
                      <option value="March">March</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={genIncludeArrears}
                    onChange={(e) => {
                      setGenIncludeArrears(e.target.checked);
                      setGenPreview(null);
                    }}
                    className="rounded text-blue-600 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Include Past Arrears for Mid-Year Admissions</span>
                    <span className="text-[10px] text-slate-400">If unchecked, students joining mid-year will only be billed from their admission month.</span>
                  </div>
                </label>

                {/* Preview Box */}
                {genPreview && (
                  <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-2">
                    <h4 className="font-black text-blue-900 dark:text-blue-300 text-xs flex items-center justify-between">
                      <span>Generation Preview</span>
                      <span className="font-mono">₹{(genPreview.totalGrossPaise / 100).toLocaleString("en-IN")}</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Eligible Students</span>
                        <strong className="text-slate-800 dark:text-slate-200">{genPreview.eligibleStudents}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">New Demands</span>
                        <strong className="text-emerald-600">{genPreview.newlyGenerated}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Already Issued</span>
                        <strong className="text-slate-600">{genPreview.alreadyGenerated}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Skipped (Mid-Year)</span>
                        <strong className="text-slate-400">{genPreview.skipped}</strong>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                  >
                    Close
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={genLoading}
                      onClick={handleRunPreview}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 cursor-pointer flex items-center gap-1.5"
                    >
                      {genLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>Preview</span>
                    </button>

                    <button
                      type="button"
                      disabled={genLoading || !genPreview || genPreview.newlyGenerated === 0}
                      onClick={handleExecuteGeneration}
                      className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {genLoading ? "Generating..." : `Generate (${genPreview?.newlyGenerated || 0}) Invoices`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </EntitlementGate>
  );
}
