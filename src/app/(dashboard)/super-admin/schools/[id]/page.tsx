"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  Users,
  GraduationCap,
  BookOpen,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Power,
  Search,
  Layers,
  Shield,
  Calendar,
  Eye,
  ExternalLink,
  Edit,
  Activity,
  BarChart3,
  Clock,
  Save,
  X,
  Filter,
  Percent,
  Sparkles,
  TrendingUp,
  CreditCard,
  Settings,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  UserCheck,
  AlertTriangle,
  Receipt,
  Download,
  Check,
  Sliders,
} from "lucide-react";
import { getSchoolById, updateSchool, updateSchoolOperationalStatus } from "@/lib/services/school.service";
import { getTeachers } from "@/lib/services/teacher.service";
import { getStudents } from "@/lib/services/student.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { getActivityLogs } from "@/lib/services/audit.service";
import { fetchSchoolUsersExplorer } from "@/lib/services/super-admin.service";
import { UserProfileInspector } from "@/components/super-admin/UserProfileInspector";
import { SuperAdminSchoolEntitlementControlModal } from "@/components/super-admin/SuperAdminSchoolEntitlementControlModal";
import { VerifyBadge, type VerifyBadgeType } from "@/components/common/VerifyBadge";
import { Spinner } from "@/components/common/Spinner";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs, orderBy, limit as fsLimit } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import type {
  School,
  TeacherProfile,
  StudentProfile,
  SchoolClass,
  AppUser,
  ActivityLogEntry,
  SchoolStatus,
} from "@/types";
import { toast } from "sonner";

