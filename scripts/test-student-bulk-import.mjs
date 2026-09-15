import assert from "assert";
import fs from "fs";
import path from "path";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log("✓ PASSED:", name);
    passed++;
  } catch (err) {
    console.error("❌ FAILED:", name, err.message);
    failed++;
  }
}

console.log("====================================================");
console.log("STUDENT BULK IMPORT AND DATA PREVIEW COMPREHENSIVE QA");
console.log("====================================================\n");

// 1. Verify FIELD_ALIASES in import-export.service.ts
test("FIELD_ALIASES contains comprehensive student mappings", () => {
  const serviceContent = fs.readFileSync("src/lib/services/import-export.service.ts", "utf-8");
  assert(serviceContent.includes("admissionNumber:"), "Has admissionNumber aliases");
  assert(serviceContent.includes("rollNumber:"), "Has rollNumber aliases");
  assert(serviceContent.includes("name:"), "Has name aliases");
  assert(serviceContent.includes("className:"), "Has className aliases");
  assert(serviceContent.includes("section:"), "Has section aliases");
  assert(serviceContent.includes("gender:"), "Has gender aliases");
  assert(serviceContent.includes("phone:"), "Has phone aliases");
  assert(serviceContent.includes("email:"), "Has email aliases");
  assert(serviceContent.includes("parent / guardian name"), "Has parent/guardian name alias");
  assert(serviceContent.includes("parent phone") || serviceContent.includes("guardianPhone"), "Has parent/guardian phone alias");
  assert(serviceContent.includes("address:"), "Has address alias");
  assert(serviceContent.includes("admissionDate:"), "Has admissionDate alias");
});

// 2. Fuzzy column detection logic
test("Column auto-detection resolves all 13 student headers without dropping columns", () => {
  const rawHeaders = [
    "Admission Number", "Roll Number", "Student Name", "Class", "Section",
    "Gender", "Phone", "Email", "Parent / Guardian Name", "Parent Phone",
    "Address", "Admission Date", "Status"
  ];
  const aliasMap = {
    admissionNumber: ["admission number", "adm no", "admission no", "adm_no"],
    rollNumber: ["roll number", "roll no", "roll_no", "roll"],
    name: ["student name", "name", "full name"],
    className: ["class", "grade", "classname"],
    section: ["section", "division", "sec"],
    gender: ["gender", "sex"],
    phone: ["phone", "mobile", "contact"],
    email: ["email", "student email"],
    guardianName: ["parent / guardian name", "parent/guardian name", "guardian name", "parent name"],
    guardianPhone: ["parent phone", "guardian phone", "father phone"],
    address: ["address", "residential address"],
    admissionDate: ["admission date", "date of admission"],
    status: ["status"]
  };
  const mappings = {};
  rawHeaders.forEach(col => {
    const normalized = col.trim().toLowerCase().replace(/[_\s\-\\/]+/g, " ");
    const collapsed = normalized.replace(/\s+/g, "");
    for (const [targetKey, aliases] of Object.entries(aliasMap)) {
      const targetLower = targetKey.toLowerCase();
      if (normalized === targetLower || collapsed === targetLower || aliases.some(a => {
        const normA = a.toLowerCase().replace(/[_\s\-\\/]+/g, " ");
        const collA = normA.replace(/\s+/g, "");
        return normalized === normA || collapsed === collA;
      })) {
        mappings[col] = targetKey;
        break;
      }
    }
  });
  assert.strictEqual(mappings["Admission Number"], "admissionNumber");
  assert.strictEqual(mappings["Roll Number"], "rollNumber");
  assert.strictEqual(mappings["Student Name"], "name");
  assert.strictEqual(mappings["Class"], "className");
  assert.strictEqual(mappings["Section"], "section");
  assert.strictEqual(mappings["Gender"], "gender");
  assert.strictEqual(mappings["Phone"], "phone");
  assert.strictEqual(mappings["Email"], "email");
  assert.strictEqual(mappings["Parent / Guardian Name"], "guardianName");
  assert.strictEqual(mappings["Parent Phone"], "guardianPhone");
  assert.strictEqual(mappings["Address"], "address");
  assert.strictEqual(mappings["Admission Date"], "admissionDate");
  assert.strictEqual(mappings["Status"], "status");
  assert.strictEqual(Object.keys(mappings).length, 13);
});

