import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  limit,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import type {
  FeeAutomationRule,
  SendResult,
} from "@/types/communication";
import {
  DEFAULT_FEE_AUTOMATION_RULES,
  dispatchCommunicationMessage,
  getSchoolCommunicationAccess,
  resolveTemplateVariables,
} from "./communication.service";
import { getStudents } from "@/lib/services/student.service";
import { getFeeStructures } from "./fee.service";

/**
 * Retrieves configured fee automation rules for a school.
 */
export async function getSchoolAutomationRules(schoolId: string): Promise<FeeAutomationRule[]> {
  if (!schoolId) return [];

  try {
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      const snap = await adminDb.collection("schools").doc(schoolId).collection("communication_rules").get();
      if (!snap.empty) {
        return snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as FeeAutomationRule));
      }
    } else {
      const db = getFirebaseDb();
      if (db) {
        const snap = await getDocs(collection(db, "schools", schoolId, "communication_rules"));
        if (!snap.empty) {
          return snap.docs.map((d) => ({ ...d.data(), id: d.id } as FeeAutomationRule));
        }
      }
    }
  } catch (err) {
    console.warn("[CommunicationAutomation] Error reading school rules:", err);
  }

  // Return system defaults if no custom rules configured yet
  return DEFAULT_FEE_AUTOMATION_RULES.map((r) => ({ ...r, schoolId }));
}

/**
 * Saves or updates a fee automation rule for a school.
 */
export async function saveSchoolAutomationRule(schoolId: string, rule: FeeAutomationRule): Promise<void> {
  const adminDb = getSafeAdminDb();
  const db = getFirebaseDb();
  const now = new Date().toISOString();

  const dataToSave = {
    ...rule,
    schoolId,
    updatedAt: now,
    createdAt: rule.createdAt || now,
  };

  if (adminDb) {
    await adminDb.collection("schools").doc(schoolId).collection("communication_rules").doc(rule.id).set(dataToSave, { merge: true });
    return;
  }

  if (db) {
    await setDoc(doc(db, "schools", schoolId, "communication_rules", rule.id), dataToSave, { merge: true });
  }
}

export interface AutomationExecutionReport {
  timestamp: string;
  schoolId: string;
  totalStudentsScanned: number;
  activeRulesCount: number;
  messagesDispatched: number;
  duplicatesSkipped: number;
  errorsCount: number;
  details: Array<{
    studentName: string;
    ruleType: string;
    channel: string;
    status: string;
    error?: string;
  }>;
}

/**
 * Executes fee reminder automation for a school.
 * Evaluates rules (before due, on due, overdue, late fee) against real student fee records.
 * Uses strict deduplication to prevent duplicate reminders on the same day.
 */
