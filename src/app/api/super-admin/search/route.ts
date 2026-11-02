import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminAuth, getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs, limit } from "firebase/firestore";
import { SUPER_ADMIN_NAV_ITEMS } from "@/lib/search/navigation-items";
import type { School, AppUser } from "@/types";

export interface GlobalSearchResultItem {
  id: string;
  type: string;
  category?: "schools" | "users" | "navigation";
  name: string;
  subtitle: string;
  schoolName?: string;
  schoolCode?: string;
  status: string;
  url: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.toLowerCase().trim() || "";
    const category = searchParams.get("category")?.toLowerCase() || "all";

    if (!q || q.length < 1) {
      return NextResponse.json({ success: true, count: 0, results: [] });
    }

    // 1. Authorize Caller (Must be super_admin or authorized developer)
    const adminAuth = getSafeAdminAuth();
    if (!adminAuth) return NextResponse.json({ error: "Search service unavailable." }, { status: 503 });
    const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    try { await adminAuth.verifyIdToken(token, true); }
    catch { return NextResponse.json({ error: "Invalid authentication." }, { status: 401 }); }
    const authResult = await authenticateRequest(req);
    const user = authResult.user;
    const isSuperAdmin = authResult.isAuthenticated && user && user.role === "super_admin";

    if (!isSuperAdmin) return authResult.errorResponse || NextResponse.json({ error: "Access denied." }, { status: 403 });

    const results: GlobalSearchResultItem[] = [];

    // 2. Navigation Shortcuts
    if (category === "all" || category === "navigation") {
      SUPER_ADMIN_NAV_ITEMS.forEach((nav) => {
        const matchName = nav.name.toLowerCase().includes(q);
        const matchSub = nav.subtitle.toLowerCase().includes(q);
        const matchKey = nav.keywords.some((k) => k.includes(q) || q.includes(k));

        if (matchName || matchSub || matchKey) {
          results.push({
            id: nav.id,
            type: "navigation",
            category: "navigation",
            name: nav.name,
            subtitle: nav.subtitle,
            status: "active",
            url: nav.url,
          });
        }
      });
    }

    // 3. Search Database Entities (Schools & Users)
    const adminDb = getSafeAdminDb();

    if (adminDb) {
      const [schoolsSnap, usersSnap] = await Promise.all([
        category === "all" || category === "schools"
          ? adminDb.collection("schools").limit(100).get().catch(() => null)
          : Promise.resolve(null),
        category === "all" || category === "users" || category === "school_admins" || category === "teachers" || category === "students"
          ? adminDb.collection("users").limit(150).get().catch(() => null)
          : Promise.resolve(null),
      ]);

      const schoolsMap = new Map<string, any>();
      if (schoolsSnap) {
        schoolsSnap.docs.forEach((d) => {
          const school = { id: d.id, ...d.data() } as any;
          schoolsMap.set(d.id, school);

          const matchName = school.name?.toLowerCase().includes(q);
          const matchCode = school.code?.toLowerCase().includes(q);
          const matchCity = school.city?.toLowerCase().includes(q);
          const matchEmail = school.email?.toLowerCase().includes(q);
          const matchAdminEmail = school.adminEmail?.toLowerCase().includes(q);

          if (matchName || matchCode || matchCity || matchEmail || matchAdminEmail) {
            results.push({
              id: school.id,
              type: "school",
              category: "schools",
              name: school.name || "School",
              subtitle: `Code: ${school.code || "N/A"} · ${school.city || school.email || "Institution"} · ${school.status || "active"}`,
              schoolName: school.name,
              schoolCode: school.code,
              status: school.status || "active",
              url: `/super-admin/schools/${school.id}`,
            });
          }
        });
      }

      if (usersSnap) {
        usersSnap.docs.forEach((d) => {
          const u = { uid: d.id, ...d.data() } as any;

          if (category === "school_admins" && u.role !== "school_admin") return;
          if (category === "teachers" && u.role !== "teacher") return;
          if (category === "students" && u.role !== "student") return;

          const matchName = u.name?.toLowerCase().includes(q);
          const matchEmail = u.email?.toLowerCase().includes(q);
          const matchUid = u.uid?.toLowerCase().includes(q);
          const phoneVal = u.phone || u.phoneNumber || "";
          const matchPhone = phoneVal ? String(phoneVal).toLowerCase().includes(q) : false;

          if (matchName || matchEmail || matchUid || matchPhone) {
            const associatedSchool = u.schoolId ? schoolsMap.get(u.schoolId) : null;

            results.push({
              id: u.uid,
              type: u.role || "user",
              category: "users",
              name: u.name || u.email || "User",
              subtitle: `${u.email} · Role: ${u.role || "user"}${phoneVal ? ` · 📞 ${phoneVal}` : ""}`,
              schoolName: associatedSchool ? associatedSchool.name : "Platform Global",
              schoolCode: associatedSchool ? associatedSchool.code : undefined,
              status: u.status || "active",
              url: `/super-admin/users/${u.uid}`,
            });
          }
        });
      }
    } else {
      // Server-side fallback: try client SDK safely
      try {
        const db = getFirebaseDb();
        if (db) {
          const [schoolsSnap, usersSnap] = await Promise.all([
            category === "all" || category === "schools"
              ? getDocs(collection(db, "schools")).catch(() => null)
              : Promise.resolve(null),
            category === "all" || category === "users" || category === "school_admins" || category === "teachers" || category === "students"
              ? getDocs(collection(db, "users")).catch(() => null)
              : Promise.resolve(null),
          ]);

          if (schoolsSnap) {
            schoolsSnap.docs.forEach((d) => {
              const school = { id: d.id, ...d.data() } as any;
              const matchName = school.name?.toLowerCase().includes(q);
              const matchCode = school.code?.toLowerCase().includes(q);

              if (matchName || matchCode) {
                results.push({
                  id: school.id,
                  type: "school",
                  category: "schools",
                  name: school.name || "School",
                  subtitle: `Code: ${school.code || "N/A"} · ${school.city || "School"}`,
                  schoolName: school.name,
                  schoolCode: school.code,
                  status: school.status || "active",
                  url: `/super-admin/schools/${school.id}`,
                });
              }
            });
          }

          if (usersSnap) {
            usersSnap.docs.forEach((d) => {
              const u = { uid: d.id, ...d.data() } as any;
              const matchName = u.name?.toLowerCase().includes(q);
              const matchEmail = u.email?.toLowerCase().includes(q);

              if (matchName || matchEmail) {
                results.push({
                  id: u.uid,
                  type: u.role || "user",
                  category: "users",
                  name: u.name || u.email || "User",
                  subtitle: `${u.email} · Role: ${u.role}`,
                  status: u.status || "active",
                  url: `/super-admin/users/${u.uid}`,
                });
              }
            });
          }
        }
      } catch (clientErr) {
        // Navigation results are still preserved
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      results: results.slice(0, 35),
    });
  } catch (error: any) {
    console.error("Super Admin global search notice:", error);
    return NextResponse.json({ success: true, count: 0, results: [] });
  }
}
