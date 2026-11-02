/**
 * Comprehensive Digital Brochure Data & Content Models for School Study
 * Official Product Brochure (12 Structured Sections)
 * Single Source of Truth for both Web UI and PDF Generation
 */

export interface BrochureContactInfo {
  phone: string;
  phoneDisplay: string;
  email: string;
  whatsappNumber: string;
  whatsappUrl: string;
  websiteUrl: string;
  brochureUrl: string;
  address: string;
  locationLabel: string;
  workingHours: string;
}

export const BROCHURE_CONTACT: BrochureContactInfo = {
  phone: "+919118245636",
  phoneDisplay: "+91 91182 45636",
  email: "sbci224234@gmail.com",
  whatsappNumber: "919118245636",
  whatsappUrl:
    "https://wa.me/919118245636?text=Hello%20School%20Study%20Team%2C%20I%20reviewed%20your%20Official%20Product%20Brochure%20and%20would%20like%20to%20request%20a%20live%20demo%20and%20pricing%20quote%20for%20our%20institution.",
  websiteUrl: "https://school.sbci.online",
  brochureUrl: "https://school.sbci.online/brochure",
  address: "School Study Platform, SBCI Online, Uttar Pradesh, India",
  locationLabel: "Uttar Pradesh, India (Serving Schools Pan-India)",
  workingHours: "Monday – Saturday: 9:00 AM – 7:00 PM IST",
};

export const BROCHURE_COLORS = {
  navy: "#102A43",
  navyDark: "#0B1D30",
  blue: "#2563EB",
  blueLight: "#3B82F6",
  blueDark: "#1D4ED8",
  teal: "#0D9488",
  tealLight: "#14B8A6",
  amber: "#D97706",
  slateBg: "#F8FAFC",
  slateText: "#0F172A",
  slateMuted: "#64748B",
  slateBorder: "#E2E8F0",
  white: "#FFFFFF",
};

export interface ProblemSolutionItem {
  id: string;
  traditionalPain: string;
  traditionalDetail: string;
  schoolStudySolution: string;
  schoolStudyDetail: string;
  impactMetric: string;
}

export interface PlatformStat {
  label: string;
  value: string;
  subtext: string;
}

export interface FeatureCard {
  title: string;
  description: string;
  benefits: string[];
  tag?: string;
}

export interface BrochureSectionData {
  id: string;
  sectionNumber: number;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
  highlights?: string[];
  features?: FeatureCard[];
}

