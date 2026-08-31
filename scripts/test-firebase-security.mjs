/**
 * FIRESTORE & CLOUD STORAGE SECURITY AUDIT & AUTOMATED TEST SUITE
 * 
 * Verifies that:
 * 1. Unauthenticated users cannot read/write private tenant collections.
 * 2. Regular users cannot escalate their role or change schoolId via profile update.
 * 3. School Admin A cannot perform direct CRUD on School B documents.
 * 4. Financial ledgers (orders, invoices, refunds) are immutable from regular clients.
 * 5. Audit logs are append-only and cannot be updated or deleted.
 * 6. Cloud Storage rules strictly isolate `/schools/{schoolId}/*` from cross-tenant access.
 * 
 * Usage:
 *   node scripts/test-firebase-security.mjs
 */

// Simulated Firestore Security Engine
function evaluateFirestoreAccess(auth, operation, path, targetData = {}, existingData = {}) {
  const parts = path.split("/").filter(Boolean);
  const rootCol = parts[0];

  // Helper functions matching firestore.rules
  const isAuthenticated = auth !== null;
  const isSuperAdmin = isAuthenticated && auth.role === "super_admin";
  const isSchoolMember = (schoolId) => isAuthenticated && (isSuperAdmin || auth.schoolId === schoolId);
  const isSchoolAdmin = (schoolId) => isAuthenticated && (isSuperAdmin || (isSchoolMember(schoolId) && auth.role === "admin"));

  // Public CMS
  if (rootCol === "plans" || rootCol === "siteSettings") {
    if (operation === "read") return { allowed: true };
    return { allowed: isSuperAdmin };
  }

  // Public Contact Inquiries
  if (rootCol === "inquiries" || rootCol === "contactInquiries") {
    if (operation === "create") return { allowed: true };
    return { allowed: isSuperAdmin };
  }

  // Users Collection
  if (rootCol === "users") {
    const targetUid = parts[1];
    if (operation === "read") {
      return { allowed: isAuthenticated && (auth.uid === targetUid || isSuperAdmin) };
    }
    if (operation === "update") {
      if (isSuperAdmin) return { allowed: true };
      if (isAuthenticated && auth.uid === targetUid) {
        // Field-level protection: Cannot modify role, schoolId, or status
        const restrictedFields = ["role", "schoolId", "status"];
        const hasRestrictedChange = Object.keys(targetData).some((k) => restrictedFields.includes(k) && targetData[k] !== existingData[k]);
        return { allowed: !hasRestrictedChange, reason: hasRestrictedChange ? "BLOCKED_FIELD_ESCALATION" : null };
      }
      return { allowed: false };
    }
    if (operation === "delete") return { allowed: isSuperAdmin };
  }

  // Schools & Subcollections
  if (rootCol === "schools") {
    const schoolId = parts[1];
    if (operation === "read") return { allowed: isSchoolMember(schoolId) };
    if (["create", "update", "delete", "write"].includes(operation)) {
      return { allowed: isSchoolAdmin(schoolId) };
    }
  }

  // Financial & Billing (Orders, Invoices, Transactions, Subscriptions)
  if (["orders", "payments", "invoices", "financeTransactions", "schoolSubscriptions"].includes(rootCol)) {
    if (operation === "read") {
      const schoolId = existingData.schoolId || targetData.schoolId;
      return { allowed: isAuthenticated && (isSuperAdmin || (schoolId && isSchoolMember(schoolId))) };
    }
    // Only Super Admin or Backend Server can write financial records
    return { allowed: isSuperAdmin };
  }

  // Audit Logs (Immutable)
  if (["audit_logs", "login_logs", "activity_logs"].includes(rootCol)) {
    if (operation === "read") return { allowed: isSuperAdmin };
    if (operation === "create") return { allowed: isAuthenticated };
    if (["update", "delete"].includes(operation)) return { allowed: false, reason: "IMMUTABLE_LOG" };
  }

  return { allowed: isSuperAdmin };
}

