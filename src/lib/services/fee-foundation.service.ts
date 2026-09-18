import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import type {
  FeeHead,
  FeeStructureDefinition,
  FeeDemand,
  FinancialPayment,
  PaymentAllocation,
  FinancialRefund,
  PaymentReversal,
  FeeAdjustment,
  StudentFinancialSummary,
  FinancialAuditLog,
  FinancialAction,
  PaymentMethod,
  AdjustmentType,
  FeeDemandStatus,
  AcademicSessionPeriod,
  FrequencyPeriod,
  BulkDemandOptions,
  BulkDemandGenerationResult,
  ClassOutstandingSummary,
} from "@/types/fee-foundation";
import type { StudentProfile, MonthLedgerItem, FeeFrequency } from "@/types";


// ==========================================
// 1. PRECISION & CURRENCY FORMATTING
// ==========================================

export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Standard Indian Currency Formatter (₹)
 * Example: 150000 paise -> ₹1,500.00
 */
export function formatINR(amount: number, isPaise: boolean = true): string {
  const rupees = isPaise ? paiseToRupees(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

// ==========================================
// 2. FINANCIAL FORMULA INVARIANTS
// ==========================================

/**
 * Net Amount = Gross - Discount - Concession + LateFee + Fine
 * Never negative.
 */
export function calculateInvoiceTotal(
  grossAmountPaise: number,
  discountAmountPaise: number = 0,
  concessionAmountPaise: number = 0,
  lateFeePaise: number = 0,
  finePaise: number = 0
): number {
  const deductions = Math.max(0, discountAmountPaise) + Math.max(0, concessionAmountPaise);
  const additions = Math.max(0, lateFeePaise) + Math.max(0, finePaise);
  return Math.max(0, Math.round(grossAmountPaise - deductions + additions));
}

/**
 * Balance Amount = Net - Paid
 * Strictly prevents negative balances.
 */
export function calculateInvoiceBalance(
  netAmountPaise: number,
  paidAmountPaise: number
): number {
  return Math.max(0, Math.round(netAmountPaise - paidAmountPaise));
}

/**
 * Determines authoritative invoice status.
 */
export function deriveInvoiceStatus(
  netAmountPaise: number,
  paidAmountPaise: number,
  dueDateIso: string,
  nowMs: number = Date.now()
): FeeDemandStatus {
  if (netAmountPaise <= 0) return "PAID";
  if (paidAmountPaise >= netAmountPaise) return "PAID";
  if (paidAmountPaise > 0) return "PARTIAL";

  const dueTime = new Date(dueDateIso).getTime();
  if (!isNaN(dueTime) && nowMs > dueTime) return "OVERDUE";

  return "DUE";
}

// ==========================================
// 3. FINANCIAL AUDIT LOGGING
// ==========================================

export async function logFinancialAudit(
  schoolId: string,
  actor: { id: string; role: string; name?: string },
  action: FinancialAction,
  entity: FinancialAuditLog["entity"],
  entityId: string,
  oldValue?: Record<string, any> | null,
  newValue?: Record<string, any> | null,
  reason?: string,
  metadata?: { studentId?: string; academicYearId?: string }
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) return "";

  try {
    const logId = `faudit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logRef = doc(db, "financialAuditLogs", logId);
    const nowIso = new Date().toISOString();

    const auditEntry: FinancialAuditLog = {
      id: logId,
      schoolId,
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.name || actor.id,
      action,
      entity,
      entityId,
      studentId: metadata?.studentId,
      academicYearId: metadata?.academicYearId,
      oldValue: oldValue || null,
      newValue: newValue || null,
      reason: reason || "",
      timestamp: nowIso,
      createdAt: serverTimestamp(),
    };

    await setDoc(logRef, auditEntry);
    return logId;
  } catch (err) {
    console.warn("[fee-foundation] Notice: failed to write audit log:", err);
    return "";
  }
}

// ==========================================
// 4. CONFIGURABLE FEE HEADS
// ==========================================

const DEFAULT_SYSTEM_FEE_HEADS: Array<Omit<FeeHead, "id" | "schoolId" | "createdAt" | "updatedAt" | "createdBy">> = [
  { name: "Tuition Fee", code: "TUITION", description: "Regular academic instruction fee", isSystem: true, status: "ACTIVE", sortOrder: 1 },
  { name: "Admission Fee", code: "ADMISSION", description: "One-time enrollment and registration fee", isSystem: true, status: "ACTIVE", sortOrder: 2 },
  { name: "Annual Fee", code: "ANNUAL", description: "Yearly institutional development & maintenance charges", isSystem: true, status: "ACTIVE", sortOrder: 3 },
  { name: "Computer Fee", code: "COMPUTER", description: "Lab, software & digital learning infrastructure", isSystem: false, status: "ACTIVE", sortOrder: 4 },
  { name: "Transport Fee", code: "TRANSPORT", description: "Bus and conveyance services", isSystem: false, status: "ACTIVE", sortOrder: 5 },
  { name: "Exam Fee", code: "EXAM", description: "Terminal assessments, answer scripts & board charges", isSystem: false, status: "ACTIVE", sortOrder: 6 },
  { name: "Library Fee", code: "LIBRARY", description: "Library resource access & circulation", isSystem: false, status: "ACTIVE", sortOrder: 7 },
  { name: "Activity Fee", code: "ACTIVITY", description: "Sports, arts & extracurricular events", isSystem: false, status: "ACTIVE", sortOrder: 8 },
  { name: "Other Fee", code: "OTHER", description: "Miscellaneous institutional charges", isSystem: false, status: "ACTIVE", sortOrder: 9 },
];

export async function getFeeHeads(schoolId: string): Promise<FeeHead[]> {
  const db = getFirebaseDb();
  if (!db || !schoolId) return [];

  try {
    const q = query(
      collection(db, "feeHeads"),
      where("schoolId", "==", schoolId)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      // Auto-seed default heads on first request
      return await seedDefaultFeeHeads(schoolId);
    }

    const heads = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FeeHead));
    return heads.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (err) {
    console.warn("getFeeHeads error:", err);
    return [];
  }
}

export async function seedDefaultFeeHeads(schoolId: string, actorId: string = "system"): Promise<FeeHead[]> {
  const db = getFirebaseDb();
  if (!db || !schoolId) return [];

  const now = new Date().toISOString();
  const createdHeads: FeeHead[] = [];

  for (const item of DEFAULT_SYSTEM_FEE_HEADS) {
    const headId = `fh_${schoolId}_${item.code.toLowerCase()}`;
    const headRef = doc(db, "feeHeads", headId);
    const existingSnap = await getDoc(headRef);

    if (!existingSnap.exists()) {
      const head: FeeHead = {
        id: headId,
        schoolId,
        ...item,
        createdAt: now,
        updatedAt: now,
        createdBy: actorId,
      };
      await setDoc(headRef, head);
      createdHeads.push(head);
    } else {
      createdHeads.push({ id: existingSnap.id, ...existingSnap.data() } as FeeHead);
    }
  }

  return createdHeads;
}

export async function createFeeHead(
  schoolId: string,
  input: { name: string; code: string; description?: string; sortOrder?: number },
  actorId: string = "admin"
): Promise<FeeHead> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database not initialized");

  const cleanCode = input.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  const headId = `fh_${schoolId}_${cleanCode.toLowerCase()}`;
  const headRef = doc(db, "feeHeads", headId);
  const snap = await getDoc(headRef);

  if (snap.exists()) {
    throw new Error(`Fee head with code "${cleanCode}" already exists.`);
  }

  const now = new Date().toISOString();
  const newHead: FeeHead = {
    id: headId,
    schoolId,
    name: input.name.trim(),
    code: cleanCode,
    description: input.description || "",
    isSystem: false,
    status: "ACTIVE",
    sortOrder: input.sortOrder || 10,
    createdAt: now,
    updatedAt: now,
    createdBy: actorId,
  };

  await setDoc(headRef, newHead);
  await logFinancialAudit(schoolId, { id: actorId, role: "admin" }, "CREATE", "FeeHead", headId, null, newHead, "Created configurable fee head");

  return newHead;
}

export async function updateFeeHead(
  schoolId: string,
  headId: string,
  updates: Partial<Pick<FeeHead, "name" | "description" | "status" | "sortOrder">>,
  actorId: string = "admin"
): Promise<FeeHead> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database not initialized");

  const headRef = doc(db, "feeHeads", headId);
  const snap = await getDoc(headRef);
  if (!snap.exists()) throw new Error("Fee head not found");

  const current = snap.data() as FeeHead;
  if (current.schoolId !== schoolId) throw new Error("Tenant boundary violation");

  const updated: FeeHead = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(headRef, updated, { merge: true });
  await logFinancialAudit(schoolId, { id: actorId, role: "admin" }, "UPDATE", "FeeHead", headId, current, updated, "Updated fee head");

  return updated;
}

// ==========================================
// 5. REUSABLE FEE STRUCTURE RESOLUTION
// ==========================================

export function normalizeClassKey(name?: string): string {
  if (!name) return "";
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Resolves all applicable fee structures for a student based on class, section, and academic year.
 */
export async function getStudentApplicableFeeStructures(
  schoolId: string,
  studentId: string,
  academicYearId: string
): Promise<FeeStructureDefinition[]> {
  const db = getFirebaseDb();
  if (!db || !schoolId || !studentId) return [];

  try {
    // 1. Fetch student
    let studentClass = "";
    let studentSection = "";
    const sSnap = await getDoc(doc(db, "schools", schoolId, "students", studentId));
    if (sSnap.exists()) {
      const sData = sSnap.data() as StudentProfile;
      studentClass = sData.className || "";
      studentSection = sData.sectionName || "";
    }

    // 2. Fetch active fee structures for the academic year
    const q = query(
      collection(db, "feeStructures"),
      where("schoolId", "==", schoolId),
      where("academicYearId", "==", academicYearId),
      where("status", "==", "ACTIVE")
    );
    const snap = await getDocs(q);

    const normStudentClass = normalizeClassKey(studentClass);
    const normStudentSection = normalizeClassKey(studentSection);

    const applicable: FeeStructureDefinition[] = [];
    for (const d of snap.docs) {
      const s = { id: d.id, ...d.data() } as any;
      const sClass = normalizeClassKey(s.className);
      const sSection = normalizeClassKey(s.sectionName);

      const matchesClass = sClass === "all" || sClass === "any" || sClass === normStudentClass;
      const matchesSection = !sSection || sSection === "all" || sSection === "any" || sSection === normStudentSection;

      if (matchesClass && matchesSection) {
        applicable.push({
          id: s.id,
          schoolId: s.schoolId,
          academicYearId: s.academicYearId,
          academicYearName: s.academicYearName || academicYearId,
          feeHeadId: s.feeHeadId || `fh_${s.feeType || "tuition"}`,
          feeHeadName: s.feeHeadName || s.title || "Tuition Fee",
          className: s.className,
          sectionName: s.sectionName,
          title: s.title,
          amountPaise: s.amountPaise || Math.round((s.amountRupees || 0) * 100),
          frequency: s.frequency || "monthly",
          dueDayOfMonth: s.dueDayOfMonth || 10,
          applicableMonths: s.applicableMonths || ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"],
          gracePeriodDays: s.gracePeriodDays ?? (s.lateFeeRule?.graceDays || 5),
          lateFeeRule: {
            enabled: Boolean(s.lateFeeRule?.enabled),
            gracePeriodDays: s.lateFeeRule?.graceDays || 5,
            type: s.lateFeeRule?.type || "FIXED",
            amountPaise: s.lateFeeRule?.amountPaise || Math.round((s.lateFeeRule?.value || 50) * 100),
            maxLimitPaise: s.lateFeeRule?.maxLimitPaise || 50000,
          },
          version: s.version || 1,
          status: s.status || "ACTIVE",
          createdAt: s.createdAt || new Date().toISOString(),
          updatedAt: s.updatedAt || new Date().toISOString(),
          createdBy: s.createdBy || "admin",
        });
      }
    }

    return applicable;
  } catch (err) {
    console.warn("getStudentApplicableFeeStructures error:", err);
    return [];
  }
}

// ==========================================
// 6. IDEMPOTENT FEE DEMAND / INVOICE GENERATION
// ==========================================

const SESSION_MONTHS = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

/**
 * Creates deterministic, idempotent Demand ID to guarantee 0 duplicates.
 */
export function buildDeterministicDemandId(
  schoolId: string,
  studentId: string,
  academicYearId: string,
  feeHeadId: string,
  period: string
): string {
  const pKey = period.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const hKey = feeHeadId.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const sKey = schoolId.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const stKey = studentId.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const aKey = academicYearId.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  return `demand_${sKey}_${stKey}_${aKey}_${hKey}_${pKey}`;
}

/**
 * Authoritatively generates fee demands for a student across all applicable structures.
 * Idempotent: safe on page reload, network retries, or concurrent execution.
 */
export async function generateStudentFeeDemands(
  schoolId: string,
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    className: string;
    sectionName: string;
  },
  academicYearId: string,
  academicYearName: string = "2026-27",
  actorId: string = "system"
): Promise<FeeDemand[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  const structures = await getStudentApplicableFeeStructures(schoolId, student.id, academicYearId);
  if (structures.length === 0) return [];

  const generatedDemands: FeeDemand[] = [];
  const startSessionYear = parseInt(academicYearName.slice(0, 4)) || new Date().getFullYear();
  const now = new Date().toISOString();

  for (const struct of structures) {
    const periodsToGenerate = struct.frequency === "one_time"
      ? ["Admission 2026-27"]
      : struct.frequency === "annually"
      ? [`Annual ${academicYearName}`]
      : struct.applicableMonths || SESSION_MONTHS;

    for (let idx = 0; idx < periodsToGenerate.length; idx++) {
      const periodName = periodsToGenerate[idx];
      const demandId = buildDeterministicDemandId(
        schoolId,
        student.id,
        academicYearId,
        struct.feeHeadId,
        periodName
      );

      const demandRef = doc(db, "feeDemands", demandId);
      const existingSnap = await getDoc(demandRef);

      if (existingSnap.exists()) {
        // Idempotency: Already generated, never overwrite or duplicate!
        generatedDemands.push({ id: existingSnap.id, ...existingSnap.data() } as FeeDemand);
        continue;
      }

      // Compute due date
      const monthIdx = SESSION_MONTHS.indexOf(periodName);
      const year = (monthIdx >= 9) ? startSessionYear + 1 : startSessionYear;
      const monthNum = (monthIdx >= 9) ? monthIdx - 8 : (monthIdx >= 0 ? monthIdx + 4 : 4);
      const dueDay = struct.dueDayOfMonth || 10;
      const dueDate = `${year}-${String(monthNum).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}T00:00:00.000Z`;

      const grossPaise = struct.amountPaise;
      const netPaise = calculateInvoiceTotal(grossPaise, 0, 0, 0, 0);
      const balancePaise = calculateInvoiceBalance(netPaise, 0);

      const invoiceNumber = `INV-${startSessionYear}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const demand: FeeDemand = {
        id: demandId,
        invoiceNumber,
        schoolId,
        studentId: student.id,
        studentName: student.name,
        admissionNumber: student.admissionNumber,
        className: student.className,
        sectionName: student.sectionName,
        academicYearId,
        academicYearName,
        feeHeadId: struct.feeHeadId,
        feeHeadName: struct.feeHeadName,
        feeStructureId: struct.id,
        period: periodName,
        dueDate,
        grossAmountPaise: grossPaise,
        discountAmountPaise: 0,
        concessionAmountPaise: 0,
        lateFeePaise: 0,
        finePaise: 0,
        netAmountPaise: netPaise,
        paidAmountPaise: 0,
        balanceAmountPaise: balancePaise,
        status: deriveInvoiceStatus(netPaise, 0, dueDate),
        paymentAllocationIds: [],
        adjustmentIds: [],
        createdAt: now,
        updatedAt: now,
        createdBy: actorId,
      };

      await setDoc(demandRef, demand);
      await logFinancialAudit(
        schoolId,
        { id: actorId, role: "system" },
        "CREATE",
        "FeeDemand",
        demandId,
        null,
        demand,
        `Generated demand invoice for ${periodName}`,
        { studentId: student.id, academicYearId }
      );

      generatedDemands.push(demand);
    }
  }

  return generatedDemands;
}

