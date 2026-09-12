import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as limitQuery,
  serverTimestamp,
  increment,
} from "firebase/firestore";

export type InquiryStatus = "NEW" | "IN_PROGRESS" | "WAITING_FOR_RESPONSE" | "RESOLVED" | "CLOSED" | "CONTACTED" | "IN_DISCUSSION" | "CONVERTED";
export type InquiryStatus2 = "New" | "Contacted" | "In Discussion" | "Converted" | "Closed";
export type InquiryPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type InquiryInterestLevel = "High" | "Medium" | "Low";
export type InquirySource = "Website" | "Google Ads" | "Referral" | "Social Media" | "Direct" | "Contact Form" | "Pricing" | "Signup" | "Other";
export type PreferredContactMethod = "Phone" | "Email" | "WhatsApp" | "Any";

export interface InquiryNote {
  id: string;
  inquiryId: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  note: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InquiryFollowUp {
  id: string;
  inquiryId: string;
  title: string;
  scheduledAt: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  assignedToName?: string;
  notes?: string;
  createdAt: string;
}

export interface InquiryActivity {
  id: string;
  inquiryId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action:
    | "INQUIRY_CREATED"
    | "INQUIRY_VIEWED"
    | "INQUIRY_STATUS_CHANGED"
    | "INQUIRY_PRIORITY_CHANGED"
    | "INQUIRY_INTEREST_CHANGED"
    | "INQUIRY_ASSIGNED"
    | "INQUIRY_UNASSIGNED"
    | "INQUIRY_NOTE_ADDED"
    | "INQUIRY_FOLLOWUP_ADDED"
    | "INQUIRY_NOTE_DELETED"
    | "INQUIRY_RESOLVED"
    | "INQUIRY_CLOSED"
    | "INQUIRY_CONVERTED"
    | "INQUIRY_REOPENED"
    | "INQUIRY_ARCHIVED";
  message: string;
  before?: any;
  after?: any;
  timestamp: string;
}

export interface Inquiry {
  id: string;
  inquiryNumber: number; // e.g. 1248 -> #1248
  name: string;
  email: string;
  phone: string;
  organization: string; // School name or institution
  schoolName: string;   // Alias for organization
  location: string;     // e.g. "Delhi, India"
  subject: string;
  message: string;
  source: InquirySource;
  interestLevel: InquiryInterestLevel;
  priority: InquiryPriority;
  status: InquiryStatus;
  status2: InquiryStatus2;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedToAvatar: string | null; // e.g. "AK"
  assignedAt?: string | null;
  assignedBy?: string | null;
  preferredContact?: PreferredContactMethod;
  expectedTimeline?: string; // e.g. "Within 1 month"
  lastContact?: string | null;
  schoolId?: string | null;  // For School Admin tenant filtering
  category?: "SCHOOL_ONBOARDING" | "ADMISSION" | "GENERAL" | "SUPPORT" | "PARTNERSHIP";
  notes?: InquiryNote[];
  activity?: InquiryActivity[];
  followUps?: InquiryFollowUp[];
  createdAt: string;
  updatedAt: string;
  viewedAt?: string | null;
  viewedBy?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  closedAt?: string | null;
  closedBy?: string | null;
  convertedAt?: string | null;
  convertedBy?: string | null;
  lastUpdatedBy?: string | null;
  notesCount: number;
  isArchived: boolean;
}

export interface InquiryStats2_0 {
  totalInquiries: number;
  totalInquiriesTrend: string;
  newThisWeek: number;
  newThisWeekTrend: string;
  pending: number;
  pendingTrend: string;
  converted: number;
  convertedTrend: string;
  closed: number;
  closedTrend: string;
  conversionRate: number;
  conversionRateTrend: string;
  counts: {
    all: number;
    new: number;
    contacted: number;
    inDiscussion: number;
    converted: number;
    closed: number;
  };
}

export const LEGAL_INQUIRY_TRANSITIONS: Record<string, string[]> = {
  NEW: ["IN_PROGRESS", "CONTACTED", "IN_DISCUSSION", "CONVERTED", "CLOSED", "RESOLVED"],
  CONTACTED: ["IN_DISCUSSION", "CONVERTED", "CLOSED", "NEW"],
  IN_DISCUSSION: ["CONVERTED", "CLOSED", "CONTACTED"],
  IN_PROGRESS: ["WAITING_FOR_RESPONSE", "RESOLVED", "CONVERTED", "CLOSED"],
  WAITING_FOR_RESPONSE: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  CONVERTED: ["CLOSED", "IN_DISCUSSION"],
  RESOLVED: ["CLOSED", "IN_PROGRESS", "NEW"],
  CLOSED: ["NEW", "IN_PROGRESS", "CONTACTED"],
};

export const INQUIRY_COLLECTION = "inquiries";
export const LEGACY_COLLECTION = "contactInquiries";

/**
 * Maps raw status to 2.0 Display Status
 */
export function mapStatusTo2_0(statusRaw?: any): InquiryStatus2 {
  if (!statusRaw) return "New";
  const str = typeof statusRaw === "string" ? statusRaw : String(statusRaw);
  const s = str.trim().toUpperCase();
  if (s === "NEW") return "New";
  if (s === "CONTACTED" || s === "IN_PROGRESS" || s === "WAITING_FOR_RESPONSE") return "Contacted";
  if (s === "IN_DISCUSSION" || s === "DISCUSSION") return "In Discussion";
  if (s === "CONVERTED" || s === "RESOLVED") return "Converted";
  if (s === "CLOSED" || s === "CANCELLED" || s === "REJECTED") return "Closed";
  return "New";
}

/**
 * Standardizes raw Firestore doc into normalized Inquiry object.
 */
export function normalizeInquiry(docId: string, data: any): Inquiry {
  data = data || {};
  const statusRaw = String(data.status || "NEW").toUpperCase();
  let status: InquiryStatus = "NEW";
  if (statusRaw === "CONTACTED") status = "CONTACTED";
  else if (statusRaw === "IN_DISCUSSION" || statusRaw === "DISCUSSION") status = "IN_DISCUSSION";
  else if (statusRaw === "IN_PROGRESS") status = "IN_PROGRESS";
  else if (statusRaw === "WAITING" || statusRaw === "WAITING_FOR_RESPONSE") status = "WAITING_FOR_RESPONSE";
  else if (statusRaw === "CONVERTED") status = "CONVERTED";
  else if (statusRaw === "RESOLVED") status = "RESOLVED";
  else if (statusRaw === "CLOSED") status = "CLOSED";

  const status2: InquiryStatus2 = mapStatusTo2_0(data.status2 || data.status);

  const priorityRaw = String(data.priority || "NORMAL").toUpperCase();
  let priority: InquiryPriority = "NORMAL";
  if (priorityRaw === "LOW") priority = "LOW";
  else if (priorityRaw === "HIGH") priority = "HIGH";
  else if (priorityRaw === "URGENT") priority = "URGENT";

  let interestLevel: InquiryInterestLevel = "Medium";
  const rawInterest = String(data.interestLevel || data.interest || "").toUpperCase();
  if (rawInterest === "HIGH" || rawInterest === "HOT") interestLevel = "High";
  else if (rawInterest === "LOW" || rawInterest === "COLD") interestLevel = "Low";
  else if (rawInterest === "MEDIUM" || rawInterest === "WARM") interestLevel = "Medium";
  else {
    // Infer interest from priority
    if (priority === "HIGH" || priority === "URGENT") interestLevel = "High";
    else if (priority === "LOW") interestLevel = "Low";
  }

  // Derive source
  let source: InquirySource = "Website";
  const rawSource = typeof data.source === "string" ? data.source : String(data.source || "");
  if (/google/i.test(rawSource)) source = "Google Ads";
  else if (/referral/i.test(rawSource)) source = "Referral";
  else if (/social|instagram|facebook|linkedin|twitter/i.test(rawSource)) source = "Social Media";
  else if (/direct|phone|walk-in/i.test(rawSource)) source = "Direct";
  else if (/pricing/i.test(rawSource)) source = "Pricing";
  else if (/signup/i.test(rawSource)) source = "Signup";
  else if (/contact/i.test(rawSource)) source = "Contact Form";
  else if (rawSource) source = rawSource as InquirySource;

  // Derive assignedTo Avatar
  const assignedToName = typeof data.assignedToName === "string" ? data.assignedToName : (typeof data.assignedTo === "string" ? "Team Member" : null);
  let assignedToAvatar = typeof data.assignedToAvatar === "string" ? data.assignedToAvatar : null;
  if (assignedToName && !assignedToAvatar) {
    const parts = assignedToName.trim().split(" ");
    assignedToAvatar = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  }

  // Derive safe string name
  let name = "Parent / Student";
  if (typeof data.name === "string" && data.name.trim()) {
    name = data.name.trim();
  } else if (data.name && typeof data.name === "object") {
    name = typeof data.name.name === "string" ? data.name.name : (typeof data.name.phone === "string" ? data.name.phone : "Parent / Student");
  }

  // Derive inquiry number
  let inquiryNumber = typeof data.inquiryNumber === "number" ? data.inquiryNumber : 0;
  if (!inquiryNumber) {
    const numMatch = String(docId || "").match(/\d+/);
    inquiryNumber = numMatch ? parseInt(numMatch[0].slice(-4), 10) : 1000 + (Math.abs(String(docId || "").split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % 9000);
  }

  const createdAt = data.createdAt?.toDate
    ? data.createdAt.toDate().toISOString()
    : typeof data.createdAt === "string"
    ? data.createdAt
    : new Date().toISOString();

  const updatedAt = data.updatedAt?.toDate
    ? data.updatedAt.toDate().toISOString()
    : typeof data.updatedAt === "string"
    ? data.updatedAt
    : createdAt;

  const organization = typeof data.organization === "string" ? data.organization : (typeof data.schoolName === "string" ? data.schoolName : "Bright Future School");

  return {
    id: docId,
    inquiryNumber,
    name,
    email: typeof data.email === "string" ? data.email : "parent@school.in",
    phone: typeof data.phone === "string" ? data.phone : "+91 98765 43210",
    organization,
    schoolName: organization,
    location: typeof data.location === "string" ? data.location : (typeof data.city === "string" ? data.city : "Delhi, India"),
    subject: typeof data.subject === "string" ? data.subject : `Inquiry from ${name}`,
    message: typeof data.message === "string" ? data.message : "Admission inquiry details.",
    source,
    interestLevel,
    priority,
    status,
    status2,
    assignedTo: data.assignedTo || "user_ankit",
    assignedToName: assignedToName || "Ankit Kumar",
    assignedToAvatar: assignedToAvatar || "AK",
    assignedAt: data.assignedAt || null,
    assignedBy: data.assignedBy || null,
    preferredContact: data.preferredContact || "Phone",
    expectedTimeline: data.expectedTimeline || "Within 1 month",
    lastContact: data.lastContact || null,
    schoolId: data.schoolId || null,
    category: data.category || "SCHOOL_ONBOARDING",
    notes: Array.isArray(data.notes) ? data.notes : [],
    activity: Array.isArray(data.activity) ? data.activity : [],
    followUps: Array.isArray(data.followUps) ? data.followUps : [],
    createdAt,
    updatedAt,
    viewedAt: data.viewedAt || null,
    viewedBy: data.viewedBy || null,
    resolvedAt: data.resolvedAt || null,
    resolvedBy: data.resolvedBy || null,
    closedAt: data.closedAt || null,
    closedBy: data.closedBy || null,
    convertedAt: data.convertedAt || null,
    convertedBy: data.convertedBy || null,
    lastUpdatedBy: data.lastUpdatedBy || null,
    notesCount: data.notesCount || (Array.isArray(data.notes) ? data.notes.length : 0),
    isArchived: Boolean(data.isArchived),
  };
}

/**
 * Log activity timeline item in subcollection inquiries/{inquiryId}/activities
 */
export async function logInquiryActivity(
  inquiryId: string,
  activity: Omit<InquiryActivity, "id" | "inquiryId" | "timestamp">
) {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    const actRef = collection(db, INQUIRY_COLLECTION, inquiryId, "activities");
    await addDoc(actRef, {
      ...activity,
      inquiryId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Failed to record inquiry activity timeline item:", err);
  }
}

/**
 * Standard Default 2.0 Inquiries Seed Data for instant live UI demo matching screenshot
 */
export const SEED_INQUIRIES_2_0: Inquiry[] = [
  {
    id: "inq_1248",
    inquiryNumber: 1248,
    name: "Rahul Sharma",
    schoolName: "Bright Future School",
    organization: "Bright Future School",
    email: "rahul@bfschool.in",
    phone: "+91 98765 43210",
    location: "Delhi, India",
    source: "Website",
    interestLevel: "High",
    status: "NEW",
    status2: "New",
    priority: "HIGH",
    assignedTo: "user_ankit",
    assignedToName: "Ankit Kumar",
    assignedToAvatar: "AK",
    preferredContact: "Phone",
    expectedTimeline: "Within 1 month",
    lastContact: null,
    subject: "Platform Demo & Pricing Inquiry",
    message: "We are looking for a complete school management solution for our 500+ students. Please share details about pricing and features.",
    category: "SCHOOL_ONBOARDING",
    notesCount: 2,
    isArchived: false,
    createdAt: "2024-12-01T10:24:00.000Z",
    updatedAt: "2024-12-01T10:24:00.000Z",
  },
  {
    id: "inq_1247",
    inquiryNumber: 1247,
    name: "Priya Mehta",
    schoolName: "Sunrise Academy",
    organization: "Sunrise Academy",
    email: "priya@sunrise.edu.in",
    phone: "+91 98765 43211",
    location: "Mumbai, Maharashtra",
    source: "Google Ads",
    interestLevel: "Medium",
    status: "CONTACTED",
    status2: "Contacted",
    priority: "NORMAL",
    assignedTo: "user_sneha",
    assignedToName: "Sneha Patel",
    assignedToAvatar: "SP",
    preferredContact: "Email",
    expectedTimeline: "1-3 months",
    lastContact: "Nov 30, 2024",
    subject: "Automated Attendance & Bell Alerts",
    message: "Need automated attendance tracking and automated classroom timetable bells for 1200 students across 2 campuses.",
    category: "SCHOOL_ONBOARDING",
    notesCount: 1,
    isArchived: false,
    createdAt: "2024-12-01T09:15:00.000Z",
    updatedAt: "2024-12-01T09:15:00.000Z",
  },
  {
    id: "inq_1246",
    inquiryNumber: 1246,
    name: "Amit Verma",
    schoolName: "Global Kids School",
    organization: "Global Kids School",
    email: "amit@globalkids.in",
    phone: "+91 98765 43212",
    location: "Bengaluru, Karnataka",
    source: "Referral",
    interestLevel: "High",
    status: "IN_DISCUSSION",
    status2: "In Discussion",
    priority: "HIGH",
    assignedTo: "user_rohit",
    assignedToName: "Rohit Gupta",
    assignedToAvatar: "RG",
    preferredContact: "WhatsApp",
    expectedTimeline: "Immediate",
    lastContact: "Nov 30, 2024",
    subject: "Multi-branch Custom Onboarding",
    message: "Running 4 preschool branches in Bangalore. Interested in the Professional Plan with custom fee management integration.",
    category: "SCHOOL_ONBOARDING",
    notesCount: 4,
    isArchived: false,
    createdAt: "2024-11-30T18:40:00.000Z",
    updatedAt: "2024-11-30T18:40:00.000Z",
  },
  {
    id: "inq_1245",
    inquiryNumber: 1245,
    name: "Neha Singh",
    schoolName: "Little Stars School",
    organization: "Little Stars School",
    email: "neha@littlestars.in",
    phone: "+91 98765 43213",
    location: "Jaipur, Rajasthan",
    source: "Website",
    interestLevel: "Medium",
    status: "NEW",
    status2: "New",
    priority: "NORMAL",
    assignedTo: "user_ankit",
    assignedToName: "Ankit Kumar",
    assignedToAvatar: "AK",
    preferredContact: "Phone",
    expectedTimeline: "Within 1 month",
    lastContact: null,
    subject: "Parent Mobile App & Homework Portal",
    message: "Our primary requirement is teacher homework posting and instant push notifications to parents.",
    category: "SCHOOL_ONBOARDING",
    notesCount: 0,
    isArchived: false,
    createdAt: "2024-11-30T16:20:00.000Z",
    updatedAt: "2024-11-30T16:20:00.000Z",
  },
  {
    id: "inq_1244",
    inquiryNumber: 1244,
    name: "Vikram Patel",
    schoolName: "Patel International",
    organization: "Patel International",
    email: "vikram@patelintl.in",
    phone: "+91 98765 43214",
    location: "Ahmedabad, Gujarat",
    source: "Social Media",
    interestLevel: "Low",
    status: "CONTACTED",
    status2: "Contacted",
    priority: "LOW",
    assignedTo: "user_sneha",
    assignedToName: "Sneha Patel",
    assignedToAvatar: "SP",
    preferredContact: "Email",
    expectedTimeline: "Next Academic Year",
    lastContact: "Nov 30, 2024",
    subject: "Exam & Report Cards Module",
    message: "Looking for CBSE standard report card generation with automatic grading and GPA calculation.",
    category: "SCHOOL_ONBOARDING",
    notesCount: 1,
    isArchived: false,
    createdAt: "2024-11-30T14:10:00.000Z",
    updatedAt: "2024-11-30T14:10:00.000Z",
  },
  {
    id: "inq_1243",
    inquiryNumber: 1243,
    name: "Kavita Reddy",
    schoolName: "Reddy Public School",
    organization: "Reddy Public School",
    email: "kavita@reddyschool.in",
    phone: "+91 98765 43215",
    location: "Hyderabad, Telangana",
    source: "Website",
    interestLevel: "High",
    status: "IN_DISCUSSION",
    status2: "In Discussion",
    priority: "HIGH",
    assignedTo: "user_rohit",
    assignedToName: "Rohit Gupta",
    assignedToAvatar: "RG",
    preferredContact: "Phone",
    expectedTimeline: "Immediate",
    lastContact: "Nov 29, 2024",
    subject: "Enterprise Tier Subscription Demo",
    message: "We have 3500+ students and 180 teachers. We want to migrate our existing database to School Study platform.",
    category: "SCHOOL_ONBOARDING",
    notesCount: 3,
    isArchived: false,
    createdAt: "2024-11-30T11:30:00.000Z",
    updatedAt: "2024-11-30T11:30:00.000Z",
  },
  {
    id: "inq_1242",
    inquiryNumber: 1242,
    name: "Suresh Nair",
    schoolName: "Green Valley School",
    organization: "Green Valley School",
    email: "suresh@greenvalley.in",
    phone: "+91 98765 43216",
    location: "Kochi, Kerala",
    source: "Google Ads",
    interestLevel: "Medium",
    status: "NEW",
    status2: "New",
    priority: "NORMAL",
    assignedTo: "user_ankit",
    assignedToName: "Ankit Kumar",
    assignedToAvatar: "AK",
    preferredContact: "Phone",
    expectedTimeline: "Within 1 month",
    lastContact: null,
    subject: "Fee Collection & Online Razorpay",
    message: "Does your system allow parents to pay school fees directly using UPI / NetBanking / Cards with automatic receipt download?",
    category: "SCHOOL_ONBOARDING",
    notesCount: 0,
    isArchived: false,
    createdAt: "2024-11-29T17:45:00.000Z",
    updatedAt: "2024-11-29T17:45:00.000Z",
  },
  {
    id: "inq_1241",
    inquiryNumber: 1241,
    name: "Pooja Kapoor",
    schoolName: "Maple Leaf School",
    organization: "Maple Leaf School",
    email: "pooja@mapleleaf.in",
    phone: "+91 98765 43217",
    location: "Chandigarh, Punjab",
    source: "Referral",
    interestLevel: "High",
    status: "CONVERTED",
    status2: "Converted",
    priority: "HIGH",
    assignedTo: "user_sneha",
    assignedToName: "Sneha Patel",
    assignedToAvatar: "SP",
    preferredContact: "Email",
    expectedTimeline: "Completed",
    lastContact: "Nov 29, 2024",
    subject: "Successfully Onboarded - Professional Annual Plan",
    message: "School successfully purchased Professional Plan. Onboarding team assigned and school database seeded.",
    category: "SCHOOL_ONBOARDING",
    notesCount: 5,
    isArchived: false,
    createdAt: "2024-11-29T15:20:00.000Z",
    updatedAt: "2024-11-29T15:20:00.000Z",
  },
  {
    id: "inq_1240",
    inquiryNumber: 1240,
    name: "Arjun Das",
    schoolName: "Das Academy",
    organization: "Das Academy",
    email: "arjun@dasacademy.in",
    phone: "+91 98765 43218",
    location: "Kolkata, West Bengal",
    source: "Website",
    interestLevel: "Low",
    status: "CLOSED",
    status2: "Closed",
    priority: "LOW",
    assignedTo: "user_rohit",
    assignedToName: "Rohit Gupta",
    assignedToAvatar: "RG",
    preferredContact: "Phone",
    expectedTimeline: "Not interested",
    lastContact: "Nov 29, 2024",
    subject: "Coaching Center Inquiry",
    message: "Inquiry closed as they are a private coaching institute rather than a K-12 school.",
    category: "GENERAL",
    notesCount: 2,
    isArchived: false,
    createdAt: "2024-11-29T12:10:00.000Z",
    updatedAt: "2024-11-29T12:10:00.000Z",
  },
  {
    id: "inq_1239",
    inquiryNumber: 1239,
    name: "Meera Iyer",
    schoolName: "Iyer Global School",
    organization: "Iyer Global School",
    email: "meera@iyerglobal.in",
    phone: "+91 98765 43219",
    location: "Chennai, Tamil Nadu",
    source: "Social Media",
    interestLevel: "Medium",
    status: "CONTACTED",
    status2: "Contacted",
    priority: "NORMAL",
    assignedTo: "user_ankit",
    assignedToName: "Ankit Kumar",
    assignedToAvatar: "AK",
    preferredContact: "WhatsApp",
    expectedTimeline: "1-3 months",
    lastContact: "Nov 29, 2024",
    subject: "Tamil Nadu State Board Timetable & Grading",
    message: "Checking support for State Board syllabus tracking and multilingual reports.",
    category: "SCHOOL_ONBOARDING",
    notesCount: 1,
    isArchived: false,
    createdAt: "2024-11-29T10:05:00.000Z",
    updatedAt: "2024-11-29T10:05:00.000Z",
  },
];
