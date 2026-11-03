/** Public canonical pages: one search intent per page, shared with the sitemap. */
export const publicPages = [
  {
    path: "/",
    label: "School Study",
    title: "School Study | School Management Software for Schools",
    description:
      "Manage student records, teachers, attendance and school fees with School Study. Explore school ERP modules, compare plans and arrange a school software demo.",
  },
  {
    path: "/school-management",
    label: "School management",
    title: "School Management Software for Daily Administration",
    description:
      "Bring student records, teacher assignments, attendance and notices together. Explore how School Study supports daily school administration and onboarding.",
  },
  {
    path: "/school-erp",
    label: "Cloud school ERP",
    title: "Cloud School ERP Software for Connected School Operations",
    description:
      "Connect admissions, student records, attendance and fee workflows in one school ERP. Review School Study modules, access controls and implementation needs.",
  },
  {
    path: "/student-management",
    label: "Student management",
    title: "Student Management Software & Student Information System",
    description:
      "Organize student profiles, admission numbers, classes and sections with School Study. Connect student records with attendance, fees and student portal access.",
  },
  {
    path: "/teacher-management",
    label: "Teacher management",
    title: "Teacher Management Software for School Staff & Classes",
    description:
      "Manage teacher profiles, classroom assignments and subject allocations. See how School Study connects school staff records with teacher portal workflows.",
  },
  {
    path: "/attendance-management",
    label: "Attendance management",
    title: "School Attendance Management Software for Students",
    description:
      "Record classroom attendance, review monthly reports and track student attendance percentages. Explore School Study attendance workflows for school staff.",
  },
  {
    path: "/fee-management",
    label: "Fee management",
    title: "School Fee Management Software for Collections & Receipts",
    description:
      "Connect fee structures, student invoices, dues, collections and receipts. Explore School Study fee ledgers, concessions, refunds and reconciliation workflows.",
  },
  {
    path: "/features",
    label: "Features",
    title: "School ERP Features: Students, Attendance, Fees & Staff",
    description:
      "Explore School Study school ERP features for student records, teacher assignments, attendance, fees and notices. Find the modules your school needs.",
  },
  {
    path: "/pricing",
    label: "Pricing",
    title: "School Management Software Pricing & ERP Plans",
    description:
      "Compare School Study school ERP plans, current pricing, student and teacher limits, and included features. Choose a plan that fits your school's needs.",
  },
  {
    path: "/brochure",
    label: "Product brochure",
    title: "School Management Software Brochure & Module Overview",
    description:
      "Explore the School Study digital brochure for school ERP modules, role-based portals and onboarding. Share the product overview with your school team.",
  },
  {
    path: "/download",
    label: "Download & install",
    title: "Download School Study: Android APK & Web App",
    description:
      "Find School Study Android download and web app installation options. Access school, teacher and student portals from supported mobile and desktop browsers.",
  },
  {
    path: "/contact",
    label: "Contact & demo",
    title: "School Software Demo, Contact & Support",
    description:
      "Contact School Study to discuss a school management software demo, registration or support. Share your school's student, attendance and fee workflow needs.",
  },
  {
    path: "/about-developer",
    label: "About the founder",
    title: "Vinkal Prajapati | School Study Founder & Web Developer",
    description:
      "Meet Vinkal Prajapati, founder and web developer of School Study. Learn about his software projects, education work and approach to school management tools.",
  },
  {
    path: "/cookies",
    label: "Cookie & privacy policy",
    title: "Cookie & Privacy Policy and Storage Preferences",
    description:
      "Learn how School Study uses cookies and browser storage for authentication, performance and preferences. Review and manage your cookie choices.",
  },
] as const;

export type PublicPagePath = (typeof publicPages)[number]["path"];

export function getPublicPage(path: PublicPagePath) {
  return publicPages.find((page) => page.path === path)!;
}
