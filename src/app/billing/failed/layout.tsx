import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Payment Unsuccessful",
  noIndex: true,
});

export default function PaymentFailedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
