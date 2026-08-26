import { siteConfig } from "./config";

/**
 * Valid Organization Schema
 */
export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/icon.svg`,
    founder: {
      "@type": "Person",
      name: "Vinkal Prajapati",
      url: `${siteConfig.url}/about-developer`,
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: siteConfig.supportPhone,
      email: siteConfig.supportEmail,
      contactType: "Customer Support",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
  };
}

/**
 * Valid WebSite Schema (without fake search action)
 */
export function getWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
  };
}

/**
 * Valid SoftwareApplication Schema (Accurate visible MVP properties only)
 */
export function getSoftwareAppSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "School Study",
    operatingSystem: "Web-based (All Modern Browsers)",
    applicationCategory: "EducationalApplication",
    applicationSubCategory: "School Management System",
    description: siteConfig.defaultDescription,
    url: siteConfig.url,
    author: {
      "@type": "Person",
      name: "Vinkal Prajapati",
      url: `${siteConfig.url}/about-developer`,
    },
    featureList: [
      "Student Management & Directory",
      "Teacher & Faculty Assignment",
      "Real-time Attendance Tracking",
      "Notice Board & Announcements",
      "Multi-tenant School Admin Control",
      "Secure Role-Based Access Control",
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
 * Person Schema for Vinkal Prajapati
 */
export function getPersonSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Vinkal Prajapati",
    jobTitle: ["Developer", "Educator", "Technology Creator"],
    url: `${siteConfig.url}/about-developer`,
    sameAs: ["https://www.google.com/search?q=Vinkal+Prajapati"],
    description:
      "Developer, educator, and technology creator behind School Study, building practical digital products for education and everyday users.",
    knowsAbout: [
      "Education Technology",
      "Software Development",
      "Multi-Tenant School Software",
      "Web Applications",
    ],
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
 * Homepage JSON-LD
 */
export function getHomepageJsonLd() {
  return [getOrganizationSchema(), getWebsiteSchema(), getSoftwareAppSchema()];
}