export const BROCHURE_SECTIONS: Record<string, BrochureSectionData> = {
  hero: {
    id: "section-1-hero",
    sectionNumber: 1,
    title: "School Study — Smart School Management Software",
    subtitle: "The All-in-One Cloud ERP Platform for Modern Educational Institutions",
    description:
      "Transform institutional administration, automate fee collection, streamline classroom roll-call, and unite administrators, educators, students, and parents into one cohesive digital ecosystem.",
    badge: "Official Product Brochure 2026",
    highlights: [
      "100% Cloud-Native & Multi-Tenant Isolated",
      "Instant 24-Hour Paperless Setup",
      "Zero Heavy Server Hardware Needed",
      "Dedicated Role Portals for Admin, Teachers & Students",
    ],
  },

  problemSolution: {
    id: "section-2-problem-solution",
    sectionNumber: 2,
    title: "The Problem & The Modern Solution",
    subtitle: "Bridging the Gap Between Operational Chaos and Digital Excellence",
    description:
      "Traditional schools struggle daily with fragile paper registers, scattered spreadsheets, uncollected fees, and disconnected parents. School Study replaces archaic workflows with automated, real-time cloud management.",
  },

  platformArchitecture: {
    id: "section-3-architecture",
    sectionNumber: 3,
    title: "Platform Architecture & Enterprise Security",
    subtitle: "Engineered on Modern Cloud Standards with Strict Multi-Tenant Isolation",
    description:
      "Built with high-performance Next.js 16 App Router and Firebase multi-tenant security rules. Every institution's records are securely partitioned, encrypted in transit and at rest, and accessible anytime across all devices.",
    highlights: [
      "Zero-Data Leakage Multi-Tenant Partitioning",
      "Granular Firestore Security Rules & Audit Trails",
      "PWA & Cross-Device Responsive Layouts (Mobile, Tablet, Desktop)",
      "256-Bit SSL/TLS Cloud Encryption & Automated Backups",
    ],
  },

  studentAdmissions: {
    id: "section-4-students",
    sectionNumber: 4,
    title: "Student Lifecycle & Admission Management",
    subtitle: "Centralized Student Records from Admission Inquiry to Graduation",
    description:
      "Eliminate fragmented filing cabinets. Maintain complete student portfolios with guardian contacts, academic history, roll numbers, blood groups, and status tracking in one unified directory.",
    features: [
      {
        title: "Digital Enrollment & Profiles",
        description:
          "Capture detailed student information including enrollment number, DOB, gender, guardian details, address, and medical notes.",
        benefits: ["Unique institutional roll numbers", "Instant search by name or admission ID", "Full document history"],
      },
      {
        title: "Class & Section Assignments",
        description:
          "Organize students cleanly into classes, sections, and academic sessions with automated capacity limits and roster generation.",
        benefits: ["Seamless yearly promotions", "Instant section transfers", "Dynamic class capacity tracking"],
      },
      {
        title: "Bulk Roster Management",
        description:
          "Quickly import existing student cohorts or export complete class directories into spreadsheets with single clicks.",
        benefits: ["CSV/Excel bulk onboarding", "Safe record validation", "One-click cohort exports"],
      },
    ],
  },

  smartFees: {
    id: "section-5-fees",
    sectionNumber: 5,
    title: "Smart Fee Management & Billing Automation",
    subtitle: "Transparent Collection, Automatic Dues Tracking & Instant Receipts",
    description:
      "Take complete control of institutional cash flow. Configure customized fee structures by class, record offline and online collections, generate printable GST/standard receipts, and track pending dues with zero leakage.",
    features: [
      {
        title: "Customizable Fee Structures",
        description:
          "Create flexible fee heads including Tuition, Admission, Laboratory, Library, Transport, and Annual Development charges.",
        benefits: ["Class-wise fee structures", "Term & monthly installment options", "Concession & discount tagging"],
      },
      {
        title: "Instant Digital Receipts",
        description:
          "Generate professional, verifiable fee receipts with invoice numbers, student details, payment modes, and clear breakdown.",
        benefits: ["Single-click printable receipts", "WhatsApp & email receipt sharing", "Tamper-evident numbering"],
      },
      {
        title: "Dues & Defaulter Tracking",
        description:
          "Identify pending balances across classes instantly with real-time aging reports and proactive reminder triggers.",
        benefits: ["Defaulters list with contact numbers", "Payment reminder notifications", "Zero unrecorded cash leaks"],
      },
    ],
  },

  attendance: {
    id: "section-6-attendance",
    sectionNumber: 6,
    title: "Smart Attendance & Roll-Call Automation",
    subtitle: "Rapid Classroom Attendance Marking with Real-Time Percentage Analytics",
    description:
      "Enable teachers to record entire classroom attendance in under 30 seconds from any mobile device or desktop. Automatically calculate cumulative percentages, identify chronic absenteeism, and generate monthly registers.",
    features: [
      {
        title: "Rapid 1-Tap Class Roll-Call",
        description:
          "Teachers select their class, section, and date, then mark Present, Absent, Late, or Excused with intuitive color-coded buttons.",
        benefits: ["Mark entire class in < 30 seconds", "Mark All Present shortcut", "Edit access for authorized faculty"],
      },
      {
        title: "Automated Monthly Registers",
        description:
          "System compiles daily roll-calls into official monthly attendance registers ready for administrative compliance and audits.",
        benefits: ["Exportable monthly sheets", "Working-day normalization", "Complete historical archive"],
      },
      {
        title: "Low Attendance Warning Alerts",
        description:
          "Automated threshold monitoring highlights students dropping below required percentage criteria (e.g. 75%).",
        benefits: ["Early intervention alerts", "Instant parent notification trigger", "Student portal transparency"],
      },
    ],
  },

  academics: {
    id: "section-7-academics",
    sectionNumber: 7,
    title: "Academics, Class Scheduling & Examinations",
    subtitle: "Master Timetables, Subject Mappings & Performance Tracking",
    description:
      "Structure your institutional curriculum with precision. Configure subjects, assign specialized teachers, establish clash-free period timetables, post homework assignments, and capture examination grades.",
    features: [
      {
        title: "Subjects & Faculty Mapping",
        description:
          "Define core and elective subjects across all standards and map certified subject teachers to respective classes.",
        benefits: ["Class-teacher designations", "Workload balance checks", "Subject curriculum tracking"],
      },
      {
        title: "Weekly Period Timetable",
        description:
          "Build intuitive daily bell schedules with start and end times, assigned rooms, subjects, and teacher allocations.",
        benefits: ["Conflict-free period slots", "Printable classroom timetable", "Teacher daily agenda view"],
      },
      {
        title: "Exams, Marks & Homework",
        description:
          "Schedule unit tests, mid-terms, and final examinations. Record subject marks, calculate totals, and publish assignments.",
        benefits: ["Standardized grading scales", "Digital homework submissions", "Performance progression curves"],
      },
    ],
  },

  communication: {
    id: "section-8-communication",
    sectionNumber: 8,
    title: "Communication & Institutional Notice Board",
    subtitle: "Keep Faculty, Students, and Parents Informed in Real Time",
    description:
      "Eliminate misplaced paper flyers and missed updates. Publish targeted circulars, urgent administrative alerts, holiday notifications, and event announcements directly to user portals and mobile devices.",
    features: [
      {
        title: "Digital Campus Notice Board",
        description:
          "Publish rich notices with priority badges (Urgent, Event, Holiday, Academic) and date schedules.",
        benefits: ["Target all or specific roles", "Live active/expired statuses", "Attachment and link support"],
      },
      {
        title: "Student & Parent Feed",
        description:
          "Students and parents access an uncluttered circulars feed immediately upon logging into their dashboard.",
        benefits: ["No missed examination dates", "Fee deadline reminders", "Event circular distribution"],
      },
      {
        title: "Gateway Messaging Readiness",
        description:
          "Architected for institutional SMS & WhatsApp Business API integration for critical automated announcements.",
        benefits: ["Emergency weather closures", "Absence notifications", "School-branded sender ID"],
      },
    ],
  },

  reportsAnalytics: {
    id: "section-9-reports",
    sectionNumber: 9,
    title: "Executive Reports, Dashboards & Analytics",
    subtitle: "Data-Driven Institutional Decision Making at a Single Glance",
    description:
      "Give school founders, trustees, and principals complete visibility over school health. Track live enrollment counts, daily attendance ratios, fee collections vs targets, and faculty allocations without asking staff for spreadsheets.",
    features: [
      {
        title: "Executive Overview Dashboard",
        description:
          "Real-time KPI cards displaying Total Students, Faculty Members, Classes Active, and Monthly Collections.",
        benefits: ["Live telemetry counters", "Daily collection breakdown", "Instant health check"],
      },
      {
        title: "Financial Collection Analytics",
        description:
          "Track gross collections, outstanding dues per class, payment method distributions, and monthly trends.",
        benefits: ["Revenue projections", "Class-wise debt breakdown", "Audit-ready financial logs"],
      },
      {
        title: "Compliance & Record Exports",
        description:
          "Download comprehensive data tables in CSV, Excel, or printable PDF formats for regulatory submissions.",
        benefits: ["1-click board reports", "Historical cohort comparisons", "Immutable audit history"],
      },
    ],
  },

  rolesSecurity: {
    id: "section-10-roles",
    sectionNumber: 10,
    title: "Multi-Role Portals & Enterprise Security",
    subtitle: "Tailored Workspaces with Strict Least-Privilege Access Controls",
    description:
      "Every stakeholder has a purpose-built workspace designed for their daily tasks. Teachers see their classes, students view their progress, and administrators retain complete institutional control without accidental cross-access.",
    features: [
      {
        title: "Super Admin Gateway",
        description:
          "Platform governance portal for SaaS licensing, tenant provisioning, system audit logs, and global site settings.",
        benefits: ["Multi-school management", "Billing & plan control", "System configuration"],
      },
      {
        title: "School Admin (Principal/Director)",
        description:
          "Central operational cockpit for student admissions, faculty roster, fee structures, timetables, and institution settings.",
        benefits: ["Comprehensive staff control", "Financial authority", "Institutional circular publishing"],
      },
      {
        title: "Teacher Workspace",
        description:
          "Clean, mobile-first workspace for daily classroom roll-call, subject syllabus, homework assignments, and marks entry.",
        benefits: ["Zero administrative clutter", "Rapid roll-call in seconds", "Assigned class view only"],
      },
      {
        title: "Student & Parent Portal",
        description:
          "Secure portal for students and parents to check attendance percentages, view fee receipts, and read school circulars.",
        benefits: ["Self-service fee receipts", "Attendance transparency", "24/7 academic updates"],
      },
    ],
  },

  whySchoolStudy: {
    id: "section-11-why-us",
    sectionNumber: 11,
    title: "Why School Study? The Competitive Advantage",
    subtitle: "Superior Value, Lightning-Fast Onboarding & Dedicated Support",
    description:
      "Unlike legacy desktop software that requires expensive local servers, complex VPNs, and costly IT staff, School Study runs effortlessly in the modern web browser on any phone, tablet, or PC with zero installation overhead.",
    highlights: [
      "Zero Server Hardware or Maintenance Overhead",
      "Intuitive UI Designed for Non-Technical Staff",
      "Predictable, Affordable Tiered Pricing with Free Trial",
      "Direct Personal Support via Dedicated WhatsApp & Phone",
      "99.9% Uptime Cloud Infrastructure Powered by Firebase & Vercel",
      "Regular Feature Updates Included Without Additional License Fees",
    ],
  },

  finalCta: {
    id: "section-12-cta",
    sectionNumber: 12,
    title: "Ready to Modernize Your Institution?",
    subtitle: "Experience School Study with a Personalized 1-on-1 Guided Demo",
    description:
      "Join forward-thinking schools that have eliminated paperwork and automated their administration. Get in touch with our team today or start your 14-day free school trial instantly.",
  },
};

