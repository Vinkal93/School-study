import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  limit,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import type { AppUser, School, UserRole } from "@/types";

export interface GlobalSearchResultItem {
  id: string;
  type: "school" | "navigation" | UserRole;
  category?: "schools" | "users" | "navigation";
  name: string;
  subtitle: string;
  schoolName?: string;
  schoolCode?: string;
  status: string;
  url: string;
}

const SUPER_ADMIN_NAV_ITEMS: Array<{
  id: string;
  name: string;
  subtitle: string;
  keywords: string[];
  url: string;
}> = [
  {
    id: "nav_schools",
    name: "Schools Directory",
    subtitle: "Manage all onboarded institutions & licenses",
    keywords: ["school", "schools", "institutions", "directory", "license"],
    url: "/super-admin/schools",
  },
  {
    id: "nav_users",
    name: "Platform Users",
    subtitle: "All school admins, teachers, and system accounts",
    keywords: ["users", "accounts", "admin", "teacher", "student", "roles"],
    url: "/super-admin/users",
  },
  {
    id: "nav_finance",
    name: "Finance Center",
    subtitle: "Platform billing, plan subscriptions & revenue overview",
    keywords: ["finance", "billing", "revenue", "plans", "subscriptions"],
    url: "/super-admin/finance",
  },
  {
    id: "nav_inquiries",
    name: "School Inquiries",
    subtitle: "Leads, demo inquiries & registration requests",
    keywords: ["inquiry", "inquiries", "leads", "contact", "demos"],
    url: "/super-admin/inquiries",
  },
  {
    id: "nav_communication",
    name: "Communication Hub",
    subtitle: "Global SMS, WhatsApp gateway, Twilio & dispatch logs",
    keywords: ["communication", "sms", "whatsapp", "twilio", "messaging"],
    url: "/super-admin/communication",
  },
  {
    id: "nav_analytics",
    name: "Platform Analytics",
    subtitle: "Real-time ecosystem metrics & usage trends",
    keywords: ["analytics", "metrics", "reports", "stats", "growth"],
    url: "/super-admin/analytics",
  },
  {
    id: "nav_activity",
    name: "Security & Audit Logs",
    subtitle: "Global login activity & platform audit trails",
    keywords: ["activity", "audit", "security", "logins", "compliance"],
    url: "/super-admin/activity/logins",
  },
  {
    id: "nav_offers",
    name: "Offers & Promotions",
    subtitle: "Coupon codes, discounts & promotional campaigns",
    keywords: ["offers", "promotions", "coupon", "discount", "campaign"],
    url: "/super-admin/offers",
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const performerUid = searchParams.get("performerUid");
    const q = searchParams.get("q")?.toLowerCase().trim() || "";
    const category = searchParams.get("category")?.toLowerCase() || "all";

    if (!performerUid) {
      return NextResponse.json(
        { error: "Missing performerUid parameter" },
        { status: 401 }
      );
    }

    if (!q || q.length < 1) {
      return NextResponse.json({ success: true, count: 0, results: [] });
    }

    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    // 1. Verify Super Admin authorization
    const performerSnap = await getDoc(doc(db, COLLECTIONS.USERS, performerUid));
    if (!performerSnap.exists()) {
      return NextResponse.json({ error: "Performer account not found" }, { status: 403 });
    }

    const performer = performerSnap.data() as AppUser;
    if (performer.role !== "super_admin" || performer.status !== "active") {
      return NextResponse.json(
        { error: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

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

    // 3. Fetch Schools and Users in parallel
    const [schoolsSnap, usersSnap] = await Promise.all([
      category === "all" || category === "schools"
        ? getDocs(collection(db, COLLECTIONS.SCHOOLS))
        : Promise.resolve(null),
      category === "all" || category === "users" || category === "school_admins" || category === "teachers" || category === "students"
        ? getDocs(collection(db, COLLECTIONS.USERS))
        : Promise.resolve(null),
    ]);

    const schoolsMap = new Map<string, School>();
    if (schoolsSnap) {
      const schools = schoolsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as School[];

      schools.forEach((s) => schoolsMap.set(s.id, s));

      // Search Matching Schools
      schools.forEach((school) => {
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
            name: school.name,
            subtitle: `Code: ${school.code} · ${school.city || school.email || "School"} · ${school.status}`,
            schoolName: school.name,
            schoolCode: school.code,
            status: school.status,
            url: `/super-admin/schools/${school.id}`,
          });
        }
      });
    }

    // Search Matching Users
    if (usersSnap) {
      const users = usersSnap.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
      })) as AppUser[];

      users.forEach((user) => {
        if (category === "school_admins" && user.role !== "school_admin") return;
        if (category === "teachers" && user.role !== "teacher") return;
        if (category === "students" && user.role !== "student") return;

        const userAny = user as any;
        const matchName = user.name?.toLowerCase().includes(q);
        const matchEmail = user.email?.toLowerCase().includes(q);
        const matchUid = user.uid?.toLowerCase().includes(q);
        const phoneVal = userAny.phone || userAny.phoneNumber || "";
        const matchPhone = phoneVal ? String(phoneVal).toLowerCase().includes(q) : false;

        if (matchName || matchEmail || matchUid || matchPhone) {
          const associatedSchool = user.schoolId ? schoolsMap.get(user.schoolId) : null;

          results.push({
            id: user.uid,
            type: user.role,
            category: "users",
            name: user.name,
            subtitle: `${user.email} · Role: ${user.role}${
              phoneVal ? ` · 📞 ${phoneVal}` : ""
            }`,
            schoolName: associatedSchool ? associatedSchool.name : "Platform Global",
            schoolCode: associatedSchool ? associatedSchool.code : undefined,
            status: user.status,
            url: `/super-admin/users/${user.uid}`,
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      results: results.slice(0, 35),
    });
  } catch (error: any) {
    console.error("Global search failed:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error executing search" },
      { status: 500 }
    );
  }
}
