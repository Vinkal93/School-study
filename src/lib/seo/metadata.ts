import type { Metadata } from "next";
import { siteConfig } from "./config";

export interface ConstructMetadataOptions {
  title?: string;
  description?: string;
  image?: string;
  canonicalUrl?: string;
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
 */
export function constructMetadata({
  title,
  description = siteConfig.defaultDescription,
  image = siteConfig.defaultOgImage,
  canonicalUrl,
  noIndex = false,
}: ConstructMetadataOptions = {}): Metadata {
  const pageTitle = normalizeTitle(title);

  return {
    title: pageTitle,
    description,
    keywords: siteConfig.keywords,
    authors: [{ name: "Vinkal Prajapati", url: `${siteConfig.url}/about-developer` }],
    creator: "Vinkal Prajapati",
    publisher: siteConfig.name,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: canonicalUrl || "/",
    },
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl ? `${siteConfig.url}${canonicalUrl}` : siteConfig.url,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} — Modern School Management Platform`,
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
      creator: "@schoolstudy",
    },
    verification: {
      google: siteConfig.googleSiteVerification,
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
      shortcut: "/icon.svg",
      apple: [
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
    },
  };
}
