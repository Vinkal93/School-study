import { publicPages } from "./pages";
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
    name: "School Study — School Management ERP Software",
    alternateName: ["School Study ERP", "School Study Cloud ERP"],
    operatingSystem:
      "Cloud SaaS, Web (Chrome, Edge, Safari, Firefox), Android App, iOS PWA, Windows, macOS",
    applicationCategory: ["BusinessApplication", "EducationalApplication"],
    applicationSubCategory: "School Management ERP & Student Information System",
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
      "Student records and admissions",
      "Teacher and classroom assignments",
      "Classroom attendance and reports",
      "Fee invoices, collections, receipts and ledgers",
      "School notices and role-based portals",
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
    itemListElement: (items[0]?.url === "/" ? items : [{ name: "Home", url: "/" }, ...items]).map(
      (item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url.startsWith("http") ? item.url : `${siteConfig.url}${item.url}`,
      }),
    ),
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

/** Related module pages; these are parts of one product, not separate apps. */
export function getSchoolErpCarouselSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: publicPages
      .filter(({ path }) =>
        [
          "/school-management",
          "/school-erp",
          "/student-management",
          "/teacher-management",
          "/attendance-management",
          "/fee-management",
        ].includes(path),
      )
      .map((page, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "WebPage",
          name: page.title,
          url: new URL(page.path, siteConfig.url).toString(),
        },
      })),
  };
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
    getSchoolErpCarouselSchema(),
  ];
}
