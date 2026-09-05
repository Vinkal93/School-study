"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { bellSound } from "@/lib/sound/bellSound";
import { toast } from "sonner";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { AppNotification } from "@/types/notification";

/**
 * Real-time hook for Teacher portal.
 * Detects class start notifications, rings the procedural school bell chime N times,
 * and renders an alert banner with "View Class Details".
 */
export function useClassBellAlert(onSelectBell?: (bellId: string) => void) {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const teacherUid = profile?.uid || "";
  const isTeacher = profile?.role === "teacher";

  // Prevent multiple sound triggers for the same event during session
  const triggeredEventsRef = useRef<Set<string>>(new Set());

  // 1. Register device / request notification permissions on mount
  useEffect(() => {
    if (!schoolId || !teacherUid || !isTeacher) return;

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        // We do not force prompt immediately without user interaction,
        // but record current status
      }
      // Register device session to backend
      fetch("/api/teacher/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          teacherId: teacherUid,
          deviceInfo: `${navigator.platform} - ${navigator.userAgent.slice(0, 50)}`,
          notificationPermission: Notification.permission,
        }),
      }).catch(() => {});
    }
  }, [schoolId, teacherUid, isTeacher]);

  // 2. Real-time Firestore listener for timetable notifications
  useEffect(() => {
    if (!schoolId || !teacherUid || !isTeacher) return;

    const db = getFirebaseDb();
    if (!db) return;

    // Listen to recent notifications targeted to this teacher
    const q = query(
      collection(db, "schools", schoolId, "notifications"),
      where("targetUserId", "==", teacherUid),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
            const data = change.doc.data() as AppNotification;
            data.id = change.doc.id;

            if (data.type === "timetable") {
              const eventKey = data.idempotencyKey || data.id;

              // If already triggered in this browser session, skip
              if (triggeredEventsRef.current.has(eventKey)) return;
              triggeredEventsRef.current.add(eventKey);

              const bellNumber = data.metadata?.bellNumber ? Number(data.metadata.bellNumber) : 1;
              const bellId = data.metadata?.bellId || "";

              // Ring procedural bell chime in foreground
              bellSound.play(bellNumber).catch(() => {});

              // Show rich UI toast notification
              toast(`🔔 Class Starting Now! (Bell ${bellNumber})`, {
                description: data.message,
                duration: 15000,
                action: bellId
                  ? {
                      label: "View Details →",
                      onClick: () => {
                        if (onSelectBell) {
                          onSelectBell(bellId);
                        } else {
                          window.location.href = `/teacher/timetable?bellId=${bellId}`;
                        }
                      },
                    }
                  : undefined,
              });

              // Background browser notification if permitted
              if (
                typeof window !== "undefined" &&
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                try {
                  const n = new Notification(data.title || "Class Starting Now", {
                    body: data.message,
                    icon: "/favicon.ico",
                    tag: eventKey,
                  });
                  n.onclick = () => {
                    window.focus();
                    if (bellId) {
                      window.location.href = `/teacher/timetable?bellId=${bellId}`;
                    }
                  };
                } catch {
                  // Fallback
                }
              }
            }
          }
        });
      },
      (err) => {
        console.warn("Class bell alert listener notice:", err);
      }
    );

    return () => unsubscribe();
  }, [schoolId, teacherUid, isTeacher, onSelectBell]);
}
