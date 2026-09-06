import { NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  normalizeInquiry,
  Inquiry,
  INQUIRY_COLLECTION,
  SEED_INQUIRIES_2_0,
} from "@/lib/inquiries";

/**
 * GET /api/school/inquiries
 * Returns tenant-isolated student admission inquiries & parent leads for school admin
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId") || "";

    let rawDocs: { id: string; data: any }[] = [];

    const adminDb = getSafeAdminDb();
    if (adminDb) {
      try {
        let q: any = adminDb.collection(INQUIRY_COLLECTION);
        if (schoolId) {
          q = q.where("schoolId", "==", schoolId);
        }
        const snap = await q.orderBy("createdAt", "desc").get();
        snap.forEach((d: any) => rawDocs.push({ id: d.id, data: d.data() }));
      } catch (e) {
        console.warn("School inquiries Admin DB notice:", e);
      }
    }

    if (rawDocs.length === 0) {
      const db = getFirebaseDb();
      if (db) {
        try {
          let q: any = collection(db, INQUIRY_COLLECTION);
          if (schoolId) {
            q = query(q, where("schoolId", "==", schoolId), orderBy("createdAt", "desc"));
          } else {
            q = query(q, orderBy("createdAt", "desc"));
          }
          const snap = await getDocs(q);
          snap.forEach((d) => rawDocs.push({ id: d.id, data: d.data() }));
        } catch (e) {
          console.warn("School inquiries Client DB notice:", e);
        }
      }
    }

    let inquiries: Inquiry[] = rawDocs.map((d) => normalizeInquiry(d.id, d.data));

    // If no records found, return specialized school admission seed leads
    if (inquiries.length === 0) {
      inquiries = SEED_INQUIRIES_2_0.map((inq, idx) => ({
        ...inq,
        schoolId: schoolId || "school_demo",
        subject: idx % 2 === 0 ? "Admission Inquiry for Class 6th" : "Kindergarten Campus Tour & Fee Structure",
        category: "ADMISSION" as const,
        schoolName: idx % 2 === 0 ? "Parent of Aarav Sharma" : "Parent of Ananya Mehta",
        organization: idx % 2 === 0 ? "Parent of Aarav Sharma" : "Parent of Ananya Mehta",
      }));
    }

    return NextResponse.json({
      success: true,
      inquiries,
      total: inquiries.length,
    });
  } catch (error: any) {
    console.error("GET /api/school/inquiries error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch school inquiries." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/school/inquiries
 * Creates a new school admission inquiry / parent lead
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      name,
      schoolId,
      email,
      phone,
      location,
      source = "Website",
      interestLevel = "High",
      status2 = "New",
      assignedToName = "Admissions Office",
      preferredContact = "Phone",
      expectedTimeline = "Within 1 month",
      subject,
      message,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Contact name is required." }, { status: 400 });
    }

    const newId = `inq_${Date.now()}`;
    const inquiryData = {
      id: newId,
      inquiryNumber: Math.floor(1000 + Math.random() * 9000),
      name: name.trim(),
      schoolId: schoolId || null,
      schoolName: body.schoolName || body.organization || name.trim(),
      organization: body.schoolName || body.organization || name.trim(),
      email: email?.trim() || "",
      phone: phone?.trim() || "",
      location: location?.trim() || "Delhi, India",
      source,
      interestLevel,
      status: status2 === "New" ? "NEW" : "CONTACTED",
      status2,
      priority: interestLevel === "High" ? "HIGH" : "NORMAL",
      assignedTo: "user_admissions",
      assignedToName,
      preferredContact,
      expectedTimeline,
      subject: subject || `Admission inquiry from ${name.trim()}`,
      message: message || "Interested in school admission details and campus visit.",
      category: "ADMISSION",
      notesCount: 0,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const adminDb = getSafeAdminDb();
    if (adminDb) {
      await adminDb.collection(INQUIRY_COLLECTION).doc(newId).set(inquiryData);
    } else {
      const db = getFirebaseDb();
      if (db) {
        await setDoc(doc(db, INQUIRY_COLLECTION, newId), inquiryData);
      }
    }

    return NextResponse.json({
      success: true,
      inquiry: inquiryData,
      message: "Admission inquiry created successfully.",
    });
  } catch (error: any) {
    console.error("POST /api/school/inquiries error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create inquiry." },
      { status: 500 }
    );
  }
}
