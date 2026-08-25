"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Mail,
  Calendar,
  Bell,
  ClipboardCheck,
  ArrowLeft,
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

export default function StudentLoginPage() {
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

      // Verify that this user is a Student
      if (profile.role !== "student") {
        await signOut();
        setWrongRole(profile.role);
        toast.error("Access Denied: This account is not a Student account.");
        return;
      }

      toast.success(`Welcome back, ${profile.name}!`);
      router.push("/student");
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
      portalBadge="Student & Guardian Portal"
      badgeIcon={<GraduationCap className="h-3.5 w-3.5" />}
      headline="Your School. Your Progress."
      description="Stay connected with your classes, attendance logs and school updates in real time."
      variant="emerald"
      features={[
        {
          icon: <ClipboardCheck className="h-4 w-4" />,
          title: "Real-Time Attendance Rate",
          desc: "Live visual percentage meter, present days, and monthly history.",
        },
        {
          icon: <Calendar className="h-4 w-4" />,
          title: "Class Schedule & Routine",
          desc: "Access your timetable, class teacher details, and academic notices.",
        },
        {
          icon: <Bell className="h-4 w-4" />,
          title: "Instant Announcements",
          desc: "Stay notified on exam dates, circulars, and holiday notifications.",
        },
      ]}
    >
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Welcome Back 👋
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Sign in to your Student Portal
          </p>
        </div>

        {/* Wrong Role Warning Dialog */}
        {wrongRole && (
          <PortalWrongRoleModal
            attemptedPortalName="Student Portal"
            actualRole={wrongRole}
            onDismiss={() => setWrongRole(null)}
          />
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            id="student-email"
            type="email"
            label="Email / Student ID"
            required
            autoComplete="username"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@school.com"
            disabled={isSubmitting}
          />

          <div className="space-y-1.5">
            <PasswordInput
              id="student-password"
              label="Password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isSubmitting}
            />
            <div className="flex justify-end">
              <span className="text-[11px] text-gray-400 cursor-not-allowed">
                Forgot password? Contact your Class Teacher
              </span>
            </div>
          </div>

          <AuthButton
            isLoading={isSubmitting}
            loadingText="Signing in to Student Portal..."
            variant="emerald"
            className="mt-2"
          >
            Sign in to Student Portal
          </AuthButton>
        </form>

        {/* Bottom Navigation Links */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-center space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Are you a teacher or school admin?{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:underline"
            >
              Back to portal selection
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
