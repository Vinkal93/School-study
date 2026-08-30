/**
 * Centralized SEO & Site Configuration for School Study
 */

const getSiteUrl = (): string => {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  // Production canonical domain
  return "https://school.sbci.online";
};

export const siteConfig = {
  name: "School Study",
  brandName: "School Study",
  url: getSiteUrl(),
  defaultTitle: "School Study — Modern School Management Software",
  titleTemplate: "%s | School Study",
  defaultDescription:
    "School Study is a modern school management platform for schools to manage students, teachers, classes and attendance from one simple system.",
  defaultOgImage: `${getSiteUrl()}/icon.svg`,
  supportEmail: "sbci224234@gmail.com",
  supportPhone: "+91 9118245636",
  googleSiteVerification: "zZHJ9sQqwYwYL1UpsI5ZZK3dUZlBoomo5LdBR7KVJd8",
  themeColor: "#2563EB",
  locale: "en_US",
  keywords: [
    "School Study",
    "School Management Software",
    "School ERP Platform",
    "Student Attendance Management",
    "Teacher Portal",
    "Multi-Tenant School Management",
    "Education Technology",
    "Student Information System",
  ],
  links: {
    developer: "/about-developer",
    portals: "/login",
    studentPortal: "/student/login",
    adminPortal: "/admin/login",
    superAdminPortal: "/super-admin/login",
  },
  /**
   * Protected internal route segments (documented as private, excluded from public indexing)
   */
  privateRoutePrefixes: [
    "/admin",
    "/teacher",
    "/student",
    "/super-admin",
    "/api",
  ] as const,
};
