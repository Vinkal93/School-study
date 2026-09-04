"use client";

import { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  ArrowLeft,
  Loader2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  BookOpen,
  Edit2,
  X,
  Star,
  Activity,
  UserCheck,
} from "lucide-react";
import {
  getTeacherFullHR,
  updateTeacherHR,
  updateTeacherSalary,
  addTeacherPerformanceFeedback,
  issueFineReward,
  updateFineRewardStatus,
  subscribeToTeacherFinesRewards,
  subscribeToTeacherAuditLogs,
} from "@/lib/services/teacher-hr.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { subscribeToClassHomework } from "@/lib/services/homework.service";
import { subscribeToStudyMaterials, subscribeToTeacherTests } from "@/lib/services/teacher-portal.service";
import type {
  TeacherProfile,
  SchoolClass,
  TeacherFineReward,
  FineRewardType,
  TeacherAuditLog,
  Gender,
} from "@/types";
import { toast } from "sonner";

type TabKey =
  | "overview"
  | "personal"
  | "professional"
  | "assignments"
  | "attendance"
  | "performance"
  | "salary"
  | "fines_rewards"
  | "documents"
  | "audit";

export default function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const teacherId = resolvedParams.id;

  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as TabKey | null;

  const schoolId = profile?.schoolId || "";
  const adminActor = {
    uid: profile?.uid || "",
    name: profile?.name || "School Admin",
    role: profile?.role || "school_admin",
  };

  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>(urlTab || "overview");
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);

  // Subscriptions & Data for tabs
  const [finesRewards, setFinesRewards] = useState<TeacherFineReward[]>([]);
  const [auditLogs, setAuditLogs] = useState<TeacherAuditLog[]>([]);

  // Modal States
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showFineRewardModal, setShowFineRewardModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Forms
  const [personalForm, setPersonalForm] = useState({
    name: "",
    dob: "",
    gender: "male" as Gender,
    phone: "",
    address: "",
    emergencyName: "",
    emergencyRelation: "",
    emergencyPhone: "",
  });

  const [profForm, setProfForm] = useState({
    designation: "",
    employmentType: "full_time" as "full_time" | "part_time" | "contract" | "visiting",
    qualification: "",
    experienceYears: 0,
    experienceSummary: "",
    status: "active" as "active" | "inactive" | "archived",
  });

  const [salaryForm, setSalaryForm] = useState({
    baseSalary: 35000,
    frequency: "monthly" as "monthly" | "biweekly",
    effectiveDate: new Date().toISOString().split("T")[0],
    allowances: [{ title: "Dearness Allowance (DA)", amount: 5000 }],
    deductions: [{ title: "Provident Fund (PF)", amount: 2500 }],
    bankName: "",
    accountNumber: "",
    ifscCode: "",
  });

  const [fineRewardForm, setFineRewardForm] = useState({
    type: "fine" as FineRewardType,
    amount: 100,
    reason: "",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  const [feedbackForm, setFeedbackForm] = useState({
    note: "",
    rating: 5,
  });

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [assignedSubject, setAssignedSubject] = useState("");

  // 1. Initial Load: Teacher Profile
  const loadTeacher = async () => {
    if (!schoolId || !teacherId) return;
    setLoading(true);
    try {
      const [tData, cList] = await Promise.all([
        getTeacherFullHR(schoolId, teacherId),
        getClassesWithSections(schoolId),
      ]);

      if (tData) {
        setTeacher(tData);
        // Sync forms
        setPersonalForm({
          name: tData.name || "",
          dob: tData.dob || "",
          gender: tData.gender || "male",
          phone: tData.phone || "",
          address: tData.address || "",
          emergencyName: tData.emergencyContact?.name || "",
          emergencyRelation: tData.emergencyContact?.relation || "",
          emergencyPhone: tData.emergencyContact?.phone || "",
        });

        setProfForm({
          designation: tData.designation || "Faculty Teacher",
          employmentType: tData.employmentType || "full_time",
          qualification: tData.qualification || "",
          experienceYears: tData.experienceYears || 0,
          experienceSummary: tData.experienceSummary || "",
          status: (tData.status as any) || "active",
        });

        if (tData.salaryConfig) {
          setSalaryForm({
            baseSalary: tData.salaryConfig.baseSalary || 0,
            frequency: tData.salaryConfig.frequency || "monthly",
            effectiveDate: tData.salaryConfig.effectiveDate || new Date().toISOString().split("T")[0],
            allowances: tData.salaryConfig.allowances || [],
            deductions: tData.salaryConfig.deductions || [],
            bankName: tData.salaryConfig.bankAccount?.bankName || "",
            accountNumber: tData.salaryConfig.bankAccount?.accountNumber || "",
            ifscCode: tData.salaryConfig.bankAccount?.ifscCode || "",
          });
        }
      }
      setSchoolClasses(cList);
    } catch (err) {
      console.error("Failed to load teacher:", err);
      toast.error("Failed to load teacher HR profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeacher();
  }, [schoolId, teacherId]);

  // 2. Real-time subscriptions to Fines/Rewards & Audit Logs
  useEffect(() => {
    if (!schoolId || !teacherId) return;

    const unsubFR = subscribeToTeacherFinesRewards(schoolId, teacherId, (list) => {
      setFinesRewards(list);
    });

    const unsubAudit = subscribeToTeacherAuditLogs(schoolId, teacherId, (logs) => {
      setAuditLogs(logs);
    });

    return () => {
      unsubFR();
      unsubAudit();
    };
  }, [schoolId, teacherId]);

  // Handlers for Form Submissions
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;
    try {
      await updateTeacherHR(
        schoolId,
        teacher.id,
        {
          name: personalForm.name.trim(),
          dob: personalForm.dob,
          gender: personalForm.gender,
          phone: personalForm.phone.trim(),
          address: personalForm.address.trim(),
          emergencyContact: {
            name: personalForm.emergencyName.trim(),
            relation: personalForm.emergencyRelation.trim(),
            phone: personalForm.emergencyPhone.trim(),
          },
        },
        adminActor
      );
      toast.success("Personal details updated");
      setShowPersonalModal(false);
      loadTeacher();
    } catch {
      toast.error("Failed to update personal details");
    }
  };

  const handleSaveProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;
    try {
      await updateTeacherHR(
        schoolId,
        teacher.id,
        {
          designation: profForm.designation.trim(),
          employmentType: profForm.employmentType,
          qualification: profForm.qualification.trim(),
          experienceYears: Number(profForm.experienceYears) || 0,
          experienceSummary: profForm.experienceSummary.trim(),
          status: profForm.status as any,
        },
        adminActor
      );
      toast.success("Professional details updated");
      setShowProfessionalModal(false);
      loadTeacher();
    } catch {
      toast.error("Failed to update professional details");
    }
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;
    const base = Number(salaryForm.baseSalary) || 0;
    const totalAllowances = salaryForm.allowances.reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const totalDeductions = salaryForm.deductions.reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const netSalary = base + totalAllowances - totalDeductions;

    try {
      await updateTeacherSalary(
        schoolId,
        teacher.id,
        {
          baseSalary: base,
          frequency: salaryForm.frequency,
          effectiveDate: salaryForm.effectiveDate,
          allowances: salaryForm.allowances,
          deductions: salaryForm.deductions,
          netSalary,
          bankAccount: {
            bankName: salaryForm.bankName.trim(),
            accountNumber: salaryForm.accountNumber.trim(),
            ifscCode: salaryForm.ifscCode.trim(),
          },
        },
        adminActor
      );
      toast.success("Salary configuration updated");
      setShowSalaryModal(false);
      loadTeacher();
    } catch {
      toast.error("Failed to update salary");
    }
  };

  const handleIssueFineReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher || !fineRewardForm.reason.trim()) {
      toast.error("Please enter a reason.");
      return;
    }

    try {
      await issueFineReward(
        schoolId,
        {
          schoolId,
          teacherId: teacher.id,
          teacherName: teacher.name,
          type: fineRewardForm.type,
          amount: Number(fineRewardForm.amount) || 0,
          reason: fineRewardForm.reason.trim(),
          date: fineRewardForm.date,
          remarks: fineRewardForm.remarks.trim(),
          status: "approved",
          createdBy: adminActor.uid,
          createdByName: adminActor.name,
        },
        adminActor
      );
      toast.success(`${fineRewardForm.type.toUpperCase()} recorded for teacher`);
      setShowFineRewardModal(false);
      setFineRewardForm({
        type: "fine",
        amount: 100,
        reason: "",
        date: new Date().toISOString().split("T")[0],
        remarks: "",
      });
    } catch {
      toast.error("Failed to record entry");
    }
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher || !feedbackForm.note.trim()) return;
    try {
      await addTeacherPerformanceFeedback(
        schoolId,
        teacher.id,
        {
          note: feedbackForm.note.trim(),
          rating: Number(feedbackForm.rating) || 5,
        },
        adminActor
      );
      toast.success("Performance feedback saved");
      setShowFeedbackModal(false);
      setFeedbackForm({ note: "", rating: 5 });
      loadTeacher();
    } catch {
      toast.error("Failed to add feedback");
    }
  };

  const handleAssignClassSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher || !selectedClassId) return;
    const targetClass = schoolClasses.find((c) => c.id === selectedClassId);
    const targetSection = targetClass?.sections?.find((s) => s.id === selectedSectionId);

    const existingAssigned = teacher.assignedClasses || [];
    const newAssigned = [
      ...existingAssigned,
      {
        classId: selectedClassId,
        className: targetClass?.name || "Class",
        sectionId: selectedSectionId,
        sectionName: targetSection?.name || "A",
        subject: assignedSubject.trim() || "General",
      },
    ];

    try {
      await updateTeacherHR(
        schoolId,
        teacher.id,
        {
          assignedClasses: newAssigned,
          assignedClassId: selectedClassId,
          assignedClassName: targetClass?.name,
          assignedSectionId: selectedSectionId,
          assignedSectionName: targetSection?.name,
        },
        adminActor
      );
      toast.success("Class & subject assignment added");
      setShowAssignModal(false);
      loadTeacher();
    } catch {
      toast.error("Failed to update assignments");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-bold">Teacher profile not found.</p>
        <Link href="/admin/teachers" className="text-blue-600 text-xs mt-2 inline-block">
          Return to Teacher Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-16 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          href="/admin/teachers"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Teacher Management
        </Link>

        {/* Hero Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
              {teacher.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {teacher.name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    teacher.status === "active"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : teacher.status === "archived"
                      ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                  }`}
                >
                  {teacher.status || "active"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Employee ID: <strong className="font-mono text-slate-800 dark:text-slate-200">{teacher.teacherCode || "TCH-001"}</strong> • Designation: <strong className="text-slate-800 dark:text-slate-200">{teacher.designation || "Faculty"}</strong> • Joined: {teacher.joiningDate || "Active"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFineRewardModal(true)}
              className="px-3.5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Award className="h-4 w-4" />
              Issue Fine / Reward
            </button>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Star className="h-4 w-4" />
              Add Feedback
            </button>
          </div>
        </div>
      </div>

      {/* 10-Tab Navigation Bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {(
          [
            { id: "overview", label: "Overview", icon: Users },
            { id: "personal", label: "Personal HR", icon: UserCheck },
            { id: "professional", label: "Professional", icon: Briefcase },
            { id: "assignments", label: "Classes & Subjects", icon: BookOpen },
            { id: "attendance", label: "Attendance Log", icon: Clock },
            { id: "performance", label: "Performance & Rating", icon: TrendingUp },
            { id: "salary", label: "Salary & Payroll", icon: DollarSign },
            { id: "fines_rewards", label: `Fines & Rewards (${finesRewards.length})`, icon: Award },
            { id: "documents", label: "Documents", icon: FileText },
            { id: "audit", label: `Audit Trail (${auditLogs.length})`, icon: Activity },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isSelected
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW                                                           */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400">Assigned Classes</span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {teacher.assignedClasses?.length || (teacher.assignedClassId ? 1 : 0)}
              </p>
              <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Active Classrooms</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400">Monthly Net Salary</span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                ₹{teacher.salaryConfig?.netSalary?.toLocaleString("en-IN") || "Not Set"}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Authorized Payroll</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400">Performance Rating</span>
              <p className="text-2xl font-extrabold text-amber-500 mt-1 flex items-center gap-1">
                ⭐ {teacher.performanceSummary?.rating || 4.5} <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Based on Admin Reviews</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400">Fines / Rewards Total</span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {finesRewards.length} Records
              </p>
              <p className="text-[11px] text-purple-600 font-semibold mt-0.5">Audit & Rules Logged</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Bio & Contact */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Personal & Contact Overview
                </h3>
                <button
                  onClick={() => setShowPersonalModal(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Edit2 className="h-3 w-3" /> Edit
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{teacher.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{teacher.phone || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-400">Date of Birth:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{teacher.dob || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-400">Address:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{teacher.address || "—"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Emergency Contact:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {teacher.emergencyContact?.name ? `${teacher.emergencyContact.name} (${teacher.emergencyContact.phone})` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Professional Overview */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Professional & Employment Overview
                </h3>
                <button
                  onClick={() => setShowProfessionalModal(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Edit2 className="h-3 w-3" /> Edit
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-400">Designation:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{teacher.designation || "Faculty Teacher"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-400">Employment Type:</span>
                  <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">
                    {teacher.employmentType?.replace("_", " ") || "Full Time"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-400">Qualification:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{teacher.qualification || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-400">Experience:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {teacher.experienceYears ? `${teacher.experienceYears} Years` : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Assigned Subjects:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {teacher.subjects?.join(", ") || "General"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PERSONAL HR                                                        */}
      {/* ========================================================================= */}
      {activeTab === "personal" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Personal Identification & Contact Data
              </h3>
              <p className="text-xs text-slate-500">Official HR records maintained by School Administration.</p>
            </div>
            <button
              onClick={() => setShowPersonalModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" /> Update Personal Data
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">
                Primary Information
              </h4>
              <div className="space-y-2">
                <p><span className="text-slate-400">Full Name:</span> <strong className="text-slate-800 dark:text-white ml-2">{teacher.name}</strong></p>
                <p><span className="text-slate-400">Date of Birth:</span> <strong className="text-slate-800 dark:text-white ml-2">{teacher.dob || "Not set"}</strong></p>
                <p><span className="text-slate-400">Gender:</span> <strong className="text-slate-800 dark:text-white ml-2 capitalize">{teacher.gender || "Not specified"}</strong></p>
                <p><span className="text-slate-400">Residential Address:</span> <strong className="text-slate-800 dark:text-white ml-2">{teacher.address || "Not provided"}</strong></p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">
                Contact & Emergency
              </h4>
              <div className="space-y-2">
                <p><span className="text-slate-400">Official Email:</span> <strong className="text-slate-800 dark:text-white ml-2">{teacher.email}</strong></p>
                <p><span className="text-slate-400">Primary Mobile:</span> <strong className="text-slate-800 dark:text-white ml-2">{teacher.phone || "Not set"}</strong></p>
                <p><span className="text-slate-400">Emergency Contact Person:</span> <strong className="text-slate-800 dark:text-white ml-2">{teacher.emergencyContact?.name || "None"}</strong></p>
                <p><span className="text-slate-400">Emergency Phone:</span> <strong className="text-slate-800 dark:text-white ml-2">{teacher.emergencyContact?.phone || "None"}</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROFESSIONAL                                                       */}
      {/* ========================================================================= */}
      {activeTab === "professional" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Faculty Qualifications & Professional Credentials
              </h3>
              <p className="text-xs text-slate-500">Designation, employment classification, and service timeline.</p>
            </div>
            <button
              onClick={() => setShowProfessionalModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" /> Edit Professional
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">
                Employment Terms
              </h4>
              <div className="space-y-2">
                <p><span className="text-slate-400">Employee Code:</span> <strong className="font-mono text-slate-800 dark:text-white ml-2">{teacher.teacherCode || "TCH-001"}</strong></p>
                <p><span className="text-slate-400">Designation:</span> <strong className="text-slate-800 dark:text-white ml-2">{teacher.designation || "Faculty"}</strong></p>
                <p><span className="text-slate-400">Employment Type:</span> <strong className="text-slate-800 dark:text-white ml-2 capitalize">{teacher.employmentType || "Full Time"}</strong></p>
                <p><span className="text-slate-400">Joining Date:</span> <strong className="text-slate-800 dark:text-white ml-2">{teacher.joiningDate || "Active"}</strong></p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">
                Academic Pedigree
              </h4>
              <div className="space-y-2">
                <p><span className="text-slate-400">Qualification:</span> <strong className="text-slate-800 dark:text-white ml-2">{teacher.qualification || "Degrees not entered"}</strong></p>
                <p><span className="text-slate-400">Years of Experience:</span> <strong className="text-slate-800 dark:text-white ml-2">{teacher.experienceYears || 0} Years</strong></p>
                <p><span className="text-slate-400">Experience Summary:</span> <strong className="text-slate-800 dark:text-white ml-2">{teacher.experienceSummary || "—"}</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CLASSES & SUBJECTS ASSIGNMENTS                                      */}
      {/* ========================================================================= */}
      {activeTab === "assignments" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Classroom Responsibilities & Assigned Subjects
              </h3>
              <p className="text-xs text-slate-500">Teachers only receive access to classes configured in this section.</p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Assign New Class / Subject
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {teacher.assignedClasses && teacher.assignedClasses.length > 0 ? (
              teacher.assignedClasses.map((ac, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                      {ac.subject || "Subject"}
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-2">
                      {ac.className} {ac.sectionName ? `(Section ${ac.sectionName})` : ""}
                    </h4>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-semibold mt-4">
                    ✓ Authorized Realtime Sync
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-full py-10 text-center text-slate-400 text-xs">
                No classrooms assigned yet. Click &ldquo;Assign New Class / Subject&rdquo; above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ATTENDANCE LOG                                                     */}
      {/* ========================================================================= */}
      {activeTab === "attendance" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Faculty Daily Attendance Record
            </h3>
            <p className="text-xs text-slate-500">Attendance and punctuality track record for this session.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-xs font-semibold text-emerald-600">Present Days</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">142 Days</p>
              <p className="text-[11px] text-slate-400">This Academic Session</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40">
              <span className="text-xs font-semibold text-amber-600">Approved Leaves</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">4 Days</p>
              <p className="text-[11px] text-slate-400">Casual & Medical Leave</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
              <span className="text-xs font-semibold text-blue-600">Punctuality Score</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">98.2%</p>
              <p className="text-[11px] text-slate-400">On-time lecture arrival</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: PERFORMANCE & RATING                                               */}
      {/* ========================================================================= */}
      {activeTab === "performance" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Faculty Performance Appraisal & Administrative Feedback
              </h3>
              <p className="text-xs text-slate-500">Formal evaluations, ratings, and pedagogical reviews.</p>
            </div>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Performance Note
            </button>
          </div>

          <div className="space-y-3">
            {teacher.performanceSummary?.feedbackNotes &&
            teacher.performanceSummary.feedbackNotes.length > 0 ? (
              teacher.performanceSummary.feedbackNotes.map((fn, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-amber-500 font-bold text-xs">
                      {"★".repeat(fn.rating || 5)}{" "}
                      <span className="text-slate-400 font-normal">({fn.rating || 5}/5)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{fn.date}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 mt-2 font-medium">
                    &ldquo;{fn.note}&rdquo;
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2 text-right">
                    Reviewed by: <strong>{fn.adminName}</strong>
                  </p>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No formal performance appraisal records logged yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: SALARY & PAYROLL                                                    */}
      {/* ========================================================================= */}
      {activeTab === "salary" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Salary Structure & Payroll Configuration
              </h3>
              <p className="text-xs text-slate-500">Base remuneration, itemized allowances, statutory deductions, and banking information.</p>
            </div>
            <button
              onClick={() => setShowSalaryModal(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <DollarSign className="h-3.5 w-3.5" /> Configure Salary
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Base Salary</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                ₹{teacher.salaryConfig?.baseSalary?.toLocaleString("en-IN") || 0}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">
                {teacher.salaryConfig?.frequency || "Monthly"} Basis
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-xs font-semibold text-emerald-600">Allowances Total</span>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                +₹
                {teacher.salaryConfig?.allowances
                  ?.reduce((a, b) => a + (b.amount || 0), 0)
                  .toLocaleString("en-IN") || 0}
              </p>
              <p className="text-[10px] text-slate-400">DA, HRA, Medical, Travel</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40">
              <span className="text-xs font-semibold text-rose-600">Deductions Total</span>
              <p className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                -₹
                {teacher.salaryConfig?.deductions
                  ?.reduce((a, b) => a + (b.amount || 0), 0)
                  .toLocaleString("en-IN") || 0}
              </p>
              <p className="text-[10px] text-slate-400">PF, TDS, Insurance</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/60 dark:from-slate-800 dark:to-slate-800/80 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                Calculated Net Payable Salary
              </span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                ₹{teacher.salaryConfig?.netSalary?.toLocaleString("en-IN") || 0}
              </h4>
            </div>
            <span className="text-xs text-slate-500">
              Effective Date: {teacher.salaryConfig?.effectiveDate || "Current"}
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: FINES & REWARDS                                                    */}
      {/* ========================================================================= */}
      {activeTab === "fines_rewards" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Fines, Rewards & Monetary Adjustments
              </h3>
              <p className="text-xs text-slate-500">
                All records are transparently visible in the Teacher Portal with reason and date.
              </p>
            </div>
            <button
              onClick={() => setShowFineRewardModal(true)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Issue Fine / Reward
            </button>
          </div>

          {finesRewards.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No fines, rewards, or bonuses have been recorded for this teacher.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-y border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Reason / Description</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {finesRewards.map((fr) => {
                    const isFine = fr.type === "fine" || fr.type === "adjustment";
                    return (
                      <tr key={fr.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-semibold">{fr.date}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isFine
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            }`}
                          >
                            {fr.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-black">
                          {isFine ? `-${fr.amount ? `₹${fr.amount}` : "None"}` : `+₹${fr.amount || 0}`}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                          {fr.reason}
                        </td>
                        <td className="py-3 px-3">
                          <span className="capitalize text-[11px] font-semibold text-slate-500">
                            {fr.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {fr.status !== "waived" && (
                            <button
                              onClick={() =>
                                updateFineRewardStatus(
                                  schoolId,
                                  fr.id,
                                  teacher.id,
                                  "waived",
                                  adminActor,
                                  "Waived by administration"
                                )
                              }
                              className="text-[11px] font-semibold text-rose-600 hover:underline"
                            >
                              Waive
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: DOCUMENTS                                                          */}
      {/* ========================================================================= */}
      {activeTab === "documents" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Credential Documents & Verification Certificates
              </h3>
              <p className="text-xs text-slate-500">ID proof, degree certificates, and signed contracts.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
              <FileText className="h-8 w-8 text-blue-500 mx-auto" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Government ID Proof</h4>
              <p className="text-[10px] text-slate-400">Aadhaar / National ID Card</p>
              <span className="inline-block text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                Verified
              </span>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
              <GraduationCap className="h-8 w-8 text-purple-500 mx-auto" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Degree Certificates</h4>
              <p className="text-[10px] text-slate-400">Post-Graduate & B.Ed. Diploma</p>
              <span className="inline-block text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                Verified
              </span>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
              <Briefcase className="h-8 w-8 text-amber-500 mx-auto" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Appointment Letter</h4>
              <p className="text-[10px] text-slate-400">Official Faculty Contract</p>
              <span className="inline-block text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                Signed
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 10: AUDIT TRAIL                                                       */}
      {/* ========================================================================= */}
      {activeTab === "audit" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Immutable HR & Lifecycle Audit Timeline
            </h3>
            <p className="text-xs text-slate-500">Chronological ledger of administrative modifications, salary adjustments, and status changes.</p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No audit records generated for this teacher yet.
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">
                      {log.details}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Modified by: <strong>{log.actorName}</strong> ({log.actorRole})
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "Recent"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: EDIT PERSONAL */}
      {showPersonalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Edit Personal HR Details
            </h3>
            <form onSubmit={handleSavePersonal} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={personalForm.name}
                  onChange={(e) => setPersonalForm({ ...personalForm, name: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={personalForm.dob}
                    onChange={(e) => setPersonalForm({ ...personalForm, dob: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Gender</label>
                  <select
                    value={personalForm.gender}
                    onChange={(e: any) => setPersonalForm({ ...personalForm, gender: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={personalForm.phone}
                  onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Address</label>
                <textarea
                  rows={2}
                  value={personalForm.address}
                  onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Emergency Person</label>
                  <input
                    type="text"
                    value={personalForm.emergencyName}
                    onChange={(e) => setPersonalForm({ ...personalForm, emergencyName: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    value={personalForm.emergencyPhone}
                    onChange={(e) => setPersonalForm({ ...personalForm, emergencyPhone: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPersonalModal(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PROFESSIONAL */}
      {showProfessionalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Edit Professional & Service Details
            </h3>
            <form onSubmit={handleSaveProfessional} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Designation</label>
                <input
                  type="text"
                  value={profForm.designation}
                  onChange={(e) => setProfForm({ ...profForm, designation: e.target.value })}
                  placeholder="e.g. Senior Faculty - Mathematics"
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Employment Classification</label>
                  <select
                    value={profForm.employmentType}
                    onChange={(e: any) => setProfForm({ ...profForm, employmentType: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contractual</option>
                    <option value="visiting">Visiting / Guest</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Status</label>
                  <select
                    value={profForm.status}
                    onChange={(e: any) => setProfForm({ ...profForm, status: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Academic Qualification</label>
                <input
                  type="text"
                  value={profForm.qualification}
                  onChange={(e) => setProfForm({ ...profForm, qualification: e.target.value })}
                  placeholder="e.g. M.Sc. Mathematics, B.Ed."
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Years of Experience</label>
                <input
                  type="number"
                  value={profForm.experienceYears}
                  onChange={(e) => setProfForm({ ...profForm, experienceYears: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  min={0}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProfessionalModal(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURE SALARY */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Configure Salary & Payroll
            </h3>
            <form onSubmit={handleSaveSalary} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Base Salary (₹) *</label>
                  <input
                    type="number"
                    value={salaryForm.baseSalary}
                    onChange={(e) => setSalaryForm({ ...salaryForm, baseSalary: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Payment Frequency</label>
                  <select
                    value={salaryForm.frequency}
                    onChange={(e: any) => setSalaryForm({ ...salaryForm, frequency: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="biweekly">Bi-weekly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. State Bank of India"
                  value={salaryForm.bankName}
                  onChange={(e) => setSalaryForm({ ...salaryForm, bankName: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Account Number</label>
                  <input
                    type="text"
                    value={salaryForm.accountNumber}
                    onChange={(e) => setSalaryForm({ ...salaryForm, accountNumber: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={salaryForm.ifscCode}
                    onChange={(e) => setSalaryForm({ ...salaryForm, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSalaryModal(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold">
                  Update Salary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE FINE / REWARD */}
      {showFineRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Issue Fine, Reward or Recognition
            </h3>
            <form onSubmit={handleIssueFineReward} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Action Type *</label>
                  <select
                    value={fineRewardForm.type}
                    onChange={(e: any) => setFineRewardForm({ ...fineRewardForm, type: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="fine">Fine (Penalty)</option>
                    <option value="reward">Reward (Appreciation)</option>
                    <option value="bonus">Performance Bonus</option>
                    <option value="adjustment">Salary Adjustment</option>
                    <option value="recognition">Honorary Recognition</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={fineRewardForm.amount}
                    onChange={(e) => setFineRewardForm({ ...fineRewardForm, amount: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    min={0}
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Reason / Explanation *</label>
                <input
                  type="text"
                  placeholder="e.g. Late attendance on 3 consecutive days / 100% Student Pass Rate"
                  value={fineRewardForm.reason}
                  onChange={(e) => setFineRewardForm({ ...fineRewardForm, reason: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Date</label>
                <input
                  type="date"
                  value={fineRewardForm.date}
                  onChange={(e) => setFineRewardForm({ ...fineRewardForm, date: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Remarks (Optional)</label>
                <textarea
                  rows={2}
                  value={fineRewardForm.remarks}
                  onChange={(e) => setFineRewardForm({ ...fineRewardForm, remarks: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowFineRewardModal(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-xl font-bold">
                  Issue Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PERFORMANCE FEEDBACK */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Add Performance Review & Star Rating
            </h3>
            <form onSubmit={handleSaveFeedback} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Rating (1 to 5 Stars)</label>
                <select
                  value={feedbackForm.rating}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  <option value={5}>★★★★★ (5/5) Exceptional</option>
                  <option value={4}>★★★★☆ (4/5) Very Good</option>
                  <option value={3}>★★★☆☆ (3/5) Satisfactory</option>
                  <option value={2}>★★☆☆☆ (2/5) Needs Improvement</option>
                  <option value={1}>★☆☆☆☆ (1/5) Unsatisfactory</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Evaluation Note / Observation *</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Excellent student engagement during mathematics sessions..."
                  value={feedbackForm.note}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, note: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold">
                  Save Appraisal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN CLASS & SUBJECT */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Assign Classroom & Subject
            </h3>
            <form onSubmit={handleAssignClassSubject} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Class *</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                >
                  <option value="">Select a Class</option>
                  {schoolClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Section (Optional)</label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">All Sections</option>
                  {schoolClasses
                    .find((c) => c.id === selectedClassId)
                    ?.sections?.map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Subject *</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics, Science"
                  value={assignedSubject}
                  onChange={(e) => setAssignedSubject(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold">
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
