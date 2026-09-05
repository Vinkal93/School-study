"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  AlertTriangle,
  Info,
  ShieldAlert,
  X,
  Clock,
  Phone,
  Mail,
  Wrench,
} from "lucide-react";
import type { EmergencyAnnouncement } from "@/lib/emergency/emergencyEngine";

export function EmergencyBanner() {
  const [announcement, setAnnouncement] = useState<EmergencyAnnouncement | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [dismissKey, setDismissKey] = useState("");

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;

    const unsub = onSnapshot(
      doc(db, "siteSettings", "emergency_controls"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const ann = data.emergencyAnnouncement as EmergencyAnnouncement | undefined;
          if (ann && ann.active) {
            setAnnouncement(ann);
            const currentKey = `${ann.updatedAt || "active"}_${ann.title}`;
            setDismissKey(currentKey);
            const isDismissed =
              typeof window !== "undefined"
                ? sessionStorage.getItem(`emergency_banner_dismissed_${currentKey}`) === "true"
                : false;
            setDismissed(isDismissed);
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

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined" && dismissKey) {
      sessionStorage.setItem(`emergency_banner_dismissed_${dismissKey}`, "true");
    }
  };

  const severityStyles = {
    INFO: "bg-blue-600 text-white border-blue-700",
    WARNING: "bg-amber-600 text-white border-amber-700",
    CRITICAL: "bg-red-600 text-white border-red-700 animate-pulse",
  };

  const IconComponent =
    announcement.severity === "CRITICAL"
      ? ShieldAlert
      : announcement.severity === "WARNING"
      ? AlertTriangle
      : Info;

  const email = announcement.supportEmail || "SBCI224234@gmail.com";
  const phone = announcement.supportPhone || "+91 9118245636";

  return (
    <div
      role="alert"
      className={`relative z-50 w-full px-4 py-2.5 border-b shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs font-semibold ${
        severityStyles[announcement.severity] || severityStyles.WARNING
      }`}
    >
      <div className="flex items-start md:items-center gap-3 max-w-7xl mx-auto flex-1 min-w-0">
        <div className="p-1 rounded-lg bg-white/20 shrink-0 mt-0.5 md:mt-0">
          <IconComponent className="h-4 w-4" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 flex-1 min-w-0">
          <div>
            <strong className="font-extrabold tracking-wide uppercase mr-1.5">
              [{announcement.title}]
            </strong>
            <span>{announcement.reason || announcement.message}</span>
          </div>

          {/* Kabtak Theek Hoga / Expected Resolution */}
          {announcement.expectedResolution && (
            <div className="inline-flex items-center gap-1 bg-black/25 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white shrink-0">
              <Clock className="h-3 w-3" />
              <span>Expected Resolution: {announcement.expectedResolution}</span>
            </div>
          )}

          {/* Support Helpline details */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] opacity-90 shrink-0">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> {phone}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> {email}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="self-end md:self-center p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer shrink-0"
        title="Dismiss announcement"
        aria-label="Dismiss announcement"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
