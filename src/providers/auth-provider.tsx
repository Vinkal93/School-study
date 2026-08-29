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
  signIn: (email: string, password: string) => Promise<AppUser>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<AppUser | null>;
  impersonateUser: (targetUser: AppUser) => void;
  stopImpersonating: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IMPERSONATION_STORAGE_KEY = "school_study_impersonation_user";

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
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AppUser> => {
      setLoading(true);
      try {
        const fbUser = await signInWithEmail(email, password);
        const userProfile = await getUserProfile(fbUser.uid, fbUser.email);

        if (!userProfile) {
          await signOutUser();
          setLoading(false);
          throw new Error("Account not found. Please contact admin.");
        }

        if (
          userProfile.status === "suspended" ||
          userProfile.status === "disabled" ||
          userProfile.status === "inactive"
        ) {
          await signOutUser();
          setLoading(false);
          throw new Error(
            "Your account has been suspended or deactivated. Please contact platform admin."
          );
        }

        setFirebaseUser(fbUser);
        setOriginalProfile(userProfile);
        setImpersonatedUser(null);
        sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
        setLoading(false);

        return userProfile;
      } catch (error) {
        setLoading(false);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Invalid email or password");
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    setImpersonatedUser(null);
    await signOutUser();
    setFirebaseUser(null);
    setOriginalProfile(null);
  }, []);

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
