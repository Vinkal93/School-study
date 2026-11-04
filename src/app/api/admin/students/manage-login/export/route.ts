import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs, query, where } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { logAuditEvent } from "@/lib/services/audit.service";
import type { AuditAction, AuditTargetType } from "@/types/audit";

export const dynamic = "force-dynamic";

/**
 * Escapes CSV values and defends against CSV Formula Injection (CWE-1236).
 * Any cell starting with =, +, -, @, \t, or \r is prefixed with a single quote.
 */
function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  let str = String(value).trim();

  // Defend against formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape inner double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

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
    const statusFilter = searchParams.get("status") || "all";

    let rawStudents: any[] = [];
    const adminDb = getSafeAdminDb();

    if (adminDb) {
      const subSnap = await adminDb
        .collection(COLLECTIONS.SCHOOLS)
        .doc(schoolId)
        .collection("students")
        .get();

      if (!subSnap.empty) {
        rawStudents = subSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
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
        }
      }
    }

    // Filter students
    const nonDeletedStudents = rawStudents.filter((s) => s.status !== "deleted" && !s.deletedAt);

    let filtered = nonDeletedStudents.filter((s) => {
      const sStatus = s.status ? String(s.status).toLowerCase() : "active";
      const isPortalActive = sStatus === "active" && s.portalAccess !== false;

      if (statusFilter === "active" && !isPortalActive) return false;
      if (statusFilter === "disabled" && isPortalActive) return false;
      if (statusFilter === "pending" && s.userId) return false;

      if (classFilter !== "all") {
        if (s.className !== classFilter && s.classId !== classFilter) return false;
      }

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

    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://school.sbci.online";
    const portalUrl = `${siteUrl}/student/login`;

    const headers = [
      "Student ID",
      "Admission Number",
      "Student Full Name",
      "Class",
      "Section",
      "Roll Number",
      "Portal Login Username / Email",
      "Account Setup Status",
      "Portal Access Status",
      "Guardian Name",
      "Guardian Contact Phone",
      "Portal Login URL",
    ];

    const csvRows: string[] = [headers.map(sanitizeCsvCell).join(",")];

    for (const s of filtered) {
      const isPortalActive = (s.status ? String(s.status).toLowerCase() : "active") === "active" && s.portalAccess !== false;
      const isSetup = Boolean(s.userId);

      const row = [
        s.studentId || s.admissionNumber || s.id,
        s.admissionNumber || "",
        s.name || "Student",
        s.className || "",
        s.sectionName || "",
        s.rollNumber !== undefined && s.rollNumber !== null ? String(s.rollNumber) : "",
        s.email || s.studentId || "",
        isSetup ? "PROVISIONED" : "PENDING SETUP",
        isPortalActive ? "ACTIVE" : "BLOCKED",
        s.guardianName || s.fatherName || "",
        s.guardianPhone || s.phone || "",
        portalUrl,
      ];

      csvRows.push(row.map(sanitizeCsvCell).join(","));
    }

    // Prepend UTF-8 BOM so Excel & Sheets open unicode characters correctly
    const csvContent = "\uFEFF" + csvRows.join("\r\n");

    // Audit Log Entry
    await logAuditEvent({
      actorId: authUser.uid,
      actorName: authUser.name || "School Admin",
      actorEmail: authUser.email,
      actorRole: authUser.role as any,
      actorSchoolId: schoolId,
      action: "STUDENT_LOGIN_ROSTER_EXPORTED" as AuditAction,
      entityType: "student" as AuditTargetType,
      reason: `Exported student login credential roster (${filtered.length} records).`,
      metadata: {
        totalRecords: filtered.length,
        classFilter,
        statusFilter,
      },
    }).catch(() => {});

    const safeDate = new Date().toISOString().split("T")[0];
    const filename = `student_portal_roster_${safeDate}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("[API: Manage Login Export GET]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to export credential slips." },
      { status: 500 }
    );
  }
}