export default function SchoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = params.id as string;
  const { profile: currentUser } = useAuth();

  const [school, setSchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [schoolActivities, setSchoolActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 9 Canonical Tabs
  const [activeTab, setActiveTab] = useState<
    "overview" | "students" | "teachers" | "classes" | "subscription" | "entitlements" | "payments" | "activity" | "settings"
  >("overview");

  // Search filters
  const [studentSearch, setStudentSearch] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("all");
  const [teacherSearch, setTeacherSearch] = useState("");

  // Subscription state
  const [subData, setSubData] = useState<any>(null);
  const [loadingSub, setLoadingSub] = useState(false);
  const [assigningPlan, setAssigningPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("plan_starter");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [customExpiry, setCustomExpiry] = useState("");

  // Entitlements & Overrides
  const [controlMode, setControlMode] = useState<"FULL_CONTROL" | "LIMITED_CONTROL" | "CUSTOM_ACCESS">("LIMITED_CONTROL");
  const [matrix, setMatrix] = useState<any[]>([]);
  const [featureOverridesMap, setFeatureOverridesMap] = useState<Record<string, boolean>>({});
  const [savingEntitlements, setSavingEntitlements] = useState(false);

  // Payments & Invoices state
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Emergency & Security state
  const [emergencyControl, setEmergencyControl] = useState<any>(null);
  const [emergencyStatus, setEmergencyStatus] = useState<"ACTIVE" | "PAUSED" | "READ_ONLY">("ACTIVE");
  const [killPayments, setKillPayments] = useState(false);
  const [killFees, setKillFees] = useState(false);
  const [killReports, setKillReports] = useState(false);
  const [forceLogoutConfirm, setForceLogoutConfirm] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [savingEmergency, setSavingEmergency] = useState(false);

  // Admin Management form
  const [adminNameInput, setAdminNameInput] = useState("");
  const [adminEmailInput, setAdminEmailInput] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Profile Edit form
  const [profileForm, setProfileForm] = useState({
    name: "",
    code: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    verificationBadge: "none",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Modals
  const [isPlanControlModalOpen, setIsPlanControlModalOpen] = useState(false);

  const loadSchoolData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [schoolRecord, teachersData, studentsData, classesData] = await Promise.all([
        getSchoolById(schoolId),
        getTeachers(schoolId).catch(() => []),
        getStudents(schoolId).catch(() => []),
        getClassesWithSections(schoolId).catch(() => []),
      ]);

      if (!schoolRecord) {
        toast.error("School not found in authoritative records.");
        router.push("/super-admin/schools");
        return;
      }

      setSchool(schoolRecord);
      setTeachers(teachersData);
      setStudents(studentsData);
      setClasses(classesData);

      setProfileForm({
        name: schoolRecord.name || "",
        code: schoolRecord.code || "",
        phone: schoolRecord.phone || "",
        email: schoolRecord.email || "",
        address: schoolRecord.address || "",
        city: schoolRecord.city || "",
        state: schoolRecord.state || "",
        verificationBadge: schoolRecord.verificationBadge || "none",
      });

      setAdminNameInput(schoolRecord.adminName || "");
      setAdminEmailInput(schoolRecord.adminEmail || "");

      // Load sub-resources asynchronously
      loadSubscriptionAndEntitlements();
      loadPaymentsAndInvoices();
      loadTelemetry();
      loadEmergency();
    } catch (err: any) {
      toast.error("Failed to load school: " + (err?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionAndEntitlements = async () => {
    setLoadingSub(true);
    try {
      const [subRes, matrixRes] = await Promise.all([
        fetch(`/api/super-admin/schools/${schoolId}/subscription`).then((r) => r.json()).catch(() => null),
        fetch(`/api/super-admin/schools/${schoolId}/entitlements`).then((r) => r.json()).catch(() => null),
      ]);

      if (subRes?.success) {
        setSubData(subRes.subscription || null);
        setSelectedPlanId(subRes.subscription?.planId || "plan_starter");
        setBillingCycle(subRes.subscription?.billingCycle || "monthly");
        setControlMode(subRes.controlMode || "LIMITED_CONTROL");
        if (subRes.subscription?.expiresAt) {
          setCustomExpiry(subRes.subscription.expiresAt.split("T")[0]);
        }
      }

      if (matrixRes?.success) {
        setMatrix(matrixRes.matrix || []);
        const map: Record<string, boolean> = {};
        (matrixRes.matrix || []).forEach((item: any) => {
          if (item.schoolOverride === "ALLOW") map[item.id] = true;
          if (item.schoolOverride === "DENY") map[item.id] = false;
        });
        setFeatureOverridesMap(map);
      }
    } catch {
      // Non-critical fallback
    } finally {
      setLoadingSub(false);
    }
  };

  const loadPaymentsAndInvoices = async () => {
    setLoadingPayments(true);
    try {
      const db = getFirebaseDb();
      if (db) {
        const [paySnap, invSnap] = await Promise.all([
          getDocs(query(collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments"), where("schoolId", "==", schoolId), fsLimit(30))).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, BILLING_COLLECTIONS.INVOICES || "invoices"), where("schoolId", "==", schoolId), fsLimit(30))).catch(() => ({ docs: [] })),
        ]);

        const loadedPays = (paySnap as any).docs.map((d: any) => ({ id: d.id, ...d.data() }));
        const loadedInvs = (invSnap as any).docs.map((d: any) => ({ id: d.id, ...d.data() }));
        setPayments(loadedPays);
        setInvoices(loadedInvs);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingPayments(false);
    }
  };

  const loadTelemetry = async () => {
    try {
      const logs = await getActivityLogs(50, { schoolId });
      setSchoolActivities(logs);
    } catch {
      // Fallback
    }
  };

  const loadEmergency = async () => {
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/emergency`);
      if (res.ok) {
        const json = await res.json();
        if (json.emergencyControl) {
          setEmergencyControl(json.emergencyControl);
          setEmergencyStatus(json.emergencyControl.status || "ACTIVE");
          setKillPayments(!!json.emergencyControl.disablePayments);
          setKillFees(!!json.emergencyControl.disableFees);
          setKillReports(!!json.emergencyControl.disableReports);
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadSchoolData();
  }, [schoolId]);

  // Status toggle handler
  const handleToggleSchoolStatus = async () => {
    if (!school) return;
    const nextStatus: SchoolStatus = school.status === "active" ? "suspended" : "active";
    try {
      await updateSchoolOperationalStatus(school.id, nextStatus, `Super Admin toggled status to ${nextStatus}`);
      setSchool({ ...school, status: nextStatus });
      toast.success(`School status updated to ${nextStatus.toUpperCase()}.`);
    } catch {
      toast.error("Failed to toggle school status.");
    }
  };

  // Adjust subscription period (extend / reduce / custom date)
  const handleAdjustPeriod = async (action: "EXTEND_EXPIRY" | "REDUCE_EXPIRY" | "ADJUST_EXPIRY", days?: number, customDate?: string) => {
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          expiryDays: days,
          customExpiryDate: customDate,
          reason: "Super Admin duration adjustment",
          actorId: "super_admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to adjust period.");
      toast.success(json.message || "Subscription period successfully updated.");
      loadSubscriptionAndEntitlements();
    } catch (err: any) {
      toast.error(err?.message || "Adjustment failed.");
    }
  };

  // Assign Plan
  const handleAssignPlan = async () => {
    setAssigningPlan(true);
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_PLAN",
          planId: selectedPlanId,
          billingCycle,
          reason: "Super Admin plan assignment",
          actorId: "super_admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to assign plan.");
      toast.success(json.message || "Plan assigned successfully.");
      loadSubscriptionAndEntitlements();
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign plan.");
    } finally {
      setAssigningPlan(false);
    }
  };

  // Save Entitlements & Control Mode
  const handleSaveEntitlements = async () => {
    setSavingEntitlements(true);
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/entitlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controlMode,
          featureOverrides: featureOverridesMap,
          reason: "Super Admin entitlement matrix update",
          actorId: "super_admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update entitlements.");
      toast.success("Entitlements & Control Mode saved successfully.");
      loadSubscriptionAndEntitlements();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save entitlements.");
    } finally {
      setSavingEntitlements(false);
    }
  };

  // Save Emergency Controls
  const handleSaveEmergency = async () => {
    if (!emergencyReason.trim()) {
      toast.error("Mandatory audit reason is required for emergency actions.");
      return;
    }
    setSavingEmergency(true);
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: emergencyStatus,
          disablePayments: killPayments,
          disableFees: killFees,
          disableReports: killReports,
          forceLogoutAll: forceLogoutConfirm,
          reason: emergencyReason,
          actorId: "super_admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update emergency controls.");
      toast.success("Emergency security controls successfully applied.");
      setForceLogoutConfirm(false);
      loadEmergency();
      loadSchoolData();
    } catch (err: any) {
      toast.error(err?.message || "Emergency action failed.");
    } finally {
      setSavingEmergency(false);
    }
  };

  // Save Admin Account Changes
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdmin(true);
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/manage-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminName: adminNameInput.trim(),
          adminEmail: adminEmailInput.trim(),
          newPassword: newAdminPassword.trim() || undefined,
          actorUid: "super_admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update admin.");
      toast.success(json.message || "Admin account updated successfully.");
      setNewAdminPassword("");
      loadSchoolData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update admin.");
    } finally {
      setSavingAdmin(false);
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateSchool(schoolId, {
        name: profileForm.name.trim(),
        code: profileForm.code.trim().toUpperCase(),
        phone: profileForm.phone.trim(),
        email: profileForm.email.trim(),
        address: profileForm.address.trim(),
        city: profileForm.city.trim(),
        state: profileForm.state.trim(),
        verificationBadge: profileForm.verificationBadge === "none" ? null : (profileForm.verificationBadge as any),
      });
      toast.success("School profile updated successfully.");
      loadSchoolData();
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading || !school) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Filtered students
  const filteredStudents = students.filter((st) => {
    if (studentClassFilter !== "all" && st.className !== studentClassFilter && st.classId !== studentClassFilter) {
      return false;
    }
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      return (
        st.name?.toLowerCase().includes(q) ||
        st.admissionNumber?.toLowerCase().includes(q) ||
        String(st.rollNumber || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered teachers
  const filteredTeachers = teachers.filter((t) => {
    if (teacherSearch.trim()) {
      const q = teacherSearch.toLowerCase();
      return (
        t.name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.phone?.toLowerCase().includes(q) ||
        t.teacherCode?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/super-admin/schools"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Command Center
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadSchoolData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-800 hover:bg-purple-100 dark:border-purple-800/40 dark:bg-purple-900/20 dark:text-purple-300"
          >
            <Shield className="h-3.5 w-3.5 text-purple-600" />
            Manage Subscription
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
          <button
            onClick={handleToggleSchoolStatus}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
              school.status === "active"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            {school.status === "active" ? "Suspend School" : "Activate School"}
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {school.logoUrl ? (
              <img
                src={school.logoUrl}
                alt={school.name}
                className="h-16 w-16 rounded-2xl object-contain border border-gray-200 bg-white p-1"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-2xl">
                {school.name ? school.name.charAt(0).toUpperCase() : "S"}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {school.name}
                </h1>
                {school.verificationBadge && school.verificationBadge !== "none" && (
                  <VerifyBadge type={school.verificationBadge as any} size="sm" />
                )}
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold">
                  Code: {school.code}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                    school.status === "active"
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {school.status === "active" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {school.status}
                </span>
                {school.isReadOnly && (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                    READ-ONLY MODE
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-mono text-gray-400">ID: {school.id}</span>
                {school.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    {school.city}{school.state ? `, ${school.state}` : ""}
                  </span>
                )}
                {school.adminEmail && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    {school.adminEmail}
                  </span>
                )}
                <span className="flex items-center gap-1 text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  Created {school.createdAt?.toDate ? school.createdAt.toDate().toLocaleDateString() : "Active"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Quick Stat Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="rounded-xl bg-blue-50/50 p-4 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-semibold">
              <GraduationCap className="h-4 w-4" />
              Students Enrolled
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {students.length}
            </p>
          </div>

          <div className="rounded-xl bg-purple-50/50 p-4 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 text-xs font-semibold">
              <BookOpen className="h-4 w-4" />
              Faculty & Teachers
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {teachers.length}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50/50 p-4 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <Layers className="h-4 w-4" />
              Classes & Sections
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {classes.length}
            </p>
          </div>

          <div className="rounded-xl bg-amber-50/50 p-4 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <Shield className="h-4 w-4" />
              Plan / Control Mode
            </div>
            <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white uppercase truncate">
              {controlMode === "FULL_CONTROL" ? "Full Control" : subData?.planId?.replace("plan_", "") || "Trial"}
            </p>
          </div>
        </div>
      </div>

      {/* 9 Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-4 overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: Building2 },
          { id: "students", label: `Students (${students.length})`, icon: GraduationCap },
          { id: "teachers", label: `Teachers (${teachers.length})`, icon: BookOpen },
          { id: "classes", label: `Classes (${classes.length})`, icon: Layers },
          { id: "subscription", label: "Subscription", icon: Shield },
          { id: "entitlements", label: "Entitlements", icon: Sliders },
          { id: "payments", label: `Payments (${payments.length})`, icon: Receipt },
          { id: "activity", label: `Activity (${schoolActivities.length})`, icon: Activity },
          { id: "settings", label: "Settings", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Institutional Record
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">School Unique Code:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">{school.code}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Primary Admin Email:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{school.adminEmail || "—"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Physical Address:</span>
                  <span className="text-gray-900 dark:text-white">{school.address || "Not provided"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">City / State:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{school.city || "—"}, {school.state || "—"}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Tenant Status:</span>
                  <span className="font-semibold text-emerald-600 capitalize">{school.status}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Operational & Capacity Metrics
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Active Teachers:</span>
                  <span className="font-bold text-purple-600">{teachers.length} Faculty Members</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Active Students:</span>
                  <span className="font-bold text-blue-600">{students.length} Enrolled</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Classrooms & Sections:</span>
                  <span className="font-bold text-emerald-600">{classes.length} Units</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Subscription Tier:</span>
                  <span className="font-bold text-indigo-600 uppercase">{subData?.planId || "Starter"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students by name, admission number, roll no..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-gray-50/50 pl-9 pr-4 py-2 text-xs text-gray-900 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-16 text-gray-500">No students found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Adm No</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                          {st.name || (st as any).fullName}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">{st.admissionNumber || "—"}</td>
                        <td className="py-3 px-4 text-xs">{st.className || "—"}</td>
                        <td className="py-3 px-4 text-xs">{st.rollNumber || "—"}</td>
                        <td className="py-3 px-4">
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                            Enrolled
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
      )}

      {/* TAB 3: TEACHERS */}
      {activeTab === "teachers" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search teachers by name, email, phone, code..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-gray-50/50 pl-9 pr-4 py-2 text-xs text-gray-900 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
            {filteredTeachers.length === 0 ? (
              <div className="text-center py-16 text-gray-500">No teachers found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Teacher</th>
                      <th className="py-3 px-4">Teacher Code</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Department / Subjects</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredTeachers.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{t.name}</td>
                        <td className="py-3 px-4 font-mono text-xs font-bold text-gray-700 dark:text-gray-300">
                          {t.teacherCode || "—"}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                          <div>{t.email || "—"}</div>
                          <div>{t.phone || ""}</div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {Array.isArray(t.subjects) ? t.subjects.join(", ") : (t as any).subject || "Faculty"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                            Active
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
      )}

      {/* TAB 4: CLASSES */}
      {activeTab === "classes" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
            {classes.length === 0 ? (
              <div className="text-center py-16 text-gray-500">No classes configured for this school.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Sections</th>
                      <th className="py-3 px-4">Capacity / Enrolled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {classes.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{c.name}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {c.sections?.map((sec) => (
                              <span
                                key={sec.id}
                                className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              >
                                {sec.name}
                              </span>
                            )) || "—"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                          {c.sections?.reduce((acc, s) => acc + ((s as any).studentCount || 0), 0) || 0} Students
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SUBSCRIPTION */}
      {activeTab === "subscription" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Plan Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600" />
                Current Subscription
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Plan Tier:</span>
                  <span className="font-bold text-indigo-700 uppercase">{subData?.planId || "Starter"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-bold text-emerald-600 uppercase">{subData?.status || "ACTIVE"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Billing Cycle:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{subData?.billingCycle || "Monthly"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Expires At:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {subData?.expiresAt ? new Date(subData.expiresAt).toLocaleDateString() : "Never / Lifetime"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">Control Mode:</span>
                  <span className="font-bold text-purple-600">{controlMode}</span>
                </div>
              </div>
            </div>

            {/* Expiry Period Adjustment */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Extend / Reduce Expiry
              </h3>
              <p className="text-xs text-gray-500">
                Grant promotional extensions or adjust validity for this school.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAdjustPeriod("EXTEND_EXPIRY", 7)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  +7 Days
                </button>
                <button
                  onClick={() => handleAdjustPeriod("EXTEND_EXPIRY", 30)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  +30 Days
                </button>
                <button
                  onClick={() => handleAdjustPeriod("EXTEND_EXPIRY", 90)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  +90 Days
                </button>
                <button
                  onClick={() => handleAdjustPeriod("EXTEND_EXPIRY", 365)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  +1 Year
                </button>
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => handleAdjustPeriod("REDUCE_EXPIRY", 7)}
                  className="w-1/2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                >
                  -7 Days
                </button>
                <button
                  onClick={() => handleAdjustPeriod("REDUCE_EXPIRY", 30)}
                  className="w-1/2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                >
                  -30 Days
                </button>
              </div>
            </div>

            {/* Set Custom Expiry & Plan Change */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                Assign Plan & Custom Date
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Select Plan
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="plan_free">Free Trial</option>
                    <option value="plan_starter">Starter Tier</option>
                    <option value="plan_growth">Growth Tier</option>
                    <option value="plan_enterprise">Enterprise Tier</option>
                    <option value="plan_custom">Custom Plan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Custom Expiry Date
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={customExpiry}
                      onChange={(e) => setCustomExpiry(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => handleAdjustPeriod("ADJUST_EXPIRY", undefined, customExpiry)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      Set Date
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleAssignPlan}
                  disabled={assigningPlan}
                  className="w-full rounded-lg bg-purple-600 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {assigningPlan ? "Applying..." : "Assign Selected Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ENTITLEMENTS */}
      {activeTab === "entitlements" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-blue-600" />
                  School Entitlements & Access Overrides
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Master permissions for this tenant. Full Control bypasses all plan restrictions.
                </p>
              </div>
              <button
                onClick={handleSaveEntitlements}
                disabled={savingEntitlements}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingEntitlements ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Entitlement Settings
              </button>
            </div>

            {/* Control Mode Pills */}
            <div className="flex flex-wrap gap-3 pt-2">
              {[
                { id: "FULL_CONTROL", label: "⚡ Full Control (Master Override)", desc: "Grants ALL features regardless of plan tier" },
                { id: "LIMITED_CONTROL", label: "🔒 Limited Control (Plan Default)", desc: "Enforces default tier entitlements" },
                { id: "CUSTOM_ACCESS", label: "🛠️ Custom Access (Granular)", desc: "Per-feature custom overrides" },
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => setControlMode(m.id as any)}
                  className={`flex-1 min-w-[200px] cursor-pointer rounded-xl border p-4 transition-all ${
                    controlMode === m.id
                      ? "border-blue-500 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-950/20"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-800"
                  }`}
                >
                  <p className="font-bold text-xs text-gray-900 dark:text-white">{m.label}</p>
                  <p className="text-[11px] text-gray-500 mt-1">{m.desc}</p>
                </div>
              ))}
            </div>

            {/* Feature matrix */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-3">
                Granular Feature Overrides Matrix
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { id: "attendance", name: "Student & Staff Attendance" },
                  { id: "fees", name: "Fee Management & Receipts" },
                  { id: "exams", name: "Exams & Report Cards" },
                  { id: "bell_system", name: "Period Bell Alerts & Timetable" },
                  { id: "sms_alerts", name: "SMS / WhatsApp Communication" },
                  { id: "advanced_reports", name: "Custom Reports & PDF Export" },
                ].map((feat) => {
                  const isAllowed = controlMode === "FULL_CONTROL" || featureOverridesMap[feat.id] === true;
                  return (
                    <div
                      key={feat.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30"
                    >
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{feat.name}</span>
                      <button
                        type="button"
                        disabled={controlMode === "FULL_CONTROL"}
                        onClick={() =>
                          setFeatureOverridesMap({
                            ...featureOverridesMap,
                            [feat.id]: !isAllowed,
                          })
                        }
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                          isAllowed
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        {isAllowed ? "ENABLED" : "BLOCKED"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PAYMENTS */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
            {payments.length === 0 && invoices.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-base font-medium text-gray-900 dark:text-white">
                  No billing transactions recorded
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Payments made by this school tenant will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Transaction / Invoice ID</th>
                      <th className="py-3 px-4">Plan / Purpose</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Gateway</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-3 px-4 font-mono text-xs font-bold">{p.id}</td>
                        <td className="py-3 px-4 text-xs">{p.planName || p.purpose || "Subscription Plan"}</td>
                        <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">₹{p.amount || 0}</td>
                        <td className="py-3 px-4 text-xs capitalize">{p.gateway || p.method || "Razorpay"}</td>
                        <td className="py-3 px-4">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                            {p.status || "PAID"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: ACTIVITY */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
            {schoolActivities.length === 0 ? (
              <div className="text-center py-16 text-gray-500">No activity logs recorded for this school.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Reason / Details</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {schoolActivities.map((act) => (
                      <tr key={act.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-3 px-4 font-mono text-xs font-bold text-blue-600">{act.action}</td>
                        <td className="py-3 px-4 text-xs">
                          {(act as any).performedBy?.name || (act as any).performedBy?.email || (act as any).actorEmail || (act as any).actorName || "Super Admin"}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                          {(act as any).reason || JSON.stringify((act as any).newState || (act as any).details || {})}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-gray-500">
                          {act.timestamp?.toDate ? act.timestamp.toDate().toLocaleString() : "Recently"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 9: SETTINGS */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Edit */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                Institutional Profile
              </h3>
              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    School Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      School Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.code}
                      onChange={(e) => setProfileForm({ ...profileForm, code: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono font-bold dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Badge
                    </label>
                    <select
                      value={profileForm.verificationBadge}
                      onChange={(e) => setProfileForm({ ...profileForm, verificationBadge: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="none">No Badge</option>
                      <option value="basic">🛡️ Basic Verified</option>
                      <option value="gold">👑 Gold Verified</option>
                      <option value="premium">💎 Premium Verified</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
              </form>
            </div>

            {/* School Admin Management */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-purple-600" />
                Admin Credentials & Password Reset
              </h3>
              <form onSubmit={handleSaveAdmin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Admin Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={adminNameInput}
                    onChange={(e) => setAdminNameInput(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Admin Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmailInput}
                    onChange={(e) => setAdminEmailInput(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Reset Password (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = Math.random().toString(36).slice(-8) + "!Aa1";
                        setNewAdminPassword(pwd);
                        toast.info(`Generated: ${pwd}`);
                      }}
                      className="text-[11px] text-blue-600 hover:underline font-semibold"
                    >
                      Generate Secure
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter new password (min 6 characters)"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {savingAdmin ? "Updating..." : "Update Admin Account"}
                </button>
              </form>
            </div>
          </div>

          {/* Emergency & Force Logout Section */}
          <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/40 dark:bg-gray-950 space-y-4">
            <h3 className="text-base font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              Emergency Lockdown & Force Logout Controls
            </h3>
            <p className="text-xs text-gray-500">
              Immediate operational overrides for this tenant. Actions take effect instantaneously.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tenant Status
                </label>
                <select
                  value={emergencyStatus}
                  onChange={(e) => setEmergencyStatus(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="ACTIVE">🟢 Active Normal</option>
                  <option value="READ_ONLY">🟡 Read Only Mode</option>
                  <option value="PAUSED">🔴 Emergency Paused</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Module Kill Switches
                </label>
                <div className="flex flex-wrap gap-4 text-xs text-gray-700 dark:text-gray-300">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={killPayments}
                      onChange={(e) => setKillPayments(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    Block Payments
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={killFees}
                      onChange={(e) => setKillFees(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    Block Fee Collection
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={killReports}
                      onChange={(e) => setKillReports(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    Block Reports Export
                  </label>
                </div>
              </div>
            </div>

            <div className="border border-red-100 dark:border-red-950 rounded-lg p-3 bg-red-50/40 dark:bg-red-950/20">
              <label className="flex items-center gap-2 text-xs text-red-900 dark:text-red-300 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceLogoutConfirm}
                  onChange={(e) => setForceLogoutConfirm(e.target.checked)}
                  className="rounded text-red-600"
                />
                Force Logout All Users (Revokes all active sessions for teachers, students & admin)
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Mandatory Reason *
              </label>
              <input
                type="text"
                required
                placeholder="Reason for emergency modification..."
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <button
              onClick={handleSaveEmergency}
              disabled={savingEmergency}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {savingEmergency ? "Applying..." : "Apply Emergency Controls"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
