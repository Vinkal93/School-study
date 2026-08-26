import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

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
  return children;
}
