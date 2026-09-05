import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  ReportType,
  SchoolReportType,
  SuperAdminReportType,
  ReportFilterOptions,
  ReportDataResult,
  ReportColumnDef,
  ReportSummaryMetric,
} from "@/types/reports";
import { getPlanFeatures } from "@/lib/billing/featureAccess";
import { BILLING_COLLECTIONS } from "@/lib/billing/plans";

/**
 * Report Metadata & Column Definitions Matrix
 */
export const REPORT_CONFIGS: Record<
  ReportType,
  {
    title: string;
    description: string;
    columns: ReportColumnDef[];
    requiredFeature?: string;
  }
> = {
  // School Admin Reports
  STUDENTS: {
    title: "Student Enrollment & Directory Report",
    description: "Detailed breakdown of all enrolled students, admission details, classes, and active statuses.",
    columns: [
      { key: "rollNo", header: "Roll No", type: "string", width: 12 },
      { key: "fullName", header: "Student Name", type: "string", width: 25 },
      { key: "className", header: "Class / Section", type: "string", width: 15 },
      { key: "gender", header: "Gender", type: "string", width: 10 },
      { key: "parentName", header: "Guardian / Parent", type: "string", width: 20 },
      { key: "parentPhone", header: "Contact Number", type: "string", width: 15 },
      { key: "admissionDate", header: "Admission Date", type: "date", width: 15 },
      { key: "status", header: "Status", type: "badge", width: 12 },
    ],
  },
  TEACHERS: {
    title: "Teaching Staff & Faculty Report",
    description: "Directory of faculty members, qualifications, assigned subjects, and employment status.",
    columns: [
      { key: "fullName", header: "Teacher Name", type: "string", width: 25 },
      { key: "email", header: "Email Address", type: "string", width: 25 },
      { key: "phone", header: "Phone", type: "string", width: 15 },
      { key: "subject", header: "Specialization", type: "string", width: 20 },
      { key: "assignedClass", header: "Assigned Class", type: "string", width: 15 },
      { key: "joiningDate", header: "Joining Date", type: "date", width: 15 },
      { key: "status", header: "Status", type: "badge", width: 12 },
    ],
  },
  ATTENDANCE: {
    title: "Attendance & Daily Absence Report",
    description: "Comprehensive attendance tracking, present vs absent ratios, and percentage summary.",
    columns: [
      { key: "date", header: "Date", type: "date", width: 15 },
      { key: "studentName", header: "Student Name", type: "string", width: 25 },
      { key: "className", header: "Class", type: "string", width: 12 },
      { key: "status", header: "Attendance", type: "badge", width: 12 },
      { key: "markedBy", header: "Marked By", type: "string", width: 20 },
    ],
  },
  CLASSES: {
    title: "Classes & Curriculum Structure Report",
    description: "Overview of academic grades, class sections, class teachers, and student capacities.",
    columns: [
      { key: "className", header: "Class Name", type: "string", width: 20 },
      { key: "section", header: "Section", type: "string", width: 10 },
      { key: "classTeacher", header: "Class Teacher", type: "string", width: 25 },
      { key: "studentCount", header: "Total Students", type: "number", width: 15 },
      { key: "capacity", header: "Max Capacity", type: "number", width: 15 },
    ],
  },
  FEES_PAYMENTS: {
    title: "School Fees & Collections Report",
    description: "Financial summary of fee receipts, student ledger dues, and collection records.",
    requiredFeature: "advanced_reports",
    columns: [
      { key: "receiptNo", header: "Receipt / Txn ID", type: "string", width: 18 },
      { key: "studentName", header: "Student Name", type: "string", width: 25 },
      { key: "className", header: "Class", type: "string", width: 12 },
      { key: "amount", header: "Amount Paid (₹)", type: "currency", width: 15 },
      { key: "paymentMethod", header: "Payment Mode", type: "string", width: 15 },
      { key: "paidAt", header: "Date Paid", type: "date", width: 15 },
      { key: "status", header: "Payment Status", type: "badge", width: 12 },
    ],
  },
  INVOICES: {
    title: "School Subscription Invoices Report",
    description: "Ledger of all SaaS subscription invoices and billing records for this institution.",
    columns: [
      { key: "invoiceNumber", header: "Invoice #", type: "string", width: 18 },
      { key: "planName", header: "Plan Tier", type: "string", width: 18 },
      { key: "billingCycle", header: "Cycle", type: "string", width: 12 },
      { key: "amount", header: "Total (₹)", type: "currency", width: 15 },
      { key: "issuedAt", header: "Invoice Date", type: "date", width: 15 },
      { key: "status", header: "Status", type: "badge", width: 12 },
    ],
  },
  ADMISSIONS: {
    title: "New Student Admissions Report",
    description: "Intake volume, admission trends, and enrollment velocity across academic terms.",
    columns: [
      { key: "admissionNo", header: "Admission #", type: "string", width: 15 },
      { key: "studentName", header: "Student Name", type: "string", width: 25 },
      { key: "classApplied", header: "Class", type: "string", width: 12 },
      { key: "guardianContact", header: "Guardian Contact", type: "string", width: 18 },
      { key: "admissionDate", header: "Date Enrolled", type: "date", width: 15 },
      { key: "status", header: "Enrollment Status", type: "badge", width: 15 },
    ],
  },
  ACADEMIC_ACTIVITY: {
    title: "Academic & Notices Activity Report",
    description: "Broadcasted announcements, circulars, and scheduled school events summary.",
    columns: [
      { key: "title", header: "Notice Title", type: "string", width: 30 },
      { key: "audience", header: "Target Audience", type: "string", width: 18 },
      { key: "publishedAt", header: "Published Date", type: "date", width: 15 },
      { key: "authorName", header: "Author", type: "string", width: 20 },
      { key: "status", header: "Status", type: "badge", width: 12 },
    ],
  },

  // Super Admin Global Platform Reports
  GLOBAL_SCHOOLS: {
    title: "Global Platform Schools Report",
    description: "Platform-wide directory of all onboarded schools, admins, active plans, and usage health.",
    columns: [
      { key: "schoolName", header: "School Name", type: "string", width: 25 },
      { key: "adminEmail", header: "Admin Email", type: "string", width: 25 },
      { key: "cityState", header: "Location", type: "string", width: 20 },
      { key: "planName", header: "Current Plan", type: "string", width: 15 },
      { key: "studentCount", header: "Students", type: "number", width: 12 },
      { key: "status", header: "School Status", type: "badge", width: 12 },
      { key: "createdAt", header: "Onboarded", type: "date", width: 15 },
    ],
  },
  GLOBAL_SUBSCRIPTIONS: {
    title: "Platform Subscriptions & Expiries Report",
    description: "Comprehensive lifecycle tracking across all school subscriptions, renewals, and overrides.",
    columns: [
      { key: "schoolName", header: "School Name", type: "string", width: 25 },
      { key: "planName", header: "Plan", type: "string", width: 15 },
      { key: "status", header: "Status", type: "badge", width: 12 },
      { key: "accessMode", header: "Access Mode", type: "badge", width: 15 },
      { key: "expiresAt", header: "Expiry Date", type: "date", width: 15 },
      { key: "daysRemaining", header: "Days Left", type: "number", width: 12 },
      { key: "hasOverride", header: "Override", type: "badge", width: 12 },
    ],
  },
  GLOBAL_REVENUE: {
    title: "Platform Revenue & Financial Settlements Report",
    description: "Gross SaaS subscription collections, payment gateways breakdown, refunds, and net revenue.",
    columns: [
      { key: "paymentId", header: "Payment ID", type: "string", width: 20 },
      { key: "schoolName", header: "School Name", type: "string", width: 25 },
      { key: "amount", header: "Amount (₹)", type: "currency", width: 15 },
      { key: "method", header: "Gateway", type: "string", width: 15 },
      { key: "status", header: "Status", type: "badge", width: 12 },
      { key: "date", header: "Date", type: "date", width: 15 },
    ],
  },
  GLOBAL_USERS: {
    title: "Global User Accounts Directory Report",
    description: "Total cross-platform users breakdown by role (Admins, Teachers, Students).",
    columns: [
      { key: "fullName", header: "Full Name", type: "string", width: 25 },
      { key: "email", header: "Email Address", type: "string", width: 25 },
      { key: "role", header: "Role", type: "badge", width: 15 },
      { key: "schoolName", header: "Associated School", type: "string", width: 25 },
      { key: "status", header: "Status", type: "badge", width: 12 },
      { key: "createdAt", header: "Joined Date", type: "date", width: 15 },
    ],
  },
  GLOBAL_COUPONS: {
    title: "Promotional Coupons & Redemptions Report",
    description: "Active platform discount vouchers, total redemptions, and revenue discounts applied.",
    columns: [
      { key: "code", header: "Coupon Code", type: "string", width: 15 },
      { key: "discount", header: "Discount Value", type: "string", width: 18 },
      { key: "redemptions", header: "Redemptions", type: "number", width: 15 },
      { key: "maxRedemptions", header: "Usage Limit", type: "number", width: 15 },
      { key: "status", header: "Status", type: "badge", width: 12 },
      { key: "expiresAt", header: "Expires On", type: "date", width: 15 },
    ],
  },
  GLOBAL_AUDIT_LOGS: {
    title: "Security & Administrative Audit Logs Report",
    description: "Immutable trail of all super admin adjustments, suspensions, refunds, and access mutations.",
    columns: [
      { key: "timestamp", header: "Timestamp", type: "date", width: 18 },
      { key: "actorId", header: "Actor", type: "string", width: 20 },
      { key: "action", header: "Action Performed", type: "string", width: 25 },
      { key: "targetType", header: "Target", type: "string", width: 18 },
      { key: "targetId", header: "Target ID", type: "string", width: 18 },
    ],
  },
  GLOBAL_INQUIRIES: {
    title: "Contact Inquiries & Sales Pipeline Report",
    description: "Public contact submissions, lead conversion statuses, and geographic distribution.",
    columns: [
      { key: "schoolName", header: "School Name", type: "string", width: 25 },
      { key: "contactPerson", header: "Contact Person", type: "string", width: 20 },
      { key: "email", header: "Email", type: "string", width: 25 },
      { key: "phone", header: "Phone", type: "string", width: 15 },
      { key: "city", header: "City", type: "string", width: 15 },
      { key: "status", header: "Lead Status", type: "badge", width: 15 },
      { key: "createdAt", header: "Inquiry Date", type: "date", width: 15 },
    ],
  },
};

