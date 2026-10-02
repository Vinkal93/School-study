import type { Metadata } from "next";
import { cookies } from "next/headers";
import { constructMetadata, getHomepageJsonLd, siteConfig, developerConfig } from "@/lib/seo";
import { LandingPageSwitch } from "@/components/landing/LandingPageSwitch";
import { DEFAULT_PORTAL_UI_SETTINGS, type PortalUIVersion } from "@/types/portal-ui";

export const metadata: Metadata = constructMetadata({
  title: "School Management Software & Cloud ERP Platform",
  description:
    "School Study is a modern, all-in-one cloud school management software and ERP architected by Vinkal Prajapati. Effortlessly manage students, faculty, real-time attendance, fee collections, and parent-teacher communication from one secure dashboard.",
  canonicalUrl: "/",
  keywords: [
    "School Management Software",
    "School Management System",
    "School ERP Software",
    "School ERP Platform",
    "Cloud School ERP",
    developerConfig.name,
    "Vinkal",
    "Vinkal93",
    "School Study by Vinkal",
    "Student Attendance Management System",
    "Student Information System",
    "Teacher Portal",
    "Multi-Tenant School Software",
    "Best School Management Software 2026",
    "School Study SaaS",
  ],
});

export default async function Page() {
  const jsonLd = getHomepageJsonLd();
  const cookieStore = await cookies();
  const cookieVersion = cookieStore.get("portal_landingPage")?.value as PortalUIVersion | undefined;

  return (
    <>
      {/* ==========================================
          STRUCTURED DATA (JSON-LD)
          Includes: Organization, WebSite, SoftwareApplication,
          Person (Vinkal Prajapati), and FAQPage
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
