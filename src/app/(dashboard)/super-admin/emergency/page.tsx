"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Power,
  RefreshCw,
  Sliders,
  Users,
  Building2,
  Lock,
  Eye,
  CreditCard,
  Bell,
  Megaphone,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Search,
  UserX,
  LogOut,
  Ban,
  Radio,
  FileText,
  Loader2,
  X,
  UserCheck,
  Layers,
  Phone,
  Mail,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getGlobalEmergencyControls,
  updateGlobalEmergencyControls,
  getSchoolEmergencyControl,
  updateSchoolEmergencyControl,
  getUserSecurityControl,
  updateUserSecurityControl,
  GlobalEmergencyControls,
  SystemStatus,
  EmergencySeverity,
  EmergencySystemMetrics,
} from "@/lib/emergency/emergencyEngine";
import { toast } from "sonner";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

export default function SuperAdminEmergencyControlCenter() {
  const { profile } = useAuth();
  const [controls, setControls] = useState<GlobalEmergencyControls | null>(null);
  const [metrics, setMetrics] = useState<EmergencySystemMetrics | null>(null);
  const [schoolsList, setSchoolsList] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tab State for Modules / Features / Operations
  const [activeTab, setActiveTab] = useState<"modules" | "features" | "operations">("modules");

  // User Action Form State
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [userActionLoading, setUserActionLoading] = useState(false);

  // School Action Form State
  const [schoolSearchQuery, setSchoolSearchQuery] = useState("");
  const [targetSchoolId, setTargetSchoolId] = useState("nNuxKZJOvLi3fzDhAtag");
  const [schoolActionLoading, setSchoolActionLoading] = useState(false);

  // High-Risk Step-Up Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: string;
    title: string;
    description: string;
    execute: (reason: string) => Promise<void>;
  } | null>(null);
  const [actionReason, setActionReason] = useState("");

  // Announcement Modal State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "System Maintenance Notice",
    message: "Critical services are currently undergoing maintenance. Your data remains safe.",
    reason: "Scheduled server database optimization, security patches, and performance enhancements.",
    expectedResolution: "Within 45 to 60 minutes (~ 5:00 PM IST)",
    affectedModules: ["Student Portal", "Fee Collection", "Attendance Automation"],
    supportPhone: "+91 9118245636",
    supportEmail: "SBCI224234@gmail.com",
    supportHours: "Mon - Sat (9:00 AM - 7:00 PM IST)",
    severity: "WARNING" as EmergencySeverity,
    target: "ALL" as "ALL" | "SCHOOLS" | "ROLES",
  });

  const fetchMetrics = React.useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/emergency/metrics");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.metrics) {
          setMetrics(json.metrics);
        }
      }
    } catch (e) {
      console.warn("Metrics fetch error:", e);
    }
  }, []);

  // Real-time Firestore Sync & Initial Fallback Load
  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | undefined;

    fetchMetrics();

    // Fetch registered schools list for selector
    fetch("/api/super-admin/schools")
      .then((r) => r.json())
      .then((d) => {
        if (mounted && d.success && Array.isArray(d.schools)) {
          setSchoolsList(d.schools);
          if (d.schools.length > 0 && !targetSchoolId) {
            setTargetSchoolId(d.schools[0].id);
          }
        }
      })
      .catch(() => {});

    // Direct immediate load to unblock UI instantly
    getGlobalEmergencyControls()
      .then((c) => {
        if (mounted && c) {
          setControls((prev) => prev || c);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const db = getFirebaseDb();
    if (db) {
      try {
        unsub = onSnapshot(
          doc(db, "siteSettings", "emergency_controls"),
          (snap) => {
            if (mounted) {
              if (snap.exists()) {
                setControls(snap.data() as GlobalEmergencyControls);
              }
              setLoading(false);
              fetchMetrics();
            }
          },
          (err) => {
            console.warn("Emergency controls snapshot notice:", err);
            if (mounted) setLoading(false);
          }
        );
      } catch (err) {
        if (mounted) setLoading(false);
      }
    }

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, [fetchMetrics]);

  const handleUpdateControls = async (input: Partial<GlobalEmergencyControls>, reason: string = "Emergency Toggle") => {
    setSaving(true);
    try {
      const updated = await updateGlobalEmergencyControls(input, profile?.email || "super_admin", reason);
      setControls(updated);
      toast.success("Emergency controls updated in real-time across all portals!");
      fetchMetrics();
    } catch (err: any) {
      toast.error(err.message || "Failed to update emergency controls.");
    } finally {
      setSaving(false);
    }
  };

  const openHighRiskConfirmation = (
    type: string,
    title: string,
    description: string,
    execute: (reason: string) => Promise<void>
  ) => {
    setPendingAction({ type, title, description, execute });
    setActionReason("");
    setConfirmModalOpen(true);
  };

  const executeConfirmedAction = async () => {
    if (!pendingAction) return;
    if (!actionReason.trim()) {
      toast.error("Please provide a mandatory justification reason.");
      return;
    }

    setSaving(true);
    try {
      await pendingAction.execute(actionReason.trim());
      setConfirmModalOpen(false);
      setPendingAction(null);
      setActionReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to execute emergency action.");
    } finally {
      setSaving(false);
    }
  };

  // User Emergency Actions
  const handleUserAction = async (actionType: string) => {
    const uid = targetUserId.trim() || userSearchQuery.trim();
    if (!uid && actionType !== "FORCE_LOGOUT_ALL") {
      toast.error("Please enter a User ID or Email.");
      return;
    }

    const actionTitle =
      actionType === "FORCE_LOGOUT_USER"
        ? `Force Logout User: ${uid}`
        : actionType === "SUSPEND_USER"
        ? `Suspend Account: ${uid}`
        : actionType === "RESUME_USER"
        ? `Reactivate Account: ${uid}`
        : "CRITICAL: Invalidate All Active Sessions System-Wide";

    const actionDescription =
      actionType === "FORCE_LOGOUT_ALL"
        ? "This high-risk action will bump global security version and force-logout all active users across all portals."
        : `This high-risk action will immediately affect user "${uid}".`;

    openHighRiskConfirmation(actionType, actionTitle, actionDescription, async (reason) => {
      setUserActionLoading(true);
      try {
        const res = await fetch("/api/super-admin/emergency/user-security", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionType,
            userId: uid,
            reason,
            actorId: profile?.email || "super_admin",
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed user action.");
        toast.success(json.message || "User security action completed!");
        fetchMetrics();
      } finally {
        setUserActionLoading(false);
      }
    });
  };

  // School Emergency Actions
  const handleSchoolAction = async (actionType: string) => {
    const schoolId = targetSchoolId.trim() || schoolSearchQuery.trim();
    if (!schoolId) {
      toast.error("Please select or enter a School ID.");
      return;
    }

    const actionTitle =
      actionType === "PAUSE"
        ? `Pause School Operations (${schoolId})`
        : actionType === "ACTIVE"
        ? `Restore Normal Operations (${schoolId})`
        : actionType === "READ_ONLY"
        ? `Set School to Read-Only (${schoolId})`
        : `Force Logout All Users of School (${schoolId})`;

    openHighRiskConfirmation(
      actionType,
      actionTitle,
      `This action will alter operational status and access for school "${schoolId}".`,
      async (reason) => {
        setSchoolActionLoading(true);
        try {
          if (actionType === "FORCE_LOGOUT_ALL") {
            const res = await fetch("/api/super-admin/emergency/user-security", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                actionType: "FORCE_LOGOUT_SCHOOL",
                schoolId,
                reason,
                actorId: profile?.email || "super_admin",
              }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Failed school force logout.");
            toast.success(json.message);
          } else {
            const newStatus = actionType === "PAUSE" ? "PAUSED" : actionType === "READ_ONLY" ? "READ_ONLY" : "ACTIVE";
            await updateSchoolEmergencyControl(
              schoolId,
              {
                status: newStatus,
              },
              profile?.email || "super_admin",
              reason
            );
            toast.success(`School "${schoolId}" operations updated to ${newStatus}!`);
            fetchMetrics();
          }
        } finally {
          setSchoolActionLoading(false);
        }
      }
    );
  };

  // Master System Status Dropdown Handler
  const handleSystemStatusChange = (newStatus: SystemStatus) => {
    openHighRiskConfirmation(
      "SYSTEM_STATUS_CHANGE",
      `Set Master System Status to ${newStatus}`,
      `Changing system status to ${newStatus} will instantly enforce new emergency policies system-wide.`,
      async (reason) => {
        await handleUpdateControls(
          {
            systemStatus: newStatus,
            maintenanceMode: newStatus === "MAINTENANCE",
            readOnlyMode: newStatus === "READ_ONLY",
          },
          reason
        );
      }
    );
  };

  const openAnnouncementModal = () => {
    if (controls?.emergencyAnnouncement) {
      setAnnouncementForm({
        title: controls.emergencyAnnouncement.title || "System Maintenance Notice",
        message: controls.emergencyAnnouncement.message || "Some services are currently undergoing maintenance.",
        reason: controls.emergencyAnnouncement.reason || "Scheduled server database optimization and security maintenance.",
        expectedResolution: controls.emergencyAnnouncement.expectedResolution || "Within 45 to 60 minutes",
        affectedModules: controls.emergencyAnnouncement.affectedModules || ["Student Portal", "Fee Collection", "Attendance Automation"],
        supportPhone: controls.emergencyAnnouncement.supportPhone || "+91 9118245636",
        supportEmail: controls.emergencyAnnouncement.supportEmail || "SBCI224234@gmail.com",
        supportHours: controls.emergencyAnnouncement.supportHours || "Mon - Sat (9:00 AM - 7:00 PM IST)",
        severity: controls.emergencyAnnouncement.severity || "WARNING",
        target: controls.emergencyAnnouncement.target || "ALL",
      });
    }
    setShowAnnouncementModal(true);
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleUpdateControls(
      {
        emergencyAnnouncement: {
          active: true,
          title: announcementForm.title,
          message: announcementForm.message,
          reason: announcementForm.reason,
          expectedResolution: announcementForm.expectedResolution,
          affectedModules: announcementForm.affectedModules,
          supportPhone: announcementForm.supportPhone,
          supportEmail: announcementForm.supportEmail,
          supportHours: announcementForm.supportHours,
          severity: announcementForm.severity,
          target: announcementForm.target,
          updatedAt: new Date().toISOString(),
          updatedBy: profile?.email || "super_admin",
        },
      },
      "Published Realtime Emergency Announcement"
    );
    setShowAnnouncementModal(false);
  };

  const toggleAffectedModule = (moduleName: string) => {
    setAnnouncementForm((prev) => {
      const exists = prev.affectedModules.includes(moduleName);
      return {
        ...prev,
        affectedModules: exists
          ? prev.affectedModules.filter((m) => m !== moduleName)
          : [...prev.affectedModules, moduleName],
      };
    });
  };

  if (loading || !controls) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-red-600" />
        <span className="text-sm font-semibold">Loading Super Admin Emergency Control Center...</span>
      </div>
    );
  }

  const isEmergencyActive = controls.systemStatus !== "NORMAL" || controls.maintenanceMode || controls.readOnlyMode;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Active Emergency Banner Alert */}
      {isEmergencyActive && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-red-600 text-white shadow-xl animate-pulse">
          <div className="flex items-center gap-3">
            <Flame className="h-6 w-6 shrink-0" />
            <div>
              <div className="font-bold text-sm">Emergency Mode is Active ({controls.systemStatus})</div>
              <div className="text-xs opacity-90">
                System controls are actively restricting feature access and operations in real-time.
              </div>
            </div>
          </div>
          <button
            onClick={() => handleSystemStatusChange("NORMAL")}
            className="px-4 py-2 bg-white text-red-700 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all shrink-0"
          >
            Restore Normal Mode
          </button>
        </div>
      )}

      {/* Header Banner & Master Status Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold flex items-center gap-2.5">
              <ShieldAlert className="h-7 w-7 text-red-500" />
              Emergency Control Center
            </h1>
            <span
              className={`px-3 py-1 text-xs font-extrabold uppercase rounded-full tracking-wider ${
                controls.systemStatus === "NORMAL"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {controls.systemStatus}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time system control, security, and granular access kill switches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchMetrics()}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white cursor-pointer"
            title="Refresh Live Metrics"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400">Master Status:</span>
            <select
              value={controls.systemStatus}
              onChange={(e) => handleSystemStatusChange(e.target.value as SystemStatus)}
              className="bg-slate-950 text-xs font-bold text-white border border-slate-700 rounded-xl px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="NORMAL">🟢 NORMAL</option>
              <option value="LIMITED">🟡 LIMITED</option>
              <option value="EMERGENCY">🔴 EMERGENCY</option>
              <option value="MAINTENANCE">🔧 MAINTENANCE</option>
              <option value="READ_ONLY">⛔ READ ONLY</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top 5 Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-blue-500" />
            <span>System Status</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span className={controls.systemStatus === "NORMAL" ? "text-emerald-600" : "text-red-600"}>
              {controls.systemStatus}
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-amber-500" />
            <span>Affected Schools</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {metrics ? `${metrics.affectedSchoolsCount} / ${metrics.totalSchoolsCount}` : "0 / 0"}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Sliders className="h-4 w-4 text-purple-500" />
            <span>Disabled Modules</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {Object.values(controls.moduleKillSwitches || {}).filter((v) => v === "OFF").length} / 7
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-indigo-500" />
            <span>Suspended Users</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {metrics ? metrics.suspendedUsersCount : 0}
          </div>
        </div>

        {/* Metric 5 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-emerald-500" />
            <span>System Uptime</span>
          </div>
          <div className="text-lg font-bold text-emerald-600">
            {metrics ? `${metrics.uptimePercentage}%` : "99.85%"}
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Global Controls & Announcements */}
        <div className="space-y-6">
          {/* Global Emergency Switches Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Power className="h-4 w-4 text-red-500" />
              Global Emergency Controls
            </h3>

            <div className="space-y-3 text-xs">
              {/* Maintenance Mode */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Maintenance Mode</div>
                  <div className="text-[11px] text-slate-500">Put entire system in maintenance</div>
                </div>
                <button
                  onClick={() => handleUpdateControls({ maintenanceMode: !controls.maintenanceMode })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all ${
                    controls.maintenanceMode ? "bg-red-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Read Only Mode */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Read Only Mode</div>
                  <div className="text-[11px] text-slate-500">Allow only read operations</div>
                </div>
                <button
                  onClick={() => handleUpdateControls({ readOnlyMode: !controls.readOnlyMode })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all ${
                    controls.readOnlyMode ? "bg-red-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Disable New Signups */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Disable New Signups</div>
                  <div className="text-[11px] text-slate-500">Prevent new user registrations</div>
                </div>
                <button
                  onClick={() => handleUpdateControls({ disableSignups: !controls.disableSignups })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all ${
                    controls.disableSignups ? "bg-red-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Payment System */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Payment System Gateway</div>
                  <div className="text-[11px] text-slate-500">Razorpay online checkout engine</div>
                </div>
                <select
                  value={controls.paymentSystemStatus}
                  onChange={(e) => handleUpdateControls({ paymentSystemStatus: e.target.value as any })}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl px-2 py-1"
                >
                  <option value="ONLINE">🟢 ONLINE</option>
                  <option value="LIMITED">🟡 LIMITED</option>
                  <option value="OFFLINE">🔴 OFFLINE</option>
                </select>
              </div>
            </div>
          </div>

          {/* Emergency Banner Manager */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-blue-500" />
                Emergency Announcement Banner
              </h3>
              <button
                onClick={openAnnouncementModal}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {controls.emergencyAnnouncement?.active ? "Edit / Update" : "Publish New"}
              </button>
            </div>

            {controls.emergencyAnnouncement?.active ? (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>{controls.emergencyAnnouncement.title}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-800/50 text-[10px] font-extrabold uppercase">
                    {controls.emergencyAnnouncement.severity}
                  </span>
                </div>

                {/* What happened / Reason */}
                {controls.emergencyAnnouncement.reason && (
                  <div className="text-[11px] text-amber-800 dark:text-amber-300">
                    <strong>Reason:</strong> {controls.emergencyAnnouncement.reason}
                  </div>
                )}

                {/* Kabtak Theek Hoga / ETA */}
                {controls.emergencyAnnouncement.expectedResolution && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-200 bg-amber-200/40 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                    <Clock className="h-3 w-3 text-amber-700 dark:text-amber-300" />
                    <span>ETA: {controls.emergencyAnnouncement.expectedResolution}</span>
                  </div>
                )}

                {/* Affected Modules */}
                {controls.emergencyAnnouncement.affectedModules && controls.emergencyAnnouncement.affectedModules.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {controls.emergencyAnnouncement.affectedModules.map((m, i) => (
                      <span key={i} className="text-[10px] bg-white/60 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-medium text-slate-700 dark:text-slate-300">
                        {m}
                      </span>
                    ))}
                  </div>
                )}

                {/* Helpline */}
                <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1 border-t border-amber-200 dark:border-amber-900/80">
                  <Phone className="h-3 w-3" />
                  <span>{controls.emergencyAnnouncement.supportPhone || "+91 9118245636"}</span>
                  <span>•</span>
                  <Mail className="h-3 w-3" />
                  <span>{controls.emergencyAnnouncement.supportEmail || "SBCI224234@gmail.com"}</span>
                </div>

                <div className="pt-1 flex justify-end gap-2">
                  <button
                    onClick={() =>
                      handleUpdateControls({
                        emergencyAnnouncement: { ...controls.emergencyAnnouncement, active: false },
                      })
                    }
                    className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    Dismiss Banner
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No emergency banner currently active.</p>
            )}
          </div>
        </div>

        {/* Center Column: Module & Granular Feature Kill Switches */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-purple-500" />
                Module & Feature Kill Switches
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("modules")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "modules" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Modules
                </button>
                <button
                  onClick={() => setActiveTab("features")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "features" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Actions
                </button>
              </div>
            </div>

            {activeTab === "modules" && (
              <div className="space-y-2.5 text-xs">
                {[
                  { key: "students", label: "Students Management" },
                  { key: "teachers", label: "Teachers & Staff" },
                  { key: "attendance", label: "Attendance Automation" },
                  { key: "fees", label: "Fees Collection" },
                  { key: "reports", label: "Reports & Analytics" },
                  { key: "payments", label: "Online Payments" },
                  { key: "notices", label: "Notices & Announcements" },
                ].map((mod) => {
                  const currentVal = controls.moduleKillSwitches?.[mod.key] || "ON";
                  return (
                    <div key={mod.key} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{mod.label}</div>
                      <div className="flex gap-1">
                        {(["ON", "LIMITED", "OFF"] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() =>
                              handleUpdateControls({
                                moduleKillSwitches: { ...controls.moduleKillSwitches, [mod.key]: st },
                              })
                            }
                            className={`px-2.5 py-1 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer ${
                              currentVal === st
                                ? st === "ON"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : st === "LIMITED"
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "bg-red-600 text-white shadow-xs"
                                : "bg-white dark:bg-slate-800 text-slate-400 hover:bg-slate-100"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "features" && (
              <div className="space-y-2 text-xs">
                {[
                  { key: "students.add", label: "Add Student" },
                  { key: "students.edit", label: "Edit Student" },
                  { key: "students.delete", label: "Delete Student" },
                  { key: "students.import", label: "Bulk Import" },
                  { key: "fees.collect", label: "Fee Collection" },
                  { key: "fees.refund", label: "Fee Refund" },
                  { key: "fees.delete", label: "Delete Transaction" },
                  { key: "reports.export", label: "Report Export" },
                ].map((feat) => {
                  const isOff = controls.featureKillSwitches?.[feat.key] === "OFF";
                  return (
                    <div key={feat.key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{feat.label}</span>
                      <button
                        onClick={() =>
                          handleUpdateControls({
                            featureKillSwitches: {
                              ...controls.featureKillSwitches,
                              [feat.key]: isOff ? "ON" : "OFF",
                            },
                          })
                        }
                        className={`px-3 py-1 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                          isOff ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
                        }`}
                      >
                        {isOff ? "DISABLED" : "ENABLED"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: User & School Emergency Action Panels */}
        <div className="space-y-6">
          {/* User Emergency Actions */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserX className="h-4 w-4 text-indigo-500" />
              User Security Actions
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-400">Target User (UID or Email):</label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. user@school.com or UID"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleUserAction("FORCE_LOGOUT_USER")}
                  disabled={userActionLoading}
                  className="p-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-bold rounded-xl border border-red-200 dark:border-red-900 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Force Logout</span>
                </button>

                <button
                  onClick={() => handleUserAction("SUSPEND_USER")}
                  disabled={userActionLoading}
                  className="p-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold rounded-xl border border-amber-200 dark:border-amber-900 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Suspend</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUserAction("RESUME_USER")}
                  disabled={userActionLoading}
                  className="p-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Reactivate</span>
                </button>

                <button
                  onClick={() => handleUserAction("FORCE_LOGOUT_ALL")}
                  disabled={userActionLoading}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer text-center text-[10px]"
                >
                  <LogOut className="h-3.5 w-3.5 text-red-400" />
                  <span>Logout All Users</span>
                </button>
              </div>
            </div>
          </div>

          {/* School Emergency Actions */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-500" />
              School Emergency Actions
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-400">Target School:</label>
                {schoolsList.length > 0 ? (
                  <select
                    value={targetSchoolId}
                    onChange={(e) => setTargetSchoolId(e.target.value)}
                    className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    {schoolsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ""} - {s.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={targetSchoolId}
                    onChange={(e) => setTargetSchoolId(e.target.value)}
                    className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                    placeholder="Enter School ID..."
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleSchoolAction("PAUSE")}
                  disabled={schoolActionLoading}
                  className="p-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>Pause School</span>
                </button>

                <button
                  onClick={() => handleSchoolAction("ACTIVE")}
                  disabled={schoolActionLoading}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Restore Normal</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSchoolAction("READ_ONLY")}
                  disabled={schoolActionLoading}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Read Only</span>
                </button>

                <button
                  onClick={() => handleSchoolAction("FORCE_LOGOUT_ALL")}
                  disabled={schoolActionLoading}
                  className="p-2.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer text-center text-[10px]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout School</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* High-Risk Action Confirmation Step-Up Modal */}
      {confirmModalOpen && pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert className="h-7 w-7" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{pendingAction.title}</h3>
                <p className="text-xs text-slate-500">{pendingAction.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Mandatory Justification Reason:
              </label>
              <textarea
                placeholder="Enter justification for security audit logs..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                disabled={saving}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 cursor-pointer flex items-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Emergency Action"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Announcement Publisher Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-blue-600" />
                Publish Emergency Announcement
              </h3>
              <button onClick={() => setShowAnnouncementModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePublishAnnouncement} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Banner Title:</label>
                <input
                  type="text"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              {/* What happened / Kya hua hai */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
                  <span>What Happened / Root Cause (Kya hua hai):</span>
                </label>
                <textarea
                  value={announcementForm.reason}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, reason: e.target.value })}
                  placeholder="e.g. Scheduled database optimization and critical security maintenance."
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  rows={2}
                  required
                />
              </div>

              {/* When will it be fixed / Kabtak theek hoga */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span>Estimated Resolution / ETA (Kabtak theek hoga):</span>
                </label>
                <input
                  type="text"
                  value={announcementForm.expectedResolution}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, expectedResolution: e.target.value })}
                  placeholder="e.g. Expected resolution by 4:30 PM IST (within 45 mins)"
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  required
                />
              </div>

              {/* Affected Modules Checklist */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Layers className="h-3.5 w-3.5 text-purple-500" />
                  <span>Impacted Services & Portals:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    "Student Portal",
                    "Teacher Portal",
                    "Fee Collection",
                    "Online Payments",
                    "Attendance Automation",
                    "Exams & Results",
                    "Admissions",
                    "Reports & Exports",
                  ].map((moduleName) => {
                    const isChecked = announcementForm.affectedModules.includes(moduleName);
                    return (
                      <button
                        type="button"
                        key={moduleName}
                        onClick={() => toggleAffectedModule(moduleName)}
                        className={`p-2 rounded-xl text-[11px] font-semibold text-left border transition-all cursor-pointer ${
                          isChecked
                            ? "bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-700 dark:text-blue-300"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {isChecked ? "✓ " : "+ "}
                        {moduleName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Support Contacts */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Support Helpline:</label>
                  <input
                    type="text"
                    value={announcementForm.supportPhone}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, supportPhone: e.target.value })}
                    className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Support Email:</label>
                  <input
                    type="email"
                    value={announcementForm.supportEmail}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, supportEmail: e.target.value })}
                    className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Severity Level:</label>
                  <select
                    value={announcementForm.severity}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, severity: e.target.value as any })}
                    className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="INFO">INFO (Blue)</option>
                    <option value="WARNING">WARNING (Amber)</option>
                    <option value="CRITICAL">CRITICAL (Red)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Target Audience:</label>
                  <select
                    value={announcementForm.target}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, target: e.target.value as any })}
                    className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="ALL">Everyone (All Portals)</option>
                    <option value="SCHOOLS">Specific Schools</option>
                    <option value="ROLES">Specific Roles</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Realtime Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
