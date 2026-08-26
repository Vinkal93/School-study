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
  type: "school" | UserRole;
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
    const performerUid = searchParams.get("performerUid");
    const q = searchParams.get("q")?.toLowerCase().trim() || "";

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

    // 2. Fetch Schools and Users in parallel
    const [schoolsSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.SCHOOLS)),
      getDocs(collection(db, COLLECTIONS.USERS)),
    ]);

    const schools = schoolsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as School[];

    const schoolsMap = new Map<string, School>();
    schools.forEach((s) => schoolsMap.set(s.id, s));

    const users = usersSnap.docs.map((d) => ({
      uid: d.id,
      ...d.data(),
    })) as AppUser[];

    const results: GlobalSearchResultItem[] = [];

    // 3. Search Matching Schools
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
          name: school.name,
          subtitle: `Code: ${school.code} · ${school.city || school.email || "School"}`,
          schoolName: school.name,
          schoolCode: school.code,
          status: school.status,
          url: `/super-admin/schools/${school.id}`,
        });
      }
    });

    // 4. Search Matching Users (Admins, Teachers, Students, Super Admins)
    users.forEach((user) => {
      const matchName = user.name?.toLowerCase().includes(q);
      const matchEmail = user.email?.toLowerCase().includes(q);
      const matchUid = user.uid?.toLowerCase().includes(q);

      if (matchName || matchEmail || matchUid) {
        const associatedSchool = user.schoolId ? schoolsMap.get(user.schoolId) : null;

        results.push({
          id: user.uid,
          type: user.role,
          name: user.name,
          subtitle: user.email,
          schoolName: associatedSchool ? associatedSchool.name : "Platform Global",
          schoolCode: associatedSchool ? associatedSchool.code : undefined,
          status: user.status,
          url: `/super-admin/users/${user.uid}`,
        });
      }
    });

    return NextResponse.json({
      success: true,
      count: results.length,
      results: results.slice(0, 30), // Limit top 30 matches for speed
    });
  } catch (error: any) {
    console.error("Global search failed:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error executing search" },
      { status: 500 }
    );
  }
}
