import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import type {
  FeeStructure,
  StudentFeeAssignment,
  FeePayment,
  FeeDiscount,
  FeeSettings,
  MonthLedgerItem,
  FeeType,
  FeeFrequency,
  FeeFollowUp,
  FeeFollowUpStatus,
} from "@/types";
import { createBillingAuditLog } from "@/lib/billing/audit";
import {
  getFeeDashboardSummary,
  getFeeDefaulters,
  type FeeDashboardSummary,
} from "@/lib/services/fee-analytics.service";
import { appQueryClient } from "@/lib/cache";

const MONTH_NAMES = [
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
];

// ==========================================
// 1. FEE SETTINGS
// ==========================================

export async function getFeeSettings(schoolId: string): Promise<FeeSettings> {
  const defaultSettings: FeeSettings = {
    id: schoolId,
    schoolId,
    currency: "INR",
    receiptPrefix: "REC",
    feeDueDayOfMonth: 10,
    academicSession: "2026-27",
    feeStartMonth: "April",
    billingFrequency: "monthly",
    schoolName: "",
    upiId: "",
    upiNumber: "",
    reminderSettings: {
      enabled: true,
      daysBeforeDue: 3,
      customNote: "Kindly clear pending fee dues to avoid late fee penalties.",
    },
    lateFeeRule: {
      enabled: false, // Strict: Default OFF!
      graceDays: 5,
      type: "FIXED",
      value: 50, // ₹50
      maxLimitPaise: 50000, // ₹500
    },
    paymentMethods: [
      "Cash",
      "UPI",
      "Bank Transfer",
      "Card",
      "Cheque",
      "Online Payment",
      "Other",
    ],
    updatedAt: new Date().toISOString(),
  };

  try {
    const db = getFirebaseDb();
    if (!db) return defaultSettings;

    const snap = await getDoc(doc(db, "feeSettings", schoolId));
    if (snap.exists()) {
      const data = snap.data();
      return {
        ...defaultSettings,
        ...data,
        lateFeeRule: {
          ...defaultSettings.lateFeeRule,
          ...(data.lateFeeRule || {}),
        },
        reminderSettings: {
          ...defaultSettings.reminderSettings,
          ...(data.reminderSettings || {}),
        },
      } as FeeSettings;
    }
    return defaultSettings;
  } catch (err) {
    console.warn("getFeeSettings notice:", err);
    return defaultSettings;
  }
}

