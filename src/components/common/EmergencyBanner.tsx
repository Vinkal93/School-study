"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { AlertTriangle, Info, ShieldAlert, X } from "lucide-react";
import type { EmergencyAnnouncement } from "@/lib/emergency/emergencyEngine";

export function EmergencyBanner() {
  const [announcement, setAnnouncement] = useState<EmergencyAnnouncement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;

    const unsub = onSnapshot(
      doc(db, "siteSettings", "emergency_controls"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.emergencyAnnouncement && data.emergencyAnnouncement.active) {
            setAnnouncement(data.emergencyAnnouncement);
            setDismissed(false);
          } else {
            setAnnouncement(null);
          }
        }
      },
      (err) => {
        console.warn("Emergency banner listener notice:", err);
      }
    );

    return () => unsub();
  }, []);

  if (!announcement || !announcement.active || dismissed) return null;

  const severityStyles = {
    INFO: "bg-blue-600 text-white border-blue-700",
    WARNING: "bg-amber-600 text-white border-amber-700 animate-pulse",
    CRITICAL: "bg-red-600 text-white border-red-700 animate-pulse",
  };

  const IconComponent =
    announcement.severity === "CRITICAL"
      ? ShieldAlert
      : announcement.severity === "WARNING"
      ? AlertTriangle
      : Info;

  return (
    <div
      className={`relative z-40 w-full px-4 py-3 border-b shadow-md flex items-center justify-between text-xs sm:text-sm font-semibold ${
        severityStyles[announcement.severity] || severityStyles.WARNING
      }`}
    >
      <div className="flex items-center gap-2.5 max-w-6xl mx-auto">
        <IconComponent className="h-5 w-5 shrink-0" />
        <div>
          <strong className="font-extrabold">{announcement.title}:</strong> {announcement.message}
        </div>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer shrink-0"
        title="Dismiss notice"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
