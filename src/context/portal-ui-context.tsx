"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  PortalKey,
  PortalUIVersion,
  PortalUISettings,
  DEFAULT_PORTAL_UI_SETTINGS,
} from "@/types/portal-ui";
import {
  subscribeToPortalUISettings,
  updatePortalUIVersion,
  resetAllPortalsToClassic,
} from "@/lib/services/portal-ui.service";

interface PortalUIContextType {
  settings: PortalUISettings;
  activePortal: PortalKey;
  currentVersion: PortalUIVersion;
  isNewUI: boolean;
  loading: boolean;
  getPortalVersion: (portal: PortalKey) => PortalUIVersion;
  setPortalVersion: (portal: PortalKey, version: PortalUIVersion) => Promise<void>;
  resetAllToClassic: () => Promise<void>;
}

const PortalUIContext = createContext<PortalUIContextType | undefined>(undefined);

export function PortalUIProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, firebaseUser } = useAuth();
  const [settings, setSettings] = useState<PortalUISettings>(DEFAULT_PORTAL_UI_SETTINGS);
  const [loading, setLoading] = useState(true);

  // 1. Real-time Firestore subscription to central portal settings
  useEffect(() => {
    const unsub = subscribeToPortalUISettings((liveSettings) => {
      setSettings(liveSettings);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Derive active portal key from pathname / user role
  const activePortal: PortalKey = useMemo(() => {
    if (pathname === "/") return "landingPage";
    if (pathname.startsWith("/student")) return "student";
    if (pathname.startsWith("/teacher")) return "teacher";
    if (pathname.startsWith("/super-admin")) return "superAdmin";
    if (pathname.startsWith("/admin")) return "schoolAdmin";

    // Fallback based on profile role if on root or ambiguous route
    if (profile?.role === "super_admin") return "superAdmin";
    if (profile?.role === "teacher") return "teacher";
    if (profile?.role === "student") return "student";
    return "schoolAdmin";
  }, [pathname, profile?.role]);

  // 3. Current active version for the active portal
  const currentVersion: PortalUIVersion = useMemo(() => {
    return settings[activePortal] || "classic";
  }, [settings, activePortal]);

  const isNewUI = currentVersion === "new";

  const getPortalVersion = useCallback(
    (portal: PortalKey): PortalUIVersion => {
      return settings[portal] || "classic";
    },
    [settings]
  );

  const setPortalVersion = useCallback(
    async (portal: PortalKey, version: PortalUIVersion) => {
      const operator = {
        uid: profile?.uid || firebaseUser?.uid || "super_admin",
        name: profile?.name || firebaseUser?.displayName || "Super Admin",
      };
      await updatePortalUIVersion(portal, version, operator);
    },
    [profile, firebaseUser]
  );

  const resetAllToClassicHandler = useCallback(async () => {
    const operator = {
      uid: profile?.uid || firebaseUser?.uid || "super_admin",
      name: profile?.name || firebaseUser?.displayName || "Super Admin",
    };
    await resetAllPortalsToClassic(operator);
  }, [profile, firebaseUser]);

  return (
    <PortalUIContext.Provider
      value={{
        settings,
        activePortal,
        currentVersion,
        isNewUI,
        loading,
        getPortalVersion,
        setPortalVersion,
        resetAllToClassic: resetAllToClassicHandler,
      }}
    >
      {children}
    </PortalUIContext.Provider>
  );
}

/**
 * Hook to access active portal UI versioning throughout the app.
 */
export function usePortalUI() {
  const context = useContext(PortalUIContext);
  if (!context) {
    // Graceful fallback if rendered outside provider
    return {
      settings: DEFAULT_PORTAL_UI_SETTINGS,
      activePortal: "schoolAdmin" as PortalKey,
      currentVersion: "classic" as PortalUIVersion,
      isNewUI: false,
      loading: false,
      getPortalVersion: () => "classic" as PortalUIVersion,
      setPortalVersion: async () => {},
      resetAllToClassic: async () => {},
    };
  }
  return context;
}
