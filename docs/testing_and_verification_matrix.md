# SchoolStudy SaaS — Complete Testing & Verification Matrix

This document provides the exhaustive automated and manual end-to-end verification procedures for the SchoolStudy SaaS platform.

---

## 1. Authentication & Session Verification

| Test ID | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | Correct Login (Super Admin) | Enter Super Admin credentials on `/login` | Authenticated; redirected to `/super-admin` | ✅ PASSED |
| **AUTH-02** | Correct Login (School Admin) | Enter School Admin credentials on `/login` | Authenticated; redirected to `/admin` | ✅ PASSED |
| **AUTH-03** | Correct Login (Teacher) | Enter Teacher credentials on `/login` | Authenticated; redirected to `/teacher` | ✅ PASSED |
| **AUTH-04** | Correct Login (Student) | Enter Student credentials on `/login` | Authenticated; redirected to `/student` | ✅ PASSED |
| **AUTH-05** | Wrong Password | Enter valid email with incorrect password | Toast error: "Invalid login credentials"; stay on `/login` | ✅ PASSED |
| **AUTH-06** | Disabled User Login | Attempt login with a disabled account (`status: 'disabled'`) | Blocked with toast: "Account is disabled. Contact your administrator." | ✅ PASSED |
| **AUTH-07** | Session Persistence | Refresh browser while logged in | User session and role profile restored without re-authenticating | ✅ PASSED |
| **AUTH-08** | Logout | Click Sign out in Topbar | Firebase Auth signs out, session cleared, redirected to `/login` | ✅ PASSED |

---

## 2. School Admin Lifecycle Verification

| Test ID | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **ADM-01** | Create Academic Year | In `/admin/classes`, create session `2026-27` | Document created in `schools/{schoolId}/academicYears` | ✅ PASSED |
| **ADM-02** | Create Class with Sections | Add "Class 10" with sections "A, B" | Random document ID generated; nested sections created | ✅ PASSED |
| **ADM-03** | Add Teacher (Auth Provision) | Add teacher "Rahul Sharma" (emp code `TCH-001`) with initial password | Secondary Firebase App creates Auth account without logging out Admin; `schools/{schoolId}/teachers/{id}` created | ✅ PASSED |
| **ADM-04** | Assign Class Teacher | Assign Rahul Sharma to Class 10 - Section A | Teacher document updated; visible in teacher dashboard | ✅ PASSED |
| **ADM-05** | Enroll Student (Duplicate Check) | Enroll student "Aarav" (Adm No `ADM-2026-001`) | Uniqueness verified; student auth account provisioned; enrolled in Class 10 - Section A | ✅ PASSED |
| **ADM-06** | Duplicate Admission No Block | Attempt enrolling second student with same `ADM-2026-001` | Error toast: "Admission Number is already registered in this school." Enrollment aborted | ✅ PASSED |
| **ADM-07** | Publish School Notice | Create notice targeted to "ALL" / "CLASS 10" | Notice created in `notices/{id}`; visible to respective audience | ✅ PASSED |

---

## 3. Teacher Portal Lifecycle Verification

| Test ID | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TCH-01** | Class Scoped Roster | Log in as Rahul Sharma (`/teacher/students`) | Displays **only** students enrolled in Class 10 - Section A | ✅ PASSED |
| **TCH-02** | Roll Call (Single Tap) | In `/teacher/attendance`, tap `Present`, `Absent`, `Late` pills | Status pills highlight with 48px touch targets; summary counters update dynamically | ✅ PASSED |
| **TCH-03** | Bulk Marking | Click "Mark All Present" | All students marked Present in one tap | ✅ PASSED |
| **TCH-04** | Duplicate Prevention | Submit attendance for today, change date, and change back | Document ID `${schoolId}_${studentId}_${date}` updates atomically; previous marks load accurately without duplicates | ✅ PASSED |
| **TCH-05** | Mobile Sticky Bar | Scroll on mobile viewport (`< 768px`) | Sticky bottom action bar remains accessible with Live Present/Absent counts and Submit button | ✅ PASSED |

---

## 4. Student Portal Lifecycle Verification

| Test ID | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **STU-01** | Student Dashboard | Log in as Aarav Sharma (`/student`) | Displays student name, admission number, class/section, and Live Attendance Percentage Meter | ✅ PASSED |
| **STU-02** | Student Profile | Navigate to `/student/profile` | Shows complete personal details (DOB, guardian contact, address) | ✅ PASSED |
| **STU-03** | Personal Attendance Log | Navigate to `/student/attendance` | Shows date-wise attendance history and status breakdown | ✅ PASSED |
| **STU-04** | Targeted Notices | In `/student/notices`, check notices | Displays notices targeted to `ALL`, `STUDENTS`, and `Class 10` | ✅ PASSED |

---

## 5. Security & Threat Mitigation Verification

| Test ID | Attack / Threat Vector | Simulation Procedure | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Cross-Tenant Data Access | School Admin A attempts to query students from School B | Blocked by Firestore rule `belongsToSchool(schoolId)` (`PERMISSION_DENIED`) | ✅ PASSED |
| **SEC-02** | Role Escalation (Teacher ➔ Admin) | Teacher attempts navigating to `/admin` or `/super-admin` | Layout Guard immediately bounces user to `/teacher`; Firestore rules deny admin collections | ✅ PASSED |
| **SEC-03** | Role Escalation (Student ➔ Teacher) | Student attempts navigating to `/teacher/attendance` | Layout Guard immediately bounces user to `/student`; Firestore rules deny attendance writes | ✅ PASSED |
| **SEC-04** | Attendance Mutation Lockout | Student attempts client-side write to `attendance/{id}` | Firestore rule allows writes only to `isSchoolAdmin() \|\| isTeacher()`; Student write rejected | ✅ PASSED |
| **SEC-05** | IDOR (Student A ➔ Student B) | Student A attempts querying attendance where `studentId == Student_B_ID` | Firestore rule `resource.data.studentId == getUserData().studentId` returns `PERMISSION_DENIED` | ✅ PASSED |
| **SEC-06** | Permissive Fallbacks Check | Codebase search for open read/write wildcards | Verified **0** occurrences of `allow read, write: if true;` | ✅ PASSED |
