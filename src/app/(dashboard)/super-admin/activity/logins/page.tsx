"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Search,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Smartphone,
  Globe,
  X,
  Copy,
  Check,
  LogOut,
  Lock,
  UserX,
  AlertTriangle,
  User,
  GraduationCap,
  School,
  BookOpen,
  Laptop,
  ExternalLink,
  ShieldAlert,
  Ban,
  Eye,
} from "lucide-react";
import { getLoginLogs } from "@/lib/services/audit.service";
import type { LoginLogEntry } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

export default function LoginActivityPage() {
  const { profile: currentUser } = useAuth();
  const [logs, setLogs] = useState<LoginLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");

  // Right-side Drawer & Security Panel State
  const [selectedLog, setSelectedLog] = useState<LoginLogEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // High-Risk Action Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: "FORCE_LOGOUT" | "SUSPEND" | "BLOCK_IP";
    title: string;
    description: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getLoginLogs(100);
      setLogs(data);
    } catch (err) {
      toast.error("Failed to load login activity logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard.`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRowClick = (log: LoginLogEntry) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  const executeSecurityAction = async () => {
    if (!selectedLog || !confirmModal) return;
    setActionLoading(true);
    try {
      const db = getFirebaseDb();
      const reason = actionReason.trim() || `Super Admin security trigger: ${confirmModal.type}`;

      if (confirmModal.type === "FORCE_LOGOUT") {
        const res = await fetch("/api/super-admin/emergency/user-security", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionType: "FORCE_LOGOUT_USER",
            userId: selectedLog.uid || selectedLog.email,
            reason,
            actorId: currentUser?.email || "super_admin",
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Failed to force logout user.");

        toast.success(`Active sessions revoked for ${selectedLog.email}. User has been force logged out.`);
      } else if (confirmModal.type === "SUSPEND") {
        const res = await fetch("/api/super-admin/emergency/user-security", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionType: "SUSPEND_USER",
            userId: selectedLog.uid || selectedLog.email,
            reason,
            actorId: currentUser?.email || "super_admin",
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Failed to suspend user.");

        toast.success(`User ${selectedLog.email} account has been SUSPENDED.`);
      } else if (confirmModal.type === "BLOCK_IP") {
        const targetIp = selectedLog.ipAddress || "client-direct";
        if (db && targetIp && targetIp !== "client-direct") {
          const cleanDocId = targetIp.replace(/[^a-zA-Z0-9_.-]/g, "_");
          await setDoc(
            doc(db, "securityBlocklist", cleanDocId),
            {
              ip: targetIp,
              userId: selectedLog.uid,
              userEmail: selectedLog.email,
              blockedAt: new Date().toISOString(),
              blockedBy: currentUser?.email || "super_admin",
              reason,
              active: true,
            },
            { merge: true }
          );
        }
        toast.success(`Network IP address ${targetIp} has been added to security blocklist.`);
      }

      setConfirmModal(null);
      setActionReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to execute security action.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.role && log.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.ipAddress && log.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" ? true : log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getRoleIcon = (role?: string) => {
    const r = (role || "").toUpperCase();
    if (r.includes("STUDENT")) return <GraduationCap className="h-4 w-4 text-emerald-500" />;
    if (r.includes("TEACHER")) return <BookOpen className="h-4 w-4 text-blue-500" />;
    if (r.includes("ADMIN") || r.includes("SCHOOL")) return <School className="h-4 w-4 text-purple-500" />;
    return <Shield className="h-4 w-4 text-indigo-500" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Platform Login Activity Stream
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time feed of authentication attempts, active sessions, and security flags across all schools.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 shadow-sm transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Activity
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <label htmlFor="login-search" className="sr-only">
            Search login activity
          </label>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            id="login-search"
            name="search"
            aria-label="Search login activity"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, UID, IP address..."
            className="w-full rounded-xl border border-gray-300 pl-9 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:inline-block">
            Status:
          </span>
          {(["all", "success", "failed"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {st} ({st === "all" ? logs.length : logs.filter((l) => l.status === st).length})
            </button>
          ))}
        </div>
      </div>

      {/* Login Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
              No login logs recorded yet
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Authentication requests will display here in real-time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold text-xs">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">User &amp; Identity</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Auth Result</th>
                  <th className="py-3.5 px-4">Network / IP</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredLogs.map((log, idx) => (
                  <tr
                    key={log.id || idx}
                    onClick={() => handleRowClick(log)}
                    className={cn(
                      "group hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-colors",
                      selectedLog?.id === log.id && "bg-blue-50/70 dark:bg-blue-950/30"
                    )}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "Recent"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {getRoleIcon(log.role)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                            {log.email}
                          </p>
                          <p className="text-[11px] font-mono text-gray-400 truncate">{log.uid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px]">
                        {log.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          log.status === "success"
                            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {log.status === "success" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {log.status === "success" ? "Authorized" : "Denied"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-gray-400" />
                        <span>{log.ipAddress || "client-direct"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(log);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SIDE PANEL / SLIDE-OVER DRAWER: USER SECURITY & CONTROLS            */}
      {/* ========================================================================= */}
      {drawerOpen && selectedLog && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto">
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl shadow-inner">
                    {selectedLog.email ? selectedLog.email.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                      {selectedLog.email}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {selectedLog.role || "USER"}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold uppercase rounded-md",
                          selectedLog.status === "success"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                        )}
                      >
                        {selectedLog.status === "success" ? "Authorized" : "Denied"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6 flex-1">
                {/* User & Key Identifiers */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Security Identifiers
                  </span>

                  {/* UID */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block">User UID</span>
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 break-all">
                        {selectedLog.uid}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedLog.uid, "User UID")}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Copy UID"
                    >
                      {copiedField === "User UID" ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Email */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block">Email Address</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {selectedLog.email}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedLog.email, "Email")}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Copy Email"
                    >
                      {copiedField === "Email" ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* School Affiliation */}
                  {selectedLog.schoolId && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">Associated School</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {selectedLog.schoolId}
                        </span>
                      </div>
                      <a
                        href={`/super-admin/schools/${selectedLog.schoolId}`}
                        className="p-1.5 text-blue-600 hover:text-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                        title="Open School Page"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Connection & Network Intelligence */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Connection &amp; Network Intelligence
                  </span>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-blue-500" /> IP Address:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {selectedLog.ipAddress || "client-direct"}
                        </span>
                        {selectedLog.ipAddress && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedLog.ipAddress!, "IP Address")}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Laptop className="h-3.5 w-3.5 text-purple-500" /> Platform / Device:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedLog.platform || selectedLog.deviceType || "Browser Client (Web)"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-500" /> Attempt Timestamp:
                      </span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {selectedLog.timestamp?.toDate
                          ? selectedLog.timestamp.toDate().toLocaleString()
                          : "Recent"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Control Actions */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Security Command Controls
                  </span>

                  {/* Force Logout */}
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmModal({
                        open: true,
                        type: "FORCE_LOGOUT",
                        title: "Force Logout User & Revoke Session",
                        description: `This will invalidate all active JWT tokens and force user "${selectedLog.email}" to re-authenticate immediately.`,
                      })
                    }
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-700 dark:text-red-400 font-semibold text-xs transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <LogOut className="h-4 w-4 text-red-600" />
                      <div className="text-left">
                        <span className="block font-bold">Emergency Force Logout</span>
                        <span className="text-[10px] text-red-500 font-normal">
                          Instantly terminate all active web &amp; mobile sessions
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold">Execute →</span>
                  </button>

                  {/* Suspend Account */}
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmModal({
                        open: true,
                        type: "SUSPEND",
                        title: "Suspend User Account",
                        description: `This will lock user "${selectedLog.email}" from signing into any school study portal until manually unblocked.`,
                      })
                    }
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold text-xs transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserX className="h-4 w-4 text-amber-600" />
                      <div className="text-left">
                        <span className="block font-bold">Suspend User Account</span>
                        <span className="text-[10px] text-amber-600/80 font-normal">
                          Disable sign-in credentials and freeze privileges
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold">Suspend →</span>
                  </button>

                  {/* Block Device / IP */}
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmModal({
                        open: true,
                        type: "BLOCK_IP",
                        title: `Block Network IP: ${selectedLog.ipAddress || "client-direct"}`,
                        description: `Block requests originating from IP ${selectedLog.ipAddress || "client-direct"} from authenticating on this platform.`,
                      })
                    }
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Ban className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <div className="text-left">
                        <span className="block font-bold">Block Network IP / Device</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Add client IP address to global security blocklist
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold">Block →</span>
                  </button>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(selectedLog, null, 2), "Diagnostics Payload")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Payload JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL FOR HIGH-RISK SECURITY ACTIONS                         */}
      {/* ========================================================================= */}
      {confirmModal && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 my-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-150 dark:border-slate-800 pb-3">
              <div className="h-10 w-10 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {confirmModal.title}
                </h3>
                <span className="text-xs text-slate-500 font-mono">{selectedLog.email}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {confirmModal.description}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Audit Reason / Justification *
              </label>
              <input
                type="text"
                required
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g. Suspicious login from unrecognized location"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={executeSecurityAction}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-500/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm &amp; Execute</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
