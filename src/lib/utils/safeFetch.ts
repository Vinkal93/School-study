/**
 * Safe JSON fetch utility for robust frontend API communications.
 * Prevents "Unexpected end of JSON input" and handles non-JSON / HTML error pages gracefully.
 */

export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string;
  code: string;
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data: any = null;

    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.warn(`[SafeFetch] Received non-JSON response from ${url} (HTTP ${res.status}):`, text.substring(0, 150));
        return {
          ok: false,
          status: res.status,
          data: null,
          error: `Server error (HTTP ${res.status}). Received non-JSON response.`,
          code: `HTTP_${res.status}_NON_JSON`,
        };
      }
    }

    if (!res.ok) {
      const errorMsg = data?.error || data?.message || `Request failed with status ${res.status}`;
      const code = data?.code || `HTTP_${res.status}`;
      return {
        ok: false,
        status: res.status,
        data,
        error: errorMsg,
        code,
      };
    }

    return {
      ok: true,
      status: res.status,
      data,
      error: "",
      code: "SUCCESS",
    };
  } catch (netErr: any) {
    console.error(`[SafeFetch] Network or fetch error for ${url}:`, netErr);
    return {
      ok: false,
      status: 0,
      data: null,
      error: netErr?.message || "Network connection failed. Please check your internet connection.",
      code: "NETWORK_ERROR",
    };
  }
}