export const PROBLEM_SOLUTION_DATA: ProblemSolutionItem[] = [
  {
    id: "ps-attendance",
    traditionalPain: "Paper Attendance Registers",
    traditionalDetail:
      "Physical registers easily get damaged, lost, or forged. Calculating monthly attendance percentage takes days of tedious manual tallying.",
    schoolStudySolution: "1-Click Digital Roll-Call",
    schoolStudyDetail:
      "Teachers mark daily attendance from their smartphone or PC in under 30 seconds. Monthly percentages and defaulter registers calculate automatically.",
    impactMetric: "90% time saved daily",
  },
  {
    id: "ps-fees",
    traditionalPain: "Manual Paper Receipts & Cash Leakage",
    traditionalDetail:
      "Handwritten paper receipts, unrecorded cash transactions, misplaced counterfoils, and endless disputes with parents regarding outstanding dues.",
    schoolStudySolution: "Automated Fee Billing & Digital Receipts",
    schoolStudyDetail:
      "Instant printable & shareable receipts with unique serial numbers, class-wise dues breakdown, and live defaulter tracking dashboards.",
    impactMetric: "Zero fee leakage & disputes",
  },
  {
    id: "ps-data",
    traditionalPain: "Scattered Excel Files & Filing Cabinets",
    traditionalDetail:
      "Student records stored across random computers, incompatible Excel sheets, and dusty physical files that take hours to find.",
    schoolStudySolution: "Unified Cloud Student Portfolios",
    schoolStudyDetail:
      "One secure, searchable database containing guardian contacts, admission history, class assignments, and financial records accessible 24/7.",
    impactMetric: "100% centralized records",
  },
  {
    id: "ps-communication",
    traditionalPain: "Lost Printed Circulars & Miscommunication",
    traditionalDetail:
      "Paper flyers tucked into student bags often never reach parents, leading to missed fee deadlines, exam dates, and event confusion.",
    schoolStudySolution: "Instant Digital Circulars & Portal Feeds",
    schoolStudyDetail:
      "Immediate notice publishing to role-based student and parent portals, keeping every family informed about exams, fees, and closures.",
    impactMetric: "Instant delivery to every family",
  },
  {
    id: "ps-reporting",
    traditionalPain: "Blind Decision-Making & Delayed Reports",
    traditionalDetail:
      "Principals and trustees wait until month-end for administrative staff to compile student numbers, fee collections, and faculty attendance.",
    schoolStudySolution: "Live Executive Health Dashboards",
    schoolStudyDetail:
      "Real-time visual telemetry on collections, active student enrollments, daily attendance rates, and operational bottlenecks at a glance.",
    impactMetric: "Real-time decision intelligence",
  },
  {
    id: "ps-security",
    traditionalPain: "Vulnerable Local PCs & Data Loss",
    traditionalDetail:
      "Hard drive crashes, virus attacks, and unencrypted local databases frequently wipe out years of institutional records with no backups.",
    schoolStudySolution: "Enterprise Cloud Multi-Tenant Security",
    schoolStudyDetail:
      "Bank-grade SSL encryption, automated redundant cloud backups, strict tenant data isolation, and role-based access security rules.",
    impactMetric: "99.9% uptime & zero data loss",
  },
];

