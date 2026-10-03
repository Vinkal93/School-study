import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/config";

// Omit lastModified until a reliable per-page content timestamp is available.
// Request time is not the time a page's content changed.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about-developer", "/features", "/pricing", "/school-management",
    "/school-erp", "/student-management", "/teacher-management",
    "/attendance-management", "/fee-management", "/download", "/contact"
  ].map(path => ({ url: `${siteConfig.url}${path}` }));
}
