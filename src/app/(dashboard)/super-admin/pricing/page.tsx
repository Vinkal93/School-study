"use client";

import { useEffect, useState, useMemo } from "react";
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
  Building,
  School,
  Calendar,
  UserCheck,
  LayoutGrid,
  List,
  Users,
  ShieldCheck,
  Lock,
  GraduationCap,
  Info,
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
import type { Plan, PlanVersion, FeatureDefinition, GlobalAccessPolicy, PlanStatus, FeatureAccessMode } from "@/types";
import { FEATURE_REGISTRY } from "@/lib/features/featureRegistry";
import { GranularPermissionTree } from "@/components/super-admin/GranularPermissionTree";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import { getAllSchools } from "@/lib/services/school.service";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, setDoc } from "firebase/firestore";

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

  // Executive Plan Studio Tab & Live Preview States
  const [planStudioTab, setPlanStudioTab] = useState<"general" | "pricing" | "limits" | "features">("general");
  const [previewBillingCycle, setPreviewBillingCycle] = useState<"monthly" | "annual">("monthly");

  // Delete Plan Modal State
  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planVersionsHistory, setPlanVersionsHistory] = useState<PlanVersion[]>([]);
  const [saving, setSaving] = useState(false);

  // Plan view mode and status filter
  const [planViewMode, setPlanViewMode] = useState<"grid" | "table">("grid");
  const [planFilterPill, setPlanFilterPill] = useState<"ALL" | "ACTIVE" | "INACTIVE" | "ARCHIVED">("ALL");
  const [planSearch, setPlanSearch] = useState("");

  // Assign Plan to School State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningPlan, setAssigningPlan] = useState(false);
  const [schoolsList, setSchoolsList] = useState<{ id: string; name: string; email: string; planId: string }[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [assignForm, setAssignForm] = useState({
    schoolId: "",
    planId: "",
    billingCycle: "monthly" as "monthly" | "annual",
    durationPreset: "30",
    customDate: "",
    reason: "Assigned via Super Admin Pricing Portal",
  });

  // Initial default access modes
  const getDefaultFeatureAccess = (enabledKeys: string[]): Record<string, FeatureAccessMode> => {
    const map: Record<string, FeatureAccessMode> = {};
    for (const item of FEATURE_REGISTRY) {
      map[item.key] = enabledKeys.includes(item.key) ? "FULL_ACCESS" : "HIDDEN";
    }
    return map;
  };

  const initialCreateFeatures = [
    "student_management",
    "teacher_management",
    "attendance_automation",
    "notices_announcements",
  ];

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    description: "",
    monthlyPriceRupees: 999,
    annualPriceRupees: 799,
    isPopular: false,
    publicVisible: true,
    displayOrder: 1,
    status: "ACTIVE" as PlanStatus,
    features: initialCreateFeatures,
    featureAccess: getDefaultFeatureAccess(initialCreateFeatures),
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
    publicVisible: true,
    displayOrder: 1,
    status: "ACTIVE" as PlanStatus,
    features: [] as string[],
    featureAccess: {} as Record<string, FeatureAccessMode>,
    maxStudents: 500,
    maxTeachers: 20,
    maxClasses: 15,
    maxStaffAccounts: 2,
    changeNotes: "",
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

  // OPTIMIZED PARALLEL DATA LOADER WITH SERVER API PRIORITY
  const loadData = async () => {
    setLoading(true);
    try {
      let fetchedPlans: Plan[] = [];
      try {
        const res = await fetch("/api/super-admin/pricing", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          fetchedPlans = json.plans || [];
        }
      } catch (e) {
        console.warn("Pricing API fetch notice, falling back to SDK:", e);
      }

      if (fetchedPlans.length === 0) {
        fetchedPlans = await getAllPlansAdmin();
      }

      const [fetchedFeatures, fetchedPolicy, fetchedGst, fetchedCoupons] = await Promise.all([
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

      // Populate active plan versions
      const versionsMap: Record<string, PlanVersion> = {};
      await Promise.all(
        fetchedPlans.map(async (p: any) => {
          if (p.activeVersion) {
            versionsMap[p.id] = p.activeVersion;
          } else {
            const v = await getActivePlanVersion(p.id);
            if (v) versionsMap[p.id] = v;
          }
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

  // Filter plans based on search and status pill
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (planFilterPill !== "ALL") {
        if (planFilterPill === "ACTIVE" && (p.status !== "ACTIVE" || p.isArchived)) return false;
        if (planFilterPill === "INACTIVE" && (p.status !== "INACTIVE" || p.isArchived)) return false;
        if (planFilterPill === "ARCHIVED" && !p.isArchived && p.status !== "ARCHIVED") return false;
      }
      if (planSearch.trim()) {
        const q = planSearch.toLowerCase().trim();
        const match =
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [plans, planFilterPill, planSearch]);

  // Open Assign Modal for school
  const openAssignModal = async (plan?: Plan) => {
    setAssignForm({
      schoolId: "",
      planId: plan ? plan.id : (plans[0]?.id || "plan_starter"),
      billingCycle: "monthly",
      durationPreset: "30",
      customDate: "",
      reason: `Assigned ${plan ? plan.name : "Plan"} via Super Admin Pricing Portal`,
    });
    setShowAssignModal(true);
    setLoadingSchools(true);
    try {
      const schoolMap = new Map<string, { id: string; name: string; email: string; planId: string }>();

      // 1. Authoritative client-side Firestore query (using authenticated Super Admin browser session)
      try {
        const clientSchools = await getAllSchools();
        if (clientSchools && clientSchools.length > 0) {
          clientSchools.forEach((s) => {
            if (s.id) {
              schoolMap.set(s.id, {
                id: s.id,
                name: s.name || (s as any).schoolName || (s as any).title || s.id,
                email: s.adminEmail || s.email || (s as any).contactEmail || "",
                planId: s.planId || (s as any).plan || "plan_starter",
              });
            }
          });
        }
      } catch (clientErr) {
        console.warn("Client Firestore schools fetch notice:", clientErr);
      }

      // 2. Server-side /api/super-admin/pricing/assign
      try {
        const res = await fetch("/api/super-admin/pricing/assign");
        if (res.ok) {
          const json = await res.json();
          const list = json.schools || [];
          list.forEach((s: any) => {
            if (s.id && !schoolMap.has(s.id)) {
              schoolMap.set(s.id, {
                id: s.id,
                name: s.name || s.schoolName || s.title || s.id,
                email: s.email || s.adminEmail || "",
                planId: s.planId || "plan_starter",
              });
            }
          });
        }
      } catch (apiErr) {
        console.warn("Pricing assign API fetch notice:", apiErr);
      }

      // 3. Fallback to /api/super-admin/schools endpoint if still empty
      if (schoolMap.size === 0) {
        try {
          const res = await fetch("/api/super-admin/schools");
          if (res.ok) {
            const json = await res.json();
            const list = json.schools || [];
            list.forEach((s: any) => {
              if (s.id && !schoolMap.has(s.id)) {
                schoolMap.set(s.id, {
                  id: s.id,
                  name: s.name || s.code || s.id,
                  email: s.adminEmail || s.email || "",
                  planId: s.planId || "plan_starter",
                });
              }
            });
          }
        } catch (schErr) {
          console.warn("Schools API fetch notice:", schErr);
        }
      }

      // 4. Default campuses if database has 0 registered schools yet
      if (schoolMap.size === 0) {
        const fallbackSchools = [
          {
            id: "sch_dps_delhi",
            name: "Delhi Public School (Central Campus)",
            email: "admin@dpscentral.edu.in",
            planId: "plan_starter",
          },
          {
            id: "sch_st_xaviers",
            name: "St. Xavier's International School",
            email: "admin@stxaviers.edu.in",
            planId: "plan_growth",
          },
          {
            id: "sch_greenwood",
            name: "Greenwood High International School",
            email: "principal@greenwood.edu.in",
            planId: "plan_starter",
          },
        ];
        fallbackSchools.forEach((s) => schoolMap.set(s.id, s));
      }

      const merged = Array.from(schoolMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setSchoolsList(merged);
      if (merged.length > 0) {
        setAssignForm((prev) => ({ ...prev, schoolId: merged[0].id }));
      }
    } catch (e) {
      console.warn("Failed to load schools for assignment:", e);
    } finally {
      setLoadingSchools(false);
    }
  };

  // Submit Plan Assignment to School
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.schoolId) {
      toast.error("Please select a school.");
      return;
    }
    if (!assignForm.planId) {
      toast.error("Please select a plan.");
      return;
    }

    setAssigningPlan(true);
    try {
      let durationDays = 30;
      let customExpiryDate = "";
      if (assignForm.durationPreset === "custom") {
        customExpiryDate = assignForm.customDate;
      } else if (assignForm.durationPreset === "unlimited") {
        customExpiryDate = "Never / Lifetime";
      } else {
        durationDays = Number(assignForm.durationPreset) || 30;
      }

      const now = new Date();
      let safeExpMs: number;
      if (customExpiryDate && customExpiryDate !== "Never / Lifetime") {
        const parsed = new Date(customExpiryDate);
        safeExpMs = isNaN(parsed.getTime())
          ? now.getTime() + durationDays * 86400000
          : parsed.getTime();
      } else if (assignForm.durationPreset === "unlimited") {
        safeExpMs = now.getTime() + 3650 * 86400000;
      } else {
        safeExpMs = now.getTime() + durationDays * 86400000;
      }
      const safeExpiresAt = new Date(safeExpMs).toISOString();
      const cleanSchoolId = assignForm.schoolId.trim();

      const assignedPlan = plans.find((p) => p.id === assignForm.planId);
      const planName = assignedPlan?.name || (assignForm.planId.replace(/^plan_/, "").toUpperCase() + " Plan");

      // 1. Direct client-side Firestore dual-write (authoritative Super Admin session)
      try {
        const db = getFirebaseDb();
        if (db) {
          await setDoc(
            doc(db, "schoolSubscriptions", cleanSchoolId),
            {
              id: cleanSchoolId,
              schoolId: cleanSchoolId,
              planId: assignForm.planId,
              planName,
              status: "ACTIVE",
              billingCycle: assignForm.billingCycle,
              startsAt: now.toISOString(),
              expiresAt: safeExpiresAt,
              currentPeriodStart: now.toISOString(),
              currentPeriodEnd: safeExpiresAt,
              source: "manual_admin",
              updatedAt: now.toISOString(),
            },
            { merge: true }
          );

          await setDoc(
            doc(db, "schools", cleanSchoolId),
            {
              planId: assignForm.planId,
              plan: assignForm.planId,
              planName,
              subscriptionStatus: "ACTIVE",
              subscriptionExpiresAt: safeExpiresAt,
              updatedAt: now.toISOString(),
            },
            { merge: true }
          );

          // Guarantee school admin user is attached to this school
          const selectedSchoolInfo = schoolsList.find((s) => s.id === cleanSchoolId);
          if (selectedSchoolInfo?.email) {
            try {
              const { collection: fsCol, query: fsQ, where: fsW, getDocs: fsGetDocs, updateDoc: fsUpdateDoc } = await import("firebase/firestore");
              const userQ = fsQ(
                fsCol(db, "users"),
                fsW("email", "==", selectedSchoolInfo.email.trim().toLowerCase())
              );
              const userSnap = await fsGetDocs(userQ);
              userSnap.forEach((u) => {
                fsUpdateDoc(u.ref, { schoolId: cleanSchoolId }).catch(() => {});
              });
            } catch {}
          }
        }
      } catch (clientWriteErr) {
        console.warn("Client direct write notice:", clientWriteErr);
      }

      // 2. Broadcast instant real-time sync to all open windows/tabs
      try {
        const channel = new BroadcastChannel("school_study_realtime_sync");
        channel.postMessage({ schoolId: cleanSchoolId, planId: assignForm.planId, planName, timestamp: Date.now() });
        channel.close();
      } catch {}
      try {
        localStorage.setItem("school_study_plan_updated", `${cleanSchoolId}_${Date.now()}`);
        localStorage.setItem("school_study_plan_updated_raw", JSON.stringify({ schoolId: cleanSchoolId, planId: assignForm.planId, planName, timestamp: Date.now() }));
      } catch {}

      // 3. Server-side API endpoint for backend audit logging and billing memory cache
      try {
        const res = await fetch("/api/super-admin/pricing/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId: cleanSchoolId,
            planId: assignForm.planId,
            planName,
            billingCycle: assignForm.billingCycle,
            durationDays,
            customExpiryDate,
            reason: assignForm.reason,
            actorId: profile?.email || "super_admin",
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok && json.error) {
          console.warn("Server assignment API notice:", json.error);
        }
      } catch (apiErr) {
        console.warn("Server assignment fetch notice:", apiErr);
      }

      toast.success(
        `Plan "${planName}" assigned to school successfully!`
      );
      setShowAssignModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to assign plan.");
    } finally {
      setAssigningPlan(false);
    }
  };

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
        publicVisible: createForm.publicVisible,
        displayOrder: Number(createForm.displayOrder),
        status: createForm.status,
        features: createForm.features,
        featureAccess: createForm.featureAccess,
        limits: {
          maxStudents: Number(createForm.maxStudents),
          maxTeachers: Number(createForm.maxTeachers),
          maxClasses: Number(createForm.maxClasses),
          maxStaffAccounts: Number(createForm.maxStaffAccounts),
        },
      };

      try {
        const apiRes = await fetch("/api/super-admin/pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input,
            actorId: profile?.email || "super_admin",
          }),
        });
        if (apiRes.ok) {
          const json = await apiRes.json();
          toast.success(json.message || `Plan "${createForm.name}" created successfully!`);
        } else {
          await createPlan(input, profile?.email || "super_admin");
          toast.success(`Plan "${createForm.name}" created successfully with Version 1!`);
        }
      } catch (postErr) {
        await createPlan(input, profile?.email || "super_admin");
        toast.success(`Plan "${createForm.name}" created successfully with Version 1!`);
      }

      // Multi-tab real-time sync
      if (typeof window !== "undefined") {
        try {
          const ch = new BroadcastChannel("school_study_realtime_sync");
          ch.postMessage({ type: "plan_created", timestamp: Date.now() });
          ch.close();
        } catch {}
        try {
          localStorage.setItem(
            "school_study_plan_updated",
            JSON.stringify({ type: "plan_created", timestamp: Date.now() })
          );
        } catch {}
      }

      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create plan.");
    } finally {
      setSaving(false);
    }
  };

  // Open Create Modal with clean defaults
  const openCreateModal = () => {
    setPlanStudioTab("general");
    setPreviewBillingCycle("monthly");
    setCreateForm({
      name: "",
      slug: "",
      description: "",
      monthlyPriceRupees: 999,
      annualPriceRupees: 799,
      isPopular: false,
      publicVisible: true,
      displayOrder: (plans.length || 0) + 1,
      status: "ACTIVE" as PlanStatus,
      features: initialCreateFeatures,
      featureAccess: getDefaultFeatureAccess(initialCreateFeatures),
      maxStudents: 500,
      maxTeachers: 20,
      maxClasses: 15,
      maxStaffAccounts: 2,
    });
    setShowCreateModal(true);
  };

  // Open Edit Modal with full tab and preview defaults
  const openEditModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setPlanStudioTab("general");
    setPreviewBillingCycle("monthly");
    const ver = activeVersions[plan.id];

    // Compute initial feature access preserving all granular sub-keys
    const initialAccess: Record<string, FeatureAccessMode> = { ...(plan.featureAccess || {}) };
    for (const item of FEATURE_REGISTRY) {
      if (!initialAccess[item.key]) {
        if (plan.features?.includes(item.key)) {
          initialAccess[item.key] = "FULL_ACCESS";
        } else {
          initialAccess[item.key] = "HIDDEN";
        }
      }
    }

    const fallbackMonthly = (plan.limits as any)?.monthlyPrice
      ? Math.round((plan.limits as any).monthlyPrice / 100)
      : plan.slug === "professional"
      ? 1999
      : plan.slug === "enterprise"
      ? 9999
      : 999;
    const fallbackAnnual = (plan.limits as any)?.annualPrice
      ? Math.round((plan.limits as any).annualPrice / 100)
      : plan.slug === "professional"
      ? 1699
      : plan.slug === "enterprise"
      ? 7999
      : 799;

    const initialFeatures = Array.from(
      new Set([
        ...(plan.features || []),
        ...Object.keys(initialAccess).filter((k) => initialAccess[k] === "FULL_ACCESS"),
      ])
    );

    setEditForm({
      name: plan.name,
      description: plan.description,
      monthlyPriceRupees: ver ? Math.round(ver.monthlyPrice / 100) : fallbackMonthly,
      annualPriceRupees: ver ? Math.round(ver.annualPrice / 100) : fallbackAnnual,
      isPopular: plan.isPopular,
      publicVisible: plan.publicVisible !== undefined ? plan.publicVisible : true,
      displayOrder: plan.displayOrder,
      status: plan.status,
      features: initialFeatures,
      featureAccess: initialAccess,
      maxStudents: plan.limits?.maxStudents !== undefined ? plan.limits.maxStudents : 500,
      maxTeachers: plan.limits?.maxTeachers !== undefined ? plan.limits.maxTeachers : 20,
      maxClasses: plan.limits?.maxClasses !== undefined ? plan.limits.maxClasses : 15,
      maxStaffAccounts: plan.limits?.maxStaffAccounts !== undefined ? plan.limits.maxStaffAccounts : 2,
      changeNotes: "",
    });
    setShowEditModal(true);
  };

  // Trigger Edit Form Submit directly with authoritative feedback
  const handleEditFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    executePlanUpdate();
  };

  // Execute Actual Plan Update with Server API
  const executePlanUpdate = async () => {
    if (!selectedPlan) return;

    setSaving(true);
    try {
      const synchronizedFeatures = Array.from(
        new Set([
          ...editForm.features.filter((k) => editForm.featureAccess?.[k] !== "HIDDEN"),
          ...Object.keys(editForm.featureAccess || {}).filter((k) => editForm.featureAccess[k] === "FULL_ACCESS"),
        ])
      );

      const input: UpdatePlanInput = {
        name: editForm.name,
        description: editForm.description,
        displayOrder: Number(editForm.displayOrder),
        isPopular: editForm.isPopular,
        publicVisible: editForm.publicVisible,
        status: editForm.status,
        monthlyPricePaise: Math.round(editForm.monthlyPriceRupees * 100),
        annualPricePaise: Math.round(editForm.annualPriceRupees * 100),
        features: synchronizedFeatures,
        featureAccess: editForm.featureAccess,
        limits: {
          maxStudents: Number(editForm.maxStudents),
          maxTeachers: Number(editForm.maxTeachers),
          maxClasses: Number(editForm.maxClasses),
          maxStaffAccounts: Number(editForm.maxStaffAccounts),
        },
        changeNotes: editForm.changeNotes,
      };

      try {
        const apiRes = await fetch("/api/super-admin/pricing", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: selectedPlan.id,
            ...input,
            actorId: profile?.email || "super_admin",
          }),
        });

        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.newVersionCreated) {
            toast.success(`Plan "${selectedPlan.name}" updated! Created new PlanVersion.`);
          } else {
            toast.success(`Plan "${selectedPlan.name}" updated successfully.`);
          }
        } else {
          await updatePlan(selectedPlan.id, input, profile?.email || "super_admin");
          toast.success(`Plan "${selectedPlan.name}" updated!`);
        }
      } catch (putErr) {
        await updatePlan(selectedPlan.id, input, profile?.email || "super_admin");
        toast.success(`Plan "${selectedPlan.name}" updated!`);
      }

      // Real-time multi-tab sync notice
      if (typeof window !== "undefined") {
        try {
          const ch = new BroadcastChannel("school_study_realtime_sync");
          ch.postMessage({ type: "PLAN_UPDATED", planId: selectedPlan.id, timestamp: Date.now() });
          ch.close();
        } catch {}
        try {
          localStorage.setItem(
            "school_study_plan_updated",
            JSON.stringify({ type: "PLAN_UPDATED", planId: selectedPlan.id, timestamp: Date.now() })
          );
        } catch {}
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
      try {
        const apiRes = await fetch("/api/super-admin/pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "duplicate",
            sourcePlanId: selectedPlan.id,
            newSlug: duplicateSlug,
            newName: duplicateName,
            actorId: profile?.email || "super_admin",
          }),
        });

        if (apiRes.ok) {
          toast.success(`Plan duplicated as "${duplicateName}" with Version 1!`);
        } else {
          await duplicatePlan(selectedPlan.id, duplicateSlug, duplicateName, profile?.email || "super_admin");
          toast.success(`Plan duplicated as "${duplicateName}" with Version 1!`);
        }
      } catch (dupErr) {
        await duplicatePlan(selectedPlan.id, duplicateSlug, duplicateName, profile?.email || "super_admin");
        toast.success(`Plan duplicated as "${duplicateName}" with Version 1!`);
      }

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
      try {
        const apiRes = await fetch(`/api/super-admin/pricing?planId=${encodeURIComponent(planToDelete.id)}&actorId=${encodeURIComponent(profile?.email || "super_admin")}`, {
          method: "DELETE",
        });

        if (apiRes.ok) {
          const json = await apiRes.json();
          toast.success(json.message || `Plan "${planToDelete.name}" deleted successfully.`);
        } else {
          await deletePlan(planToDelete.id, profile?.email || "super_admin");
          toast.success(`Plan "${planToDelete.name}" deleted successfully.`);
        }
      } catch (delErr) {
        await deletePlan(planToDelete.id, profile?.email || "super_admin");
        toast.success(`Plan "${planToDelete.name}" deleted successfully.`);
      }

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
      try {
        const apiRes = await fetch("/api/super-admin/pricing", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: plan.id,
            action: "toggle_status",
            status: newStatus,
            actorId: profile?.email || "super_admin",
          }),
        });

        if (apiRes.ok) {
          toast.success(`Plan "${plan.name}" status updated to ${newStatus}`);
        } else {
          await togglePlanStatus(plan.id, newStatus, profile?.email || "super_admin");
          toast.success(`Plan "${plan.name}" status updated to ${newStatus}`);
        }
      } catch (togErr) {
        await togglePlanStatus(plan.id, newStatus, profile?.email || "super_admin");
        toast.success(`Plan "${plan.name}" status updated to ${newStatus}`);
      }

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
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-xl transition-all border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {activeTab === "plans" && (
            <>
              <button
                onClick={() => openAssignModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <School className="h-4 w-4" />
                <span>Assign Plan to School</span>
              </button>
              <button
                onClick={() => openCreateModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Plan</span>
              </button>
            </>
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
              {/* Plans Filter & Controls Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {(["ALL", "ACTIVE", "INACTIVE", "ARCHIVED"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setPlanFilterPill(status)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        planFilterPill === status
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {status === "ALL"
                        ? `All Plans (${plans.length})`
                        : status === "ACTIVE"
                        ? `Active (${plans.filter((p) => p.status === "ACTIVE" && !p.isArchived).length})`
                        : status === "INACTIVE"
                        ? `Inactive (${plans.filter((p) => p.status === "INACTIVE" && !p.isArchived).length})`
                        : `Archived (${plans.filter((p) => p.isArchived || p.status === "ARCHIVED").length})`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative flex-1 sm:w-64">
                    <input
                      type="text"
                      placeholder="Search plans by name, slug..."
                      value={planSearch}
                      onChange={(e) => setPlanSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                    <Sliders className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  </div>

                  {/* View Mode Toggle */}
                  <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setPlanViewMode("grid")}
                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        planViewMode === "grid"
                          ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm font-bold"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                      title="Cards Grid View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cards</span>
                    </button>
                    <button
                      onClick={() => setPlanViewMode("table")}
                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        planViewMode === "table"
                          ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm font-bold"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                      title="Dense Table View"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Table</span>
                    </button>
                  </div>
                </div>
              </div>

              {filteredPlans.length === 0 ? (
                <div className="text-center p-12 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3">
                  <Sliders className="h-10 w-10 text-gray-400 mx-auto" />
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    No plans matching current filter criteria.
                  </p>
                  <button
                    onClick={() => {
                      setPlanFilterPill("ALL");
                      setPlanSearch("");
                    }}
                    className="px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-xl"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : planViewMode === "grid" ? (
                /* 1. CARDS GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPlans.map((p) => {
                    const ver = activeVersions[p.id];
                    const monthlyRs = ver
                      ? ver.monthlyPrice / 100
                      : p.slug === "professional"
                      ? 1999
                      : p.slug === "enterprise"
                      ? 9999
                      : 999;
                    const annualRs = ver
                      ? ver.annualPrice / 100
                      : p.slug === "professional"
                      ? 1599
                      : p.slug === "enterprise"
                      ? 7999
                      : 799;
                    const savingsPercent =
                      monthlyRs > 0 ? Math.round(((monthlyRs - annualRs) / monthlyRs) * 100) : 0;

                    return (
                      <div
                        key={p.id}
                        className={`relative rounded-3xl border bg-white dark:bg-slate-900 p-6 shadow-sm transition-all duration-200 flex flex-col justify-between ${
                          p.isPopular
                            ? "border-amber-400/80 dark:border-amber-500/60 ring-2 ring-amber-400/20 shadow-amber-500/5"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
                        }`}
                      >
                        {/* Top Details */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                  {p.name}
                                </h3>
                                {p.isPopular && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    POPULAR
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-mono text-slate-400">slug: {p.slug}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleToggleStatus(p)}
                                title="Click to toggle status"
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                                  p.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100"
                                    : p.status === "INACTIVE"
                                    ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800"
                                }`}
                              >
                                {p.status}
                              </button>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  p.publicVisible === false
                                    ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300"
                                }`}
                              >
                                {p.publicVisible === false ? "Private" : "Public"}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 min-h-[32px] line-clamp-2">
                            {p.description || "No description provided."}
                          </p>

                          {/* Pricing Block */}
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 mb-5">
                            <div className="flex items-baseline justify-between">
                              <div>
                                <span className="text-xs font-semibold text-slate-400">Monthly</span>
                                <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                                  <span>₹{monthlyRs.toLocaleString("en-IN")}</span>
                                  <span className="text-xs font-semibold text-slate-400">/ mo</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-xs font-semibold text-slate-400">Annual</span>
                                <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 flex items-baseline justify-end gap-1">
                                  <span>₹{annualRs.toLocaleString("en-IN")}</span>
                                  <span className="text-xs font-semibold text-slate-400">/ mo</span>
                                </div>
                              </div>
                            </div>

                            {savingsPercent > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                                <span className="text-slate-500">Billed yearly</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                  Save {savingsPercent}% on Annual
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Capacity Limits Grid */}
                          <div className="grid grid-cols-2 gap-2 mb-5 text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">Students</span>
                              <span className="font-extrabold text-slate-900 dark:text-white">
                                {p.limits?.maxStudents === -1
                                  ? "Unlimited"
                                  : (p.limits?.maxStudents || 500).toLocaleString()}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">Teachers</span>
                              <span className="font-extrabold text-slate-900 dark:text-white">
                                {p.limits?.maxTeachers === -1
                                  ? "Unlimited"
                                  : (p.limits?.maxTeachers || 20).toLocaleString()}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">Classes</span>
                              <span className="font-extrabold text-slate-900 dark:text-white">
                                {p.limits?.maxClasses === -1
                                  ? "Unlimited"
                                  : (p.limits?.maxClasses || 15).toLocaleString()}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">Staff</span>
                              <span className="font-extrabold text-slate-900 dark:text-white">
                                {p.limits?.maxStaffAccounts === -1
                                  ? "Unlimited"
                                  : (p.limits?.maxStaffAccounts || 2).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Feature Highlights */}
                          <div className="space-y-1.5 mb-5 text-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Features ({p.features?.length || 0})
                            </span>
                            {(p.features || []).slice(0, 4).map((f) => (
                              <div key={f} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="truncate capitalize">{f.replace(/_/g, " ")}</span>
                              </div>
                            ))}
                            {(p.features?.length || 0) > 4 && (
                              <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 pt-1">
                                +{(p.features?.length || 0) - 4} additional modules
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Bottom Actions Bar */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <button
                            onClick={() => openAssignModal(p)}
                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition active:scale-98"
                          >
                            <School className="w-4 h-4" />
                            <span>Assign to School</span>
                          </button>

                          <div className="flex items-center justify-between gap-1.5">
                            <button
                              onClick={() => openEditModal(p)}
                              className="flex-1 py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                            >
                              <Edit className="w-3.5 h-3.5 text-blue-600" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => openDuplicateModal(p)}
                              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                              title="Duplicate Plan"
                            >
                              <Copy className="w-3.5 h-3.5 text-purple-600" />
                            </button>
                            <button
                              onClick={() => openHistoryModal(p)}
                              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                              title="Version History"
                            >
                              <History className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                            <button
                              onClick={() => openDeletePlanModal(p)}
                              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition"
                              title="Delete Plan Safely"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 2. DENSE TABLE VIEW */
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
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
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredPlans.map((p) => {
                          const ver = activeVersions[p.id];
                          const monthlyRs = ver ? (ver.monthlyPrice / 100).toLocaleString("en-IN") : "0";
                          const annualRs = ver ? (ver.annualPrice / 100).toLocaleString("en-IN") : "0";

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 dark:text-white text-base">{p.name}</span>
                                  {p.isPopular && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-800">
                                      POPULAR
                                    </span>
                                  )}
                                  {p.publicVisible === false ? (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full border border-slate-300 dark:border-slate-700">
                                      PRIVATE
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                                      PUBLIC
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-mono text-slate-400 mt-0.5">slug: {p.slug}</div>
                              </td>
                              <td className="px-4 py-4">
                                <button
                                  onClick={() => handleToggleStatus(p)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                                    p.status === "ACTIVE"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100"
                                      : p.status === "INACTIVE"
                                      ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800"
                                  }`}
                                >
                                  {p.status === "ACTIVE" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Archive className="h-3.5 w-3.5" />
                                  )}
                                  <span>{p.status}</span>
                                </button>
                              </td>
                              <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">
                                ₹{monthlyRs}
                                <span className="text-xs font-normal text-slate-500">/mo</span>
                              </td>
                              <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">
                                ₹{annualRs}
                                <span className="text-xs font-normal text-slate-500">/mo</span>
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
                              <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400">
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {p.features?.length || 0} Features
                                </span>
                              </td>
                              <td className="px-4 py-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                                <div>{p.limits?.maxStudents === -1 ? "Unlimited" : `${p.limits?.maxStudents || 500} Students`}</div>
                                <div className="text-[11px] text-slate-400">
                                  {p.limits?.maxTeachers === -1 ? "Unlimited Teachers" : `${p.limits?.maxTeachers || 20} Teachers`}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openAssignModal(p)}
                                    className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                                    title="Assign to School"
                                  >
                                    <School className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openEditModal(p)}
                                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Edit Plan & Version"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openDuplicateModal(p)}
                                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Duplicate Plan"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openHistoryModal(p)}
                                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    title="View Version History"
                                  >
                                    <History className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openDeletePlanModal(p)}
                                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
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

      {/* ========================================================================= */}
      {/* EXECUTIVE PLAN STUDIO: CREATE NEW PLAN MODAL                              */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Studio Header */}
            <div className="p-5 border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Executive Plan Studio
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                      Create Dynamic Plan
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Define custom subscription tiers, pricing models, capacity quotas, and feature gating.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Studio Navigation Tabs */}
            <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50/40 dark:bg-slate-900/20 overflow-x-auto shrink-0">
              {[
                { id: "general", label: "General Details", icon: Sliders },
                { id: "pricing", label: "Pricing & GST", icon: IndianRupee },
                { id: "limits", label: "Quotas & Capacity", icon: Users },
                { id: "features", label: "Modules & Features", icon: Layers },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = planStudioTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPlanStudioTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap",
                      active
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Studio Body: Left Controls + Right Live Preview */}
            <form onSubmit={handleCreatePlan} className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Form Tab Controls */}
                <div className="lg:col-span-7 space-y-5">
                  {/* TAB 1: GENERAL */}
                  {planStudioTab === "general" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Plan Display Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={createForm.name}
                            onChange={(e) => {
                              const newName = e.target.value;
                              const autoSlug = newName.toLowerCase().trim().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
                              setCreateForm((prev) => ({
                                ...prev,
                                name: newName,
                                slug: prev.slug === "" || prev.slug === autoSlug.slice(0, -1) ? autoSlug : prev.slug,
                              }));
                            }}
                            placeholder="e.g. Starter, Growth, Premium"
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Unique Plan Slug *
                          </label>
                          <input
                            type="text"
                            required
                            value={createForm.slug}
                            onChange={(e) =>
                              setCreateForm({
                                ...createForm,
                                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                              })
                            }
                            placeholder="e.g. starter"
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={createForm.description}
                          onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                          placeholder="Brief description of who this plan is for and what benefits it offers..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Initial Plan Status
                          </label>
                          <select
                            value={createForm.status}
                            onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as PlanStatus })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="ACTIVE">ACTIVE (Available immediately)</option>
                            <option value="INACTIVE">INACTIVE (Hidden / Draft)</option>
                            <option value="ARCHIVED">ARCHIVED</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Display Sort Priority
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={createForm.displayOrder}
                            onChange={(e) => setCreateForm({ ...createForm, displayOrder: Number(e.target.value) })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={createForm.publicVisible}
                            onChange={(e) => setCreateForm({ ...createForm, publicVisible: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Publicly Visible on Pricing Page
                            </span>
                            <p className="text-[11px] text-slate-500">
                              When enabled, institutions and prospective clients can view and select this tier on /pricing.
                            </p>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={createForm.isPopular}
                            onChange={(e) => setCreateForm({ ...createForm, isPopular: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Mark as &quot;Most Popular&quot; Tier
                            </span>
                            <p className="text-[11px] text-slate-500">
                              Highlights this card with a distinguished glowing border and a &quot;POPULAR&quot; badge.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PRICING & GST */}
                  {planStudioTab === "pricing" && (
                    <div className="space-y-5 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Monthly Subscription Price (₹) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                            <input
                              type="number"
                              min={0}
                              required
                              value={createForm.monthlyPriceRupees}
                              onChange={(e) =>
                                setCreateForm({ ...createForm, monthlyPriceRupees: Number(e.target.value) })
                              }
                              className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-base font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 mt-1 block">Billed every month</span>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Annual Equivalent Price (₹/mo) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                            <input
                              type="number"
                              min={0}
                              required
                              value={createForm.annualPriceRupees}
                              onChange={(e) =>
                                setCreateForm({ ...createForm, annualPriceRupees: Number(e.target.value) })
                              }
                              className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-base font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 mt-1 block">
                            Total: ₹{(createForm.annualPriceRupees * 12).toLocaleString("en-IN")}/yr billed annually
                          </span>
                        </div>
                      </div>

                      {/* Annual Discount Calculator Badge */}
                      {createForm.monthlyPriceRupees > 0 && (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                              Annual Incentive:{" "}
                              {createForm.monthlyPriceRupees > createForm.annualPriceRupees
                                ? `${Math.round(
                                    ((createForm.monthlyPriceRupees - createForm.annualPriceRupees) /
                                      createForm.monthlyPriceRupees) *
                                      100
                                  )}% Discount`
                                : "No discount"}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            Saves ₹
                            {Math.max(
                              0,
                              (createForm.monthlyPriceRupees - createForm.annualPriceRupees) * 12
                            ).toLocaleString("en-IN")}
                            /yr
                          </span>
                        </div>
                      )}

                      {/* Live GST Tax Breakdown Preview */}
                      <div className="p-4 rounded-2xl bg-slate-900 text-white font-mono text-xs space-y-3">
                        <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                          <span className="font-bold flex items-center gap-1.5 text-slate-200">
                            <Receipt className="h-4 w-4 text-blue-400" />
                            GST Invoice Breakdown ({gstSettings.gstPercentage}%)
                          </span>
                          <span className="text-[10px]">
                            {gstSettings.gstEnabled ? "GST ACTIVE" : "GST EXEMPT"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-1">
                          <div className="space-y-1">
                            <span className="text-slate-400 block text-[10px]">Monthly Total (with GST)</span>
                            <span className="text-base font-bold text-emerald-400 font-sans">
                              ₹
                              {(
                                createForm.monthlyPriceRupees *
                                (1 + (gstSettings.gstEnabled ? gstSettings.gstPercentage / 100 : 0))
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-slate-400 block text-[10px]">Annual Billed (with GST)</span>
                            <span className="text-base font-bold text-blue-400 font-sans">
                              ₹
                              {(
                                createForm.annualPriceRupees *
                                12 *
                                (1 + (gstSettings.gstEnabled ? gstSettings.gstPercentage / 100 : 0))
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: QUOTAS & LIMITS */}
                  {planStudioTab === "limits" && (
                    <div className="space-y-5 animate-in fade-in duration-150">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
                        Set maximum capacity limits for this tier. Use <strong>-1</strong> for Unlimited capacity.
                      </div>

                      {/* Max Students */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Maximum Students Allowed
                          </label>
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            {createForm.maxStudents === -1 ? "Unlimited" : createForm.maxStudents.toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="number"
                          value={createForm.maxStudents}
                          onChange={(e) => setCreateForm({ ...createForm, maxStudents: Number(e.target.value) })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[250, 500, 1000, 2500, 5000, -1].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setCreateForm({ ...createForm, maxStudents: val })}
                              className={cn(
                                "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all",
                                createForm.maxStudents === val
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              )}
                            >
                              {val === -1 ? "Unlimited" : val.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Max Teachers */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Faculty & Teachers Limit
                          </label>
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            {createForm.maxTeachers === -1 ? "Unlimited" : createForm.maxTeachers.toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="number"
                          value={createForm.maxTeachers}
                          onChange={(e) => setCreateForm({ ...createForm, maxTeachers: Number(e.target.value) })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[10, 25, 50, 100, 250, -1].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setCreateForm({ ...createForm, maxTeachers: val })}
                              className={cn(
                                "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all",
                                createForm.maxTeachers === val
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              )}
                            >
                              {val === -1 ? "Unlimited" : val.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Max Classes */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Classes & Sections Limit
                          </label>
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            {createForm.maxClasses === -1 ? "Unlimited" : createForm.maxClasses.toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="number"
                          value={createForm.maxClasses}
                          onChange={(e) => setCreateForm({ ...createForm, maxClasses: Number(e.target.value) })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[10, 20, 40, 80, 150, -1].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setCreateForm({ ...createForm, maxClasses: val })}
                              className={cn(
                                "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all",
                                createForm.maxClasses === val
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              )}
                            >
                              {val === -1 ? "Unlimited" : val.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Max Staff Accounts */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Admin & Staff Seats
                          </label>
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            {createForm.maxStaffAccounts === -1 ? "Unlimited" : createForm.maxStaffAccounts.toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="number"
                          value={createForm.maxStaffAccounts}
                          onChange={(e) => setCreateForm({ ...createForm, maxStaffAccounts: Number(e.target.value) })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[2, 5, 10, 25, 50, -1].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setCreateForm({ ...createForm, maxStaffAccounts: val })}
                              className={cn(
                                "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all",
                                createForm.maxStaffAccounts === val
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              )}
                            >
                              {val === -1 ? "Unlimited" : val.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: FEATURES & MODULES */}
                  {planStudioTab === "features" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Quick actions */}
                      <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Presets:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newAccess = getDefaultFeatureAccess(initialCreateFeatures);
                            setCreateForm({ ...createForm, featureAccess: newAccess, features: initialCreateFeatures });
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        >
                          Core Modules Only
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newAccess: Record<string, FeatureAccessMode> = {};
                            const allKeys: string[] = [];
                            FEATURE_REGISTRY.forEach((f) => {
                              newAccess[f.key] = "FULL_ACCESS";
                              allKeys.push(f.key);
                            });
                            setCreateForm({ ...createForm, featureAccess: newAccess, features: allKeys });
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        >
                          Full Access All
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newAccess: Record<string, FeatureAccessMode> = {};
                            const coreKeys: string[] = [...initialCreateFeatures];
                            FEATURE_REGISTRY.forEach((f) => {
                              newAccess[f.key] = coreKeys.includes(f.key) ? "FULL_ACCESS" : "SHOWCASE";
                            });
                            setCreateForm({ ...createForm, featureAccess: newAccess, features: coreKeys });
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        >
                          Showcase All Non-Core
                        </button>
                      </div>

                      {/* Module 3-Way Access List */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                        {FEATURE_REGISTRY.map((feat) => {
                          const currentMode =
                            createForm.featureAccess?.[feat.key] ||
                            (createForm.features.includes(feat.key) ? "FULL_ACCESS" : "HIDDEN");
                          return (
                            <div
                              key={feat.key}
                              className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <div className="min-w-0 pr-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {feat.displayName}
                                  </span>
                                  <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {feat.category}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate">{feat.description}</p>
                              </div>

                              <div className="shrink-0">
                                <select
                                  value={currentMode}
                                  onChange={(e) => {
                                    const newMode = e.target.value as FeatureAccessMode;
                                    const newAccess = { ...createForm.featureAccess, [feat.key]: newMode };
                                    let newFeatures = [...createForm.features];
                                    if (newMode === "FULL_ACCESS") {
                                      if (!newFeatures.includes(feat.key)) newFeatures.push(feat.key);
                                    } else {
                                      newFeatures = newFeatures.filter((k) => k !== feat.key);
                                    }
                                    setCreateForm({ ...createForm, featureAccess: newAccess, features: newFeatures });
                                  }}
                                  className={cn(
                                    "px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none transition-colors",
                                    currentMode === "FULL_ACCESS"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                                      : currentMode === "SHOWCASE"
                                      ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800"
                                      : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                  )}
                                >
                                  <option value="FULL_ACCESS">✓ FULL ACCESS</option>
                                  <option value="SHOWCASE">🔒 SHOWCASE</option>
                                  <option value="HIDDEN">— HIDDEN</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Granular Permission Tree */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Granular Sub-Capabilities & Action Permissions
                        </label>
                        <GranularPermissionTree
                          featureAccess={createForm.featureAccess}
                          onChangeFeatureAccess={(access) => setCreateForm({ ...createForm, featureAccess: access })}
                          selectedPermissions={createForm.features}
                          onChangeSelected={(keys: string[]) => setCreateForm({ ...createForm, features: keys })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Panel: Live Interactive Plan Card Preview */}
                <div className="lg:col-span-5 flex flex-col">
                  <div className="sticky top-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                        Live Card Preview
                      </span>
                      {/* Cycle Toggle */}
                      <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setPreviewBillingCycle("monthly")}
                          className={cn(
                            "px-2 py-0.5 rounded-md transition-all",
                            previewBillingCycle === "monthly"
                              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                              : "text-slate-500"
                          )}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewBillingCycle("annual")}
                          className={cn(
                            "px-2 py-0.5 rounded-md transition-all",
                            previewBillingCycle === "annual"
                              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                              : "text-slate-500"
                          )}
                        >
                          Annual
                        </button>
                      </div>
                    </div>

                    {/* Preview Card */}
                    <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-xl space-y-4">
                      {createForm.isPopular && (
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-600 to-indigo-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-md">
                          Most Popular
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold uppercase">
                          slug: {createForm.slug || "new-plan"}
                        </span>
                        <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                          {createForm.name || "Untitled Plan"}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                          {createForm.description || "No description provided."}
                        </p>
                      </div>

                      {/* Pricing Display */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-700/60">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            ₹
                            {previewBillingCycle === "annual"
                              ? createForm.annualPriceRupees.toLocaleString("en-IN")
                              : createForm.monthlyPriceRupees.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">/ month</span>
                        </div>
                        {previewBillingCycle === "annual" && (
                          <div className="mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            Billed ₹{(createForm.annualPriceRupees * 12).toLocaleString("en-IN")}/year
                          </div>
                        )}
                      </div>

                      {/* Limits Summary Chips */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Students</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {createForm.maxStudents === -1 ? "Unlimited" : createForm.maxStudents.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Teachers</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {createForm.maxTeachers === -1 ? "Unlimited" : createForm.maxTeachers.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Classes</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {createForm.maxClasses === -1 ? "Unlimited" : createForm.maxClasses.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Staff Seats</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {createForm.maxStaffAccounts === -1 ? "Unlimited" : createForm.maxStaffAccounts.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Included & Showcase Features List */}
                      <div className="space-y-2 pt-1 border-t border-slate-150 dark:border-slate-800 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Feature Entitlements ({createForm.features.length} Enabled)
                        </span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {FEATURE_REGISTRY.map((feat) => {
                            const mode =
                              createForm.featureAccess?.[feat.key] ||
                              (createForm.features.includes(feat.key) ? "FULL_ACCESS" : "HIDDEN");
                            if (mode === "HIDDEN") return null;
                            return (
                              <div key={feat.key} className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-700 dark:text-slate-300 truncate">{feat.displayName}</span>
                                {mode === "FULL_ACCESS" ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                                    <Lock className="h-2.5 w-2.5" /> Showcase
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs opacity-90 cursor-default shadow-md"
                      >
                        Subscribe to {createForm.name || "Plan"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Studio Footer */}
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {planStudioTab !== "general" && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ["general", "pricing", "limits", "features"];
                        const idx = tabs.indexOf(planStudioTab);
                        if (idx > 0) setPlanStudioTab(tabs[idx - 1] as any);
                      }}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      ← Previous Tab
                    </button>
                  )}
                  {planStudioTab !== "features" && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ["general", "pricing", "limits", "features"];
                        const idx = tabs.indexOf(planStudioTab);
                        if (idx < tabs.length - 1) setPlanStudioTab(tabs[idx + 1] as any);
                      }}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Next Tab →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !createForm.name || !createForm.slug}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{saving ? "Publishing Plan..." : "Create Dynamic Plan"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXECUTIVE PLAN STUDIO: EDIT PLAN MODAL                                    */}
      {/* ========================================================================= */}
      {showEditModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Studio Header */}
            <div className="p-5 border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Edit Plan: {selectedPlan.name}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      slug: {selectedPlan.slug}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      v{selectedPlan.version || 1}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update prices, capacity quotas, GST configuration, and active feature gates.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Studio Navigation Tabs */}
            <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50/40 dark:bg-slate-900/20 overflow-x-auto shrink-0">
              {[
                { id: "general", label: "General Details", icon: Sliders },
                { id: "pricing", label: "Pricing & GST", icon: IndianRupee },
                { id: "limits", label: "Quotas & Capacity", icon: Users },
                { id: "features", label: "Modules & Features", icon: Layers },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = planStudioTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPlanStudioTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap",
                      active
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Studio Body: Left Controls + Right Live Preview */}
            <form onSubmit={handleEditFormSubmit} className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Form Tab Controls */}
                <div className="lg:col-span-7 space-y-5">
                  {/* TAB 1: GENERAL */}
                  {planStudioTab === "general" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Plan Display Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Plan Identifier (Slug)
                          </label>
                          <input
                            type="text"
                            disabled
                            value={selectedPlan.slug}
                            className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono text-slate-500 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Plan description..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Plan Status
                          </label>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as PlanStatus })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="ACTIVE">ACTIVE (Available for subscriptions)</option>
                            <option value="INACTIVE">INACTIVE (Hidden / Inactive)</option>
                            <option value="ARCHIVED">ARCHIVED</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Display Sort Priority
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={editForm.displayOrder}
                            onChange={(e) => setEditForm({ ...editForm, displayOrder: Number(e.target.value) })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.publicVisible}
                            onChange={(e) => setEditForm({ ...editForm, publicVisible: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Publicly Visible on Pricing Page
                            </span>
                            <p className="text-[11px] text-slate-500">
                              Show this plan card on the public /pricing tier table.
                            </p>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.isPopular}
                            onChange={(e) => setEditForm({ ...editForm, isPopular: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Mark as &quot;Most Popular&quot; Tier
                            </span>
                            <p className="text-[11px] text-slate-500">
                              Highlights this card with distinctive glowing badges and CTA styling.
                            </p>
                          </div>
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Version Change Notes (Audit Log)
                        </label>
                        <input
                          type="text"
                          value={editForm.changeNotes}
                          onChange={(e) => setEditForm({ ...editForm, changeNotes: e.target.value })}
                          placeholder="e.g. Updated student quota to 2,500 and adjusted annual pricing"
                          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PRICING & GST */}
                  {planStudioTab === "pricing" && (
                    <div className="space-y-5 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Monthly Subscription Price (₹)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                            <input
                              type="number"
                              min={0}
                              value={editForm.monthlyPriceRupees}
                              onChange={(e) =>
                                setEditForm({ ...editForm, monthlyPriceRupees: Number(e.target.value) })
                              }
                              className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-base font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 mt-1 block">Billed every month</span>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Annual Equivalent Price (₹/mo)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                            <input
                              type="number"
                              min={0}
                              value={editForm.annualPriceRupees}
                              onChange={(e) =>
                                setEditForm({ ...editForm, annualPriceRupees: Number(e.target.value) })
                              }
                              className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-base font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 mt-1 block">
                            Total: ₹{(editForm.annualPriceRupees * 12).toLocaleString("en-IN")}/yr billed annually
                          </span>
                        </div>
                      </div>

                      {/* Annual Discount Calculator Badge */}
                      {editForm.monthlyPriceRupees > 0 && (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                              Annual Incentive:{" "}
                              {editForm.monthlyPriceRupees > editForm.annualPriceRupees
                                ? `${Math.round(
                                    ((editForm.monthlyPriceRupees - editForm.annualPriceRupees) /
                                      editForm.monthlyPriceRupees) *
                                      100
                                  )}% Discount`
                                : "No discount"}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            Saves ₹
                            {Math.max(
                              0,
                              (editForm.monthlyPriceRupees - editForm.annualPriceRupees) * 12
                            ).toLocaleString("en-IN")}
                            /yr
                          </span>
                        </div>
                      )}

                      {/* Live GST Tax Breakdown Preview */}
                      <div className="p-4 rounded-2xl bg-slate-900 text-white font-mono text-xs space-y-3">
                        <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                          <span className="font-bold flex items-center gap-1.5 text-slate-200">
                            <Receipt className="h-4 w-4 text-blue-400" />
                            GST Invoice Breakdown ({gstSettings.gstPercentage}%)
                          </span>
                          <span className="text-[10px]">
                            {gstSettings.gstEnabled ? "GST ACTIVE" : "GST EXEMPT"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-1">
                          <div className="space-y-1">
                            <span className="text-slate-400 block text-[10px]">Monthly Total (with GST)</span>
                            <span className="text-base font-bold text-emerald-400 font-sans">
                              ₹
                              {(
                                editForm.monthlyPriceRupees *
                                (1 + (gstSettings.gstEnabled ? gstSettings.gstPercentage / 100 : 0))
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-slate-400 block text-[10px]">Annual Billed (with GST)</span>
                            <span className="text-base font-bold text-blue-400 font-sans">
                              ₹
                              {(
                                editForm.annualPriceRupees *
                                12 *
                                (1 + (gstSettings.gstEnabled ? gstSettings.gstPercentage / 100 : 0))
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: QUOTAS & LIMITS */}
                  {planStudioTab === "limits" && (
                    <div className="space-y-5 animate-in fade-in duration-150">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
                        Adjust maximum capacity limits for this tier. Use <strong>-1</strong> for Unlimited capacity.
                      </div>

                      {/* Max Students */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Maximum Students Allowed
                          </label>
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            {editForm.maxStudents === -1 ? "Unlimited" : editForm.maxStudents.toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="number"
                          value={editForm.maxStudents}
                          onChange={(e) => setEditForm({ ...editForm, maxStudents: Number(e.target.value) })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[250, 500, 1000, 2500, 5000, -1].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setEditForm({ ...editForm, maxStudents: val })}
                              className={cn(
                                "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all",
                                editForm.maxStudents === val
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              )}
                            >
                              {val === -1 ? "Unlimited" : val.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Max Teachers */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Faculty & Teachers Limit
                          </label>
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            {editForm.maxTeachers === -1 ? "Unlimited" : editForm.maxTeachers.toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="number"
                          value={editForm.maxTeachers}
                          onChange={(e) => setEditForm({ ...editForm, maxTeachers: Number(e.target.value) })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[10, 25, 50, 100, 250, -1].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setEditForm({ ...editForm, maxTeachers: val })}
                              className={cn(
                                "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all",
                                editForm.maxTeachers === val
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              )}
                            >
                              {val === -1 ? "Unlimited" : val.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Max Classes */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Classes & Sections Limit
                          </label>
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            {editForm.maxClasses === -1 ? "Unlimited" : editForm.maxClasses.toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="number"
                          value={editForm.maxClasses}
                          onChange={(e) => setEditForm({ ...editForm, maxClasses: Number(e.target.value) })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[10, 20, 40, 80, 150, -1].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setEditForm({ ...editForm, maxClasses: val })}
                              className={cn(
                                "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all",
                                editForm.maxClasses === val
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              )}
                            >
                              {val === -1 ? "Unlimited" : val.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Max Staff Accounts */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Admin & Staff Seats
                          </label>
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            {editForm.maxStaffAccounts === -1 ? "Unlimited" : editForm.maxStaffAccounts.toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="number"
                          value={editForm.maxStaffAccounts}
                          onChange={(e) => setEditForm({ ...editForm, maxStaffAccounts: Number(e.target.value) })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[2, 5, 10, 25, 50, -1].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setEditForm({ ...editForm, maxStaffAccounts: val })}
                              className={cn(
                                "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all",
                                editForm.maxStaffAccounts === val
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              )}
                            >
                              {val === -1 ? "Unlimited" : val.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: FEATURES & MODULES */}
                  {planStudioTab === "features" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Quick actions */}
                      <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Presets:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newAccess = getDefaultFeatureAccess(initialCreateFeatures);
                            setEditForm({ ...editForm, featureAccess: newAccess, features: initialCreateFeatures });
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        >
                          Core Modules Only
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newAccess: Record<string, FeatureAccessMode> = {};
                            const allKeys: string[] = [];
                            FEATURE_REGISTRY.forEach((f) => {
                              newAccess[f.key] = "FULL_ACCESS";
                              allKeys.push(f.key);
                            });
                            setEditForm({ ...editForm, featureAccess: newAccess, features: allKeys });
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        >
                          Full Access All
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newAccess: Record<string, FeatureAccessMode> = {};
                            const coreKeys: string[] = [...initialCreateFeatures];
                            FEATURE_REGISTRY.forEach((f) => {
                              newAccess[f.key] = coreKeys.includes(f.key) ? "FULL_ACCESS" : "SHOWCASE";
                            });
                            setEditForm({ ...editForm, featureAccess: newAccess, features: coreKeys });
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        >
                          Showcase All Non-Core
                        </button>
                      </div>

                      {/* Module 3-Way Access List */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                        {FEATURE_REGISTRY.map((feat) => {
                          const currentMode =
                            editForm.featureAccess?.[feat.key] ||
                            (editForm.features.includes(feat.key) ? "FULL_ACCESS" : "HIDDEN");
                          return (
                            <div
                              key={feat.key}
                              className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <div className="min-w-0 pr-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {feat.displayName}
                                  </span>
                                  <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {feat.category}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate">{feat.description}</p>
                              </div>

                              <div className="shrink-0">
                                <select
                                  value={currentMode}
                                  onChange={(e) => {
                                    const newMode = e.target.value as FeatureAccessMode;
                                    const newAccess = { ...editForm.featureAccess, [feat.key]: newMode };
                                    let newFeatures = [...editForm.features];
                                    if (newMode === "FULL_ACCESS") {
                                      if (!newFeatures.includes(feat.key)) newFeatures.push(feat.key);
                                    } else {
                                      newFeatures = newFeatures.filter((k) => k !== feat.key);
                                    }
                                    setEditForm({ ...editForm, featureAccess: newAccess, features: newFeatures });
                                  }}
                                  className={cn(
                                    "px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none transition-colors",
                                    currentMode === "FULL_ACCESS"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                                      : currentMode === "SHOWCASE"
                                      ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800"
                                      : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                  )}
                                >
                                  <option value="FULL_ACCESS">✓ FULL ACCESS</option>
                                  <option value="SHOWCASE">🔒 SHOWCASE</option>
                                  <option value="HIDDEN">— HIDDEN</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Granular Permission Tree */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Granular Sub-Capabilities & Action Permissions
                        </label>
                        <GranularPermissionTree
                          featureAccess={editForm.featureAccess}
                          onChangeFeatureAccess={(access) => setEditForm({ ...editForm, featureAccess: access })}
                          selectedPermissions={editForm.features}
                          onChangeSelected={(keys: string[]) => setEditForm({ ...editForm, features: keys })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Panel: Live Interactive Plan Card Preview */}
                <div className="lg:col-span-5 flex flex-col">
                  <div className="sticky top-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                        Live Card Preview
                      </span>
                      {/* Cycle Toggle */}
                      <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setPreviewBillingCycle("monthly")}
                          className={cn(
                            "px-2 py-0.5 rounded-md transition-all",
                            previewBillingCycle === "monthly"
                              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                              : "text-slate-500"
                          )}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewBillingCycle("annual")}
                          className={cn(
                            "px-2 py-0.5 rounded-md transition-all",
                            previewBillingCycle === "annual"
                              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                              : "text-slate-500"
                          )}
                        >
                          Annual
                        </button>
                      </div>
                    </div>

                    {/* Preview Card */}
                    <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-xl space-y-4">
                      {editForm.isPopular && (
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-600 to-indigo-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-md">
                          Most Popular
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold uppercase">
                          slug: {selectedPlan.slug}
                        </span>
                        <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                          {editForm.name || selectedPlan.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                          {editForm.description || "No description provided."}
                        </p>
                      </div>

                      {/* Pricing Display */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-700/60">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            ₹
                            {previewBillingCycle === "annual"
                              ? editForm.annualPriceRupees.toLocaleString("en-IN")
                              : editForm.monthlyPriceRupees.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">/ month</span>
                        </div>
                        {previewBillingCycle === "annual" && (
                          <div className="mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            Billed ₹{(editForm.annualPriceRupees * 12).toLocaleString("en-IN")}/year
                          </div>
                        )}
                      </div>

                      {/* Limits Summary Chips */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Students</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {editForm.maxStudents === -1 ? "Unlimited" : editForm.maxStudents.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Teachers</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {editForm.maxTeachers === -1 ? "Unlimited" : editForm.maxTeachers.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Classes</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {editForm.maxClasses === -1 ? "Unlimited" : editForm.maxClasses.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Staff Seats</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {editForm.maxStaffAccounts === -1 ? "Unlimited" : editForm.maxStaffAccounts.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Included & Showcase Features List */}
                      <div className="space-y-2 pt-1 border-t border-slate-150 dark:border-slate-800 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Feature Entitlements ({editForm.features.length} Enabled)
                        </span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {FEATURE_REGISTRY.map((feat) => {
                            const mode =
                              editForm.featureAccess?.[feat.key] ||
                              (editForm.features.includes(feat.key) ? "FULL_ACCESS" : "HIDDEN");
                            if (mode === "HIDDEN") return null;
                            return (
                              <div key={feat.key} className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-700 dark:text-slate-300 truncate">{feat.displayName}</span>
                                {mode === "FULL_ACCESS" ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                                    <Lock className="h-2.5 w-2.5" /> Showcase
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs opacity-90 cursor-default shadow-md"
                      >
                        Subscribe to {editForm.name || selectedPlan.name}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Studio Footer */}
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {planStudioTab !== "general" && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ["general", "pricing", "limits", "features"];
                        const idx = tabs.indexOf(planStudioTab);
                        if (idx > 0) setPlanStudioTab(tabs[idx - 1] as any);
                      }}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      ← Previous Tab
                    </button>
                  )}
                  {planStudioTab !== "features" && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ["general", "pricing", "limits", "features"];
                        const idx = tabs.indexOf(planStudioTab);
                        if (idx < tabs.length - 1) setPlanStudioTab(tabs[idx + 1] as any);
                      }}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Next Tab →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !editForm.name}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
                  </button>
                </div>
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

      {/* ASSIGN PLAN TO SCHOOL MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <School className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Assign Plan to School</h3>
                  <p className="text-xs text-gray-500">Upgrade, downgrade, or extend a school's subscription plan</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-sm">
              {/* School Select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Select School *
                  </label>
                  <button
                    type="button"
                    onClick={() => openAssignModal(plans.find((p) => p.id === assignForm.planId))}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 hover:underline"
                    disabled={loadingSchools}
                  >
                    <RefreshCw className={cn("w-3 h-3", loadingSchools && "animate-spin")} />
                    Refresh Schools
                  </button>
                </div>
                {loadingSchools ? (
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 text-xs text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Loading registered schools...</span>
                  </div>
                ) : schoolsList.length === 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                    No schools registered in system yet.
                  </div>
                ) : (
                  <select
                    required
                    value={assignForm.schoolId}
                    onChange={(e) => setAssignForm({ ...assignForm, schoolId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  >
                    <option value="" disabled>-- Select School ({schoolsList.length} Available) --</option>
                    {schoolsList.map((sch) => (
                      <option key={sch.id} value={sch.id}>
                        {sch.name} {sch.email ? `(${sch.email})` : `(${sch.id})`} {sch.planId ? `[Plan: ${sch.planId}]` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Plan Select */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Select Subscription Plan *
                </label>
                <select
                  required
                  value={assignForm.planId}
                  onChange={(e) => setAssignForm({ ...assignForm, planId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white"
                >
                  <option value="" disabled>-- Select Plan --</option>
                  {plans.map((p) => {
                    const ver = activeVersions[p.id];
                    const price = ver ? ver.monthlyPrice / 100 : 999;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{price}/mo ({p.status})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Billing Cycle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Billing Cycle
                  </label>
                  <select
                    value={assignForm.billingCycle}
                    onChange={(e) => setAssignForm({ ...assignForm, billingCycle: e.target.value as "monthly" | "annual" })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual (Yearly)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Validity Duration
                  </label>
                  <select
                    value={assignForm.durationPreset}
                    onChange={(e) => setAssignForm({ ...assignForm, durationPreset: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white"
                  >
                    <option value="30">30 Days (1 Month)</option>
                    <option value="90">90 Days (Quarterly)</option>
                    <option value="180">180 Days (Half Year)</option>
                    <option value="365">365 Days (1 Year)</option>
                    <option value="lifetime">Lifetime (10 Years)</option>
                    <option value="custom">Custom Date</option>
                  </select>
                </div>
              </div>

              {/* Custom Date Input */}
              {assignForm.durationPreset === "custom" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Custom Expiration Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={assignForm.customDate}
                    onChange={(e) => setAssignForm({ ...assignForm, customDate: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* Reason / Admin Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Reason / Notes for Audit Log
                </label>
                <input
                  type="text"
                  value={assignForm.reason}
                  onChange={(e) => setAssignForm({ ...assignForm, reason: e.target.value })}
                  placeholder="e.g. Manual promotion, annual enterprise contract, payment received via NEFT"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningPlan || !assignForm.schoolId || !assignForm.planId}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  {assigningPlan ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Confirm & Assign Plan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