export async function updateFeeSettings(
  schoolId: string,
  input: Partial<FeeSettings>,
  actorId: string = "admin"
): Promise<FeeSettings> {
  const current = await getFeeSettings(schoolId);
  const updated: FeeSettings = {
    ...current,
    ...input,
    schoolId,
    lateFeeRule: {
      ...current.lateFeeRule,
      ...(input.lateFeeRule || {}),
    },
    reminderSettings: {
      ...(current.reminderSettings || { enabled: true, daysBeforeDue: 3 }),
      ...(input.reminderSettings || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    await setDoc(doc(db, "feeSettings", schoolId), updated, { merge: true });
  }

  await createBillingAuditLog({
    actorId,
    actorRole: "admin",
    action: "SUBSCRIPTION_UPDATED",
    targetType: "adjustment",
    targetId: schoolId,
    metadata: { schoolId, settings: input },
  }).catch(() => {});

  return updated;
}

// ==========================================
// 2. FEE STRUCTURE MANAGEMENT
// ==========================================

export async function getFeeStructures(
  schoolId: string,
  academicYearId?: string
): Promise<FeeStructure[]> {
  const db = getFirebaseDb();
  if (!db || !schoolId) return [];

  try {
    const q = query(
      collection(db, "feeStructures"),
      where("schoolId", "==", schoolId)
    );
    const snap = await getDocs(q);
    let list = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as FeeStructure
    );

    if (academicYearId) {
      const filtered = list.filter((f) => {
        if (!f.academicYearId || f.academicYearId === "all") return true;
        if (f.academicYearId === academicYearId) return true;
        const aNum = academicYearId.replace(/[^0-9]/g, "");
        const fNum = f.academicYearId.replace(/[^0-9]/g, "");
        if (aNum && fNum && aNum === fNum) return true;
        return false;
      });
      if (filtered.length > 0) {
        list = filtered;
      }
    }
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  } catch (err) {
    console.warn("getFeeStructures notice:", err);
    return [];
  }
}

export async function createFeeStructure(
  schoolId: string,
  input: {
    academicYearId: string;
    academicYearName?: string;
    className: string;
    sectionName?: string;
    feeType: FeeType;
    title: string;
    amountRupees: number;
    frequency: FeeFrequency;
    dueDayOfMonth?: number;
  },
  actorId: string = "admin"
): Promise<FeeStructure> {
  if (!input.title || !input.className || !input.academicYearId) {
    throw new Error("Title, Class, and Academic Year are required.");
  }
  if (input.amountRupees <= 0) {
    throw new Error("Fee amount must be greater than zero.");
  }

  const amountPaise = Math.round(input.amountRupees * 100);
  const now = new Date().toISOString();
  const id = `struct_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const structure: FeeStructure = {
    id,
    schoolId,
    academicYearId: input.academicYearId,
    academicYearName: input.academicYearName || "Current Session",
    className: input.className,
    sectionName: input.sectionName || "all",
    feeType: input.feeType,
    title: input.title,
    amountPaise,
    frequency: input.frequency,
    dueDayOfMonth: input.dueDayOfMonth || 10,
    status: "ACTIVE",
    transactionCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const db = getFirebaseDb();
  if (db) {
    await setDoc(doc(db, "feeStructures", id), structure);
  }

  await createBillingAuditLog({
    actorId,
    actorRole: "admin",
    action: "PLAN_CREATED",
    targetType: "plan",
    targetId: id,
    metadata: { schoolId, title: input.title, amountPaise },
  }).catch(() => {});

  return structure;
}

export async function updateFeeStructure(
  schoolId: string,
  id: string,
  input: Partial<FeeStructure>,
  actorId: string = "admin"
): Promise<FeeStructure> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database not connected.");

  const docRef = doc(db, "feeStructures", id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Fee structure not found.");

  const current = snap.data() as FeeStructure;
  if (current.schoolId !== schoolId) {
    throw new Error("Tenant isolation violation.");
  }

  const updated = {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  };

  await updateDoc(docRef, updated);

  await createBillingAuditLog({
    actorId,
    actorRole: "admin",
    action: "PLAN_UPDATED",
    targetType: "plan",
    targetId: id,
    metadata: { schoolId, updates: input },
  }).catch(() => {});

  return updated;
}

export async function deleteFeeStructure(
  schoolId: string,
  id: string,
  actorId: string = "admin"
): Promise<{ success: boolean }> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database not connected.");

  const docRef = doc(db, "feeStructures", id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return { success: true };

  const current = snap.data() as FeeStructure;
  if (current.schoolId !== schoolId) {
    throw new Error("Tenant isolation violation.");
  }

  // Check if financial transactions depend on this structure
  const paymentsQuery = query(
    collection(db, "feePayments"),
    where("schoolId", "==", schoolId),
    where("feeStructureId", "==", id)
  );
  const paymentsSnap = await getDocs(paymentsQuery);

  if (paymentsSnap.size > 0) {
    throw new Error(
      "Cannot delete fee structure because financial transactions already depend on it. Deactivate it instead."
    );
  }

  await deleteDoc(docRef);

  await createBillingAuditLog({
    actorId,
    actorRole: "admin",
    action: "PLAN_ARCHIVED",
    targetType: "plan",
    targetId: id,
    metadata: { schoolId, title: current.title },
  }).catch(() => {});

  return { success: true };
}

// ==========================================
// 3. RECEIPT NUMBER GENERATION
// ==========================================

export async function generateReceiptNumber(
  schoolId: string,
  prefix: string = "REC"
): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const db = getFirebaseDb();
  let count = 1;

  if (db) {
    try {
      const q = query(
        collection(db, "feePayments"),
        where("schoolId", "==", schoolId)
      );
      const snap = await getDocs(q);
      count = snap.size + 1;
    } catch (e) {}
  }

  const paddedCount = String(count).padStart(4, "0");
  return `${prefix}-${dateStr}-${paddedCount}`;
}

// ==========================================
// 4. LATE FEE SERVER CALCULATION
// ==========================================

export function calculateLateFee(
  amountPaise: number,
  dueDateIso: string,
  settings: FeeSettings,
  nowMs: number = Date.now()
): number {
  if (!settings.lateFeeRule?.enabled) return 0;

  const dueTime = new Date(dueDateIso).getTime();
  const graceEnd = dueTime + (settings.lateFeeRule.graceDays || 5) * 86400000;

  if (nowMs <= graceEnd) return 0;

  let lateFeePaise = 0;
  const ruleAny = settings.lateFeeRule as any;
  if (settings.lateFeeRule.type === "FIXED") {
    if (ruleAny.amountPaise !== undefined) {
      lateFeePaise = ruleAny.amountPaise;
    } else {
      lateFeePaise = Math.round((settings.lateFeeRule.value || 50) * 100);
    }
  } else {
    const pct =
      settings.lateFeeRule.value !== undefined
        ? settings.lateFeeRule.value
        : ruleAny.amountPaise || 5;
    lateFeePaise = Math.round(amountPaise * (pct / 100));
  }

  if (
    settings.lateFeeRule.maxLimitPaise &&
    lateFeePaise > settings.lateFeeRule.maxLimitPaise
  ) {
    lateFeePaise = settings.lateFeeRule.maxLimitPaise;
  }

  return lateFeePaise;
}

// ==========================================
// 5. STUDENT FEE ASSIGNMENT & LEDGER
// ==========================================

export async function getStudentFeeAssignment(
  schoolId: string,
  studentId: string,
  academicYearId?: string
): Promise<StudentFeeAssignment | null> {
  const db = getFirebaseDb();
  if (!db || !schoolId || !studentId) return null;

  try {
    // 1. Try exact docId if academicYearId provided
    if (academicYearId && academicYearId !== "all") {
      const docId = `${schoolId}_${studentId}_${academicYearId}`;
      const snap = await getDoc(doc(db, "studentFeeAssignments", docId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as StudentFeeAssignment;
      }
    }

    // 2. Query collection for schoolId and studentId (resilient session fallback)
    const q = query(
      collection(db, "studentFeeAssignments"),
      where("schoolId", "==", schoolId),
      where("studentId", "==", studentId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StudentFeeAssignment);
      if (academicYearId && academicYearId !== "all") {
        const cleanA = academicYearId.toLowerCase().replace(/[^0-9]/g, "");
        const matched = docs.find((d) => {
          if (d.academicYearId === academicYearId) return true;
          const cleanD = (d.academicYearId || "").toLowerCase().replace(/[^0-9]/g, "");
          return cleanA && cleanD && cleanA === cleanD;
        });
        if (matched) return matched;
      }
      // Return the most recently updated assignment
      docs.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
      return docs[0];
    }
  } catch (e) {
    console.warn("getStudentFeeAssignment notice:", e);
  }

  return null;
}

/**
 * Real-time listener for student fee assignment ledger.
 */
export function subscribeToStudentFeeAssignment(
  schoolId: string,
  studentId: string,
  callback: (assignment: StudentFeeAssignment | null) => void,
  academicYearId: string = "ay_current"
): () => void {
  const db = getFirebaseDb();
  if (!db || !schoolId || !studentId) {
    callback(null);
    return () => {};
  }
  const docId = `${schoolId}_${studentId}_${academicYearId}`;
  return onSnapshot(
    doc(db, "studentFeeAssignments", docId),
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as StudentFeeAssignment);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn("subscribeToStudentFeeAssignment error:", err);
    }
  );
}

/**
 * Real-time listener for student fee payment receipts.
 */
export function subscribeToStudentFeePayments(
  schoolId: string,
  studentId: string,
  callback: (payments: FeePayment[]) => void
): () => void {
  const db = getFirebaseDb();
  if (!db || !schoolId || !studentId) {
    callback([]);
    return () => {};
  }
  const q = query(
    collection(db, "feePayments"),
    where("schoolId", "==", schoolId),
    where("studentId", "==", studentId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FeePayment[];
      list.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
      callback(list);
    },
    (err) => {
      console.warn("subscribeToStudentFeePayments error:", err);
    }
  );
}

export async function getStudentFeePayments(
  schoolId: string,
  studentId: string
): Promise<FeePayment[]> {
  return getFeeTransactions(schoolId, { studentId });
}

export function matchesClass(
  structureClassName: string,
  studentClassName: string
): boolean {
  if (!structureClassName || !studentClassName) return false;
  const s = structureClassName.trim().toLowerCase();
  const st = studentClassName.trim().toLowerCase();
  if (s === "all" || s === "any") return true;
  if (s === st) return true;
  if (s.replace(/\s+/g, "") === st.replace(/\s+/g, "")) return true;
  const sDigits = s.replace(/[^0-9]/g, "");
  const stDigits = st.replace(/[^0-9]/g, "");
  if (sDigits && stDigits && sDigits === stDigits) return true;
  return false;
}

export interface ApplicableFeeResult {
  schoolId: string;
  studentId: string;
  studentName: string;
  className: string;
  academicYearId: string;
  isConfigured: boolean;
  feeStructureTitle?: string;
  baseFeePaise: number;
  baseFeeRupees: number;
  discountPaise: number;
  discountRupees: number;
  lateFeePaise: number;
  lateFeeRupees: number;
  previousDuePaise: number;
  previousDueRupees: number;
  payablePaise: number;
  payableRupees: number;
  totalPaise: number;
  totalRupees: number;
  sourceDescription: string;
}

export interface StudentFeeSummary {
  assignment: StudentFeeAssignment;
  recentPayments: FeePayment[];
  paidMonths: string[];
  lastPaidMonth: string | null;
  pendingMonths: string[];
  nextDueMonth: string | null;
  monthlyFeeRupees: number;
  totalPaidRupees: number;
  totalPendingRupees: number;
  lastPayment: FeePayment | null;
  isConfigured?: boolean;
  feeStructureTitle?: string;
  sourceDescription?: string;
}

export async function getStudentFeeSummary(
  schoolId: string,
  student: {
    id: string;
    name: string;
    admissionNumber?: string;
    className?: string;
    sectionName?: string;
    admissionDate?: string;
  },
  academicYearId: string = "ay_current"
): Promise<StudentFeeSummary> {
  let assignment = await getStudentFeeAssignment(
    schoolId,
    student.id,
    academicYearId
  );
  if (!assignment) {
    assignment = await provisionStudentFeeAssignment(
      schoolId,
      {
        id: student.id,
        name: student.name,
        admissionNumber: student.admissionNumber || student.id,
        className: student.className || "",
        sectionName: student.sectionName || "A",
        admissionDate: student.admissionDate,
      },
      academicYearId
    );
  }

  const payments = await getStudentFeePayments(schoolId, student.id);
  const structures = await getFeeStructures(schoolId, academicYearId);
  const classStructures = structures.filter(
    (s) =>
      s.status === "ACTIVE" &&
      matchesClass(s.className, student.className || "")
  );

  if (
    assignment &&
    assignment.totalAssignedPaise === 0 &&
    classStructures.length > 0
  ) {
    const reconciled = await reconcileStudentFeeLedger(
      schoolId,
      student.id,
      academicYearId
    );
    if (reconciled) assignment = reconciled;
  }

  // Compute monthly rate
  let monthlyFeeRupees = 0;
  let isConfigured = classStructures.length > 0;
  let feeStructureTitle: string | undefined;

  if (isConfigured) {
    classStructures.forEach((s) => {
      if (s.frequency === "monthly") {
        monthlyFeeRupees += s.amountPaise / 100;
        if (!feeStructureTitle) feeStructureTitle = s.title;
      }
    });
  }

  if (monthlyFeeRupees === 0 && assignment) {
    // If ledger has non-zero amount for active months, derive from ledger
    const nonZeroMonth = assignment.monthLedger.find((m) => m.amountPaise > 0);
    if (nonZeroMonth) {
      monthlyFeeRupees = nonZeroMonth.amountPaise / 100;
      isConfigured = true;
    }
  }

  const sourceDescription = isConfigured
    ? `Based on Class ${student.className || "grade"} fee structure`
    : `Fee structure not configured for this class (${student.className || "Unassigned"}).`;

  // Determine paid vs pending
  const paidMonths: string[] = [];
  const pendingMonths: string[] = [];
  let lastPaidMonth: string | null = null;
  let nextDueMonth: string | null = null;

  assignment.monthLedger.forEach((item) => {
    const isActuallyPaid =
      (item.paidAmountPaise > 0 && item.pendingAmountPaise <= 0) ||
      (item.paidAmountPaise >= item.amountPaise && item.amountPaise > 0) ||
      (Array.isArray(item.receiptNumbers) && item.receiptNumbers.length > 0) ||
      (Array.isArray(item.paymentIds) && item.paymentIds.length > 0);

    if (isActuallyPaid) {
      paidMonths.push(item.month);
      lastPaidMonth = item.month;
    } else {
      pendingMonths.push(item.month);
      if (!nextDueMonth) {
        nextDueMonth = item.month;
      }
    }
  });

  const totalPaidRupees = assignment.totalPaidPaise / 100;
  const totalPendingRupees = assignment.totalPendingPaise / 100;
  const lastPayment = payments.length > 0 ? payments[0] : null;

  return {
    assignment,
    recentPayments: payments.slice(0, 5),
    paidMonths,
    lastPaidMonth,
    pendingMonths,
    nextDueMonth,
    monthlyFeeRupees,
    totalPaidRupees,
    totalPendingRupees,
    lastPayment,
    isConfigured,
    feeStructureTitle,
    sourceDescription,
  };
}

/**
 * Authoritative Server Function: getStudentApplicableFee
 * Resolves student -> class -> fee structure -> discounts -> late fee -> payable amount
 * Never silently defaults to ₹500!
 */
export async function getStudentApplicableFee(
  schoolId: string,
  studentId: string,
  academicYearId: string = "ay_current"
): Promise<ApplicableFeeResult> {
  const db = getFirebaseDb();
  let studentDoc: any = null;

  if (db) {
    try {
      const snap = await getDoc(
        doc(db, "schools", schoolId, "students", studentId)
      );
      if (snap.exists()) studentDoc = snap.data();
    } catch (e) {}
  }

  const studentName = studentDoc?.name || "Student";
  const className = studentDoc?.className || "";

  const structures = await getFeeStructures(schoolId, academicYearId);
  const classStructures = structures.filter(
    (s) => s.status === "ACTIVE" && matchesClass(s.className, className)
  );

  const isConfigured = classStructures.length > 0;
  let baseFeePaise = 0;
  let feeStructureTitle = "";

  if (isConfigured) {
    classStructures.forEach((s) => {
      if (s.frequency === "monthly") {
        baseFeePaise += s.amountPaise;
        if (!feeStructureTitle) feeStructureTitle = s.title;
      }
    });
  }

  const assignment = await getStudentFeeAssignment(
    schoolId,
    studentId,
    academicYearId
  );
  const previousDuePaise = assignment?.totalPendingPaise || 0;
  const discountPaise = assignment?.totalDiscountPaise || 0;
  const lateFeePaise = assignment?.totalLateFeePaise || 0;

  const payablePaise = isConfigured
    ? Math.max(0, baseFeePaise - discountPaise + lateFeePaise)
    : 0;
  const totalPaise = payablePaise + previousDuePaise;

  return {
    schoolId,
    studentId,
    studentName,
    className,
    academicYearId,
    isConfigured,
    feeStructureTitle:
      feeStructureTitle ||
      (isConfigured ? `Class ${className} Tuition Fee` : undefined),
    baseFeePaise,
    baseFeeRupees: baseFeePaise / 100,
    discountPaise,
    discountRupees: discountPaise / 100,
    lateFeePaise,
    lateFeeRupees: lateFeePaise / 100,
    previousDuePaise,
    previousDueRupees: previousDuePaise / 100,
    payablePaise,
    payableRupees: payablePaise / 100,
    totalPaise,
    totalRupees: totalPaise / 100,
    sourceDescription: isConfigured
      ? `Based on Class ${className} fee structure`
      : `Fee structure not configured for this class (${className || "Unassigned"}).`,
  };
}

export async function provisionStudentFeeAssignment(
  schoolId: string,
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    className: string;
    sectionName: string;
    admissionDate?: string;
  },
  academicYearId: string = "ay_current",
  fallbackMonthlyFeeRupees?: number
): Promise<StudentFeeAssignment> {
  const [structures, settings] = await Promise.all([
    getFeeStructures(schoolId, academicYearId),
    getFeeSettings(schoolId),
  ]);
  const dueDay = settings?.feeDueDayOfMonth || 10;
  let applicableStructures = structures.filter(
    (s) => s.status === "ACTIVE" && matchesClass(s.className, student.className)
  );

  // If no structures matched this specific session & class, check all structures for school
  if (applicableStructures.length === 0) {
    const allStructures = await getFeeStructures(schoolId);
    applicableStructures = allStructures.filter(
      (s) => s.status === "ACTIVE" && matchesClass(s.className, student.className)
    );
  }

  // Check if student already has an existing assignment so we preserve real payments
  const existingAssignment = await getStudentFeeAssignment(schoolId, student.id, academicYearId);

  const monthLedger: MonthLedgerItem[] = [];
  const startSessionYear =
    parseInt(settings.academicSession?.slice(0, 4) || "") ||
    new Date().getFullYear();

  // Configured start month: default April
  const configuredStartMonth = settings.feeStartMonth || "April";
  const startCycleIdx =
    MONTH_NAMES.indexOf(configuredStartMonth) !== -1
      ? MONTH_NAMES.indexOf(configuredStartMonth)
      : 0;

  const nowTime = Date.now();

  // Generate only months starting from the configured feeStartMonth
  MONTH_NAMES.forEach((m, idx) => {
    // Do not generate or calculate months prior to configured start month
    if (idx < startCycleIdx) {
      return;
    }

    const year = idx >= 9 ? startSessionYear + 1 : startSessionYear;
    const monthNumber = idx >= 9 ? idx - 8 : idx + 4; // April (idx 0 -> 4), Jan (idx 9 -> 1)
    const dueDate = `${year}-${String(monthNumber).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}T00:00:00.000Z`;

    let monthAmountPaise = 0;
    if (applicableStructures.length > 0) {
      applicableStructures.forEach((s) => {
        if (s.frequency === "monthly") monthAmountPaise += s.amountPaise;
        else if (s.frequency === "one_time" && idx === startCycleIdx)
          monthAmountPaise += s.amountPaise;
        else if (s.frequency === "annual" && idx === startCycleIdx)
          monthAmountPaise += s.amountPaise;
      });
    }

    if (monthAmountPaise === 0 && fallbackMonthlyFeeRupees && fallbackMonthlyFeeRupees > 0) {
      monthAmountPaise = fallbackMonthlyFeeRupees * 100;
    }

    // Check if previously paid in existing ledger
    const prevItem = existingAssignment?.monthLedger?.find((p) => p.month.toLowerCase().startsWith(m.toLowerCase()));
    const hasPreviousPayment = prevItem && (
      (prevItem.paidAmountPaise > 0 && prevItem.pendingAmountPaise <= 0) ||
      (prevItem.paidAmountPaise >= monthAmountPaise && monthAmountPaise > 0) ||
      (Array.isArray(prevItem.receiptNumbers) && prevItem.receiptNumbers.length > 0) ||
      (Array.isArray(prevItem.paymentIds) && prevItem.paymentIds.length > 0)
    );

    if (hasPreviousPayment && prevItem) {
      monthLedger.push({
        ...prevItem,
        dueDate,
        amountPaise: prevItem.amountPaise > 0 ? prevItem.amountPaise : monthAmountPaise,
        status: "PAID",
      });
    } else {
      const isPastDue = new Date(dueDate).getTime() < nowTime;
      const prevPaid = (prevItem && prevItem.paidAmountPaise) || 0;
      const prevDiscount = (prevItem && prevItem.discountPaise) || 0;
      const pendingPaise = Math.max(0, monthAmountPaise - prevPaid - prevDiscount);
      monthLedger.push({
        month: `${m} ${year}`,
        dueDate,
        amountPaise: monthAmountPaise,
        paidAmountPaise: prevPaid,
        discountPaise: prevDiscount,
        lateFeePaise: (prevItem && prevItem.lateFeePaise) || 0,
        pendingAmountPaise: pendingPaise,
        status: isPastDue ? "OVERDUE" : "PENDING",
        paymentIds: (prevItem && prevItem.paymentIds) || [],
        receiptNumbers: (prevItem && prevItem.receiptNumbers) || [],
      });
    }
  });

  const totalAssignedPaise = monthLedger.reduce(
    (sum, item) => sum + item.amountPaise,
    0
  );
  const totalPaidPaise = monthLedger.reduce(
    (sum, item) => sum + item.paidAmountPaise,
    0
  );
  const totalPendingPaise = monthLedger.reduce(
    (sum, item) => sum + item.pendingAmountPaise,
    0
  );

  const assignment: StudentFeeAssignment = {
    id: `${schoolId}_${student.id}_${academicYearId}`,
    schoolId,
    studentId: student.id,
    studentName: student.name,
    admissionNumber: student.admissionNumber || student.id,
    className: student.className,
    sectionName: student.sectionName || "A",
    academicYearId,
    academicYearName:
      settings.academicSession || `${startSessionYear}-${startSessionYear + 1}`,
    feeStructureIds: applicableStructures.map((s) => s.id),
    totalAssignedPaise,
    totalPaidPaise,
    totalDiscountPaise: 0,
    totalLateFeePaise: 0,
    totalPendingPaise,
    monthLedger,
    status: totalPendingPaise === 0 && totalAssignedPaise > 0 ? "PAID" : "PENDING",
    lastPaymentDate: existingAssignment?.lastPaymentDate || null,
    updatedAt: new Date().toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    await setDoc(doc(db, "studentFeeAssignments", assignment.id), assignment, {
      merge: true,
    });
  }

  return assignment;
}

/**
 * Safely reconciles an existing student fee assignment:
 * - If fee structure was added/updated after student assignment was created with 0 rates:
 * - Updates only unadjusted, unpaid months with the actual fee structure amount.
 * - NEVER alters months that have `isManuallyAdjusted: true` or `paidAmountPaise > 0` or verified receipts!
 */
export async function reconcileStudentFeeLedger(
  schoolId: string,
  studentId: string,
  academicYearId: string = "ay_current",
  fallbackMonthlyFeeRupees?: number
): Promise<StudentFeeAssignment | null> {
  const db = getFirebaseDb();
  if (!db) return null;

  const docId = `${schoolId}_${studentId}_${academicYearId}`;
  const assignRef = doc(db, "studentFeeAssignments", docId);
  const snap = await getDoc(assignRef);
  if (!snap.exists()) return null;

  const current = snap.data() as StudentFeeAssignment;
  const [structures, settings] = await Promise.all([
    getFeeStructures(schoolId, academicYearId),
    getFeeSettings(schoolId),
  ]);

  let applicableStructures = structures.filter(
    (s) => s.status === "ACTIVE" && matchesClass(s.className, current.className)
  );
  if (applicableStructures.length === 0) {
    const allStructures = await getFeeStructures(schoolId);
    applicableStructures = allStructures.filter(
      (s) => s.status === "ACTIVE" && matchesClass(s.className, current.className)
    );
  }

  let monthlyPaise = 0;
  applicableStructures.forEach((s) => {
    if (s.frequency === "monthly") monthlyPaise += s.amountPaise;
  });

  if (monthlyPaise === 0 && fallbackMonthlyFeeRupees && fallbackMonthlyFeeRupees > 0) {
    monthlyPaise = fallbackMonthlyFeeRupees * 100;
  }

  const nowTime = Date.now();
  let hasModifications = false;
  const updatedLedger = current.monthLedger.map((item) => {
    // 1. Never overwrite if manually adjusted by School Admin
    if (item.isManuallyAdjusted) return item;
    // 2. Never overwrite if real payments or receipts exist
    if (
      item.paidAmountPaise > 0 ||
      (item.paymentIds && item.paymentIds.length > 0) ||
      (item.receiptNumbers && item.receiptNumbers.length > 0)
    ) {
      return item;
    }
    // 3. If month was previously generated with 0 rate, or falsely marked PAID with no payment
    const isFalsePaid = item.status === "PAID" && item.paidAmountPaise === 0 && (!item.receiptNumbers || item.receiptNumbers.length === 0);
    if ((item.amountPaise === 0 && monthlyPaise > 0) || isFalsePaid) {
      hasModifications = true;
      const rate = monthlyPaise > 0 ? monthlyPaise : item.amountPaise;
      const discount = item.discountPaise || 0;
      const pending = Math.max(0, rate - discount);
      const isPastDue = new Date(item.dueDate).getTime() < nowTime;
      return {
        ...item,
        amountPaise: rate,
        pendingAmountPaise: pending,
        paidAmountPaise: 0,
        status: (pending === 0
          ? "PAID"
          : isPastDue
          ? "OVERDUE"
          : "PENDING") as MonthLedgerItem["status"],
      };
    }
    return item;
  });

  if (!hasModifications) return current;

  const totalAssignedPaise = updatedLedger.reduce(
    (sum, m) => sum + m.amountPaise,
    0
  );
  const totalPaidPaise = updatedLedger.reduce(
    (sum, m) => sum + m.paidAmountPaise,
    0
  );
  const totalDiscountPaise = updatedLedger.reduce(
    (sum, m) => sum + m.discountPaise,
    0
  );
  const totalLateFeePaise = updatedLedger.reduce(
    (sum, m) => sum + m.lateFeePaise,
    0
  );
  const totalPendingPaise = updatedLedger.reduce(
    (sum, m) => sum + m.pendingAmountPaise,
    0
  );

  const updated: StudentFeeAssignment = {
    ...current,
    monthLedger: updatedLedger,
    feeStructureIds: applicableStructures.map((s) => s.id),
    totalAssignedPaise,
    totalPaidPaise,
    totalDiscountPaise,
    totalLateFeePaise,
    totalPendingPaise,
    status:
      totalPendingPaise === 0
        ? "PAID"
        : totalPaidPaise > 0
          ? "PARTIAL"
          : "PENDING",
    updatedAt: new Date().toISOString(),
  };

  await setDoc(assignRef, updated, { merge: true });
  return updated;
}

/**
 * Initial Fee Setup & Admin Month Adjustment:
 * Allows School Admin to manually set/correct:
 * - Expected Fee
 * - Paid Amount
 * - Discount
 * - Previous Due
 * - Late Fee
 * Sets `isManuallyAdjusted: true` on that month, ensuring future automated calculations
 * NEVER overwrite this corrected state.
 */
export async function adjustStudentMonthLedger(
  schoolId: string,
  studentId: string,
  monthName: string, // e.g. "April 2026"
  adjustment: {
    expectedFeeRupees: number;
    paidAmountRupees: number;
    discountRupees: number;
    previousDueRupees?: number;
    lateFeeRupees?: number;
    notes?: string;
  },
  actorId: string = "school_admin",
  academicYearId: string = "ay_current"
): Promise<StudentFeeAssignment> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database not connected.");

  const docId = `${schoolId}_${studentId}_${academicYearId}`;
  const assignRef = doc(db, "studentFeeAssignments", docId);
  const snap = await getDoc(assignRef);
  if (!snap.exists()) {
    throw new Error("Student fee assignment record not found.");
  }

  const current = snap.data() as StudentFeeAssignment;

  const expectedPaise = Math.round(
    Math.max(0, adjustment.expectedFeeRupees) * 100
  );
  const paidPaise = Math.round(Math.max(0, adjustment.paidAmountRupees) * 100);
  const discountPaise = Math.round(
    Math.max(0, adjustment.discountRupees) * 100
  );
  const lateFeePaise = Math.round(
    Math.max(0, adjustment.lateFeeRupees || 0) * 100
  );
  const previousDuePaise = Math.round(
    Math.max(0, adjustment.previousDueRupees || 0) * 100
  );

  const pendingPaise = Math.max(
    0,
    expectedPaise +
      lateFeePaise +
      previousDuePaise -
      (paidPaise + discountPaise)
  );
  let newStatus: MonthLedgerItem["status"] = "PENDING";
  if (pendingPaise === 0) newStatus = "PAID";
  else if (paidPaise > 0 || discountPaise > 0) newStatus = "PARTIAL";

  let found = false;
  const updatedLedger = current.monthLedger.map((item) => {
    if (item.month === monthName) {
      found = true;
      return {
        ...item,
        amountPaise: expectedPaise,
        paidAmountPaise: paidPaise,
        discountPaise,
        lateFeePaise,
        previousDuePaise,
        pendingAmountPaise: pendingPaise,
        status: newStatus,
        isManuallyAdjusted: true,
        adjustmentNote: adjustment.notes || "Admin manual ledger adjustment",
      };
    }
    return item;
  });

  if (!found) {
    throw new Error(`Month "${monthName}" not found in student's fee ledger.`);
  }

  const totalAssignedPaise = updatedLedger.reduce(
    (sum, m) => sum + m.amountPaise,
    0
  );
  const totalPaidPaise = updatedLedger.reduce(
    (sum, m) => sum + m.paidAmountPaise,
    0
  );
  const totalDiscountPaise = updatedLedger.reduce(
    (sum, m) => sum + m.discountPaise,
    0
  );
  const totalLateFeePaise = updatedLedger.reduce(
    (sum, m) => sum + m.lateFeePaise,
    0
  );
  const totalPendingPaise = updatedLedger.reduce(
    (sum, m) => sum + m.pendingAmountPaise,
    0
  );

  const updatedAssignment: StudentFeeAssignment = {
    ...current,
    monthLedger: updatedLedger,
    totalAssignedPaise,
    totalPaidPaise,
    totalDiscountPaise,
    totalLateFeePaise,
    totalPendingPaise,
    status:
      totalPendingPaise === 0
        ? "PAID"
        : totalPaidPaise > 0
          ? "PARTIAL"
          : "PENDING",
    updatedAt: new Date().toISOString(),
  };

  await setDoc(assignRef, updatedAssignment, { merge: true });

  await createBillingAuditLog({
    actorId,
    actorRole: "admin",
    action: "SUBSCRIPTION_UPDATED",
    targetType: "adjustment",
    targetId: `${studentId}_${monthName}`,
    metadata: {
      schoolId,
      studentId,
      month: monthName,
      adjustment,
      totalPendingPaise,
    },
  }).catch(() => {});

  return updatedAssignment;
}

