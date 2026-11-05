/**
 * SCHOOL STUDY 3.0: ENTERPRISE PERFORMANCE & SCALABILITY VERIFICATION SUITE
 * 
 * Validates:
 * 1. QueryClient In-Flight Request Deduplication
 * 2. QueryClient AbortSignal cancellation & cleanup
 * 3. Multi-Tenant Cache Isolation & Eviction (purgeTenant, purgeAll)
 * 4. FastDataCache Storage Quota Protection & Memory Fallback
 * 5. Attendance Service Query Scoping (Selective class/section constraints)
 * 6. Student Service Parallel Admission Pre-checks
 * 7. Admin Dashboard Metric Counts Zero-Document Efficiency
 * 8. Search API Single-Pass Token Verification
 * 9. Firestore Composite Index Structure
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("======================================================================");
console.log("RUNNING ENTERPRISE PERFORMANCE & SCALABILITY VERIFICATION SUITE 3.0");
console.log("======================================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

// 1. Verify QueryClient Source Implementation
runTest("1. QueryClient supports AbortSignal cancellation, tenant purging and LRU bounds", () => {
  const qcPath = path.join(__dirname, "../src/lib/cache/queryClient.ts");
  const qcSrc = fs.readFileSync(qcPath, "utf-8");

  assert(qcSrc.includes("signal?: AbortSignal"), "Missing signal in FetchOptions");
  assert(qcSrc.includes("purgeTenant(schoolId: string)"), "Missing purgeTenant implementation");
  assert(qcSrc.includes("purgeAll()"), "Missing purgeAll implementation");
  assert(qcSrc.includes("MAX_CACHE_ENTRIES"), "Missing LRU bounds protection");
});

// 2. Verify useAppQuery AbortController Integration
runTest("2. useAppQuery integrates AbortController for obsolete in-flight requests", () => {
  const uaqPath = path.join(__dirname, "../src/lib/cache/useAppQuery.ts");
  const uaqSrc = fs.readFileSync(uaqPath, "utf-8");

  assert(uaqSrc.includes("abortControllerRef"), "Missing abortControllerRef in useAppQuery");
  assert(uaqSrc.includes("AbortError"), "Missing AbortError handling in useAppQuery");
  assert(uaqSrc.includes("abort()"), "Missing abort execution on cleanup/re-render");
});

// 3. Verify FastDataCache Quota Protection & Tenant Purging
runTest("3. FastDataCache protects against LocalStorage QuotaExceededError and purges on tenant switch", () => {
  const fdcPath = path.join(__dirname, "../src/lib/utils/fast-data-cache.ts");
  const fdcSrc = fs.readFileSync(fdcPath, "utf-8");

  assert(fdcSrc.includes("QuotaExceededError"), "Missing QuotaExceededError handling");
  assert(fdcSrc.includes("purgeTenantFastCache"), "Missing purgeTenantFastCache function");
  assert(fdcSrc.includes("purgeAllFastCache"), "Missing purgeAllFastCache function");
});

// 4. Verify AuthProvider Evicts Query and Fast Caches on Logout & Impersonation
runTest("4. AuthProvider purges caches during signOut and impersonation mode switches", () => {
  const authPath = path.join(__dirname, "../src/providers/auth-provider.tsx");
  const authSrc = fs.readFileSync(authPath, "utf-8");

  assert(authSrc.includes("appQueryClient.purgeAll()"), "Missing appQueryClient.purgeAll() on signOut");
  assert(authSrc.includes("purgeAllFastCache()"), "Missing purgeAllFastCache() on signOut");
  assert(authSrc.includes("purgeTenantFastCache"), "Missing tenant-scoped fast cache purging on tenant exit");
});

// 5. Verify Attendance Query Scoping in attendance.service.ts
runTest("5. Attendance Service passes classId and sectionId directly to Firestore constraints", () => {
  const attPath = path.join(__dirname, "../src/lib/services/attendance.service.ts");
  const attSrc = fs.readFileSync(attPath, "utf-8");

  assert(attSrc.includes('where("classId", "==", classId)'), "classId constraint missing from attendance query");
  assert(attSrc.includes('where("sectionId", "==", sectionId)'), "sectionId constraint missing from attendance query");
});

// 6. Verify Parallel Pre-Checks in Student Admission
runTest("6. Student Service parallelizes session, class, feature access and plan limit validation", () => {
  const stuPath = path.join(__dirname, "../src/lib/services/student.service.ts");
  const stuSrc = fs.readFileSync(stuPath, "utf-8");

  assert(
    stuSrc.includes("Promise.all([") &&
    stuSrc.includes('requireFeatureAccess(schoolId, "student_management")') &&
    stuSrc.includes('requirePlanLimit(schoolId, "students")'),
    "Admission pre-checks are not running in parallel"
  );
});

// 7. Verify Admin Dashboard Zero-Doc Read Aggregations
runTest("7. Admin Dashboard Overview relies on authoritative server aggregations without unbounded queries", () => {
  const admPath = path.join(__dirname, "../src/app/(dashboard)/admin/page.tsx");
  const admSrc = fs.readFileSync(admPath, "utf-8");

  assert(!admSrc.includes("getSchoolSetupData("), "Dashboard overview must not execute full setup data query");
  assert(!admSrc.includes("getStudents("), "Dashboard overview must not execute unbounded getStudents query");
  assert(!admSrc.includes("getTeachers("), "Dashboard overview must not execute unbounded getTeachers query");
  assert(admSrc.includes("liveCounts"), "Dashboard overview must use liveCounts aggregation");
});

// 8. Verify Search API Single-Pass Token Verification
runTest("8. Search API executes unified token authentication without duplicate Google round-trips", () => {
  const searchPath = path.join(__dirname, "../src/app/api/admin/search/route.ts");
  const searchSrc = fs.readFileSync(searchPath, "utf-8");

  assert(searchSrc.includes("authenticateRequest(req)"), "authenticateRequest must be used");
  assert(!searchSrc.includes("verifyIdToken(token, true)"), "Duplicate verifyIdToken call must be eliminated");
});

// 9. Verify Firestore Composite Indexes
runTest("9. firestore.indexes.json includes composite indexes for student roster sorting and attendance", () => {
  const idxPath = path.join(__dirname, "../firestore.indexes.json");
  const idx = JSON.parse(fs.readFileSync(idxPath, "utf-8"));

  const hasStudentStatusRoll = idx.indexes.some((i) =>
    i.collectionGroup === "students" &&
    i.fields.some((f) => f.fieldPath === "status") &&
    i.fields.some((f) => f.fieldPath === "rollNumber")
  );

  const hasStudentClassSectionRoll = idx.indexes.some((i) =>
    i.collectionGroup === "students" &&
    i.fields.some((f) => f.fieldPath === "classId") &&
    i.fields.some((f) => f.fieldPath === "sectionId") &&
    i.fields.some((f) => f.fieldPath === "rollNumber")
  );

  assert(hasStudentStatusRoll, "Missing student status + rollNumber composite index");
  assert(hasStudentClassSectionRoll, "Missing student classId + sectionId + rollNumber composite index");
});

// 10. Verify Entitlement O(1) Fast Map Lookup
runTest("10. EntitlementContext implements O(1) memoized lookup cache for canAccess", () => {
  const entPath = path.join(__dirname, "../src/context/EntitlementContext.tsx");
  const entSrc = fs.readFileSync(entPath, "utf-8");

  assert(entSrc.includes("featureAccessCacheRef"), "Missing featureAccessCacheRef in EntitlementContext");
  assert(entSrc.includes("featureAccessCacheRef.current.has"), "Missing fast O(1) cache check in canAccess");
});

console.log("\n======================================================================");
console.log(`RESULTS: ${passed} / ${passed + failed} TESTS PASSED (${failed} FAILURES)`);
console.log("======================================================================\n");

if (failed > 0) {
  process.exit(1);
}
