export type RazorpayErrorCode =
  | "CONFIGURATION_ERROR"
  | "RAZORPAY_AUTH_ERROR"
  | "RAZORPAY_NETWORK_ERROR"
  | "RAZORPAY_REQUEST_ERROR"
  | "RAZORPAY_UPSTREAM_ERROR"
  | "INTERNAL_PAYMENT_ERROR";

export interface SafePaymentError {
  code: RazorpayErrorCode;
  message: string;
  userMessage: string;
  httpStatus: number;
}

/**
 * Maps upstream Razorpay exceptions and system errors to safe, user-friendly, non-leaking error responses.
 */
export function mapRazorpayError(err: any): SafePaymentError {
  const statusCode = err?.statusCode || err?.status || 500;
  const rawDescription = err?.error?.description || err?.message || "";
  const rawCode = err?.error?.code || "";

  // 1. Missing or unconfigured credentials
  if (
    rawDescription.includes("credentials (Key ID or Secret) are not configured") ||
    rawDescription.includes("Key ID is missing") ||
    rawDescription.includes("Secret is missing")
  ) {
    return {
      code: "CONFIGURATION_ERROR",
      message: "Razorpay credentials are not configured on the server.",
      userMessage:
        "Payment gateway is not configured yet. Please configure Razorpay Key ID & Secret in Super Admin Settings or environment variables.",
      httpStatus: 500,
    };
  }

  // 2. HTTP 401 Unauthorized / Authentication Failed
  if (
    statusCode === 401 ||
    rawDescription.toLowerCase().includes("authentication failed") ||
    rawCode === "BAD_REQUEST_ERROR" && rawDescription.toLowerCase().includes("auth")
  ) {
    return {
      code: "RAZORPAY_AUTH_ERROR",
      message: "Razorpay HTTP 401: Authentication failed.",
      userMessage:
        "Razorpay authentication failed. Please verify that the Key ID and Secret Key belong to the same Razorpay mode and account on dashboard.razorpay.com.",
      httpStatus: 502,
    };
  }

  // 3. Network or timeout issues
  if (
    err?.code === "ENOTFOUND" ||
    err?.code === "ECONNREFUSED" ||
    err?.code === "ETIMEDOUT" ||
    rawDescription.toLowerCase().includes("network") ||
    rawDescription.toLowerCase().includes("fetch failed")
  ) {
    return {
      code: "RAZORPAY_NETWORK_ERROR",
      message: "Failed to connect to Razorpay gateway servers.",
      userMessage:
        "Unable to communicate with the payment gateway. Please check your internet connection and try again.",
      httpStatus: 504,
    };
  }

  // 4. Bad Request / Business Validation (4xx)
  if (statusCode >= 400 && statusCode < 500) {
    return {
      code: "RAZORPAY_REQUEST_ERROR",
      message: rawDescription || "Invalid request sent to Razorpay.",
      userMessage:
        rawDescription || "Payment request was rejected by the gateway. Please review your order details.",
      httpStatus: 400,
    };
  }

  // 5. Razorpay Gateway Server Errors (5xx)
  if (statusCode >= 500) {
    return {
      code: "RAZORPAY_UPSTREAM_ERROR",
      message: rawDescription || "Razorpay upstream server error.",
      userMessage:
        "The payment gateway is experiencing technical difficulties. Please try again in a few moments.",
      httpStatus: 502,
    };
  }

  // 6. Generic Internal Error
  return {
    code: "INTERNAL_PAYMENT_ERROR",
    message: rawDescription || "Internal payment processing error.",
    userMessage: "An unexpected error occurred while processing your payment. Please try again.",
    httpStatus: 500,
  };
}
