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
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!userId) return;
    const db = getFirebaseDb();
    if (!db) return;

    // 1. Listen to User Security Control document
    const unsubUserSecurity = onSnapshot(
      doc(db, "userSecurityControl", userId),
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        const storedLoginTime = typeof window !== "undefined" ? localStorage.getItem("school_study_session_login_time") : null;
        const loginTime = storedLoginTime ? parseInt(storedLoginTime, 10) : mountTimeRef.current;
        const updateTime = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;

        if (data.status === "SUSPENDED" || data.status === "BLOCKED") {
          toast.error("Your account has been suspended or blocked by administration.");
          const auth = getFirebaseAuth();
          if (auth) auth.signOut();
          if (typeof window !== "undefined") {
            localStorage.removeItem("school_study_session_login_time");
            sessionStorage.removeItem("school_study_impersonation_user");
          }
          setTimeout(() => {
            window.location.href = "/login?reason=account_suspended";
          }, 400);
          return;
        }

        if (data.forceLogout === true || data.requireReLogin === true) {
          const forceLogoutTime = typeof data.forceLogoutAt === "number"
            ? data.forceLogoutAt
            : (typeof data.securityVersion === "number" ? data.securityVersion : updateTime);

          // Terminate active session only if force logout was issued AFTER this session was created
          if (forceLogoutTime > loginTime) {
            console.warn("[RealtimeSecurity] Force logout triggered on userSecurityControl.");
            toast.error("Your session has been terminated by administrator. Redirecting to login...");
            const auth = getFirebaseAuth();
            if (auth) auth.signOut();
            if (typeof window !== "undefined") {
              localStorage.removeItem("school_study_session_login_time");
              sessionStorage.removeItem("school_study_impersonation_user");
            }
            setTimeout(() => {
              window.location.href = "/login?reason=session_revoked";
            }, 400);
            return;
          }
        }

        if (initialSecurityVersionRef.current === null && data.securityVersion) {
          initialSecurityVersionRef.current = data.securityVersion;
        }
      },
      (err) => {
        if (err.code !== "permission-denied") {
          console.warn("Realtime user security listener notice:", err);
        }
      }
    );

    // 1b. Listen to User document directly for instant status change and force logout detection
    const unsubUserDoc = onSnapshot(
      doc(db, "users", userId),
      (snapshot) => {
        if (!snapshot.exists()) return;
        const uData = snapshot.data();
        if (uData.status === "suspended" || uData.status === "blocked" || uData.status === "disabled") {
          toast.error("Your account has been deactivated by administration.");
          const auth = getFirebaseAuth();
          if (auth) auth.signOut();
          if (typeof window !== "undefined") {
            localStorage.removeItem("school_study_session_login_time");
            sessionStorage.removeItem("school_study_impersonation_user");
          }
          setTimeout(() => {
            window.location.href = "/login?reason=account_suspended";
          }, 400);
          return;
        }

        const storedLoginTime = typeof window !== "undefined" ? localStorage.getItem("school_study_session_login_time") : null;
        const loginTime = storedLoginTime ? parseInt(storedLoginTime, 10) : mountTimeRef.current;
        const uUpdateTime = uData.updatedAt ? new Date(uData.updatedAt).getTime() : 0;
        const uForceLogoutTime = typeof uData.forceLogoutAt === "number"
          ? uData.forceLogoutAt
          : (typeof uData.securityVersion === "number" ? uData.securityVersion : uUpdateTime);

        // Terminate active session only if force logout was issued AFTER this session was created
        if ((uData.forceLogout === true || uData.requireReLogin === true) && uForceLogoutTime > loginTime) {
          console.warn("[RealtimeSecurity] Force logout triggered on user document.");
          toast.error("Your session has been terminated by administrator. Redirecting to login...");
          const auth = getFirebaseAuth();
          if (auth) auth.signOut();
          if (typeof window !== "undefined") {
            localStorage.removeItem("school_study_session_login_time");
            sessionStorage.removeItem("school_study_impersonation_user");
          }
          setTimeout(() => {
            window.location.href = "/login?reason=session_revoked";
          }, 400);
          return;
        }
      },
      (err) => {
        if (err.code !== "permission-denied") {
          console.warn("Realtime user document listener notice:", err);
        }
      }
    );

    // 2. Listen to Global Emergency Controls document
    const unsubGlobal = onSnapshot(
      doc(db, "siteSettings", "emergency_controls"),
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();

        if (profile?.role !== "super_admin") {
          const storedLoginTime = typeof window !== "undefined" ? localStorage.getItem("school_study_session_login_time") : null;
          const loginTime = storedLoginTime ? parseInt(storedLoginTime, 10) : mountTimeRef.current;
          const updateTime = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;

          if (data.forceReLogin === true && updateTime >= loginTime) {
            console.warn("[RealtimeSecurity] Global forceReLogin active. Logging out...");
            toast.error("System security update initiated. All sessions reset. Please log in again.");
            const auth = getFirebaseAuth();
            if (auth) auth.signOut();
            if (typeof window !== "undefined") {
              localStorage.removeItem("school_study_session_login_time");
              sessionStorage.removeItem("school_study_impersonation_user");
            }
            setTimeout(() => {
              window.location.href = "/login?reason=global_security_reset";
            }, 800);
            return;
          }

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
            if (typeof window !== "undefined") {
              localStorage.removeItem("school_study_session_login_time");
              sessionStorage.removeItem("school_study_impersonation_user");
            }
            setTimeout(() => {
              window.location.href = "/login?reason=global_security_reset";
            }, 800);
          }
        }
      },
      (err) => {
        if (err.code !== "permission-denied") {
          console.warn("Realtime global emergency listener notice:", err);
        }
      }
    );

    // 3. Listen to School Emergency Controls document
    let unsubSchool: (() => void) | undefined;
    if (profile?.schoolId && profile?.role !== "super_admin") {
      unsubSchool = onSnapshot(
        doc(db, "schoolEmergency", profile.schoolId),
        (snapshot) => {
          if (!snapshot.exists()) return;
          const sData = snapshot.data();
          const storedLoginTime = typeof window !== "undefined" ? localStorage.getItem("school_study_session_login_time") : null;
          const loginTime = storedLoginTime ? parseInt(storedLoginTime, 10) : mountTimeRef.current;
          const forceBefore = sData.forceLogoutBefore
            ? typeof sData.forceLogoutBefore === "number"
              ? sData.forceLogoutBefore
              : new Date(sData.forceLogoutBefore).getTime()
            : 0;

          if (sData.forceLogoutAll === true || (forceBefore > 0 && forceBefore >= loginTime)) {
            console.warn("[RealtimeSecurity] School force logout active. Forcing logout...");
            toast.error("School session security reset by administrator. Please log in again.");
            const auth = getFirebaseAuth();
            if (auth) auth.signOut();
            if (typeof window !== "undefined") {
              localStorage.removeItem("school_study_session_login_time");
              sessionStorage.removeItem("school_study_impersonation_user");
            }
            setTimeout(() => {
              window.location.href = "/login?reason=school_force_logout";
            }, 800);
          }
        },
        (err) => {
          if (err.code !== "permission-denied") {
            console.warn("Realtime school emergency listener notice:", err);
          }
        }
      );
    }

    // 4. Instant multi-window / multi-tab synchronization via BroadcastChannel & storage events
    let securityChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        securityChannel = new BroadcastChannel("school_study_security_channel");
        securityChannel.onmessage = (event) => {
          const msg = event.data;
          if (msg && (msg.userId === userId || msg.email === profile?.email)) {
            const isSuspended = msg.status === "suspended" || msg.type === "SUSPEND";
            console.warn("[RealtimeSecurity] BroadcastChannel security signal received.");
            toast.error(
              isSuspended
                ? "Your account has been suspended by administration."
                : "Your session has been terminated by administrator. Redirecting to login..."
            );
            const auth = getFirebaseAuth();
            if (auth) auth.signOut();
            if (typeof window !== "undefined") {
              localStorage.removeItem("school_study_session_login_time");
              sessionStorage.removeItem("school_study_impersonation_user");
            }
            setTimeout(() => {
              window.location.href = isSuspended ? "/login?reason=account_suspended" : "/login?reason=session_revoked";
            }, 300);
          }
        };
      }
    } catch {}

    const handleStorageSecurity = (e: StorageEvent) => {
      if (e.key === "school_study_force_logout_event" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && (parsed.userId === userId || parsed.email === profile?.email)) {
            const isSuspended = parsed.status === "suspended";
            console.warn("[RealtimeSecurity] Storage security signal received.");
            toast.error(
              isSuspended
                ? "Your account has been suspended by administration."
                : "Your session has been terminated by administrator. Redirecting to login..."
            );
            const auth = getFirebaseAuth();
            if (auth) auth.signOut();
            localStorage.removeItem("school_study_session_login_time");
            sessionStorage.removeItem("school_study_impersonation_user");
            setTimeout(() => {
              window.location.href = isSuspended ? "/login?reason=account_suspended" : "/login?reason=session_revoked";
            }, 300);
          }
        } catch {}
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageSecurity);
    }

    return () => {
      unsubUserSecurity();
      unsubUserDoc();
      unsubGlobal();
      if (unsubSchool) unsubSchool();
      if (securityChannel) securityChannel.close();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageSecurity);
      }
    };
  }, [userId, profile?.role, profile?.schoolId]);
}
