import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata = constructMetadata({ title: "Support Workspace", noIndex: true });

export default function SupportLayout({ children }: { children: ReactNode }) {
  return children;
}
