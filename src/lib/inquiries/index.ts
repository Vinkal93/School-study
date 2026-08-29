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

export type InquiryStatus = "NEW" | "IN_PROGRESS" | "WAITING_FOR_RESPONSE" | "RESOLVED" | "CLOSED";
export type InquiryPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type InquirySource = "Contact Form" | "Pricing" | "Signup" | "Other";

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  location: string;
  subject: string;
  message: string;
  source: InquirySource;
  status: InquiryStatus;
  priority: InquiryPriority;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt?: string | null;
  assignedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  viewedAt?: string | null;
  viewedBy?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  closedAt?: string | null;
  closedBy?: string | null;
  lastUpdatedBy?: string | null;
  notesCount: number;
  isArchived: boolean;
}

export interface InquiryNote {
  id: string;
  inquiryId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  note: string;
  createdAt: string;
  updatedAt: string;
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
    | "INQUIRY_ASSIGNED"
    | "INQUIRY_UNASSIGNED"
    | "INQUIRY_NOTE_ADDED"
    | "INQUIRY_NOTE_DELETED"
    | "INQUIRY_RESOLVED"
    | "INQUIRY_CLOSED"
    | "INQUIRY_REOPENED"
    | "INQUIRY_ARCHIVED";
  message: string;
  before?: any;
  after?: any;
  timestamp: string;
}

export const LEGAL_INQUIRY_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  NEW: ["IN_PROGRESS", "CLOSED", "RESOLVED"],
  IN_PROGRESS: ["WAITING_FOR_RESPONSE", "RESOLVED", "CLOSED"],
  WAITING_FOR_RESPONSE: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS", "NEW"],
  CLOSED: ["NEW", "IN_PROGRESS"],
};

export const INQUIRY_COLLECTION = "inquiries";
export const LEGACY_COLLECTION = "contactInquiries";

/**
 * Standardizes raw Firestore doc into normalized Inquiry object.
 */
export function normalizeInquiry(docId: string, data: any): Inquiry {
  const statusRaw = (data.status || "NEW").toUpperCase();
  let status: InquiryStatus = "NEW";
  if (statusRaw === "CONTACTED" || statusRaw === "IN_PROGRESS") status = "IN_PROGRESS";
  else if (statusRaw === "WAITING" || statusRaw === "WAITING_FOR_RESPONSE") status = "WAITING_FOR_RESPONSE";
  else if (statusRaw === "RESOLVED") status = "RESOLVED";
  else if (statusRaw === "CLOSED") status = "CLOSED";

  const priorityRaw = (data.priority || "NORMAL").toUpperCase();
  let priority: InquiryPriority = "NORMAL";
  if (priorityRaw === "LOW") priority = "LOW";
  else if (priorityRaw === "HIGH") priority = "HIGH";
  else if (priorityRaw === "URGENT") priority = "URGENT";

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

  return {
    id: docId,
    name: data.name || "Anonymous",
    email: data.email || "",
    phone: data.phone || "",
    organization: data.organization || data.schoolName || "N/A",
    location: data.location || data.city || "",
    subject: data.subject || `Inquiry from ${data.name || "School"}`,
    message: data.message || "",
    source: data.source || "Contact Form",
    status,
    priority,
    assignedTo: data.assignedTo || null,
    assignedToName: data.assignedToName || null,
    assignedAt: data.assignedAt || null,
    assignedBy: data.assignedBy || null,
    createdAt,
    updatedAt,
    viewedAt: data.viewedAt || null,
    viewedBy: data.viewedBy || null,
    resolvedAt: data.resolvedAt || null,
    resolvedBy: data.resolvedBy || null,
    closedAt: data.closedAt || null,
    closedBy: data.closedBy || null,
    lastUpdatedBy: data.lastUpdatedBy || null,
    notesCount: data.notesCount || 0,
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