/**
 * Generates an authoritative School Admin report with strict tenant scoping and plan entitlement limits.
 */
export async function generateSchoolReport(
  schoolId: string,
  reportType: SchoolReportType,
  filters: ReportFilterOptions = {},
  userPlanTier: "STARTER" | "PROFESSIONAL" | "ENTERPRISE" = "PROFESSIONAL"
): Promise<ReportDataResult> {
  const db = getFirebaseDb();
  if (!db || !schoolId) throw new Error("Unauthorized or invalid school tenant ID.");

  const config = REPORT_CONFIGS[reportType];
  if (!config) throw new Error(`Unsupported school report type: ${reportType}`);

  // Fetch school details
  let schoolName = "School";
  try {
    const schoolSnap = await getDoc(doc(db, "schools", schoolId));
    if (schoolSnap.exists()) {
      schoolName = schoolSnap.data()?.name || schoolName;
    }
  } catch (e) {}

  // Entitlement Check: Verify if advanced reports feature is active
  const features = await getPlanFeatures(schoolId);
  const isAdvancedReportsEnabled = Boolean(features.advanced_reports || userPlanTier !== "STARTER");

  const rows: Record<string, any>[] = [];
  const summaryMetrics: ReportSummaryMetric[] = [];

  // 1. STUDENTS REPORT
  if (reportType === "STUDENTS") {
    try {
      let snap = await getDocs(query(collection(db, "schools", schoolId, "students")));
      if (snap.empty) {
        snap = await getDocs(query(collection(db, "students"), where("schoolId", "==", schoolId)));
      }
      let activeCount = 0;

      snap.forEach((d) => {
        const s = d.data();
        const rawStatus = String(s.status || "active").toLowerCase();
        const isActive = rawStatus === "active";
        if (isActive) activeCount++;

        // Apply filters
        if (filters.search) {
          const kw = filters.search.toLowerCase().trim();
          const studentName = String(s.name || s.fullName || "").toLowerCase();
          const roll = String(s.rollNumber || s.rollNo || s.studentId || "").toLowerCase();
          const adm = String(s.admissionNumber || s.admissionNo || "").toLowerCase();
          const cls = String(s.className || "").toLowerCase();
          if (!studentName.includes(kw) && !roll.includes(kw) && !adm.includes(kw) && !cls.includes(kw)) return;
        }
        if (filters.status && filters.status !== "all") {
          if (rawStatus !== String(filters.status).toLowerCase()) return;
        }

        const rollDisplay = String(s.rollNumber || s.rollNo || s.studentId || "-");
        const nameDisplay = s.name || s.fullName || "Student";
        const classDisplay = s.className ? `${s.className} ${s.sectionName || s.section || ""}`.trim() : "Unassigned";
        const genderDisplay = s.gender ? String(s.gender).toUpperCase() : "-";
        const parentDisplay = s.parentName || s.fatherName || s.guardianName || "-";
        const phoneDisplay = s.phone || s.parentPhone || s.parentContact || "-";
        const admDateDisplay = s.admissionDate || (s.createdAt ? (s.createdAt.toDate ? s.createdAt.toDate().toLocaleDateString("en-IN") : new Date(s.createdAt).toLocaleDateString("en-IN")) : "-");

        rows.push({
          id: d.id,
          rollNo: rollDisplay,
          fullName: nameDisplay,
          className: classDisplay,
          gender: genderDisplay,
          parentName: parentDisplay,
          parentPhone: phoneDisplay,
          admissionDate: admDateDisplay,
          status: rawStatus.toUpperCase(),
        });
      });

      summaryMetrics.push(
        { label: "Total Students", value: snap.size },
        { label: "Active Enrolled", value: activeCount },
        { label: "Inactive / Transferred", value: snap.size - activeCount }
      );
    } catch (err) {
      console.warn("Students report query error:", err);
    }
  }

  // 2. TEACHERS REPORT
  else if (reportType === "TEACHERS") {
    try {
      let snap = await getDocs(query(collection(db, "schools", schoolId, "teachers")));
      if (snap.empty) {
        snap = await getDocs(query(collection(db, "teachers"), where("schoolId", "==", schoolId)));
      }
      let activeCount = 0;

      snap.forEach((d) => {
        const t = d.data();
        const rawStatus = String(t.status || "active").toLowerCase();
        if (rawStatus === "active") activeCount++;

        if (filters.search) {
          const kw = filters.search.toLowerCase().trim();
          const name = String(t.name || t.fullName || "").toLowerCase();
          const email = String(t.email || "").toLowerCase();
          const subj = String(t.specialization || t.subject || "").toLowerCase();
          if (!name.includes(kw) && !email.includes(kw) && !subj.includes(kw)) return;
        }
        if (filters.status && filters.status !== "all") {
          if (rawStatus !== String(filters.status).toLowerCase()) return;
        }

        rows.push({
          id: d.id,
          fullName: t.name || t.fullName || "Teacher",
          email: t.email || "-",
          phone: t.phone || "-",
          subject: t.specialization || t.subject || "General",
          assignedClass: t.assignedClass || t.className || "-",
          joiningDate: t.joiningDate || (t.createdAt ? (t.createdAt.toDate ? t.createdAt.toDate().toLocaleDateString("en-IN") : new Date(t.createdAt).toLocaleDateString("en-IN")) : "-"),
          status: rawStatus.toUpperCase(),
        });
      });

      summaryMetrics.push(
        { label: "Total Faculty", value: snap.size },
        { label: "Active Staff", value: activeCount }
      );
    } catch (err) {
      console.warn("Teachers report query error:", err);
    }
  }

  // 3. ATTENDANCE REPORT
  else if (reportType === "ATTENDANCE") {
    try {
      let snap = await getDocs(query(collection(db, "attendance"), where("schoolId", "==", schoolId)));
      if (snap.empty) {
        snap = await getDocs(query(collection(db, "schools", schoolId, "attendance")));
      }
      let presentCount = 0;
      let absentCount = 0;

      snap.forEach((d) => {
        const a = d.data();
        const st = String(a.status || "").toUpperCase();
        if (st === "PRESENT") presentCount++;
        else if (st === "ABSENT") absentCount++;

        if (filters.search) {
          const kw = filters.search.toLowerCase().trim();
          const sName = String(a.studentName || "").toLowerCase();
          const cls = String(a.className || "").toLowerCase();
          if (!sName.includes(kw) && !cls.includes(kw)) return;
        }

        rows.push({
          id: d.id,
          date: a.date ? (typeof a.date === "string" ? a.date : new Date(a.date).toLocaleDateString("en-IN")) : "Today",
          studentName: a.studentName || "Student",
          className: a.className ? `${a.className} ${a.sectionName || ""}`.trim() : "Class",
          status: st || "PRESENT",
          markedBy: a.teacherName || a.markedByName || a.markedBy || "Teacher",
        });
      });

      const total = presentCount + absentCount;
      const rate = total > 0 ? Math.round((presentCount / total) * 100) : 100;

      summaryMetrics.push(
        { label: "Total Marked", value: total },
        { label: "Present Records", value: presentCount },
        { label: "Absent Records", value: absentCount },
        { label: "Attendance Rate", value: `${rate}%`, isPositive: rate >= 85 }
      );
    } catch (err) {
      console.warn("Attendance report query error:", err);
    }
  }

  // 4. CLASSES REPORT
  else if (reportType === "CLASSES") {
    try {
      let snap = await getDocs(query(collection(db, "schools", schoolId, "classes")));
      if (snap.empty) {
        snap = await getDocs(query(collection(db, "classes"), where("schoolId", "==", schoolId)));
      }

      snap.forEach((d) => {
        const c = d.data();
        rows.push({
          id: d.id,
          className: c.name || c.className || "Class",
          section: c.section || c.sectionName || "A",
          classTeacher: c.teacherName || c.classTeacher || "Not Assigned",
          studentCount: c.studentCount || (Array.isArray(c.sections) ? c.sections.length : 0),
          capacity: c.capacity || 40,
        });
      });

      summaryMetrics.push({ label: "Total Classes / Sections", value: snap.size });
    } catch (err) {
      console.warn("Classes report query error:", err);
    }
  }

  // 5. FEES / PAYMENTS REPORT
  else if (reportType === "FEES_PAYMENTS") {
    try {
      let snap = await getDocs(query(collection(db, "feePayments"), where("schoolId", "==", schoolId)));
      if (snap.empty) {
        snap = await getDocs(query(collection(db, "schools", schoolId, "feePayments")));
      }
      let totalCollectedRupees = 0;

      snap.forEach((d) => {
        const f = d.data();
        const amt = typeof f.amountPaidRupees === "number" ? f.amountPaidRupees : (typeof f.amount === "number" ? Math.round(f.amount / 100) : 0);
        totalCollectedRupees += amt;

        if (filters.search) {
          const kw = filters.search.toLowerCase().trim();
          const sName = String(f.studentName || "").toLowerCase();
          const rNo = String(f.receiptNumber || f.receiptNo || "").toLowerCase();
          const adm = String(f.admissionNumber || "").toLowerCase();
          if (!sName.includes(kw) && !rNo.includes(kw) && !adm.includes(kw)) return;
        }

        const dateDisplay = f.createdAt ? (f.createdAt.toDate ? f.createdAt.toDate().toLocaleDateString("en-IN") : new Date(f.createdAt).toLocaleDateString("en-IN")) : (f.paidAt ? new Date(f.paidAt).toLocaleDateString("en-IN") : "Recent");

        rows.push({
          id: d.id,
          receiptNo: f.receiptNumber || f.receiptNo || d.id.slice(0, 8).toUpperCase(),
          studentName: f.studentName || "Student",
          className: f.className ? `${f.className} ${f.sectionName || ""}`.trim() : "Class",
          amount: amt,
          paymentMethod: f.paymentMethod || f.method || "Cash",
          paidAt: dateDisplay,
          status: (f.status || "PAID").toUpperCase(),
        });
      });

      summaryMetrics.push(
        { label: "Total Fee Transactions", value: snap.size },
        { label: "Total Collected (₹)", value: totalCollectedRupees.toLocaleString("en-IN") }
      );
    } catch (err) {
      console.warn("Fees report query error:", err);
    }
  }

  // 6. INVOICES REPORT
  else if (reportType === "INVOICES") {
    try {
      const q = query(collection(db, BILLING_COLLECTIONS.INVOICES), where("schoolId", "==", schoolId));
      const snap = await getDocs(q);
      let totalPaidPaise = 0;

      snap.forEach((d) => {
        const inv = d.data();
        const totalAmt = inv.total || inv.amount || 0;
        if (inv.status === "PAID") totalPaidPaise += totalAmt;

        rows.push({
          id: d.id,
          invoiceNumber: inv.invoiceNumber || d.id.slice(0, 10).toUpperCase(),
          planName: inv.planName || "Subscription Plan",
          billingCycle: inv.billingCycle || "MONTHLY",
          amount: Math.round(totalAmt / 100),
          issuedAt: inv.createdAt ? (inv.createdAt.toDate ? inv.createdAt.toDate().toLocaleDateString("en-IN") : new Date(inv.createdAt).toLocaleDateString("en-IN")) : (inv.issuedAt || "Recent"),
          status: inv.status || "PAID",
        });
      });

      summaryMetrics.push(
        { label: "Total Invoices", value: snap.size },
        { label: "Total SaaS Spend (₹)", value: (totalPaidPaise / 100).toLocaleString("en-IN") }
      );
    } catch (err) {
      console.warn("Invoices report query error:", err);
    }
  }

  // 7. ADMISSIONS REPORT
  else if (reportType === "ADMISSIONS") {
    try {
      let snap = await getDocs(query(collection(db, "schools", schoolId, "students")));
      if (snap.empty) {
        snap = await getDocs(query(collection(db, "students"), where("schoolId", "==", schoolId)));
      }

      snap.forEach((d) => {
        const s = d.data();
        const admDate = s.admissionDate || (s.createdAt ? (s.createdAt.toDate ? s.createdAt.toDate().toLocaleDateString("en-IN") : new Date(s.createdAt).toLocaleDateString("en-IN")) : "Recent");
        rows.push({
          id: d.id,
          admissionNo: s.admissionNumber || s.rollNumber || s.studentId || d.id.slice(0, 6).toUpperCase(),
          studentName: s.name || s.fullName || "Student",
          classApplied: s.className ? `${s.className} ${s.sectionName || ""}`.trim() : "Class 1",
          guardianContact: s.phone || s.parentPhone || "-",
          admissionDate: admDate,
          status: "ENROLLED",
        });
      });

      summaryMetrics.push({ label: "Total Admissions", value: snap.size });
    } catch (err) {}
  }

  // 8. ACADEMIC ACTIVITY REPORT
  else if (reportType === "ACADEMIC_ACTIVITY") {
    try {
      const q = query(collection(db, "schools", schoolId, "notices"));
      const snap = await getDocs(q);

      snap.forEach((d) => {
        const n = d.data();
        rows.push({
          id: d.id,
          title: n.title || "Circular",
          audience: n.audience || "ALL",
          publishedAt: n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-IN") : "Recent",
          authorName: n.authorName || "Principal / Admin",
          status: n.status || "PUBLISHED",
        });
      });

      summaryMetrics.push({ label: "Published Circulars & Events", value: snap.size });
    } catch (err) {}
  }

  // Handle Starter Plan Safe Blurred Truncation:
  // If user is on Starter plan and report requires advanced access, only return 3 rows for preview.
  const isRestricted = !isAdvancedReportsEnabled;
  const returnedRows = isRestricted ? rows.slice(0, 3) : rows;

  return {
    reportType,
    title: config.title,
    description: config.description,
    generatedAt: new Date().toISOString(),
    schoolId,
    schoolName,
    totalRecords: rows.length,
    summaryMetrics,
    columns: config.columns,
    rows: returnedRows,
    isRestricted,
    previewLimit: isRestricted ? 3 : undefined,
    requiredPlanFeature: config.requiredFeature,
  };
}

