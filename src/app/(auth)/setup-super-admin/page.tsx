"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Sparkles, Loader2, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { createInitialSuperAdmin, checkSuperAdminExists } from "@/lib/services/auth.service";
import { toast } from "sonner";

export default function SetupSuperAdminPage() {
  const router = useRouter();
  const [name, setName] = useState("Super Admin");
  const [email, setEmail] = useState("superadmin@schoolstudy.com");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [alreadyExists, setAlreadyExists] = useState(false);

  useEffect(() => {
    async function verifyStatus() {
      try {
        const exists = await checkSuperAdminExists();
        setAlreadyExists(exists);
      } catch (e) {
        console.error("Failed to check super admin status:", e);
      } finally {
        setChecking(false);
      }
    }
    verifyStatus();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createInitialSuperAdmin({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      toast.success("Super Admin account initialized successfully!");
      router.push("/super-admin");
    } catch (error: any) {
      console.error("Super Admin creation failed:", error);
      const msg = error.code === "auth/email-already-in-use"
        ? "This email is already in use. Try signing in directly."
        : error.message || "Failed to initialize Super Admin.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-2">
          <Shield className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Initialize Super Admin
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Create the root platform administrator account to manage schools.
        </p>
      </div>

      {checking ? (
        <div className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-xs text-gray-400">Checking system status...</p>
        </div>
      ) : alreadyExists ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 text-center space-y-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
            <Lock className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Super Admin Already Configured
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 max-w-xs mx-auto">
              A Super Admin account already exists in this Firebase environment. Please log in using your credentials.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all"
          >
            Go to Login
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Super Admin Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Super Admin"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Login Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="superadmin@schoolstudy.com"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Master Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Initializing Super Admin...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Initialize Super Admin Account
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/super-admin/login"
              className="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 transition-colors"
            >
              Already have an account? Sign in to Super Admin here
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
