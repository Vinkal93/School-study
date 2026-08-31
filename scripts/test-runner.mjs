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
  { name: "Reports & Financial Ledger", file: "scripts/test-reports-finance.mjs" },
  { name: "Super Admin Control Plane & Audit", file: "scripts/test-super-admin-audit.mjs" },
  { name: "Activity, Session & Login Monitoring", file: "scripts/test-activity-monitoring.mjs" },
];

console.log("==================================================");
console.log("🚀 SCHOOL STUDY FULL-STACK AUTOMATED TEST SUITE");
console.log("==================================================\n");

let passedSuites = 0;
let failedSuites = 0;

for (const suite of testSuites) {
  try {
    console.log(`▶ Running [${suite.name}]...`);
    execSync(`node "${suite.file}"`, { stdio: "inherit" });
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
