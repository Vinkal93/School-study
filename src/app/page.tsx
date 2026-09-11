import type { Metadata } from "next";
import { cookies } from "next/headers";
import { constructMetadata, getHomepageJsonLd } from "@/lib/seo";
import { LandingPageSwitch } from "@/components/landing/LandingPageSwitch";
import { DEFAULT_PORTAL_UI_SETTINGS, type PortalUIVersion } from "@/types/portal-ui";

export const metadata: Metadata = constructMetadata({
  title: "School Management Software for Modern Schools | School Study",
  description:
    "School Study is a modern school management platform for schools to manage students, teachers, classes and attendance from one simple system.",
  canonicalUrl: "/",
});

export default async function Page() {
  const jsonLd = getHomepageJsonLd();
  const cookieStore = await cookies();
  const cookieVersion = cookieStore.get("portal_landingPage")?.value as PortalUIVersion | undefined;

  return (
    <>
      {/* ==========================================
          STRUCTURED DATA (JSON-LD)
      ========================================== */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Real-time UI Version Switch (Classic vs Modern 2.0) with zero-flicker SSR */}
      <LandingPageSwitch initialVersion={cookieVersion || DEFAULT_PORTAL_UI_SETTINGS.landingPage} />
    </>
  );
}
