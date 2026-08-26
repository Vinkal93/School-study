import { runPermissionSecurityTests } from "../src/lib/permissions/__tests__/permissions.test.ts";

const result = runPermissionSecurityTests();
console.log("\n==========================================");
console.log("SUPER ADMIN PERMISSION & SECURITY TESTS");
console.log("==========================================");
result.results.forEach((r) => console.log(r));
console.log("==========================================");

if (result.passed) {
  console.log("ALL 12 SECURITY ASSERTIONS PASSED!\n");
  process.exit(0);
} else {
  console.error("TEST FAILED!\n");
  process.exit(1);
}
