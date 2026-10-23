import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/config";

/**
 * Dynamic Robots.txt generator for School Study
 * 
 * - Full permissions for search engines (Googlebot, Bingbot, Applebot) and AI bots (GPTBot, ClaudeBot, PerplexityBot)
 *   to crawl public marketing pages, documentation, and llms.txt.
 * - Strict disallow directives on internal admin/student/teacher dashboards, APIs, and billing panels.
 */
export default function robots(): MetadataRoute.Robots {
  const privateDisallows = [
    "/admin",
    "/admin/*",
    "/teacher",
    "/teacher/*",
    "/student",
    "/student/*",
    "/super-admin",
    "/super-admin/*",
    "/billing",
    "/billing/*",
    "/api",
    "/api/*",
    "/setup-super-admin",
    "/setup-super-admin/*",
    "/su",
    "/su/*",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about-developer",
          "/features",
          "/pricing",
          "/school-management",
          "/school-erp",
          "/student-management",
          "/teacher-management",
          "/attendance-management",
          "/fee-management",
          "/download",
          "/contact",
          "/llms.txt",
          "/llms-full.txt",
          "/sitemap.xml",
          "/icon.svg",
          "/favicon.ico",
          "/og-image.png",
          "/images/*",
        ],
        disallow: privateDisallows,
      },
      // Google Search Bot
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: privateDisallows,
      },
      // Microsoft Bing Bot
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: privateDisallows,
      },
      // Apple Bot
      {
        userAgent: "Applebot",
        allow: "/",
        disallow: privateDisallows,
      },
      // OpenAI / ChatGPT Crawlers
      {
        userAgent: "GPTBot",
        allow: ["/", "/about-developer", "/features", "/pricing", "/school-management", "/school-erp", "/llms.txt", "/llms-full.txt"],
        disallow: privateDisallows,
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/about-developer", "/features", "/pricing", "/school-management", "/school-erp", "/llms.txt", "/llms-full.txt"],
        disallow: privateDisallows,
      },
      // Anthropic / Claude Crawler
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/about-developer", "/features", "/pricing", "/school-management", "/school-erp", "/llms.txt", "/llms-full.txt"],
        disallow: privateDisallows,
      },
      // Perplexity AI Crawler
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/about-developer", "/features", "/pricing", "/school-management", "/school-erp", "/llms.txt", "/llms-full.txt"],
        disallow: privateDisallows,
      },
      // Google Gemini / Extended AI Crawler
      {
        userAgent: "Google-Extended",
        allow: ["/", "/about-developer", "/features", "/pricing", "/school-management", "/school-erp", "/llms.txt", "/llms-full.txt"],
        disallow: privateDisallows,
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
