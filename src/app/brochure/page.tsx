import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Footer } from "@/components/footer";
import {
  constructPublicMetadata,
  siteConfig,
  getBreadcrumbSchema,
  getFaqSchema,
  getSoftwareAppSchema,
} from "@/lib/seo";
import {
  BrochureHero,
  BrochureTableOfContents,
  ProblemSolutionSection,
  PlatformOverviewSection,
  StudentAdmissionSection,
  SmartFeesSection,
  AttendanceSection,
  AcademicExamSection,
  CommunicationSection,
  ReportsAnalyticsSection,
  RolesSecuritySection,
  WhySchoolStudySection,
  BrochureFinalCTA,
  BrochureDownloadButton,
  BrochurePrintView,
} from "@/components/brochure";
import { BROCHURE_FAQS, BROCHURE_CONTACT } from "@/lib/cms/brochureData";

export const metadata: Metadata = constructPublicMetadata("/brochure");

export default function BrochurePage() {
  const breadcrumbItems = [{ name: "Digital Brochure", url: "/brochure" }];

  const jsonLd = [
    getSoftwareAppSchema(),
    getBreadcrumbSchema(breadcrumbItems),
    getFaqSchema(BROCHURE_FAQS),
    {
      "@context": "https://schema.org",
      "@type": "DigitalDocument",
      name: "School Study Official Product Brochure",
      description:
        "Comprehensive 12-section product brochure covering cloud ERP architecture, admissions, fees, roll-call, and security.",
      url: `${siteConfig.url}/brochure`,
      publisher: {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteConfig.url,
        telephone: BROCHURE_CONTACT.phoneDisplay,
        email: BROCHURE_CONTACT.email,
      },
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <BrochurePrintView />

      {/* Main Marketing Header */}
      <div className="print:hidden">
        <MarketingHeader currentPath="/brochure" />
      </div>

      {/* Breadcrumb Navigation */}
      <div className="print:hidden">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <main id="main-content" className="relative">
        {/* Section 01: Hero Cover & Overview */}
        <BrochureHero />

        {/* Sticky Table of Contents Quick Nav */}
        <BrochureTableOfContents />

        {/* Section 02: Problems vs Modern Cloud Solutions */}
        <ProblemSolutionSection />

        {/* Section 03: Platform Architecture & Security */}
        <PlatformOverviewSection />

        {/* Section 04: Student Lifecycle & Admissions */}
        <StudentAdmissionSection />

        {/* Section 05: Smart Fee Management & Billing */}
        <SmartFeesSection />

        {/* Section 06: Smart Attendance & Roll-Call Automation */}
        <AttendanceSection />

        {/* Section 07: Academics, Timetables & Examinations */}
        <AcademicExamSection />

        {/* Section 08: Institutional Communication & Notice Board */}
        <CommunicationSection />

        {/* Section 09: Executive Dashboards & Analytics */}
        <ReportsAnalyticsSection />

        {/* Section 10: Multi-Role Portals & Security */}
        <RolesSecuritySection />

        {/* Section 11: Institutional Value, ROI & Plans */}
        <WhySchoolStudySection />

        {/* Section 12: Getting Started, Live Demo & Contacts */}
        <BrochureFinalCTA />

        {/* Floating Quick Download Trigger for Easy Access */}
        <BrochureDownloadButton variant="floating" />
      </main>

      {/* Official Footer */}
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
