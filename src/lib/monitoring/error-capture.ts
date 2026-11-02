/**
 * Central Error Capture Engine
 * Unifies server exceptions, API failures, and client errors into structured diagnostic events.
 * Fail-safe guarantee: Never breaks the invoking application logic.
 */

import { ErrorEvent, CaptureContext, ErrorSeverity, ErrorCategory } from "./error-types";
import {
  generateReferenceCode,
  sanitizeErrorMessage,
  sanitizeMetadata,
  sanitizeStackTrace,
} from "./error-sanitizer";
import { generateErrorFingerprint, generateIncidentTitle } from "./error-fingerprint";
import { extractRequestContext, extractClientMetadata, generateCorrelationId } from "./request-context";
import { recordErrorEvent } from "./error-storage";
import { evaluateAlerts } from "./alert-engine";

/**
 * Capture an unhandled exception or critical error in server-side services
 */
export async function captureServerException(
  error: unknown,
  context: CaptureContext = {}
): Promise<{ referenceCode: string; fingerprint: string }> {
  try {
    const isErrInstance = error instanceof Error;
    const rawMessage = isErrInstance ? error.message : String(error || "Unknown error");
    const rawStack = isErrInstance ? error.stack : undefined;

    const referenceCode = generateReferenceCode();
    const errorCode = context.errorCode || (isErrInstance && (error as any).code) || "SERVER_EXCEPTION";
    const moduleName = context.module || "backend";
    const operation = context.operation || "execute";

    const sanitizedMessage = sanitizeErrorMessage(rawMessage);
    const sanitizedStack = sanitizeStackTrace(rawStack);

    const fingerprint = generateErrorFingerprint({
      errorCode,
      module: moduleName,
      operation,
      message: sanitizedMessage,
      stack: sanitizedStack,
    });

    const title = generateIncidentTitle({
      errorCode,
      module: moduleName,
      operation,
    });

    const env: ErrorEvent["environment"] =
      process.env.VERCEL_ENV === "production"
        ? "production"
        : process.env.VERCEL_ENV === "preview"
        ? "preview"
        : "development";

    const event: ErrorEvent = {
      eventId: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      referenceCode,
      fingerprint,
      errorCode,
      message: sanitizedMessage,
      severity: context.severity || "high",
      category: context.category || "system",
      module: moduleName,
      operation,
      sanitizedRoute: context.route,
      requestId: context.requestId || generateCorrelationId("req"),
      correlationId: context.correlationId || generateCorrelationId("corr"),
      tenantId: context.tenantId || context.schoolId,
      schoolId: context.schoolId,
      userId: context.userId,
      userRole: context.userRole,
      occurredAt: new Date().toISOString(),
      environment: env,
      version: process.env.NEXT_PUBLIC_APP_VERSION || "3.0.0",
      httpStatus: context.httpStatus || 500,
      sanitizedStack,
      metadata: sanitizeMetadata(context.metadata) as Record<string, unknown>,
      clientMetadata: context.clientMetadata,
    };

    // Asynchronously record event & evaluate alert rules
    await recordErrorEvent(event, title);
    await evaluateAlerts(event, { occurrences: 1 });

    return { referenceCode, fingerprint };
  } catch (captureErr) {
    console.warn("[ErrorCapture] Notice: Failed to capture error event:", captureErr);
    return { referenceCode: "ERR-FALLBACK", fingerprint: "fp_fallback" };
  }
}

/**
 * Capture an error occurring within a Next.js API Route Handler
 */
export async function captureApiException(
  error: unknown,
  request: Request,
  context: CaptureContext = {}
): Promise<{ referenceCode: string; fingerprint: string }> {
  try {
    const { correlationId, requestId } = extractRequestContext(request);
    const clientMetadata = extractClientMetadata(request);
    const url = new URL(request.url);

    return await captureServerException(error, {
      ...context,
      route: context.route || url.pathname,
      requestId: context.requestId || requestId,
      correlationId: context.correlationId || correlationId,
      category: context.category || "api",
      clientMetadata: {
        ...clientMetadata,
        ...context.clientMetadata,
      },
    });
  } catch {
    return { referenceCode: "ERR-API-FALLBACK", fingerprint: "fp_fallback" };
  }
}

/**
 * Capture an error reported from the client browser / React ErrorBoundary
 */
export async function captureClientError(payload: {
  message: string;
  errorCode?: string;
  stack?: string;
  module?: string;
  operation?: string;
  route?: string;
  userId?: string;
  userRole?: string;
  schoolId?: string;
  metadata?: Record<string, unknown>;
  clientMetadata?: CaptureContext["clientMetadata"];
}): Promise<{ referenceCode: string; fingerprint: string }> {
  try {
    const referenceCode = generateReferenceCode();
    const errorCode = payload.errorCode || "CLIENT_EXCEPTION";
    const moduleName = payload.module || "frontend";
    const operation = payload.operation || "render";

    const sanitizedMessage = sanitizeErrorMessage(payload.message);
    const sanitizedStack = sanitizeStackTrace(payload.stack);

    const fingerprint = generateErrorFingerprint({
      errorCode,
      module: moduleName,
      operation,
      message: sanitizedMessage,
      stack: sanitizedStack,
    });

    const title = generateIncidentTitle({
      errorCode,
      module: moduleName,
      operation,
    });

    const env: ErrorEvent["environment"] =
      typeof window !== "undefined" && window.location.hostname.includes("school.sbci.online")
        ? "production"
        : "development";

    const event: ErrorEvent = {
      eventId: `ev_cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      referenceCode,
      fingerprint,
      errorCode,
      message: sanitizedMessage,
      severity: "medium",
      category: "frontend",
      module: moduleName,
      operation,
      sanitizedRoute: payload.route || (typeof window !== "undefined" ? window.location.pathname : undefined),
      occurredAt: new Date().toISOString(),
      environment: env,
      version: "3.0.0",
      sanitizedStack,
      schoolId: payload.schoolId,
      userId: payload.userId,
      userRole: payload.userRole,
      metadata: sanitizeMetadata(payload.metadata) as Record<string, unknown>,
      clientMetadata: payload.clientMetadata,
    };

    await recordErrorEvent(event, title);
    return { referenceCode, fingerprint };
  } catch {
    return { referenceCode: "ERR-CLI-FALLBACK", fingerprint: "fp_fallback" };
  }
}
