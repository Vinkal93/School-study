import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { StudentShellSwitch } from "./StudentShellSwitch";

export const metadata: Metadata = constructMetadata({
  title: "Student Portal",
  noIndex: true,
});

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudentShellSwitch>{children}</StudentShellSwitch>;
}
