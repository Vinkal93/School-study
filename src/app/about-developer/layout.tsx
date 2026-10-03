import type { Metadata } from "next";
import {
  constructMetadata,
  getPersonSchema,
  getDeveloperProfilePageSchema,
  getBreadcrumbSchema,
  developerConfig,
} from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: `${developerConfig.name} — Founder, Software Architect & Developer of School Study`,
  description: `Official profile and biography of ${developerConfig.name} (Er. Vinkal Prajapati), founder and lead architect behind School Study. Explore his engineering principles, EdTech innovations, tech stack, and portfolio.`,
  canonicalUrl: "/about-developer",
  keywords: [
    developerConfig.name,
    "Vinkal",
    "Vinkal93",
    "Vinkal developer",
    "Vinkal School Study",
    "Vinkal Prajapati developer",
    "Vinkal Prajapati portfolio",
    "Vinkal software architect",
    "Er Vinkal Prajapati",
    "School Study creator",
    "School Study founder",
    "EdTech Architect India",
  ],
});

export default function AboutDeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      />
      {children}
    </>
  );
}
