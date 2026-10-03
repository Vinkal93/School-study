import type { Metadata } from "next";
import { siteConfig } from "./config";

export interface ConstructMetadataOptions {
  title?: string;
  description?: string;
  image?: string;
  canonicalUrl?: string;
  keywords?: string[];
  noIndex?: boolean;
}

/**
 * Normalizes page titles to ensure a single, consistent brand suffix.
 * Handles cases where the title:
 * - is missing/undefined -> defaultTitle
 * - already ends with " | School Study" or " - School Study" or " — School Study"
 * - is exactly "School Study"
 * - does not have the brand suffix -> appends " | School Study"
 */
export function normalizeTitle(rawTitle?: string): string {
  if (!rawTitle || !rawTitle.trim()) {
    return siteConfig.defaultTitle;
  }

  const brand = siteConfig.name.trim();
  let cleaned = rawTitle.trim();

  // If the raw title matches the brand name alone or the default title, return defaultTitle
  if (
    cleaned.toLowerCase() === brand.toLowerCase() ||
    cleaned.toLowerCase() === siteConfig.defaultTitle.toLowerCase()
  ) {
    return siteConfig.defaultTitle;
  }

  // Strip any trailing occurrences of the brand suffix (e.g., " | School Study", " - School Study")
  const brandSuffixRegex = new RegExp(
    `\\s*[-|—–•]\\s*${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
    "i"
  );

  while (brandSuffixRegex.test(cleaned)) {
    cleaned = cleaned.replace(brandSuffixRegex, "").trim();
  }

  if (!cleaned) {
    return siteConfig.defaultTitle;
  }

  return `${cleaned} | ${brand}`;
}

/**
 * Constructs robust, consistent Next.js Metadata objects.
 * Built for 100% technical SEO, author entity linking, and AI bot discovery.
 */
export function constructMetadata({
  title,
  description = siteConfig.defaultDescription,
  image = siteConfig.defaultOgImage,
  canonicalUrl,
  keywords = [],
  noIndex = false,
}: ConstructMetadataOptions = {}): Metadata {
  const pageTitle = normalizeTitle(title);
  
  // Merge page-specific keywords with global brand & creator keywords (deduped)
  const combinedKeywords = Array.from(new Set(keywords.length ? keywords : [siteConfig.name, "school management software", "school ERP software"]));

  return {
    title: pageTitle,
    description,
    keywords: combinedKeywords,
    authors: [
      { name: siteConfig.developer.name, url: `${siteConfig.url}/about-developer` },
      { name: "Vinkal", url: siteConfig.developer.portfolioUrl },
    ],
    creator: siteConfig.developer.name,
    publisher: siteConfig.name,
    applicationName: siteConfig.name,
    generator: "Next.js",
    category: "Education Technology & School ERP",
    classification: "Multi-Tenant School Management Software & ERP",
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: canonicalUrl || "/",
    },
    openGraph: {
      title: pageTitle,
      description,
      url: new URL(canonicalUrl || "/", siteConfig.url).toString(),
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} — Modern School Management Platform by ${siteConfig.developer.name}`,
          type: "image/png",
        },
      ],
      locale: siteConfig.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [image],
    },
    verification: {
      google: siteConfig.googleSiteVerification,
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      nocache: false,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        noimageindex: false,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      shortcut: "/icon.svg",
      apple: [
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
    },
    manifest: "/manifest.json",
    other: {
      "author": siteConfig.developer.name,
      "designer": siteConfig.developer.name,
      "developer": siteConfig.developer.name,
      "owner": siteConfig.developer.name,
      "creator": siteConfig.developer.name,
      "rating": "General",
      "distribution": "Global",
      "revisit-after": "3 days",
      "ai-content-declaration": "educational-saas",
      "llms": siteConfig.links.llmsTxt,
      "apple-mobile-web-app-title": siteConfig.name,
      "application-name": siteConfig.name,
    },
  };
}
