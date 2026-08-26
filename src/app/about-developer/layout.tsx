import type { Metadata } from "next";
import { constructMetadata, getPersonSchema, getBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "About Vinkal Prajapati — Developer of School Study",
  description:
    "Learn about Vinkal Prajapati, the developer and creator behind School Study, a modern school management platform.",
  canonicalUrl: "/about-developer",
});

export default function AboutDeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemas = [
    getPersonSchema(),
    getBreadcrumbSchema([{ name: "About Developer", url: "/about-developer" }]),
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
