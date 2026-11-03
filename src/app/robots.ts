import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/config";
import { isPreviewEnvironment } from "@/lib/seo/metadata";

export default function robots(): MetadataRoute.Robots {
  if (isPreviewEnvironment()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  // Match private route boundaries, not /student-management or /teacher-management.
  // One group applies the same public-page policy to Googlebot, Bingbot and others.
  const privatePrefixes = [...siteConfig.privateRoutePrefixes, "/setup-super-admin", "/su", "/support"];
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: privatePrefixes.flatMap((prefix) => [`${prefix}$`, `${prefix}/`]),
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