// ==========================================
// 7. MULTI-INVOICE PAYMENT ALLOCATION ENGINE
// ==========================================

/**
 * Pure Calculation: Distributes payment amount across a list of unpaid demands (FIFO order by dueDate).
 */
export function calculatePaymentAllocationPlan(
  paymentAmountPaise: number,
  demands: FeeDemand[]
): Array<{ demandId: string; period: string; feeHeadName: string; allocatedAmountPaise: number; remainingDemandBalancePaise: number }> {
  let unallocated = Math.round(paymentAmountPaise);
  const plan: Array<{ demandId: string; period: string; feeHeadName: string; allocatedAmountPaise: number; remainingDemandBalancePaise: number }> = [];

  // Sort demands: oldest due date first (FIFO)
  const sorted = [...demands].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  for (const d of sorted) {
    if (unallocated <= 0) break;
    const needed = d.balanceAmountPaise;
    if (needed <= 0) continue;

    const allocated = Math.min(needed, unallocated);
    unallocated -= allocated;

    plan.push({
      demandId: d.id,
      period: d.period,
      feeHeadName: d.feeHeadName,
      allocatedAmountPaise: allocated,
      remainingDemandBalancePaise: Math.max(0, needed - allocated),
    });
  }

  return plan;
}

/**
 * Processes a financial payment and commits allocations across targeted or FIFO fee demands.
 * With Idempotency protection, snapshot metadata, and atomic writes.
 */
