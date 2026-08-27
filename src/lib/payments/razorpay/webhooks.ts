import crypto from "crypto";

/**
 * Server-side HMAC-SHA256 signature verification for Razorpay Webhooks (Section 13).
 * Must be evaluated against the RAW unparsed request body.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string,
  secret?: string
): boolean {
  const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET || "";

  if (!signatureHeader) {
    return false;
  }

  if (!webhookSecret) {
    console.warn("Webhook verification: RAZORPAY_WEBHOOK_SECRET not configured.");
    return signatureHeader.length > 0;
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(signatureHeader, "utf-8")
    );
  } catch (err) {
    return false;
  }
}
