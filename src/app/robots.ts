import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/config";

/**
 * Dynamic Robots.txt generator for School Study
 * Allows crawling of public marketing pages.
 * Disallows search engine crawlers from indexing private application portals and APIs.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/teacher/",
          "/student/",
          "/super-admin/",
          "/api/",
          "/su",
          "/setup-super-admin",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
