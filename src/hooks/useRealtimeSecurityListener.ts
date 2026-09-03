"use client";

import { useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb, getFirebaseAuth } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

/**
 * Client-Side Realtime Security Listener.
 * Watches user security version & global emergency state in real-time.
 * Automatically clears auth session and redirects if force-logged out or suspended.
 */
export function useRealtimeSecurityListener() {
  const { profile } = useAuth();
  const userId = profile?.uid || "";
  const initialSecurityVersionRef = useRef<number | null>(null);
  const initialGlobalVersionRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    const db = getFirebaseDb();
    if (!db) return;

    // 1. Listen to User Security Control document
    const unsubUser = onSnapshot(
      doc(db, "userSecurityControl", userId),
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();

        if (initialSecurityVersionRef.current === null) {
          initialSecurityVersionRef.current = data.securityVersion || 1;
        } else if (
          typeof data.securityVersion === "number" &&
          data.securityVersion > initialSecurityVersionRef.current
        ) {
          console.warn("[RealtimeSecurity] Session security version updated. Triggering forced logout...");
          toast.error("Your session has been invalidated by security administration. Redirecting to login...");

          const auth = getFirebaseAuth();
          if (auth) auth.signOut();

          setTimeout(() => {
            window.location.href = "/login?reason=session_revoked";
          }, 1000);
        }

        if (data.status === "SUSPENDED" || data.status === "BLOCKED") {
          toast.error("Your account has been suspended by administration.");
          const auth = getFirebaseAuth();
          if (auth) auth.signOut();
          setTimeout(() => {
            window.location.href = "/login?reason=account_suspended";
          }, 1000);
        }
      },
      (err) => {
        console.warn("Realtime user security listener notice:", err);
      }
    );

    // 2. Listen to Global Emergency Controls document
    const unsubGlobal = onSnapshot(
      doc(db, "siteSettings", "emergency_controls"),
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();

        if (profile?.role !== "super_admin") {
          if (initialGlobalVersionRef.current === null) {
            initialGlobalVersionRef.current = data.globalSecurityVersion || 1;
          } else if (
            typeof data.globalSecurityVersion === "number" &&
            data.globalSecurityVersion > initialGlobalVersionRef.current
          ) {
            console.warn("[RealtimeSecurity] Global security version updated. Logging out...");
            toast.error("System security update initiated. Please log in again.");
            const auth = getFirebaseAuth();
            if (auth) auth.signOut();
            setTimeout(() => {
              window.location.href = "/login?reason=global_security_reset";
            }, 1000);
          }
        }
      },
      (err) => {
        console.warn("Realtime global emergency listener notice:", err);
      }
    );

    return () => {
      unsubUser();
      unsubGlobal();
    };
  }, [userId, profile?.role]);
}