/**
 * Generates Platform-Level Reports for Super Admin with global aggregations.
 */
export async function generateGlobalSuperAdminReport(
  reportType: SuperAdminReportType,
  filters: ReportFilterOptions = {}
): Promise<ReportDataResult> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");

  const config = REPORT_CONFIGS[reportType];
  if (!config) throw new Error(`Unsupported super admin report type: ${reportType}`);

  const rows: Record<string, any>[] = [];
  const summaryMetrics: ReportSummaryMetric[] = [];

  // 1. GLOBAL SCHOOLS
  if (reportType === "GLOBAL_SCHOOLS") {
    try {
      const snap = await getDocs(collection(db, "schools"));
      let activeCount = 0;

      snap.forEach((d) => {
        const s = d.data();
        if (s.status === "ACTIVE" || !s.status) activeCount++;

        rows.push({
          id: d.id,
          schoolName: s.name || "School",
          adminEmail: s.adminEmail || s.email || "N/A",
          cityState: s.city ? `${s.city}, ${s.state || ""}`.trim() : "India",
          planName: s.planTier || "Starter",
          studentCount: s.studentCount || 0,
          status: s.status || "ACTIVE",
          createdAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "N/A",
        });
      });

      summaryMetrics.push(
        { label: "Total Registered Schools", value: snap.size },
        { label: "Active Institutions", value: activeCount }
      );
    } catch (err) {
      console.warn("Global schools query error:", err);
    }
  }

  // 2. GLOBAL SUBSCRIPTIONS
  else if (reportType === "GLOBAL_SUBSCRIPTIONS") {
    try {
      const snap = await getDocs(collection(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS));
      let activeCount = 0;
      let expiredCount = 0;

      snap.forEach((d) => {
        const sub = d.data();
        if (sub.status === "ACTIVE") activeCount++;
        if (sub.status === "EXPIRED") expiredCount++;

        const daysLeft = sub.expiresAt ? Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 86400000)) : 0;

        rows.push({
          id: d.id,
          schoolName: sub.schoolName || sub.schoolId || d.id,
          planName: sub.planName || "Professional",
          status: sub.status || "ACTIVE",
          accessMode: sub.accessMode || "FULL_ACCESS",
          expiresAt: sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("en-IN") : "N/A",
          daysRemaining: daysLeft,
          hasOverride: sub.status === "SUSPENDED" ? "SUSPENDED" : "NORMAL",
        });
      });

      summaryMetrics.push(
        { label: "Total Subscriptions", value: snap.size },
        { label: "Active Paying", value: activeCount },
        { label: "Expired", value: expiredCount }
      );
    } catch (err) {
      console.warn("Global subscriptions query error:", err);
    }
  }

  // 3. GLOBAL REVENUE
  else if (reportType === "GLOBAL_REVENUE") {
    try {
      const snap = await getDocs(collection(db, BILLING_COLLECTIONS.PAYMENTS));
      let grossPaise = 0;

      snap.forEach((d) => {
        const p = d.data();
        const amt = typeof p.amount === "number" ? p.amount : 0;
        if (p.status === "SUCCESS") grossPaise += amt;

        rows.push({
          id: d.id,
          paymentId: p.razorpayPaymentId || d.id.slice(0, 14),
          schoolName: p.schoolName || p.schoolId || "School",
          amount: Math.round(amt / 100),
          method: p.method || "Razorpay Gateway",
          status: p.status || "SUCCESS",
          date: p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "Recent",
        });
      });

      summaryMetrics.push(
        { label: "Total Payment Transactions", value: snap.size },
        { label: "Gross Platform Revenue (₹)", value: (grossPaise / 100).toLocaleString("en-IN") }
      );
    } catch (err) {
      console.warn("Global revenue query error:", err);
    }
  }

  // 4. GLOBAL USERS
  else if (reportType === "GLOBAL_USERS") {
    try {
      const snap = await getDocs(collection(db, "users"));
      snap.forEach((d) => {
        const u = d.data();
        rows.push({
          id: d.id,
          fullName: u.fullName || u.displayName || "User",
          email: u.email || "N/A",
          role: (u.role || "school_admin").toUpperCase(),
          schoolName: u.schoolName || u.schoolId || "Platform",
          status: u.status || "ACTIVE",
          createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "N/A",
        });
      });

      summaryMetrics.push({ label: "Total Platform Users", value: snap.size });
    } catch (err) {}
  }

  // 5. GLOBAL COUPONS
  else if (reportType === "GLOBAL_COUPONS") {
    try {
      const snap = await getDocs(collection(db, "coupons"));
      snap.forEach((d) => {
        const c = d.data();
        const discountStr = c.discountType === "PERCENTAGE" ? `${c.discountValue}% OFF` : `₹${(c.discountValue || 0) / 100} OFF`;
        rows.push({
          id: d.id,
          code: c.code || d.id,
          discount: discountStr,
          redemptions: c.currentRedemptions || 0,
          maxRedemptions: c.maxRedemptions || "Unlimited",
          status: c.status || "ACTIVE",
          expiresAt: c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-IN") : "No Expiry",
        });
      });

      summaryMetrics.push({ label: "Total Created Coupons", value: snap.size });
    } catch (err) {}
  }

  // 6. GLOBAL AUDIT LOGS
  else if (reportType === "GLOBAL_AUDIT_LOGS") {
    try {
      const snap = await getDocs(collection(db, BILLING_COLLECTIONS.AUDIT_LOGS));
      snap.forEach((d) => {
        const a = d.data();
        rows.push({
          id: d.id,
          timestamp: a.timestamp ? new Date(a.timestamp).toLocaleString("en-IN") : "Recent",
          actorId: a.actorId || "System",
          action: (a.action || "SYSTEM_EVENT").replace(/_/g, " "),
          targetType: a.targetType || "Billing",
          targetId: a.targetId || "N/A",
        });
      });

      summaryMetrics.push({ label: "Total Audit Events Recorded", value: snap.size });
    } catch (err) {}
  }

  // 7. GLOBAL INQUIRIES
  else if (reportType === "GLOBAL_INQUIRIES") {
    try {
      const snap = await getDocs(collection(db, "contactInquiries"));
      snap.forEach((d) => {
        const inq = d.data();
        rows.push({
          id: d.id,
          schoolName: inq.schoolName || "Institution",
          contactPerson: inq.name || "Contact",
          email: inq.email || "N/A",
          phone: inq.phone || "N/A",
          city: inq.city || "India",
          status: inq.status || "NEW",
          createdAt: inq.createdAt ? new Date(inq.createdAt).toLocaleDateString("en-IN") : "Recent",
        });
      });

      summaryMetrics.push({ label: "Total Inbound Inquiries", value: snap.size });
    } catch (err) {}
  }

  return {
    reportType,
    title: config.title,
    description: config.description,
    generatedAt: new Date().toISOString(),
    totalRecords: rows.length,
    summaryMetrics,
    columns: config.columns,
    rows,
    isRestricted: false,
  };
}
