import Script from "next/script";

/**
 * Clean, production-ready Google Analytics (GA4) integration.
 * Activates ONLY when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is defined.
 * Does NOT track or output anything when the ID is omitted.
 */
export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!measurementId || typeof measurementId !== "string" || !measurementId.startsWith("G-")) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