export async function processFeePaymentWithAllocations(
  schoolId: string,
  input: {
    studentId: string;
    studentName: string;
    admissionNumber: string;
    className: string;
    sectionName: string;
    academicYearId: string;
    amountPaidRupees: number;
    paymentMethod: PaymentMethod;
    targetDemandIds?: string[]; // Optional specific demands; if omitted, FIFO applies
    referenceNumber?: string;
    remarks?: string;
    paymentDate?: string;
    idempotencyKey?: string;
    actorId?: string;
    actorName?: string;
  }
): Promise<{ payment: FinancialPayment; allocations: PaymentAllocation[]; updatedDemands: FeeDemand[] }> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database not connected");

  if (!schoolId) {
    throw new Error("schoolId is required to process payment.");
  }

  if (input.amountPaidRupees <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  // 1. Idempotency Guard (Double-Click & Retry Protection)
  if (input.idempotencyKey && input.idempotencyKey.trim() !== "") {
    try {
      const existingPayQuery = query(
        collection(db, "financialPayments"),
        where("schoolId", "==", schoolId),
        where("idempotencyKey", "==", input.idempotencyKey.trim())
      );
      const existingSnap = await getDocs(existingPayQuery);
      if (!existingSnap.empty) {
        const existingDoc = existingSnap.docs[0];
        const existingPayment = { id: existingDoc.id, ...existingDoc.data() } as FinancialPayment;

        // Fetch existing allocations
        const allocSnap = await getDocs(
          query(
            collection(db, "paymentAllocations"),
            where("schoolId", "==", schoolId),
            where("paymentId", "==", existingPayment.id)
          )
        );
        const existingAllocs = allocSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentAllocation));

        return {
          payment: existingPayment,
          allocations: existingAllocs,
          updatedDemands: [],
        };
      }
    } catch (idemErr) {
      console.warn("[fee-foundation] Idempotency lookup note:", idemErr);
    }
  }

  const amountPaidPaise = rupeesToPaise(input.amountPaidRupees);
  const now = new Date();
  const nowIso = input.paymentDate || now.toISOString();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const actorId = input.actorId || "admin";
  const actorName = input.actorName || "Staff Accountant";

  // 2. Fetch student's unpaid demands
  const demandsQuery = query(
    collection(db, "feeDemands"),
    where("schoolId", "==", schoolId),
    where("studentId", "==", input.studentId),
    where("academicYearId", "==", input.academicYearId)
  );
  const demandsSnap = await getDocs(demandsQuery);
  let activeDemands = demandsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FeeDemand));

  if (activeDemands.length === 0) {
    // Attempt lazy demand generation if none exist yet
    activeDemands = await generateStudentFeeDemands(
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

  // Filter to targeted demands if specified, otherwise take all with balance > 0
  const candidateDemands = input.targetDemandIds && input.targetDemandIds.length > 0
    ? activeDemands.filter((d) => input.targetDemandIds!.includes(d.id))
    : activeDemands.filter((d) => d.balanceAmountPaise > 0);

  if (candidateDemands.length === 0) {
    throw new Error("No outstanding fee demands found for allocation or all selected demands are already fully paid.");
  }

  const totalPayablePaise = candidateDemands.reduce((sum, d) => sum + d.balanceAmountPaise, 0);
  if (totalPayablePaise <= 0) {
    throw new Error("All candidate fee demands are already fully paid (₹0 balance remaining).");
  }

  // 3. Compute allocation plan
  const plan = calculatePaymentAllocationPlan(amountPaidPaise, candidateDemands);
  if (plan.length === 0) {
    throw new Error("No outstanding dues eligible for payment allocation.");
  }

  // 4. Generate receipt number sequentially
  let receiptCount = 1;
  try {
    const countPaymentsSnap = await getDocs(
      query(collection(db, "financialPayments"), where("schoolId", "==", schoolId))
    );
    receiptCount = countPaymentsSnap.size + 1;
  } catch {
    receiptCount = Math.floor(1000 + Math.random() * 9000);
  }
  const receiptNumber = `REC-${dateStr}-${String(receiptCount).padStart(4, "0")}`;
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let totalAllocatedPaise = 0;
  const allocations: PaymentAllocation[] = [];
  const updatedDemands: FeeDemand[] = [];
  const feeBreakdown: Array<{ feeHeadName: string; period: string; amountPaise: number }> = [];
  const periodMonthsSet = new Set<string>();
  const batch = writeBatch(db);

  // 5. Commit Allocations and update Demands
  for (const item of plan) {
    const allocId = `alloc_${paymentId}_${item.demandId}`;
    const allocRef = doc(db, "paymentAllocations", allocId);
    const allocation: PaymentAllocation = {
      id: allocId,
      paymentId,
      demandId: item.demandId,
      schoolId,
      studentId: input.studentId,
      academicYearId: input.academicYearId,
      period: item.period,
      feeHeadName: item.feeHeadName,
      allocatedAmountPaise: item.allocatedAmountPaise,
      allocatedAt: nowIso,
      createdAt: nowIso,
    };
    batch.set(allocRef, allocation);
    allocations.push(allocation);
    totalAllocatedPaise += item.allocatedAmountPaise;

    feeBreakdown.push({
      feeHeadName: item.feeHeadName,
      period: item.period,
      amountPaise: item.allocatedAmountPaise,
    });
    if (item.period) periodMonthsSet.add(item.period);

    // Update target demand
    const targetDemand = activeDemands.find((d) => d.id === item.demandId)!;
    const newPaid = targetDemand.paidAmountPaise + item.allocatedAmountPaise;
    const newBalance = calculateInvoiceBalance(targetDemand.netAmountPaise, newPaid);
    const newStatus = deriveInvoiceStatus(targetDemand.netAmountPaise, newPaid, targetDemand.dueDate);

    const updatedDemand: FeeDemand = {
      ...targetDemand,
      paidAmountPaise: newPaid,
      balanceAmountPaise: newBalance,
      status: newStatus,
      paymentAllocationIds: [...(targetDemand.paymentAllocationIds || []), allocId],
      updatedAt: nowIso,
    };

    const demandDocRef = doc(db, "feeDemands", targetDemand.id);
    batch.set(demandDocRef, updatedDemand, { merge: true });
    updatedDemands.push(updatedDemand);
  }

  // Calculate remaining due paise after this payment across all active demands
  const remainingDuePaise = activeDemands.reduce((sum, d) => {
    const updated = updatedDemands.find((u) => u.id === d.id);
    return sum + (updated ? updated.balanceAmountPaise : d.balanceAmountPaise);
  }, 0);

  // 6. Create Payment record
  const unallocatedPaise = Math.max(0, amountPaidPaise - totalAllocatedPaise);
  const payment: FinancialPayment = {
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
    paymentDate: nowIso,
    paymentMethod: input.paymentMethod,
    referenceNumber: input.referenceNumber || "",
    collectedBy: actorId,
    collectedByName: actorName,
    status: "SUCCESS",
    remarks: input.remarks || "",
    idempotencyKey: input.idempotencyKey || "",
    refundedAmountPaise: 0,
    refundIds: [],
    periodMonths: Array.from(periodMonthsSet),
    feeBreakdown,
    remainingDuePaise,
    allocatedTotalPaise: totalAllocatedPaise,
    unallocatedPaise,
    allocationCount: allocations.length,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const paymentDocRef = doc(db, "financialPayments", paymentId);
  batch.set(paymentDocRef, payment);

  // Dual-sync to legacy feePayments for backward compatibility
  try {
    const legacyPaymentRef = doc(db, "feePayments", paymentId);
    batch.set(legacyPaymentRef, {
      id: paymentId,
      schoolId,
      receiptNumber,
      studentId: input.studentId,
      studentName: input.studentName,
      admissionNumber: input.admissionNumber,
      className: input.className,
      sectionName: input.sectionName,
      academicYearId: input.academicYearId,
      feeType: "tuition",
      periodMonths: Array.from(periodMonthsSet),
      amountPaidPaise,
      discountPaise: 0,
      lateFeePaise: 0,
      netAmountPaise: amountPaidPaise,
      paymentMethod: input.paymentMethod,
      transactionRef: input.referenceNumber || "",
      remarks: input.remarks || "",
      paymentDate: nowIso,
      collectedBy: actorId,
      collectedByName: actorName,
      status: "SUCCESS",
      remainingDuePaise,
      createdAt: nowIso,
    });
  } catch (legErr) {
    console.warn("[fee-foundation] Dual-sync notice:", legErr);
  }

  // Commit atomic batch
  await batch.commit();

  // 7. Log Financial Audit
  await logFinancialAudit(
    schoolId,
    { id: actorId, role: "accountant", name: actorName },
    "PAYMENT",
    "Payment",
    paymentId,
    null,
    { payment, allocationCount: allocations.length },
    `Collected ${formatINR(amountPaidPaise)} via ${input.paymentMethod}. Receipt: ${receiptNumber}`,
    { studentId: input.studentId, academicYearId: input.academicYearId }
  );

  return { payment, allocations, updatedDemands };
}

/**
 * Controlled Financial Refund:
 * Safely refunds part or all of a successful payment, reverses allocations,
 * restores Fee Demand balances, and updates payment status without deleting records.
 */
export async function processFeeRefund(
  schoolId: string,
  input: {
    paymentId: string;
    amountRupees: number;
    reason: string;
    refundMethod?: PaymentMethod;
    referenceNumber?: string;
    actorId?: string;
    actorName?: string;
  }
): Promise<{ refund: FinancialRefund; updatedPayment: FinancialPayment; updatedDemands: FeeDemand[] }> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database not connected");

  if (!schoolId) throw new Error("schoolId is required.");
  if (!input.reason || input.reason.trim() === "") {
    throw new Error("Refund reason is mandatory for financial audit and compliance.");
  }
  if (input.amountRupees <= 0) {
    throw new Error("Refund amount must be greater than zero.");
  }

  const refundAmountPaise = rupeesToPaise(input.amountRupees);
  const now = new Date();
  const nowIso = now.toISOString();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const actorId = input.actorId || "admin";
  const actorName = input.actorName || "Staff Accountant";

  // 1. Fetch original payment
  const paymentDocRef = doc(db, "financialPayments", input.paymentId);
  const paymentSnap = await getDoc(paymentDocRef);
  if (!paymentSnap.exists()) {
    throw new Error("Payment record not found.");
  }
  const payment = { id: paymentSnap.id, ...paymentSnap.data() } as FinancialPayment;

  // Multi-tenant check
  if (payment.schoolId !== schoolId) {
    throw new Error("Unauthorized: School ID mismatch.");
  }

  // Status check
  if (payment.status === "REVERSED") {
    throw new Error("Cannot refund an already reversed transaction.");
  }
  if (payment.status === "REFUNDED") {
    throw new Error("This payment has already been fully refunded.");
  }

  const currentRefundedPaise = payment.refundedAmountPaise || 0;
  const availableToRefundPaise = payment.amountPaise - currentRefundedPaise;

  if (refundAmountPaise > availableToRefundPaise) {
    throw new Error(
      `Refund amount (${formatINR(refundAmountPaise)}) exceeds available refundable balance (${formatINR(availableToRefundPaise)}).`
    );
  }

  // 2. Fetch payment allocations
  const allocQuery = query(
    collection(db, "paymentAllocations"),
    where("schoolId", "==", schoolId),
    where("paymentId", "==", input.paymentId)
  );
  const allocSnap = await getDocs(allocQuery);
  const allocations = allocSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentAllocation));

  // 3. Fetch affected demands
  const demandIds = Array.from(new Set(allocations.map((a) => a.demandId)));
  const demandDocsMap = new Map<string, FeeDemand>();
  for (const dId of demandIds) {
    const dSnap = await getDoc(doc(db, "feeDemands", dId));
    if (dSnap.exists()) {
      demandDocsMap.set(dId, { id: dSnap.id, ...dSnap.data() } as FeeDemand);
    }
  }

  // 4. Distribute refund across allocations (LIFO reverse order)
  let unallocatedRefundPaise = refundAmountPaise;
  const allocatedRefunds: Array<{
    demandId: string;
    allocationId: string;
    feeHeadName: string;
    period: string;
    refundedAmountPaise: number;
  }> = [];

  const updatedDemands: FeeDemand[] = [];
  const batch = writeBatch(db);

  // Reverse allocations: newest allocation first
  const reversedAllocs = [...allocations].reverse();

  for (const alloc of reversedAllocs) {
    if (unallocatedRefundPaise <= 0) break;

    const demand = demandDocsMap.get(alloc.demandId);
    if (!demand) continue;

    // Refund up to this allocation's amount or remaining refund needed
    const refundFromThisAlloc = Math.min(alloc.allocatedAmountPaise, unallocatedRefundPaise);
    unallocatedRefundPaise -= refundFromThisAlloc;

    allocatedRefunds.push({
      demandId: alloc.demandId,
      allocationId: alloc.id,
      feeHeadName: alloc.feeHeadName,
      period: alloc.period,
      refundedAmountPaise: refundFromThisAlloc,
    });

    // Restore demand paid amount and recalculate balance
    const newPaidPaise = Math.max(0, demand.paidAmountPaise - refundFromThisAlloc);
    const newBalancePaise = calculateInvoiceBalance(demand.netAmountPaise, newPaidPaise);
    const newStatus = deriveInvoiceStatus(demand.netAmountPaise, newPaidPaise, demand.dueDate);

    const updatedDemand: FeeDemand = {
      ...demand,
      paidAmountPaise: newPaidPaise,
      balanceAmountPaise: newBalancePaise,
      status: newStatus,
      updatedAt: nowIso,
    };

    demandDocsMap.set(alloc.demandId, updatedDemand);
    const demandDocRef = doc(db, "feeDemands", demand.id);
    batch.set(demandDocRef, updatedDemand, { merge: true });
    updatedDemands.push(updatedDemand);
  }

  // 5. Generate Refund ID & Receipt Number
  let refundCount = 1;
  try {
    const countRefundsSnap = await getDocs(
      query(collection(db, "financialRefunds"), where("schoolId", "==", schoolId))
    );
    refundCount = countRefundsSnap.size + 1;
  } catch {
    refundCount = Math.floor(1000 + Math.random() * 9000);
  }
  const refundReceiptNumber = `REF-${dateStr}-${String(refundCount).padStart(4, "0")}`;
  const refundId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const refundRecord: FinancialRefund = {
    id: refundId,
    schoolId,
    paymentId: input.paymentId,
    receiptNumber: payment.receiptNumber,
    refundReceiptNumber,
    studentId: payment.studentId,
    studentName: payment.studentName,
    admissionNumber: payment.admissionNumber,
    className: payment.className,
    sectionName: payment.sectionName,
    academicYearId: payment.academicYearId,
    amountPaise: refundAmountPaise,
    reason: input.reason.trim(),
    refundMethod: input.refundMethod || payment.paymentMethod || "CASH",
    referenceNumber: input.referenceNumber || "",
    processedBy: actorId,
    processedByName: actorName,
    refundDate: nowIso,
    allocatedRefunds,
    createdAt: nowIso,
  };

  const refundDocRef = doc(db, "financialRefunds", refundId);
  batch.set(refundDocRef, refundRecord);

  // 6. Update Original Payment Status
  const newTotalRefundedPaise = currentRefundedPaise + refundAmountPaise;
  const newPaymentStatus: FinancialPayment["status"] =
    newTotalRefundedPaise >= payment.amountPaise ? "REFUNDED" : "PARTIALLY_REFUNDED";

  const updatedPayment: FinancialPayment = {
    ...payment,
    refundedAmountPaise: newTotalRefundedPaise,
    refundIds: [...(payment.refundIds || []), refundId],
    status: newPaymentStatus,
    updatedAt: nowIso,
  };
  batch.set(paymentDocRef, updatedPayment, { merge: true });

  // Update legacy record if exists
  try {
    const legacyPaymentRef = doc(db, "feePayments", input.paymentId);
    batch.update(legacyPaymentRef, {
      status: newPaymentStatus,
      refundedAmountPaise: newTotalRefundedPaise,
    });
  } catch {}

  // Commit atomic batch
  await batch.commit();

  // 7. Log Financial Audit
  await logFinancialAudit(
    schoolId,
    { id: actorId, role: "accountant", name: actorName },
    "REFUND",
    "Refund",
    refundId,
    { status: payment.status, refundedAmountPaise: currentRefundedPaise },
    { status: newPaymentStatus, refundedAmountPaise: newTotalRefundedPaise, refundRecord },
    `Refunded ${formatINR(refundAmountPaise)} for Payment ${payment.receiptNumber}. Reason: ${input.reason}`,
    { studentId: payment.studentId, academicYearId: payment.academicYearId }
  );

  return { refund: refundRecord, updatedPayment, updatedDemands };
}

