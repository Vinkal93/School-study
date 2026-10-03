import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminAuth, getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs, doc, query, where, limit } from "firebase/firestore";
import { SCHOOL_ADMIN_NAV_ITEMS } from "@/lib/search/navigation-items";

export interface AdminSearchResultItem {
  id: string;
  type: "student" | "teacher" | "receipt" | "account" | "class" | "navigation";
  category: "students" | "teachers" | "fees" | "accounts" | "classes" | "navigation";
  name: string;
  title?: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  url: string;
  metadata?: Record<string, any>;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.toLowerCase().trim() || "";
    const filterCategory = searchParams.get("category")?.toLowerCase() || "all";

    if (!q || q.length < 1) {
      return NextResponse.json({ success: true, count: 0, results: [] });
    }

    // 1. Authorize Caller
    const adminAuth = getSafeAdminAuth();
    if (!adminAuth) return NextResponse.json({ error: "Search service unavailable." }, { status: 503 });
    const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    try { await adminAuth.verifyIdToken(token, true); }
    catch { return NextResponse.json({ error: "Invalid authentication." }, { status: 401 }); }
    const authResult = await authenticateRequest(req);
    const user = authResult.user;
    const isAuthorized = authResult.isAuthenticated && user && (user.role === "school_admin" || user.role === "admin" || user.role === "super_admin");

    const schoolId = user?.schoolId || (user?.role === "super_admin" ? searchParams.get("schoolId") : "") || "";

    if (!isAuthorized) return authResult.errorResponse || NextResponse.json({ error: "Access denied." }, { status: 403 });

    const results: AdminSearchResultItem[] = [];

    // 2. Search Navigation Shortcuts (0ms response)
    if (filterCategory === "all" || filterCategory === "navigation") {
      SCHOOL_ADMIN_NAV_ITEMS.forEach((nav) => {
        const matchTitle = nav.title.toLowerCase().includes(q);
        const matchSub = nav.subtitle.toLowerCase().includes(q);
        const matchKey = nav.keywords.some((k) => k.includes(q) || q.includes(k));

        if (matchTitle || matchSub || matchKey) {
          results.push({
            id: nav.id,
            type: "navigation",
            category: "navigation",
            name: nav.title,
            title: nav.title,
            subtitle: nav.subtitle,
            badge: "Page",
            badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
            url: nav.url,
          });
        }
      });
    }

    if (!schoolId) {
      return NextResponse.json({ success: true, count: results.length, results });
    }

    // 3. Search Database Entities
    const adminDb = getSafeAdminDb();

