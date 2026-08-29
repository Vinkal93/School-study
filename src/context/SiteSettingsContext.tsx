"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { SiteSettings, DEFAULT_SITE_SETTINGS, getPublicSiteSettings } from "@/lib/cms/siteSettings";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, onSnapshot } from "firebase/firestore";

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: DEFAULT_SITE_SETTINGS,
  loading: false,
  refreshSettings: async () => {},
});

export function SiteSettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: SiteSettings;
}) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings || DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(!initialSettings);

  const fetchSettings = async () => {
    try {
      const data = await getPublicSiteSettings();
      setSettings(data);
    } catch (err) {
      console.error("Failed to load site settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Realtime subscription to published settings
    const db = getFirebaseDb();
    if (!db) {
      fetchSettings();
      return;
    }

    try {
      const unsub = onSnapshot(
        doc(db, "siteSettings", "global"),
        (snap) => {
          if (snap.exists()) {
            setSettings({ ...DEFAULT_SITE_SETTINGS, ...snap.data() } as SiteSettings);
          } else {
            setSettings(DEFAULT_SITE_SETTINGS);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Realtime site settings listener error, falling back:", error);
          fetchSettings();
        }
      );

      return () => unsub();
    } catch (e) {
      fetchSettings();
    }
  }, []);

  return (
    <SiteSettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
