export function traceClient(tag: string, data?: any) {
  if (typeof window === "undefined") return;
  const isIframe = window.self !== window.top;
  const payload = {
    tag,
    isIframe,
    pathname: window.location.pathname,
    search: window.location.search,
    data,
    time: Date.now(),
  };
  console.log(`[TRACE] [${isIframe ? "IFRAME" : "MAIN"}] ${tag}`, payload);
  try {
    fetch("/api/debug-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {}
}
