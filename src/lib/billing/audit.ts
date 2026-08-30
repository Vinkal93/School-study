import { doc, collection, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { BillingAuditAction, BillingAuditLogEntry } from "@/types";
import { BILLING_COLLECTIONS } from "./plans";

export interface CreateBillingAuditLogInput {
  actorId: string;
  actorRole: string;
  action: BillingAuditAction;
  targetType: "plan" | "planVersion" | "schoolSubscription" | "accessPolicy" | "financeReport" | "invoice" | "adjustment" | "override" | "penalty";
  targetId: string;
  metadata?: Record<string, any>;
}

/**
 * Section 19: Audit Log Utility (createBillingAuditLog).
 * Structured audit record creation for sensitive billing and subscription changes.
 * Supports both single config object and positional parameters.
 */
export async function createBillingAuditLog(
  actorIdOrInput: string | CreateBillingAuditLogInput,
  actorRole?: string,
  action?: BillingAuditAction,
  targetType?: "plan" | "planVersion" | "schoolSubscription" | "accessPolicy" | "financeReport" | "invoice" | "adjustment" | "override" | "penalty",
  targetId?: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    const db = getFirebaseDb();
    if (!db) return;

    let finalActorId: string;
    let finalActorRole: string;
    let finalAction: BillingAuditAction;
    let finalTargetType: any;
    let finalTargetId: string;
    let finalMetadata: Record<string, any>;

    if (typeof actorIdOrInput === "object") {
      finalActorId = actorIdOrInput.actorId;
      finalActorRole = actorIdOrInput.actorRole;
      finalAction = actorIdOrInput.action;
      finalTargetType = actorIdOrInput.targetType;
      finalTargetId = actorIdOrInput.targetId;
      finalMetadata = actorIdOrInput.metadata || {};
    } else {
      finalActorId = actorIdOrInput;
      finalActorRole = actorRole || "super_admin";
      finalAction = action!;
      finalTargetType = targetType || "schoolSubscription";
      finalTargetId = targetId || "";
      finalMetadata = metadata || {};
    }

    const auditRef = doc(collection(db, BILLING_COLLECTIONS.AUDIT_LOGS));
    const sanitizedMetadata = { ...finalMetadata };

    // Strip sensitive fields if accidentally passed
    delete sanitizedMetadata.password;
    delete sanitizedMetadata.token;
    delete sanitizedMetadata.secret;
    delete sanitizedMetadata.keySecret;
    delete sanitizedMetadata.webhookSecret;
    delete sanitizedMetadata.rawSecret;
    delete sanitizedMetadata.privateKey;
    delete sanitizedMetadata.apiKey;

    const auditEntry: BillingAuditLogEntry = {
      id: auditRef.id,
      actorId: finalActorId,
      actorRole: finalActorRole,
      action: finalAction,
      targetType: finalTargetType,
      targetId: finalTargetId,
      metadata: sanitizedMetadata,
      timestamp: new Date().toISOString(),
    };

    await setDoc(auditRef, {
      ...auditEntry,
      serverTimestamp: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Failed to write billing audit log:", error);
  }
}

/**
 * Section 20: Safe Error Handling Utility.
 * Logs technical errors server-side with correlation ID, returning sanitized user-facing messages.
 */
export function formatSafeBillingError(
  error: any,
  context?: string
): { userMessage: string; correlationId: string } {
  const correlationId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Detailed technical error server-side / console log
  console.error(`[BillingEngineError][${correlationId}][${context || "general"}]`, {
    message: error?.message,
    code: error?.code,
    stack: error?.stack,
  });

  // Sanitized user-facing message
  let userMessage = "A system error occurred while processing your subscription request. Please try again.";

  if (error?.message?.includes("capacity limit")) {
    userMessage = error.message;
  } else if (error?.message?.includes("expired")) {
    userMessage = error.message;
  } else if (error?.code === "permission-denied") {
    userMessage = "Access Denied: You do not have permission to execute this billing action.";
  }

  return { userMessage, correlationId };
}
