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
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

interface PortalUIContextType {
  settings: PortalUISettings;
  activePortal: PortalKey;
  currentVersion: PortalUIVersion;
  isNewUI: boolean;
  isLiquidGlassUI: boolean;
  isClassicUI: boolean;
  loading: boolean;
  adminPortalUiMode: "modern" | "classic";
  getPortalVersion: (portal: PortalKey) => PortalUIVersion;
  setPortalVersion: (portal: PortalKey, version: PortalUIVersion) => Promise<void>;
  setInstituteAdminPortalUiMode: (schoolId: string, mode: "modern" | "classic") => Promise<void>;
  resetAllToClassic: () => Promise<void>;
}

const PortalUIContext = createContext<PortalUIContextType | undefined>(undefined);

export function PortalUIProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, firebaseUser } = useAuth();
  const [settings, setSettings] = useState<PortalUISettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("portal_ui_settings");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") {
            return { ...DEFAULT_PORTAL_UI_SETTINGS, ...parsed };
          }
        }
      } catch {}
    }
    return DEFAULT_PORTAL_UI_SETTINGS;
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("portal_ui_settings");
    }
    return true;
  });

  const [adminPortalUiMode, setAdminPortalUiMode] = useState<"modern" | "classic">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ss_admin_portal_ui_mode");
      if (stored === "modern" || stored === "classic") return stored;
    }
    return "modern";
  });

  // Listen to institute's configured adminPortalUiMode
  useEffect(() => {
    const schoolId = profile?.schoolId;
    if (!schoolId || schoolId === "system") return;

    const db = getFirebaseDb();
    if (!db) return;

    const unsub = onSnapshot(
      doc(db, "schools", schoolId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const mode: "modern" | "classic" =
            data.adminPortalUiMode || data.tenantSettings?.adminPortalUiMode || "modern";
          setAdminPortalUiMode(mode);
          try {
            localStorage.setItem("ss_admin_portal_ui_mode", mode);
          } catch {}
        }
      },
      (err) => {
        if (err.code !== "permission-denied") {
          console.warn("Notice: Institute adminPortalUiMode listener:", err);
        }
      }
    );

    return () => unsub();
  }, [profile?.schoolId]);

  const setInstituteAdminPortalUiMode = useCallback(
    async (targetSchoolId: string, mode: "modern" | "classic") => {
      const db = getFirebaseDb();
      if (!db) return;
      await updateDoc(doc(db, "schools", targetSchoolId), {
        adminPortalUiMode: mode,
        "tenantSettings.adminPortalUiMode": mode,
        updatedAt: serverTimestamp(),
      });
      if (profile?.schoolId === targetSchoolId) {
        setAdminPortalUiMode(mode);
        try {
          localStorage.setItem("ss_admin_portal_ui_mode", mode);
        } catch {}
      }
    },
    [profile?.schoolId]
  );

  // 1. Real-time Firestore subscription to central portal settings
  useEffect(() => {
    const unsub = subscribeToPortalUISettings((liveSettings) => {
      setSettings(liveSettings);
      setLoading(false);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("portal_ui_settings", JSON.stringify(liveSettings));
          document.cookie = `portal_landingPage=${liveSettings.landingPage}; path=/; max-age=31536000; SameSite=Lax`;
        } catch {}
      }
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
  const isLiquidGlassUI = currentVersion === "liquid_glass";
  const isClassicUI = currentVersion === "classic";

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

      let savedViaApi = false;
      try {
        const idToken = firebaseUser ? await firebaseUser.getIdToken().catch(() => "") : "";
        const res = await fetch("/api/super-admin/portal-ui", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            "x-user-id": operator.uid,
            "x-user-role": profile?.role || "super_admin",
          },
          body: JSON.stringify({ portal, version }),
        });
        if (res.ok) {
          savedViaApi = true;
        }
      } catch (apiErr) {
        console.warn("Server API portal-ui notice, using client SDK fallback:", apiErr);
      }

      if (!savedViaApi) {
        await updatePortalUIVersion(portal, version, operator);
      }
    },
    [profile, firebaseUser]
  );

  const resetAllToClassicHandler = useCallback(async () => {
    const operator = {
      uid: profile?.uid || firebaseUser?.uid || "super_admin",
      name: profile?.name || firebaseUser?.displayName || "Super Admin",
    };

    let savedViaApi = false;
    try {
      const idToken = firebaseUser ? await firebaseUser.getIdToken().catch(() => "") : "";
      const res = await fetch("/api/super-admin/portal-ui", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          "x-user-id": operator.uid,
          "x-user-role": profile?.role || "super_admin",
        },
        body: JSON.stringify({ action: "resetAll" }),
      });
      if (res.ok) {
        savedViaApi = true;
      }
    } catch (apiErr) {
      console.warn("Server API emergency reset notice, using client SDK fallback:", apiErr);
    }

    if (!savedViaApi) {
      await resetAllPortalsToClassic(operator);
    }
  }, [profile, firebaseUser]);

  return (
    <PortalUIContext.Provider
      value={{
        settings,
        activePortal,
        currentVersion,
        isNewUI,
        isLiquidGlassUI,
        isClassicUI,
        loading,
        adminPortalUiMode,
        getPortalVersion,
        setPortalVersion,
        setInstituteAdminPortalUiMode,
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
      isLiquidGlassUI: false,
      isClassicUI: true,
      loading: false,
      adminPortalUiMode: "modern" as const,
      getPortalVersion: () => "classic" as PortalUIVersion,
      setPortalVersion: async () => {},
      setInstituteAdminPortalUiMode: async () => {},
      resetAllToClassic: async () => {},
    };
  }
  return context;
}
