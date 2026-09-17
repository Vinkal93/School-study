"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import {
  onAuthChanged,
  signInWithEmail,
  signOutUser,
} from "@/lib/services/auth.service";
import { getUserProfile, isSuperAdminEmail } from "@/lib/services/user.service";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import { doc, updateDoc } from "firebase/firestore";
import type { AppUser } from "@/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { traceClient } from "@/lib/debug-client";

export type AuthBootstrapState =
  | "AUTH_BOOTSTRAPPING"
  | "AUTHENTICATED"
  | "AUTHENTICATED_CONTEXT_READY"
  | "UNAUTHENTICATED"
  | "AUTH_ERROR";

interface AuthContextType {
  firebaseUser: User | null;
  profile: AppUser | null;
  originalSuperAdminProfile: AppUser | null;
  isImpersonating: boolean;
  loading: boolean;
  bootstrapState: AuthBootstrapState;
  signIn: (identifier: string, password: string) => Promise<AppUser>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<AppUser | null>;
  setProfileDirectly: (profile: AppUser) => void;
  impersonateUser: (targetUser: AppUser) => void;
  stopImpersonating: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IMPERSONATION_STORAGE_KEY = "school_study_impersonation_user";
const SESSION_LOGIN_TIME_KEY = "school_study_session_login_time";
const AUTH_SESSION_STORAGE_KEY = "school_study_auth_session";
const SESSION_MAX_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days persistent session

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [originalProfile, setOriginalProfile] = useState<AppUser | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [bootstrapState, setBootstrapState] = useState<AuthBootstrapState>("AUTH_BOOTSTRAPPING");

