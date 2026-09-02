import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";

/**
 * GET /api/super-admin/schools
 * Returns full list of registered schools for Super Admin selectors and management.
 */
export async function GET() {
  try {
    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json({ error: "Database service unavailable." }, { status: 503 });
    }

    const snap = await getDocs(collection(db, COLLECTIONS.SCHOOLS || "schools"));
    const schools = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || doc.id,
        code: data.code || "",
        adminEmail: data.adminEmail || data.email || "",
        adminName: data.adminName || data.contactPerson || "",
        status: data.status || "active",
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
      };
    });

    schools.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      schools,
      total: schools.length,
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/schools error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch schools list." },
      { status: 500 }
    );
  }
}
