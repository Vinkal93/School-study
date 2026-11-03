import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/config";
import { publicPages } from "@/lib/seo/pages";
import { isPreviewEnvironment } from "@/lib/seo/metadata";

// Omit lastModified until a reliable per-page content timestamp is available.
// Request time is not the time a page's content changed.
export default function sitemap(): MetadataRoute.Sitemap {
  if (isPreviewEnvironment()) return [];
  return publicPages.map(({ path }) => ({ url: new URL(path, siteConfig.url).toString() }));
}
