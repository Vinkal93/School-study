import type { Metadata } from "next";
import { cookies } from "next/headers";
import { constructMetadata, getHomepageJsonLd, siteConfig, developerConfig } from "@/lib/seo";
import { LandingPageSwitch } from "@/components/landing/LandingPageSwitch";
import { DEFAULT_PORTAL_UI_SETTINGS, type PortalUIVersion } from "@/types/portal-ui";

export const metadata: Metadata = constructMetadata({
  title: "School Management ERP Software | Best Cloud School ERP System",
  description:
    "School Study is India's leading AI-powered School Management ERP Software architected by Vinkal Prajapati. Automate student admissions, online fee collection with Razorpay, real-time attendance, CBSE report cards, and parent apps on one secure cloud platform.",
  canonicalUrl: "/",
  keywords: [
    "school management erp",
    "school management erp software",
    "School Management Software",
    "School Management System",
    "School ERP Software",
    "School ERP Platform",
    "online school erp",
    "erp school management",
    "Cloud School ERP",
    "Best School Management Software 2026",
    "best school erp in india",
    "AI-powered school analytics",
    "affordable all-in-one school erp",
    "CBSE school erp software",
    "Student Attendance Management System",
    "Student Information System",
    "Parent Teacher Student App",
    developerConfig.name,
    "Vinkal",
    "Vinkal93",
    "School Study by Vinkal",
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
