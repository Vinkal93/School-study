"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Mail,
  Lock,
  Building2,
  ShieldCheck,
  Sparkles,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { ensureSuperAdminProfile } from "@/lib/services/user.service";
import { verifySuperAdminPin } from "@/lib/services/security-pin.service";
import { toast } from "sonner";

export default function SuperAdminLoginPage() {
  const [step, setStep] = useState<"credentials" | "pin">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authenticatedUid, setAuthenticatedUid] = useState<string | null>(null);

  const { signIn, signOut } = useAuth();
  const router = useRouter();

  // Step 1: Verify Email & Password, and auto-provision Super Admin profile
  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const profile = await signIn(email, password);

      // Auto-provision/ensure user has Super Admin role for manual Firebase Auth accounts
      await ensureSuperAdminProfile(profile.uid, email);

      setAuthenticatedUid(profile.uid);
      setStep("pin");
      toast.success("Credentials verified. Please enter your 6-digit Security PIN.");
    } catch (error: any) {
      const message =
        error?.code === "auth/invalid-credential" || error?.code === "auth/user-not-found"
          ? "Email or password is incorrect. Please try again."
          : error?.message || "Unable to sign in. Please check your connection and try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify 6-digit Security PIN (Default 630649)
  const handlePinSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const isPinValid = await verifySuperAdminPin(pin);

      if (!isPinValid) {
        toast.error("Invalid Security PIN code. Please check your 6-digit PIN and try again.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Security PIN verified! Welcome Super Admin!");
      router.push("/super-admin");
    } catch (error: any) {
      toast.error("PIN verification error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      portalBadge="Protected Administrative Area"
      badgeIcon={<Shield className="h-3.5 w-3.5 text-indigo-400" />}
      headline="Platform Root Administration"
      description="Secure access for School Study administrators with 2FA Security PIN verification."
      variant="navy"
      features={[
        {
          icon: <ShieldCheck className="h-4 w-4" />,
          title: "Multi-Tenant Fleet Control",
          desc: "Create and manage school tenants with isolated admin provisioning.",
        },
        {
          icon: <KeyRound className="h-4 w-4" />,
          title: "6-Digit 2FA Security PIN",
          desc: "Protected by 6-digit Security PIN code verification.",
        },
        {
          icon: <Lock className="h-4 w-4" />,
          title: "Root-Level Security",
          desc: "Encrypted sessions, IDOR protection, and tenant boundary enforcement.",
        },
      ]}
    >
      <div className="space-y-6">
        {step === "credentials" ? (
          <>
            {/* Step 1 Welcome Header */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-[11px] font-bold text-indigo-700 dark:text-indigo-400 mb-1 border border-indigo-100 dark:border-indigo-800">
                <Lock className="h-3 w-3" />
                <span>Step 1: Administrator Credentials</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Super Admin Sign In
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Enter platform root administrator email & password
              </p>
            </div>

            {/* Step 1 Form */}
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <AuthInput
                id="super-email"
                type="email"
                label="Super Admin Email"
                required
                autoComplete="email"
                icon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@schoolstudy.com"
                disabled={isSubmitting}
              />

              <PasswordInput
                id="super-password"
                label="Master Password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting}
              />

              <AuthButton
                isLoading={isSubmitting}
                loadingText="Verifying Credentials..."
                variant="dark"
                className="mt-2"
              >
                Continue to Security Verification →
              </AuthButton>
            </form>
          </>
        ) : (
          <>
            {/* Step 2 PIN Verification Header */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 border border-emerald-100 dark:border-emerald-800">
                <CheckCircle2 className="h-3 w-3" />
                <span>Step 2: 2FA Security PIN Required</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Enter 6-Digit PIN
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Enter your administrative 6-digit Security PIN code to unlock root access.
              </p>
            </div>

            {/* Step 2 Form */}
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label htmlFor="security-pin" className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                  6-Digit Security Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="security-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit PIN"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-center text-lg font-mono tracking-[0.5em] font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500 text-center">
                  Default initial Security PIN is 630649
                </p>
              </div>

              <AuthButton
                isLoading={isSubmitting}
                loadingText="Verifying PIN Code..."
                variant="dark"
                className="mt-2"
              >
                Verify PIN & Access Dashboard
              </AuthButton>

              <button
                type="button"
                onClick={() => {
                  setStep("credentials");
                  setPin("");
                }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 py-2 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to credentials step
              </button>
            </form>
          </>
        )}

        {/* Navigation & Setup link */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-center space-y-2">
          <Link
            href="/setup-super-admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            First time setup? Initialize Super Admin account →
          </Link>
          <div>
            <Link
              href="/login"
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Back to portal selection
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