export const BROCHURE_KEY_STATS: PlatformStat[] = [
  {
    value: "100%",
    label: "Cloud-Based",
    subtext: "Access anywhere, zero local server costs",
  },
  {
    value: "< 30s",
    label: "Daily Roll-Call",
    subtext: "Fastest attendance marking in the industry",
  },
  {
    value: "0%",
    label: "Fee Leakage",
    subtext: "Total transparency on collections and dues",
  },
  {
    value: "24h",
    label: "Go-Live Time",
    subtext: "Fast onboarding with bulk roster import",
  },
];

export const BROCHURE_PRICING_SUMMARY = [
  {
    plan: "Starter",
    badge: "Emerging Schools",
    students: "Up to 300 Students",
    features: [
      "Student Admissions & Profiles",
      "Daily Attendance Roll-Call",
      "Teacher Workspace & Assignments",
      "Class & Section Timetables",
      "Standard Notice Board",
      "Email & WhatsApp Support",
    ],
  },
  {
    plan: "Professional",
    badge: "Most Popular",
    students: "Up to 1,000 Students",
    features: [
      "Everything in Starter",
      "Smart Fee Management & Receipts",
      "Outstanding Dues & Defaulter Tracking",
      "Student & Parent Dedicated Portal",
      "Exam Marks & Performance Sheets",
      "Automated Monthly Register Exports",
      "Priority Phone & Chat Support",
    ],
  },
  {
    plan: "Enterprise",
    badge: "Institutions & Groups",
    students: "Unlimited Students",
    features: [
      "Everything in Professional",
      "Multi-Branch & Group Analytics",
      "Custom Branding & Domain Options",
      "Advanced Audit Logs & Telemetry",
      "Dedicated Account Manager",
      "Custom Data Migration Assistance",
      "24/7 SLA Backed Support",
    ],
  },
];