export async function runSchoolFeeReminderAutomation(
  schoolId: string,
  triggeredBy: { uid: string; name: string; role: string }
): Promise<AutomationExecutionReport> {
  const report: AutomationExecutionReport = {
    timestamp: new Date().toISOString(),
    schoolId,
    totalStudentsScanned: 0,
    activeRulesCount: 0,
    messagesDispatched: 0,
    duplicatesSkipped: 0,
    errorsCount: 0,
    details: [],
  };

  // 1. Verify school communication & automation entitlement
  const access = await getSchoolCommunicationAccess(schoolId);
  if (!access.canAutomate) {
    throw new Error(access.lockReason || "Fee reminder automation is not enabled for this school's plan.");
  }

  // 2. Load active rules
  const allRules = await getSchoolAutomationRules(schoolId);
  const activeRules = allRules.filter((r) => r.enabled);
  report.activeRulesCount = activeRules.length;

  if (activeRules.length === 0) {
    return report;
  }

  // 3. Load students and school fee structures
  const [students, feeStructures] = await Promise.all([
    getStudents(schoolId).catch(() => []),
    getFeeStructures(schoolId).catch(() => []),
  ]);

  report.totalStudentsScanned = students.length;

  const today = new Date();
  const todayDateStr = today.toISOString().split("T")[0];
  const currentDayOfMonth = today.getDate(); // 1 - 31
  const defaultDueDay = 10; // 10th of every month is standard fee due date

  for (const student of students) {
    if (student.status && student.status.toLowerCase() !== "active") continue;

    // Resolve student monthly fee
    const matchingStructure = feeStructures.find(
      (s) => (s as any).classId === student.classId || s.className?.toLowerCase() === student.className?.toLowerCase()
    );
    const monthlyFee = matchingStructure?.amountPaise ? Math.round(matchingStructure.amountPaise / 100) : 500;
    const dueDay = matchingStructure?.dueDayOfMonth || defaultDueDay;

    // Check each active rule
    for (const rule of activeRules) {
      let isApplicable = false;
      let dueDateFormatted = `${dueDay} of this month`;

      if (rule.type === "before_due") {
        // e.g. rule.daysOffset = -3 -> trigger 3 days before due day (e.g. 7th if due on 10th)
        const targetTriggerDay = dueDay + rule.daysOffset;
        if (currentDayOfMonth === targetTriggerDay) {
          isApplicable = true;
        }
      } else if (rule.type === "on_due") {
        // e.g. due day is today
        if (currentDayOfMonth === dueDay) {
          isApplicable = true;
        }
      } else if (rule.type === "overdue") {
        // e.g. 3 days after due date (13th if due on 10th)
        const targetOverdueDay = dueDay + rule.daysOffset;
        if (currentDayOfMonth === targetOverdueDay) {
          isApplicable = true;
        }
      }

      if (isApplicable) {
        // Process for each configured channel in this rule
        for (const channel of rule.channels) {
          // Idempotency deduplication key
          const dedupKey = `auto:${schoolId}:${student.id}:${rule.type}:${channel}:${todayDateStr}`;

          // Check if already sent today
          const isSentToday = await checkIdempotency(schoolId, dedupKey);
          if (isSentToday) {
            report.duplicatesSkipped++;
            continue;
          }

          // Template variable resolution
          const templateData = {
            student_name: student.name,
            parent_name: student.fatherName || student.guardianName || "Parent",
            class_name: student.className || "Class",
            admission_no: student.admissionNumber || student.rollNumber || "N/A",
            amount: monthlyFee,
            due_date: dueDateFormatted,
            school_name: access.schoolName || "School",
            pay_link: `https://schoolstudy.in/pay/${schoolId}/${student.id}`,
          };

          const resolvedBody = resolveTemplateVariables(rule.bodyTemplate, templateData);
          const resolvedTitle = resolveTemplateVariables(rule.titleTemplate || "School Fee Reminder", templateData);

          try {
            const sendRes = await dispatchCommunicationMessage(
              {
                schoolId,
                studentId: student.id,
                studentName: student.name,
                admissionNumber: student.admissionNumber,
                className: student.className,
                parentName: student.fatherName || student.guardianName,
                recipientPhone: student.phone,
                recipientEmail: student.email,
                userId: student.userId,
                channel,
                title: resolvedTitle,
                content: resolvedBody,
                triggerType: "automation",
                idempotencyKey: dedupKey,
                metadata: {
                  ruleId: rule.id,
                  ruleType: rule.type,
                  amount: monthlyFee,
                },
              },
              triggeredBy
            );

            if (sendRes.success) {
              report.messagesDispatched++;
              report.details.push({
                studentName: student.name,
                ruleType: rule.type,
                channel,
                status: "sent",
              });
            } else {
              report.errorsCount++;
              report.details.push({
                studentName: student.name,
                ruleType: rule.type,
                channel,
                status: "failed",
                error: sendRes.error,
              });
            }
          } catch (sendErr: any) {
            report.errorsCount++;
            report.details.push({
              studentName: student.name,
              ruleType: rule.type,
              channel,
              status: "failed",
              error: sendErr.message,
            });
          }
        }
      }
    }
  }

  return report;
}

/**
 * Checks if a message with this idempotency key was already created to eliminate duplicate spam.
 */
async function checkIdempotency(schoolId: string, idempotencyKey: string): Promise<boolean> {
  try {
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      const snap = await adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("communication_logs")
        .where("idempotencyKey", "==", idempotencyKey)
        .limit(1)
        .get();
      return !snap.empty;
    }

    const db = getFirebaseDb();
    if (db) {
      const q = query(
        collection(db, "schools", schoolId, "communication_logs"),
        where("idempotencyKey", "==", idempotencyKey),
        limit(1)
      );
      const snap = await getDocs(q);
      return !snap.empty;
    }
  } catch (err) {
    console.warn("[CommunicationAutomation] Idempotency check error:", err);
  }
  return false;
}
