import type { Metadata } from "next";
import { constructMetadata, getHomepageJsonLd } from "@/lib/seo";
import { LandingPageSwitch } from "@/components/landing/LandingPageSwitch";

export const metadata: Metadata = constructMetadata({
  title: "School Management Software for Modern Schools | School Study",
  description:
    "School Study is a modern school management platform for schools to manage students, teachers, classes and attendance from one simple system.",
  canonicalUrl: "/",
});

export default function Page() {
  const jsonLd = getHomepageJsonLd();

  return (
    <>
      {/* ==========================================
          STRUCTURED DATA (JSON-LD)
      ========================================== */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Real-time UI Version Switch (Classic vs Modern 2.0) */}
      <LandingPageSwitch />
    </>
  );
}