  // Restore cached session and impersonation session on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.uid) {
          setOriginalProfile(parsed);
          setBootstrapState("AUTHENTICATED_CONTEXT_READY");
        }
      }
    } catch {}

    try {
      const stored = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
      if (stored) {
        setImpersonatedUser(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to parse stored impersonation user:", e);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChanged(async (user) => {
      traceClient("auth:onAuthChanged", { hasUser: !!user, uid: user?.uid, email: user?.email });
      setFirebaseUser(user);

      if (user) {
        setBootstrapState("AUTHENTICATED");
        // Enforce 30-day maximum session duration unless manually logged out or revoked
        try {
          // Never run session expiration from inside an iframe
          if (typeof window !== "undefined" && (window.self !== window.top || window.location.search.includes("preview=true"))) {
            // inside preview/iframe: skip
          } else {
            const storedLoginTime = localStorage.getItem(SESSION_LOGIN_TIME_KEY);
            if (storedLoginTime) {
              const loginTimestamp = parseInt(storedLoginTime, 10);
              if (!isNaN(loginTimestamp) && Date.now() - loginTimestamp > SESSION_MAX_DURATION_MS) {
                console.warn("User session expired after 30 days.");
                localStorage.removeItem(SESSION_LOGIN_TIME_KEY);
                sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
                sessionStorage.removeItem("ss_super_admin_verified");
                localStorage.removeItem("ss_super_admin_verified");
                await signOutUser();
                setFirebaseUser(null);
                setOriginalProfile(null);
                setImpersonatedUser(null);
                setBootstrapState("UNAUTHENTICATED");
                setLoading(false);
                toast.info("Your session has expired. Please log in again to continue.");
                router.push("/login");
                return;
              }
            } else {
              // Seed session time for existing active login
              localStorage.setItem(SESSION_LOGIN_TIME_KEY, String(Date.now()));
            }
          }
        } catch (storageErr) {
          console.warn("Storage check error:", storageErr);
        }

        // Sync session cookie for serverless API authorization (30 days)
        try {
          const token = await user.getIdToken();
          if (typeof document !== "undefined") {
            document.cookie = `__session=${token}; path=/; max-age=2592000; SameSite=Lax;`;
          }
        } catch (cookieErr) {
          console.warn("Could not sync session cookie:", cookieErr);
        }

        try {
          const userProfile = await getUserProfile(user.uid, user.email);

          if (!userProfile) {
            const isPendingReg = typeof window !== "undefined" && (
              sessionStorage.getItem("ss_pending_registration") === "true" ||
              window.location.pathname === "/register"
            );
            if (isPendingReg) {
              return;
            }

            // If running inside an iframe, never destroy parent session
            if (typeof window !== "undefined" && window.self !== window.top) {
              return;
            }

            console.warn("Notice: User profile not immediately resolved, preserving session with fallback profile.");
            const fallbackProfile: AppUser = {
              uid: user.uid,
              email: (user.email || "").trim().toLowerCase(),
              name: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
              role: isSuperAdminEmail(user.email) ? "super_admin" : "school_admin",
              status: "active",
              schoolId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as unknown as AppUser;

            setOriginalProfile(fallbackProfile);
            setBootstrapState("AUTHENTICATED_CONTEXT_READY");
            return;
          }

          if (
            userProfile.status === "suspended" ||
            userProfile.status === "disabled" ||
            userProfile.status === "inactive"
          ) {
            // Never execute signOutUser from inside an iframe
            if (typeof window !== "undefined" && window.self !== window.top) {
              return;
            }
            toast.error("Your account has been suspended or deactivated. Please contact platform admin.");
            await signOutUser();
            setFirebaseUser(null);
            setOriginalProfile(null);
            setImpersonatedUser(null);
            setBootstrapState("AUTH_ERROR");
            setLoading(false);
            return;
          }

          if (userProfile.status === "restricted") {
            toast.warning("Notice: Your account is operating under platform restriction.");
          }

          const authoritativeUserId =
            userProfile.userId ||
            userProfile.studentId ||
            userProfile.teacherCode ||
            userProfile.admissionNumber;

          const enhancedProfile: AppUser = {
            ...userProfile,
            userId: authoritativeUserId,
          };

          setOriginalProfile(enhancedProfile);
          setBootstrapState("AUTHENTICATED_CONTEXT_READY");
          try {
            localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(enhancedProfile));
          } catch {}
        } catch (err: any) {
          console.warn("Notice: Transient error loading user profile, checking cached session:", err?.message || err);
          if (typeof window !== "undefined") {
            try {
              const cached = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
              if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed && parsed.uid === user.uid) {
                  setOriginalProfile(parsed);
                  setBootstrapState("AUTHENTICATED_CONTEXT_READY");
                  setLoading(false);
                  return;
                }
              }
            } catch {}
          }
          setBootstrapState("AUTH_ERROR");
        }
      } else {
        traceClient("auth:user_null_branch", {
          isIframe: typeof window !== "undefined" ? window.self !== window.top : false,
          search: typeof window !== "undefined" ? window.location.search : "",
        });

        // CRITICAL: If running inside an embedded iframe (e.g. AI phone preview) or preview mode,
        // NEVER touch parent window's authentication storage, PIN verification, or cookies!
        if (
          typeof window !== "undefined" &&
          (window.self !== window.top || window.location.search.includes("preview=true"))
        ) {
          traceClient("auth:user_null_suppressed_iframe", {});
          setOriginalProfile(null);
          setImpersonatedUser(null);
          setBootstrapState("UNAUTHENTICATED");
          setLoading(false);
          return;
        }

        // RESILIENCE FIX: If user is temporarily null (e.g. during frame navigation or SDK hydration),
        // check if we still hold a valid session in localStorage.
        // DO NOT wipe the session! Restore the profile from cache so the user is never logged out unexpectedly!
        if (typeof window !== "undefined") {
          try {
            const cached = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.uid) {
                traceClient("auth:user_null_restored_from_cache", { uid: parsed.uid, email: parsed.email });
                setOriginalProfile(parsed);
                setBootstrapState("AUTHENTICATED_CONTEXT_READY");
                setLoading(false);
                return;
              }
            }
          } catch {}
        }

        traceClient("auth:CLEARING_LOCALSTORAGE_SESSION", { reason: "unauthenticated_branch_no_cached_session" });
        setOriginalProfile(null);
        setImpersonatedUser(null);
        setBootstrapState("UNAUTHENTICATED");
        sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
        try {
          localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
          sessionStorage.removeItem("ss_super_admin_verified");
          localStorage.removeItem("ss_super_admin_verified");
          sessionStorage.removeItem("ss_super_admin_auth");
          localStorage.removeItem("ss_super_admin_auth");
          localStorage.removeItem(SESSION_LOGIN_TIME_KEY);
          if (typeof document !== "undefined") {
            document.cookie = "__session=; path=/; max-age=0; SameSite=Lax;";
          }
        } catch (e) {
          // ignore
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Real-time presence heartbeat to keep "Online Now" accurate across devices
  useEffect(() => {
    // Never run presence heartbeat inside embedded iframe or preview mode
    if (
      typeof window !== "undefined" &&
      (window.self !== window.top || window.location.search.includes("preview=true"))
    ) {
      return;
    }

    if (!firebaseUser?.uid || !originalProfile) return;

    const uid = firebaseUser.uid;
    const sendHeartbeat = async () => {
      try {
        const db = getFirebaseDb();
        if (db) {
          const nowIso = new Date().toISOString();
          await updateDoc(doc(db, "users", uid), {
            lastActiveAt: nowIso,
            lastActive: Date.now(),
          }).catch(() => {});
        }
      } catch {
        // silent heartbeat
      }
    };

    // Send immediate heartbeat on mount/login
    sendHeartbeat();

    // Pulse every 60 seconds
    const interval = setInterval(sendHeartbeat, 60000);

    // Also pulse when user switches back to tab or focuses
    const handleFocus = () => sendHeartbeat();
    window.addEventListener("focus", handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") sendHeartbeat();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [firebaseUser?.uid, originalProfile]);

  const signIn = useCallback(
    async (identifier: string, password: string): Promise<AppUser> => {
      setLoading(true);
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const { parseUserAgentInfo, logLoginAttempt } = await import("@/lib/services/audit.service");
      const { browser, platform, deviceType } = parseUserAgentInfo(userAgent);

      let targetEmail = identifier.trim();

      // If user provided a Unique ID instead of email (e.g. SBCI1, SBCI-T1)
      if (!targetEmail.includes("@")) {
        try {
          const res = await fetch("/api/auth/resolve-identifier", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: targetEmail }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.email) {
            setLoading(false);
            throw new Error(data.error || `No account found with ID "${targetEmail}".`);
          }
          targetEmail = data.email;
        } catch (resolveErr: any) {
          setLoading(false);
          throw resolveErr;
        }
      }

      try {
        const fbUser = await signInWithEmail(targetEmail, password);
        const userProfile = await getUserProfile(fbUser.uid, fbUser.email);

        if (!userProfile) {
          await signOutUser();
          setLoading(false);
          logLoginAttempt({
            uid: fbUser.uid,
            email: fbUser.email || targetEmail.toLowerCase(),
            role: "student",
            userAgent,
            browser,
            platform,
            deviceType,
            status: "failed",
            failureReason: "Account profile not found",
          }).catch((e) => console.warn("Notice: Login logging notice:", e));
          throw new Error("Account not found. Please contact admin.");
        }

        if (
          userProfile.status === "suspended" ||
          userProfile.status === "disabled" ||
          userProfile.status === "inactive"
        ) {
          await signOutUser();
          setLoading(false);
          logLoginAttempt({
            uid: fbUser.uid,
            email: userProfile.email,
            role: userProfile.role,
            schoolId: userProfile.schoolId || null,
            userAgent,
            browser,
            platform,
            deviceType,
            status: "failed",
            failureReason: `Account status is ${userProfile.status}`,
          }).catch((e) => console.warn("Notice: Login logging notice:", e));
          throw new Error(
            "Your account has been suspended or deactivated. Please contact platform admin."
          );
        }

        // Multi-Account Device Detection (Check if another student logged in on this browser/device)
        let deviceFingerprint = "";
        let isMultiAccountDevice = false;
        let previousStudentEmail: string | undefined = undefined;
        let previousStudentUid: string | undefined = undefined;

        try {
          if (typeof window !== "undefined") {
            deviceFingerprint = localStorage.getItem("ss_device_fingerprint") || "";
            if (!deviceFingerprint) {
              deviceFingerprint = `dev_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
              localStorage.setItem("ss_device_fingerprint", deviceFingerprint);
            }

            const lastStudentUid = localStorage.getItem("ss_last_student_uid");
            const lastStudentEmail = localStorage.getItem("ss_last_student_email");

            // If current user is a student, or last user was a student, check for cross-account switch
            if (userProfile.role === "student" && lastStudentUid && lastStudentUid !== fbUser.uid) {
              isMultiAccountDevice = true;
              previousStudentUid = lastStudentUid;
              previousStudentEmail = lastStudentEmail || undefined;
            }

            // Update stored student on this device
            if (userProfile.role === "student") {
              localStorage.setItem("ss_last_student_uid", fbUser.uid);
              localStorage.setItem("ss_last_student_email", userProfile.email);
            }
          }
        } catch (storageErr) {
          console.warn("Device fingerprint storage notice:", storageErr);
        }

        // Record successful login event
        logLoginAttempt({
          uid: fbUser.uid,
          email: userProfile.email,
          role: userProfile.role,
          schoolId: userProfile.schoolId || null,
          userAgent,
          browser,
          platform,
          deviceType,
          deviceFingerprint,
          isMultiAccountDevice,
          previousStudentEmail,
          previousStudentUid,
          status: "success",
        }).catch((e) => console.warn("Notice: Login logging notice:", e));

        setFirebaseUser(fbUser);
        setOriginalProfile(userProfile);
        try {
          localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(userProfile));
        } catch {}
        setImpersonatedUser(null);
        sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
        try {
          const nowTime = Date.now();
          localStorage.setItem(SESSION_LOGIN_TIME_KEY, String(nowTime));
          const db = getFirebaseDb();
          if (db) {
            updateDoc(doc(db, "users", fbUser.uid), {
              forceLogout: false,
              requireReLogin: false,
              lastLoginAt: new Date().toISOString(),
              sessionEstablishedAt: nowTime,
            }).catch(() => {});
            updateDoc(doc(db, "userSecurityControl", fbUser.uid), {
              forceLogout: false,
              requireReLogin: false,
              sessionEstablishedAt: nowTime,
            }).catch(() => {});
          }
        } catch (e) {
          console.warn("Could not save session login time:", e);
        }
        setLoading(false);

        return userProfile;
      } catch (error) {
        setLoading(false);
        logLoginAttempt({
          uid: "unknown",
          email: targetEmail.toLowerCase(),
          role: "student",
          userAgent,
          browser,
          platform,
          deviceType,
          status: "failed",
          failureReason: error instanceof Error ? error.message : "Invalid credentials",
        }).catch((e) => console.warn("Notice: Failed login logging notice:", e));

        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Invalid email or password");
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_LOGIN_TIME_KEY);
      sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      sessionStorage.removeItem("ss_super_admin_verified");
      localStorage.removeItem("ss_super_admin_verified");
      sessionStorage.removeItem("ss_super_admin_auth");
      localStorage.removeItem("ss_super_admin_auth");
      if (typeof document !== "undefined") {
        document.cookie = "__session=; path=/; max-age=0; SameSite=Lax;";
      }
    } catch (e) {
      // ignore
    }
    setImpersonatedUser(null);
    await signOutUser();
    setFirebaseUser(null);
    setOriginalProfile(null);
  }, []);

  // Monitor session duration when tab regains focus, visibility changes, or on interval
  useEffect(() => {
    // Never run session expiry check inside embedded iframe or preview mode
    if (
      typeof window !== "undefined" &&
      (window.self !== window.top || window.location.search.includes("preview=true"))
    ) {
      return;
    }

    if (!firebaseUser) return;

    const checkSessionExpiry = async () => {
      try {
        if (
          typeof window !== "undefined" &&
          (window.self !== window.top || window.location.search.includes("preview=true"))
        ) {
          return;
        }

        const stored = localStorage.getItem(SESSION_LOGIN_TIME_KEY);
        if (stored) {
          const loginTime = parseInt(stored, 10);
          if (!isNaN(loginTime) && Date.now() - loginTime > SESSION_MAX_DURATION_MS) {
            console.warn("Active session expired after 30 days.");
            localStorage.removeItem(SESSION_LOGIN_TIME_KEY);
            sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
            sessionStorage.removeItem("ss_super_admin_verified");
            localStorage.removeItem("ss_super_admin_verified");
            await signOutUser();
            setFirebaseUser(null);
            setOriginalProfile(null);
            setImpersonatedUser(null);
            toast.info("Your session has expired. Please log in again to continue.");
            router.push("/login");
          }
        }
      } catch (e) {
        console.warn("Error checking session expiry:", e);
      }
    };

    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        checkSessionExpiry();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    const interval = setInterval(checkSessionExpiry, 15 * 60 * 1000); // check every 15 min

    return () => {
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, [firebaseUser, router]);

  const impersonateUser = useCallback((targetUser: AppUser) => {
    try {
      sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(targetUser));
      setImpersonatedUser(targetUser);
      toast.success(`🎭 Live Impression Mode active: Viewing portal as ${targetUser.name} (${targetUser.role})`);

      if (targetUser.role === "school_admin") {
        router.push("/admin");
      } else if (targetUser.role === "teacher") {
        router.push("/teacher");
      } else if (targetUser.role === "student") {
        router.push("/student");
      } else {
        router.push("/super-admin");
      }
    } catch (e) {
      toast.error("Failed to start impersonation mode.");
    }
  }, [router]);

  const stopImpersonating = useCallback(() => {
    sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    setImpersonatedUser(null);
    toast.info("Exited Live Impression Mode. Returned to Super Admin Portal.");
    router.push("/super-admin");
  }, [router]);

  const refreshProfile = useCallback(async (): Promise<AppUser | null> => {
    const auth = getFirebaseAuth();
    const currentUser = firebaseUser || auth?.currentUser;
    if (currentUser) {
      try {
        const updated = await getUserProfile(currentUser.uid, currentUser.email);
        if (updated) {
          setOriginalProfile(updated);
          return updated;
        }
      } catch (e) {
        console.warn("Failed to refresh user profile:", e);
      }
    }
    return null;
  }, [firebaseUser]);

  const setProfileDirectly = useCallback((directProfile: AppUser) => {
    setOriginalProfile(directProfile);
  }, []);

  const effectiveProfile = impersonatedUser || originalProfile;

  return (
    <AuthContext
      value={{
        firebaseUser,
        profile: effectiveProfile,
        originalSuperAdminProfile: originalProfile?.role === "super_admin" ? originalProfile : null,
        isImpersonating: !!impersonatedUser,
        loading,
        bootstrapState,
        signIn,
        signOut,
        refreshProfile,
        setProfileDirectly,
        impersonateUser,
        stopImpersonating,
      }}
    >
      {children}
    </AuthContext>
  );
}
