import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs, query, where } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import type { StudentProfile } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireSchoolAdmin(req);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const authUser = authResult.user!;
    const schoolId = authUser.schoolId || "";

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const classFilter = searchParams.get("classId") || "all";
    const statusFilter = searchParams.get("status") || "all"; // "all" | "active" | "disabled" | "pending"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "25", 10)));

    let rawStudents: any[] = [];
    const adminDb = getSafeAdminDb();

    if (adminDb) {
      // 1. Fetch from subcollection schools/{schoolId}/students
      const subSnap = await adminDb
        .collection(COLLECTIONS.SCHOOLS)
        .doc(schoolId)
        .collection("students")
        .get();

      if (!subSnap.empty) {
        rawStudents = subSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
        // Fallback: root collection
        const rootSnap = await adminDb
          .collection("students")
          .where("schoolId", "==", schoolId)
          .get();
        rawStudents = rootSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } else {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        const subSnap = await getDocs(collection(clientDb, COLLECTIONS.SCHOOLS, schoolId, "students")).catch(() => null);
        if (subSnap && !subSnap.empty) {
          rawStudents = subSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } else {
          const rootSnap = await getDocs(query(collection(clientDb, "students"), where("schoolId", "==", schoolId))).catch(() => null);
          if (rootSnap && !rootSnap.empty) {
            rawStudents = rootSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          }
        }
      }
    }

    // Exclude soft-deleted students
    const nonDeletedStudents = rawStudents.filter((s) => s.status !== "deleted" && !s.deletedAt);

    // Compute Overall Stats for the School
    let totalAccounts = 0;
    let activeLogins = 0;
    let disabledLogins = 0;
    let pendingProvisioning = 0;

    const classNamesSet = new Set<string>();

    nonDeletedStudents.forEach((s) => {
      totalAccounts++;
      const sStatus = s.status ? String(s.status).toLowerCase() : "active";
      const isPortalActive = sStatus === "active" && s.portalAccess !== false;

      if (!s.userId) {
        pendingProvisioning++;
      }

      if (isPortalActive) {
        activeLogins++;
      } else {
        disabledLogins++;
      }

      if (s.className) {
        classNamesSet.add(s.className);
      }
    });

    const distinctClasses = Array.from(classNamesSet).sort();

    // Apply Filters
    let filtered = nonDeletedStudents.filter((s) => {
      const sStatus = s.status ? String(s.status).toLowerCase() : "active";
      const isPortalActive = sStatus === "active" && s.portalAccess !== false;

      // Status Filter
      if (statusFilter === "active" && !isPortalActive) return false;
      if (statusFilter === "disabled" && isPortalActive) return false;
      if (statusFilter === "pending" && s.userId) return false;

      // Class Filter
      if (classFilter !== "all") {
        const matchesClass = s.className === classFilter || s.classId === classFilter;
        if (!matchesClass) return false;
      }

      // Search Filter
      if (q) {
        const nameMatch = s.name && String(s.name).toLowerCase().includes(q);
        const emailMatch = s.email && String(s.email).toLowerCase().includes(q);
        const studentIdMatch = s.studentId && String(s.studentId).toLowerCase().includes(q);
        const admMatch = s.admissionNumber && String(s.admissionNumber).toLowerCase().includes(q);
        const gPhoneMatch = s.guardianPhone && String(s.guardianPhone).includes(q);
        const phoneMatch = s.phone && String(s.phone).includes(q);

        if (!nameMatch && !emailMatch && !studentIdMatch && !admMatch && !gPhoneMatch && !phoneMatch) {
          return false;
        }
      }

      return true;
    });

    // Sort by name ascending
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedStudents = filtered.slice(startIndex, startIndex + limit).map((s) => {
      const sStatus = s.status ? String(s.status).toLowerCase() : "active";
      const isPortalActive = sStatus === "active" && s.portalAccess !== false;

      return {
        id: s.id,
        name: s.name || "Student",
        studentId: s.studentId || s.admissionNumber || s.id.slice(0, 8),
        admissionNumber: s.admissionNumber || s.studentId || "",
        className: s.className || "",
        sectionName: s.sectionName || "",
        email: s.email || "",
        phone: s.phone || "",
        guardianName: s.guardianName || s.fatherName || "Parent / Guardian",
        guardianPhone: s.guardianPhone || s.phone || "",
        status: isPortalActive ? "active" : "disabled",
        portalAccess: isPortalActive,
        hasAuthAccount: Boolean(s.userId),
        userId: s.userId || null,
        lastPasswordResetAt: s.lastPasswordResetAt || null,
        lastActiveAt: s.lastActiveAt || null,
      };
    });

    return NextResponse.json({
      success: true,
      students: paginatedStudents,
      stats: {
        total: totalAccounts,
        active: activeLogins,
        disabled: disabledLogins,
        pending: pendingProvisioning,
      },
      classes: distinctClasses,
      pagination: {
        page,
        limit,
        total: totalAccounts,
        totalFiltered,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("[API: Manage Login GET]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load student login records." },
      { status: 500 }
    );
  }
}
