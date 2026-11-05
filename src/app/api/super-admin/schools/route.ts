import { NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";

export const dynamic = "force-dynamic";

/**
 * GET /api/super-admin/schools
 * Returns full list of registered schools for Super Admin selectors and management.
 * Protected with authoritative Super Admin authorization.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;

    const rateCheck = enforceRateLimit(request, RATE_LIMIT_PROFILES.STANDARD_API, auth.user!.uid);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    let schools: any[] = [];
    const adminDb = getSafeAdminDb();

    if (adminDb) {
      try {
        const snap = await adminDb.collection("schools").get();
        schools = snap.docs.map((doc) => {
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
      } catch (adminErr) {
        console.warn("Notice: adminDb schools fetch notice:", adminErr);
      }
    }

    if (schools.length === 0) {
      try {
        const clientDb = getFirebaseDb();
        if (clientDb) {
          const snap = await getDocs(collection(clientDb, COLLECTIONS.SCHOOLS || "schools")).catch(() => null);
          if (snap && snap.docs) {
            schools = snap.docs.map((doc) => {
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
          }
        }
      } catch (clientErr) {
        console.warn("Notice: clientDb schools fetch notice:", clientErr);
      }
    }

    return NextResponse.json({
      success: true,
      schools,
      total: schools.length,
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/schools error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch schools." },
      { status: 500 }
    );
  }
}
