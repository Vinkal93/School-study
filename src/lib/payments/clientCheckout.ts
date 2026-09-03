"use client";

import { safeFetchJson } from "@/lib/utils/safeFetch";

export interface CheckoutOptionsInput {
  planId: string;
  billingCycle: "monthly" | "annual";
  couponCode?: string;
  schoolId: string;
  userId: string;
  prefillData?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  onSuccess?: (orderId: string) => void;
  onError?: (errorMsg: string) => void;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Client-Side Razorpay Checkout Trigger.
 * Calls POST /api/billing/orders server-side safely, then opens Razorpay Checkout modal.
 */
export async function triggerRazorpayCheckout(input: CheckoutOptionsInput): Promise<void> {
  const { planId, billingCycle, couponCode, schoolId, userId, prefillData, onSuccess, onError } = input;

  try {
    // 1. Ensure Razorpay Checkout script is loaded
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      const msg = "Unable to load Razorpay SDK. Please check your internet connection.";
      if (onError) onError(msg);
      return;
    }

    // 2. Call server-side order creation API with safeFetchJson
    const orderRes = await safeFetchJson("/api/billing/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId,
        userId,
        planId,
        billingCycle,
        couponCode,
      }),
    });

    if (!orderRes.ok || !orderRes.data || !orderRes.data.razorpayOrderId) {
      const msg = orderRes.error || orderRes.data?.error || `Failed to create checkout order (HTTP ${orderRes.status}).`;
      console.error("[RazorpayCheckout] Order creation failed:", orderRes);
      if (onError) onError(msg);
      return;
    }

    const orderData = orderRes.data;

    // 3. Resolve active public Razorpay Key ID
    let activeKey = orderData.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    if (!activeKey) {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const { getFirebaseDb } = await import("@/lib/firebase/client");
        const clientDb = getFirebaseDb();
        if (clientDb) {
          const snap = await getDoc(doc(clientDb, "paymentSettings", "razorpay"));
          if (snap.exists()) {
            activeKey = (snap.data() as any).keyId || "";
          }
        }
      } catch (e) {
        console.warn("Client key lookup notice:", e);
      }
    }

    if (!activeKey) {
      const msg = "Razorpay Key ID is not configured on the server. Please check your environment variables or Super Admin Settings.";
      if (onError) onError(msg);
      return;
    }

    const options: any = {
      key: activeKey,
      amount: Math.round(orderData.amount), // Ensure integer paise
      currency: orderData.currency || "INR",
      name: "School Study",
      description: `${orderData.planName || "School Subscription"} (${billingCycle.toUpperCase()})`,
      order_id: orderData.razorpayOrderId,
      handler: async function (response: any) {
        try {
          // Call server-side signature verification API safely
          const verifyRes = await safeFetchJson("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              orderId: orderData.orderId,
            }),
          });

          if (verifyRes.ok && verifyRes.data?.success) {
            if (onSuccess) onSuccess(orderData.orderId);
            window.location.href = `/billing/success?orderId=${orderData.orderId}`;
          } else {
            const err = verifyRes.error || verifyRes.data?.error || "Payment signature verification failed.";
            if (onError) onError(err);
            window.location.href = `/billing/failed?reason=${encodeURIComponent(err)}`;
          }
        } catch (err: any) {
          if (onError) onError(err.message || "Payment verification error");
          window.location.href = `/billing/failed?reason=${encodeURIComponent("Payment verification network error")}`;
        }
      },
      modal: {
        ondismiss: function () {
          console.log("[RazorpayCheckout] Checkout modal closed by user.");
          if (onError) onError("Payment modal was closed before completing payment.");
        },
      },
      prefill: {
        name: prefillData?.name || "",
        email: prefillData?.email || "",
        contact: prefillData?.phone || "",
      },
      theme: {
        color: "#2563EB",
      },
    };

    const paymentObject = new (window as any).Razorpay(options);
    paymentObject.open();
  } catch (error: any) {
    console.error("[RazorpayCheckout] Unexpected Error:", error);
    if (onError) onError(error.message || "Failed to initiate payment checkout.");
  }
}
