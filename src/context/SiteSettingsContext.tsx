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
