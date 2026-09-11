"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
  const [settings, setSettings] = useState<SiteSettings>(() => {
    if (initialSettings) return initialSettings;
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("site_settings_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") {
            return { ...DEFAULT_SITE_SETTINGS, ...parsed };
          }
        }
      } catch {}
    }
    return DEFAULT_SITE_SETTINGS;
  });
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/site-settings");
      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
          setSettings(json.settings);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("site_settings_cache", JSON.stringify(json.settings));
            } catch {}
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    let unsub: (() => void) | null = null;

    try {
      const db = getFirebaseDb();
      if (db) {
        unsub = onSnapshot(
          doc(db, "siteSettings", "global"),
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() as SiteSettings;
              const merged: SiteSettings = {
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
              };
              setSettings(merged);
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem("site_settings_cache", JSON.stringify(merged));
                } catch {}
              }
            }
          },
          () => {
            // Non-blocking fallback
          }
        );
      }
    } catch {}

    return () => {
      if (unsub) unsub();
    };
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
