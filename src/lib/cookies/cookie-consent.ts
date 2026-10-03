/**
 * SchoolStudy Cookie & Performance Consent Management System
 * GDPR, DPDP Act & High-Speed Caching Compliant
 */

export interface CookieConsentPreferences {
  essential: boolean; // Always true: Auth, session security, CSRF protection
  performance: boolean; // High-speed IndexedDB caching, fast query store, zero-flicker preloads
  analytics: boolean; // Non-intrusive performance & load-time telemetry
  preferences: boolean; // UI personalization, theme mode, dashboard layout state
}

export interface CookieConsentState {
  consented: boolean;
  categories: CookieConsentPreferences;
  timestamp: number;
  version: string;
}

export const CONSENT_VERSION = "2026.1";
export const STORAGE_KEY = "school_study_cookie_consent_v1";
export const COOKIE_NAME = "ss_cookie_consent";
export const CONSENT_EVENT_NAME = "ss:cookie-consent-changed";

export const DEFAULT_PREFERENCES: CookieConsentPreferences = {
  essential: true,
  performance: true,
  analytics: true,
  preferences: true,
};

export function getStoredConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CookieConsentState;
      if (parsed && typeof parsed.categories === "object") {
        return parsed;
      }
    }

    // Fallback: check cookie
    const hasConsentCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${COOKIE_NAME}=`));

    if (hasConsentCookie) {
      const cookieVal = decodeURIComponent(hasConsentCookie.split("=")[1] || "");
      if (cookieVal === "all" || cookieVal === "true") {
        const state: CookieConsentState = {
          consented: true,
          categories: { ...DEFAULT_PREFERENCES },
          timestamp: Date.now(),
          version: CONSENT_VERSION,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {}
        return state;
      }
    }
  } catch {}

  return null;
}

export function saveConsent(
  categories: Partial<CookieConsentPreferences> = {}
): CookieConsentState {
  const mergedCategories: CookieConsentPreferences = {
    essential: true, // Always required
    performance: categories.performance ?? true,
    analytics: categories.analytics ?? false,
    preferences: categories.preferences ?? true,
  };

  const state: CookieConsentState = {
    consented: true,
    categories: mergedCategories,
    timestamp: Date.now(),
    version: CONSENT_VERSION,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      
      // Store in cookie for 1 year (31,536,000 seconds)
      const cookieValue = encodeURIComponent(
        JSON.stringify({
          v: CONSENT_VERSION,
          p: mergedCategories.performance ? 1 : 0,
          a: mergedCategories.analytics ? 1 : 0,
          pr: mergedCategories.preferences ? 1 : 0,
        })
      );
      document.cookie = `${COOKIE_NAME}=${cookieValue}; path=/; max-age=31536000; SameSite=Lax;`;

      // Dispatch event to inform all active providers/hooks immediately
      window.dispatchEvent(
        new CustomEvent(CONSENT_EVENT_NAME, { detail: state })
      );
    } catch (e) {
      console.warn("Failed to persist cookie consent:", e);
    }
  }

  return state;
}

export function hasConsent(category: keyof CookieConsentPreferences): boolean {
  if (category === "essential") return true;
  const state = getStoredConsent();
  if (!state || !state.consented) return false;
  return !!state.categories[category];
}

export function resetConsent(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax;`;
    window.dispatchEvent(
      new CustomEvent(CONSENT_EVENT_NAME, {
        detail: { consented: false, categories: { ...DEFAULT_PREFERENCES, essential: true } },
      })
    );
  } catch {}
}
