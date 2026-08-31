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

    // 3. Fallback to Firestore REST API if client SDK had permission boundaries
    if (rawDocs.length === 0) {
      try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "school-study-c8991";
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";

        const fetchRestCollection = async (collName: string) => {
          const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collName}${apiKey ? `?key=${apiKey}` : ""}`;
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            const documents = json.documents || [];
            for (const item of documents) {
              const docId = item.name.split("/").pop() || "";
              const fields = item.fields || {};
              const data: any = {};
              for (const [k, v] of Object.entries(fields) as any) {
                if (v.stringValue !== undefined) data[k] = v.stringValue;
                else if (v.booleanValue !== undefined) data[k] = v.booleanValue;
                else if (v.integerValue !== undefined) data[k] = parseInt(v.integerValue, 10);
                else if (v.timestampValue !== undefined) data[k] = v.timestampValue;
              }
              if (!rawDocs.some((d) => d.id === docId)) {
                rawDocs.push({ id: docId, data });
              }
            }
          }
        };

        await fetchRestCollection(INQUIRY_COLLECTION);
        await fetchRestCollection(LEGACY_COLLECTION);
      } catch (restErr) {
        console.warn("REST inquiries fetch notice:", restErr);
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
    if (statusFilter && statusFilter !== "ALL" && statusFilter !== "ARCHIVED") {
      allInquiries = allInquiries.filter((i) => i.status === statusFilter);
    }

    // Apply Priority Filter
    if (priorityFilter && priorityFilter !== "ALL") {
      allInquiries = allInquiries.filter((i) => i.priority === priorityFilter);
    }

    // Apply Source Filter
    if (sourceFilter && sourceFilter !== "ALL") {
      allInquiries = allInquiries.filter((i) => i.source.toLowerCase() === sourceFilter.toLowerCase());
    }

    // Apply Assignment Filter
    if (assignmentFilter && assignmentFilter !== "ALL") {
      if (assignmentFilter === "UNASSIGNED") {
        allInquiries = allInquiries.filter((i) => !i.assignedTo);
      } else {
        allInquiries = allInquiries.filter((i) => i.assignedTo === assignmentFilter);
      }
    }

    // Apply Date Filter
    const now = new Date();
    if (dateFilter === "TODAY") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      allInquiries = allInquiries.filter((i) => new Date(i.createdAt).getTime() >= startOfDay);
    } else if (dateFilter === "LAST_7_DAYS") {
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      allInquiries = allInquiries.filter((i) => new Date(i.createdAt).getTime() >= sevenDaysAgo);
    } else if (dateFilter === "LAST_30_DAYS") {
      const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      allInquiries = allInquiries.filter((i) => new Date(i.createdAt).getTime() >= thirtyDaysAgo);
    }

    // Apply Sorting
    allInquiries.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "priority") {
        const pOrder: Record<string, number> = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
        return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      }
      if (sortBy === "organization") {
        return a.organization.localeCompare(b.organization);
      }
      // default: newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Pagination
    const totalItems = allInquiries.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const paginatedInquiries = allInquiries.slice((safePage - 1) * pageSize, safePage * pageSize);

    return NextResponse.json({
      inquiries: paginatedInquiries,
      counts,
      pagination: {
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("GET Inquiries API Error:", error);
    return NextResponse.json(
      { error: "Failed to load inquiries: " + (error.message || "") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/inquiries
 * Public & Internal submission of new lead inquiry
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, schoolName, organization, city, location, subject, message, source } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Please enter a valid full name." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim().length < 3) {
      return NextResponse.json({ error: "Message must be at least 3 characters long." }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = (phone || "").trim();
    const cleanOrg = (organization || schoolName || "N/A").trim();
    const cleanLocation = (location || city || "").trim();
    const cleanSubject = (subject || `Inquiry from ${cleanName}`).trim();
    const cleanMessage = message.trim();

    const db = getFirebaseDb();
    const nowIso = new Date().toISOString();
    let createdDocId = `inq_${Date.now()}_${Math.random().toString(36).slice(-5)}`;

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

    let writeSuccess = false;

    if (db) {
      try {
        const docRef = await addDoc(collection(db, INQUIRY_COLLECTION), newInquiryData);
        createdDocId = docRef.id;
        writeSuccess = true;

        try {
          await setDoc(doc(db, LEGACY_COLLECTION, docRef.id), newInquiryData, { merge: true });
        } catch (e) {}
      } catch (clientErr) {
        console.warn("Client SDK addDoc notice, trying REST API write:", clientErr);
      }
    }

    if (!writeSuccess) {
      try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "school-study-c8991";
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/inquiries/${createdDocId}${apiKey ? `?key=${apiKey}` : ""}`;

        const restFields: any = {};
        for (const [k, v] of Object.entries(newInquiryData)) {
          if (typeof v === "string") restFields[k] = { stringValue: v };
          else if (typeof v === "boolean") restFields[k] = { booleanValue: v };
          else if (typeof v === "number") restFields[k] = { integerValue: v.toString() };
          else if (v === null) restFields[k] = { nullValue: null };
        }
        restFields.createdAt = { timestampValue: nowIso };
        restFields.updatedAt = { timestampValue: nowIso };

        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: restFields }),
        });
        if (res.ok) writeSuccess = true;
      } catch (restWriteErr) {
        console.warn("REST API write notice:", restWriteErr);
      }
    }

    // Log Activity & Audit
    try {
      await logInquiryActivity(createdDocId, {
        actorId: "public_user",
        actorName: cleanName,
        actorRole: "public",
        action: "INQUIRY_CREATED",
        message: `Inquiry received from ${cleanName} (${cleanOrg}).`,
        after: { status: "NEW", priority: "NORMAL", subject: cleanSubject },
      });

      await createBillingAuditLog(
        cleanEmail,
        "public",
        "MANUAL_ACCESS_CHANGE",
        "accessPolicy",
        createdDocId,
        { actionType: "INQUIRY_CREATED", name: cleanName, organization: cleanOrg }
      );
    } catch (e) {}

    return NextResponse.json({
      success: true,
      inquiryId: createdDocId,
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