/**
 * Payment Reversal:
 * Full cancellation of a mistaken transaction (e.g. wrong student/double manual entry).
 * Reverses 100% of allocations and marks transaction REVERSED.
 */
export async function processPaymentReversal(
  schoolId: string,
  input: {
    paymentId: string;
    reason: string;
    actorId?: string;
    actorName?: string;
  }
): Promise<{ reversal: PaymentReversal; updatedPayment: FinancialPayment; updatedDemands: FeeDemand[] }> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database not connected");

  if (!schoolId) throw new Error("schoolId is required.");
  if (!input.reason || input.reason.trim() === "") {
    throw new Error("Reversal reason is mandatory for financial audit.");
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const actorId = input.actorId || "admin";
  const actorName = input.actorName || "Staff Accountant";

  // 1. Fetch original payment
  const paymentDocRef = doc(db, "financialPayments", input.paymentId);
  const paymentSnap = await getDoc(paymentDocRef);
  if (!paymentSnap.exists()) {
    throw new Error("Payment record not found.");
  }
  const payment = { id: paymentSnap.id, ...paymentSnap.data() } as FinancialPayment;

  if (payment.schoolId !== schoolId) {
    throw new Error("Unauthorized: School ID mismatch.");
  }
  if (payment.status === "REVERSED") {
    throw new Error("This payment has already been reversed.");
  }
  if ((payment.refundedAmountPaise || 0) > 0) {
    throw new Error("Payment already has refunds applied. Full reversal is not permitted on partially refunded records.");
  }

  // 2. Fetch allocations
  const allocQuery = query(
    collection(db, "paymentAllocations"),
    where("schoolId", "==", schoolId),
    where("paymentId", "==", input.paymentId)
  );
  const allocSnap = await getDocs(allocQuery);
  const allocations = allocSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentAllocation));

  // 3. Reverse allocations on Demands
  const updatedDemands: FeeDemand[] = [];
  const reversedAllocations: Array<{
    demandId: string;
    allocationId: string;
    feeHeadName: string;
    period: string;
    reversedAmountPaise: number;
  }> = [];

  const batch = writeBatch(db);

  for (const alloc of allocations) {
    const demandSnap = await getDoc(doc(db, "feeDemands", alloc.demandId));
    if (demandSnap.exists()) {
      const demand = { id: demandSnap.id, ...demandSnap.data() } as FeeDemand;
      const newPaidPaise = Math.max(0, demand.paidAmountPaise - alloc.allocatedAmountPaise);
      const newBalancePaise = calculateInvoiceBalance(demand.netAmountPaise, newPaidPaise);
      const newStatus = deriveInvoiceStatus(demand.netAmountPaise, newPaidPaise, demand.dueDate);

      const updatedDemand: FeeDemand = {
        ...demand,
        paidAmountPaise: newPaidPaise,
        balanceAmountPaise: newBalancePaise,
        status: newStatus,
        paymentAllocationIds: (demand.paymentAllocationIds || []).filter((id) => id !== alloc.id),
        updatedAt: nowIso,
      };

      const demandDocRef = doc(db, "feeDemands", demand.id);
      batch.set(demandDocRef, updatedDemand, { merge: true });
      updatedDemands.push(updatedDemand);

      reversedAllocations.push({
        demandId: alloc.demandId,
        allocationId: alloc.id,
        feeHeadName: alloc.feeHeadName,
        period: alloc.period,
        reversedAmountPaise: alloc.allocatedAmountPaise,
      });
    }
  }

  // 4. Create Reversal Record
  const reversalId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const reversalRecord: PaymentReversal = {
    id: reversalId,
    schoolId,
    paymentId: input.paymentId,
    receiptNumber: payment.receiptNumber,
    studentId: payment.studentId,
    reversedAmountPaise: payment.amountPaise,
    reason: input.reason.trim(),
    reversedBy: actorId,
    reversedByName: actorName,
    reversedAt: nowIso,
    reversedAllocations,
    createdAt: nowIso,
  };

  const reversalDocRef = doc(db, "financialReversals", reversalId);
  batch.set(reversalDocRef, reversalRecord);

  // 5. Update Payment Status to REVERSED
  const updatedPayment: FinancialPayment = {
    ...payment,
    status: "REVERSED",
    reversalId,
    updatedAt: nowIso,
  };
  batch.set(paymentDocRef, updatedPayment, { merge: true });

  // Update legacy record if exists
  try {
    const legacyPaymentRef = doc(db, "feePayments", input.paymentId);
    batch.update(legacyPaymentRef, {
      status: "REVERSED",
    });
  } catch {}

  // Commit atomic batch
  await batch.commit();

  // 6. Log Financial Audit
  await logFinancialAudit(
    schoolId,
    { id: actorId, role: "accountant", name: actorName },
    "REVERSAL",
    "Reversal",
    reversalId,
    { status: payment.status },
    { status: "REVERSED", reversalRecord },
    `Reversed payment ${payment.receiptNumber} (${formatINR(payment.amountPaise)}). Reason: ${input.reason}`,
    { studentId: payment.studentId, academicYearId: payment.academicYearId }
  );

  return { reversal: reversalRecord, updatedPayment, updatedDemands };
}

/**
 * Authoritative Financial Payments Query with Filters
 */
export async function getFinancialPayments(
  schoolId: string,
  options?: {
    academicYearId?: string;
    className?: string;
    sectionName?: string;
    studentId?: string;
    paymentMethod?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    searchQuery?: string;
    limitCount?: number;
  }
): Promise<FinancialPayment[]> {
  const db = getFirebaseDb();
  if (!db || !schoolId) return [];

  try {
    const q = query(
      collection(db, "financialPayments"),
      where("schoolId", "==", schoolId)
    );
    const snap = await getDocs(q);
    let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialPayment));

    // Also include legacy payments if they aren't already represented in financialPayments
    try {
      const legQuery = query(collection(db, "feePayments"), where("schoolId", "==", schoolId));
      const legSnap = await getDocs(legQuery);
      const existingIds = new Set(list.map((p) => p.id));
      for (const d of legSnap.docs) {
        if (!existingIds.has(d.id)) {
          const data = d.data();
          list.push({
            id: d.id,
            receiptNumber: data.receiptNumber || `REC-${d.id.slice(0, 8)}`,
            schoolId,
            studentId: data.studentId || "",
            studentName: data.studentName || "",
            admissionNumber: data.admissionNumber || "",
            className: data.className || "",
            sectionName: data.sectionName || "",
            academicYearId: data.academicYearId || "",
            amountPaise: data.amountPaidPaise || data.netAmountPaise || 0,
            paymentDate: data.paymentDate || data.createdAt || new Date().toISOString(),
            paymentMethod: (data.paymentMethod || "CASH") as PaymentMethod,
            referenceNumber: data.transactionRef || data.referenceNumber || "",
            collectedBy: data.collectedBy || "",
            collectedByName: data.collectedByName || "",
            status: (data.status || "SUCCESS") as FinancialPayment["status"],
            remarks: data.remarks || "",
            allocatedTotalPaise: data.amountPaidPaise || 0,
            unallocatedPaise: 0,
            allocationCount: 1,
            periodMonths: Array.isArray(data.periodMonths) ? data.periodMonths : [],
            remainingDuePaise: data.remainingDuePaise,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
          });
        }
      }
    } catch {}

    // Apply filters
    if (options?.academicYearId && options.academicYearId !== "all") {
      list = list.filter((p) => p.academicYearId === options.academicYearId);
    }
    if (options?.className && options.className !== "all") {
      list = list.filter((p) => p.className.toLowerCase() === options.className!.toLowerCase());
    }
    if (options?.sectionName && options.sectionName !== "all") {
      list = list.filter((p) => p.sectionName.toLowerCase() === options.sectionName!.toLowerCase());
    }
    if (options?.studentId) {
      list = list.filter((p) => p.studentId === options.studentId);
    }
    if (options?.paymentMethod && options.paymentMethod !== "all") {
      list = list.filter((p) => p.paymentMethod.toUpperCase() === options.paymentMethod!.toUpperCase());
    }
    if (options?.status && options.status !== "all") {
      list = list.filter((p) => p.status.toUpperCase() === options.status!.toUpperCase());
    }
    if (options?.startDate) {
      const startTime = new Date(options.startDate).getTime();
      list = list.filter((p) => new Date(p.paymentDate).getTime() >= startTime);
    }
    if (options?.endDate) {
      const endTime = new Date(options.endDate).getTime();
      list = list.filter((p) => new Date(p.paymentDate).getTime() <= endTime);
    }
    if (options?.searchQuery && options.searchQuery.trim() !== "") {
      const qLower = options.searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.receiptNumber?.toLowerCase().includes(qLower) ||
          p.studentName?.toLowerCase().includes(qLower) ||
          p.admissionNumber?.toLowerCase().includes(qLower) ||
          p.referenceNumber?.toLowerCase().includes(qLower)
      );
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime());

    if (options?.limitCount && options.limitCount > 0) {
      list = list.slice(0, options.limitCount);
    }

    return list;
  } catch (err) {
    console.warn("[fee-foundation] getFinancialPayments notice:", err);
    return [];
  }
}

