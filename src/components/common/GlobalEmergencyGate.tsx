"use client";

import React, { useEffect, useState, useTransition } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";
import { useRealtimeSecurityListener } from "@/hooks/useRealtimeSecurityListener";
import type { GlobalEmergencyControls, SchoolEmergencyControl } from "@/lib/emergency/emergencyEngine";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Mail,
  Phone,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Layers,
  HelpCircle,
  Building2,
} from "lucide-react";

interface GlobalEmergencyGateProps {
  children: React.ReactNode;
}

export function GlobalEmergencyGate({ children }: GlobalEmergencyGateProps) {
  // 1. Activate client-side real-time security listener (for instant forced logout / suspension)
  useRealtimeSecurityListener();

  const { profile, signOut } = useAuth();
  const pathname = usePathname();

  const [controls, setControls] = useState<GlobalEmergencyControls | null>(null);
  const [schoolEmergency, setSchoolEmergency] = useState<SchoolEmergencyControl | null>(null);
  const [checking, setChecking] = useState(false);
  const [, startTransition] = useTransition();

  // 2. Real-time Firestore snapshot on global emergency controls
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;

    const unsubGlobal = onSnapshot(
      doc(db, "siteSettings", "emergency_controls"),
      (snap) => {
        if (snap.exists()) {
          setControls(snap.data() as GlobalEmergencyControls);
        }
      },
      (err) => {
        console.warn("Notice: global emergency gate listener:", err);
      }
    );

    return () => unsubGlobal();
  }, []);

  // 3. Real-time Firestore snapshot on target school (if logged in and belongs to a school)
  useEffect(() => {
    if (!profile?.schoolId || profile?.role === "super_admin") {
      setSchoolEmergency(null);
      return;
    }

    const db = getFirebaseDb();
    if (!db) return;

    const unsubSchool = onSnapshot(
      doc(db, "schoolEmergency", profile.schoolId),
      (snap) => {
        if (snap.exists()) {
          setSchoolEmergency(snap.data() as SchoolEmergencyControl);
        } else {
          setSchoolEmergency(null);
        }
      },
      (err) => {
        console.warn("Notice: school emergency gate listener:", err);
      }
    );

    return () => unsubSchool();
  }, [profile?.schoolId, profile?.role]);

  // Bypass Super Admins completely so they can always view and manage the Emergency Control Center
  const isSuperAdmin = profile?.role === "super_admin";
  const isSuperAdminPath = pathname.startsWith("/super-admin") || pathname === "/login";

  if (isSuperAdmin || isSuperAdminPath) {
    return <>{children}</>;
  }

  // Check if Global Emergency or Maintenance is active
  const isGlobalMaintenance =
    controls?.systemStatus === "MAINTENANCE" ||
    controls?.systemStatus === "EMERGENCY" ||
    Boolean(controls?.maintenanceMode);

  // Check if School is paused
  const isSchoolPaused = schoolEmergency?.status === "PAUSED";

  const handleManualCheck = () => {
    setChecking(true);
    setTimeout(() => {
      startTransition(() => {
        setChecking(false);
      });
    }, 800);
  };

  // Case A: Global System Maintenance / Emergency Lockout
  if (isGlobalMaintenance && controls) {
    const announcement = controls.emergencyAnnouncement;
    const isCritical = controls.systemStatus === "EMERGENCY" || announcement?.severity === "CRITICAL";

    const reason =
      announcement?.reason ||
      announcement?.message ||
      "Our engineering team is actively performing scheduled infrastructure upgrades and security enhancements to keep the platform fast and secure.";

    const expectedResolution =
      announcement?.expectedResolution ||
      "Expected resolution within 45 to 60 minutes. Normal operations will resume shortly.";

    const affectedModules =
      announcement?.affectedModules && announcement.affectedModules.length > 0
        ? announcement.affectedModules
        : ["Portal Access", "Fee Payments", "Student Information System", "Teacher Gradebook"];

    const supportEmail = announcement?.supportEmail || "SBCI224234@gmail.com";
    const supportPhone = announcement?.supportPhone || "+91 9118245636";
    const supportHours = announcement?.supportHours || "Mon - Sat (9:00 AM - 7:00 PM IST)";

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none z-[9999]">
        <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          {/* Header Status Badge */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isCritical ? "bg-red-400" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    isCritical ? "bg-red-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <span
                className={`text-xs font-black tracking-wider uppercase px-3 py-1 rounded-full border ${
                  isCritical
                    ? "bg-red-500/10 text-red-400 border-red-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                {isCritical ? "Emergency System Alert" : "Scheduled Platform Maintenance"}
              </span>
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              Live Status: <strong className="text-white uppercase">{controls.systemStatus}</strong>
            </span>
          </div>

          {/* Title and Icon */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl ${
                  isCritical
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}
              >
                {isCritical ? <ShieldAlert className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  {announcement?.title || "System Temporarily Unavailable"}
                </h1>
                <p className="text-xs text-slate-400">
                  Real-time notification from Super Admin Security Operations
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Grid: Kya hua hai & Kabtak theek hoga */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Box 1: Kya Hua Hai (What Happened) */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <HelpCircle className="h-4 w-4 text-blue-400" />
                <span>What Happened / Reason:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {reason}
              </p>
            </div>

            {/* Box 2: Kabtak Theek Hoga (Estimated Resolution) */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Clock className="h-4 w-4 text-amber-400" />
                <span>Estimated Resolution (ETA):</span>
              </div>
              <p className="text-xs text-amber-300 leading-relaxed font-bold">
                {expectedResolution}
              </p>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Auto-reconnects when resolved (no refresh required)
              </div>
            </div>
          </div>

          {/* Affected Modules */}
          {affectedModules.length > 0 && (
            <div className="space-y-2 bg-slate-950/40 border border-slate-800/60 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <Layers className="h-3.5 w-3.5 text-purple-400" />
                <span>Impacted Services & Modules:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {affectedModules.map((mod, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-xs rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-semibold"
                  >
                    {mod}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Data Safety Assurance */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>100% Data Protection:</strong> All student records, fees, and academic records are securely backed up.
            </span>
          </div>

          {/* Support Helpline Footer */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="space-y-1 text-center sm:text-left">
              <div className="font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                <span>Need Urgent Assistance? Contact Platform Helpline</span>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-slate-300 text-[11px]">
                <a
                  href={`tel:${supportPhone.replace(/\s+/g, "")}`}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <Phone className="h-3 w-3 text-emerald-400" />
                  <strong>{supportPhone}</strong>
                </a>
                <span>•</span>
                <a
                  href={`mailto:${supportEmail}`}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <Mail className="h-3 w-3 text-blue-400" />
                  <span>{supportEmail}</span>
                </a>
              </div>
              <div className="text-[10px] text-slate-500">Support Hours: {supportHours}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleManualCheck}
                disabled={checking}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
                <span>{checking ? "Checking..." : "Check Status"}</span>
              </button>

              {profile && (
                <button
                  onClick={() => signOut()}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Case B: Specific School Paused
  if (isSchoolPaused) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 select-none z-[9999]">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
            <Building2 className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white">School Operations Paused</h1>
            <p className="text-xs text-slate-400">
              Access to this school portal has been temporarily paused by platform administration.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-1.5 text-xs text-slate-300">
            <div className="font-bold text-slate-400">Notice:</div>
            <p>
              {schoolEmergency?.reason ||
                "School portal operations are temporarily on hold for administrative review or maintenance."}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2 text-slate-300">
            <div>For assistance or to restore access, please contact platform support:</div>
            <div className="font-bold text-white flex items-center justify-center gap-2">
              <Phone className="h-3.5 w-3.5 text-emerald-400" />
              <span>+91 9118245636</span>
              <span>•</span>
              <Mail className="h-3.5 w-3.5 text-blue-400" />
              <span>SBCI224234@gmail.com</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleManualCheck}
              disabled={checking}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
              <span>{checking ? "Checking..." : "Retry Connection"}</span>
            </button>

            {profile && (
              <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
