import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Teacher Workspace",
  noIndex: true,
});

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
