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
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { PortalWrongRoleModal } from "@/components/auth/PortalWrongRoleModal";
import { toast } from "sonner";
import type { UserRole } from "@/types";

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wrongRole, setWrongRole] = useState<UserRole | null>(null);

  const { signIn, signOut } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setWrongRole(null);

    try {
      const profile = await signIn(email, password);

      // Verify that this user is a Super Admin
      if (profile.role !== "super_admin") {
        await signOut();
        setWrongRole(profile.role);
        toast.error(
          "Access Denied: This account does not have Super Administrator privileges."
        );
        return;
      }

      toast.success(`Welcome Super Admin, ${profile.name}!`);
      router.push("/super-admin");
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

  return (
    <AuthLayout
      portalBadge="Protected Administrative Area"
      badgeIcon={<Shield className="h-3.5 w-3.5 text-indigo-400" />}
      headline="Platform Administration"
      description="Secure access for School Study administrators to manage tenants, configure security, and monitor global operations."
      variant="navy"
      features={[
        {
          icon: <ShieldCheck className="h-4 w-4" />,
          title: "Multi-Tenant Fleet Control",
          desc: "Create and manage school tenants with isolated admin provisioning.",
        },
        {
          icon: <Building2 className="h-4 w-4" />,
          title: "Global Platform Analytics",
          desc: "Real-time metrics on total schools, faculty, and student rosters.",
        },
        {
          icon: <Lock className="h-4 w-4" />,
          title: "Root-Level Security",
          desc: "Encrypted sessions, IDOR protection, and tenant boundary enforcement.",
        },
      ]}
    >
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-[11px] font-bold text-indigo-700 dark:text-indigo-400 mb-1 border border-indigo-100 dark:border-indigo-800">
            <Lock className="h-3 w-3" />
            <span>Root System Access</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Super Admin Sign In
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Enter platform root administrator credentials
          </p>
        </div>

        {/* Wrong Role Warning Dialog */}
        {wrongRole && (
          <PortalWrongRoleModal
            attemptedPortalName="Super Admin Gateway"
            actualRole={wrongRole}
            onDismiss={() => setWrongRole(null)}
          />
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            id="super-email"
            type="email"
            label="Super Admin Email"
            required
            autoComplete="email"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="superadmin@schoolstudy.com"
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
            loadingText="Authenticating Super Admin..."
            variant="dark"
            className="mt-2"
          >
            Sign in to Super Admin
          </AuthButton>
        </form>

        {/* Initial Setup link & Back Link */}
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
