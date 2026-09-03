"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { ShieldAlert, Wrench, Lock, RefreshCw } from "lucide-react";
import type { GlobalEmergencyControls } from "@/lib/emergency/emergencyEngine";

interface EmergencyLockoutGateProps {
  moduleKey?: string;
  featureKey?: string;
  schoolId?: string;
  children: React.ReactNode;
}

export function EmergencyLockoutGate({
  moduleKey,
  featureKey,
  schoolId,
  children,
}: EmergencyLockoutGateProps) {
  const [controls, setControls] = useState<GlobalEmergencyControls | null>(null);
  const [schoolStatus, setSchoolStatus] = useState<string>("ACTIVE");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubGlobal = onSnapshot(
      doc(db, "siteSettings", "emergency_controls"),
      (snap) => {
        if (snap.exists()) {
          setControls(snap.data() as GlobalEmergencyControls);
        }
        setLoading(false);
      }
    );

    let unsubSchool = () => {};
    if (schoolId) {
      unsubSchool = onSnapshot(
        doc(db, "schoolEmergency", schoolId),
        (snap) => {
          if (snap.exists()) {
            setSchoolStatus(snap.data().status || "ACTIVE");
          }
        }
      );
    }

    return () => {
      unsubGlobal();
      unsubSchool();
    };
  }, [schoolId]);

  if (loading || !controls) return <>{children}</>;

  // Check Maintenance Mode
  if (controls.systemStatus === "MAINTENANCE" || controls.maintenanceMode) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4 max-w-md mx-auto">
        <div className="p-4 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
          <Wrench className="h-10 w-10 animate-bounce" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Scheduled System Maintenance</h2>
        <p className="text-xs text-slate-500">
          School Study is temporarily undergoing system maintenance. Your data remains safe. Please try again shortly.
        </p>
      </div>
    );
  }

  // Check School Paused
  if (schoolStatus === "PAUSED") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4 max-w-md mx-auto">
        <div className="p-4 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">School Portal Temporarily Paused</h2>
        <p className="text-xs text-slate-500">
          Your institution portal access has been temporarily paused by platform administration. Please contact support for details.
        </p>
      </div>
    );
  }

  // Check Module Kill Switch
  if (moduleKey && controls.moduleKillSwitches) {
    const norm = moduleKey.toLowerCase();
    if (controls.moduleKillSwitches[norm] === "OFF") {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4 max-w-md mx-auto">
          <div className="p-4 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
            <Lock className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Service Temporarily Unavailable</h2>
          <p className="text-xs text-slate-500">
            The <strong>{moduleKey.toUpperCase()}</strong> service is temporarily disabled for emergency maintenance. Our technical team is actively working on it.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
