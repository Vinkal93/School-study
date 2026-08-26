import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Setup Super Admin",
  noIndex: true,
});

export default function SetupSuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
