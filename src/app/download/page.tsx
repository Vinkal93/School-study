import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Footer } from "@/components/footer";
import { constructMetadata, siteConfig, getBreadcrumbSchema } from "@/lib/seo";
import { DownloadContent } from "@/components/download/DownloadContent";

export const metadata: Metadata = constructMetadata({
  title: "Download School Study App | Android APK, PWA & Mobile Portals",
  description:
    "Download the official School Study mobile app. Install our lightweight PWA instantly with 0 MB storage or download the Android APK directly for fast school attendance and student portals.",
  canonicalUrl: "/download",
});

export default function DownloadPage() {
  const breadcrumbData = [
    { name: "Download App", url: "/download" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "School Study Mobile App",
      operatingSystem: "Android, iOS, Web",
      applicationCategory: "EducationalApplication",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
      },
      url: `${siteConfig.url}/download`,
      description:
        "Official mobile application for School Study school management software. Features student portal, teacher attendance, fee tracking, and instant alerts.",
      publisher: {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteConfig.url,
      },
    },
    getBreadcrumbSchema(breadcrumbData),
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-slate-900 dark:text-slate-100 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingHeader currentPath="/download" />
      <Breadcrumbs items={breadcrumbData} />

      <main id="main-content">
        <DownloadContent />
      </main>

      <Footer />
    </div>
  );
}
