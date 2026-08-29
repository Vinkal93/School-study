import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Footer } from "@/components/footer";
import { constructMetadata } from "@/lib/seo";
import { AppStoreComingSoonContent } from "@/components/download/AppStoreComingSoonContent";

export const metadata: Metadata = constructMetadata({
  title: "Apple App Store (iOS) App — Coming Soon | School Study",
  description:
    "The School Study official Apple App Store (iOS) app is in development. In the meantime, install the full-featured web app on iPhone and iPad via Safari 'Add to Home Screen'.",
  canonicalUrl: "/download/app-store",
});

export default function AppStorePage() {
  const breadcrumbData = [
    { name: "Download", url: "/download" },
    { name: "Apple App Store", url: "/download/app-store" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-slate-900 dark:text-slate-100 font-sans">
      <MarketingHeader currentPath="/download" />
      <Breadcrumbs items={breadcrumbData} />

      <main id="main-content">
        <AppStoreComingSoonContent />
      </main>

      <Footer />
    </div>
  );
}
