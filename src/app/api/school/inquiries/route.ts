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
import { canAccessFeature } from "@/lib/billing/featureAccess";

export const dynamic = "force-dynamic";

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
        let snap;
        try {
          snap = await q.orderBy("createdAt", "desc").get();
        } catch {
          snap = await q.get();
        }
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
            try {
              const snap = await getDocs(query(q, where("schoolId", "==", schoolId), orderBy("createdAt", "desc")));
              snap.forEach((d) => rawDocs.push({ id: d.id, data: d.data() }));
            } catch {
              const snap = await getDocs(query(q, where("schoolId", "==", schoolId)));
              snap.forEach((d) => rawDocs.push({ id: d.id, data: d.data() }));
            }
          } else {
            const snap = await getDocs(query(q, orderBy("createdAt", "desc")));
            snap.forEach((d) => rawDocs.push({ id: d.id, data: d.data() }));
          }
        } catch (e) {
          console.warn("School inquiries Client DB notice:", e);
        }
      }
    }

    // 3. Fallback to Firestore REST API if SDK queries were empty or lacked index
    if (rawDocs.length === 0 && schoolId) {
      try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "school-study-c8991";
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${INQUIRY_COLLECTION}${apiKey ? `?key=${apiKey}` : ""}`;
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
            if (!schoolId || data.schoolId === schoolId) {
              if (!rawDocs.some((d) => d.id === docId)) {
                rawDocs.push({ id: docId, data });
              }
            }
          }
        }
      } catch (restErr) {
        console.warn("School inquiries REST fetch notice:", restErr);
      }
    }

    const inquiries: Inquiry[] = [];
    for (const d of rawDocs) {
      try {
        inquiries.push(normalizeInquiry(d.id, d.data));
      } catch (normErr) {
        console.warn("Notice: skipping unparseable inquiry:", d.id, normErr);
      }
    }

    // In-memory sort by createdAt descending
    inquiries.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return NextResponse.json({
      success: true,
      inquiries,
      total: inquiries.length,
    });
  } catch (error: any) {
    console.error("GET /api/school/inquiries error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch school inquiries." },
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

    if (schoolId) {
      const access = await canAccessFeature(schoolId, "inquiries_action_create");
      if (!access.allowed) {
        return NextResponse.json(
          { success: false, error: access.message || "Creating inquiries is not allowed on your plan." },
          { status: 403 }
        );
      }
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
