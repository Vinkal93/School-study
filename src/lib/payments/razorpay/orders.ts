import { getRazorpayClientAsync } from "./razorpayClient";

export interface CreateRazorpayOrderInput {
  amount: number; // Integer PAISE (e.g. 199900 = ₹1,999)
  currency?: string; // "INR"
  receipt: string; // Internal Order ID
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string; // Razorpay Order ID (order_XXXX)
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

/**
 * Creates Razorpay order server-side via official Razorpay SDK / API.
 * Respects dynamic Super Admin keys from Firestore or environment variable fallback.
 */
export async function createRazorpayOrder(
  input: CreateRazorpayOrderInput
): Promise<RazorpayOrderResult> {
  const client = await getRazorpayClientAsync();
  const orderOptions = {
    amount: Math.round(input.amount),
    currency: input.currency || "INR",
    receipt: input.receipt,
    notes: input.notes || {},
  };

  try {
    const razorpayOrder = await client.orders.create(orderOptions);
    return razorpayOrder as unknown as RazorpayOrderResult;
  } catch (err: any) {
    const errorDesc = err?.error?.description || err?.message || "Razorpay API error";
    console.error("[Razorpay] Order creation API failed:", errorDesc);
    throw new Error(errorDesc);
  }
}
