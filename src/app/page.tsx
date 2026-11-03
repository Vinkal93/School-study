import { PublicPageLinks } from "@/components/marketing/PublicPageLinks";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { constructPublicMetadata, getHomepageJsonLd } from "@/lib/seo";
import { LandingPageSwitch } from "@/components/landing/LandingPageSwitch";
import { DEFAULT_PORTAL_UI_SETTINGS, type PortalUIVersion } from "@/types/portal-ui";

export const metadata: Metadata = constructPublicMetadata("/");

export default async function Page() {
  const jsonLd = getHomepageJsonLd();
  const cookieStore = await cookies();
  const cookieVersion = cookieStore.get("portal_landingPage")?.value as PortalUIVersion | undefined;

  return (
    <>
      {/* ==========================================
          STRUCTURED DATA (JSON-LD)
          Includes: Organization, WebSite, SoftwareApplication,
          Person (Vinkal Prajapati); FAQs belong only to matching visible content
      ========================================== */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {/* Real-time UI Version Switch (Classic vs Modern 2.0) with zero-flicker SSR */}
      <LandingPageSwitch initialVersion={cookieVersion || DEFAULT_PORTAL_UI_SETTINGS.landingPage} />
      <PublicPageLinks />
    </>
  );
}
