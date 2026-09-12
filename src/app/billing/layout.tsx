import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Billing & Transactions",
  noIndex: true,
});

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
