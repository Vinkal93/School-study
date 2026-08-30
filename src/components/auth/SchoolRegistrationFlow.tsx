"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  ArrowLeft,
  Building2,
  MapPin,
  Sparkles,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { createSchoolWithAdmin } from "@/lib/services/school.service";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "sonner";
import { Spinner } from "@/components/common/Spinner";

export function SchoolRegistrationFlow() {
  const router = useRouter();

  const [step, setStep] = useState<number>(1);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Form State
  const [schoolName, setSchoolName] = useState<string>("");
  const [schoolCity, setSchoolCity] = useState<string>("");
  const [adminName, setAdminName] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");

  // Helper to generate a unique short school code from name
  const generateSchoolCode = (name: string) => {
    const cleaned = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
    const prefix = cleaned.slice(0, 4) || "SCH";
    const randomDigits = Math.floor(100 + Math.random() * 900);
    return `${prefix}${randomDigits}`;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!schoolName.trim() || !adminName.trim()) {
        toast.error("Please enter both School Name and Admin Name");
        return;
      }
    }
    if (step === 2) {
      if (!adminEmail.trim() || !adminPassword.trim()) {
        toast.error("Please enter Email and Password");
        return;
      }
      if (adminPassword.length < 6) {
        toast.error("Password must be at least 6 characters long");
        return;
      }
    }
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const code = generateSchoolCode(schoolName);

      // 1. Create School and Admin account in Firestore/Auth
      await createSchoolWithAdmin({
        name: schoolName.trim(),
        code,
        city: schoolCity.trim() || "India",
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        adminPassword,
      });

      // 2. Sign in the new Admin account
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, adminEmail.trim().toLowerCase(), adminPassword);

      toast.success("School registered successfully! Welcome to School Study.");
      router.push("/admin");
    } catch (err: any) {
      console.error("Registration failed:", err);
      toast.error(err?.message || "Failed to register school. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Step Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Step {step} of 3
          </span>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
            {Math.round((step / 3) * 100)}% Completed
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-900/5 p-6 sm:p-8 backdrop-blur-xl">
        {/* Card Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl mb-3 shadow-inner">
            {step === 1 && <Building2 className="w-7 h-7" />}
            {step === 2 && <Lock className="w-7 h-7" />}
            {step === 3 && <ShieldCheck className="w-7 h-7" />}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {step === 1 && "Register Your School"}
            {step === 2 && "Setup Admin Credentials"}
            {step === 3 && "Review & Launch Free Plan"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {step === 1 && "Start your 10-student free tier in under 60 seconds."}
            {step === 2 && "Create your private school admin login."}
            {step === 3 && "Everything is set! Confirm details to activate."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ==========================================
              STEP 1: School & Admin Profile
          ========================================== */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  School Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. St. Xavier's International School"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  City / Location
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={schoolCity}
                    onChange={(e) => setSchoolCity(e.target.value)}
                    placeholder="e.g. Lucknow, Uttar Pradesh"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Principal / Admin Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={!schoolName.trim() || !adminName.trim()}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Continue to Credentials</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ==========================================
              STEP 2: Credentials
          ========================================== */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Admin Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@school.com"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Admin Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/50 flex items-start gap-2.5 text-xs text-blue-700 dark:text-blue-300">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Free Starter Plan automatically includes <strong>10 Students & 2 Teachers</strong> with attendance, classes, notices, and portal access.
                </span>
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={!adminEmail.trim() || adminPassword.length < 6}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Review & Confirm</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ==========================================
              STEP 3: Review & Submit
          ========================================== */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-4 rounded-2xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-500 dark:text-slate-400">School Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                    {schoolName}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Admin Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{adminName}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Admin Email:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{adminEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Default Plan:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                    Free Starter (10 Students / 2 Teachers)
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" className="text-white" />
                    <span>Creating your school...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Complete Registration & Go to Dashboard</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>

        {/* Back Button */}
        {step > 1 && !isLoading && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="mt-4 w-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to previous step</span>
          </button>
        )}

        {/* Footer Link */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SchoolRegistrationFlow;
