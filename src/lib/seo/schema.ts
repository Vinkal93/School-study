import { siteConfig } from "./config";

/**
 * Valid JSON-LD Structured Data Schemas for School Study Homepage
 */
export function getHomepageJsonLd() {
  const organizationSchema = {
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

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "School Study",
    operatingSystem: "Web-based (All Modern Browsers)",
    applicationCategory: "EducationalApplication",
    applicationSubCategory: "School Management System",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
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

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return [organizationSchema, softwareAppSchema, websiteSchema];
}
