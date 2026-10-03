import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "School Admin Portal",
  noIndex: true,
});

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
