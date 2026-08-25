import type { ReactNode } from "react";

export default function AuthRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {children}
    </div>
  );
}
