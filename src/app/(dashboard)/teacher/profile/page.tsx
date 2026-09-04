"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  GraduationCap,
  Shield,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Save,
  DollarSign,
  Award,
  Clock,
  Briefcase,
} from "lucide-react";
import {
  getTeacherDashboardContext,
  type AssignedClassInfo,
} from "@/lib/services/teacher-portal.service";
import { subscribeToTeacherFinesRewards } from "@/lib/services/teacher-hr.service";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { TeacherProfile, TeacherFineReward } from "@/types";
import { toast } from "sonner";

type ProfileTab = "details" | "salary" | "fines_rewards" | "classes";

export default function TeacherProfilePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const teacherUid = profile?.uid || "";
  const teacherEmail = profile?.email || "";

  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClassInfo[]>([]);
  const [finesRewards, setFinesRewards] = useState<TeacherFineReward[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>("details");

  // Editable Form State
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function init() {
      if (!schoolId || !teacherUid) {
        setLoading(false);
        return;
      }
      try {
        const ctx = await getTeacherDashboardContext(schoolId, teacherUid, teacherEmail);
        setTeacher(ctx.teacher);
        setAssignedClasses(ctx.assignedClasses);
        if (ctx.teacher?.phone) {
          setPhone(ctx.teacher.phone);
        }
        if (ctx.teacher?.address) {
          setAddress(ctx.teacher.address);
        }
      } catch (err) {
        console.error("Failed to load teacher profile:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [schoolId, teacherUid, teacherEmail]);

  // Real-time subscription to fines and rewards
  useEffect(() => {
    if (!schoolId || !teacher?.id) return;
    const unsub = subscribeToTeacherFinesRewards(schoolId, teacher.id, (list) => {
      setFinesRewards(list);
    });
    return () => unsub();
  }, [schoolId, teacher?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher?.id) return;
    setIsSaving(true);
    try {
      const db = getFirebaseDb();
      await updateDoc(doc(db, "schools", schoolId, "teachers", teacher.id), {
        phone: phone.trim(),
        address: address.trim(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Contact profile information updated!");
    } catch (err) {
      console.error("Failed to save teacher profile:", err);
      toast.error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const teacherName = teacher?.name || profile?.name || "Rahul Sir";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div>
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Teacher Profile & Transparent HR Record
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          View your verified faculty credentials, authorized salary breakdown, and rewards/fines history.
        </p>
      </div>

      {/* Hero Badge */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
            {teacherName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {teacherName}
              </h2>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                {teacher?.designation || "Faculty Teacher"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Employee ID: <strong className="font-mono text-slate-800 dark:text-slate-200">{teacher?.teacherCode || "TCH-001"}</strong> • Email: {teacher?.email || profile?.email}
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 self-start sm:self-center">
          Active Faculty Member
        </span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {(
          [
            { id: "details", label: "Personal & HR Details", icon: Users },
            { id: "salary", label: "Salary Breakdown", icon: DollarSign },
            { id: "fines_rewards", label: `Fines & Rewards (${finesRewards.length})`, icon: Award },
            { id: "classes", label: `Assigned Classes (${assignedClasses.length})`, icon: BookOpen },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isSelected
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DETAILS */}
      {activeTab === "details" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Personal & Contact Information
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  disabled
                  value={teacherName}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Official Email</label>
                <input
                  type="email"
                  disabled
                  value={teacher?.email || profile?.email || ""}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Mobile Phone (Editable)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Designation</label>
                <input
                  type="text"
                  disabled
                  value={teacher?.designation || "Faculty"}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Residential Address (Editable)</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter current residential address..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Contact Info"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: SALARY (TRANSPARENT BREAKDOWN) */}
      {activeTab === "salary" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Transparent Salary & Payroll Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Authorized compensation structure maintained by School Administration.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Base Salary</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                ₹{teacher?.salaryConfig?.baseSalary?.toLocaleString("en-IN") || "35,000"}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">
                {teacher?.salaryConfig?.frequency || "Monthly"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-xs font-semibold text-emerald-600">Total Allowances</span>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                +₹
                {teacher?.salaryConfig?.allowances
                  ?.reduce((a, b) => a + (b.amount || 0), 0)
                  .toLocaleString("en-IN") || "5,000"}
              </p>
              <p className="text-[10px] text-slate-400">DA, HRA, Medical</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40">
              <span className="text-xs font-semibold text-rose-600">Total Deductions</span>
              <p className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                -₹
                {teacher?.salaryConfig?.deductions
                  ?.reduce((a, b) => a + (b.amount || 0), 0)
                  .toLocaleString("en-IN") || "2,500"}
              </p>
              <p className="text-[10px] text-slate-400">PF, Tax, Insurance</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/60 dark:from-slate-800 dark:to-slate-800/80 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                Net Monthly Payable
              </span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                ₹{teacher?.salaryConfig?.netSalary?.toLocaleString("en-IN") || "37,500"}
              </h4>
            </div>
            <span className="text-xs text-slate-500">
              Direct Deposit / Bank Transfer
            </span>
          </div>
        </div>
      )}

      {/* TAB 3: FINES & REWARDS (TRANSPARENT LEDGER) */}
      {activeTab === "fines_rewards" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Transparent Fines, Rewards & Recognition Ledger
            </h3>
            <p className="text-xs text-slate-500">
              All administrative adjustments, performance rewards, and verified compliance fines are listed here with explicit dates and reasons.
            </p>
          </div>

          {finesRewards.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Award className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                No fines or penalties recorded
              </p>
              <p className="text-slate-400 mt-0.5">
                You maintain a pristine record with zero compliance penalties.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {finesRewards.map((fr) => {
                const isFine = fr.type === "fine" || fr.type === "adjustment";
                return (
                  <div
                    key={fr.id}
                    className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                      isFine
                        ? "border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/20"
                        : "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isFine
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                          }`}
                        >
                          {fr.type}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                          {isFine ? `Fine: ₹${fr.amount || 0}` : `Reward: +₹${fr.amount || 0}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                        Reason: <strong>{fr.reason}</strong>
                      </p>
                      {fr.remarks && (
                        <p className="text-[11px] text-slate-400">Remarks: {fr.remarks}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-semibold shrink-0">
                      {fr.date}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CLASSES */}
      {activeTab === "classes" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Teaching Assignments & Responsibilities
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assignedClasses.map((ac, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
              >
                <span className="text-[10px] font-bold text-blue-600 uppercase">
                  {ac.subject || "Subject"}
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                  {ac.className} {ac.sectionName ? `(Section ${ac.sectionName})` : ""}
                </h4>
                <p className="text-xs text-slate-500 mt-1">{ac.studentCount || 0} Enrolled Students</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
