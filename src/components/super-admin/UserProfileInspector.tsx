"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { getLoginLogs } from "@/lib/services/audit.service";
import { useAuth } from "@/hooks/use-auth";
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

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setIsEditing(false);
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

  const handleToggleStatus = async () => {
    if (!currentUser) return;
    if (user.role === "super_admin") {
      toast.warning("Cannot modify Super Admin status.");
      return;
    }

    const nextStatus: UserStatus = user.status === "active" ? "disabled" : "active";
    setTogglingStatus(true);
    try {
      const res = await fetch("/api/super-admin/users/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performerUid: currentUser.uid,
          targetUid: user.uid,
          status: nextStatus,
          reason: `Status toggled from Profile Inspector by ${currentUser.name || currentUser.email}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      const updated = { ...user, status: nextStatus };
      onUserUpdated?.(updated);
      toast.success(`Account ${nextStatus === "active" ? "Activated" : "Disabled"} successfully.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setTogglingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-gray-950 h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-base">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                User Profile Inspector
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Platform Security & Access Audit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Summary Card */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {user.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                user.status === "active"
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {user.status === "active" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {user.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-800 text-xs">
            <div>
              <span className="text-gray-400 block font-medium">Role:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                {user.role.replace("_", " ")}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Tenant Scope:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {user.schoolId ? `School (${user.schoolId.slice(0, 8)}...)` : "Global Platform"}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 gap-6 pt-2">
          <button
            onClick={() => setActiveTab("details")}
            className={`pb-3 text-sm font-semibold transition-colors ${
              activeTab === "details"
                ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`pb-3 text-sm font-semibold transition-colors ${
              activeTab === "activity"
                ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Login & Activity History
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "details" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40 space-y-3 text-sm">
                <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 text-xs font-medium">Firebase UID</span>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-gray-900 dark:text-white">
                    <span>{user.uid}</span>
                    <button
                      onClick={handleCopyUid}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400"
                      title="Copy UID"
                    >
                      {copiedUid ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 text-xs font-medium">Email Address</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-xs">{user.email}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 text-xs font-medium">Account Status</span>
                  <span className="font-semibold text-xs capitalize text-gray-900 dark:text-white">{user.status}</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500 text-xs font-medium">Associated School</span>
                  <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                    {user.schoolId || "Platform Owner"}
                  </span>
                </div>
              </div>

              {/* Account Controls Section */}
              {user.role !== "super_admin" && (
                <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 dark:border-red-900/20 dark:bg-red-950/10 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-1.5">
                    <Shield className="h-4 w-4" />
                    Privileged Account Restriction Controls
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Disabling this account immediately prevents the user from logging in or making any database requests across the platform.
                  </p>
                  <button
                    onClick={handleToggleStatus}
                    disabled={togglingStatus}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                      user.status === "active"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    } disabled:opacity-50`}
                  >
                    {togglingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                    {user.status === "active" ? "Disable & Restrict Account" : "Activate & Restore Account"}
                  </button>
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
                  {loginLogs.map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900/40 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span
                          className={`inline-block font-semibold ${
                            log.status === "success" ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {log.status === "success" ? "Successful Login" : "Failed Login"}
                        </span>
                        <p className="text-gray-400 text-[11px] mt-0.5">
                          IP: {log.ipAddress || "standard"} · {log.userAgent ? log.userAgent.slice(0, 30) + "..." : "Browser"}
                        </p>
                      </div>
                      <span className="text-gray-500 font-mono text-[11px]">
                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "Recent"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
