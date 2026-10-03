import { siteConfig } from "./config";

/**
 * Valid Person Schema for Creator & Founder (Vinkal Prajapati)
 * Enables Google Knowledge Graph entity linking for "Vinkal Prajapati", "Vinkal", and "School Study".
 */
export function getPersonSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${siteConfig.url}/about-developer#vinkal-prajapati`,
    name: siteConfig.developer.name,
    alternateName: siteConfig.developer.alternateNames,
    jobTitle: siteConfig.developer.role,
    worksFor: {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
    },
    url: `${siteConfig.url}/about-developer`,
    image: `${siteConfig.url}${siteConfig.developer.avatarUrl}`,
    email: `mailto:${siteConfig.developer.email}`,
    telephone: siteConfig.developer.phone,
    nationality: {
      "@type": "Country",
      name: "India",
    },
    sameAs: [
      siteConfig.developer.portfolioUrl,
      siteConfig.developer.githubUrl,
      "https://www.linkedin.com/in/vinkal041/",
      "https://vinkal041.hashnode.dev/",
      `${siteConfig.url}/about-developer`,
    ],
    description: siteConfig.developer.bio,
    knowsAbout: siteConfig.developer.skills,
  };
}

/**
 * Valid Organization Schema
 * Connects School Study to founder Vinkal Prajapati and social channels.
 */
export function getOrganizationSchema() {
  const person = getPersonSchema();

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    alternateName: ["School Study SaaS", "School Study ERP", "SchoolStudy"],
    url: siteConfig.url,
    logo: {
      "@type": "ImageObject",
      url: `${siteConfig.url}/icon.svg`,
      caption: `${siteConfig.name} Logo`,
    },
    founder: person,
    creator: person,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: siteConfig.supportPhone,
      email: siteConfig.supportEmail,
      contactType: "Customer Support & Technical Inquiries",
      areaServed: ["IN", "Global"],
      availableLanguage: ["English", "Hindi"],
    },
    sameAs: [
      siteConfig.developer.githubUrl,
      siteConfig.developer.projectRepoUrl,
      siteConfig.developer.portfolioUrl,
    ],
  };
}

/**
 * Valid WebSite Schema with publisher, creator and search potentialAction
 */
export function getWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.defaultDescription,
    publisher: {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
    },
    creator: {
      "@type": "Person",
      "@id": `${siteConfig.url}/about-developer#vinkal-prajapati`,
      name: siteConfig.developer.name,
    },
    inLanguage: "en-US",
  };
}

/**
 * Valid SoftwareApplication Schema
 * Highlights multi-tenancy, cross-platform availability, offers, and developer attribution.
 */
export function getSoftwareAppSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${siteConfig.url}/#software`,
    name: siteConfig.name,
    alternateName: ["School Study Cloud ERP", "School Study Management System"],
    operatingSystem: "Web-based (Chrome, Safari, Edge, Firefox), Android, iOS, Windows, macOS",
    applicationCategory: "EducationalApplication",
    applicationSubCategory: "School ERP & Student Management System",
    softwareVersion: siteConfig.version,
    description: siteConfig.defaultDescription,
    url: siteConfig.url,
    downloadUrl: `${siteConfig.url}/download`,
    screenshot: `${siteConfig.url}/og-image.png`,
    author: {
      "@type": "Person",
      "@id": `${siteConfig.url}/about-developer#vinkal-prajapati`,
      name: siteConfig.developer.name,
      url: siteConfig.developer.portfolioUrl,
    },
    creator: {
      "@type": "Person",
      "@id": `${siteConfig.url}/about-developer#vinkal-prajapati`,
      name: siteConfig.developer.name,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
    },
    featureList: [
      "Multi-Tenant Database & School Isolation",
      "Real-time Student Attendance Tracking & SMS Reports",
      "Teacher Workspace & Subject/Class Allocation",
      "Student & Parent Information Portal",
      "Automated Fee Ledger & Online Fee Collection",
      "Digital Notice Board & Instant Push Notifications",
      "Role-Based Access Control (Super Admin, School Admin, Teacher, Student)",
      "Cross-Platform Native Android App (APK) & Web PWA",
    ],
  };
}

/**
 * BreadcrumbList Schema Generator
 */
export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${siteConfig.url}${item.url}`,
    })),
  };
}

/**
 * ProfilePage Schema for /about-developer
 * Establishes Google Entity Authority for Vinkal Prajapati as creator of School Study
 */
export function getDeveloperProfilePageSchema() {
  const person = getPersonSchema();
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${siteConfig.url}/about-developer#webpage`,
    url: `${siteConfig.url}/about-developer`,
    name: `About ${siteConfig.developer.name} — Founder & Architect of ${siteConfig.name}`,
    description: `Official developer profile and creator portfolio of ${siteConfig.developer.name}, architect behind School Study.`,
    mainEntity: person,
    breadcrumb: getBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "About Developer", url: "/about-developer" },
    ]),
  };
}

/**
 * FAQPage Schema (Only for pages containing visible FAQs)
 */
export function getFaqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * High-Value Homepage FAQs with keywords targeting School Study and creator Vinkal Prajapati
 */
export function getHomepageFaqSchema() {
  return getFaqSchema([
    {
      question: "What is School Study?",
      answer:
        "School Study is a modern, cloud-based school management platform and ERP software designed for primary, secondary, and higher educational institutions to manage students, teachers, classes, attendance, exams, fees, and announcements from one unified system.",
    },
    {
      question: "Who developed and created School Study?",
      answer:
        "School Study was founded, architected, and developed by Vinkal Prajapati (Er. Vinkal Prajapati), a full-stack software engineer and EdTech creator dedicated to building high-performance, accessible software for schools and educational institutions.",
    },
    {
      question: "Is School Study free to use for schools?",
      answer:
        "Yes, School Study offers a Free Starter Tier that allows schools to set up rosters, student directories, teacher assignments, and daily attendance tracking at zero cost.",
    },
    {
      question: "How does School Study protect school and student data?",
      answer:
        "School Study implements rigorous multi-tenant data isolation, strict Firebase Security Rules, end-to-end encryption in transit (TLS 1.3), granular Role-Based Access Control (RBAC), and automated backups to ensure complete student data privacy.",
    },
    {
      question: "Can School Study be used on mobile devices?",
      answer:
        "Yes, School Study is fully responsive across smartphones, tablets, and desktops. In addition, an Android APK and PWA can be downloaded directly from the platform.",
    },
  ]);
}

/**
 * Homepage JSON-LD (Comprehensive entity bundle for search engines and AI engines)
 */
export function getHomepageJsonLd() {
  return [
    getOrganizationSchema(),
    getWebsiteSchema(),
    getSoftwareAppSchema(),
    getPersonSchema(),
  ];
}
