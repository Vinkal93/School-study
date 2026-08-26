import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Student Portal",
  noIndex: true,
});

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
