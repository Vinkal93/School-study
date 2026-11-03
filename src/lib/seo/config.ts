/**
 * Centralized SEO & Site Configuration for School Study
 *
 * Shared production identity for metadata, sitemaps and structured data.
 */

const getSiteUrl = (): string => {
  // Preview hosts must never become canonical, even when env vars are copied.
  try {
    const configured = new URL(process.env.NEXT_PUBLIC_SITE_URL || "");
    if (
      configured.protocol === "https:" &&
      !configured.username &&
      !configured.password &&
      configured.hostname !== "localhost" &&
      configured.hostname !== "127.0.0.1" &&
      configured.hostname !== "vercel.app" &&
      !configured.hostname.endsWith(".vercel.app")
    ) {
      return configured.origin;
    }
  } catch {
    /* Missing or malformed configuration uses the production domain. */
  }
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
  defaultTitle: "School Study | School Management Software for Schools",
  titleTemplate: "%s | School Study",
  defaultDescription:
    "Manage student records, teachers, attendance and school fees with School Study. Explore school ERP modules, compare plans and arrange a school software demo.",
  defaultOgImage: `${getSiteUrl()}/og-image.png`,
  supportEmail: "sbci224234@gmail.com",
  supportPhone: "+91 9118245636",
  googleSiteVerification: "zZHJ9sQqwYwYL1UpsI5ZZK3dUZlBoomo5LdBR7KVJd8",
  bingSiteVerification: "D5705E3C8B7BC3DF43A5F44DCEF8E80C",
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

    // 2. Core Product & High-Intent Global Search Queries (Exact Match for Google & Bing)
    "school management erp",
    "school management erp software",
    "School Management Software",
    "School Management System",
    "School ERP Software",
    "School ERP Platform",
    "online school erp",
    "erp school management",
    "Cloud School ERP",
    "Best School Management Software 2026",
    "best school erp in india",
    "AI powered school analytics erp",
    "cloud based school management erp",
    "affordable all in one school erp",
    "customisable secure school platform",
    "cbse school erp software",
    "school erp with mobile app",
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
    "entab alternative",
    "fedena alternative",
    "edunext alternative",
    "myclassboard alternative",
    "edisapp alternative",
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
