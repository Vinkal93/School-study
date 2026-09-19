export function traceClient(tag: string, data?: any) {
  if (typeof window === "undefined") return;

  // In development, only log to console without network requests to avoid slowing down the app
  const isDev = process.env.NODE_ENV === "development";
  const payload = {
    tag,
    isIframe: window.self !== window.top,
    pathname: window.location.pathname,
    search: window.location.search,
    data,
    time: Date.now(),
  };

  // Only send network requests in production to avoid dev slowdown
  if (isDev) {
    console.debug(`[TRACE] ${tag}`, payload);
    return;
  }

  console.debug(`[TRACE] ${tag}`, payload);
  try {
    navigator.sendBeacon("/api/debug-log", new Blob([JSON.stringify(payload)], { type: "application/json" }));
  } catch {
    // Silently fail - tracing must never break the app
  }
}