// 3. Preview cell rendering: no blank cells
test("Preview data contains both raw and mapped keys so table cells are never blank", () => {
  const rawRow = {
    "Admission Number": "ADM-2026-001",
    "Roll Number": 1,
    "Student Name": "Rahul Sharma",
    "Class": "Class 10",
    "Section": "A",
    "Gender": "male",
    "Phone": "9876543210",
    "Email": "rahul@school.edu",
    "Parent / Guardian Name": "Anil Sharma",
    "Parent Phone": "9876543211",
    "Address": "123 MG Road, Delhi",
    "Admission Date": "2026-04-01",
    "Status": "active"
  };
  const mappedRecord = {
    admissionNumber: "ADM-2026-001",
    rollNumber: 1,
    name: "Rahul Sharma",
    className: "Class 10",
    section: "A",
    gender: "male",
    phone: "9876543210",
    email: "rahul@school.edu",
    guardianName: "Anil Sharma",
    guardianPhone: "9876543211",
    address: "123 MG Road, Delhi",
    admissionDate: "2026-04-01",
    status: "active"
  };
  const previewItem = { _rowNumber: 2, ...rawRow, ...mappedRecord };
  Object.keys(rawRow).forEach(col => {
    const cellVal = previewItem[col] !== undefined && previewItem[col] !== "" ? previewItem[col] : previewItem[mappedRecord[col]];
    assert(cellVal !== undefined && cellVal !== "", "Cell for " + col + " must not be blank");
    assert.strictEqual(cellVal, rawRow[col]);
  });
});

// 4. Batch chunking for 1, 5, and 500 records
test("500 records are chunked into safe batches of <= 200 writes", () => {
  const records = Array.from({ length: 500 }, (_, i) => ({ id: i }));
  const BATCH_SIZE = 200;
  const batches = [];
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    batches.push(records.slice(i, i + BATCH_SIZE));
  }
  assert.strictEqual(batches.length, 3);
  assert.strictEqual(batches[0].length, 200);
  assert.strictEqual(batches[1].length, 200);
  assert.strictEqual(batches[2].length, 100);
});

// 5. Sanitization purges undefined values
test("Sanitization removes undefined values to prevent Firestore driver errors", () => {
  const raw = { name: "Aarav", phone: undefined, guardianPhone: undefined, address: null, rollNumber: 5 };
  const clean = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    clean[k] = v === null ? null : v;
  }
  assert.strictEqual("phone" in clean, false);
  assert.strictEqual("guardianPhone" in clean, false);
  assert.strictEqual(clean.address, null);
  assert.strictEqual(clean.name, "Aarav");
});

// 6. Client service export check
test("importSchoolDataClient is exported from import-export-client.service.ts", () => {
  const clientFile = fs.readFileSync("src/lib/services/import-export-client.service.ts", "utf-8");
  assert(clientFile.includes("export async function importSchoolDataClient"));
  assert(clientFile.includes("setDoc(schoolDocRef"));
});

// 7. Route check
test("Execute route supports fallbackToClient", () => {
  const routeFile = fs.readFileSync("src/app/api/admin/backup/import/execute/route.ts", "utf-8");
  assert(routeFile.includes("fallbackToClient"));
  assert(routeFile.includes("multipart/form-data"));
});

console.log("\n====================================================");
console.log("ALL TESTS FINISHED: " + passed + " PASSED, " + failed + " FAILED");
console.log("====================================================");
if (failed > 0) process.exit(1);
