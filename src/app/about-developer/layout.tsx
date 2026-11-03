import type { Metadata } from "next";
import {
  constructPublicMetadata,
  getPersonSchema,
  getDeveloperProfilePageSchema,
  getBreadcrumbSchema,
} from "@/lib/seo";

export const metadata: Metadata = constructPublicMetadata("/about-developer");

export default function AboutDeveloperLayout({ children }: { children: React.ReactNode }) {
  const schemas = [
    getDeveloperProfilePageSchema(),
    getPersonSchema(),
    getBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "About Developer", url: "/about-developer" },
    ]),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }}
      />
      {children}
    </>
  );
}