/**
 * Recalculates future unpaid dues for a student (e.g. after class transfer or class fee modification).
 * CRITICAL RULE: NEVER alters or deletes past paid transactions, receipts, or PAID ledger months,
 * and NEVER overwrites months that have `isManuallyAdjusted: true`!
 */
export async function recalculateStudentFutureDues(
  schoolId: string,
  studentId: string,
  newClassName: string,
  effectiveDateIso: string = new Date().toISOString(),
  academicYearId: string = "ay_current"
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  const docId = `${schoolId}_${studentId}_${academicYearId}`;
  const assignRef = doc(db, "studentFeeAssignments", docId);
  const snap = await getDoc(assignRef);
  if (!snap.exists()) return;

  const currentAssignment = snap.data() as StudentFeeAssignment;
  const structures = await getFeeStructures(schoolId, academicYearId);
  const newClassStructures = structures.filter(
    (s) =>
      s.status === "ACTIVE" &&
      (s.className === "all" || s.className === newClassName)
  );

  let newMonthlyFeePaise = 0;
  newClassStructures.forEach((s) => {
    if (s.frequency === "monthly") newMonthlyFeePaise += s.amountPaise;
  });

  const updatedLedger = currentAssignment.monthLedger.map((item) => {
    // If month is already fully PAID or manually adjusted by School Admin, do not alter it!
    if (item.status === "PAID" || item.isManuallyAdjusted) return item;

    // Recalculate pending month with new class monthly fee
    const revisedAmount = newMonthlyFeePaise;
    const pendingAmount = Math.max(
      0,
      revisedAmount - item.paidAmountPaise - item.discountPaise
    );

    return {
      ...item,
      amountPaise: revisedAmount,
      pendingAmountPaise: pendingAmount,
      status: (pendingAmount <= 0
        ? "PAID"
        : item.paidAmountPaise > 0
          ? "PARTIAL"
          : "PENDING") as any,
    };
  });

  const totalAssignedPaise = updatedLedger.reduce(
    (sum, item) => sum + item.amountPaise,
    0
  );
  const totalPaidPaise = updatedLedger.reduce(
    (sum, item) => sum + item.paidAmountPaise,
    0
  );
  const totalDiscountPaise = updatedLedger.reduce(
    (sum, item) => sum + item.discountPaise,
    0
  );
  const totalLateFeePaise = updatedLedger.reduce(
    (sum, item) => sum + item.lateFeePaise,
    0
  );
  const totalPendingPaise = updatedLedger.reduce(
    (sum, item) => sum + item.pendingAmountPaise,
    0
  );

  await updateDoc(assignRef, {
    className: newClassName,
    monthLedger: updatedLedger,
    totalAssignedPaise,
    totalPaidPaise,
    totalDiscountPaise,
    totalLateFeePaise,
    totalPendingPaise,
    status:
      totalPendingPaise <= 0
        ? "PAID"
        : totalPaidPaise > 0
          ? "PARTIAL"
          : "PENDING",
    updatedAt: new Date().toISOString(),
  });
}

