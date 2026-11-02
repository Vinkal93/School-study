/**
 * Authoritative Firestore Seeding Script for Free Registration Plan
 * Ensures 'plan_free' and 'plan_free_v1' exist with ACTIVE status and 0 price.
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

// 1. Try to find local service account file or environment
let serviceAccount = null;
const possibleJsonPaths = [
  path.resolve(process.cwd(), "school-study-c8991-firebase-adminsdk-fbsvc-018417932e.json"),
  path.resolve(process.env.USERPROFILE || "", "Downloads", "school-study-c8991-firebase-adminsdk-fbsvc-018417932e.json"),
];

for (const p of possibleJsonPaths) {
  if (fs.existsSync(p)) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(p, "utf8"));
      console.log(`Loaded service account from ${p}`);
      break;
    } catch {}
  }
}

let app;
if (serviceAccount) {
  app = getApps().length === 0 ? initializeApp({ credential: cert(serviceAccount) }) : getApps()[0];
} else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  app = getApps().length === 0 ? initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID || "school-study-c8991",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    })
  }) : getApps()[0];
} else {
  console.error("No service account credentials found. Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY or place service account JSON in project root.");
  process.exit(1);
}

const db = getFirestore(app);

async function seed() {
  const nowIso = new Date().toISOString();

  const freePlanDoc = {
    id: "plan_free",
    name: "Free Plan",
    slug: "free",
    description: "Essential modules for evaluation and trial schools.",
    status: "ACTIVE",
    displayOrder: 0,
    isPopular: false,
    publicVisible: true,
    version: 1,
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "school_dashboard",
      "subscription_billing",
    ],
    featureAccess: {
      student_management: "FULL_ACCESS",
      teacher_management: "FULL_ACCESS",
      class_management: "FULL_ACCESS",
      basic_attendance: "FULL_ACCESS",
      school_dashboard: "FULL_ACCESS",
      subscription_billing: "FULL_ACCESS",
    },
    limits: {
      maxStudents: 100,
      maxTeachers: 10,
      maxClasses: 5,
      maxStaffAccounts: 1,
      maxParents: 100,
      maxStorageBytes: 500 * 1024 * 1024,
      maxNotifications: 500,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const freeVersionDoc = {
    id: "plan_free_v1",
    planId: "plan_free",
    version: 1,
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "INR",
    features: freePlanDoc.features,
    featureAccess: freePlanDoc.featureAccess,
    limits: freePlanDoc.limits,
    effectiveFrom: nowIso,
    effectiveUntil: null,
    status: "ACTIVE",
    changeNotes: "Authoritative free registration plan version",
    createdAt: nowIso,
  };

  console.log("Writing plan_free to 'plans' collection...");
  await db.collection("plans").doc("plan_free").set(freePlanDoc, { merge: true });

  console.log("Writing plan_free_v1 to 'planVersions' collection...");
  await db.collection("planVersions").doc("plan_free_v1").set(freeVersionDoc, { merge: true });

  console.log("Successfully seeded free registration plan into Firestore!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
