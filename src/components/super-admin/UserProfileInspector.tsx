"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  User,
  Mail,
  Building2,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Power,
  Edit3,
  Save,
  Loader2,
  Copy,
  Check,
  History,
  ShieldAlert,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { getLoginLogs } from "@/lib/services/audit.service";
import { useAuth } from "@/hooks/use-auth";
import { AccountRestrictionModal } from "./AccountRestrictionModal";
import { StatusChangeConfirmModal } from "./StatusChangeConfirmModal";
import type { AppUser, LoginLogEntry, UserStatus } from "@/types";
import { toast } from "sonner";

interface UserProfileInspectorProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: (updatedUser: AppUser) => void;
}

export function UserProfileInspector({
  user,
  isOpen,
  onClose,
  onUserUpdated,
}: UserProfileInspectorProps) {
  const { profile: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const [loginLogs, setLoginLogs] = useState<LoginLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  // Restriction & Status Modals State
  const [isRestrictModalOpen, setIsRestrictModalOpen] = useState(false);
  const [statusConfirmState, setStatusConfirmState] = useState<{
    isOpen: boolean;
    targetStatus: UserStatus;
  }>({
    isOpen: false,
    targetStatus: "active",
  });

  useEffect(() => {
    if (user) {
      loadUserLogs(user.uid);
    }
  }, [user]);

  const loadUserLogs = async (uid: string) => {
    setLoadingLogs(true);
    try {
      const logs = await getLoginLogs(15, uid);
      setLoginLogs(logs);
    } catch (err) {
      console.warn("Could not load user logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (!isOpen || !user) return null;

  const handleCopyUid = () => {
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
    toast.success("User UID copied to clipboard!");
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Active
          </span>
        );
      case "restricted":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <ShieldAlert className="h-3.5 w-3.5" />
            Restricted
          </span>
        );
      case "suspended":
      case "disabled":
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="h-3.5 w-3.5" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
        <div className="w-full max-w-full sm:max-w-xl bg-white dark:bg-gray-950 h-full min-h-[100dvh] shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-base flex-shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                  User Profile Inspector
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Platform Security & Access Audit
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close user profile inspector"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Summary Card */}
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                  {user.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
              </div>
              <div className="flex-shrink-0">
                {getStatusBadge(user.status)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-800 text-xs">
              <div>
                <span className="text-gray-400 block font-medium">Role:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                  {user.role.replace("_", " ")}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Tenant Scope:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block">
                  {user.schoolId ? `School (${user.schoolId.slice(0, 8)}...)` : "Global Platform"}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200/40 dark:border-gray-800 flex justify-end">
              <Link
                href={`/super-admin/users/${user.uid}`}
                onClick={onClose}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400 min-h-[36px] items-center"
              >
                Open Full Dedicated Profile <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Tab Controls */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 gap-4 sm:gap-6 pt-2 overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setActiveTab("details")}
              className={`pb-3 text-xs sm:text-sm font-semibold transition-colors min-h-[44px] flex items-center ${
                activeTab === "details"
                  ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`pb-3 text-xs sm:text-sm font-semibold transition-colors min-h-[44px] flex items-center ${
                activeTab === "activity"
                  ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              Login & Activity History
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 pb-safe">
            {activeTab === "details" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-white p-3.5 sm:p-4 dark:border-gray-800 dark:bg-gray-900/40 space-y-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800 gap-1">
                    <span className="text-gray-500 text-xs font-medium">Firebase UID</span>
                    <div className="flex items-center gap-1.5 font-mono text-xs text-gray-900 dark:text-white">
                      <span className="truncate max-w-[200px]">{user.uid}</span>
                      <button
                        onClick={handleCopyUid}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Copy UID"
                        aria-label="Copy Firebase UID"
                      >
                        {copiedUid ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800 gap-1">
                    <span className="text-gray-500 text-xs font-medium">Email Address</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-xs truncate">{user.email}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500 text-xs font-medium">Account Status</span>
                    <span className="font-semibold text-xs capitalize text-gray-900 dark:text-white">{user.status}</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-500 text-xs font-medium">Associated School</span>
                    <span className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate">
                      {user.schoolId || "Platform Owner"}
                    </span>
                  </div>
                </div>

                {/* Account Controls Section */}
                {user.role !== "super_admin" && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 sm:p-4 dark:border-gray-800 dark:bg-gray-900/30 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span>Privileged Account Status & Controls</span>
                    </h4>
                    <p className="text-xs text-gray-500">
                      Restrict, suspend, or restore platform operational access with immutable audit logging.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {user.status === "restricted" ? (
                        <button
                          onClick={() =>
                            setStatusConfirmState({ isOpen: true, targetStatus: "active" })
                          }
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors min-h-[44px]"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Remove Restriction
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsRestrictModalOpen(true)}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300 transition-colors min-h-[44px]"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Restrict Account
                        </button>
                      )}

                      {user.status === "active" ? (
                        <button
                          onClick={() =>
                            setStatusConfirmState({ isOpen: true, targetStatus: "suspended" })
                          }
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors min-h-[44px]"
                        >
                          <Power className="h-3.5 w-3.5" />
                          Suspend Account
                        </button>
                      ) : user.status !== "restricted" ? (
                        <button
                          onClick={() =>
                            setStatusConfirmState({ isOpen: true, targetStatus: "active" })
                          }
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors min-h-[44px]"
                        >
                          <Power className="h-3.5 w-3.5" />
                          Re-activate
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-3">
                {loadingLogs ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : loginLogs.length === 0 ? (
                  <div className="text-center py-12 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/20">
                    <History className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-xs text-gray-500">No recorded login logs for this user yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {loginLogs.map((log) => (
                      <div
                        key={log.id || String(log.timestamp)}
                        className="rounded-xl border border-gray-100 bg-white p-3.5 text-xs shadow-sm dark:border-gray-800 dark:bg-gray-900/40"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-semibold ${
                              log.status === "success"
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {log.status === "success" ? "Login Succeeded" : "Login Failed"}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                          {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                          {log.browser && <span>· Browser: {log.browser}</span>}
                          {log.platform && <span>· Platform: {log.platform}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Restriction Modal */}
      <AccountRestrictionModal
        user={user}
        isOpen={isRestrictModalOpen}
        onClose={() => setIsRestrictModalOpen(false)}
        onRestricted={(updatedUser: AppUser) => {
          if (onUserUpdated) onUserUpdated(updatedUser);
        }}
        performerUid={currentUser?.uid || ""}
      />

      {/* Account Status Change Confirmation Modal */}
      <StatusChangeConfirmModal
        user={user}
        targetStatus={statusConfirmState.targetStatus}
        isOpen={statusConfirmState.isOpen}
        onClose={() => setStatusConfirmState({ isOpen: false, targetStatus: "active" })}
        onSuccess={(updatedUser: AppUser) => {
          if (onUserUpdated) onUserUpdated(updatedUser);
        }}
        performerUid={currentUser?.uid || ""}
      />
    </>
  );
}
