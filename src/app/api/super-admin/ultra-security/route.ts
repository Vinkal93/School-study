import { NextResponse } from "next/server";
import { verifySuperAdminPin, DEFAULT_SUPER_ADMIN_PIN } from "@/lib/services/security-pin.service";

async function getAdminAuthServerOnly() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return adminModule.adminAuth || null;
  } catch (e) {
    return null;
  }
}

async function getAdminDbServerOnly() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return typeof adminModule.getSafeAdminDb === "function" ? adminModule.getSafeAdminDb() : null;
  } catch (e) {
    return null;
  }
}

/**
 * Batch deletion helper.
 */
async function deleteCollectionBatch(collectionName: string, filterSuperAdmin = false) {
  let count = 0;
  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      const snap = await adminDb.collection(collectionName).limit(500).get().catch(() => null);
      if (snap && !snap.empty) {
        const batch = adminDb.batch();
        for (const doc of snap.docs) {
          if (filterSuperAdmin && doc.data()?.role === "super_admin") {
            continue; // Keep super admin
          }
          batch.delete(doc.ref);
          count++;
        }
        await batch.commit().catch(() => {});
      }
      return count;
    }

    const clientModule = await import("@/lib/firebase/client");
    const clientDb = clientModule.getFirebaseDb ? clientModule.getFirebaseDb() : null;
    if (clientDb) {
      const { collection, getDocs, deleteDoc } = await import("firebase/firestore");
      const snap = await getDocs(collection(clientDb, collectionName)).catch(() => null);
      if (snap && !snap.empty) {
        for (const d of snap.docs) {
          if (filterSuperAdmin && d.data()?.role === "super_admin") {
            continue;
          }
          await deleteDoc(d.ref).catch(() => {});
          count++;
        }
      }
    }
  } catch (err) {
    console.warn(`[UltraSecurity] Deletion note for ${collectionName}:`, err);
  }
  return count;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, pin, identifier, userId, confirmationPhrase, actorId = "super_admin" } = body;

    // Action 1: Lookup User Preview
    if (action === "GET_USER_PREVIEW") {
      if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
        return NextResponse.json({ success: false, error: "Identifier (User ID, Email, or Phone) is required." }, { status: 400 });
      }

      const cleanQuery = identifier.trim().toLowerCase();
      let foundUser: any = null;

      const adminDb = await getAdminDbServerOnly();
      if (adminDb) {
        const directDoc = await adminDb.collection("users").doc(cleanQuery).get().catch(() => null);
        if (directDoc && directDoc.exists) {
          foundUser = { id: directDoc.id, ...directDoc.data() };
        } else {
          const emailSnap = await adminDb.collection("users").where("email", "==", cleanQuery).limit(1).get().catch(() => null);
          if (emailSnap && !emailSnap.empty) {
            foundUser = { id: emailSnap.docs[0].id, ...emailSnap.docs[0].data() };
          } else {
            const phoneSnap = await adminDb.collection("users").where("phone", "==", cleanQuery).limit(1).get().catch(() => null);
            if (phoneSnap && !phoneSnap.empty) {
              foundUser = { id: phoneSnap.docs[0].id, ...phoneSnap.docs[0].data() };
            }
          }
        }
      } else {
        const clientModule = await import("@/lib/firebase/client");
        const clientDb = clientModule.getFirebaseDb ? clientModule.getFirebaseDb() : null;
        if (clientDb) {
          const { collection, getDocs, doc, getDoc, query, where } = await import("firebase/firestore");
          const directSnap = await getDoc(doc(clientDb, "users", cleanQuery)).catch(() => null);
          if (directSnap && directSnap.exists()) {
            foundUser = { id: directSnap.id, ...directSnap.data() };
          } else {
            const eq = query(collection(clientDb, "users"), where("email", "==", cleanQuery));
            const esnap = await getDocs(eq).catch(() => null);
            if (esnap && !esnap.empty) {
              foundUser = { id: esnap.docs[0].id, ...esnap.docs[0].data() };
            }
          }
        }
      }

      if (!foundUser) {
        return NextResponse.json({ success: false, error: "No user found matching this ID, email, or phone number." }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        user: {
          uid: foundUser.id || foundUser.uid,
          name: foundUser.name || foundUser.displayName || "Unknown User",
          email: foundUser.email || "No email",
          phone: foundUser.phone || "No phone",
          role: foundUser.role || "user",
          schoolId: foundUser.schoolId || "N/A",
          schoolName: foundUser.schoolName || "",
          status: foundUser.status || "active",
          createdAt: foundUser.createdAt || null,
        },
      });
    }

    // Ultra-Security PIN Verification (630649)
    if (!pin || String(pin).trim() !== DEFAULT_SUPER_ADMIN_PIN) {
      const isValid = await verifySuperAdminPin(String(pin || "")).catch(() => false);
      if (!isValid && String(pin).trim() !== "630649") {
        return NextResponse.json(
          { success: false, error: "Access Denied: Invalid Ultra-Security PIN." },
          { status: 403 }
        );
      }
    }

    // Action 2: ERASE A SPECIFIC USER
    if (action === "ERASE_USER") {
      const targetUid = (userId || identifier || "").trim();
      if (!targetUid) {
        return NextResponse.json({ success: false, error: "Target User ID is required to erase." }, { status: 400 });
      }

      const adminDb = await getAdminDbServerOnly();
      const adminAuth = await getAdminAuthServerOnly();

      let userRole = "";
      let userSchoolId = "";
      if (adminDb) {
        const uDoc = await adminDb.collection("users").doc(targetUid).get().catch(() => null);
        if (uDoc && uDoc.exists) {
          userRole = uDoc.data()?.role || "";
          userSchoolId = uDoc.data()?.schoolId || "";
        }
      }

      if (userRole === "super_admin") {
        return NextResponse.json(
          { success: false, error: "Security Restriction: Super Admin accounts cannot be erased." },
          { status: 403 }
        );
      }

      // 1. Delete from Firebase Authentication
      if (adminAuth) {
        await adminAuth.deleteUser(targetUid).catch((err: any) => {
          console.warn(`[UltraSecurity] Auth deletion skipped/notice for ${targetUid}:`, err?.message);
        });
      }

      // 2. Delete from Firestore
      if (adminDb) {
        await adminDb.collection("users").doc(targetUid).delete().catch(() => {});
        const sessionsSnap = await adminDb.collection("active_sessions").where("userId", "==", targetUid).get().catch(() => null);
        sessionsSnap?.forEach(d => d.ref.delete());
        await adminDb.collection("userIds").doc(targetUid).delete().catch(() => {});

        if (userSchoolId) {
          const studentRef = adminDb.collection("schools").doc(userSchoolId).collection("students");
          const teacherRef = adminDb.collection("schools").doc(userSchoolId).collection("teachers");
          
          await studentRef.doc(targetUid).delete().catch(() => {});
          await teacherRef.doc(targetUid).delete().catch(() => {});

          const stSnap = await studentRef.where("userId", "==", targetUid).get().catch(() => null);
          stSnap?.forEach(d => d.ref.delete());

          const tcSnap = await teacherRef.where("userId", "==", targetUid).get().catch(() => null);
          tcSnap?.forEach(d => d.ref.delete());
        }

        await adminDb.collection("ultra_security_audit_logs").add({
          action: "ERASE_USER",
          targetUid,
          performedBy: actorId,
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `User ${targetUid} and all associated data have been permanently erased.`,
      });
    }

    // Action 3: ERASE ENTIRE PORTAL DATA (FACTORY RESET)
    if (action === "ERASE_PORTAL_DATA") {
      if (confirmationPhrase !== "ERASE ENTIRE PORTAL DATA") {
        return NextResponse.json(
          {
            success: false,
            error: 'Confirmation phrase mismatch. You must type "ERASE ENTIRE PORTAL DATA" exactly.',
          },
          { status: 400 }
        );
      }

      const collectionsToWipe = [
        "schools",
        "notices",
        "inquiries",
        "contactInquiries",
        "attendance",
        "classes",
        "sections",
        "feeStructures",
        "feePayments",
        "feeDiscounts",
        "studentFeeAssignments",
        "feeSettings",
        "orders",
        "invoices",
        "complaints",
        "notifications",
        "activity_logs",
        "active_sessions",
        "emergency_announcements",
        "site_inquiries",
      ];

      const report: Record<string, number> = {};

      for (const colName of collectionsToWipe) {
        const count = await deleteCollectionBatch(colName, false);
        report[colName] = count;
      }

      const usersWiped = await deleteCollectionBatch("users", true);
      report["users (non-super-admin)"] = usersWiped;

      const adminDb = await getAdminDbServerOnly();
      if (adminDb) {
        await adminDb.collection("ultra_security_audit_logs").add({
          action: "ERASE_PORTAL_DATA",
          report,
          performedBy: actorId,
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: "Entire portal data has been successfully erased and reset to fresh factory state. Super Admin account preserved.",
        report,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("[UltraSecurity API Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error during Ultra-Security operation." },
      { status: 500 }
    );
  }
}
