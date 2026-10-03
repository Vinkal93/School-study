/**
 * Centralized SEO & Site Configuration for School Study
 * 
 * Configured for 100% On-Page, Off-Page, Technical SEO, and AI Engine Optimization (AEO/GEO).
 * Targets global top rankings for School Management/ERP keywords and founder entity ("Vinkal Prajapati").
 */

const getSiteUrl = (): string => {
  // Always prioritize canonical production domain for search indexing and structured data
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  // Production canonical domain
  return "https://school.sbci.online";
};

export const developerConfig = {
  name: "Vinkal Prajapati",
  alternateNames: ["Vinkal", "Vinkal93", "Vinkal041"],
  role: "Founder & Web Developer",
  bio: "Vinkal Prajapati is an Indian web developer, educator and digital creator, and the founder and developer of School Study. He builds practical software tools and educational platforms.",
  portfolioUrl: "https://vinkal.sbci.online",
  githubUrl: "https://github.com/Vinkal93",
  projectRepoUrl: "https://github.com/Vinkal93/School-study",
  profilePageUrl: "/about-developer",
  avatarUrl: "/images/developer.jpg",
  email: "sbci224234@gmail.com",
  phone: "+91 9118245636",
  location: "India",
  skills: [
    "School Management Architecture",
    "Multi-Tenant Database Isolation",
    "Next.js Full-Stack Engineering",
    "Cloud & Firebase Infrastructure",
    "EdTech Software Engineering",
    "TypeScript & React 19",
    "Role-Based Access Control (RBAC)",
    "Payment Gateway Integration",
  ],
};

export const siteConfig = {
  name: "School Study",
  brandName: "School Study",
  legalName: "School Study EdTech",
  version: "2.0.0",
  url: getSiteUrl(),
  defaultTitle: "School Study — Modern School Management Software & Cloud ERP",
  titleTemplate: "%s | School Study",
  defaultDescription:
    "School Study is a modern, all-in-one cloud school management software & ERP created by Vinkal Prajapati. Automate student records, real-time attendance, teacher allocations, fee collections, and parent communication from one secure platform.",
  defaultOgImage: `${getSiteUrl()}/og-image.png`,
  supportEmail: "sbci224234@gmail.com",
  supportPhone: "+91 9118245636",
  googleSiteVerification: "zZHJ9sQqwYwYL1UpsI5ZZK3dUZlBoomo5LdBR7KVJd8",
  themeColor: "#2563EB",
  locale: "en_US",
  
  // Developer & Entity Information
  developer: developerConfig,

  // Global & Creator Targeted Keywords
  keywords: [
    // 1. Personal Brand & Creator Keywords (for ranking by your name globally)
    "Vinkal Prajapati",
    "Vinkal",
    "Vinkal93",
    "Vinkal developer",
    "Vinkal School Study",
    "Vinkal Prajapati developer",
    "Vinkal Prajapati software engineer",
    "Vinkal Prajapati portfolio",
    "School Study by Vinkal",
    "School Study founder Vinkal",
    "Er Vinkal Prajapati",
    "Vinkal EdTech",

    // 2. Core Product & High-Intent Global Search Queries
    "School Study",
    "School Study SaaS",
    "School Management Software",
    "School Management System",
    "School ERP Software",
    "School ERP Platform",
    "Cloud School ERP",
    "Best School Management Software 2026",
    "Student Information System",
    "SIS Software",
    "Student Attendance Management System",
    "Automated Attendance System",
    "Teacher Management System",
    "Faculty Assignment Portal",
    "Parent Student Portal",
    "School Fee Management Software",
    "School Administration Software",
    "Multi-Tenant School Management Platform",
    "Education Technology Platform",
    "EdTech Software",
    "Next.js School ERP",
    "Digital School Management System",
    "School Gradebook & Report Cards",
    "Online School Software",
  ],

  links: {
    developer: "/about-developer",
    portals: "/login",
    studentPortal: "/student/login",
    adminPortal: "/admin/login",
    superAdminPortal: "/super-admin/login",
    github: "https://github.com/Vinkal93/School-study",
    developerPortfolio: "https://vinkal.sbci.online",
    llmsTxt: `${getSiteUrl()}/llms.txt`,
    llmsFullTxt: `${getSiteUrl()}/llms-full.txt`,
  },

  /**
   * Protected internal route segments (documented as private, excluded from public indexing)
   */
  privateRoutePrefixes: [
    "/admin",
    "/teacher",
    "/student",
    "/super-admin",
    "/billing",
    "/api",
  ] as const,
};
