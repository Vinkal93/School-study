import { FeeSessionProvider } from "@/components/fees/FeeSessionProvider";
export default function FeeLayout({ children }: { children: React.ReactNode }) {
  return <FeeSessionProvider>{children}</FeeSessionProvider>;
}
