"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, ShieldAlert } from "lucide-react";
import type { UserRole } from "@/types";

interface PortalWrongRoleModalProps {
  attemptedPortalName: string;
  actualRole: UserRole;
  onDismiss: () => void;
}

const ROLE_INFO_MAP: Record<
  UserRole,
  { name: string; loginRoute: string; buttonText: string }
> = {
  super_admin: {
    name: "Super Administrator",
    loginRoute: "/super-admin/login",
    buttonText: "Go to Super Admin Login",
  },
  school_admin: {
    name: "School Administrator",
    loginRoute: "/admin/login",
    buttonText: "Go to School Admin Login",
  },
  teacher: {
    name: "Teacher / Faculty",
    loginRoute: "/teacher/login",
    buttonText: "Go to Teacher Login",
  },
  student: {
    name: "Student",
    loginRoute: "/student/login",
    buttonText: "Go to Student Login",
  },
};

export function PortalWrongRoleModal({
  attemptedPortalName,
  actualRole,
  onDismiss,
}: PortalWrongRoleModalProps) {
  const correctInfo = ROLE_INFO_MAP[actualRole] || {
    name: "another account type",
    loginRoute: "/login",
    buttonText: "Back to Portal Selection",
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5 text-left space-y-3 dark:border-amber-900/40 dark:bg-amber-950/30 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex-shrink-0 mt-0.5">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            Different Account Detected
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            This account is registered as a{" "}
            <strong className="font-semibold text-gray-900 dark:text-white">
              {correctInfo.name}
            </strong>{" "}
            and does not have access to the {attemptedPortalName}.
          </p>
        </div>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
        <Link
          href={correctInfo.loginRoute}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 active:scale-95 transition-all"
        >
          <span>{correctInfo.buttonText}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
        >
          Try another email
        </button>
      </div>
    </div>
  );
}
