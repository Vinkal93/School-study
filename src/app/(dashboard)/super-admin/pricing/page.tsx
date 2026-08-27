"use client";

import { useEffect, useState } from "react";
import {
  Sliders,
  Plus,
  CheckCircle2,
  XCircle,
  Edit,
  Copy,
  History,
  Eye,
  Loader2,
  Sparkles,
  ShieldAlert,
  Layers,
  IndianRupee,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Archive,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getAllPlansAdmin,
  getActivePlanVersion,
  getPlanVersions,
  getAllFeatureDefinitions,
  createPlan,
  updatePlan,
  duplicatePlan,
  togglePlanStatus,
  getGlobalAccessPolicy,
  updateGlobalAccessPolicy,
  CreatePlanInput,
  UpdatePlanInput,
} from "@/lib/billing";
import type { Plan, PlanVersion, FeatureDefinition, GlobalAccessPolicy, PlanStatus } from "@/types";
import { toast } from "sonner";

export default function SuperAdminPricingPage() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeVersions, setActiveVersions] = useState<Record<string, PlanVersion>>({});
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const [globalPolicy, setGlobalPolicy] = useState<GlobalAccessPolicy | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<"plans" | "features" | "policy">("plans");

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planVersionsHistory, setPlanVersionsHistory] = useState<PlanVersion[]>([]);
  const [saving, setSaving] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    description: "",
    monthlyPriceRupees: 999,
    annualPriceRupees: 799,
    isPopular: false,
    displayOrder: 1,
    status: "ACTIVE" as PlanStatus,
    features: ["student_management", "teacher_management", "attendance_automation", "notices_announcements"],
    maxStudents: 500,
    maxTeachers: 20,
    maxClasses: 15,
    maxStaffAccounts: 2,
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    monthlyPriceRupees: 0,
    annualPriceRupees: 0,
    isPopular: false,
    displayOrder: 1,
    status: "ACTIVE" as PlanStatus,
    features: [] as string[],
    maxStudents: 500,
    maxTeachers: 20,
    maxClasses: 15,
    maxStaffAccounts: 2,
  });

  // Duplicate Form State
  const [duplicateSlug, setDuplicateSlug] = useState("");
  const [duplicateName, setDuplicateName] = useState("");

  // Global Policy Form State
  const [reminderDaysStr, setReminderDaysStr] = useState("30, 15, 7, 3, 1");
  const [savingPolicy, setSavingPolicy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedPlans, fetchedFeatures, fetchedPolicy] = await Promise.all([
        getAllPlansAdmin(),
        getAllFeatureDefinitions(),
        getGlobalAccessPolicy(),
      ]);

      setPlans(fetchedPlans);
      setFeatures(fetchedFeatures);
      setGlobalPolicy(fetchedPolicy);
      if (fetchedPolicy) {
        setReminderDaysStr((fetchedPolicy.reminderDays || [30, 15, 7, 3, 1]).join(", "));
      }

      // Fetch active version for each plan
      const versionsMap: Record<string, PlanVersion> = {};
      for (const p of fetchedPlans) {
        const v = await getActivePlanVersion(p.id);
        if (v) versionsMap[p.id] = v;
      }
      setActiveVersions(versionsMap);
    } catch (err: any) {
      toast.error("Failed to load pricing data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Create Plan Submit
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const input: CreatePlanInput = {
        name: createForm.name,
        slug: createForm.slug,
        description: createForm.description,
        monthlyPricePaise: Math.round(createForm.monthlyPriceRupees * 100),
        annualPricePaise: Math.round(createForm.annualPriceRupees * 100),
        currency: "INR",
        isPopular: createForm.isPopular,
        displayOrder: Number(createForm.displayOrder),
        status: createForm.status,
        features: createForm.features,
        limits: {
          maxStudents: Number(createForm.maxStudents),
          maxTeachers: Number(createForm.maxTeachers),
          maxClasses: Number(createForm.maxClasses),
          maxStaffAccounts: Number(createForm.maxStaffAccounts),
        },
      };

      await createPlan(input, profile?.email || "super_admin");
      toast.success(`Plan "${createForm.name}" created successfully with Version 1!`);
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create plan.");
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (plan: Plan) => {
    setSelectedPlan(plan);
    const ver = activeVersions[plan.id];
    setEditForm({
      name: plan.name,
      description: plan.description,
      monthlyPriceRupees: ver ? ver.monthlyPrice / 100 : 0,
      annualPriceRupees: ver ? ver.annualPrice / 100 : 0,
      isPopular: plan.isPopular,
      displayOrder: plan.displayOrder,
      status: plan.status,
      features: [...plan.features],
      maxStudents: plan.limits?.maxStudents !== undefined ? plan.limits.maxStudents : 500,
      maxTeachers: plan.limits?.maxTeachers !== undefined ? plan.limits.maxTeachers : 20,
      maxClasses: plan.limits?.maxClasses !== undefined ? plan.limits.maxClasses : 15,
      maxStaffAccounts: plan.limits?.maxStaffAccounts !== undefined ? plan.limits.maxStaffAccounts : 2,
    });
    setShowEditModal(true);
  };

  // Trigger Edit Form Submit - Checks if Price/Version Impact Preview is required (Section 6)
  const handleEditFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    const ver = activeVersions[selectedPlan.id];
    const currentMonthlyRs = ver ? ver.monthlyPrice / 100 : 0;
    const isPriceOrVersionChange =
      editForm.monthlyPriceRupees !== currentMonthlyRs ||
      JSON.stringify(editForm.features.sort()) !== JSON.stringify(selectedPlan.features.sort()) ||
      editForm.maxStudents !== selectedPlan.limits?.maxStudents;

    if (isPriceOrVersionChange) {
      setShowPreviewModal(true);
    } else {
      executePlanUpdate();
    }
  };

  // Execute Actual Plan Update
  const executePlanUpdate = async () => {
    if (!selectedPlan) return;

    setSaving(true);
    try {
      const input: UpdatePlanInput = {
        name: editForm.name,
        description: editForm.description,
        displayOrder: Number(editForm.displayOrder),
        isPopular: editForm.isPopular,
        status: editForm.status,
        monthlyPricePaise: Math.round(editForm.monthlyPriceRupees * 100),
        annualPricePaise: Math.round(editForm.annualPriceRupees * 100),
        features: editForm.features,
        limits: {
          maxStudents: Number(editForm.maxStudents),
          maxTeachers: Number(editForm.maxTeachers),
          maxClasses: Number(editForm.maxClasses),
          maxStaffAccounts: Number(editForm.maxStaffAccounts),
        },
      };

      const res = await updatePlan(selectedPlan.id, input, profile?.email || "super_admin");
      if (res.newVersionCreated) {
        toast.success(`Plan "${selectedPlan.name}" updated! Created new PlanVersion.`);
      } else {
        toast.success(`Plan "${selectedPlan.name}" metadata updated!`);
      }

      setShowEditModal(false);
      setShowPreviewModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update plan.");
    } finally {
      setSaving(false);
    }
  };

  // Open Version History Modal
  const openHistoryModal = async (plan: Plan) => {
    setSelectedPlan(plan);
    try {
      const versions = await getPlanVersions(plan.id);
      setPlanVersionsHistory(versions);
      setShowHistoryModal(true);
    } catch (err) {
      toast.error("Failed to load version history.");
    }
  };

  // Open Duplicate Modal
  const openDuplicateModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setDuplicateSlug(`${plan.slug}-copy`);
    setDuplicateName(`${plan.name} (Copy)`);
    setShowDuplicateModal(true);
  };

  // Handle Duplicate Submit
  const handleDuplicatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setSaving(true);
    try {
      await duplicatePlan(selectedPlan.id, duplicateSlug, duplicateName, profile?.email || "super_admin");
      toast.success(`Plan duplicated as "${duplicateName}" with Version 1!`);
      setShowDuplicateModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate plan.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Plan Status
  const handleToggleStatus = async (plan: Plan) => {
    const nextStatusMap: Record<PlanStatus, PlanStatus> = {
      ACTIVE: "INACTIVE",
      INACTIVE: "ARCHIVED",
      ARCHIVED: "ACTIVE",
    };
    const newStatus = nextStatusMap[plan.status];

    try {
      await togglePlanStatus(plan.id, newStatus, profile?.email || "super_admin");
      toast.success(`Plan "${plan.name}" status updated to ${newStatus}`);
      loadData();
    } catch (err: any) {
      toast.error("Failed to toggle status.");
    }
  };

  // Save Global Access Policy
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalPolicy) return;

    setSavingPolicy(true);
    try {
      const parsedDays = reminderDaysStr
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);

      const updated = await updateGlobalAccessPolicy(
        {
          ...globalPolicy,
          reminderDays: parsedDays.length > 0 ? parsedDays : [30, 15, 7, 3, 1],
        },
        profile?.email || "super_admin"
      );

      setGlobalPolicy(updated);
      toast.success("Global Access Policy updated in accessPolicies/global!");
    } catch (err: any) {
      toast.error("Failed to save policy.");
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Sliders className="h-7 w-7 text-blue-400" />
            Pricing & Plan Management
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Database-driven SaaS subscription tiers, immutable plan versioning, features, and policy engines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-xl transition-all border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Plan</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "plans"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Plans Catalog ({plans.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("features")}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "features"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Feature Definitions ({features.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("policy")}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "policy"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Global Access Policy (accessPolicies/global)</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-sm font-semibold">Loading real Firestore billing records...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: PLANS CATALOG */}
          {activeTab === "plans" && (
            <div className="space-y-4">
              {plans.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl space-y-4 shadow-sm">
                  <div className="inline-flex p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-full">
                    <Sliders className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">No pricing plans configured yet.</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Create your first SaaS pricing tier to start provisioning plans and versioning entitlements.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create First Plan</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
                  <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="px-6 py-3.5">Plan Name / Slug</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5">Monthly Price</th>
                        <th className="px-4 py-3.5">Annual Price</th>
                        <th className="px-4 py-3.5">Active Version</th>
                        <th className="px-4 py-3.5">Features</th>
                        <th className="px-4 py-3.5">Max Capacity</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {plans.map((p) => {
                        const ver = activeVersions[p.id];
                        const monthlyRs = ver ? (ver.monthlyPrice / 100).toLocaleString("en-IN") : "0";
                        const annualRs = ver ? (ver.annualPrice / 100).toLocaleString("en-IN") : "0";

                        return (
                          <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <span>{p.name}</span>
                                    {p.isPopular && (
                                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-full">
                                        Popular
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                    slug: {p.slug}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <button
                                onClick={() => handleToggleStatus(p)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full transition-all ${
                                  p.status === "ACTIVE"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                    : p.status === "INACTIVE"
                                    ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                                }`}
                                title="Click to cycle status: ACTIVE → INACTIVE → ARCHIVED"
                              >
                                {p.status === "ACTIVE" ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>ACTIVE</span>
                                  </>
                                ) : p.status === "INACTIVE" ? (
                                  <>
                                    <XCircle className="h-3.5 w-3.5" />
                                    <span>INACTIVE</span>
                                  </>
                                ) : (
                                  <>
                                    <Archive className="h-3.5 w-3.5" />
                                    <span>ARCHIVED</span>
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                              ₹{monthlyRs}<span className="text-xs font-normal text-gray-500">/mo</span>
                            </td>
                            <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                              ₹{annualRs}<span className="text-xs font-normal text-gray-500">/mo</span>
                            </td>
                            <td className="px-4 py-4">
                              <button
                                onClick={() => openHistoryModal(p)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 hover:underline rounded-md"
                              >
                                <History className="h-3 w-3" />
                                <span>v{ver ? ver.version : 1}</span>
                              </button>
                            </td>
                            <td className="px-4 py-4 text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {p.features?.length || 0} Features
                              </span>
                            </td>
                            <td className="px-4 py-4 text-xs font-mono text-gray-600 dark:text-gray-400">
                              <div>{p.limits?.maxStudents === -1 ? "Unlimited" : `${p.limits?.maxStudents || 500} Students`}</div>
                              <div className="text-[11px] text-gray-400">{p.limits?.maxTeachers === -1 ? "Unlimited Teachers" : `${p.limits?.maxTeachers || 20} Teachers`}</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditModal(p)}
                                  className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                  title="Edit Plan & Version"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openDuplicateModal(p)}
                                  className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                  title="Duplicate Plan"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openHistoryModal(p)}
                                  className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                  title="View Version History"
                                >
                                  <History className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </div>
          )}

          {/* TAB 2: FEATURE DEFINITIONS */}
          {activeTab === "features" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                Feature Registry (`featureDefinitions`)
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Available entitlement flags checked server-side across plans.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((f) => (
                  <div
                    key={f.key}
                    className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-start gap-3"
                  >
                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{f.name}</p>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded">
                          {f.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>
                      <p className="text-[11px] font-mono text-gray-400 mt-1">Key: {f.key}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: GLOBAL ACCESS POLICY */}
          {activeTab === "policy" && globalPolicy && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-blue-600" />
                Global Access Policy Configuration (`accessPolicies/global`)
              </h2>
              <p className="text-xs text-gray-500 mb-6">
                Centralized entitlement threshold settings, grace period days, and expiration rules.
              </p>

              <form onSubmit={handleSavePolicy} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Reminder Days Cutoffs (Comma-separated)
                    </label>
                    <input
                      type="text"
                      required
                      value={reminderDaysStr}
                      onChange={(e) => setReminderDaysStr(e.target.value)}
                      placeholder="30, 15, 7, 3, 1"
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Grace Period Duration (Days)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      required
                      value={globalPolicy.gracePeriodDays}
                      onChange={(e) =>
                        setGlobalPolicy({
                          ...globalPolicy,
                          gracePeriodDays: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Expired Access Mode (After Grace Period)
                  </label>
                  <select
                    value={globalPolicy.expiredAccessMode}
                    onChange={(e) =>
                      setGlobalPolicy({
                        ...globalPolicy,
                        expiredAccessMode: e.target.value as "RESTRICTED_ACCESS" | "NO_ACCESS",
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="RESTRICTED_ACCESS">RESTRICTED_ACCESS (Read-only core features)</option>
                    <option value="NO_ACCESS">NO_ACCESS (Strict lock out)</option>
                  </select>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={globalPolicy.showExpiryPopup}
                      onChange={(e) => setGlobalPolicy({ ...globalPolicy, showExpiryPopup: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Show Expiry Banner Popups</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={globalPolicy.showRechargeButton}
                      onChange={(e) => setGlobalPolicy({ ...globalPolicy, showRechargeButton: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Show Plan Recharge Callout</span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingPolicy}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {savingPolicy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sliders className="h-4 w-4" />}
                    <span>Save Global Policy</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* CREATE PLAN MODAL (Section 3) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Create New Plan & Version 1
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g. Enterprise Plus"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Slug (Unique identifier) *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.slug}
                    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    placeholder="e.g. enterprise-plus"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Target audience and plan summary..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Monthly Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={createForm.monthlyPriceRupees}
                    onChange={(e) => setCreateForm({ ...createForm, monthlyPriceRupees: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Stored as integer paise ({createForm.monthlyPriceRupees * 100} paise)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Annual Price / Month (₹ INR) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={createForm.annualPriceRupees}
                    onChange={(e) => setCreateForm({ ...createForm, annualPriceRupees: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Stored as integer paise ({createForm.annualPriceRupees * 100} paise)</p>
                </div>
              </div>

              {/* Feature Checklist */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Included Features Checklist
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800">
                  {features.map((f) => {
                    const isChecked = createForm.features.includes(f.key);
                    return (
                      <label key={f.key} className="flex items-center gap-2 cursor-pointer text-xs text-gray-800 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateForm({ ...createForm, features: [...createForm.features, f.key] });
                            } else {
                              setCreateForm({ ...createForm, features: createForm.features.filter((k) => k !== f.key) });
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{f.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Limits Inputs */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Plan Capacity Limits (-1 represents Unlimited)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Max Students</label>
                    <input
                      type="number"
                      required
                      value={createForm.maxStudents}
                      onChange={(e) => setCreateForm({ ...createForm, maxStudents: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-mono text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Max Teachers</label>
                    <input
                      type="number"
                      required
                      value={createForm.maxTeachers}
                      onChange={(e) => setCreateForm({ ...createForm, maxTeachers: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-mono text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Max Classes</label>
                    <input
                      type="number"
                      required
                      value={createForm.maxClasses}
                      onChange={(e) => setCreateForm({ ...createForm, maxClasses: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-mono text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Staff Accounts</label>
                    <input
                      type="number"
                      required
                      value={createForm.maxStaffAccounts}
                      onChange={(e) => setCreateForm({ ...createForm, maxStaffAccounts: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-mono text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={createForm.isPopular}
                    onChange={(e) => setCreateForm({ ...createForm, isPopular: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Mark as "Most Popular" Badge</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Create Plan & Version 1</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PLAN MODAL (Section 4 & 5) */}
      {showEditModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Edit className="h-5 w-5 text-blue-600" />
                  Edit Plan: {selectedPlan.name}
                </h3>
                <p className="text-xs font-mono text-gray-500">ID: {selectedPlan.id}</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Immutable Plan Versioning Active</p>
                <p className="mt-0.5 text-[11px]">
                  Modifying pricing, features, or limits will trigger a Price Impact Preview & create a new **PlanVersion** (e.g. Version {activeVersions[selectedPlan.id] ? activeVersions[selectedPlan.id].version + 1 : 2}).
                </p>
              </div>
            </div>

            <form onSubmit={handleEditFormSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Plan Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as PlanStatus })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  required
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Monthly Price (₹ INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editForm.monthlyPriceRupees}
                    onChange={(e) => setEditForm({ ...editForm, monthlyPriceRupees: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Annual Price / Month (₹ INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editForm.annualPriceRupees}
                    onChange={(e) => setEditForm({ ...editForm, annualPriceRupees: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Feature Checklist */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Features Checklist
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800">
                  {features.map((f) => {
                    const isChecked = editForm.features.includes(f.key);
                    return (
                      <label key={f.key} className="flex items-center gap-2 cursor-pointer text-xs text-gray-800 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditForm({ ...editForm, features: [...editForm.features, f.key] });
                            } else {
                              setEditForm({ ...editForm, features: editForm.features.filter((k) => k !== f.key) });
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{f.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Limits Inputs */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Capacity Limits (-1 represents Unlimited)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Max Students</label>
                    <input
                      type="number"
                      required
                      value={editForm.maxStudents}
                      onChange={(e) => setEditForm({ ...editForm, maxStudents: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-mono text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Max Teachers</label>
                    <input
                      type="number"
                      required
                      value={editForm.maxTeachers}
                      onChange={(e) => setEditForm({ ...editForm, maxTeachers: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-mono text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Max Classes</label>
                    <input
                      type="number"
                      required
                      value={editForm.maxClasses}
                      onChange={(e) => setEditForm({ ...editForm, maxClasses: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-mono text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Staff Accounts</label>
                    <input
                      type="number"
                      required
                      value={editForm.maxStaffAccounts}
                      onChange={(e) => setEditForm({ ...editForm, maxStaffAccounts: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-mono text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  <Edit className="h-4 w-4" />
                  <span>Save Plan Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRICE CHANGE & VERSION IMPACT PREVIEW MODAL (Section 6) */}
      {showPreviewModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-emerald-600" />
                Price Change Impact Preview
              </h3>
              <button onClick={() => setShowPreviewModal(false)} className="p-1 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const ver = activeVersions[selectedPlan.id];
              const currentMonthly = ver ? ver.monthlyPrice / 100 : 0;
              const newMonthly = editForm.monthlyPriceRupees;
              const diff = newMonthly - currentMonthly;
              const nextVersionNum = ver ? ver.version + 1 : 2;

              return (
                <div className="space-y-4 text-sm">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-semibold">Target Plan:</span>
                      <span className="font-bold text-gray-900 dark:text-white">{selectedPlan.name}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-200 dark:border-gray-800 text-center">
                      <div>
                        <span className="text-[11px] text-gray-400 block">Current</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300">₹{currentMonthly}/mo</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <span className="text-[11px] text-gray-400 block">New</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">₹{newMonthly}/mo</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold pt-1">
                      <span>Monthly Difference:</span>
                      <span className={`inline-flex items-center gap-1 font-mono ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {diff >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {diff >= 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Will Create PlanVersion v{nextVersionNum}</p>
                      <p className="mt-0.5 text-[11px]">
                        This change affects new purchases. Existing subscriptions retain their current plan version.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => setShowPreviewModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                    >
                      Back to Edit
                    </button>
                    <button
                      type="button"
                      onClick={executePlanUpdate}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span>Confirm & Create Version v{nextVersionNum}</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* PLAN VERSION HISTORY MODAL (Section 5) */}
      {showHistoryModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-3xl shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-600" />
                  Plan Version History — {selectedPlan.name}
                </h3>
                <p className="text-xs font-mono text-gray-500">planId: {selectedPlan.id}</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {planVersionsHistory.map((v) => (
                <div
                  key={v.id}
                  className={`p-4 rounded-xl border ${
                    v.status === "ACTIVE"
                      ? "border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20"
                      : "border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-xs font-mono font-bold bg-blue-600 text-white rounded-md">
                        Version {v.version}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${v.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}>
                        {v.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      Effective: {new Date(v.effectiveFrom).toLocaleDateString()} {v.effectiveUntil ? `→ ${new Date(v.effectiveUntil).toLocaleDateString()}` : "→ Present"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-xs">
                    <div>
                      <span className="text-gray-400 block">Monthly Price</span>
                      <span className="font-bold text-gray-900 dark:text-white">₹{(v.monthlyPrice / 100).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Annual Price</span>
                      <span className="font-bold text-gray-900 dark:text-white">₹{(v.annualPrice / 100).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Features Included</span>
                      <span className="font-bold text-gray-900 dark:text-white">{v.features?.length || 0} Features</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Student Limit</span>
                      <span className="font-bold text-gray-900 dark:text-white">{v.limits?.maxStudents === -1 ? "Unlimited" : v.limits?.maxStudents || 500}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE PLAN MODAL */}
      {showDuplicateModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Copy className="h-5 w-5 text-purple-600" />
                Duplicate Plan: {selectedPlan.name}
              </h3>
              <button onClick={() => setShowDuplicateModal(false)} className="p-1 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDuplicatePlan} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  New Plan Name *
                </label>
                <input
                  type="text"
                  required
                  value={duplicateName}
                  onChange={(e) => setDuplicateName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  New Unique Slug *
                </label>
                <input
                  type="text"
                  required
                  value={duplicateSlug}
                  onChange={(e) => setDuplicateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  <span>Duplicate Plan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
