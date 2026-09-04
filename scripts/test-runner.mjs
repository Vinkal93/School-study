/**
 * UNIFIED AUTOMATED TEST RUNNER
 * 
 * Runs all full-stack test suites sequentially and reports consolidated results.
 * 
 * Usage:
 *   node scripts/test-runner.mjs
 */

import { execSync } from "child_process";

const testSuites = [
  { name: "RBAC & Multi-Tenant Isolation", file: "scripts/test-auth-rbac.mjs" },
  { name: "Firestore & Cloud Storage Security", file: "scripts/test-firebase-security.mjs" },
  { name: "Billing & Razorpay Full-Stack", file: "scripts/test-billing-razorpay.mjs" },
  { name: "Subscription & Entitlement Engine", file: "scripts/test-subscription-entitlement.mjs" },
  { name: "Super Admin Plan & Entitlement Test Control", file: "scripts/test-super-admin-plan-control.mjs" },
  { name: "Reports & Financial Ledger", file: "scripts/test-reports-finance.mjs" },
  { name: "Super Admin Control Plane & Audit", file: "scripts/test-super-admin-audit.mjs" },
  { name: "Activity, Session & Login Monitoring", file: "scripts/test-activity-monitoring.mjs" },
  { name: "Fee Management MVP & Financial Integrity", file: "scripts/test-fee-management.mjs" },
  { name: "Super Admin Control Persistence & Resolution", file: "scripts/test-super-admin-control-persistence.mjs" },
  { name: "Super Admin FULL_CONTROL 500 & Permission Fix", file: "scripts/test-full-control-save-500-fix.mjs" },
  { name: "Plan to Feature Entitlement Architecture", file: "scripts/test-plan-feature-entitlement.mjs" },
  { name: "Dynamic Pricing, GST & Coupon Engine", file: "scripts/test-dynamic-pricing-gst-coupons-standalone.mjs" },
  { name: "Super Admin Emergency Control Center", file: "scripts/test-emergency-control-center.mjs" },
  { name: "Realtime Notification & Live Event System", file: "scripts/test-realtime-notification-system.ts" },
];

console.log("==================================================");
console.log("🚀 SCHOOL STUDY FULL-STACK AUTOMATED TEST SUITE");
console.log("==================================================\n");

let passedSuites = 0;
let failedSuites = 0;

for (const suite of testSuites) {
  try {
    console.log(`▶ Running [${suite.name}]...`);
    const runnerCmd = suite.file.includes("dynamic-pricing") || suite.file.includes("emergency") || suite.file.endsWith(".ts")
      ? `npx tsx "${suite.file}"`
      : `node "${suite.file}"`;
    execSync(runnerCmd, { stdio: "inherit" });
    passedSuites++;
    console.log(`✔ [${suite.name}] PASSED\n`);
  } catch (err) {
    failedSuites++;
    console.error(`✖ [${suite.name}] FAILED\n`);
  }
}

console.log("==================================================");
console.log(`[CONSOLIDATED SUMMARY] Suites: ${testSuites.length} | Passed: ${passedSuites} | Failed: ${failedSuites}`);
console.log("==================================================");

if (failedSuites > 0) process.exit(1);
