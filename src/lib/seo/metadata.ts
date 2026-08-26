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
 * Constructs robust, consistent Next.js Metadata objects.
 */
export function constructMetadata({
  title,
  description = siteConfig.defaultDescription,
  image = siteConfig.defaultOgImage,
  canonicalUrl,
  noIndex = false,
}: ConstructMetadataOptions = {}): Metadata {
  return {
    title: title ? `${title} | ${siteConfig.name}` : siteConfig.defaultTitle,
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
      title: title ? `${title} | ${siteConfig.name}` : siteConfig.defaultTitle,
      description,
      url: canonicalUrl ? `${siteConfig.url}${canonicalUrl}` : siteConfig.url,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 512,
          height: 512,
          alt: `${siteConfig.name} — Modern School Management Platform`,
        },
      ],
      locale: siteConfig.locale,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: title ? `${title} | ${siteConfig.name}` : siteConfig.defaultTitle,
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