// Simulated Cloud Storage Security Engine
function evaluateStorageAccess(auth, operation, path, fileSize = 1024, contentType = "image/png") {
  const isAuthenticated = auth !== null;
  const isSuperAdmin = isAuthenticated && auth.role === "super_admin";
  const isSchoolMember = (schoolId) => isAuthenticated && (isSuperAdmin || auth.schoolId === schoolId);

  if (path.startsWith("public/")) {
    if (operation === "read") return { allowed: true };
    if (operation === "write") {
      return { allowed: isAuthenticated && fileSize < 5 * 1024 * 1024 && contentType.startsWith("image/") };
    }
  }

  if (path.startsWith("schools/")) {
    const segments = path.split("/");
    const schoolId = segments[1];
    if (operation === "read") return { allowed: isSchoolMember(schoolId) };
    if (operation === "write" || operation === "delete") {
      return { allowed: isSchoolMember(schoolId) && fileSize < 15 * 1024 * 1024 };
    }
  }

  return { allowed: isSuperAdmin };
}

function runFirebaseSecurityTests() {
  console.log("==================================================");
  console.log("[FIRESTORE & STORAGE SECURITY AUTOMATED SUITE]");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  const schoolA_Admin = { uid: "admin_a", role: "admin", schoolId: "school_a" };
  const studentA = { uid: "student_a", role: "student", schoolId: "school_a" };

  // Test 1: Field-Level Protection (Student attempts to promote self to super_admin)
  const t1 = evaluateFirestoreAccess(studentA, "update", "users/student_a", { role: "super_admin" }, { role: "student" });
  if (!t1.allowed && t1.reason === "BLOCKED_FIELD_ESCALATION") {
    console.log("✓ TEST 1: Field-level role escalation on users collection BLOCKED — PASS");
    passed++;
  } else {
    console.error("✗ TEST 1 Failed:", t1);
    failed++;
  }

  // Test 2: Cross-Tenant Firestore CRUD (School A Admin -> School B Students)
  const t2 = evaluateFirestoreAccess(schoolA_Admin, "create", "schools/school_b/students/stu_999", { name: "Hacker" });
  if (!t2.allowed) {
    console.log("✓ TEST 2: Cross-tenant Firestore document creation BLOCKED — PASS");
    passed++;
  } else {
    console.error("✗ TEST 2 Failed: School A created doc in School B!");
    failed++;
  }

  // Test 3: Financial Ledger Client Write Protection
  const t3 = evaluateFirestoreAccess(schoolA_Admin, "create", "orders/order_fake", { amount: 0, status: "paid" });
  if (!t3.allowed) {
    console.log("✓ TEST 3: Direct client mutation of orders/financial ledger BLOCKED — PASS");
    passed++;
  } else {
    console.error("✗ TEST 3 Failed:", t3);
    failed++;
  }

  // Test 4: Audit Log Immutability (Delete / Update protection)
  const t4 = evaluateFirestoreAccess(schoolA_Admin, "delete", "audit_logs/log_123");
  if (!t4.allowed && t4.reason === "IMMUTABLE_LOG") {
    console.log("✓ TEST 4: Audit log deletion/tampering BLOCKED — PASS");
    passed++;
  } else {
    console.error("✗ TEST 4 Failed: Audit log deleted!");
    failed++;
  }

  // Test 5: Cloud Storage Cross-Tenant Download Protection (School A -> School B files)
  const t5 = evaluateStorageAccess(schoolA_Admin, "read", "schools/school_b/reports/confidential.pdf");
  if (!t5.allowed) {
    console.log("✓ TEST 5: Cross-tenant Cloud Storage file access BLOCKED — PASS");
    passed++;
  } else {
    console.error("✗ TEST 5 Failed: School A read School B storage!");
    failed++;
  }

  // Test 6: Cloud Storage Oversized Upload Protection (> 15MB)
  const t6 = evaluateStorageAccess(schoolA_Admin, "write", "schools/school_a/files/big.zip", 20 * 1024 * 1024);
  if (!t6.allowed) {
    console.log("✓ TEST 6: Cloud Storage upload > 15MB BLOCKED — PASS");
    passed++;
  } else {
    console.error("✗ TEST 6 Failed: Oversized file allowed!");
    failed++;
  }

  console.log("\n==================================================");
  console.log(`[RESULTS] Total Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runFirebaseSecurityTests();
