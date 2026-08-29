/**
 * Centralized Payment State Machine & Transition Engine
 * SCHOOL STUDY — PHASE 10
 */

export type PaymentState =
  | "CREATED"
  | "PAYMENT_PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "DISPUTED"
  | "UNKNOWN";

/**
 * Valid state transitions matrix.
 * Terminal states (like REFUNDED, FAILED, CANCELLED) cannot transition back to active/captured.
 */
export const VALID_PAYMENT_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  CREATED: ["PAYMENT_PENDING", "AUTHORIZED", "CAPTURED", "FAILED", "CANCELLED", "UNKNOWN"],
  PAYMENT_PENDING: ["AUTHORIZED", "CAPTURED", "FAILED", "CANCELLED", "UNKNOWN"],
  AUTHORIZED: ["CAPTURED", "FAILED", "CANCELLED"],
  CAPTURED: ["REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"],
  REFUND_PENDING: ["PARTIALLY_REFUNDED", "REFUNDED", "CAPTURED", "FAILED"],
  PARTIALLY_REFUNDED: ["REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"],
  FAILED: [], // Terminal
  CANCELLED: [], // Terminal
  REFUNDED: [], // Terminal
  DISPUTED: ["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"],
  UNKNOWN: ["PAYMENT_PENDING", "CAPTURED", "FAILED", "CANCELLED"],
};

export interface StateTransitionResult {
  valid: boolean;
  from: PaymentState;
  to: PaymentState;
  reason?: string;
}

/**
 * Validates whether a state transition is legal according to accounting and gateway standards.
 */
export function validatePaymentStateTransition(
  from: PaymentState,
  to: PaymentState
): StateTransitionResult {
  if (from === to) {
    return { valid: true, from, to, reason: "Same state (no-op)" };
  }

  const allowedNextStates = VALID_PAYMENT_TRANSITIONS[from] || [];
  const isAllowed = allowedNextStates.includes(to);

  if (!isAllowed) {
    return {
      valid: false,
      from,
      to,
      reason: `Illegal state transition from ${from} to ${to}. Allowed target states: [${allowedNextStates.join(", ")}]`,
    };
  }

  return { valid: true, from, to };
}
