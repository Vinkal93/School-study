import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "School Study — Modern School Management Platform",
    short_name: "School Study",
    description: siteConfig.defaultDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: siteConfig.themeColor,
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
