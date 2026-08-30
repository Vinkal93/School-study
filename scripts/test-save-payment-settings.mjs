/**
 * Test script for Payment Settings saving logic
 */

import assert from "node:assert/strict";

function maskSecret(secret) {
  if (!secret) return "";
  if (secret.length <= 8) return "••••••••••••••••";
  return `${secret.slice(0, 4)}****************${secret.slice(-4)}`;
}

function processPaymentSettings(input, existingData, envSecret = "") {
  const { keyId, keySecret, webhookSecret, isLiveMode, actorEmail } = input;

  if (!keyId || typeof keyId !== "string" || keyId.trim().length === 0) {
    throw new Error("Razorpay Key ID is required.");
  }

  let finalSecret = existingData?.keySecret || envSecret || "";
  if (keySecret && typeof keySecret === "string" && keySecret.trim().length > 0 && !keySecret.includes("*") && !keySecret.includes("•")) {
    finalSecret = keySecret.trim();
  }

  let finalWebhookSecret = existingData?.webhookSecret || "";
  if (webhookSecret && typeof webhookSecret === "string" && webhookSecret.trim().length > 0 && !webhookSecret.includes("*") && !webhookSecret.includes("•")) {
    finalWebhookSecret = webhookSecret.trim();
  }

  const updatedConfig = {
    keyId: keyId.trim(),
    keySecret: finalSecret,
    webhookSecret: finalWebhookSecret,
    isLiveMode: typeof isLiveMode === "boolean" ? isLiveMode : keyId.startsWith("rzp_live_"),
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail || "super_admin",
  };

  return {
    success: true,
    message: "Razorpay API Key settings updated securely!",
    keyId: updatedConfig.keyId,
    isSecretSet: updatedConfig.keySecret.length > 0,
    maskedSecretKey: maskSecret(updatedConfig.keySecret),
    isLiveMode: updatedConfig.isLiveMode,
  };
}

// Test 1: First time saving with keyId and keySecret
const result1 = processPaymentSettings({ keyId: "rzp_live_SNtWUOzpKkEtBR", keySecret: "sample_secret_12345678" }, null);
assert.equal(result1.keyId, "rzp_live_SNtWUOzpKkEtBR");
assert.equal(result1.isSecretSet, true);
assert.equal(result1.isLiveMode, true);

console.log("✓ Test 1 passed: First time saving with keyId and keySecret");

// Test 2: Updating keyId while keeping existing secret
const result2 = processPaymentSettings({ keyId: "rzp_live_SNtWUOzpKkEtBR", keySecret: "" }, { keySecret: "existing_secret_123456" });
assert.equal(result2.keyId, "rzp_live_SNtWUOzpKkEtBR");
assert.equal(result2.isSecretSet, true);

console.log("✓ Test 2 passed: Updating keyId keeping existing secret");
