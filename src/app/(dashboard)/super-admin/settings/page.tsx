"use client";

import { useState } from "react";
import {
  Settings,
  Shield,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { updateSuperAdminPin } from "@/lib/services/security-pin.service";
import { toast } from "sonner";

export default function PlatformSettingsPage() {
  const { profile } = useAuth();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPin !== confirmPin) {
      toast.error("New PIN and Confirm PIN do not match.");
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      toast.error("New Security PIN must be exactly 6 numeric digits.");
      return;
    }

    setSavingPin(true);
    try {
      const res = await updateSuperAdminPin(currentPin, newPin);

      if (res.success) {
        toast.success(res.message);
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
      } else {
        toast.error(res.message);
      }
    } catch (error: any) {
      toast.error("Failed to update Security PIN.");
    } finally {
      setSavingPin(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          Platform System Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Global architecture configuration, security thresholds, and 2FA PIN security controls.
        </p>
      </div>

      {/* Super Admin Security PIN Management Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Super Admin 6-Digit Security PIN
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
          Manage the 6-digit Security PIN code required for logging into the Super Admin portal (Default: 630649).
        </p>

        <form onSubmit={handleUpdatePin} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Current Security PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter current 6-digit PIN"
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-mono tracking-widest font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              New 6-Digit Security PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter new 6-digit PIN"
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-mono tracking-widest font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Confirm New 6-Digit Security PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Re-enter new 6-digit PIN"
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-mono tracking-widest font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={savingPin}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {savingPin ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating PIN...</span>
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                <span>Update Security PIN</span>
              </>
            )}
          </button>
        </form>
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
              <p className="font-bold text-gray-900 dark:text-white">6-Digit 2FA Security PIN Verification</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Super Admin authentication is protected by mandatory 6-digit Security PIN code verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
