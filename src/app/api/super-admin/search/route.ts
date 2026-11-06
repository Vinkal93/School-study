import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { SUPER_ADMIN_NAV_ITEMS } from "@/lib/search/navigation-items";

export interface GlobalSearchResultItem {
  id: string;
  type: string;
  category?: "schools" | "users" | "navigation";
  name: string;
  subtitle: string;
  schoolName?: string;
  schoolCode?: string;
  badge?: string;
  badgeColor?: string;
  status: string;
  url: string;
  score?: number;
}

// In-Memory Search Cache (30s TTL)
interface CacheEntry {
  timestamp: number;
  results: GlobalSearchResultItem[];
}
const SUPER_SEARCH_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function getCachedResults(cacheKey: string): GlobalSearchResultItem[] | null {
  const entry = SUPER_SEARCH_CACHE.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    SUPER_SEARCH_CACHE.delete(cacheKey);
    return null;
  }
  return entry.results;
}

function setCachedResults(cacheKey: string, results: GlobalSearchResultItem[]): void {
  if (SUPER_SEARCH_CACHE.size > 200) {
    const oldest = SUPER_SEARCH_CACHE.keys().next().value;
    if (oldest) SUPER_SEARCH_CACHE.delete(oldest);
  }
  SUPER_SEARCH_CACHE.set(cacheKey, { timestamp: Date.now(), results });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQ = searchParams.get("q")?.trim() || "";
    const q = rawQ.toLowerCase();
    const category = searchParams.get("category")?.toLowerCase() || "all";

    if (!q || q.length < 1) {
      return NextResponse.json({ success: true, count: 0, results: [] });
    }

    // 1. Authorize Caller with resilient auth boundary
    const authResult = await authenticateRequest(req);
    const user = authResult.user;
    const isSuperAdmin = authResult.isAuthenticated && user && user.role === "super_admin";

    if (!isSuperAdmin) {
      return (
        authResult.errorResponse ||
        NextResponse.json({ error: "Access denied." }, { status: 403 })
      );
    }

    const cacheKey = `super:${category}:${q}`;
    const cached = getCachedResults(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        count: cached.length,
        results: cached,
        cached: true,
      });
    }

    const itemsMap = new Map<string, GlobalSearchResultItem>();

    // 2. Navigation Shortcuts
    if (category === "all" || category === "navigation") {
      SUPER_ADMIN_NAV_ITEMS.forEach((nav) => {
        const nameLower = nav.name.toLowerCase();
        const subLower = nav.subtitle.toLowerCase();
        const keyMatch = nav.keywords.some((k) => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));

        let score = 0;
        if (nameLower === q) score = 100;
        else if (nameLower.startsWith(q)) score = 80;
        else if (nameLower.includes(q)) score = 50;
        else if (subLower.includes(q) || keyMatch) score = 30;

        if (score > 0) {
          itemsMap.set(`nav_${nav.id}`, {
            id: nav.id,
            type: "navigation",
            category: "navigation",
            name: nav.name,
            subtitle: nav.subtitle,
            badge: "Page",
            badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
            status: "active",
            url: nav.url,
            score,
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
        category === "all" ||
        category === "users" ||
        category === "school_admins" ||
        category === "teachers" ||
        category === "students"
          ? adminDb.collection("users").limit(150).get().catch(() => null)
          : Promise.resolve(null),
      ]);

      const schoolsMap = new Map<string, any>();
      if (schoolsSnap) {
        schoolsSnap.docs.forEach((d) => {
          const school = { id: d.id, ...d.data() } as any;
          schoolsMap.set(d.id, school);

          const sName = String(school.name || "");
          const sCode = String(school.code || "");
          const sCity = String(school.city || "");
          const sEmail = String(school.email || school.adminEmail || "");

          const nameLower = sName.toLowerCase();
          const codeLower = sCode.toLowerCase();

          let score = 0;
          if (codeLower === q) score = 100;
          else if (nameLower === q) score = 95;
          else if (codeLower.startsWith(q)) score = 85;
          else if (nameLower.startsWith(q)) score = 80;
          else if (nameLower.includes(q) || sCity.toLowerCase().includes(q) || sEmail.toLowerCase().includes(q)) {
            score = 50;
          }

          if (score > 0) {
            itemsMap.set(`school_${school.id}`, {
              id: school.id,
              type: "school",
              category: "schools",
              name: sName || "School",
              subtitle: `Code: ${sCode || "N/A"} · ${sCity || sEmail || "Institution"} · ${school.status || "active"}`,
              schoolName: sName,
              schoolCode: sCode,
              badge: "School",
              badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
              status: school.status || "active",
              url: `/super-admin/schools/${school.id}`,
              score,
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

          const uName = String(u.name || "");
          const uEmail = String(u.email || "");
          const uRole = String(u.role || "user");
          const phoneVal = String(u.phone || u.phoneNumber || "");

          const nameLower = uName.toLowerCase();
          const emailLower = uEmail.toLowerCase();

          let score = 0;
          if (emailLower === q) score = 100;
          else if (nameLower === q) score = 95;
          else if (emailLower.startsWith(q)) score = 85;
          else if (nameLower.startsWith(q)) score = 80;
          else if (phoneVal.includes(q)) score = 60;
          else if (nameLower.includes(q) || emailLower.includes(q)) score = 50;

          if (score > 0) {
            const associatedSchool = u.schoolId ? schoolsMap.get(u.schoolId) : null;

            itemsMap.set(`user_${u.uid}`, {
              id: u.uid,
              type: uRole,
              category: "users",
              name: uName || uEmail || "User",
              subtitle: `${uEmail} · Role: ${uRole}${phoneVal ? ` · 📞 ${phoneVal}` : ""}`,
              schoolName: associatedSchool ? associatedSchool.name : "Platform Global",
              schoolCode: associatedSchool ? associatedSchool.code : undefined,
              badge: uRole.toUpperCase(),
              badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
              status: u.status || "active",
              url: `/super-admin/users/${u.uid}`,
              score,
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
              ? getDocs(query(collection(db, "schools"), limit(50))).catch(() => null)
              : Promise.resolve(null),
            category === "all" ||
            category === "users" ||
            category === "school_admins" ||
            category === "teachers" ||
            category === "students"
              ? getDocs(query(collection(db, "users"), limit(80))).catch(() => null)
              : Promise.resolve(null),
          ]);

          if (schoolsSnap) {
            schoolsSnap.docs.forEach((d) => {
              const school = { id: d.id, ...d.data() } as any;
              const sName = String(school.name || "");
              const sCode = String(school.code || "");

              if (sName.toLowerCase().includes(q) || sCode.toLowerCase().includes(q)) {
                itemsMap.set(`school_${school.id}`, {
                  id: school.id,
                  type: "school",
                  category: "schools",
                  name: sName || "School",
                  subtitle: `Code: ${sCode || "N/A"} · ${school.city || "School"}`,
                  schoolName: sName,
                  schoolCode: sCode,
                  badge: "School",
                  badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
                  status: school.status || "active",
                  url: `/super-admin/schools/${school.id}`,
                });
              }
            });
          }

          if (usersSnap) {
            usersSnap.docs.forEach((d) => {
              const u = { uid: d.id, ...d.data() } as any;
              const uName = String(u.name || "");
              const uEmail = String(u.email || "");

              if (uName.toLowerCase().includes(q) || uEmail.toLowerCase().includes(q)) {
                itemsMap.set(`user_${u.uid}`, {
                  id: u.uid,
                  type: u.role || "user",
                  category: "users",
                  name: uName || uEmail || "User",
                  subtitle: `${uEmail} · Role: ${u.role}`,
                  badge: String(u.role || "user").toUpperCase(),
                  badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
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

    const sorted = Array.from(itemsMap.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 40);

    setCachedResults(cacheKey, sorted);

    return NextResponse.json({
      success: true,
      count: sorted.length,
      results: sorted,
    });
  } catch (error: any) {
    console.error("Super Admin global search notice:", error);
    return NextResponse.json({ success: true, count: 0, results: [] });
  }
}
