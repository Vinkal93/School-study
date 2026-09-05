"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { getFirebaseDb, getFirebaseAuth } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import {
  Settings,
  User,
  Building2,
  Lock,
  ShieldCheck,
  CreditCard,
  HelpCircle,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import type { School } from "@/types";
import { toast } from "sonner";

export default function SchoolAdminSettingsPage() {
  const { profile, firebaseUser, refreshProfile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [activeTab, setActiveTab] = useState<"account" | "security" | "preferences">("account");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<School | null>(null);

  // Form State: Profile & School
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolCity, setSchoolCity] = useState("");
  const [schoolState, setSchoolState] = useState("");
  const [affiliationNo, setAffiliationNo] = useState("");

  // Form State: Security (Password Change)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Form State: Preferences
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [attendanceCutoff, setAttendanceCutoff] = useState("10:00 AM");
  const [feePrefix, setFeePrefix] = useState("RCP");
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    // Check hash for #security
    if (typeof window !== "undefined" && window.location.hash === "#security") {
      setActiveTab("security");
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    setAdminName(profile.name || "");
    setAdminPhone((profile as any).phone || "");

    const fetchSchoolData = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      try {
        const db = getFirebaseDb();
        const snap = await getDoc(doc(db, COLLECTIONS.SCHOOLS, schoolId));
        if (snap.exists()) {
          const s = snap.data() as School;
          setSchool(s);
          setSchoolName(s.name || "");
          setSchoolPhone(s.phone || "");
          setSchoolAddress(s.address || "");
          setSchoolCity(s.city || "");
          setSchoolState(s.state || "");
          setAffiliationNo((s as any).affiliationNumber || s.code || "");
        }
      } catch (err) {
        console.warn("Could not fetch school details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolData();
  }, [profile, schoolId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim()) {
      toast.error("Administrator Name is required.");
      return;
    }

    setSaving(true);
    try {
      const db = getFirebaseDb();

      // Update User Profile
      if (profile?.uid) {
        await updateDoc(doc(db, COLLECTIONS.USERS, profile.uid), {
          name: adminName.trim(),
          phone: adminPhone.trim(),
          updatedAt: serverTimestamp(),
        });
      }

      // Update School Profile
      if (schoolId) {
        await updateDoc(doc(db, COLLECTIONS.SCHOOLS, schoolId), {
          name: schoolName.trim(),
          phone: schoolPhone.trim(),
          address: schoolAddress.trim(),
          city: schoolCity.trim(),
          state: schoolState.trim(),
          affiliationNumber: affiliationNo.trim(),
          updatedAt: serverTimestamp(),
        });
      }

      await refreshProfile();
      toast.success("Profile and school settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !firebaseUser.email) {
      toast.error("No active session found.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      // Re-authenticate with current password first
      const cred = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, cred);

      // Update password
      await updatePassword(firebaseUser, newPassword);
      toast.success("Password updated successfully! Please keep your credentials secure.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        toast.error("Current password is incorrect. Please try again.");
      } else {
        toast.error(err.message || "Failed to change password.");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      if (schoolId) {
        const db = getFirebaseDb();
        await updateDoc(doc(db, COLLECTIONS.SCHOOLS, schoolId), {
          currentAcademicYear: academicYear,
          attendanceCutoffTime: attendanceCutoff,
          feeReceiptPrefix: feePrefix,
          updatedAt: serverTimestamp(),
        });
      }
      toast.success("School operational preferences updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 px-3 sm:px-0">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-blue-600" />
            <span>School Settings & Administration</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your administrator profile, security credentials, school info, and operational preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/billing"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Billing Portal</span>
          </Link>
          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-200 transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Help Center</span>
          </Link>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("account")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "account"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <User className="h-4 w-4" />
          <span>Account & School Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "security"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Lock className="h-4 w-4" />
          <span>Security & Credentials</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preferences")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "preferences"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>School Preferences</span>
        </button>
      </div>

      {/* ==========================================
          TAB 1: ACCOUNT & SCHOOL PROFILE
      ========================================== */}
      {activeTab === "account" && (
        <form onSubmit={handleSaveProfile} className="space-y-6 animate-in fade-in duration-150">
          {/* Admin User Details Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <span>Administrator Profile</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Registered Login Email
                </label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || firebaseUser?.email || ""}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 font-medium cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Phone Contact
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Role & Authority
                </label>
                <div className="flex items-center gap-2 pt-1.5">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    School Administrator
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified Tenant Admin
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* School Details Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-600" />
              <span>School Institution Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  School Name
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  School Unique Code
                </label>
                <input
                  type="text"
                  disabled
                  value={school?.code || "SCH"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 font-mono font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  School Phone
                </label>
                <input
                  type="tel"
                  value={schoolPhone}
                  onChange={(e) => setSchoolPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Affiliation / Board Number
                </label>
                <input
                  type="text"
                  value={affiliationNo}
                  onChange={(e) => setAffiliationNo(e.target.value)}
                  placeholder="CBSE / ICSE / State Board #"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Campus Address
                </label>
                <input
                  type="text"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  placeholder="Street, Landmark..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={schoolCity}
                  onChange={(e) => setSchoolCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  State / Region
                </label>
                <input
                  type="text"
                  value={schoolState}
                  onChange={(e) => setSchoolState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md disabled:opacity-50 transition-all cursor-pointer active:scale-95"
            >
              <Save className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
              <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ==========================================
          TAB 2: SECURITY & CREDENTIALS
      ========================================== */}
      {activeTab === "security" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Change Password Card */}
          <form onSubmit={handleChangePassword} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" />
                <span>Update Administrator Password</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{showPassword ? "Hide Passwords" : "Show Passwords"}</span>
              </button>
            </div>

            <div className="space-y-3 text-xs max-w-md">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Password *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Lock className={`h-4 w-4 ${changingPassword ? "animate-spin" : ""}`} />
                  <span>{changingPassword ? "Updating Password..." : "Update Password"}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Session Security Policy Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Session Persistence & Security Rules</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <Clock className="h-4 w-4" />
                  <span>1-Week Active Session Duration</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Your administrator login session persists smoothly across browser refreshes, tab closures, and device restarts. For security, sessions automatically expire after 7 consecutive days.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Tenant Isolation & RBAC</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  All requests verify cryptographic authorization tokens and multi-tenant school boundaries server-side, preventing unauthorized cross-tenant data leaks.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: OPERATIONAL PREFERENCES
      ========================================== */}
      {activeTab === "preferences" && (
        <form onSubmit={handleSavePreferences} className="space-y-6 animate-in fade-in duration-150">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>School Operational Settings</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Active Academic Year
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="2025-2026">Academic Year 2025 - 2026</option>
                  <option value="2026-2027">Academic Year 2026 - 2027 (Active)</option>
                  <option value="2027-2028">Academic Year 2027 - 2028</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Daily Attendance Cutoff Time
                </label>
                <input
                  type="text"
                  value={attendanceCutoff}
                  onChange={(e) => setAttendanceCutoff(e.target.value)}
                  placeholder="e.g. 10:00 AM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fee Receipt Number Prefix
                </label>
                <input
                  type="text"
                  value={feePrefix}
                  onChange={(e) => setFeePrefix(e.target.value)}
                  placeholder="e.g. RCP or REC"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Operational Currency
                </label>
                <input
                  type="text"
                  disabled
                  value="INR (₹) - Indian Rupee"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 font-bold cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPrefs}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md disabled:opacity-50 transition-all cursor-pointer active:scale-95"
            >
              <Save className={`h-4 w-4 ${savingPrefs ? "animate-spin" : ""}`} />
              <span>{savingPrefs ? "Saving Preferences..." : "Save Preferences"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
