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
import type { AppUser } from "@/types";

export interface AdminSearchResultItem {
  id: string;
  type: "student" | "teacher" | "receipt" | "account" | "class" | "navigation";
  category: "students" | "teachers" | "fees" | "accounts" | "classes" | "navigation";
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  url: string;
  metadata?: Record<string, any>;
}

// Admin Navigation Shortcuts
const ADMIN_NAVIGATION_ITEMS: Array<{
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  url: string;
}> = [
  {
    id: "nav_fees_collect",
    title: "Collect Fees",
    subtitle: "Student-wise fee collection & instant receipt",
    keywords: ["fees", "collect", "payment", "cash", "deposit", "receipt", "fee"],
    url: "/admin/fees/collect",
  },
  {
    id: "nav_fees_invoice",
    title: "Generate Fees Invoice",
    subtitle: "Student, class & family 3-voucher bank challans",
    keywords: ["invoice", "challan", "bank", "fees", "generate", "bill"],
    url: "/admin/fees/generate-invoice",
  },
  {
    id: "nav_fees_slips",
    title: "Fees Paid Slips",
    subtitle: "Locate, print & download fee receipts",
    keywords: ["receipt", "slip", "paid", "reprint", "download"],
    url: "/admin/fees/paid-slip",
  },
  {
    id: "nav_fees_defaulters",
    title: "Fees Defaulters",
    subtitle: "Overdue fee dues & follow-up tracking",
    keywords: ["defaulter", "overdue", "pending", "unpaid", "reminder"],
    url: "/admin/fees/defaulters",
  },
  {
    id: "nav_accounts_chart",
    title: "Chart of Accounts",
    subtitle: "Income and expense account heads & categories",
    keywords: ["accounts", "head", "chart", "ledger", "expense", "income"],
    url: "/admin/accounts/chart-of-accounts",
  },
  {
    id: "nav_accounts_income",
    title: "Add Income",
    subtitle: "Record non-fee revenue, grants & sales",
    keywords: ["income", "revenue", "canteen", "donation", "grant"],
    url: "/admin/accounts/add-income",
  },
  {
    id: "nav_accounts_expense",
    title: "Add Expense",
    subtitle: "Record utility bills, fuel, repairs & supplies",
    keywords: ["expense", "bill", "fuel", "diesel", "stationery", "repair"],
    url: "/admin/accounts/add-expense",
  },
  {
    id: "nav_accounts_statement",
    title: "Account Statement",
    subtitle: "General ledger, cash flow & financial PDF report",
    keywords: ["statement", "report", "pnl", "balance", "ledger", "audit"],
    url: "/admin/accounts/statement",
  },
  {
    id: "nav_students_add",
    title: "Add Student (Admission)",
    subtitle: "New student enrollment wizard",
    keywords: ["admission", "student", "enroll", "register", "new"],
    url: "/admin/students/add",
  },
  {
    id: "nav_students_all",
    title: "All Students Directory",
    subtitle: "Search, filter & manage student profiles",
    keywords: ["students", "directory", "nominal", "profiles"],
    url: "/admin/students",
  },
  {
    id: "nav_students_families",
    title: "Student Families",
    subtitle: "Group siblings by guardian / father & contact",
    keywords: ["family", "families", "guardian", "siblings", "parent"],
    url: "/admin/students/families",
  },
  {
    id: "nav_students_id_cards",
    title: "Student ID Cards",
    subtitle: "Batch identity card generator with QR code",
    keywords: ["id", "card", "badge", "identity", "print"],
    url: "/admin/students/id-cards",
  },
  {
    id: "nav_students_admission_letter",
    title: "Admission Letter",
    subtitle: "Formal joining letter & fee agreement",
    keywords: ["letter", "admission", "offer", "joining", "agreement"],
    url: "/admin/students/admission-letter",
  },
  {
    id: "nav_students_login",
    title: "Manage Student Login",
    subtitle: "Portal credentials & WhatsApp pass dispatch",
    keywords: ["login", "password", "credentials", "whatsapp", "portal"],
    url: "/admin/students/manage-login",
  },
  {
    id: "nav_students_promote",
    title: "Promote Students",
    subtitle: "Academic batch roll-over & grade transfer",
    keywords: ["promote", "promotion", "transfer", "session", "batch"],
    url: "/admin/students/promote",
  },
  {
    id: "nav_teachers",
    title: "Teachers & Staff",
    subtitle: "Faculty profiles, subjects & contact info",
    keywords: ["teacher", "faculty", "staff", "employee", "salary"],
    url: "/admin/teachers",
  },
  {
    id: "nav_attendance_students",
    title: "Student Attendance",
    subtitle: "Daily roll-call & absence tracking",
    keywords: ["attendance", "rollcall", "present", "absent", "student"],
    url: "/admin/attendance/students",
  },
  {
    id: "nav_attendance_employees",
    title: "Employee Attendance",
    subtitle: "Staff roll-call & leave register",
    keywords: ["attendance", "staff", "employee", "leave"],
    url: "/admin/attendance/employees",
  },
  {
    id: "nav_timetable",
    title: "Timetable & Bells",
    subtitle: "Period schedules & class bells",
    keywords: ["timetable", "schedule", "bell", "period", "routine"],
    url: "/admin/timetable",
  },
  {
    id: "nav_classes",
    title: "Classes & Sections",
    subtitle: "Classrooms, sections & student capacity",
    keywords: ["class", "section", "grade", "classroom"],
    url: "/admin/classes",
  },
  {
    id: "nav_billing",
    title: "Subscription & Plan",
    subtitle: "View current school ERP plan & limits",
    keywords: ["plan", "billing", "subscription", "upgrade", "pricing"],
    url: "/admin/billing",
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const performerUid = searchParams.get("performerUid");
    const q = searchParams.get("q")?.toLowerCase().trim() || "";
    const filterCategory = searchParams.get("category")?.toLowerCase() || "all";

    if (!performerUid) {
      return NextResponse.json({ error: "Missing performerUid parameter" }, { status: 401 });
    }

    if (!q || q.length < 1) {
      return NextResponse.json({ success: true, count: 0, results: [] });
    }

    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    // 1. Verify User & School Authorization
    const performerSnap = await getDoc(doc(db, COLLECTIONS.USERS, performerUid));
    if (!performerSnap.exists()) {
      return NextResponse.json({ error: "User account not found" }, { status: 403 });
    }

    const performer = performerSnap.data() as AppUser;
    const schoolId = performer.schoolId;

    if (!schoolId && performer.role !== "super_admin") {
      return NextResponse.json({ error: "No school associated with this account." }, { status: 403 });
    }

    const results: AdminSearchResultItem[] = [];

    // 2. Search Navigation Shortcuts (if category is "all" or "navigation")
    if (filterCategory === "all" || filterCategory === "navigation") {
      ADMIN_NAVIGATION_ITEMS.forEach((nav) => {
        const matchTitle = nav.title.toLowerCase().includes(q);
        const matchSub = nav.subtitle.toLowerCase().includes(q);
        const matchKey = nav.keywords.some((k) => k.includes(q) || q.includes(k));

        if (matchTitle || matchSub || matchKey) {
          results.push({
            id: nav.id,
            type: "navigation",
            category: "navigation",
            title: nav.title,
            subtitle: nav.subtitle,
            badge: "Page",
            badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
            url: nav.url,
          });
        }
      });
    }

    // Parallel fetch scoped strictly to this school
    const queries = [];

    // 3. Students
    if (schoolId && (filterCategory === "all" || filterCategory === "students")) {
      const stuRef = collection(db, "schools", schoolId, "students");
      queries.push(
        getDocs(stuRef)
          .catch(async () => {
            // fallback to root collection with where("schoolId", "==", schoolId)
            const fallbackQ = query(
              collection(db, "students"),
              where("schoolId", "==", schoolId),
              limit(100)
            );
            return getDocs(fallbackQ);
          })
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

    // 4. Teachers & Staff
    if (schoolId && (filterCategory === "all" || filterCategory === "teachers")) {
      const teaRef = collection(db, "schools", schoolId, "teachers");
      queries.push(
        getDocs(teaRef)
          .catch(async () => {
            const fallbackQ = query(
              collection(db, "teachers"),
              where("schoolId", "==", schoolId),
              limit(50)
            );
            return getDocs(fallbackQ);
          })
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

    // 5. Fee Receipts
    if (schoolId && (filterCategory === "all" || filterCategory === "fees")) {
      const payRef = collection(db, "schools", schoolId, "financialPayments");
      queries.push(
        getDocs(payRef)
          .catch(async () => {
            const fallbackQ = query(
              collection(db, "financialPayments"),
              where("schoolId", "==", schoolId),
              limit(50)
            );
            return getDocs(fallbackQ);
          })
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

    // 6. Accounts & Vouchers
    if (schoolId && (filterCategory === "all" || filterCategory === "accounts")) {
      const accRef = collection(db, "schools", schoolId, "accountTransactions");
      queries.push(
        getDocs(accRef)
          .then((snap) => {
            snap.docs.forEach((d) => {
              const t = d.data();
              const vNo = String(t.voucherNo || "");
              const head = String(t.headName || "");
              const party = String(t.partyName || "");
              const remarks = String(t.remarks || "");
              const amt = Number(t.amount) || 0;

              if (
                vNo.toLowerCase().includes(q) ||
                head.toLowerCase().includes(q) ||
                party.toLowerCase().includes(q) ||
                remarks.toLowerCase().includes(q)
              ) {
                const isInc = t.type === "INCOME";
                results.push({
                  id: d.id,
                  type: "account",
                  category: "accounts",
                  title: `${t.voucherNo}: ${head}`,
                  subtitle: `${isInc ? "Received from" : "Paid to"}: ${party || "General"} · ₹${amt.toFixed(2)} · ${t.date}`,
                  badge: isInc ? "Income" : "Expense",
                  badgeColor: isInc
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
                  url: `/admin/accounts/statement`,
                  metadata: { voucherNo: vNo, headName: head, amount: amt },
                });
              }
            });
          })
          .catch(() => {})
      );
    }

    // Await all queries
    await Promise.all(queries);

    return NextResponse.json({
      success: true,
      count: results.length,
      results: results.slice(0, 35),
    });
  } catch (error: any) {
    console.error("School admin global search failed:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error executing search" },
      { status: 500 }
    );
  }
}
