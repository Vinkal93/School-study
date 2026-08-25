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

interface AuthContextType {
  firebaseUser: User | null;
  profile: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AppUser>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChanged(async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          const userProfile = await getUserProfile(user.uid, user.email);

          if (!userProfile) {
            // User exists in Firebase Auth but not in Firestore
            toast.error("Account not found. Please contact admin.");
            await signOutUser();
            setFirebaseUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          if (userProfile.status !== "active") {
            // User account is disabled
            toast.error("Your account has been disabled. Please contact admin.");
            await signOutUser();
            setFirebaseUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          setProfile(userProfile);
        } catch (err: any) {
          console.error("Failed to load user profile:", err);
          const isOfflineOrDisabled =
            err?.code === "unavailable" ||
            err?.message?.includes("offline") ||
            err?.message?.includes("PERMISSION_DENIED");
          if (isOfflineOrDisabled) {
            toast.error("Firestore database is not enabled yet. Please create Cloud Firestore in your Firebase Console.");
          } else {
            toast.error("Failed to load user profile.");
          }
          await signOutUser();
          setFirebaseUser(null);
          setProfile(null);
        }
      } else {
        setProfile(null);
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

        // Fetch profile immediately after sign-in for role redirect
        const userProfile = await getUserProfile(fbUser.uid, fbUser.email);

        if (!userProfile) {
          await signOutUser();
          setLoading(false);
          throw new Error("Account not found. Please contact admin.");
        }

        if (userProfile.status !== "active") {
          await signOutUser();
          setLoading(false);
          throw new Error(
            "Your account has been disabled. Please contact admin."
          );
        }

        // Set state (onAuthChanged will also fire but profile is already set)
        setFirebaseUser(fbUser);
        setProfile(userProfile);
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
    await signOutUser();
    setFirebaseUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext
      value={{
        firebaseUser,
        profile,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext>
  );
}
