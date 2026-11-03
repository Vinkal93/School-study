import type { ReactNode } from "react";
import { constructPublicMetadata } from "@/lib/seo/metadata";

export const metadata = constructPublicMetadata("/cookies");

export default function CookiePolicyLayout({ children }: { children: ReactNode }) {
  return children;
}