/**
 * Get detailed Payment record with Allocations, Demands, and Refunds
 */
export async function getPaymentDetailWithAllocations(
  schoolId: string,
  paymentId: string
): Promise<{
  payment: FinancialPayment;
  allocations: PaymentAllocation[];
  demands: FeeDemand[];
  refunds: FinancialRefund[];
  reversal: PaymentReversal | null;
} | null> {
  const db = getFirebaseDb();
  if (!db || !schoolId || !paymentId) return null;

  try {
    const paySnap = await getDoc(doc(db, "financialPayments", paymentId));
    let payment: FinancialPayment | null = null;
    if (paySnap.exists()) {
      payment = { id: paySnap.id, ...paySnap.data() } as FinancialPayment;
    } else {
      // Check legacy feePayments
      const legSnap = await getDoc(doc(db, "feePayments", paymentId));
      if (legSnap.exists()) {
        const data = legSnap.data();
        payment = {
          id: legSnap.id,
          receiptNumber: data.receiptNumber || `REC-${legSnap.id.slice(0, 8)}`,
          schoolId,
          studentId: data.studentId || "",
          studentName: data.studentName || "",
          admissionNumber: data.admissionNumber || "",
          className: data.className || "",
          sectionName: data.sectionName || "",
          academicYearId: data.academicYearId || "",
          amountPaise: data.amountPaidPaise || data.netAmountPaise || 0,
          paymentDate: data.paymentDate || data.createdAt,
          paymentMethod: data.paymentMethod || "CASH",
          referenceNumber: data.transactionRef || "",
          collectedBy: data.collectedBy || "",
          collectedByName: data.collectedByName || "",
          status: data.status || "SUCCESS",
          remarks: data.remarks || "",
          allocatedTotalPaise: data.amountPaidPaise || 0,
          unallocatedPaise: 0,
          allocationCount: 1,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt || data.createdAt,
        };
      }
    }

    if (!payment || payment.schoolId !== schoolId) return null;

    // Allocations
    const allocSnap = await getDocs(
      query(
        collection(db, "paymentAllocations"),
        where("schoolId", "==", schoolId),
        where("paymentId", "==", paymentId)
      )
    );
    const allocations = allocSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentAllocation));

    // Demands
    const demandIds = Array.from(new Set(allocations.map((a) => a.demandId)));
    const demands: FeeDemand[] = [];
    for (const dId of demandIds) {
      const dSnap = await getDoc(doc(db, "feeDemands", dId));
      if (dSnap.exists()) {
        demands.push({ id: dSnap.id, ...dSnap.data() } as FeeDemand);
      }
    }

    // Refunds
    const refundSnap = await getDocs(
      query(
        collection(db, "financialRefunds"),
        where("schoolId", "==", schoolId),
        where("paymentId", "==", paymentId)
      )
    );
    const refunds = refundSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialRefund));

    // Reversal
    let reversal: PaymentReversal | null = null;
    if (payment.reversalId) {
      const revSnap = await getDoc(doc(db, "financialReversals", payment.reversalId));
      if (revSnap.exists()) {
        reversal = { id: revSnap.id, ...revSnap.data() } as PaymentReversal;
      }
    }

    return { payment, allocations, demands, refunds, reversal };
  } catch (err) {
    console.warn("[fee-foundation] getPaymentDetailWithAllocations error:", err);
    return null;
  }
}

// ==========================================
// 8. DISCOUNTS & CONCESSIONS ENGINE
// ==========================================

export async function applyFeeAdjustment(
  schoolId: string,
  input: {
    studentId: string;
    studentName: string;
    academicYearId: string;
    demandId: string;
    type: AdjustmentType;
    amountRupees: number;
    reason: string;
    approvedBy: string;
    actorId?: string;
  }
): Promise<{ adjustment: FeeAdjustment; updatedDemand: FeeDemand }> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database not connected");

  if (input.amountRupees <= 0) {
    throw new Error("Adjustment amount must be positive.");
  }

  const demandRef = doc(db, "feeDemands", input.demandId);
  const snap = await getDoc(demandRef);
  if (!snap.exists()) throw new Error("Fee demand not found");

  const demand = snap.data() as FeeDemand;
  if (demand.schoolId !== schoolId) throw new Error("Tenant boundary violation");

  const adjPaise = rupeesToPaise(input.amountRupees);
  if (adjPaise > demand.balanceAmountPaise) {
    throw new Error(`Adjustment of ${formatINR(adjPaise)} exceeds demand balance of ${formatINR(demand.balanceAmountPaise)}.`);
  }

  const now = new Date().toISOString();
  const adjId = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const adjustment: FeeAdjustment = {
    id: adjId,
    schoolId,
    studentId: input.studentId,
    studentName: input.studentName,
    academicYearId: input.academicYearId,
    demandId: input.demandId,
    period: demand.period,
    type: input.type,
    amountPaise: adjPaise,
    reason: input.reason,
    approvedBy: input.approvedBy,
    createdBy: input.actorId || "admin",
    date: now,
    status: "APPLIED",
    createdAt: now,
    updatedAt: now,
  };

  // Recalculate demand net & balance
  let newDiscount = demand.discountAmountPaise;
  let newConcession = demand.concessionAmountPaise;

  if (input.type === "CONCESSION" || input.type === "SCHOLARSHIP") {
    newConcession += adjPaise;
  } else {
    newDiscount += adjPaise;
  }

  const newNet = calculateInvoiceTotal(demand.grossAmountPaise, newDiscount, newConcession, demand.lateFeePaise, demand.finePaise);
  const newBalance = calculateInvoiceBalance(newNet, demand.paidAmountPaise);
  const newStatus = deriveInvoiceStatus(newNet, demand.paidAmountPaise, demand.dueDate);

  const updatedDemand: FeeDemand = {
    ...demand,
    discountAmountPaise: newDiscount,
    concessionAmountPaise: newConcession,
    netAmountPaise: newNet,
    balanceAmountPaise: newBalance,
    status: newStatus,
    adjustmentIds: [...(demand.adjustmentIds || []), adjId],
    updatedAt: now,
  };

  await setDoc(doc(db, "feeAdjustments", adjId), adjustment);
  await setDoc(demandRef, updatedDemand, { merge: true });

  await logFinancialAudit(
    schoolId,
    { id: input.actorId || "admin", role: "admin" },
    "ADJUST",
    "Adjustment",
    adjId,
    { oldBalance: demand.balanceAmountPaise },
    { newBalance, adjustment },
    `Applied ${input.type} of ${formatINR(adjPaise)}. Reason: ${input.reason}`,
    { studentId: input.studentId, academicYearId: input.academicYearId }
  );

  return { adjustment, updatedDemand };
}

// ==========================================
// 9. STUDENT OVERALL FINANCIAL SUMMARY
// ==========================================

export async function getStudentFinancialSummary(
  schoolId: string,
  studentId: string,
  academicYearId: string
): Promise<StudentFinancialSummary> {
  const db = getFirebaseDb();
  const emptySummary: StudentFinancialSummary = {
    studentId,
    studentName: "Student",
    admissionNumber: studentId,
    className: "",
    sectionName: "",
    schoolId,
    academicYearId,
    totalGrossPaise: 0,
    totalDiscountPaise: 0,
    totalConcessionPaise: 0,
    totalLateFeePaise: 0,
    totalFinePaise: 0,
    totalNetPaise: 0,
    totalPaidPaise: 0,
    totalOutstandingPaise: 0,
    totalGrossRupees: 0,
    totalNetRupees: 0,
    totalPaidRupees: 0,
    totalOutstandingRupees: 0,
    status: "PAID",
    demandsCount: 0,
    paidDemandsCount: 0,
    pendingDemandsCount: 0,
    overdueDemandsCount: 0,
    recentDemands: [],
    recentPayments: [],
    recentAdjustments: [],
  };

  if (!db || !schoolId || !studentId) return emptySummary;

  try {
    // 1. Fetch student info
    let studentName = "Student";
    let admissionNumber = studentId;
    let className = "";
    let sectionName = "";

    const sSnap = await getDoc(doc(db, "schools", schoolId, "students", studentId));
    if (sSnap.exists()) {
      const sData = sSnap.data() as StudentProfile;
      studentName = sData.name || studentName;
      admissionNumber = sData.admissionNumber || admissionNumber;
      className = sData.className || className;
      sectionName = sData.sectionName || sectionName;
    }

    // 2. Fetch demands
    const qDemands = query(
      collection(db, "feeDemands"),
      where("schoolId", "==", schoolId),
      where("studentId", "==", studentId),
      where("academicYearId", "==", academicYearId)
    );
    const demandsSnap = await getDocs(qDemands);
    let demands = demandsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FeeDemand));

    // If no demands exist, lazily generate them
    if (demands.length === 0) {
      demands = await generateStudentFeeDemands(
        schoolId,
        { id: studentId, name: studentName, admissionNumber, className, sectionName },
        academicYearId
      );
    }

    // 3. Fetch payments
    const qPayments = query(
      collection(db, "financialPayments"),
      where("schoolId", "==", schoolId),
      where("studentId", "==", studentId),
      where("academicYearId", "==", academicYearId)
    );
    const paymentsSnap = await getDocs(qPayments);
    const payments = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialPayment));
    payments.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

    // 4. Fetch adjustments
    const qAdj = query(
      collection(db, "feeAdjustments"),
      where("schoolId", "==", schoolId),
      where("studentId", "==", studentId),
      where("academicYearId", "==", academicYearId)
    );
    const adjSnap = await getDocs(qAdj);
    const adjustments = adjSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FeeAdjustment));

    // 5. Aggregate metrics
    let totalGrossPaise = 0;
    let totalDiscountPaise = 0;
    let totalConcessionPaise = 0;
    let totalLateFeePaise = 0;
    let totalFinePaise = 0;
    let totalNetPaise = 0;
    let totalPaidPaise = 0;
    let paidDemandsCount = 0;
    let pendingDemandsCount = 0;
    let overdueDemandsCount = 0;

    for (const d of demands) {
      totalGrossPaise += d.grossAmountPaise;
      totalDiscountPaise += d.discountAmountPaise;
      totalConcessionPaise += d.concessionAmountPaise;
      totalLateFeePaise += d.lateFeePaise;
      totalFinePaise += d.finePaise;
      totalNetPaise += d.netAmountPaise;
      totalPaidPaise += d.paidAmountPaise;

      if (d.status === "PAID") paidDemandsCount++;
      else if (d.status === "OVERDUE") overdueDemandsCount++;
      else pendingDemandsCount++;
    }

    const totalOutstandingPaise = Math.max(0, totalNetPaise - totalPaidPaise);
    let overallStatus: StudentFinancialSummary["status"] = "PAID";
    if (totalOutstandingPaise > 0) {
      if (overdueDemandsCount > 0) overallStatus = "OVERDUE";
      else if (totalPaidPaise > 0) overallStatus = "PARTIAL";
      else overallStatus = "DUE";
    }

    return {
      studentId,
      studentName,
      admissionNumber,
      className,
      sectionName,
      schoolId,
      academicYearId,
      totalGrossPaise,
      totalDiscountPaise,
      totalConcessionPaise,
      totalLateFeePaise,
      totalFinePaise,
      totalNetPaise,
      totalPaidPaise,
      totalOutstandingPaise,
      totalGrossRupees: paiseToRupees(totalGrossPaise),
      totalNetRupees: paiseToRupees(totalNetPaise),
      totalPaidRupees: paiseToRupees(totalPaidPaise),
      totalOutstandingRupees: paiseToRupees(totalOutstandingPaise),
      status: overallStatus,
      demandsCount: demands.length,
      paidDemandsCount,
      pendingDemandsCount,
      overdueDemandsCount,
      recentDemands: demands.slice(0, 12),
      recentPayments: payments.slice(0, 5),
      recentAdjustments: adjustments.slice(0, 5),
    };
  } catch (err) {
    console.warn("getStudentFinancialSummary error:", err);
    return emptySummary;
  }
}

