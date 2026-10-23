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
    alternateName: [
      "School Study",
      "School Management ERP",
      "School Management ERP Software",
      "School ERP Software",
      "School ERP Platform",
      "Online School ERP",
      "Best School ERP in India",
      "Cloud School ERP",
      "School Study Cloud ERP",
      "School Study Management System"
    ],
    operatingSystem: "Cloud SaaS, Web (Chrome, Edge, Safari, Firefox), Android App, iOS PWA, Windows, macOS",
    applicationCategory: ["BusinessApplication", "EducationalApplication"],
    applicationSubCategory: "School Management ERP & Student Information System",
    softwareVersion: siteConfig.version,
    description: "School Study is India's leading AI-powered School Management ERP Software architected by Vinkal Prajapati. Automate student admissions, online fee collection with Razorpay, real-time attendance with face & RFID recognition, CBSE report cards, and parent apps on one secure cloud platform.",
    url: siteConfig.url,
    downloadUrl: `${siteConfig.url}/download`,
    screenshot: `${siteConfig.url}/og-image.png`,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "1280",
      bestRating: "5",
      worstRating: "1",
    },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "4999",
      priceCurrency: "INR",
      offerCount: "4",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock"
    },
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
      "AI-Powered School Analytics & Predictive Performance",
      "School Management ERP with Multi-Tenant Data Isolation",
      "Automated Fee Ledger, Online Fee Collection & Razorpay Gateway",
      "Real-Time Student Attendance with RFID & Facial Recognition",
      "CBSE, ICSE & State Board Compliant Digital Report Cards",
      "Parent, Teacher & Student Mobile Apps (Android APK & PWA)",
      "Digital Admission Enquiry CRM & Student Enrollment",
      "Automated Timetable Scheduling & Exam Seating Plans",
      "Automated WhatsApp Circulars & SMS Parent Alerts",
      "Expense Accounting, Cashbook & Voucher Reconciliation",
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
      question: "What is School Study School Management ERP?",
      answer:
        "School Study is India's leading AI-powered School Management ERP software designed for K-12, CBSE, ICSE, and international institutions. It automates admissions, fee collection, real-time attendance, digital marksheets, faculty payroll, and parent communication from one unified cloud dashboard.",
    },
    {
      question: "Who developed and created School Study?",
      answer:
        "School Study was founded, architected, and developed by Vinkal Prajapati (Er. Vinkal Prajapati), a full-stack software engineer and EdTech creator dedicated to building high-performance, accessible software for schools and educational institutions.",
    },
    {
      question: "How does School Study compare to legacy ERPs like Fedena, Entab, and Edunext?",
      answer:
        "Unlike complex legacy systems, School Study delivers an ultra-fast, zero-bloat modern interface, built-in mobile apps for parents and teachers, real-time multi-tenant database isolation, transparent pricing with a free starter tier, and instantaneous cloud setup without requiring on-premise servers.",
    },
    {
      question: "Does School Study ERP support online fee collection and instant receipts?",
      answer:
        "Yes, School Study includes automated fee ledger creation, installment notifications, online payments via Razorpay and UPI QR codes, instant GST/Fee receipts, and automated cashbook reconciliation.",
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
  ]);
}

/**
 * Carousel Schema (ItemList) for Google and Bing Search Carousels
 */
export function getSchoolErpCarouselSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        item: {
          "@type": "SoftwareApplication",
          name: "School Study ERP",
          description: "AI-Powered School Analytics, Online Fees & Cloud ERP",
          image: `${siteConfig.url}/icon.svg`,
          url: `${siteConfig.url}/school-erp`,
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web, Android, Cloud",
        },
      },
      {
        "@type": "ListItem",
        position: 2,
        item: {
          "@type": "SoftwareApplication",
          name: "Student Information System (SIS)",
          description: "Secure Student Profiles, Document Vault & Academic History",
          image: `${siteConfig.url}/icon.svg`,
          url: `${siteConfig.url}/student-management`,
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web, Android, Cloud",
        },
      },
      {
        "@type": "ListItem",
        position: 3,
        item: {
          "@type": "SoftwareApplication",
          name: "Automated Fee & Billing Engine",
          description: "Online Fee Collection, Razorpay Gateway & Instant Receipts",
          image: `${siteConfig.url}/icon.svg`,
          url: `${siteConfig.url}/fee-management`,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, Android, Cloud",
        },
      },
      {
        "@type": "ListItem",
        position: 4,
        item: {
          "@type": "SoftwareApplication",
          name: "Real-Time Biometric & Attendance Suite",
          description: "Facial Recognition, RFID Campus Gates & Automated SMS Alerts",
          image: `${siteConfig.url}/icon.svg`,
          url: `${siteConfig.url}/attendance-management`,
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web, Android, Cloud",
        },
      },
    ],
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
    getHomepageFaqSchema(),
    getSchoolErpCarouselSchema(),
  ];
}
