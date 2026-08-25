"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Mail,
  ClipboardCheck,
  BookOpen,
  Bell,
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

export default function TeacherLoginPage() {
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

      // Verify that this user is a Teacher
      if (profile.role !== "teacher") {
        await signOut();
        setWrongRole(profile.role);
        toast.error("Access Denied: This account is not a Teacher account.");
        return;
      }

      toast.success(`Welcome back, ${profile.name}!`);
      router.push("/teacher");
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
      portalBadge="Faculty & Classrooms"
      badgeIcon={<Users className="h-3.5 w-3.5" />}
      headline="Teach More. Manage Less."
      description="Access your assigned classes, manage student rosters and mark roll call with ease."
      variant="purple"
      features={[
        {
          icon: <ClipboardCheck className="h-4 w-4" />,
          title: "1-Tap Mobile Attendance",
          desc: "Take daily roll call for 30–40 students comfortably on your phone.",
        },
        {
          icon: <BookOpen className="h-4 w-4" />,
          title: "Classroom Rosters",
          desc: "View your students, admission details, and parent contact information.",
        },
        {
          icon: <Bell className="h-4 w-4" />,
          title: "Announcements & Notices",
          desc: "Stay informed with school circulars and publish class updates.",
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
            Sign in to your Teacher Portal
          </p>
        </div>

        {/* Wrong Role Warning Dialog */}
        {wrongRole && (
          <PortalWrongRoleModal
            attemptedPortalName="Teacher Portal"
            actualRole={wrongRole}
            onDismiss={() => setWrongRole(null)}
          />
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            id="teacher-email"
            type="email"
            label="Email Address"
            required
            autoComplete="email"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@school.com"
            disabled={isSubmitting}
          />

          <div className="space-y-1.5">
            <PasswordInput
              id="teacher-password"
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
                Forgot password? Contact your School Admin
              </span>
            </div>
          </div>

          <AuthButton
            isLoading={isSubmitting}
            loadingText="Signing in to Teacher Portal..."
            variant="indigo"
            className="mt-2"
          >
            Sign in to Teacher Portal
          </AuthButton>
        </form>

        {/* Bottom Navigation Links */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-center space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Not a teacher?{" "}
            <Link
              href="/login"
              className="font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:underline"
            >
              Back to portal selection
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
