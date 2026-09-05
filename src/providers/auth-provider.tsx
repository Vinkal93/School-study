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
import { getUserProfile } from "@/lib/services/user.service";
import type { AppUser } from "@/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AuthContextType {
  firebaseUser: User | null;
  profile: AppUser | null;
  originalSuperAdminProfile: AppUser | null;
  isImpersonating: boolean;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<AppUser>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<AppUser | null>;
  impersonateUser: (targetUser: AppUser) => void;
  stopImpersonating: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IMPERSONATION_STORAGE_KEY = "school_study_impersonation_user";
const SESSION_LOGIN_TIME_KEY = "school_study_session_login_time";
const SESSION_MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (1 week)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [originalProfile, setOriginalProfile] = useState<AppUser | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore impersonation session on mount
  useEffect(() => {
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
      setFirebaseUser(user);

      if (user) {
        // Enforce 1-week maximum session duration
        try {
          const storedLoginTime = localStorage.getItem(SESSION_LOGIN_TIME_KEY);
          if (storedLoginTime) {
            const loginTimestamp = parseInt(storedLoginTime, 10);
            if (!isNaN(loginTimestamp) && Date.now() - loginTimestamp > SESSION_MAX_DURATION_MS) {
              console.warn("User session expired after 7 days.");
              localStorage.removeItem(SESSION_LOGIN_TIME_KEY);
              sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
              await signOutUser();
              setFirebaseUser(null);
              setOriginalProfile(null);
              setImpersonatedUser(null);
              setLoading(false);
              toast.info("Your session has expired after 1 week. Please log in again to continue.");
              router.push("/login");
              return;
            }
          } else {
            // Seed session time for existing active login
            localStorage.setItem(SESSION_LOGIN_TIME_KEY, String(Date.now()));
          }
        } catch (storageErr) {
          console.warn("Storage check error:", storageErr);
        }

        try {
          const userProfile = await getUserProfile(user.uid, user.email);

          if (!userProfile) {
            toast.error("Account not found. Please contact admin.");
            await signOutUser();
            setFirebaseUser(null);
            setOriginalProfile(null);
            setImpersonatedUser(null);
            setLoading(false);
            return;
          }

          if (
            userProfile.status === "suspended" ||
            userProfile.status === "disabled" ||
            userProfile.status === "inactive"
          ) {
            toast.error("Your account has been suspended or deactivated. Please contact platform admin.");
            await signOutUser();
            setFirebaseUser(null);
            setOriginalProfile(null);
            setImpersonatedUser(null);
            setLoading(false);
            return;
          }

          if (userProfile.status === "restricted") {
            toast.warning("Notice: Your account is operating under platform restriction.");
          }

          setOriginalProfile(userProfile);
        } catch (err: any) {
          console.error("Failed to load user profile:", err);
          await signOutUser();
          setFirebaseUser(null);
          setOriginalProfile(null);
          setImpersonatedUser(null);
        }
      } else {
        setOriginalProfile(null);
        setImpersonatedUser(null);
        sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
        try {
          localStorage.removeItem(SESSION_LOGIN_TIME_KEY);
        } catch (e) {
          // ignore
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

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
          status: "success",
        }).catch((e) => console.warn("Notice: Login logging notice:", e));

        setFirebaseUser(fbUser);
        setOriginalProfile(userProfile);
        setImpersonatedUser(null);
        sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
        try {
          localStorage.setItem(SESSION_LOGIN_TIME_KEY, String(Date.now()));
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
      localStorage.removeItem(SESSION_LOGIN_TIME_KEY);
      sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
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
    if (!firebaseUser) return;

    const checkSessionExpiry = async () => {
      try {
        const stored = localStorage.getItem(SESSION_LOGIN_TIME_KEY);
        if (stored) {
          const loginTime = parseInt(stored, 10);
          if (!isNaN(loginTime) && Date.now() - loginTime > SESSION_MAX_DURATION_MS) {
            console.warn("Active session expired after 7 days.");
            localStorage.removeItem(SESSION_LOGIN_TIME_KEY);
            sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
            await signOutUser();
            setFirebaseUser(null);
            setOriginalProfile(null);
            setImpersonatedUser(null);
            toast.info("Your session has expired after 1 week. Please log in again to continue.");
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
    if (firebaseUser) {
      try {
        const updated = await getUserProfile(firebaseUser.uid, firebaseUser.email);
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

  const effectiveProfile = impersonatedUser || originalProfile;

  return (
    <AuthContext
      value={{
        firebaseUser,
        profile: effectiveProfile,
        originalSuperAdminProfile: originalProfile?.role === "super_admin" ? originalProfile : null,
        isImpersonating: !!impersonatedUser,
        loading,
        signIn,
        signOut,
        refreshProfile,
        impersonateUser,
        stopImpersonating,
      }}
    >
      {children}
    </AuthContext>
  );
}
