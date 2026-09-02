import { getRazorpayClientAsync } from "./razorpayClient";

export interface CreateRazorpayPlanInput {
  period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  interval?: number; // Default 1
  name: string;
  amountPaise: number; // Integer PAISE (e.g. 299900 = ₹2,999)
  currency?: string; // "INR"
  description?: string;
}

export interface CreateRazorpaySubscriptionInput {
  planId: string; // Razorpay Plan ID (plan_XXXX)
  totalCount?: number; // Total billing cycles e.g. 12 or 120
  quantity?: number;
  customerNotify?: boolean;
  startAt?: number; // Unix timestamp
  notes?: Record<string, string>;
  addons?: Array<{
    item: {
      name: string;
      amount: number; // Integer PAISE
      currency: string;
    };
  }>;
}

/**
 * Creates or resolves a Razorpay Recurring Plan (/v1/plans).
 */
export async function createRazorpayPlan(input: CreateRazorpayPlanInput): Promise<any> {
  const client = await getRazorpayClientAsync();

  const planOptions = {
    period: input.period,
    interval: input.interval || 1,
    item: {
      name: input.name,
      amount: Math.round(input.amountPaise),
      currency: input.currency || "INR",
      description: input.description || `${input.name} Recurring Subscription`,
    },
  };

  try {
    const plan = await client.plans.create(planOptions as any);
    return plan;
  } catch (err: any) {
    console.error("Razorpay createPlan Error:", err);
    throw new Error(`Failed to create Razorpay Plan: ${err.message || ""}`);
  }
}

/**
 * Creates a Razorpay Subscription mandate (/v1/subscriptions).
 */
export async function createRazorpaySubscription(
  input: CreateRazorpaySubscriptionInput
): Promise<any> {
  const client = await getRazorpayClientAsync();

  const options: any = {
    plan_id: input.planId,
    total_count: input.totalCount || 120, // 10 years default
    quantity: input.quantity || 1,
    customer_notify: input.customerNotify !== false ? 1 : 0,
    notes: input.notes || {},
  };

  if (input.startAt) {
    options.start_at = input.startAt;
  }

  if (input.addons && input.addons.length > 0) {
    options.addons = input.addons;
  }

  try {
    const subscription = await client.subscriptions.create(options);
    return subscription;
  } catch (err: any) {
    console.error("Razorpay createSubscription Error:", err);
    throw new Error(`Failed to create Razorpay Subscription: ${err.message || ""}`);
  }
}

/**
 * Cancels a Razorpay Recurring Subscription (/v1/subscriptions/{id}/cancel).
 * @param cancelAtCycleEnd If true (default), mandate cancels at period end without revoking current access.
 */
export async function cancelRazorpaySubscription(
  subscriptionId: string,
  cancelAtCycleEnd: boolean = true
): Promise<any> {
  const client = await getRazorpayClientAsync();

  try {
    const res = await client.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
    return res;
  } catch (err: any) {
    console.error("Razorpay cancelSubscription Error:", err);
    throw new Error(`Failed to cancel Razorpay Subscription: ${err.message || ""}`);
  }
}

/**
 * Pauses a Razorpay Recurring Subscription.
 */
export async function pauseRazorpaySubscription(subscriptionId: string): Promise<any> {
  const client = await getRazorpayClientAsync();

  try {
    const res = await client.subscriptions.pause(subscriptionId, {
      pause_at: "now",
    });
    return res;
  } catch (err: any) {
    console.error("Razorpay pauseSubscription Error:", err);
    throw new Error(`Failed to pause Razorpay Subscription: ${err.message || ""}`);
  }
}

/**
 * Resumes a paused Razorpay Recurring Subscription.
 */
export async function resumeRazorpaySubscription(subscriptionId: string): Promise<any> {
  const client = await getRazorpayClientAsync();

  try {
    const res = await client.subscriptions.resume(subscriptionId, {
      resume_at: "now",
    });
    return res;
  } catch (err: any) {
    console.error("Razorpay resumeSubscription Error:", err);
    throw new Error(`Failed to resume Razorpay Subscription: ${err.message || ""}`);
  }
}

/**
 * Fetches Razorpay Subscription details from gateway API.
 */
export async function fetchRazorpaySubscription(subscriptionId: string): Promise<any> {
  const client = await getRazorpayClientAsync();

  try {
    const sub = await client.subscriptions.fetch(subscriptionId);
    return sub;
  } catch (err: any) {
    console.error("Razorpay fetchSubscription Error:", err);
    throw new Error(`Failed to fetch Razorpay Subscription: ${err.message || ""}`);
  }
}
