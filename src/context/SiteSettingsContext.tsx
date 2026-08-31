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
      const res = await fetch("/api/site-settings", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
          setSettings(json.settings);
        }
      }
    } catch {
      // Graceful fallback to default settings without console error spam
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Attach Realtime listener to siteSettings/global
    try {
      const db = getFirebaseDb();
      if (db) {
        const unsubscribe = onSnapshot(
          doc(db, "siteSettings", "global"),
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() as SiteSettings;
              setSettings({
                ...DEFAULT_SITE_SETTINGS,
                ...data,
                header: {
                  ...DEFAULT_SITE_SETTINGS.header,
                  ...(data.header || {}),
                  navigation: data.header?.navigation || DEFAULT_SITE_SETTINGS.header.navigation,
                },
                footer: {
                  ...DEFAULT_SITE_SETTINGS.footer,
                  ...(data.footer || {}),
                  columns: data.footer?.columns || DEFAULT_SITE_SETTINGS.footer.columns,
                },
              });
            }
          },
          (err) => {
            console.warn("Notice: Realtime site settings listener notice:", err?.message);
          }
        );
        return () => unsubscribe();
      }
    } catch (e) {
      // Non-blocking fallback
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
