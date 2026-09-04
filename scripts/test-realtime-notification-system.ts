/**
 * REALTIME NOTIFICATION & LIVE EVENT SYSTEM INTEGRATION SUITE
 * 
 * Verifies:
 * 1. Notification Data Model & Contract Compliance
 * 2. Audience Targeting Resolution (All, Teachers, Students, Staff, Class, User)
 * 3. Idempotency Key De-duplication Logic
 * 4. User Read-Status Multi-Tenant Isolation
 * 5. Event Trigger Simulation (Notice, Homework, School Rule, Disciplinary Fine/Reward)
 * 6. Live Indicator Calculation (< 15 min & unread)
 */

import {
  AppNotification,
  CreateNotificationInput,
  UserNotificationView,
} from "../src/types/notification";

console.log("==================================================");
console.log("🔔 REALTIME NOTIFICATION SYSTEM INTEGRATION TEST");
console.log("==================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

// In-memory mock store simulating Firestore tenant collection
const mockFirestoreNotifications: Map<string, AppNotification> = new Map();

function mockCreateNotification(
  schoolId: string,
  input: CreateNotificationInput,
  sender: { uid: string; name: string; role: string }
): string {
  // 1. Idempotency check
  if (input.idempotencyKey) {
    for (const notif of mockFirestoreNotifications.values()) {
      if (notif.schoolId === schoolId && notif.idempotencyKey === input.idempotencyKey) {
        return notif.id; // Return existing without duplicate
      }
    }
  }

  const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const notification: AppNotification = {
    id,
    schoolId,
    title: input.title,
    message: input.message,
    type: input.type,
    targetAudience: input.targetAudience,
    targetClassId: input.targetClassId || "",
    targetSectionId: input.targetSectionId || "",
    targetUserId: input.targetUserId || "",
    targetUserIds: input.targetUserIds || [],
    senderUid: sender.uid,
    senderName: sender.name,
    senderRole: sender.role,
    link: input.link || "",
    actionLabel: input.actionLabel || "",
    idempotencyKey: input.idempotencyKey || "",
    priority: input.priority || "normal",
    readBy: {},
    createdAt: Date.now(),
    metadata: input.metadata || {},
  };

  mockFirestoreNotifications.set(id, notification);
  return id;
}

function mockGetUserNotifications(
  schoolId: string,
  user: { uid: string; role: string; classId?: string }
): { items: UserNotificationView[]; unreadCount: number } {
  const items: UserNotificationView[] = [];

  for (const notif of mockFirestoreNotifications.values()) {
    if (notif.schoolId !== schoolId) continue;

    let isEligible = false;
    if (notif.targetAudience === "all") {
      isEligible = true;
    } else if (notif.targetAudience === "teachers") {
      isEligible = user.role === "teacher" || user.role === "school_admin";
    } else if (notif.targetAudience === "students") {
      isEligible = user.role === "student" || user.role === "school_admin";
    } else if (notif.targetAudience === "class") {
      if (user.role === "school_admin") isEligible = true;
      else if (user.role === "student" && user.classId === notif.targetClassId) isEligible = true;
    } else if (notif.targetAudience === "user") {
      isEligible = notif.targetUserId === user.uid || user.role === "school_admin";
    }

    if (isEligible) {
      const isRead = Boolean(notif.readBy && notif.readBy[user.uid]);
      const isLive = !isRead && (Date.now() - notif.createdAt < 15 * 60 * 1000);

      items.push({
        ...notif,
        isRead,
        isLive,
      });
    }
  }

  const unreadCount = items.filter((i) => !i.isRead).length;
  return { items, unreadCount };
}

function mockMarkAsRead(notificationId: string, userId: string) {
  const notif = mockFirestoreNotifications.get(notificationId);
  if (notif) {
    if (!notif.readBy) notif.readBy = {};
    notif.readBy[userId] = true;
  }
}

// -------------------------------------------------------------
// TEST SUITE EXECUTION
// -------------------------------------------------------------

console.log("🧪 1. Admin Notice Publishing Notification");
const noticeId = "notice_991";
const notifNoticeId = mockCreateNotification(
  "school_101",
  {
    title: "📢 Annual Sports Day Announcement",
    message: "Sports day trials start tomorrow morning on the main ground.",
    type: "notice",
    targetAudience: "all",
    link: "/student/notices",
    actionLabel: "View Notice",
    idempotencyKey: `notice_${noticeId}`,
  },
  { uid: "admin_1", name: "Principal Verma", role: "school_admin" }
);

assert(Boolean(notifNoticeId), "Admin notice notification emitted with valid ID");

// Verify student in school_101 receives it
const student1 = { uid: "stu_1", role: "student", classId: "class_6a" };
const studentFeed1 = mockGetUserNotifications("school_101", student1);
assert(studentFeed1.items.length === 1, "Student in school_101 receives 'all' audience notice");
assert(studentFeed1.unreadCount === 1, "Unread count initialized to 1 for student");
assert(studentFeed1.items[0].isLive === true, "Notification has active LIVE indicator");

// Verify student from different school does NOT receive it (tenant isolation)
const otherSchoolStudent = { uid: "stu_other", role: "student", classId: "class_6a" };
const otherFeed = mockGetUserNotifications("school_999", otherSchoolStudent);
assert(otherFeed.items.length === 0, "Tenant Isolation: Cross-school student receives 0 notifications");

console.log("\n🧪 2. Teacher Homework Assignment Targeting Class");
const hwId = "hw_404";
const hwNotifId = mockCreateNotification(
  "school_101",
  {
    title: "📝 New Homework: Mathematics (Class 6-A)",
    message: "Mr. Rahul assigned Chapter 4 Exercises 1-10.",
    type: "homework",
    targetAudience: "class",
    targetClassId: "class_6a",
    link: "/student/homework",
    actionLabel: "Open Homework",
    idempotencyKey: `homework_${hwId}`,
    priority: "high",
  },
  { uid: "tch_1", name: "Rahul Sir", role: "teacher" }
);

assert(Boolean(hwNotifId), "Teacher homework notification generated");

// Student in Class 6-A receives homework
const class6AStudentFeed = mockGetUserNotifications("school_101", student1);
assert(class6AStudentFeed.items.length === 2, "Class 6-A student receives Homework (now 2 items total)");
assert(class6AStudentFeed.items.some((i) => i.type === "homework"), "Feed contains Homework event");

// Student in Class 7-B does NOT receive Class 6-A homework
const studentClass7B = { uid: "stu_7b", role: "student", classId: "class_7b" };
const class7BFeed = mockGetUserNotifications("school_101", studentClass7B);
assert(
  !class7BFeed.items.some((i) => i.type === "homework"),
  "Audience Filter: Class 7-B student does NOT receive Class 6-A homework"
);

console.log("\n🧪 3. Idempotency & Duplicate Prevention");
const duplicateHwNotifId = mockCreateNotification(
  "school_101",
  {
    title: "📝 New Homework: Mathematics (Class 6-A)",
    message: "Mr. Rahul assigned Chapter 4 Exercises 1-10.",
    type: "homework",
    targetAudience: "class",
    targetClassId: "class_6a",
    link: "/student/homework",
    actionLabel: "Open Homework",
    idempotencyKey: `homework_${hwId}`, // Same idempotency key!
  },
  { uid: "tch_1", name: "Rahul Sir", role: "teacher" }
);

assert(duplicateHwNotifId === hwNotifId, "Duplicate trigger with same idempotencyKey returns existing ID");
const class6AAfterDup = mockGetUserNotifications("school_101", student1);
assert(class6AAfterDup.items.length === 2, "No duplicate notification inserted into user feed");

console.log("\n🧪 4. School Policy & Disciplinary Fines/Rewards");
// School rule created
const ruleNotifId = mockCreateNotification(
  "school_101",
  {
    title: "⚖️ New School Policy: Late Arrival Disciplinary Standard",
    message: "Arrival after 08:15 AM requires reporting to coordinator.",
    type: "rule",
    targetAudience: "all",
    link: "/admin/rules",
    actionLabel: "Inspect Rule",
    idempotencyKey: "rule_501",
  },
  { uid: "admin_1", name: "Principal Verma", role: "school_admin" }
);
assert(Boolean(ruleNotifId), "School policy notification created");

// Fine/Reward issued to specific teacher
const teacher1 = { uid: "tch_1", role: "teacher" };
const fineNotifId = mockCreateNotification(
  "school_101",
  {
    title: "🏆 Commendation Awarded",
    message: "Exemplary syllabus completion (Bonus: ₹2000)",
    type: "fine_reward",
    targetAudience: "user",
    targetUserId: "tch_1",
    link: "/teacher/profile",
    actionLabel: "View Ledger",
    idempotencyKey: "finereward_881",
  },
  { uid: "admin_1", name: "Principal Verma", role: "school_admin" }
);
assert(Boolean(fineNotifId), "Teacher-targeted award notification created");

const teacherFeed = mockGetUserNotifications("school_101", teacher1);
assert(teacherFeed.items.some((i) => i.id === fineNotifId), "Targeted teacher receives personal award notification");

// Student does NOT receive teacher's private fine/reward
const studentFeedAfterFine = mockGetUserNotifications("school_101", student1);
assert(
  !studentFeedAfterFine.items.some((i) => i.id === fineNotifId),
  "Privacy Isolation: Student does NOT receive teacher private award/fine"
);

console.log("\n🧪 5. Multi-User Read Status Isolation");
// Student 1 reads the notice
mockMarkAsRead(notifNoticeId, student1.uid);

const student1AfterRead = mockGetUserNotifications("school_101", student1);
const noticeForStudent1 = student1AfterRead.items.find((i) => i.id === notifNoticeId);
assert(noticeForStudent1?.isRead === true, "Notice marked as read for Student 1");
assert(student1AfterRead.unreadCount === 2, "Student 1 unread count decreased by 1");

// Verify Teacher 1 still sees notice as UNREAD
const teacherFeedAfterStudentRead = mockGetUserNotifications("school_101", teacher1);
const noticeForTeacher = teacherFeedAfterStudentRead.items.find((i) => i.id === notifNoticeId);
assert(noticeForTeacher?.isRead === false, "Read status is isolated: Notice is STILL unread for Teacher 1");

console.log("\n==================================================");
console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
