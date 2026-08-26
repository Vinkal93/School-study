"use client";

import { useState } from "react";
import {
  Settings,
  Shield,
  Lock,
  Database,
  CheckCircle2,
  Server,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export default function PlatformSettingsPage() {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          Platform System Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Global architecture configuration, security thresholds, and platform owner controls.
        </p>
      </div>

      {/* Super Admin Identity Profile */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-600" />
          Super Administrator Identity
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-gray-500">Name:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{profile?.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-gray-500">Email:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{profile?.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-gray-500">Platform Role:</span>
            <span className="font-mono font-bold text-purple-600 dark:text-purple-400 uppercase">
              {profile?.role}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Account Status:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Active & Verified
            </span>
          </div>
        </div>
      </div>

      {/* Security & Multi-Tenancy Architecture Status */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-blue-600" />
          Multi-Tenant Isolation & Security Rules
        </h2>
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900 dark:text-white">Tenant Isolation Active</p>
              <p className="text-xs text-gray-500 mt-0.5">
                School Admins, Teachers, and Students are strictly scoped to their assigned `schoolId` in Firestore security rules.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900 dark:text-white">Privileged Server Operations Protected</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Status changes, role updates, and audit log writes require authenticated Super Admin execution with immutable audit records.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900 dark:text-white">Zero-CORS Client Image Storage</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Client-side compressed Base64 profile photos bypass bucket CORS restrictions on Firebase Spark plan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