export const BROCHURE_FAQS = [
  {
    question: "How long does it take for a school to transition to School Study?",
    answer:
      "Most schools are fully operational within 24 to 48 hours. Using our bulk CSV import utility, you can upload your existing student and teacher rosters in minutes, configure your classes, and begin marking attendance immediately.",
  },
  {
    question: "Do we need to buy special computers, servers, or hardware?",
    answer:
      "None whatsoever. School Study is a 100% cloud-hosted SaaS platform. All you need is an internet connection and a web browser on any computer, laptop, tablet, or smartphone.",
  },
  {
    question: "Is our school's student and financial data safe and private?",
    answer:
      "Absolutely. We implement enterprise multi-tenant isolation with Firestore security rules, ensuring no school can ever access another school's data. All data is encrypted in transit using SSL/TLS and backed up redundantly in the cloud.",
  },
  {
    question: "Can teachers use School Study easily without technical training?",
    answer:
      "Yes. Our user interface is purposefully designed with large, clear buttons, intuitive workflows, and zero unnecessary jargon. Teachers can log in from their phones and take attendance with single taps on day one.",
  },
  {
    question: "How do parents and students access their records?",
    answer:
      "Students and parents receive a secure sign-in gateway where they can view their attendance percentages, check upcoming fee deadlines, download printable receipts, and review school circulars 24/7.",
  },
  {
    question: "How can we schedule a live demonstration or try the software?",
    answer:
      "You can contact our team directly via WhatsApp (+91 91182 45636) or email (sbci224234@gmail.com). You can also click 'Register School' on our website to immediately start a free trial.",
  },
];
