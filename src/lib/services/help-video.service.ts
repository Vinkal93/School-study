import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  HelpVideo,
  CreateHelpVideoInput,
  UpdateHelpVideoInput,
  HelpVideoRole,
} from "@/types/help-video";

const COLLECTION = "helpVideos";

/**
 * Built-in default help guides that are seeded on first load
 * to ensure teachers, admins, and super admins have high-impact guides.
 */
const SEED_VIDEOS: CreateHelpVideoInput[] = [
  // Teacher Guides
  {
    title: "How to Take Daily Attendance & Verify Records",
    description: "Step-by-step tutorial on marking student attendance, viewing past trends, and downloading class rosters.",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "attendance",
    targetRole: "teacher",
    duration: "4:30",
    tags: ["attendance", "daily-records", "teacher"],
    published: true,
    displayOrder: 1,
  },
  {
    title: "Creating Assignments & Evaluating Homework",
    description: "Learn how to distribute digital homework, set deadlines, grade submissions, and provide student feedback.",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "homework",
    targetRole: "teacher",
    duration: "6:15",
    tags: ["homework", "assignments", "grading"],
    published: true,
    displayOrder: 2,
  },
  {
    title: "Student Discipline & Filing Official Incident Complaints",
    description: "Guide for teachers on registering conduct complaints, assigning severity levels, and alerting administration.",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "complaints",
    targetRole: "teacher",
    duration: "3:45",
    tags: ["discipline", "complaint", "student-records"],
    published: true,
    displayOrder: 3,
  },
  // School Admin Guides
  {
    title: "Managing Student & Teacher Directory",
    description: "Overview of enrolling new students, onboarding teachers, and assigning section class teachers.",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "general",
    targetRole: "school_admin",
    duration: "7:20",
    tags: ["admin", "students", "teachers"],
    published: true,
    displayOrder: 10,
  },
  {
    title: "Fee Collection & Receipt Generation",
    description: "Setting up fee structures, recording online/offline fee installments, and generating official PDF invoices.",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "fees",
    targetRole: "school_admin",
    duration: "8:10",
    tags: ["fees", "finance", "receipts"],
    published: true,
    displayOrder: 11,
  },
  // Super Admin Guides
  {
    title: "Super Admin: Multi-Tenant School Onboarding & Subscription Control",
    description: "Authoritative walkthrough for approving new school tenants, configuring quota limits, and managing trial tiers.",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "super_admin",
    targetRole: "super_admin",
    duration: "10:15",
    tags: ["super-admin", "multi-tenant", "subscriptions"],
    published: true,
    displayOrder: 20,
  },
  {
    title: "Super Admin: Security Monitoring, Threat Defense & Realtime Force Logout",
    description: "Investigating unauthorized access attempts, terminating active suspicious sessions, and verifying audit logs.",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "system",
    targetRole: "super_admin",
    duration: "9:40",
    tags: ["security", "audit", "force-logout", "sessions"],
    published: true,
    displayOrder: 21,
  },
];

/**
 * Fetch help videos tailored to caller's role.
 * Strictly prevents non-super-admins from ever seeing super_admin videos or unpublished drafts.
 */
export async function getHelpVideos(
  userRole?: string,
  isSuperAdmin: boolean = false
): Promise<HelpVideo[]> {
  try {
    const db = getFirebaseDb();
    const colRef = collection(db, COLLECTION);
    const snap = await getDocs(colRef);

    let videos: HelpVideo[] = [];

    if (snap.empty) {
      // Auto-seed default videos if collection is empty
      const seeded: HelpVideo[] = [];
      for (const item of SEED_VIDEOS) {
        const docRef = await addDoc(colRef, {
          ...item,
          published: Boolean(item.published ?? true),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        seeded.push({
          id: docRef.id,
          ...item,
          published: Boolean(item.published ?? true),
        });
      }
      videos = seeded;
    } else {
      videos = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || "",
          description: data.description || "",
          videoUrl: data.videoUrl || "",
          thumbnailUrl: data.thumbnailUrl || undefined,
          category: data.category || "general",
          targetRole: data.targetRole || "all",
          duration: data.duration || undefined,
          tags: data.tags || [],
          published: Boolean(data.published),
          displayOrder: typeof data.displayOrder === "number" ? data.displayOrder : 50,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          createdBy: data.createdBy,
        };
      });
    }

    // Role-based filtering:
    return videos
      .filter((v) => {
        // Only super admin can see unpublished draft videos
        if (!isSuperAdmin && !v.published) return false;

        // Non-super-admins CANNOT see super_admin videos under any circumstance
        if (!isSuperAdmin && (v.targetRole === "super_admin" || v.category === "super_admin")) {
          return false;
        }

        // If a specific role is queried and caller is not super admin
        if (!isSuperAdmin && userRole) {
          return v.targetRole === "all" || v.targetRole === userRole;
        }

        return true;
      })
      .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
  } catch (err) {
    console.error("[HelpVideoService] Failed to fetch help videos:", err);
    // Fallback to in-memory seeded list (filtered) if Firestore fails or in test environment
    return SEED_VIDEOS.map((v, i) => ({
      id: `seed_${i}`,
      ...v,
      published: Boolean(v.published ?? true),
    }))
      .filter((v) => {
        if (!isSuperAdmin && !v.published) return false;
        if (!isSuperAdmin && (v.targetRole === "super_admin" || v.category === "super_admin")) {
          return false;
        }
        if (!isSuperAdmin && userRole) {
          return v.targetRole === "all" || v.targetRole === userRole;
        }
        return true;
      })
      .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
  }
}

/**
 * Super Admin only: Create a new tutorial/guide video
 */
export async function createHelpVideo(
  input: CreateHelpVideoInput,
  createdByUid: string
): Promise<string> {
  const db = getFirebaseDb();
  const colRef = collection(db, COLLECTION);
  const docRef = await addDoc(colRef, {
    ...input,
    published: input.published ?? true,
    displayOrder: input.displayOrder ?? 50,
    createdBy: createdByUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Super Admin only: Update existing help video
 */
export async function updateHelpVideo(
  id: string,
  input: UpdateHelpVideoInput
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Super Admin only: Delete help video
 */
export async function deleteHelpVideo(id: string): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}