    if (adminDb) {
      // High-performance Admin SDK queries
      const adminPromises = [];

      // Students
      if (filterCategory === "all" || filterCategory === "students") {
        adminPromises.push(
          adminDb.collection("schools").doc(schoolId).collection("students").limit(100).get()
            .then((snap) => {
              snap.docs.forEach((d) => {
                const s = d.data();
                const name = String(s.name || "");
                const admNo = String(s.admissionNumber || s.studentId || "");
                const roll = s.rollNumber ? String(s.rollNumber) : "";
                const cls = String(s.className || "");
                const sec = String(s.sectionName || "");
                const guardian = String(s.guardianName || s.fatherName || "");
                const phone = String(s.guardianPhone || s.phone || "");
                const email = String(s.email || "");

                if (
                  name.toLowerCase().includes(q) ||
                  admNo.toLowerCase().includes(q) ||
                  (roll && roll === q) ||
                  cls.toLowerCase().includes(q) ||
                  guardian.toLowerCase().includes(q) ||
                  phone.includes(q) ||
                  email.toLowerCase().includes(q)
                ) {
                  results.push({
                    id: d.id,
                    type: "student",
                    category: "students",
                    name,
                    title: name,
                    subtitle: `Class ${cls}${sec ? `-${sec}` : ""} · Reg: ${admNo || d.id}${
                      guardian ? ` · Parent: ${guardian}` : ""
                    }${phone ? ` · 📞 ${phone}` : ""}`,
                    badge: "Student",
                    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                    url: `/admin/students`,
                    metadata: { studentId: d.id, name, admissionNumber: admNo, className: cls },
                  });
                }
              });
            })
            .catch(() => {})
        );
      }

      // Teachers
      if (filterCategory === "all" || filterCategory === "teachers") {
        adminPromises.push(
          adminDb.collection("schools").doc(schoolId).collection("teachers").limit(50).get()
            .then((snap) => {
              snap.docs.forEach((d) => {
                const t = d.data();
                const name = String(t.name || "");
                const empId = String(t.employeeId || "");
                const desig = String(t.designation || "Teacher");
                const phone = String(t.phone || "");
                const email = String(t.email || "");
                const subjects = Array.isArray(t.subjects) ? t.subjects.join(", ") : String(t.specialization || "");

                if (
                  name.toLowerCase().includes(q) ||
                  empId.toLowerCase().includes(q) ||
                  desig.toLowerCase().includes(q) ||
                  phone.includes(q) ||
                  email.toLowerCase().includes(q) ||
                  subjects.toLowerCase().includes(q)
                ) {
                  results.push({
                    id: d.id,
                    type: "teacher",
                    category: "teachers",
                    name,
                    title: name,
                    subtitle: `${desig}${empId ? ` · ID: ${empId}` : ""}${
                      subjects ? ` · (${subjects})` : ""
                    }${phone ? ` · 📞 ${phone}` : ""}`,
                    badge: "Teacher",
                    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
                    url: `/admin/teachers`,
                    metadata: { teacherId: d.id, name, employeeId: empId },
                  });
                }
              });
            })
            .catch(() => {})
        );
      }

      // Fee Receipts
      if (filterCategory === "all" || filterCategory === "fees") {
        adminPromises.push(
          adminDb.collection("financialPayments").where("schoolId", "==", schoolId).limit(50).get()
            .then((snap) => {
              snap.docs.forEach((d) => {
                const p = d.data();
                const rec = String(p.receiptNumber || "");
                const stu = String(p.studentName || "");
                const cls = String(p.className || "");
                const amt = p.amountPaidPaise ? p.amountPaidPaise / 100 : p.amount || 0;
                const period = Array.isArray(p.periodMonths) ? p.periodMonths.join(", ") : String(p.feeMonth || "");

                if (
                  rec.toLowerCase().includes(q) ||
                  stu.toLowerCase().includes(q) ||
                  cls.toLowerCase().includes(q)
                ) {
                  results.push({
                    id: d.id,
                    type: "receipt",
                    category: "fees",
                    name: `Receipt #${rec}`,
                    title: `Receipt #${rec}`,
                    subtitle: `Student: ${stu} (${cls}) · Paid: ₹${amt.toFixed(2)}${
                      period ? ` · ${period}` : ""
                    }`,
                    badge: "Fee Receipt",
                    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                    url: `/admin/fees/paid-slip`,
                    metadata: { receiptNumber: rec, studentName: stu, amount: amt },
                  });
                }
              });
            })
            .catch(() => {})
        );
      }

      await Promise.all(adminPromises);
    } else {
      // Server-side client Firestore fallback
      try {
        const db = getFirebaseDb();
        if (db) {
          const clientPromises = [];

          if (filterCategory === "all" || filterCategory === "students") {
            clientPromises.push(
              getDocs(collection(db, "schools", schoolId, "students"))
                .then((snap) => {
                  snap.docs.forEach((d) => {
                    const s = d.data();
                    const name = String(s.name || "");
                    const admNo = String(s.admissionNumber || s.studentId || "");
                    const roll = s.rollNumber ? String(s.rollNumber) : "";
                    const cls = String(s.className || "");
                    const sec = String(s.sectionName || "");

                    if (
                      name.toLowerCase().includes(q) ||
                      admNo.toLowerCase().includes(q) ||
                      (roll && roll === q) ||
                      cls.toLowerCase().includes(q)
                    ) {
                      results.push({
                        id: d.id,
                        type: "student",
                        category: "students",
                        name,
                        title: name,
                        subtitle: `Class ${cls}${sec ? `-${sec}` : ""} · Reg: ${admNo || d.id}`,
                        badge: "Student",
                        badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                        url: `/admin/students`,
                      });
                    }
                  });
                })
                .catch(() => {})
            );
          }

          if (filterCategory === "all" || filterCategory === "teachers") {
            clientPromises.push(
              getDocs(collection(db, "schools", schoolId, "teachers"))
                .then((snap) => {
                  snap.docs.forEach((d) => {
                    const t = d.data();
                    const name = String(t.name || "");
                    const desig = String(t.designation || "Teacher");

                    if (name.toLowerCase().includes(q) || desig.toLowerCase().includes(q)) {
                      results.push({
                        id: d.id,
                        type: "teacher",
                        category: "teachers",
                        name,
                        title: name,
                        subtitle: `${desig}`,
                        badge: "Teacher",
                        badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
                        url: `/admin/teachers`,
                      });
                    }
                  });
                })
                .catch(() => {})
            );
          }

          await Promise.all(clientPromises);
        }
      } catch (clientErr) {
        // If server client is offline, navigation results are still returned cleanly
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      results: results.slice(0, 35),
    });
  } catch (error: any) {
    console.error("School admin global search notice:", error);
    return NextResponse.json(
      { success: true, count: 0, results: [] }
    );
  }
}
