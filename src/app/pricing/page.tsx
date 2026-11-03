import type { Metadata } from "next";
import { constructPublicMetadata, getBreadcrumbSchema, siteConfig } from "@/lib/seo";
import { MarketingHeader } from "@/components/marketing";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Footer } from "@/components/footer";
import { PricingContent } from "@/components/pricing/PricingContent";

export const metadata: Metadata = constructPublicMetadata("/pricing");

export default function PricingPage() {
  const breadcrumbData = [{ name: "Pricing", url: "/pricing" }];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Pricing Plans | School Study",
      description:
        "Choose the right School Study plan for your institution. Simple, transparent pricing for Starter, Professional, and Enterprise plans.",
      url: `${siteConfig.url}/pricing`,
    },
    getBreadcrumbSchema(breadcrumbData),
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-slate-900 dark:text-slate-100 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <MarketingHeader currentPath="/pricing" />
      <Breadcrumbs items={breadcrumbData} />

      <main id="main-content">
        <PricingContent />
      </main>

      <Footer />
    </div>
  );
}
