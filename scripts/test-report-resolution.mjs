import assert from "node:assert";

console.log("=================================================");
console.log("TEST SUITE: REPORT DATA RESOLUTION (STUDENTS & TEACHERS)");
console.log("=================================================");

let passed = 0;
function test(desc, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Mock student list (similar to real Firestore data)
const mockStudents = [
  {
    id: "std_1",
    name: "de",
    rollNumber: 5,
    admissionNumber: "5",
    className: "class 9",
    sectionName: "Section A",
    gender: "male",
    guardianName: "Parent De",
    phone: "9118245636",
    admissionDate: "2026-04-10",
    status: "active"
  },
  {
    id: "std_2",
    fullName: "Rahul Kumar",
    rollNumber: 1,
    studentId: "SBCI1",
    admissionNumber: "ADM-001",
    className: "Class 10",
    sectionName: "A",
    gender: "male",
    parentName: "Suresh Kumar",
    parentPhone: "9876543210",
    status: "active"
  }
];

// Student row transformation
function transformStudentRows(students, activeSearch = "", activeStatus = "all") {
  return students
    .filter((s) => {
      const rawStatus = (s.status || "active").toLowerCase();
      if (activeSearch) {
        const kw = activeSearch.toLowerCase().trim();
        const name = String(s.name || s.fullName || "").toLowerCase();
        const roll = String(s.rollNumber || s.studentId || s.rollNo || "").toLowerCase();
        const adm = String(s.admissionNumber || s.admissionNo || "").toLowerCase();
        const cls = String(s.className || "").toLowerCase();
        if (!name.includes(kw) && !roll.includes(kw) && !adm.includes(kw) && !cls.includes(kw)) return false;
      }
      if (activeStatus && activeStatus !== "all") {
        if (rawStatus !== activeStatus.toLowerCase()) return false;
      }
      return true;
    })
    .map((s) => ({
      id: s.id,
      rollNo: String(s.rollNumber || s.studentId || s.rollNo || "-"),
      fullName: s.name || s.fullName || "Student",
      className: s.className ? `${s.className} ${s.sectionName || s.section || ""}`.trim() : "Unassigned",
      gender: s.gender ? String(s.gender).toUpperCase() : "-",
      parentName: s.parentName || s.guardianName || s.fatherName || "-",
      parentPhone: s.phone || s.guardianPhone || s.parentPhone || s.parentContact || "-",
      admissionDate: s.admissionDate || "-",
      status: (s.status || "ACTIVE").toUpperCase(),
    }));
}

test("Student Report: Resolves all students without empty dropout", () => {
  const rows = transformStudentRows(mockStudents);
  if (rows.length !== 2) throw new Error(`Expected 2 rows, got ${rows.length}`);
  if (rows[0].fullName !== "de") throw new Error(`Expected 'de', got ${rows[0].fullName}`);
  if (rows[0].rollNo !== "5") throw new Error(`Expected roll '5', got ${rows[0].rollNo}`);
  if (rows[1].fullName !== "Rahul Kumar") throw new Error(`Expected 'Rahul Kumar', got ${rows[1].fullName}`);
});

test("Student Report: Search filtering by name or roll number works", () => {
  const rows = transformStudentRows(mockStudents, "de");
  if (rows.length !== 1 || rows[0].fullName !== "de") throw new Error("Search filter failed for 'de'");

  const rows2 = transformStudentRows(mockStudents, "class 10");
  if (rows2.length !== 1 || rows2[0].fullName !== "Rahul Kumar") throw new Error("Search filter failed for 'class 10'");
});

// 2. Mock teacher list
const mockTeachers = [
  {
    id: "tch_1",
    name: "Vikram Singh",
    email: "vikram@school.com",
    phone: "9118245636",
    subjects: ["Mathematics", "Physics"],
    assignedClassName: "Class 9 A",
    joiningDate: "2025-06-01",
    status: "active"
  },
  {
    id: "tch_2",
    fullName: "Priya Sharma",
    email: "priya@school.com",
    phone: "9876543210",
    specialization: "English",
    className: "Class 10 B",
    status: "active"
  }
];

// Teacher row transformation
function transformTeacherRows(teachers, activeSearch = "", activeStatus = "all") {
  return teachers
    .filter((t) => {
      const rawStatus = (t.status || "active").toLowerCase();
      if (activeSearch) {
        const kw = activeSearch.toLowerCase().trim();
        const name = String(t.name || t.fullName || "").toLowerCase();
        const email = String(t.email || "").toLowerCase();
        const subj = String(t.subjects?.join(" ") || t.specialization || t.subject || "").toLowerCase();
        if (!name.includes(kw) && !email.includes(kw) && !subj.includes(kw)) return false;
      }
      if (activeStatus && activeStatus !== "all") {
        if (rawStatus !== activeStatus.toLowerCase()) return false;
      }
      return true;
    })
    .map((t) => ({
      id: t.id,
      fullName: t.name || t.fullName || "Teacher",
      email: t.email || "-",
      phone: t.phone || "-",
      subject: t.subjects?.join(", ") || t.specialization || t.subject || "General",
      assignedClass: t.assignedClassName || t.assignedClass || t.className || "-",
      joiningDate: t.joiningDate || "-",
      status: (t.status || "ACTIVE").toUpperCase(),
    }));
}

test("Teacher Report: Resolves all teachers with subjects and class assignments", () => {
  const rows = transformTeacherRows(mockTeachers);
  if (rows.length !== 2) throw new Error(`Expected 2 rows, got ${rows.length}`);
  if (rows[0].fullName !== "Vikram Singh") throw new Error(`Expected 'Vikram Singh', got ${rows[0].fullName}`);
  if (rows[0].subject !== "Mathematics, Physics") throw new Error(`Expected subjects, got ${rows[0].subject}`);
  if (rows[1].fullName !== "Priya Sharma") throw new Error(`Expected 'Priya Sharma', got ${rows[1].fullName}`);
});

test("Teacher Report: Search filtering by specialization works", () => {
  const rows = transformTeacherRows(mockTeachers, "English");
  if (rows.length !== 1 || rows[0].fullName !== "Priya Sharma") throw new Error("Search filter failed for 'English'");
});

console.log(`\n=================================================`);
console.log(`SUMMARY: ${passed} passed, 0 failed`);
console.log(`=================================================`);