// ==========================================
// 6. COLLECT FEE PAYMENT (Authoritative Server Logic)
// ==========================================

export async function collectFeePayment(
  schoolId: string,
  input: {
    studentId: string;
    studentName: string;
    admissionNumber: string;
    className: string;
    sectionName: string;
    academicYearId: string;
    feeType: FeeType;
    periodMonths: string[];
    amountPaidRupees: number;
    discountRupees?: number;
    paymentMethod: FeePayment["paymentMethod"];
    transactionRef?: string;
    remarks?: string;
    paymentDate?: string;
  },
  actorId: string = "admin"
): Promise<{ success: boolean; payment: FeePayment; receiptNumber: string }> {
  if (input.amountPaidRupees <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const settings = await getFeeSettings(schoolId);
  const receiptNumber = await generateReceiptNumber(
    schoolId,
    settings.receiptPrefix || "REC"
  );

  const amountPaidPaise = Math.round(input.amountPaidRupees * 100);
  const discountPaise = Math.round((input.discountRupees || 0) * 100);

  // Authoritative server-side student fee assignment lookup & update
  let assignment = await getStudentFeeAssignment(
    schoolId,
    input.studentId,
    input.academicYearId
  );
  if (!assignment) {
    assignment = await provisionStudentFeeAssignment(
      schoolId,
      {
        id: input.studentId,
        name: input.studentName,
        admissionNumber: input.admissionNumber,
        className: input.className,
        sectionName: input.sectionName,
      },
      input.academicYearId
    );
  }

  // Calculate late fee for selected period months
  let lateFeePaise = 0;
  const now = new Date();
  const nowMs = now.getTime();

  assignment.monthLedger.forEach((item) => {
    if (input.periodMonths.includes(item.month) && item.status !== "PAID") {
      lateFeePaise += calculateLateFee(
        item.amountPaise,
        item.dueDate,
        settings,
        nowMs
      );
    }
  });

  const netAmountPaise = amountPaidPaise + lateFeePaise - discountPaise;
  const nowIso = input.paymentDate || now.toISOString();
  const paymentId = `pay_fee_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const payment: FeePayment = {
    id: paymentId,
    schoolId,
    receiptNumber,
    studentId: input.studentId,
    studentName: input.studentName,
    admissionNumber: input.admissionNumber,
    className: input.className,
    sectionName: input.sectionName,
    academicYearId: input.academicYearId,
    feeType: input.feeType,
    periodMonths: input.periodMonths,
    amountPaidPaise,
    discountPaise,
    lateFeePaise,
    netAmountPaise,
    paymentMethod: input.paymentMethod,
    transactionRef: input.transactionRef || "",
    remarks: input.remarks || "",
    paymentDate: nowIso,
    collectedBy: actorId,
    collectedByName: actorId,
    status: "SUCCESS",
    createdAt: nowIso,
  };

  // Update Month Ledger
  let remainingPaidPaise = amountPaidPaise;
  let remainingDiscountPaise = discountPaise;

  assignment.monthLedger = assignment.monthLedger.map((item) => {
    if (input.periodMonths.includes(item.month)) {
      // If item.amountPaise is 0 or less than payment, ensure it reflects at least the fee being collected
      const allocatedAmount = Math.max(
        item.amountPaise,
        Math.round(amountPaidPaise / Math.max(1, input.periodMonths.length))
      );
      if (item.amountPaise < allocatedAmount) {
        item.amountPaise = allocatedAmount;
        item.pendingAmountPaise = Math.max(
          0,
          item.amountPaise - item.paidAmountPaise - item.discountPaise
        );
      }

      const needed =
        item.pendingAmountPaise > 0
          ? item.pendingAmountPaise
          : item.amountPaise;
      const curDiscount = Math.min(needed, remainingDiscountPaise);
      remainingDiscountPaise -= curDiscount;

      const curPaid = Math.min(needed - curDiscount, remainingPaidPaise);
      remainingPaidPaise -= curPaid;

      const newPaid = item.paidAmountPaise + curPaid;
      const newDiscount = item.discountPaise + curDiscount;
      const newPending = Math.max(
        0,
        item.amountPaise - (newPaid + newDiscount)
      );

      let newStatus: MonthLedgerItem["status"] = "PENDING";
      if (newPending === 0) newStatus = "PAID";
      else if (newPaid > 0 || newDiscount > 0) newStatus = "PARTIAL";

      return {
        ...item,
        paidAmountPaise: newPaid,
        discountPaise: newDiscount,
        lateFeePaise: item.lateFeePaise + lateFeePaise,
        pendingAmountPaise: newPending,
        status: newStatus,
        paymentIds: [...(item.paymentIds || []), paymentId],
        receiptNumbers: [...(item.receiptNumbers || []), receiptNumber],
      };
    }
    return item;
  });

  assignment.totalAssignedPaise = assignment.monthLedger.reduce(
    (sum, item) => sum + item.amountPaise,
    0
  );
  assignment.totalPaidPaise += amountPaidPaise;
  assignment.totalDiscountPaise += discountPaise;
  assignment.totalLateFeePaise += lateFeePaise;
  assignment.totalPendingPaise = Math.max(
    0,
    assignment.totalAssignedPaise -
      (assignment.totalPaidPaise + assignment.totalDiscountPaise)
  );
  assignment.lastPaymentDate = nowIso;

  payment.remainingDuePaise = assignment.totalPendingPaise;

  if (assignment.totalPendingPaise === 0) assignment.status = "PAID";
  else if (assignment.totalPaidPaise > 0) assignment.status = "PARTIAL";

  // Firestore Writes & Financial Ledger Integration
  const db = getFirebaseDb();
  if (db) {
    // 1. Write to feePayments
    await setDoc(doc(db, "feePayments", paymentId), payment);

    // 2. Write to financialPayments (Unified Foundation collection)
    const financialPaymentData = {
      id: paymentId,
      receiptNumber,
      schoolId,
      studentId: input.studentId,
      studentName: input.studentName,
      admissionNumber: input.admissionNumber,
      className: input.className,
      sectionName: input.sectionName,
      academicYearId: input.academicYearId,
      amountPaise: amountPaidPaise,
      amountPaidPaise: amountPaidPaise,
      netAmountPaise: amountPaidPaise,
      discountPaise,
      lateFeePaise,
      paymentDate: nowIso,
      paymentMethod: (input.paymentMethod || "CASH").toUpperCase(),
      referenceNumber: input.transactionRef || "",
      transactionRef: input.transactionRef || "",
      collectedBy: actorId,
      collectedByName: actorId,
      status: "SUCCESS",
      remarks: input.remarks || "",
      allocatedTotalPaise: amountPaidPaise,
      unallocatedPaise: 0,
      allocationCount: input.periodMonths.length,
      periodMonths: input.periodMonths,
      remainingDuePaise: assignment.totalPendingPaise,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await setDoc(doc(db, "financialPayments", paymentId), financialPaymentData).catch(() => {});
    await setDoc(doc(db, "schools", schoolId, "financialPayments", paymentId), financialPaymentData).catch(() => {});

    // 3. Update student fee assignment
    await setDoc(doc(db, "studentFeeAssignments", assignment.id), assignment, {
      merge: true,
    });

    // 4. Financial Ledger Record
    await setDoc(doc(db, "financeTransactions", paymentId), {
      id: paymentId,
      schoolId,
      type: "FEE_COLLECTION",
      amountPaise: amountPaidPaise,
      currency: "INR",
      receiptNumber,
      studentId: input.studentId,
      studentName: input.studentName,
      feeType: input.feeType,
      paymentMethod: input.paymentMethod,
      actorId,
      createdAt: nowIso,
    }).catch(() => {});

    // 5. Invalidate dashboard query cache so metrics update live
    try {
      appQueryClient.invalidateCache("feeDashboardOverview*");
    } catch {}
  }

  await createBillingAuditLog({
    actorId,
    actorRole: "admin",
    action: "SUBSCRIPTION_ACTIVATED",
    targetType: "invoice",
    targetId: paymentId,
    metadata: {
      schoolId,
      studentId: input.studentId,
      amountPaidPaise,
      receiptNumber,
    },
  }).catch(() => {});

  return { success: true, payment, receiptNumber };
}

// ==========================================
// 7. TRANSACTIONS LEDGER & DASHBOARD METRICS
// ==========================================

export async function getFeeTransactions(
  schoolId: string,
  filters?: {
    studentId?: string;
    className?: string;
    paymentMethod?: string;
    feeType?: string;
    academicYearId?: string;
  }
): Promise<FeePayment[]> {
  const db = getFirebaseDb();
  if (!db || !schoolId) return [];

  try {
    const seenIds = new Set<string>();
    const seenReceipts = new Set<string>();
    const unifiedList: FeePayment[] = [];

    // 1. Primary Authoritative: financialPayments
    try {
      const fpQuery = query(
        collection(db, "financialPayments"),
        where("schoolId", "==", schoolId)
      );
      let fpDocs = (await getDocs(fpQuery)).docs;

      // Fallback to subcollection if root empty
      if (fpDocs.length === 0) {
        const subSnap = await getDocs(
          collection(db, "schools", schoolId, "financialPayments")
        ).catch(() => null);
        if (subSnap && !subSnap.empty) fpDocs = subSnap.docs;
      }

      for (const d of fpDocs) {
        const data = d.data();
        const id = d.id;
        const rec = data.receiptNumber || id;
        seenIds.add(id);
        if (rec) seenReceipts.add(rec);

        const rawMethod = (data.paymentMethod || "CASH").toUpperCase();
        const methodDisplay =
          rawMethod === "CASH"
            ? "Cash"
            : rawMethod === "UPI"
            ? "UPI"
            : rawMethod === "BANK_TRANSFER" || rawMethod === "BANK TRANSFER"
            ? "Bank Transfer"
            : rawMethod === "CHEQUE"
            ? "Cheque"
            : rawMethod === "CARD"
            ? "Card"
            : "Other";

        const amtPaise = data.amountPaise ?? data.amountPaidPaise ?? 0;

        unifiedList.push({
          id,
          schoolId: data.schoolId || schoolId,
          receiptNumber: rec,
          studentId: data.studentId || "",
          studentName: data.studentName || "Student",
          admissionNumber: data.admissionNumber || "N/A",
          className: data.className || "",
          sectionName: data.sectionName || "A",
          academicYearId: data.academicYearId || "",
          feeType: data.feeType || "tuition",
          periodMonths: data.periodMonths || [],
          amountPaidPaise: amtPaise,
          discountPaise: data.discountPaise || 0,
          lateFeePaise: data.lateFeePaise || 0,
          netAmountPaise: amtPaise,
          paymentMethod: methodDisplay as any,
          paymentDate: data.paymentDate || data.createdAt || new Date().toISOString(),
          transactionRef: data.referenceNumber || data.transactionRef || "",
          remarks: data.remarks || "",
          collectedBy: data.collectedBy || data.collectedByName || "Staff",
          status: (data.status || "SUCCESS") as any,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      }
    } catch (fpErr) {
      console.warn("financialPayments fetch notice in getFeeTransactions:", fpErr);
    }

    // 2. Legacy / Secondary: feePayments
    try {
      const legQuery = query(
        collection(db, "feePayments"),
        where("schoolId", "==", schoolId)
      );
      const legSnap = await getDocs(legQuery);
      for (const d of legSnap.docs) {
        if (seenIds.has(d.id)) continue;
        const data = d.data();
        const rec = data.receiptNumber || d.id;
        if (rec && seenReceipts.has(rec)) continue;

        seenIds.add(d.id);
        if (rec) seenReceipts.add(rec);
        unifiedList.push({ id: d.id, ...data } as FeePayment);
      }
    } catch (legErr) {
      console.warn("feePayments fetch notice in getFeeTransactions:", legErr);
    }

    let list = unifiedList;

    if (filters?.studentId)
      list = list.filter((p) => p.studentId === filters.studentId);
    if (filters?.className && filters.className !== "all")
      list = list.filter((p) => p.className === filters.className);
    if (filters?.paymentMethod && filters.paymentMethod !== "all") {
      const pmLower = filters.paymentMethod.toLowerCase();
      list = list.filter((p) => (p.paymentMethod || "").toLowerCase().includes(pmLower));
    }
    if (filters?.feeType && filters.feeType !== "all")
      list = list.filter((p) => p.feeType === filters.feeType);
    if (filters?.academicYearId && filters.academicYearId !== "all")
      list = list.filter((p) => p.academicYearId === filters.academicYearId);

    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return list;
  } catch (err) {
    console.warn("getFeeTransactions notice:", err);
    return [];
  }
}

export async function getDefaultersList(
  schoolId: string,
  className?: string
): Promise<StudentFeeAssignment[]> {
  const db = getFirebaseDb();
  if (!db || !schoolId) return [];

  try {
    const q = query(
      collection(db, "studentFeeAssignments"),
      where("schoolId", "==", schoolId)
    );
    const snap = await getDocs(q);
    let list = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as StudentFeeAssignment
    );

    list = list.filter((a) => a.totalPendingPaise > 0);
    if (className && className !== "all") {
      list = list.filter((a) => a.className === className);
    }

    if (list.length === 0) {
      try {
        const demandsQ = query(
          collection(db, "feeDemands"),
          where("schoolId", "==", schoolId)
        );
        const dSnap = await getDocs(demandsQ);
        const studentDueMap = new Map<string, any>();
        for (const doc of dSnap.docs) {
          const d = doc.data() as any;
          const bal = d.balanceAmountPaise ?? (d.netAmountPaise - (d.paidAmountPaise || 0));
          if (bal <= 0) continue;
          if (className && className !== "all" && d.className !== className) continue;

          const sId = d.studentId;
          const existing = studentDueMap.get(sId);
          if (!existing) {
            studentDueMap.set(sId, {
              id: `def_${sId}`,
              schoolId,
              studentId: sId,
              studentName: d.studentName || "Student",
              admissionNumber: d.admissionNumber || sId,
              className: d.className || "",
              sectionName: d.sectionName || "A",
              academicYearId: d.academicYearId || "all",
              feeStructureId: d.feeStructureId || "",
              frequency: "monthly",
              monthlyFeeRupees: Math.round(bal / 100),
              totalAnnualFeePaise: bal,
              totalDiscountPaise: d.discountAmountPaise || 0,
              totalPaidPaise: d.paidAmountPaise || 0,
              totalPendingPaise: bal,
              status: "OVERDUE",
              monthLedger: [
                {
                  month: d.period || "Current",
                  dueDate: d.dueDate || new Date().toISOString(),
                  amountPaise: bal,
                  paidAmountPaise: d.paidAmountPaise || 0,
                  pendingAmountPaise: bal,
                  status: "OVERDUE",
                },
              ],
              createdAt: d.createdAt || new Date().toISOString(),
              updatedAt: d.updatedAt || new Date().toISOString(),
            });
          } else {
            existing.totalAnnualFeePaise += bal;
            existing.totalPendingPaise += bal;
            existing.monthLedger.push({
              month: d.period || "Current",
              dueDate: d.dueDate || new Date().toISOString(),
              amountPaise: bal,
              paidAmountPaise: d.paidAmountPaise || 0,
              pendingAmountPaise: bal,
              status: "OVERDUE",
            });
          }
        }
        list = Array.from(studentDueMap.values());
      } catch (dErr) {
        console.warn("feeDemands fallback in getDefaultersList notice:", dErr);
      }
    }

    list.sort((a, b) => b.totalPendingPaise - a.totalPendingPaise);
    return list;
  } catch (err) {
    console.warn("getDefaultersList notice:", err);
    return [];
  }
}

export async function getFeeDashboardMetrics(schoolId: string) {
  const [transactions, defaulters] = await Promise.all([
    getFeeTransactions(schoolId),
    getDefaultersList(schoolId),
  ]);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthStr = now.toISOString().slice(0, 7);

  const totalCollectedPaise = transactions.reduce(
    (sum, t) => sum + (t.status === "SUCCESS" ? t.amountPaidPaise : 0),
    0
  );
  const todayCollectionPaise = transactions.reduce(
    (sum, t) =>
      sum +
      (t.status === "SUCCESS" && t.createdAt.slice(0, 10) === todayStr
        ? t.amountPaidPaise
        : 0),
    0
  );
  const thisMonthCollectionPaise = transactions.reduce(
    (sum, t) =>
      sum +
      (t.status === "SUCCESS" && t.createdAt.slice(0, 7) === currentMonthStr
        ? t.amountPaidPaise
        : 0),
    0
  );

  const totalPendingPaise = defaulters.reduce(
    (sum, d) => sum + d.totalPendingPaise,
    0
  );
  const totalExpectedPaise = totalCollectedPaise + totalPendingPaise;

  const paidStudentsCount = transactions
    .map((t) => t.studentId)
    .filter((v, i, a) => a.indexOf(v) === i).length;
  const defaultersCount = defaulters.length;

  // 100% Real Database Calculation: Zero fake multipliers!
  let realOverduePaise = 0;
  let partialPaymentsCount = 0;

  defaulters.forEach((d) => {
    if (
      d.status === "PARTIAL" ||
      (d.totalPaidPaise > 0 && d.totalPendingPaise > 0)
    ) {
      partialPaymentsCount++;
    }

    let studentOverdue = 0;
    if (d.monthLedger && d.monthLedger.length > 0) {
      d.monthLedger.forEach((m) => {
        if (
          m.dueDate &&
          m.dueDate.slice(0, 10) <= todayStr &&
          m.pendingAmountPaise > 0
        ) {
          studentOverdue += m.pendingAmountPaise;
        }
      });
    }
    realOverduePaise +=
      studentOverdue > 0 ? studentOverdue : d.totalPendingPaise;
  });

  const overdueAmountPaise = realOverduePaise;
  const collectionRate =
    totalExpectedPaise > 0
      ? Math.round((totalCollectedPaise / totalExpectedPaise) * 100)
      : 100;

  return {
    totalExpectedPaise,
    totalCollectedPaise,
    totalPendingPaise,
    overdueAmountPaise,
    todayCollectionPaise,
    thisMonthCollectionPaise,
    paidStudentsCount,
    defaultersCount,
    partialPaymentsCount,
    collectionRate,
  };
}

export interface FeeDashboardOverviewData {
  metrics: {
    totalExpectedPaise: number;
    totalCollectedPaise: number;
    totalPendingPaise: number;
    overdueAmountPaise: number;
    todayCollectionPaise: number;
    thisMonthCollectionPaise: number;
    todayPaymentsCount: number;
    paidStudentsCount: number;
    defaultersCount: number;
    partialPaymentsCount: number;
    collectionRate: number;
    collectedPercentVsLastMonth: number;
    todayPercentVsYesterday: number;
  };
  collectionTrend: {
    month: string;
    monthKey: string;
    expectedPaise: number;
    collectedPaise: number;
    outstandingPaise: number;
  }[];
  paymentMethods: {
    method: string;
    count: number;
    amountPaise: number;
    percentage: number;
    color: string;
  }[];
  paymentFollowUp: {
    criticalCount: number;
    overdueCount: number;
    dueSoonCount: number;
    onTrackCount: number;
    totalNeedAttention: number;
  };
  monthlyClassOverview: {
    className: string;
    rates: (number | null)[];
  }[];
  topDefaulters: {
    id: string;
    studentId: string;
    studentName: string;
    admissionNumber: string;
    className: string;
    sectionName?: string;
    dueAmountPaise: number;
    daysOverdue: number;
    lastPaymentDate?: string;
    phone?: string;
    parentPhone?: string;
  }[];
  recentCollections: FeePayment[];
}

export async function getFeeDashboardOverviewData(
  schoolId: string,
  filter?: {
    academicYearId?: string;
    month?: string;
    className?: string;
    sectionName?: string;
    searchQuery?: string;
    paymentStatusFilter?: "all" | "pending" | "paid" | "overdue";
  }
): Promise<FeeDashboardOverviewData> {
  const cacheKey = `feeDashboardOverview:${schoolId}:${filter?.academicYearId || "default"}:${filter?.month || "all"}:${filter?.className || "all"}:${filter?.sectionName || "all"}:${filter?.searchQuery || "none"}:${filter?.paymentStatusFilter || "all"}`;
  return appQueryClient.fetchWithCache(
    cacheKey,
    async () => {
      let summary: FeeDashboardSummary | null = null;
      try {
        summary = await getFeeDashboardSummary(schoolId, {
          month: filter?.month,
          className: filter?.className,
          sectionName: filter?.sectionName,
          academicYearId: filter?.academicYearId && filter.academicYearId !== "all" ? filter.academicYearId : undefined,
          searchQuery: filter?.searchQuery,
          paymentStatusFilter: filter?.paymentStatusFilter,
        });
      } catch (clientErr) {
        if (typeof window !== "undefined") {
          try {
            const params = new URLSearchParams();
            params.set("schoolId", schoolId);
            if (filter?.academicYearId && filter.academicYearId !== "all") params.set("academicYearId", filter.academicYearId);
            if (filter?.month) params.set("month", filter.month);
            if (filter?.className) params.set("className", filter.className);
            if (filter?.sectionName) params.set("sectionName", filter.sectionName);
            if (filter?.searchQuery) params.set("searchQuery", filter.searchQuery);
            if (filter?.paymentStatusFilter) params.set("paymentStatusFilter", filter.paymentStatusFilter);
            const res = await fetch(`/api/fees/foundation/analytics/dashboard?${params.toString()}`);
            if (res.ok) {
              const resData = await res.json();
              if (resData?.summary) {
                summary = resData.summary;
              }
            }
          } catch {}
        }
        if (!summary) throw clientErr;
      }

      return {
        metrics: {
          totalExpectedPaise: summary.totalExpectedPaise,
          totalCollectedPaise: summary.totalCollectedPaise,
          totalPendingPaise: summary.totalOutstandingPaise,
          overdueAmountPaise:
            summary.paymentFollowUp.overdueAmountPaise +
            summary.paymentFollowUp.criticalAmountPaise,
          todayCollectionPaise: summary.todayCollectionPaise,
          thisMonthCollectionPaise: summary.totalCollectedPaise,
          todayPaymentsCount: summary.todayPaymentsCount,
          paidStudentsCount: summary.paidDemandsCount,
          defaultersCount: summary.defaultersCount,
          partialPaymentsCount: summary.partialDemandsCount,
          collectionRate: summary.collectionRate,
          collectedPercentVsLastMonth: 0,
          todayPercentVsYesterday: 0,
        },
        collectionTrend: summary.collectionTrend.map((t) => ({
          month: t.monthName,
          monthKey: t.periodKey,
          expectedPaise: t.expectedPaise,
          collectedPaise: t.collectedPaise,
          outstandingPaise: t.outstandingPaise,
        })),
        paymentMethods: summary.paymentMethodSummary,
        paymentFollowUp: {
          criticalCount: summary.paymentFollowUp.criticalCount,
          overdueCount: summary.paymentFollowUp.overdueCount,
          dueSoonCount: summary.paymentFollowUp.dueSoonCount,
          onTrackCount: summary.paymentFollowUp.onTrackCount,
          totalNeedAttention: summary.defaultersCount,
        },
        monthlyClassOverview: summary.monthlyClassOverview || [],
        topDefaulters: summary.topDefaulters.slice(0, 10).map((d) => ({
          id: `def_${d.studentId}`,
          studentId: d.studentId,
          studentName: d.studentName,
          admissionNumber: d.admissionNumber,
          className: d.className,
          sectionName: d.sectionName,
          dueAmountPaise: d.totalOutstandingPaise,
          daysOverdue: d.daysOverdue,
          lastPaymentDate: d.lastPaymentDate || "—",
          phone: d.phone || "",
          parentPhone: (d as any).parentPhone || d.phone || "",
        })),
        recentCollections: (summary.recentCollections || []).map((p) => {
          const payAmt = Number(p.amountPaise ?? (p as any).amountPaidPaise ?? 0);
          return {
            id: p.id,
            schoolId: p.schoolId,
            receiptNumber: p.receiptNumber || `REC-${(p.id || "").slice(-6)}`,
            studentId: p.studentId,
            studentName: p.studentName,
            admissionNumber: p.admissionNumber,
            className: p.className,
            sectionName: p.sectionName,
            academicYearId: p.academicYearId,
            feeType: "tuition",
            periodMonths: p.periodMonths || [],
            amountPaidPaise: payAmt,
            discountPaise: 0,
            lateFeePaise: 0,
            netAmountPaise: payAmt,
            paymentMethod: (p.paymentMethod === "CASH"
              ? "Cash"
              : p.paymentMethod === "UPI"
                ? "UPI"
                : p.paymentMethod === "BANK_TRANSFER"
                  ? "Bank Transfer"
                  : p.paymentMethod === "CHEQUE"
                    ? "Cheque"
                    : p.paymentMethod === "CARD"
                      ? "Card"
                      : "Other") as any,
            transactionRef: p.referenceNumber,
            remarks: p.remarks,
            paymentDate: p.paymentDate || p.createdAt,
            collectedBy: p.collectedBy,
            collectedByName: p.collectedByName,
            status: p.status === "REFUNDED" ? "REFUNDED" : "SUCCESS",
            remainingDuePaise: p.remainingDuePaise,
            createdAt: p.createdAt,
          };
        }),
      };
    },
    { staleTime: 15_000, cacheTime: 120_000 }
  );
}

// ==========================================
// 8. FOLLOW-UP CRM TRACKING (Real Database Persistence)
// ==========================================

export async function recordFeeFollowUp(
  schoolId: string,
  input: {
    studentId: string;
    studentName: string;
    admissionNumber: string;
    className: string;
    status: FeeFollowUpStatus;
    contactChannel: FeeFollowUp["contactChannel"];
    contactPerson?: string;
    contactPhone?: string;
    promisedDate?: string;
    nextFollowUpDate?: string;
    notes: string;
  },
  actorId: string = "admin"
): Promise<FeeFollowUp> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");

  const nowIso = new Date().toISOString();
  const followUpId = `fup_${input.studentId}_${Date.now()}`;

  const followUp: FeeFollowUp = {
    id: followUpId,
    schoolId,
    studentId: input.studentId,
    studentName: input.studentName,
    admissionNumber: input.admissionNumber,
    className: input.className,
    status: input.status,
    contactChannel: input.contactChannel,
    contactPerson: input.contactPerson || "",
    contactPhone: input.contactPhone || "",
    promisedDate: input.promisedDate || "",
    nextFollowUpDate: input.nextFollowUpDate || "",
    notes: input.notes,
    recordedBy: actorId,
    recordedAt: nowIso,
    createdAt: nowIso,
  };

  // Write follow-up document
  await setDoc(
    doc(db, "schools", schoolId, "feeFollowUps", followUpId),
    followUp
  );

  // Sync latest status to studentFeeAssignments document
  try {
    const qAssign = query(
      collection(db, "studentFeeAssignments"),
      where("schoolId", "==", schoolId),
      where("studentId", "==", input.studentId)
    );
    const snap = await getDocs(qAssign);
    if (!snap.empty) {
      const assignRef = snap.docs[0].ref;
      await updateDoc(assignRef, {
        latestFollowUpStatus: input.status,
        lastFollowUpDate: nowIso,
        nextFollowUpDate: input.nextFollowUpDate || null,
        lastFollowUpNotes: input.notes,
        updatedAt: nowIso,
      });
    }
  } catch (err) {
    console.warn("Follow-up sync to assignment notice:", err);
  }

  return followUp;
}

export async function getFeeFollowUps(
  schoolId: string,
  studentId?: string
): Promise<FeeFollowUp[]> {
  const db = getFirebaseDb();
  if (!db || !schoolId) return [];

  try {
    const coll = collection(db, "schools", schoolId, "feeFollowUps");
    const q = studentId
      ? query(coll, where("studentId", "==", studentId))
      : query(coll, limit(100));

    const snap = await getDocs(q);
    const list = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as FeeFollowUp
    );
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  } catch (err) {
    console.warn("getFeeFollowUps notice:", err);
    return [];
  }
}

export async function getStudentFeeTransactions(
  schoolId: string,
  studentId: string
): Promise<FeePayment[]> {
  return getStudentFeePayments(schoolId, studentId);
}

// ==========================================
// 8. PHASE 1 FINANCIAL FOUNDATION RE-EXPORTS
// ==========================================
export * from "./fee-foundation.service";
