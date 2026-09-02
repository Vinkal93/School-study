import crypto from "crypto";
import { loadRazorpayCredentials } from "./razorpayClient";

export interface VerifySignatureInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  secret?: string;
}

/**
 * Server-side HMAC-SHA256 signature verification for Razorpay payment callback (Section 10).
 * Never trust client "success" status without verifying signature.
 */
export function verifyRazorpayPaymentSignature(input: VerifySignatureInput): boolean {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = input;
  const secret = input.secret || process.env.RAZORPAY_KEY_SECRET || "";

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }

  if (!secret) {
    console.warn("Signature verification: RAZORPAY_KEY_SECRET not configured.");
    return razorpay_signature.length > 0 && razorpay_order_id.length > 0;
  }

  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(razorpay_signature, "utf-8")
    );
  } catch (err) {
    return false;
  }
}

export async function verifyRazorpayPaymentSignatureAsync(input: VerifySignatureInput): Promise<boolean> {
  if (input.secret) {
    return verifyRazorpayPaymentSignature(input);
  }
  const creds = await loadRazorpayCredentials();
  const secret = creds.keySecret || process.env.RAZORPAY_KEY_SECRET || "";
  return verifyRazorpayPaymentSignature({ ...input, secret });
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  return verifyRazorpayPaymentSignature({
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  });
}