// ==========================================
// 10. ACADEMIC SESSION PERIOD ENGINE (INDIAN APRIL–MARCH)
// ==========================================

export const INDIAN_SESSION_MONTH_CONFIG = [
  { sequence: 1, monthName: "April", monthNumber: 4, offsetYear: 0 },
  { sequence: 2, monthName: "May", monthNumber: 5, offsetYear: 0 },
  { sequence: 3, monthName: "June", monthNumber: 6, offsetYear: 0 },
  { sequence: 4, monthName: "July", monthNumber: 7, offsetYear: 0 },
  { sequence: 5, monthName: "August", monthNumber: 8, offsetYear: 0 },
  { sequence: 6, monthName: "September", monthNumber: 9, offsetYear: 0 },
  { sequence: 7, monthName: "October", monthNumber: 10, offsetYear: 0 },
  { sequence: 8, monthName: "November", monthNumber: 11, offsetYear: 0 },
  { sequence: 9, monthName: "December", monthNumber: 12, offsetYear: 0 },
  { sequence: 10, monthName: "January", monthNumber: 1, offsetYear: 1 },
  { sequence: 11, monthName: "February", monthNumber: 2, offsetYear: 1 },
  { sequence: 12, monthName: "March", monthNumber: 3, offsetYear: 1 },
];

export function parseAcademicStartYear(academicYearName?: string): number {
  if (!academicYearName) return new Date().getFullYear();
  const match = academicYearName.match(/(\d{4})/);
  if (match) return parseInt(match[1], 10);
  return new Date().getFullYear();
}

/**
 * Returns 12 Indian Academic Session periods (April to March) with accurate calendar dates.
 */
export function getAcademicYearPeriods(academicYearName?: string): AcademicSessionPeriod[] {
  const startYear = parseAcademicStartYear(academicYearName);

  return INDIAN_SESSION_MONTH_CONFIG.map((cfg) => {
    const year = startYear + cfg.offsetYear;
    const monthIndex = cfg.monthNumber - 1;
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
    const mm = String(cfg.monthNumber).padStart(2, "0");
    const lastDayStr = String(lastDayOfMonth).padStart(2, "0");

    return {
      sequence: cfg.sequence,
      monthName: cfg.monthName,
      monthNumber: cfg.monthNumber,
      year,
      periodKey: `${cfg.monthName.toLowerCase()}_${year}`,
      displayName: `${cfg.monthName} ${year}`,
      startDate: `${year}-${mm}-01`,
      endDate: `${year}-${mm}-${lastDayStr}`,
    };
  });
}

/**
 * Frequency to billing periods resolver.
 * Supports: monthly (12), quarterly (4), half_yearly (2), annual/annually (1), one_time (1), custom.
 */
export function getFrequencyPeriods(
  frequency: FeeFrequency,
  academicYearName?: string
): FrequencyPeriod[] {
  const startYear = parseAcademicStartYear(academicYearName);
  const endYear = startYear + 1;

  switch (frequency) {
    case "quarterly":
      return [
        {
          periodKey: `q1_${startYear}`,
          displayName: `Q1 (Apr-Jun ${startYear})`,
          sequence: 1,
          startDate: `${startYear}-04-01`,
          endDate: `${startYear}-06-30`,
          dueMonthIndex: 3, // April
          dueYear: startYear,
        },
        {
          periodKey: `q2_${startYear}`,
          displayName: `Q2 (Jul-Sep ${startYear})`,
          sequence: 2,
          startDate: `${startYear}-07-01`,
          endDate: `${startYear}-09-30`,
          dueMonthIndex: 6, // July
          dueYear: startYear,
        },
        {
          periodKey: `q3_${startYear}`,
          displayName: `Q3 (Oct-Dec ${startYear})`,
          sequence: 3,
          startDate: `${startYear}-10-01`,
          endDate: `${startYear}-12-31`,
          dueMonthIndex: 9, // October
          dueYear: startYear,
        },
        {
          periodKey: `q4_${endYear}`,
          displayName: `Q4 (Jan-Mar ${endYear})`,
          sequence: 4,
          startDate: `${endYear}-01-01`,
          endDate: `${endYear}-03-31`,
          dueMonthIndex: 0, // January
          dueYear: endYear,
        },
      ];

    case "half_yearly":
      return [
        {
          periodKey: `h1_${startYear}`,
          displayName: `H1 (Apr-Sep ${startYear})`,
          sequence: 1,
          startDate: `${startYear}-04-01`,
          endDate: `${startYear}-09-30`,
          dueMonthIndex: 3, // April
          dueYear: startYear,
        },
        {
          periodKey: `h2_${startYear}_${endYear}`,
          displayName: `H2 (Oct-Mar ${endYear})`,
          sequence: 2,
          startDate: `${startYear}-10-01`,
          endDate: `${endYear}-03-31`,
          dueMonthIndex: 9, // October
          dueYear: startYear,
        },
      ];

    case "annual":
    case "annually":
      return [
        {
          periodKey: `annual_${startYear}_${endYear}`,
          displayName: `Annual Session ${startYear}-${endYear}`,
          sequence: 1,
          startDate: `${startYear}-04-01`,
          endDate: `${endYear}-03-31`,
          dueMonthIndex: 3, // April
          dueYear: startYear,
        },
      ];

    case "one_time":
      return [
        {
          periodKey: `onetime_${startYear}`,
          displayName: `One-Time / Admission ${startYear}`,
          sequence: 1,
          startDate: `${startYear}-04-01`,
          endDate: `${endYear}-03-31`,
          dueMonthIndex: 3, // April
          dueYear: startYear,
        },
      ];

    case "monthly":
    case "custom":
    default: {
      const periods = getAcademicYearPeriods(academicYearName);
      return periods.map((p) => ({
        periodKey: p.periodKey,
        displayName: p.displayName,
        sequence: p.sequence,
        startDate: p.startDate,
        endDate: p.endDate,
        dueMonthIndex: p.monthNumber - 1,
        dueYear: p.year,
      }));
    }
  }
}

/**
 * Resolves a safe due date string avoiding month rollover (e.g. Day 31 in Feb -> Feb 28 or 29).
 */
export function resolveSafeDueDate(year: number, monthIndex: number, dueDayOfMonth: number): string {
  const maxDays = new Date(year, monthIndex + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, dueDayOfMonth), maxDays);
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(safeDay).padStart(2, "0");
  return `${year}-${mm}-${dd}T00:00:00.000Z`;
}

// ==========================================
// 11. ADVANCED FEE STRUCTURE CRUD & VERSIONING
// ==========================================

