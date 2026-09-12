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
          "/admin",
          "/admin/*",
          "/teacher",
          "/teacher/*",
          "/student",
          "/student/*",
          "/super-admin",
          "/super-admin/*",
          "/billing",
          "/billing/*",
          "/api",
          "/api/*",
          "/setup-super-admin",
          "/su",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
