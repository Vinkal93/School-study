import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  query,
  orderBy,
  limit as limitQuery,
  serverTimestamp,
} from "firebase/firestore";
import {
  normalizeInquiry,
  Inquiry,
  INQUIRY_COLLECTION,
  LEGACY_COLLECTION,
  logInquiryActivity,
} from "@/lib/inquiries";
import { createBillingAuditLog } from "@/lib/billing";

/**
 * GET /api/super-admin/inquiries
 * Supports Search, Filters, Real Summary Counts, Pagination & Sorting
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const statusFilter = (searchParams.get("status") || "ALL").toUpperCase();
    const priorityFilter = (searchParams.get("priority") || "ALL").toUpperCase();
    const assignmentFilter = searchParams.get("assignedTo") || "ALL";
    const sourceFilter = searchParams.get("source") || "ALL";
    const dateFilter = searchParams.get("date") || "ALL";
    const sortBy = searchParams.get("sort") || "newest";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const db = getFirebaseDb();
    let rawDocs: { id: string; data: any }[] = [];

    if (db) {
      // 1. Fetch primary inquiries collection
      try {
        const qPrimary = query(collection(db, INQUIRY_COLLECTION), orderBy("createdAt", "desc"));
        const snapPrimary = await getDocs(qPrimary);
        snapPrimary.forEach((doc) => {
          rawDocs.push({ id: doc.id, data: doc.data() });
        });
      } catch (err) {
        console.warn("Notice: Primary inquiries collection fetch notice:", err);
      }

      // 2. Fetch legacy contactInquiries collection for backward compatibility
      try {
        const qLegacy = query(collection(db, LEGACY_COLLECTION), orderBy("createdAt", "desc"));
        const snapLegacy = await getDocs(qLegacy);
        snapLegacy.forEach((doc) => {
          if (!rawDocs.some((d) => d.id === doc.id)) {
            rawDocs.push({ id: doc.id, data: doc.data() });
          }
        });
      } catch (err) {
        console.warn("Notice: Legacy inquiries collection fetch notice:", err);
      }
    }

    // Convert raw docs into normalized Inquiry objects
    let allInquiries: Inquiry[] = rawDocs.map((d) => normalizeInquiry(d.id, d.data));

    // Calculate Real Summary Counts (uncapped before search/pagination filtering)
    const counts = {
      total: allInquiries.filter((i) => !i.isArchived).length,
      new: allInquiries.filter((i) => !i.isArchived && i.status === "NEW").length,
      inProgress: allInquiries.filter((i) => !i.isArchived && i.status === "IN_PROGRESS").length,
      waiting: allInquiries.filter((i) => !i.isArchived && i.status === "WAITING_FOR_RESPONSE").length,
      resolved: allInquiries.filter((i) => !i.isArchived && i.status === "RESOLVED").length,
      urgent: allInquiries.filter((i) => !i.isArchived && i.priority === "URGENT").length,
    };

    // Filter Archived / Active
    if (statusFilter === "ARCHIVED") {
      allInquiries = allInquiries.filter((i) => i.isArchived);
    } else {
      allInquiries = allInquiries.filter((i) => !i.isArchived);
    }

    // Apply Search Filter (Name, Email, Phone, Organization, Subject, Inquiry ID)
    if (search) {
      allInquiries = allInquiries.filter((i) => {
        return (
          i.name.toLowerCase().includes(search) ||
          i.email.toLowerCase().includes(search) ||
          i.phone.toLowerCase().includes(search) ||
          i.organization.toLowerCase().includes(search) ||
          i.subject.toLowerCase().includes(search) ||
          i.id.toLowerCase().includes(search)
        );
      });
    }

    // Apply Status Filter
    if (statusFilter !== "ALL" && statusFilter !== "ARCHIVED") {
      allInquiries = allInquiries.filter((i) => i.status === statusFilter);
    }

    // Apply Priority Filter
    if (priorityFilter !== "ALL") {
      allInquiries = allInquiries.filter((i) => i.priority === priorityFilter);
    }

    // Apply Assignment Filter
    if (assignmentFilter === "UNASSIGNED") {
      allInquiries = allInquiries.filter((i) => !i.assignedTo);
    } else if (assignmentFilter !== "ALL") {
      allInquiries = allInquiries.filter((i) => i.assignedTo === assignmentFilter);
    }

    // Apply Source Filter
    if (sourceFilter !== "ALL") {
      allInquiries = allInquiries.filter((i) => i.source === sourceFilter);
    }

    // Apply Date Range Filter
    if (dateFilter !== "ALL") {
      const now = new Date();
      let threshold = new Date(0);

      if (dateFilter === "today") {
        threshold = new Date(now.setHours(0, 0, 0, 0));
      } else if (dateFilter === "yesterday") {
        threshold = new Date(now.setDate(now.getDate() - 1));
      } else if (dateFilter === "7days") {
        threshold = new Date(now.setDate(now.getDate() - 7));
      } else if (dateFilter === "30days") {
        threshold = new Date(now.setDate(now.getDate() - 30));
      }

      allInquiries = allInquiries.filter((i) => new Date(i.createdAt) >= threshold);
    }

    // Apply Sorting
    allInquiries.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "priority") {
        const priorityOrder: Record<string, number> = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      } else if (sortBy === "updated") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      // Default: newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Server-Side Pagination
    const totalFiltered = allInquiries.length;
    const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedInquiries = allInquiries.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      success: true,
      inquiries: paginatedInquiries,
      pagination: {
        page,
        pageSize,
        totalItems: totalFiltered,
        totalPages,
      },
      counts,
    });
  } catch (error: any) {
    console.error("GET Super Admin Inquiries Error:", error);
    return NextResponse.json(
      { error: "Failed to load inquiries: " + (error.message || "") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/inquiries
 * Public & Admin inquiry submission with server-side validation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, organization, schoolName, location, city, subject, message, source = "Contact Form" } = body;

    // Server-side validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Valid name (at least 2 characters) is required." }, { status: 400 });
    }

    if (!email || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ error: "Valid email address is required." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim().length < 5) {
      return NextResponse.json({ error: "Message must be at least 5 characters long." }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = (phone || "").trim();
    const cleanOrg = (organization || schoolName || "N/A").trim();
    const cleanLocation = (location || city || "").trim();
    const cleanSubject = (subject || `Inquiry from ${cleanName}`).trim();
    const cleanMessage = message.trim();

    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
    }

    const nowIso = new Date().toISOString();
    const newInquiryData = {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      organization: cleanOrg,
      schoolName: cleanOrg,
      location: cleanLocation,
      city: cleanLocation,
      subject: cleanSubject,
      message: cleanMessage,
      source: source || "Contact Form",
      status: "NEW",
      priority: "NORMAL",
      assignedTo: null,
      assignedToName: null,
      notesCount: 0,
      isArchived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, INQUIRY_COLLECTION), newInquiryData);

    // Also write legacy document for backward compatibility if needed
    try {
      await setDoc(doc(db, LEGACY_COLLECTION, docRef.id), newInquiryData, { merge: true });
    } catch (e) {
      // Legacy mirror fallback
    }

    // Log Activity
    await logInquiryActivity(docRef.id, {
      actorId: "public_user",
      actorName: cleanName,
      actorRole: "public",
      action: "INQUIRY_CREATED",
      message: `Inquiry received from ${cleanName} (${cleanOrg}).`,
      after: { status: "NEW", priority: "NORMAL", subject: cleanSubject },
    });

    // Log System Audit
    await createBillingAuditLog(
      cleanEmail,
      "public",
      "MANUAL_ACCESS_CHANGE",
      "accessPolicy",
      docRef.id,
      { actionType: "INQUIRY_CREATED", name: cleanName, organization: cleanOrg }
    );

    return NextResponse.json({
      success: true,
      inquiryId: docRef.id,
      message: "Thank you for reaching out! Your inquiry has been logged successfully.",
    });
  } catch (error: any) {
    console.error("POST Inquiry Submission Error:", error);
    return NextResponse.json(
      { error: "Failed to submit inquiry: " + (error.message || "") },
      { status: 500 }
    );
  }
}