export async function createFeeStructureDefinition(
  schoolId: string,
  input: {
    academicYearId: string;
    academicYearName: string;
    feeHeadId: string;
    feeHeadName: string;
    className: string;
    sectionName?: string;
    title: string;
    amountRupees: number;
    frequency: FeeFrequency;
    dueDayOfMonth?: number;
    applicableMonths?: string[];
    gracePeriodDays?: number;
    lateFeeRule?: FeeStructureDefinition["lateFeeRule"];
  },
  actorId: string = "admin"
): Promise<FeeStructureDefinition> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database not initialized");

  if (!input.title || !input.className || !input.academicYearId || !input.feeHeadId) {
    throw new Error("Title, Class, Academic Year, and Fee Head are required.");
  }
  if (input.amountRupees <= 0) {
    throw new Error("Fee structure amount must be greater than zero.");
  }

  // Check duplicate active structure for same academicYear, class, and feeHead
  const qExisting = query(
    collection(db, "feeStructures"),
    where("schoolId", "==", schoolId),
    where("academicYearId", "==", input.academicYearId),
    where("status", "==", "ACTIVE")
  );
  const existingSnap = await getDocs(qExisting);
  const normClass = normalizeClassKey(input.className);
  const normSection = normalizeClassKey(input.sectionName || "all");

  const duplicate = existingSnap.docs.find((d) => {
    const data = d.data();
    return (
      data.feeHeadId === input.feeHeadId &&
      normalizeClassKey(data.className) === normClass &&
      normalizeClassKey(data.sectionName || "all") === normSection
    );
  });

  if (duplicate) {
    throw new Error(`An active fee structure already exists for this Class and Fee Head in session ${input.academicYearName}.`);
  }

  const structId = `fs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newStructure: FeeStructureDefinition = {
    id: structId,
    schoolId,
    academicYearId: input.academicYearId,
    academicYearName: input.academicYearName,
    feeHeadId: input.feeHeadId,
    feeHeadName: input.feeHeadName,
    className: input.className,
    sectionName: input.sectionName || "all",
    title: input.title.trim(),
    amountPaise: rupeesToPaise(input.amountRupees),
    frequency: input.frequency,
    dueDayOfMonth: input.dueDayOfMonth || 10,
    applicableMonths: input.applicableMonths || SESSION_MONTHS,
    gracePeriodDays: input.gracePeriodDays ?? 5,
    lateFeeRule: input.lateFeeRule || {
      enabled: false,
      gracePeriodDays: 5,
      type: "FIXED",
      amountPaise: 5000,
    },
    version: 1,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    createdBy: actorId,
  };

  await setDoc(doc(db, "feeStructures", structId), newStructure);
  await logFinancialAudit(
    schoolId,
    { id: actorId, role: "admin" },
    "CREATE",
    "FeeStructure",
    structId,
    null,
    newStructure,
    `Created fee structure "${newStructure.title}"`,
    { academicYearId: input.academicYearId }
  );

  return newStructure;
}

export async function updateFeeStructureDefinition(
  schoolId: string,
  structureId: string,
  updates: Partial<Pick<FeeStructureDefinition, "title" | "dueDayOfMonth" | "gracePeriodDays" | "lateFeeRule" | "status">> & {
    amountRupees?: number;
  },
  actorId: string = "admin"
): Promise<FeeStructureDefinition> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database not initialized");

  const structRef = doc(db, "feeStructures", structureId);
  const snap = await getDoc(structRef);
  if (!snap.exists()) throw new Error("Fee structure not found");

  const current = snap.data() as FeeStructureDefinition;
  if (current.schoolId !== schoolId) throw new Error("Tenant boundary violation");

  const now = new Date().toISOString();
  let newAmountPaise = current.amountPaise;
  let newVersion = current.version;

  if (updates.amountRupees !== undefined) {
    if (updates.amountRupees <= 0) {
      throw new Error("Amount must be greater than zero.");
    }
    const proposedPaise = rupeesToPaise(updates.amountRupees);
    if (proposedPaise !== current.amountPaise) {
      newAmountPaise = proposedPaise;
      newVersion = current.version + 1; // Bump version to protect historical demand immutability
    }
  }

  const updated: FeeStructureDefinition = {
    ...current,
    ...updates,
    amountPaise: newAmountPaise,
    version: newVersion,
    updatedAt: now,
  };

  await setDoc(structRef, updated, { merge: true });
  await logFinancialAudit(
    schoolId,
    { id: actorId, role: "admin" },
    "UPDATE",
    "FeeStructure",
    structureId,
    current,
    updated,
    `Updated fee structure "${current.title}" to version ${newVersion}`,
    { academicYearId: current.academicYearId }
  );

  return updated;
}

export async function duplicateFeeStructuresForAcademicYear(
  schoolId: string,
  sourceAcademicYearId: string,
  targetAcademicYearId: string,
  targetAcademicYearName: string,
  actorId: string = "admin"
): Promise<FeeStructureDefinition[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database not initialized");

  const qSource = query(
    collection(db, "feeStructures"),
    where("schoolId", "==", schoolId),
    where("academicYearId", "==", sourceAcademicYearId),
    where("status", "==", "ACTIVE")
  );
  const snap = await getDocs(qSource);
  if (snap.empty) return [];

  const createdList: FeeStructureDefinition[] = [];
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  for (const docSnap of snap.docs) {
    const src = docSnap.data() as FeeStructureDefinition;
    const newId = `fs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const duplicated: FeeStructureDefinition = {
      ...src,
      id: newId,
      academicYearId: targetAcademicYearId,
      academicYearName: targetAcademicYearName,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
    };
    batch.set(doc(db, "feeStructures", newId), duplicated);
    createdList.push(duplicated);
  }

  await batch.commit();

  await logFinancialAudit(
    schoolId,
    { id: actorId, role: "admin" },
    "CREATE",
    "FeeStructure",
    targetAcademicYearId,
    null,
    { count: createdList.length, sourceAcademicYearId, targetAcademicYearId },
    `Duplicated ${createdList.length} fee structures to session ${targetAcademicYearName}`,
    { academicYearId: targetAcademicYearId }
  );

  return createdList;
}

// ==========================================
// 12. DEMAND ENGINE (PROMOTION & MID-YEAR AWARE)
// ==========================================

