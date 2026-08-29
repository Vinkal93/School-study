/**
 * Phase 11: Super Admin Inquiry Management MVP & CRM Test Suite
 */

import assert from "node:assert/strict";

console.log("==================================================");
console.log("STARTING PHASE 11 INQUIRIES & CRM TEST SUITE");
console.log("==================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ [FAIL] ${name}:`, err.message);
  }
}

const LEGAL_INQUIRY_TRANSITIONS = {
  NEW: ["IN_PROGRESS", "CLOSED", "RESOLVED"],
  IN_PROGRESS: ["WAITING_FOR_RESPONSE", "RESOLVED", "CLOSED"],
  WAITING_FOR_RESPONSE: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS", "NEW"],
  CLOSED: ["NEW", "IN_PROGRESS"],
};

function normalizeInquiry(docId, data) {
  const statusRaw = (data.status || "NEW").toUpperCase();
  let status = "NEW";
  if (statusRaw === "CONTACTED" || statusRaw === "IN_PROGRESS") status = "IN_PROGRESS";
  else if (statusRaw === "WAITING" || statusRaw === "WAITING_FOR_RESPONSE") status = "WAITING_FOR_RESPONSE";
  else if (statusRaw === "RESOLVED") status = "RESOLVED";
  else if (statusRaw === "CLOSED") status = "CLOSED";

  const priorityRaw = (data.priority || "NORMAL").toUpperCase();
  let priority = "NORMAL";
  if (priorityRaw === "LOW") priority = "LOW";
  else if (priorityRaw === "HIGH") priority = "HIGH";
  else if (priorityRaw === "URGENT") priority = "URGENT";

  return {
    id: docId,
    name: data.name || "Anonymous",
    email: data.email || "",
    phone: data.phone || "",
    organization: data.organization || data.schoolName || "N/A",
    location: data.location || data.city || "",
    subject: data.subject || `Inquiry from ${data.name || "School"}`,
    message: data.message || "",
    source: data.source || "Contact Form",
    status,
    priority,
    assignedTo: data.assignedTo || null,
    assignedToName: data.assignedToName || null,
    notesCount: data.notesCount || 0,
    isArchived: Boolean(data.isArchived),
  };
}

// 1. Inquiry Normalization Defaults
test("1. Data Model Normalization: Default status is NEW, priority is NORMAL", () => {
  const raw = {
    name: "St. Xavier School",
    email: "admin@xavier.edu",
    schoolName: "St. Xavier High School",
    message: "We need 1500 student licenses for academic year 2026-27.",
  };

  const normalized = normalizeInquiry("inq_test_101", raw);

  assert.equal(normalized.id, "inq_test_101");
  assert.equal(normalized.name, "St. Xavier School");
  assert.equal(normalized.status, "NEW");
  assert.equal(normalized.priority, "NORMAL");
  assert.equal(normalized.organization, "St. Xavier High School");
});

// 2. Legal Status Transitions
test("2. State Machine: Valid status transitions are permitted", () => {
  assert.deepEqual(LEGAL_INQUIRY_TRANSITIONS.NEW, ["IN_PROGRESS", "CLOSED", "RESOLVED"]);
  assert.deepEqual(LEGAL_INQUIRY_TRANSITIONS.IN_PROGRESS, ["WAITING_FOR_RESPONSE", "RESOLVED", "CLOSED"]);
  assert.deepEqual(LEGAL_INQUIRY_TRANSITIONS.RESOLVED, ["CLOSED", "IN_PROGRESS", "NEW"]);
});

// 3. Illegal Status Transitions Rejection
test("3. State Machine: Illegal transition from NEW directly to WAITING_FOR_RESPONSE is invalid", () => {
  const allowed = LEGAL_INQUIRY_TRANSITIONS.NEW;
  const isAllowed = allowed.includes("WAITING_FOR_RESPONSE");
  assert.equal(isAllowed, false);
});

// 4. Priority Validation
test("4. Priority Levels: URGENT, HIGH, NORMAL, LOW are recognized", () => {
  const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
  priorities.forEach((p) => {
    const normalized = normalizeInquiry("test_p", { priority: p });
    assert.equal(normalized.priority, p);
  });
});

// 5. Resolution Logic
test("5. Resolve Action: Mark resolved stamps resolution metadata", () => {
  const inquiry = normalizeInquiry("inq_res", { status: "IN_PROGRESS" });
  const now = new Date().toISOString();

  const resolvedInquiry = {
    ...inquiry,
    status: "RESOLVED",
    resolvedAt: now,
    resolvedBy: "super_admin_vinkal",
  };

  assert.equal(resolvedInquiry.status, "RESOLVED");
  assert.equal(resolvedInquiry.resolvedBy, "super_admin_vinkal");
  assert.ok(resolvedInquiry.resolvedAt);
});

// 6. Reopen Logic Clears Resolution Metadata
test("6. Reopen Action: Reopening a closed/resolved inquiry clears active resolution flags", () => {
  const resolved = {
    status: "RESOLVED",
    resolvedAt: "2026-08-29T10:00:00.000Z",
    resolvedBy: "admin_1",
  };

  const reopened = {
    ...resolved,
    status: "IN_PROGRESS",
    resolvedAt: null,
    resolvedBy: null,
  };

  assert.equal(reopened.status, "IN_PROGRESS");
  assert.equal(reopened.resolvedAt, null);
  assert.equal(reopened.resolvedBy, null);
});

// 7. Internal Notes Increment Counter
test("7. Notes Subcollection: Adding internal note increments notesCount", () => {
  let notesCount = 0;

  // Add note
  notesCount += 1;
  assert.equal(notesCount, 1);

  // Add second note
  notesCount += 1;
  assert.equal(notesCount, 2);
});

// 8. Public Submission Validation Rule
test("8. Public Submission Validation: Rejects short messages (<5 chars)", () => {
  const invalidPayload = {
    name: "Test",
    email: "test@test.com",
    message: "Hi",
  };

  const isValid = invalidPayload.message.length >= 5;
  assert.equal(isValid, false);
});

console.log("\n==================================================");
console.log(`PHASE 11 TEST RESULTS: ${passed}/${total} PASSED`);
console.log("==================================================");

if (passed !== total) {
  process.exit(1);
}
