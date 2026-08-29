import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Footer } from "@/components/footer";
import { constructMetadata } from "@/lib/seo";
import { PlayStoreComingSoonContent } from "@/components/download/PlayStoreComingSoonContent";

export const metadata: Metadata = constructMetadata({
  title: "Google Play Store App — Coming Soon | School Study",
  description:
    "The School Study official Google Play Store application is currently under review and coming soon. In the meantime, download our direct APK or install the instant PWA.",
  canonicalUrl: "/download/play-store",
});

export default function PlayStorePage() {
  const breadcrumbData = [
    { name: "Download", url: "/download" },
    { name: "Google Play Store", url: "/download/play-store" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-slate-900 dark:text-slate-100 font-sans">
      <MarketingHeader currentPath="/download" />
      <Breadcrumbs items={breadcrumbData} />

      <main id="main-content">
        <PlayStoreComingSoonContent />
      </main>

      <Footer />
    </div>
  );
}