export async function previewBulkDemandGeneration(
  schoolId: string,
  options: BulkDemandOptions
): Promise<BulkDemandGenerationResult> {
  const db = getFirebaseDb();
  if (!db || !schoolId) {
    return {
      eligibleStudents: 0,
      alreadyGenerated: 0,
      newlyGenerated: 0,
      skipped: 0,
      failed: 0,
      totalGrossPaise: 0,
      totalNetPaise: 0,
      demands: [],
      errors: ["Database connection unavailable"],
    };
  }

  try {
    // 1. Fetch target students
    const studentsSnap = await getDocs(collection(db, "schools", schoolId, "students"));
    let students = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentProfile));

    // Filter active
    students = students.filter((s) => s.status === "active");

    if (options.className && options.className !== "all") {
      students = students.filter((s) => normalizeClassKey(s.className) === normalizeClassKey(options.className));
    }
    if (options.sectionName && options.sectionName !== "all") {
      students = students.filter((s) => normalizeClassKey(s.sectionName) === normalizeClassKey(options.sectionName));
    }
    if (options.studentIds && options.studentIds.length > 0) {
      students = students.filter((s) => options.studentIds!.includes(s.id));
    }

    // 2. Fetch active fee structures for academic year
    const qStructs = query(
      collection(db, "feeStructures"),
      where("schoolId", "==", schoolId),
      where("academicYearId", "==", options.academicYearId),
      where("status", "==", "ACTIVE")
    );
    const structSnap = await getDocs(qStructs);
    const allStructures = structSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FeeStructureDefinition));

    // 3. Fetch all existing demands for this academic year to determine already generated
    const qDemands = query(
      collection(db, "feeDemands"),
      where("schoolId", "==", schoolId),
      where("academicYearId", "==", options.academicYearId)
    );
    const demandSnap = await getDocs(qDemands);
    const existingDemandIds = new Set(demandSnap.docs.map((d) => d.id));

    let alreadyGeneratedCount = 0;
    let newlyGeneratedCount = 0;
    let skippedCount = 0;
    let totalGrossPaise = 0;
    let totalNetPaise = 0;
    const previewDemands: FeeDemand[] = [];

    const academicName = options.academicYearName || "2026-27";
    const startYear = parseAcademicStartYear(academicName);

    for (const student of students) {
      const studentClassNorm = normalizeClassKey(student.className);
      const studentSectionNorm = normalizeClassKey(student.sectionName || "all");

      const studentStructures = allStructures.filter((s) => {
        const sClass = normalizeClassKey(s.className);
        const sSec = normalizeClassKey(s.sectionName || "all");
        const matchClass = sClass === "all" || sClass === "any" || sClass === studentClassNorm;
        const matchSec = !sSec || sSec === "all" || sSec === "any" || sSec === studentSectionNorm;
        return matchClass && matchSec;
      });

      if (studentStructures.length === 0) {
        skippedCount++;
        continue;
      }

      for (const struct of studentStructures) {
        const freqPeriods = getFrequencyPeriods(struct.frequency, academicName);
        const periods = options.periodName && options.periodName !== "all"
          ? freqPeriods.filter((p) => p.displayName.toLowerCase().includes(options.periodName!.toLowerCase()) || p.periodKey.toLowerCase().includes(options.periodName!.toLowerCase()))
          : freqPeriods;

        for (const p of periods) {
          // Mid-year admission check
          if (student.admissionDate && !options.includeArrears) {
            const admDateStr = student.admissionDate.slice(0, 10);
            if (p.endDate < admDateStr) {
              skippedCount++;
              continue;
            }
          }

          const demandId = buildDeterministicDemandId(
            schoolId,
            student.id,
            options.academicYearId,
            struct.feeHeadId,
            p.displayName
          );

          if (existingDemandIds.has(demandId)) {
            alreadyGeneratedCount++;
          } else {
            newlyGeneratedCount++;
            const grossPaise = struct.amountPaise;
            const netPaise = grossPaise;
            totalGrossPaise += grossPaise;
            totalNetPaise += netPaise;

            const dueDate = resolveSafeDueDate(p.dueYear, p.dueMonthIndex, struct.dueDayOfMonth || 10);

            previewDemands.push({
              id: demandId,
              invoiceNumber: `INV-${startYear}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
              schoolId,
              studentId: student.id,
              studentName: student.name,
              admissionNumber: student.admissionNumber || student.id,
              className: student.className,
              sectionName: student.sectionName || "A",
              academicYearId: options.academicYearId,
              academicYearName: academicName,
              feeHeadId: struct.feeHeadId,
              feeHeadName: struct.feeHeadName,
              feeStructureId: struct.id,
              period: p.displayName,
              dueDate,
              grossAmountPaise: grossPaise,
              discountAmountPaise: 0,
              concessionAmountPaise: 0,
              lateFeePaise: 0,
              finePaise: 0,
              netAmountPaise: netPaise,
              paidAmountPaise: 0,
              balanceAmountPaise: netPaise,
              status: "DUE",
              paymentAllocationIds: [],
              adjustmentIds: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: options.actorId || "admin",
            });
          }
        }
      }
    }

    return {
      eligibleStudents: students.length,
      alreadyGenerated: alreadyGeneratedCount,
      newlyGenerated: newlyGeneratedCount,
      skipped: skippedCount,
      failed: 0,
      totalGrossPaise,
      totalNetPaise,
      demands: previewDemands,
      errors: [],
    };
  } catch (err: any) {
    return {
      eligibleStudents: 0,
      alreadyGenerated: 0,
      newlyGenerated: 0,
      skipped: 0,
      failed: 0,
      totalGrossPaise: 0,
      totalNetPaise: 0,
      demands: [],
      errors: [err.message || "Failed to preview demand generation"],
    };
  }
}

/**
 * Authoritative Bulk Fee Demand Generation with Firestore Write Chunking (<= 200 per batch).
 */
export async function generateBulkFeeDemands(
  schoolId: string,
  options: BulkDemandOptions
): Promise<BulkDemandGenerationResult> {
  const db = getFirebaseDb();
  if (!db || !schoolId) throw new Error("Database not connected");

  // Run preview to obtain deterministic list of new demands to generate
  const preview = await previewBulkDemandGeneration(schoolId, options);
  if (preview.demands.length === 0) {
    return preview;
  }

  const BATCH_SIZE = 200;
  const demands = preview.demands;
  const committedDemands: FeeDemand[] = [];
  const errors: string[] = [];

  for (let i = 0; i < demands.length; i += BATCH_SIZE) {
    const chunk = demands.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const demand of chunk) {
      const demandRef = doc(db, "feeDemands", demand.id);
      batch.set(demandRef, demand, { merge: true });
    }

    try {
      await batch.commit();
      committedDemands.push(...chunk);
    } catch (chunkErr: any) {
      console.error("Batch demand commit error:", chunkErr);
      errors.push(`Chunk ${i / BATCH_SIZE + 1} failed: ${chunkErr.message}`);
    }
  }

  await logFinancialAudit(
    schoolId,
    { id: options.actorId || "admin", role: "admin", name: options.actorName || "Admin" },
    "CREATE",
    "FeeDemand",
    options.academicYearId,
    null,
    {
      committedCount: committedDemands.length,
      failedCount: demands.length - committedDemands.length,
      academicYearId: options.academicYearId,
    },
    `Bulk generated ${committedDemands.length} fee demands.`,
    { academicYearId: options.academicYearId }
  );

  return {
    eligibleStudents: preview.eligibleStudents,
    alreadyGenerated: preview.alreadyGenerated,
    newlyGenerated: committedDemands.length,
    skipped: preview.skipped,
    failed: demands.length - committedDemands.length,
    totalGrossPaise: preview.totalGrossPaise,
    totalNetPaise: preview.totalNetPaise,
    demands: committedDemands,
    errors,
  };
}

// ==========================================
// 13. CENTRALIZED OUTSTANDING CALCULATORS
// ==========================================

export async function calculateStudentOutstanding(
  schoolId: string,
  studentId: string,
  academicYearId?: string
): Promise<{
  totalGrossPaise: number;
  totalDiscountPaise: number;
  totalNetPaise: number;
  totalPaidPaise: number;
  totalOutstandingPaise: number;
  demandsCount: number;
  pendingDemandsCount: number;
}> {
  const db = getFirebaseDb();
  if (!db || !schoolId || !studentId) {
    return {
      totalGrossPaise: 0,
      totalDiscountPaise: 0,
      totalNetPaise: 0,
      totalPaidPaise: 0,
      totalOutstandingPaise: 0,
      demandsCount: 0,
      pendingDemandsCount: 0,
    };
  }

  const q = academicYearId
    ? query(
        collection(db, "feeDemands"),
        where("schoolId", "==", schoolId),
        where("studentId", "==", studentId),
        where("academicYearId", "==", academicYearId)
      )
    : query(
        collection(db, "feeDemands"),
        where("schoolId", "==", schoolId),
        where("studentId", "==", studentId)
      );

  const snap = await getDocs(q);
  let totalGross = 0;
  let totalDiscount = 0;
  let totalNet = 0;
  let totalPaid = 0;
  let pendingCount = 0;

  for (const d of snap.docs) {
    const data = d.data() as FeeDemand;
    totalGross += data.grossAmountPaise || 0;
    totalDiscount += (data.discountAmountPaise || 0) + (data.concessionAmountPaise || 0);
    totalNet += data.netAmountPaise || 0;
    totalPaid += data.paidAmountPaise || 0;
    if (data.balanceAmountPaise > 0) pendingCount++;
  }

  return {
    totalGrossPaise: totalGross,
    totalDiscountPaise: totalDiscount,
    totalNetPaise: totalNet,
    totalPaidPaise: totalPaid,
    totalOutstandingPaise: Math.max(0, totalNet - totalPaid),
    demandsCount: snap.size,
    pendingDemandsCount: pendingCount,
  };
}

export async function calculateClassOutstanding(
  schoolId: string,
  className: string,
  academicYearId: string
): Promise<ClassOutstandingSummary> {
  const db = getFirebaseDb();
  const empty: ClassOutstandingSummary = {
    className,
    academicYearId,
    studentCount: 0,
    totalGrossPaise: 0,
    totalDiscountPaise: 0,
    totalNetPaise: 0,
    totalPaidPaise: 0,
    totalOutstandingPaise: 0,
    totalGrossRupees: 0,
    totalNetRupees: 0,
    totalPaidRupees: 0,
    totalOutstandingRupees: 0,
    paidStudentsCount: 0,
    partialStudentsCount: 0,
    dueStudentsCount: 0,
    overdueStudentsCount: 0,
  };

  if (!db || !schoolId || !className) return empty;

  try {
    // 1. Fetch class students
    const sSnap = await getDocs(collection(db, "schools", schoolId, "students"));
    const normClass = normalizeClassKey(className);
    const classStudents = sSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as StudentProfile))
      .filter((s) => normalizeClassKey(s.className) === normClass && s.status !== "inactive");

    if (classStudents.length === 0) return empty;

    // 2. Fetch all demands for this academic year
    const qDemands = query(
      collection(db, "feeDemands"),
      where("schoolId", "==", schoolId),
      where("academicYearId", "==", academicYearId)
    );
    const demandSnap = await getDocs(qDemands);
    const studentMap = new Map<string, { net: number; paid: number; hasOverdue: boolean }>();

    for (const d of demandSnap.docs) {
      const data = d.data() as FeeDemand;
      if (normalizeClassKey(data.className) !== normClass) continue;

      const curr = studentMap.get(data.studentId) || { net: 0, paid: 0, hasOverdue: false };
      curr.net += data.netAmountPaise || 0;
      curr.paid += data.paidAmountPaise || 0;
      if (data.status === "OVERDUE") curr.hasOverdue = true;
      studentMap.set(data.studentId, curr);
    }

    let gross = 0;
    let discount = 0;
    let net = 0;
    let paid = 0;
    let paidCount = 0;
    let partialCount = 0;
    let dueCount = 0;
    let overdueCount = 0;

    for (const student of classStudents) {
      const summary = studentMap.get(student.id) || { net: 0, paid: 0, hasOverdue: false };
      net += summary.net;
      paid += summary.paid;
      gross += summary.net; // Approx base

      const balance = Math.max(0, summary.net - summary.paid);
      if (balance === 0 && summary.net > 0) {
        paidCount++;
      } else if (summary.hasOverdue) {
        overdueCount++;
      } else if (summary.paid > 0) {
        partialCount++;
      } else {
        dueCount++;
      }
    }

    const outstanding = Math.max(0, net - paid);

    return {
      className,
      academicYearId,
      studentCount: classStudents.length,
      totalGrossPaise: gross,
      totalDiscountPaise: discount,
      totalNetPaise: net,
      totalPaidPaise: paid,
      totalOutstandingPaise: outstanding,
      totalGrossRupees: paiseToRupees(gross),
      totalNetRupees: paiseToRupees(net),
      totalPaidRupees: paiseToRupees(paid),
      totalOutstandingRupees: paiseToRupees(outstanding),
      paidStudentsCount: paidCount,
      partialStudentsCount: partialCount,
      dueStudentsCount: dueCount,
      overdueStudentsCount: overdueCount,
    };
  } catch (err) {
    console.warn("calculateClassOutstanding error:", err);
    return empty;
  }
}

export async function calculateSectionOutstanding(
  schoolId: string,
  className: string,
  sectionName: string,
  academicYearId: string
): Promise<ClassOutstandingSummary> {
  return calculateClassOutstanding(schoolId, `${className} - ${sectionName}`, academicYearId);
}

// ==========================================
// 14. FEE WAIVER ENGINE
// ==========================================

export async function applyFeeWaiver(
  schoolId: string,
  studentId: string,
  demandId: string,
  amountRupees: number,
  reason: string,
  approvedBy: string,
  actorId: string = "admin"
): Promise<{ adjustment: FeeAdjustment; updatedDemand: FeeDemand }> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database not connected");

  if (amountRupees <= 0) {
    throw new Error("Waiver amount must be greater than zero.");
  }

  const demandRef = doc(db, "feeDemands", demandId);
  const snap = await getDoc(demandRef);
  if (!snap.exists()) throw new Error("Fee demand invoice not found");

  const demand = snap.data() as FeeDemand;
  if (demand.schoolId !== schoolId) throw new Error("Tenant isolation violation");
  if (demand.studentId !== studentId) throw new Error("Demand does not belong to specified student");

  const waiverPaise = rupeesToPaise(amountRupees);
  if (waiverPaise > demand.balanceAmountPaise) {
    throw new Error(`Waiver amount of ${formatINR(waiverPaise)} exceeds pending balance of ${formatINR(demand.balanceAmountPaise)}.`);
  }

  const now = new Date().toISOString();
  const adjId = `adj_waiver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const adjustment: FeeAdjustment = {
    id: adjId,
    schoolId,
    studentId,
    studentName: demand.studentName,
    academicYearId: demand.academicYearId,
    demandId,
    period: demand.period,
    type: "WAIVER",
    amountPaise: waiverPaise,
    reason,
    approvedBy,
    createdBy: actorId,
    date: now,
    status: "APPLIED",
    createdAt: now,
    updatedAt: now,
  };

  // Safe waiver calculation: decreases net amount and pending balance without fake payments
  const newConcession = demand.concessionAmountPaise + waiverPaise;
  const newNet = calculateInvoiceTotal(demand.grossAmountPaise, demand.discountAmountPaise, newConcession, demand.lateFeePaise, demand.finePaise);
  const newBalance = calculateInvoiceBalance(newNet, demand.paidAmountPaise);

  let newStatus: FeeDemandStatus = demand.status;
  if (newBalance === 0) {
    newStatus = demand.paidAmountPaise > 0 ? "PAID" : "WAIVED";
  } else {
    newStatus = deriveInvoiceStatus(newNet, demand.paidAmountPaise, demand.dueDate);
  }

  const updatedDemand: FeeDemand = {
    ...demand,
    concessionAmountPaise: newConcession,
    netAmountPaise: newNet,
    balanceAmountPaise: newBalance,
    status: newStatus,
    adjustmentIds: [...(demand.adjustmentIds || []), adjId],
    updatedAt: now,
  };

  await setDoc(doc(db, "feeAdjustments", adjId), adjustment);
  await setDoc(demandRef, updatedDemand, { merge: true });

  await logFinancialAudit(
    schoolId,
    { id: actorId, role: "admin" },
    "ADJUST",
    "Adjustment",
    adjId,
    { oldBalance: demand.balanceAmountPaise, oldStatus: demand.status },
    { newBalance, newStatus, waiverPaise },
    `Applied fee waiver of ${formatINR(waiverPaise)}. Reason: ${reason}. Approved by: ${approvedBy}`,
    { studentId, academicYearId: demand.academicYearId }
  );

  return { adjustment, updatedDemand };
}

