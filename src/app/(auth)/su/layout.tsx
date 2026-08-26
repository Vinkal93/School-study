import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Super Admin Gateway",
  noIndex: true,
});

export default function SuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
