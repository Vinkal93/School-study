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
  Percent,
  Tag,
  Trash2,
  Receipt,
  Calculator,
  PercentCircle,
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
  deletePlan,
  togglePlanStatus,
  getGlobalAccessPolicy,
  updateGlobalAccessPolicy,
  CreatePlanInput,
  UpdatePlanInput,
} from "@/lib/billing";
import {
  getGstSettings,
  updateGstSettings,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  BillingGstSettings,
  Coupon,
} from "@/lib/billing/gstCouponsEngine";
import type { Plan, PlanVersion, FeatureDefinition, GlobalAccessPolicy, PlanStatus } from "@/types";
import { GranularPermissionTree } from "@/components/super-admin/GranularPermissionTree";
import { toast } from "sonner";

export default function SuperAdminPricingPage() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeVersions, setActiveVersions] = useState<Record<string, PlanVersion>>({});
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const [globalPolicy, setGlobalPolicy] = useState<GlobalAccessPolicy | null>(null);
  const [loading, setLoading] = useState(true);

  // GST & Coupon State
  const [gstSettings, setGstSettings] = useState<BillingGstSettings>({
    gstEnabled: true,
    gstPercentage: 18,
    gstin: "29AAAAA0000A1Z5",
    updatedAt: new Date().toISOString(),
  });
  const [savingGst, setSavingGst] = useState(false);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCreateCouponModal, setShowCreateCouponModal] = useState(false);
  const [showEditCouponModal, setShowEditCouponModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [savingCoupon, setSavingCoupon] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<"plans" | "features" | "gst" | "coupons" | "policy">("plans");

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Delete Plan Modal State
  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);

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

  // Coupon Form State
  const [couponForm, setCouponForm] = useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 20,
    validFrom: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    usageLimit: 100,
    minOrderAmountRupees: 0,
    isActive: true,
  });

  // Global Policy Form State
  const [reminderDaysStr, setReminderDaysStr] = useState("30, 15, 7, 3, 1");
  const [savingPolicy, setSavingPolicy] = useState(false);

  // OPTIMIZED PARALLEL DATA LOADER
  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedPlans, fetchedFeatures, fetchedPolicy, fetchedGst, fetchedCoupons] = await Promise.all([
        getAllPlansAdmin(),
        getAllFeatureDefinitions(),
        getGlobalAccessPolicy(),
        getGstSettings(),
        getAllCoupons(),
      ]);

      setPlans(fetchedPlans);
      setFeatures(fetchedFeatures);
      setGlobalPolicy(fetchedPolicy);
      setGstSettings(fetchedGst);
      setCoupons(fetchedCoupons);

      if (fetchedPolicy) {
        setReminderDaysStr((fetchedPolicy.reminderDays || [30, 15, 7, 3, 1]).join(", "));
      }

      // Parallel execution for active plan versions
      const versionsMap: Record<string, PlanVersion> = {};
      await Promise.all(
        fetchedPlans.map(async (p) => {
          const v = await getActivePlanVersion(p.id);
          if (v) versionsMap[p.id] = v;
        })
      );
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

  // Trigger Edit Form Submit
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

  // Safe Plan Deletion Modal Trigger
  const openDeletePlanModal = (plan: Plan) => {
    setPlanToDelete(plan);
    setShowDeletePlanModal(true);
  };

  const handleDeletePlanConfirm = async () => {
    if (!planToDelete) return;
    setDeletingPlan(true);
    try {
      await deletePlan(planToDelete.id, profile?.email || "super_admin");
      toast.success(`Plan "${planToDelete.name}" deleted successfully.`);
      setShowDeletePlanModal(false);
      setPlanToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Cannot delete plan with active subscribers.");
    } finally {
      setDeletingPlan(false);
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

  // Save GST Settings
  const handleSaveGst = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGst(true);
    try {
      const updated = await updateGstSettings(gstSettings, profile?.email || "super_admin");
      setGstSettings(updated);
      toast.success("GST Tax settings saved successfully!");
    } catch (err: any) {
      toast.error("Failed to save GST settings.");
    } finally {
      setSavingGst(false);
    }
  };

  // Handle Create Coupon Submit
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCoupon(true);
    try {
      const discountValue =
        couponForm.discountType === "percentage"
          ? Number(couponForm.discountValue)
          : Math.round(Number(couponForm.discountValue) * 100);

      await createCoupon(
        {
          code: couponForm.code,
          description: couponForm.description,
          discountType: couponForm.discountType,
          discountValue,
          validFrom: new Date(couponForm.validFrom).toISOString(),
          validUntil: new Date(couponForm.validUntil).toISOString(),
          usageLimit: Number(couponForm.usageLimit),
          minOrderAmountPaise: Math.round(Number(couponForm.minOrderAmountRupees) * 100),
          isActive: couponForm.isActive,
        },
        profile?.email || "super_admin"
      );

      toast.success(`Coupon "${couponForm.code.toUpperCase()}" created!`);
      setShowCreateCouponModal(false);
      setCouponForm({
        code: "",
        description: "",
        discountType: "percentage",
        discountValue: 20,
        validFrom: new Date().toISOString().split("T")[0],
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        usageLimit: 100,
        minOrderAmountRupees: 0,
        isActive: true,
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create coupon.");
    } finally {
      setSavingCoupon(false);
    }
  };

  // Toggle Coupon Status
  const handleToggleCouponStatus = async (coupon: Coupon) => {
    try {
      await toggleCouponStatus(coupon.id, !coupon.isActive, profile?.email || "super_admin");
      toast.success(`Coupon "${coupon.code}" status toggled.`);
      loadData();
    } catch (err: any) {
      toast.error("Failed to toggle coupon status.");
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (couponId: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon "${code}"?`)) return;
    try {
      await deleteCoupon(couponId, profile?.email || "super_admin");
      toast.success(`Coupon "${code}" deleted.`);
      loadData();
    } catch (err: any) {
      toast.error("Failed to delete coupon.");
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
            Database-driven SaaS subscription tiers, immutable plan versioning, GST tax engines & promo codes.
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
          {activeTab === "plans" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Plan</span>
            </button>
          )}
          {activeTab === "coupons" && (
            <button
              onClick={() => setShowCreateCouponModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create Coupon</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-800 pb-1">
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 shrink-0 ${
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
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "features"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Feature Registry ({features.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("gst")}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "gst"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          <Receipt className="h-4 w-4 text-emerald-500" />
          <span>GST & Tax Engine</span>
        </button>
        <button
          onClick={() => setActiveTab("coupons")}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "coupons"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          <Tag className="h-4 w-4 text-amber-500" />
          <span>Coupons ({coupons.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("policy")}
          className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "policy"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          <ShieldAlert className="h-4 w-4 text-purple-500" />
          <span>Access Policy</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 space-y-3">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading Pricing & Plan Architecture...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: PLANS CATALOG */}
          {activeTab === "plans" && (
            <div className="space-y-4">
              {plans.length === 0 ? (
                <div className="text-center p-12 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3">
                  <Sliders className="h-10 w-10 text-gray-400 mx-auto" />
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">No plans defined in database yet.</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-xl"
                  >
                    Create First Plan
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-gray-200 bg-gray-50/50 text-xs uppercase font-bold text-gray-500 dark:border-gray-800 dark:bg-gray-900/50">
                        <tr>
                          <th className="px-6 py-4">Plan Name / Slug</th>
                          <th className="px-4 py-4">Status</th>
                          <th className="px-4 py-4">Monthly Price</th>
                          <th className="px-4 py-4">Annual Price</th>
                          <th className="px-4 py-4">Active Version</th>
                          <th className="px-4 py-4">Features</th>
                          <th className="px-4 py-4">Max Capacity</th>
                          <th className="px-6 py-4 text-right">Actions</th>
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
                                  <span className="font-bold text-gray-900 dark:text-white text-base">{p.name}</span>
                                  {p.isPopular && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-800">
                                      POPULAR
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-mono text-gray-400 mt-0.5">slug: {p.slug}</div>
                              </td>
                              <td className="px-4 py-4">
                                <button
                                  onClick={() => handleToggleStatus(p)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                                    p.status === "ACTIVE"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100"
                                      : p.status === "INACTIVE"
                                      ? "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800"
                                  }`}
                                >
                                  {p.status === "ACTIVE" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Archive className="h-3.5 w-3.5" />}
                                  <span>{p.status}</span>
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
                                  <button
                                    onClick={() => openDeletePlanModal(p)}
                                    className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    title="Delete Plan Safely"
                                  >
                                    <Trash2 className="h-4 w-4" />
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

          {/* TAB 2: FEATURE REGISTRY */}
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

          {/* TAB 3: GST & TAX ENGINE */}
          {activeTab === "gst" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-emerald-500" />
                    <span>Dynamic GST & Tax Calculation Engine</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure platform GST percentage, tax status, and GSTIN for automatic checkout calculations.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveGst} className="space-y-5 max-w-2xl">
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 flex items-center justify-between">
                  <div>
                    <label className="font-bold text-sm text-gray-900 dark:text-white">Enable GST Calculation</label>
                    <p className="text-xs text-gray-500">Automatically compute GST tax breakdown during checkout and orders.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={gstSettings.gstEnabled}
                    onChange={(e) => setGstSettings({ ...gstSettings, gstEnabled: e.target.checked })}
                    className="h-5 w-5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      GST Rate Percentage (%) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      required
                      value={gstSettings.gstPercentage}
                      onChange={(e) => setGstSettings({ ...gstSettings, gstPercentage: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      GSTIN Registration Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={gstSettings.gstin}
                      onChange={(e) => setGstSettings({ ...gstSettings, gstin: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Sample Calculation Live Breakdown */}
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Calculator className="h-4 w-4" />
                    <span>Live Tax Calculation Breakdown Preview (Sample ₹1,999 Base Price)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1 border-t border-slate-800">
                    <div>
                      <span className="text-slate-400 block">Base Price</span>
                      <span className="font-bold text-white">₹1,999.00</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">GST ({gstSettings.gstPercentage}%)</span>
                      <span className="font-bold text-emerald-400">
                        ₹{gstSettings.gstEnabled ? (1999 * (gstSettings.gstPercentage / 100)).toFixed(2) : "0.00"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Final Order Amount</span>
                      <span className="font-bold text-blue-400">
                        ₹
                        {(
                          1999 + (gstSettings.gstEnabled ? 1999 * (gstSettings.gstPercentage / 100) : 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingGst}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  {savingGst ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                  <span>Save GST Settings</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: COUPONS & DISCOUNTS */}
          {activeTab === "coupons" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Tag className="h-5 w-5 text-amber-500" />
                    <span>Dynamic Coupons & Discount Engine</span>
                  </h2>
                  <p className="text-xs text-gray-500">Manage promotional promo codes, percentage/flat discounts, and expiration rules.</p>
                </div>
                <button
                  onClick={() => setShowCreateCouponModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-amber-500/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Coupon</span>
                </button>
              </div>

              {coupons.length === 0 ? (
                <div className="text-center p-12 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3">
                  <Tag className="h-10 w-10 text-gray-400 mx-auto" />
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">No promo coupons created yet.</p>
                  <button
                    onClick={() => setShowCreateCouponModal(true)}
                    className="px-4 py-2 bg-amber-600 text-white font-semibold text-xs rounded-xl"
                  >
                    Create First Coupon
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-gray-200 bg-gray-50/50 text-xs uppercase font-bold text-gray-500 dark:border-gray-800 dark:bg-gray-900/50">
                        <tr>
                          <th className="px-6 py-4">Coupon Code</th>
                          <th className="px-4 py-4">Discount</th>
                          <th className="px-4 py-4">Valid Range</th>
                          <th className="px-4 py-4">Usage Limit</th>
                          <th className="px-4 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {coupons.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 text-xs font-mono font-extrabold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-md border border-amber-300 dark:border-amber-800">
                                {c.code}
                              </span>
                              {c.description && <p className="text-xs text-gray-500 mt-1">{c.description}</p>}
                            </td>
                            <td className="px-4 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                              {c.discountType === "percentage"
                                ? `${c.discountValue}% OFF`
                                : `₹${(c.discountValue / 100).toLocaleString("en-IN")} FLAT OFF`}
                            </td>
                            <td className="px-4 py-4 text-xs font-mono text-gray-600 dark:text-gray-400">
                              <div>From: {c.validFrom?.split("T")[0]}</div>
                              <div>Until: {c.validUntil?.split("T")[0]}</div>
                            </td>
                            <td className="px-4 py-4 text-xs font-mono font-semibold text-gray-900 dark:text-white">
                              {c.usedCount} / {c.usageLimit === -1 ? "Unlimited" : c.usageLimit}
                            </td>
                            <td className="px-4 py-4">
                              <button
                                onClick={() => handleToggleCouponStatus(c)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                                  c.isActive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400"
                                    : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400"
                                }`}
                              >
                                {c.isActive ? "ACTIVE" : "INACTIVE"}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleDeleteCoupon(c.id, c.code)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
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
                </div>
              )}
            </div>
          )}

          {/* TAB 5: GLOBAL ACCESS POLICY */}
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

      {/* CREATE PLAN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600 shrink-0" />
                <span>Create New Plan & Version 1</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g. Starter Plan"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Slug *</label>
                  <input
                    type="text"
                    required
                    value={createForm.slug}
                    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    placeholder="starter"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Monthly Price (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={createForm.monthlyPriceRupees}
                    onChange={(e) => setCreateForm({ ...createForm, monthlyPriceRupees: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Annual Price (₹/mo) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={createForm.annualPriceRupees}
                    onChange={(e) => setCreateForm({ ...createForm, annualPriceRupees: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Tax Breakdown Preview */}
              <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-mono flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Monthly Total (with {gstSettings.gstPercentage}% GST)</span>
                  <span className="font-bold text-emerald-400">
                    ₹{(createForm.monthlyPriceRupees * (1 + (gstSettings.gstEnabled ? gstSettings.gstPercentage / 100 : 0))).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Annual Total (with {gstSettings.gstPercentage}% GST)</span>
                  <span className="font-bold text-blue-400">
                    ₹{(createForm.annualPriceRupees * 12 * (1 + (gstSettings.gstEnabled ? gstSettings.gstPercentage / 100 : 0))).toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Enabled Features</label>
                <GranularPermissionTree
                  allFeatures={features}
                  selectedFeatureKeys={createForm.features}
                  onChange={(keys) => setCreateForm({ ...createForm, features: keys })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl">
                  {saving ? "Creating..." : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PLAN MODAL */}
      {showEditModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600 shrink-0" />
                <span>Edit Plan: {selectedPlan.name}</span>
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditFormSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.monthlyPriceRupees}
                    onChange={(e) => setEditForm({ ...editForm, monthlyPriceRupees: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Tax Breakdown Preview */}
              <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-mono flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Monthly Total (with {gstSettings.gstPercentage}% GST)</span>
                  <span className="font-bold text-emerald-400">
                    ₹{(editForm.monthlyPriceRupees * (1 + (gstSettings.gstEnabled ? gstSettings.gstPercentage / 100 : 0))).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Annual Total (with {gstSettings.gstPercentage}% GST)</span>
                  <span className="font-bold text-blue-400">
                    ₹{(editForm.annualPriceRupees * 12 * (1 + (gstSettings.gstEnabled ? gstSettings.gstPercentage / 100 : 0))).toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Plan Features</label>
                <GranularPermissionTree
                  allFeatures={features}
                  selectedFeatureKeys={editForm.features}
                  onChange={(keys) => setEditForm({ ...editForm, features: keys })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE COUPON MODAL */}
      {showCreateCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Tag className="h-5 w-5 text-amber-500" />
                <span>Create New Coupon</span>
              </h3>
              <button onClick={() => setShowCreateCouponModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                  placeholder="e.g. WELCOME20"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border rounded-xl font-mono uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Discount Type *</label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as "percentage" | "fixed" })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border rounded-xl font-bold"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {couponForm.discountType === "percentage" ? "Discount (%)" : "Flat Amount (₹)"} *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Valid From</label>
                  <input
                    type="date"
                    required
                    value={couponForm.validFrom}
                    onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border rounded-xl font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Valid Until</label>
                  <input
                    type="date"
                    required
                    value={couponForm.validUntil}
                    onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowCreateCouponModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500">
                  Cancel
                </button>
                <button type="submit" disabled={savingCoupon} className="px-5 py-2 bg-amber-600 text-white font-bold text-xs rounded-xl">
                  {savingCoupon ? "Saving..." : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAFE DELETE PLAN MODAL */}
      {showDeletePlanModal && planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold">Delete Plan "{planToDelete.name}"</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Are you sure you want to delete this pricing plan? This action will permanently remove the plan definition if no active schools are subscribed to it. Historical invoices will remain intact.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowDeletePlanModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500">
                Cancel
              </button>
              <button
                onClick={handleDeletePlanConfirm}
                disabled={deletingPlan}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl"
              >
                {deletingPlan ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE MODAL */}
      {showDuplicateModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Copy className="h-5 w-5 text-purple-600 shrink-0" />
                <span>Duplicate Plan</span>
              </h3>
              <button onClick={() => setShowDuplicateModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDuplicatePlan} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">New Plan Name *</label>
                <input
                  type="text"
                  required
                  value={duplicateName}
                  onChange={(e) => setDuplicateName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">New Slug *</label>
                <input
                  type="text"
                  required
                  value={duplicateSlug}
                  onChange={(e) => setDuplicateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border rounded-xl font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowDuplicateModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl">
                  {saving ? "Duplicating..." : "Duplicate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERSION HISTORY MODAL */}
      {showHistoryModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600 shrink-0" />
                <span>Version History: {selectedPlan.name}</span>
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {planVersionsHistory.map((v) => (
                <div key={v.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded">
                      Version {v.version}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{v.effectiveFrom?.split("T")[0]}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-semibold">
                    <span>Monthly: ₹{v.monthlyPrice / 100}</span>
                    <span>Annual: ₹{v.annualPrice / 100}</span>
                  </div>
                  <p className="text-xs text-gray-500">{v.features?.length || 0} features active</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
