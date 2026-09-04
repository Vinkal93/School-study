"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  DollarSign,
  ArrowLeft,
  Loader2,
  Clock,
  UserCheck,
  Filter,
  X,
  FileText,
  HelpCircle,
} from "lucide-react";
import {
  subscribeToSchoolRules,
  createSchoolRule,
  toggleSchoolRuleStatus,
  deleteSchoolRule,
  subscribeToRuleApplications,
  applyRuleAction,
} from "@/lib/services/teacher-hr.service";
import type {
  SchoolRule,
  RuleTarget,
  RuleCategory,
  RuleActionType,
  RuleApplication,
} from "@/types";
import { toast } from "sonner";

export default function SchoolRulesPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const adminActor = {
    uid: profile?.uid || "",
    name: profile?.name || "School Admin",
    role: profile?.role || "school_admin",
  };

  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<SchoolRule[]>([]);
  const [reviewQueue, setReviewQueue] = useState<RuleApplication[]>([]);
  const [targetFilter, setTargetFilter] = useState<RuleTarget | "all">("all");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [appliesTo, setAppliesTo] = useState<RuleTarget>("teachers");
  const [category, setCategory] = useState<RuleCategory>("attendance");
  const [actionType, setActionType] = useState<RuleActionType>("fine");
  const [amount, setAmount] = useState<number>(100);
  const [triggerCondition, setTriggerCondition] = useState("late_attendance_count > 2");
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [activeDate, setActiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Real-time Subscriptions
  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    const unsubRules = subscribeToSchoolRules(schoolId, (liveRules) => {
      setRules(liveRules);
      setLoading(false);
    });

    const unsubApps = subscribeToRuleApplications(schoolId, (apps) => {
      setReviewQueue(apps);
    });

    return () => {
      unsubRules();
      unsubApps();
    };
  }, [schoolId]);

  // Create Rule Handler
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please provide title and description.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createSchoolRule(
        schoolId,
        {
          schoolId,
          title: title.trim(),
          description: description.trim(),
          appliesTo,
          category,
          actionType,
          amount: Number(amount) || 0,
          triggerCondition: triggerCondition.trim(),
          requiresApproval,
          activeDate,
          status: "active",
          createdBy: adminActor.uid,
          createdByName: adminActor.name,
        },
        adminActor
      );

      toast.success("School rule policy published!");
      setShowCreateModal(false);
      setTitle("");
      setDescription("");
    } catch {
      toast.error("Failed to create rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Rule Status
  const handleToggleStatus = async (rule: SchoolRule) => {
    const nextStatus = rule.status === "active" ? "inactive" : "active";
    try {
      await toggleSchoolRuleStatus(schoolId, rule.id, nextStatus, adminActor);
      toast.success(`Rule marked as ${nextStatus}`);
    } catch {
      toast.error("Failed to update rule status");
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to permanently delete this rule?")) return;
    try {
      await deleteSchoolRule(schoolId, ruleId);
      toast.success("Rule policy removed");
    } catch {
      toast.error("Failed to remove rule");
    }
  };

  // Review Application
  const handleReviewAction = async (app: RuleApplication, decision: "approved" | "rejected") => {
    try {
      await applyRuleAction(schoolId, app, decision, adminActor);
      toast.success(
        decision === "approved"
          ? `Action approved and recorded for ${app.targetUserName}`
          : "Rule application dismissed"
      );
    } catch {
      toast.error("Failed to process rule action");
    }
  };

  const filteredRules =
    targetFilter === "all" ? rules : rules.filter((r) => r.appliesTo === targetFilter);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-16 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-indigo-600" />
              School Rules, Policies & Compliance Engine
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure behavioral rules, punctuality penalties, performance rewards, and reviewed financial adjustments.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create School Rule
          </button>
        </div>
      </div>

      {/* Target Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {(
          [
            { id: "all", label: "All Policies" },
            { id: "teachers", label: "Faculty & Teachers" },
            { id: "students", label: "Students" },
            { id: "staff", label: "Administrative Staff" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTargetFilter(t.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              targetFilter === t.id
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active Rules Grid */}
      {filteredRules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-400 bg-white dark:bg-slate-900">
          <ShieldCheck className="h-10 w-10 mx-auto mb-2 text-slate-300" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No rules configured
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Click &ldquo;Create School Rule&rdquo; to establish institutional policies and merit rewards.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRules.map((rule) => {
            const isFine = rule.actionType === "fine";
            return (
              <div
                key={rule.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                      {rule.category} • {rule.appliesTo}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(rule)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rule.status === "active"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {rule.status}
                    </button>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-2 leading-snug">
                    {rule.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {rule.description}
                  </p>

                  <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Action:</span>
                      <span className="font-extrabold capitalize text-slate-800 dark:text-slate-200">
                        {rule.actionType}{" "}
                        {rule.amount ? `(₹${rule.amount})` : ""}
                      </span>
                    </div>
                    {rule.triggerCondition && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Trigger:</span>
                        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {rule.triggerCondition}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Approval Required:</span>
                      <span className="font-semibold text-emerald-600">
                        {rule.requiresApproval ? "Yes (Safe)" : "Automated"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">
                    Effective: {rule.activeDate}
                  </span>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Delete rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review & Manual Approval Queue Section */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 p-6 space-y-4">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-base font-extrabold">
            Rule Application & Approval Queue ({reviewQueue.filter((q) => q.status === "pending_review").length})
          </h3>
        </div>
        <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
          In adherence to strict financial safety, rule triggers do not automatically deduct money without explicit administrative authorization. Review candidates below.
        </p>

        {reviewQueue.filter((q) => q.status === "pending_review").length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 font-medium">
            ✓ No pending rule violations or merit rewards waiting for review.
          </div>
        ) : (
          <div className="space-y-3">
            {reviewQueue
              .filter((q) => q.status === "pending_review")
              .map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                      {app.ruleTitle}
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                      {app.targetUserName} ({app.targetRole})
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{app.reason}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Proposed Action: <strong className="capitalize">{app.proposedAction}</strong>{" "}
                      {app.amount ? `(₹${app.amount})` : ""} • Detected: {app.detectedDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewAction(app, "rejected")}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleReviewAction(app, "approved")}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs"
                    >
                      Approve & Issue
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                Configure Institutional Rule
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Rule Policy Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Late Arrival Penalty / 100% Attendance Reward"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Applies To *</label>
                  <select
                    value={appliesTo}
                    onChange={(e: any) => setAppliesTo(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="teachers">Faculty / Teachers</option>
                    <option value="students">Students</option>
                    <option value="staff">Staff Members</option>
                    <option value="all">Everyone</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="attendance">Attendance & Punctuality</option>
                    <option value="performance">Academic Performance</option>
                    <option value="discipline">Discipline & Conduct</option>
                    <option value="homework">Homework & Submission</option>
                    <option value="general">Institutional General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Action Type *</label>
                  <select
                    value={actionType}
                    onChange={(e: any) => setActionType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="fine">Fine (Monetary Deduction)</option>
                    <option value="reward">Reward (Monetary Appreciation)</option>
                    <option value="warning">Official Warning</option>
                    <option value="recognition">Honorary Recognition</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    min={0}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Trigger Condition / Criteria</label>
                <input
                  type="text"
                  placeholder="e.g. late_arrival_days > 2 or pass_percentage == 100"
                  value={triggerCondition}
                  onChange={(e) => setTriggerCondition(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Policy Description & Guidelines *</label>
                <textarea
                  rows={2}
                  placeholder="Detailed rationale, notification rules, and appeals process..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="requires-approval"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded"
                />
                <label htmlFor="requires-approval" className="font-semibold text-slate-700 dark:text-slate-300">
                  Require Manual Administrator Review & Approval before financial deduction
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {isSubmitting ? "Publishing..." : "Publish Rule Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
