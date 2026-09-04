"use client";

import React, { useState } from "react";
import { usePortalUI } from "@/context/portal-ui-context";
import {
  PORTAL_LIST,
  PortalKey,
  PortalUIVersion,
  PortalMetaInfo,
} from "@/types/portal-ui";
import {
  Palette,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Shield,
  Building2,
  BookOpen,
  GraduationCap,
  History,
  Clock,
  User,
  ArrowRight,
  ExternalLink,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function PortalUIVersionPage() {
  const {
    settings,
    loading,
    setPortalVersion,
    resetAllToClassic,
  } = usePortalUI();

  // Confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    portalKey: PortalKey;
    portalLabel: string;
    fromVersion: PortalUIVersion;
    toVersion: PortalUIVersion;
  } | null>(null);

  const [saving, setSaving] = useState(false);

  // Emergency reset confirmation
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const portalIconMap: Record<PortalKey, React.ReactNode> = {
    landingPage: <Globe className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
    schoolAdmin: <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
    teacher: <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
    student: <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
    superAdmin: <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
  };

  const handleSelectVersion = (portal: PortalMetaInfo, targetVersion: PortalUIVersion) => {
    const current = settings[portal.key];
    if (current === targetVersion) return; // already active

    setConfirmModal({
      open: true,
      portalKey: portal.key,
      portalLabel: portal.label,
      fromVersion: current,
      toVersion: targetVersion,
    });
  };

  const handleConfirmSwitch = async () => {
    if (!confirmModal) return;
    setSaving(true);
    try {
      await setPortalVersion(confirmModal.portalKey, confirmModal.toVersion);
      toast.success(
        `Successfully switched ${confirmModal.portalLabel} to ${
          confirmModal.toVersion === "new" ? "Modern UI 2.0" : "Classic"
        } in real-time!`
      );
      setConfirmModal(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update portal UI version.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmEmergencyReset = async () => {
    setSaving(true);
    try {
      await resetAllToClassic();
      toast.success("Emergency Rollback: All 4 portals reverted to Classic UI in real-time!");
      setResetModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to execute rollback.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-fadeIn">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Palette className="h-4 w-4" />
            <span>Multi-Portal Shell Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Portal UI/UX Version Control
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Centrally manage and toggle active presentation shells across all system portals.
            Switch between Classic (production stable) and Modern UI 2.0 with instant zero-logout rollback.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60 font-bold text-xs active:scale-95 transition-all shadow-xs"
          >
            <RotateCcw className="h-4 w-4 text-red-600" />
            <span>Emergency Rollback All to Classic</span>
          </button>
        </div>
      </div>

      {/* 2. Architecture Notice Box */}
      <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 flex items-start gap-3.5 text-xs text-slate-700 dark:text-slate-300">
        <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-blue-950 dark:text-blue-200">
            Realtime Shell Isolation Guarantee
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Changing versions updates presentation shells only. Business logic, Firebase Authentication,
            Multi-Tenant Isolation, Subscriptions, Entitlements, and Firestore Security Rules remain 100%
            identical. A built-in React Error Boundary automatically falls back to Classic if the New UI
            encounters any runtime error.
          </p>
        </div>
      </div>

      {/* 3. The 4 Portal Version Control Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PORTAL_LIST.map((portal) => {
          const currentVer = settings[portal.key];
          const isNew = currentVer === "new";

          return (
            <div
              key={portal.key}
              className={`rounded-3xl border transition-all duration-200 p-6 flex flex-col justify-between gap-5 relative overflow-hidden bg-white dark:bg-slate-900 shadow-sm ${
                isNew
                  ? "border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-500/20"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              {/* Top Row: Icon, Title, and Active Badge */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700/60">
                      {portalIconMap[portal.key]}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        {portal.label}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400">
                        {portal.routePrefix}/*
                      </span>
                    </div>
                  </div>

                  {/* Active Status Badge */}
                  <div>
                    {isNew ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
                        <Sparkles className="h-3 w-3" />
                        Modern UI 2.0
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        Classic (Stable)
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {portal.description}
                </p>
              </div>

              {/* Version Selector Buttons */}
              <div className="space-y-3 pt-2">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Select Active Presentation Shell
                </label>
                <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => handleSelectVersion(portal, "classic")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      !isNew
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {!isNew && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    <span>Classic UI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectVersion(portal, "new")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      isNew
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm font-black"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {isNew && <Sparkles className="h-3.5 w-3.5 text-amber-300" />}
                    <span>Modern UI 2.0</span>
                  </button>
                </div>
              </div>

              {/* Bottom Metadata & Test Link */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5 truncate">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {settings.updatedAt ? "Live Firestore Synced" : "Default Mode"}
                  </span>
                </div>

                <Link
                  href={portal.routePrefix}
                  target="_blank"
                  className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                >
                  <span>Open Portal</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Audit & Change History */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Recent Shell Switch Audit Logs
          </h2>
        </div>

        {(!settings.history || settings.history.length === 0) ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No version switches recorded yet. All portals are currently running on stable Classic mode.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">Timestamp</th>
                  <th className="pb-3 px-3">Portal</th>
                  <th className="pb-3 px-3">Transition</th>
                  <th className="pb-3 px-3">Changed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {settings.history.slice(0, 15).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {new Date(item.changedAt).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white capitalize">
                      {item.portal}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <span className="capitalize">{item.from}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className={`capitalize font-bold ${item.to === "new" ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {item.to === "new" ? "Modern 2.0" : "Classic"}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium">
                      {item.changedByName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Switch Confirmation Modal */}
      {confirmModal && confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-scaleIn">
            <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Confirm UI Version Switch
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time presentation shell switch
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to switch the <strong className="text-slate-900 dark:text-white">{confirmModal.portalLabel}</strong> from{" "}
              <strong className="capitalize">{confirmModal.fromVersion === "new" ? "Modern UI 2.0" : "Classic"}</strong> to{" "}
              <strong className="text-indigo-600 dark:text-indigo-400 capitalize">
                {confirmModal.toVersion === "new" ? "Modern UI 2.0" : "Classic"}
              </strong>?
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Active users on this portal will immediately see the updated presentation shell without logging out.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmSwitch}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs hover:opacity-95 active:scale-95 transition-all shadow-md"
              >
                {saving ? "Applying Switch..." : "Confirm & Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Emergency Reset All Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-red-200 dark:border-red-900/60 shadow-2xl p-6 space-y-5 animate-scaleIn">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/60 flex items-center justify-center border border-red-100 dark:border-red-900/40">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Emergency Rollback to Classic
                </h3>
                <p className="text-xs text-slate-500">
                  Revert all 4 portals immediately
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This action will instantly revert <strong className="text-slate-900 dark:text-white">School Admin, Teacher, Student, and Super Admin</strong> portals back to the stable Classic production shell.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmEmergencyReset}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-black text-xs hover:bg-red-700 active:scale-95 transition-all shadow-md"
              >
                {saving ? "Reverting All..." : "Yes, Revert All to Classic"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
