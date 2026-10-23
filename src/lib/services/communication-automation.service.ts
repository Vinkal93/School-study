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
} from "./communication.service";
import { getStudents } from "@/lib/services/student.service";
import { getFeeStructures, getStudentFeeSummary } from "./fee.service";
import { resolveMessageTemplate } from "./communication-variables";
import { generateUpiPayLink } from "./fee-share.service";

/**
 * Checks if current time in Indian Standard Time (IST) falls within quiet hours.
 * Default quiet hours: 21:00 (9 PM) to 08:00 (8 AM)
 */
export function isWithinQuietHours(startHour: number = 21, endHour: number = 8): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    });
    const currentHour = parseInt(formatter.format(new Date()), 10);
    if (startHour > endHour) {
      return currentHour >= startHour || currentHour < endHour;
    } else {
      return currentHour >= startHour && currentHour < endHour;
    }
  } catch {
    const hour = new Date().getHours();
    return hour >= startHour || hour < endHour;
  }
}

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
  suppressedCount: number;
  quietHoursSuppressed: number;
  errorsCount: number;
  details: Array<{
    studentName: string;
    ruleType: string;
    channel: string;
    status: string;
    reason?: string;
    error?: string;
  }>;
}

/**
 * Executes fee reminder automation for a school.
 * 
 * Features:
 * 1. Checks real student fee balances via getStudentFeeSummary
 * 2. Automatic suppression when balance is 0 or already paid
 * 3. Quiet hours enforcement (21:00 - 08:00 IST)
 * 4. Precise deduplication key per student, rule, and calendar date
 * 5. Multi-channel dispatch (WhatsApp Cloud API, SMS, In-App)
 */
export async function runSchoolFeeReminderAutomation(
  schoolId: string,
  triggeredBy: { uid: string; name: string; role: string },
  options?: { ignoreQuietHours?: boolean }
): Promise<AutomationExecutionReport> {
  const report: AutomationExecutionReport = {
    timestamp: new Date().toISOString(),
    schoolId,
    totalStudentsScanned: 0,
    activeRulesCount: 0,
    messagesDispatched: 0,
    duplicatesSkipped: 0,
    suppressedCount: 0,
    quietHoursSuppressed: 0,
    errorsCount: 0,
    details: [],
  };

  // 1. Verify school communication & automation entitlement
  const access = await getSchoolCommunicationAccess(schoolId, triggeredBy);
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

    // Resolve matching fee structure
    const matchingStructure = feeStructures.find(
      (s) => (s as any).classId === student.classId || s.className?.toLowerCase() === student.className?.toLowerCase()
    );
    const standardFee = matchingStructure?.amountPaise ? Math.round(matchingStructure.amountPaise / 100) : 500;
    const dueDay = matchingStructure?.dueDayOfMonth || defaultDueDay;

    // Calculate real live fee summary for this student
    let feeSummary = null;
    try {
      feeSummary = await getStudentFeeSummary(schoolId, student);
    } catch (fErr) {
      console.warn(`[CommunicationAutomation] Failed to get live fee summary for ${student.name}:`, fErr);
    }

    const pendingAmount = feeSummary?.totalPendingRupees ?? standardFee;

    // Check each active rule
    for (const rule of activeRules) {
      // 1. Class filter check
      if (rule.eligibleClassIds && rule.eligibleClassIds.length > 0) {
        if (!student.classId || !rule.eligibleClassIds.includes(student.classId)) {
          continue;
        }
      }

      // 2. Suppression check: If fee balance is 0 or less than minimum threshold, SUPPRESS reminder
      const minThreshold = rule.minOutstandingAmount ?? 1;
      if (pendingAmount < minThreshold) {
        report.suppressedCount++;
        report.details.push({
          studentName: student.name,
          ruleType: rule.type,
          channel: "all",
          status: "balance_cleared_suppressed",
          reason: `Student fee is fully settled or outstanding balance (₹${pendingAmount}) is below threshold (₹${minThreshold}).`,
        });
        continue;
      }

      // 3. Quiet hours check
      const quietStart = rule.quietHoursStart ?? 21;
      const quietEnd = rule.quietHoursEnd ?? 8;
      if (!options?.ignoreQuietHours && isWithinQuietHours(quietStart, quietEnd)) {
        report.quietHoursSuppressed++;
        report.details.push({
          studentName: student.name,
          ruleType: rule.type,
          channel: "all",
          status: "quiet_hours_suppressed",
          reason: `Message withheld: currently within quiet hours (${quietStart}:00 - ${quietEnd}:00 IST).`,
        });
        continue;
      }

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
      } else if (rule.type === "late_fee") {
        const targetLateFeeDay = dueDay + Math.max(rule.daysOffset, 7);
        if (currentDayOfMonth === targetLateFeeDay) {
          isApplicable = true;
        }
      }

      if (isApplicable) {
        const payLink = `https://school.sbci.online/pay/${schoolId}/${student.id}`;

        // Variable context using the central variable engine
        const varContext = {
          student: {
            id: student.id,
            name: student.name,
            admissionNumber: student.admissionNumber || student.rollNumber,
            className: student.className,
            sectionName: student.sectionName,
            fatherName: student.fatherName,
            motherName: student.motherName,
            guardianName: student.guardianName,
            phone: student.phone,
            email: student.email,
          },
          school: {
            id: schoolId,
            name: access.schoolName || "School",
          },
          fee: {
            feeAmount: standardFee,
            outstandingAmount: pendingAmount,
            dueDate: dueDateFormatted,
            paymentLink: payLink,
          },
          customVariables: {
            due_date: dueDateFormatted,
            payment_link: payLink,
          },
        };

        const resolvedBody = resolveMessageTemplate(rule.bodyTemplate, varContext);
        const resolvedTitle = rule.titleTemplate ? resolveMessageTemplate(rule.titleTemplate, varContext) : "School Fee Reminder";

        // Process for each configured channel in this rule
        for (const channel of rule.channels) {
          // Idempotency deduplication key
          const dedupKey = `auto:${schoolId}:${student.id}:${rule.id}:${channel}:${todayDateStr}`;

          // Check if already sent today
          const isSentToday = await checkIdempotency(schoolId, dedupKey);
          if (isSentToday) {
            report.duplicatesSkipped++;
            continue;
          }

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
                  outstandingAmount: pendingAmount,
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
