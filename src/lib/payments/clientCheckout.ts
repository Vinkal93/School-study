"use client";

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
 * Client-Side Razorpay Checkout Trigger (Sections 4, 8, 9).
 * Invokes POST /api/billing/orders server-side, then opens Razorpay Checkout modal.
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

    // 2. Call server-side order creation API (Section 4)
    const res = await fetch("/api/billing/orders", {
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

    const orderData = await res.json();
    if (!res.ok || !orderData.razorpayOrderId) {
      const msg = orderData.error || "Failed to create checkout order.";
      if (onError) onError(msg);
      return;
    }

    // 3. Open Razorpay Checkout Modal (Section 8)
    const isRealRazorpayOrderId =
      orderData.razorpayOrderId &&
      !orderData.razorpayOrderId.startsWith("order_test_") &&
      !orderData.razorpayOrderId.startsWith("order_fallback_") &&
      !orderData.razorpayOrderId.startsWith("order_fb_");

    const options: any = {
      key: orderData.key,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      name: "School Study",
      description: `${orderData.planName} (${billingCycle.toUpperCase()})`,
      handler: async function (response: any) {
        // Section 9: Call server-side signature verification API
        try {
          const verifyRes = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              orderId: orderData.orderId,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            if (onSuccess) onSuccess(orderData.orderId);
            window.location.href = `/billing/success?orderId=${orderData.orderId}`;
          } else {
            const err = verifyData.error || "Payment signature verification failed.";
            if (onError) onError(err);
            window.location.href = `/billing/failed?reason=${encodeURIComponent(err)}`;
          }
        } catch (err: any) {
          if (onError) onError(err.message);
          window.location.href = `/billing/failed?reason=${encodeURIComponent("Payment verification network error")}`;
        }
      },
      modal: {
        ondismiss: function () {
          console.log("Razorpay Checkout closed by user.");
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

    if (isRealRazorpayOrderId) {
      options.order_id = orderData.razorpayOrderId;
    }

    const paymentObject = new (window as any).Razorpay(options);
    paymentObject.open();
  } catch (error: any) {
    console.error("Razorpay Checkout Error:", error);
    if (onError) onError(error.message || "Failed to initiate payment checkout.");
  }
}
