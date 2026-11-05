import { NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { normalizeInquiry, INQUIRY_COLLECTION } from "@/lib/inquiries";
import { requireSchoolAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ inquiryId: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params).catch(() => ({ inquiryId: "" }));
    const id = resolvedParams.inquiryId;
    if (!id) return NextResponse.json({ success: false, error: "Missing inquiry ID" }, { status: 400 });

    let rawData: any = null;
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      const snap = await adminDb.collection(INQUIRY_COLLECTION).doc(id).get();
      if (snap.exists) rawData = snap.data();
    }

    if (!rawData) {
      const db = getFirebaseDb();
      if (db) {
        const snap = await getDoc(doc(db, INQUIRY_COLLECTION, id));
        if (snap.exists()) rawData = snap.data();
      }
    }

    if (!rawData) {
      return NextResponse.json({ success: false, error: "Inquiry not found." }, { status: 404 });
    }

    // Tenant Isolation: Verify caller belongs to the inquiry's school
    const schoolId = rawData.schoolId || rawData.instituteId;
    const auth = await requireSchoolAdmin(request, schoolId);
    if (auth.errorResponse) return auth.errorResponse;

    return NextResponse.json({ success: true, inquiry: normalizeInquiry(id, rawData) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch inquiry." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ inquiryId: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params).catch(() => ({ inquiryId: "" }));
    const id = resolvedParams.inquiryId;
    if (!id) return NextResponse.json({ success: false, error: "Missing inquiry ID" }, { status: 400 });

    let rawData: any = null;
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      const snap = await adminDb.collection(INQUIRY_COLLECTION).doc(id).get();
      if (snap.exists) rawData = snap.data();
    }
    if (!rawData) {
      const db = getFirebaseDb();
      if (db) {
        const snap = await getDoc(doc(db, INQUIRY_COLLECTION, id));
        if (snap.exists()) rawData = snap.data();
      }
    }
    if (!rawData) {
      return NextResponse.json({ success: false, error: "Inquiry not found." }, { status: 404 });
    }

    // Tenant Isolation
    const schoolId = rawData.schoolId || rawData.instituteId;
    const auth = await requireSchoolAdmin(request, schoolId);
    if (auth.errorResponse) return auth.errorResponse;

    const rateCheck = enforceRateLimit(request, RATE_LIMIT_PROFILES.STANDARD_API, auth.user!.uid);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    const body = await request.json().catch(() => ({}));
    // Prohibit modifying tenant ownership
    const { schoolId: _ignoreSchoolId, instituteId: _ignoreInstId, ...safeBody } = body;
    const updateData = {
      ...safeBody,
      updatedAt: new Date().toISOString(),
    };

    if (adminDb) {
      await adminDb.collection(INQUIRY_COLLECTION).doc(id).set(updateData, { merge: true });
    } else {
      const db = getFirebaseDb();
      if (db) {
        await updateDoc(doc(db, INQUIRY_COLLECTION, id), updateData);
      }
    }

    return NextResponse.json({ success: true, message: "Inquiry updated successfully." });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to update inquiry." }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ inquiryId: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params).catch(() => ({ inquiryId: "" }));
    const id = resolvedParams.inquiryId;
    if (!id) return NextResponse.json({ success: false, error: "Missing inquiry ID" }, { status: 400 });

    let rawData: any = null;
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      const snap = await adminDb.collection(INQUIRY_COLLECTION).doc(id).get();
      if (snap.exists) rawData = snap.data();
    }
    if (!rawData) {
      const db = getFirebaseDb();
      if (db) {
        const snap = await getDoc(doc(db, INQUIRY_COLLECTION, id));
        if (snap.exists()) rawData = snap.data();
      }
    }
    if (!rawData) {
      return NextResponse.json({ success: false, error: "Inquiry not found." }, { status: 404 });
    }

    // Tenant Isolation
    const schoolId = rawData.schoolId || rawData.instituteId;
    const auth = await requireSchoolAdmin(request, schoolId);
    if (auth.errorResponse) return auth.errorResponse;

    const rateCheck = enforceRateLimit(request, RATE_LIMIT_PROFILES.STANDARD_API, auth.user!.uid);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    if (adminDb) {
      await adminDb.collection(INQUIRY_COLLECTION).doc(id).delete();
    } else {
      const db = getFirebaseDb();
      if (db) {
        await deleteDoc(doc(db, INQUIRY_COLLECTION, id));
      }
    }

    return NextResponse.json({ success: true, message: "Inquiry deleted successfully." });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to delete inquiry." }, { status: 500 });
  }
}
