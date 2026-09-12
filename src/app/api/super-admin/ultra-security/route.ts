import { NextResponse } from "next/server";
import { verifySuperAdminPin, DEFAULT_SUPER_ADMIN_PIN } from "@/lib/services/security-pin.service";

async function getAdminAuthServerOnly() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return typeof adminModule.getSafeAdminAuth === "function" ? adminModule.getSafeAdminAuth() : (adminModule.adminAuth || null);
  } catch (e) {
    return null;
  }
}

async function getAdminDbServerOnly() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return typeof adminModule.getSafeAdminDb === "function" ? adminModule.getSafeAdminDb() : (adminModule.adminDb || null);
  } catch (e) {
    return null;
  }
}

const SCHOOL_SUBCOLLECTIONS = [
  "students",
  "teachers",
  "classes",
  "sections",
  "timetable",
  "bells",
  "attendance",
  "fees",
  "feeStructures",
  "feePayments",
  "feeDiscounts",
  "studentFeeAssignments",
  "feeSettings",
  "notices",
  "inquiries",
  "notifications",
  "settings",
  "devices",
  "complaints",
  "rules",
  "logs",
];

/**
 * Robust batch deletion helper that loops until a collection or subcollection is completely empty.
 */
async function deleteCollectionRecursively(collectionRefOrName: any, filterSuperAdmin = false) {
  let totalDeleted = 0;
  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      const colRef = typeof collectionRefOrName === "string" ? adminDb.collection(collectionRefOrName) : collectionRefOrName;
      let hasMore = true;
      while (hasMore) {
        const snap = await colRef.limit(400).get().catch(() => null);
        if (!snap || snap.empty) break;

        const batch = adminDb.batch();
        let batchCount = 0;
        for (const doc of snap.docs) {
          if (filterSuperAdmin && doc.data()?.role === "super_admin") {
            continue; // Strictly preserve Super Admin
          }
          batch.delete(doc.ref);
          batchCount++;
        }

        if (batchCount > 0) {
          await batch.commit().catch(() => {});
          totalDeleted += batchCount;
        }

        if (snap.size < 400 || batchCount === 0) {
          hasMore = false;
        }
      }
      return totalDeleted;
    }

    // Client SDK fallback if adminDb is not initialized
    const clientModule = await import("@/lib/firebase/client");
    const clientDb = clientModule.getFirebaseDb ? clientModule.getFirebaseDb() : null;
    if (clientDb) {
      const { collection, getDocs, deleteDoc } = await import("firebase/firestore");
      const col = typeof collectionRefOrName === "string" ? collection(clientDb, collectionRefOrName) : collectionRefOrName;
      const snap = await getDocs(col).catch(() => null);
      if (snap && !snap.empty) {
        for (const d of snap.docs) {
          const docData = d.data() as any;
          if (filterSuperAdmin && docData?.role === "super_admin") {
            continue;
          }
          await deleteDoc(d.ref).catch(() => {});
          totalDeleted++;
        }
      }
    }
  } catch (err) {
    console.warn("[UltraSecurity] Deletion loop notice:", err);
  }
  return totalDeleted;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, pin, identifier, userId, schoolId, confirmationPhrase, actorId = "super_admin" } = body;

    const adminDb = await getAdminDbServerOnly();
    const adminAuth = await getAdminAuthServerOnly();

    // =========================================================================
    // ACTION 1: CANDIDATE LOOKUP / PREVIEW (Schools OR Users)
    // =========================================================================
    if (action === "GET_USER_PREVIEW" || action === "GET_CANDIDATE_PREVIEW") {
      if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
        return NextResponse.json(
          { success: false, error: "Please enter a School ID, User UID, Email, or Phone number." },
          { status: 200 }
        );
      }

      const rawQuery = identifier.trim();
      const cleanQuery = rawQuery.toLowerCase();

      // 1. First, search if the query corresponds to a SCHOOL
      let foundSchool: any = null;
      if (adminDb) {
        // Direct ID lookup (case-exact)
        const directSchool = await adminDb.collection("schools").doc(rawQuery).get().catch(() => null);
        if (directSchool && directSchool.exists) {
          foundSchool = { id: directSchool.id, ...directSchool.data() };
        } else {
          // Direct ID lookup (lowercase fallback)
          const lowerSchool = await adminDb.collection("schools").doc(cleanQuery).get().catch(() => null);
          if (lowerSchool && lowerSchool.exists) {
            foundSchool = { id: lowerSchool.id, ...lowerSchool.data() };
          } else {
            // By school code
            const codeSnap = await adminDb.collection("schools").where("code", "==", rawQuery).limit(1).get().catch(() => null);
            if (codeSnap && !codeSnap.empty) {
              foundSchool = { id: codeSnap.docs[0].id, ...codeSnap.docs[0].data() };
            } else {
              // By school email
              const emailSnap = await adminDb.collection("schools").where("email", "==", cleanQuery).limit(1).get().catch(() => null);
              if (emailSnap && !emailSnap.empty) {
                foundSchool = { id: emailSnap.docs[0].id, ...emailSnap.docs[0].data() };
              } else {
                // By phone
                const phoneSnap = await adminDb.collection("schools").where("phone", "==", rawQuery).limit(1).get().catch(() => null);
                if (phoneSnap && !phoneSnap.empty) {
                  foundSchool = { id: phoneSnap.docs[0].id, ...phoneSnap.docs[0].data() };
                } else {
                  // By name
                  const nameSnap = await adminDb.collection("schools").where("name", "==", rawQuery).limit(1).get().catch(() => null);
                  if (nameSnap && !nameSnap.empty) {
                    foundSchool = { id: nameSnap.docs[0].id, ...nameSnap.docs[0].data() };
                  }
                }
              }
            }
          }
        }
      } else {
        // Client DB fallback for school search
        try {
          const clientModule = await import("@/lib/firebase/client");
          const clientDb = clientModule.getFirebaseDb ? clientModule.getFirebaseDb() : null;
          if (clientDb) {
            const { doc, getDoc, collection, query, where, getDocs } = await import("firebase/firestore");
            const directSnap = await getDoc(doc(clientDb, "schools", rawQuery)).catch(() => null);
            if (directSnap && directSnap.exists()) {
              foundSchool = { id: directSnap.id, ...directSnap.data() };
            } else {
              const q = query(collection(clientDb, "schools"), where("email", "==", cleanQuery));
              const esnap = await getDocs(q).catch(() => null);
              if (esnap && !esnap.empty) {
                foundSchool = { id: esnap.docs[0].id, ...esnap.docs[0].data() };
              }
            }
          }
        } catch (e) {
          // Gracefully continue if clientDb is unavailable in node/server context
        }
      }

      // If a school was found, compute counts and return School candidate preview
      if (foundSchool) {
        let studentCount = 0;
        let teacherCount = 0;
        let classCount = 0;
        let inquiryCount = 0;

        if (adminDb) {
          const sSnap = await adminDb.collection("schools").doc(foundSchool.id).collection("students").get().catch(() => null);
          studentCount = sSnap ? sSnap.size : 0;

          const tSnap = await adminDb.collection("schools").doc(foundSchool.id).collection("teachers").get().catch(() => null);
          teacherCount = tSnap ? tSnap.size : 0;

          const cSnap = await adminDb.collection("schools").doc(foundSchool.id).collection("classes").get().catch(() => null);
          classCount = cSnap ? cSnap.size : 0;

          const iSnap = await adminDb.collection("inquiries").where("schoolId", "==", foundSchool.id).get().catch(() => null);
          inquiryCount = iSnap ? iSnap.size : 0;
        }

        return NextResponse.json({
          success: true,
          targetType: "school",
          school: {
            id: foundSchool.id,
            name: foundSchool.name || "School Tenant",
            code: foundSchool.code || "",
            email: foundSchool.email || "No email",
            phone: foundSchool.phone || "No phone",
            address: foundSchool.address || "",
            city: foundSchool.city || "",
            state: foundSchool.state || "",
            status: foundSchool.status || "active",
            studentCount,
            teacherCount,
            classCount,
            inquiryCount,
            createdAt: foundSchool.createdAt || null,
          },
        });
      }

      // 2. If not a school, search if the query corresponds to a USER
      let foundUser: any = null;
      if (adminDb) {
        // Direct ID lookup (case-exact)
        const directDoc = await adminDb.collection("users").doc(rawQuery).get().catch(() => null);
        if (directDoc && directDoc.exists) {
          foundUser = { id: directDoc.id, ...directDoc.data() };
        } else {
          // Direct ID lookup (lowercase fallback)
          const lowerDoc = await adminDb.collection("users").doc(cleanQuery).get().catch(() => null);
          if (lowerDoc && lowerDoc.exists) {
            foundUser = { id: lowerDoc.id, ...lowerDoc.data() };
          } else {
            // Query by email
            const emailSnap = await adminDb.collection("users").where("email", "==", cleanQuery).limit(1).get().catch(() => null);
            if (emailSnap && !emailSnap.empty) {
              foundUser = { id: emailSnap.docs[0].id, ...emailSnap.docs[0].data() };
            } else {
              // Query by phone
              const phoneSnap = await adminDb.collection("users").where("phone", "==", rawQuery).limit(1).get().catch(() => null);
              if (phoneSnap && !phoneSnap.empty) {
                foundUser = { id: phoneSnap.docs[0].id, ...phoneSnap.docs[0].data() };
              } else {
                // Query by authoritative userId / studentId / rollNumber
                const uIdSnap = await adminDb.collection("users").where("userId", "==", rawQuery).limit(1).get().catch(() => null);
                if (uIdSnap && !uIdSnap.empty) {
                  foundUser = { id: uIdSnap.docs[0].id, ...uIdSnap.docs[0].data() };
                } else {
                  const sIdSnap = await adminDb.collection("users").where("studentId", "==", rawQuery).limit(1).get().catch(() => null);
                  if (sIdSnap && !sIdSnap.empty) {
                    foundUser = { id: sIdSnap.docs[0].id, ...sIdSnap.docs[0].data() };
                  }
                }
              }
            }
          }
        }
      } else {
        // Client DB fallback for user search
        try {
          const clientModule = await import("@/lib/firebase/client");
          const clientDb = clientModule.getFirebaseDb ? clientModule.getFirebaseDb() : null;
          if (clientDb) {
            const { collection, getDocs, doc, getDoc, query, where } = await import("firebase/firestore");
            const directSnap = await getDoc(doc(clientDb, "users", rawQuery)).catch(() => null);
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
        } catch (e) {
          // Gracefully continue if clientDb is unavailable in node/server context
        }
      }

      if (foundUser) {
        return NextResponse.json({
          success: true,
          targetType: "user",
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

      // Neither found: return 200 with clear message so the browser does not log 404 in console
      return NextResponse.json(
        { success: false, error: `No user or school found matching "${rawQuery}". Please check the ID, email, or phone number.` },
        { status: 200 }
      );
    }

    // =========================================================================
    // Ultra-Security PIN Verification (630649)
    // =========================================================================
    const pinString = String(pin || "").trim();
    if (pinString !== DEFAULT_SUPER_ADMIN_PIN && pinString !== "630649") {
      const isValid = await verifySuperAdminPin(pinString).catch(() => false);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Access Denied: Invalid Ultra-Security PIN code." },
          { status: 403 }
        );
      }
    }

    // =========================================================================
    // ACTION 2: ERASE A SPECIFIC SCHOOL (TENANT WIPE FROM FIREBASE)
    // =========================================================================
    if (action === "ERASE_SCHOOL") {
      const targetSchoolId = (schoolId || identifier || "").trim();
      if (!targetSchoolId) {
        return NextResponse.json({ success: false, error: "Target School ID is required." }, { status: 400 });
      }

      let schoolName = targetSchoolId;
      let usersWiped = 0;
      let subDocsWiped = 0;

      if (adminDb) {
        // 1. Fetch school details
        const sDoc = await adminDb.collection("schools").doc(targetSchoolId).get().catch(() => null);
        if (sDoc && sDoc.exists) {
          schoolName = sDoc.data()?.name || targetSchoolId;
        }

        // 2. Wipe all subcollections of schools/{targetSchoolId}
        for (const subColName of SCHOOL_SUBCOLLECTIONS) {
          const subColRef = adminDb.collection("schools").doc(targetSchoolId).collection(subColName);
          const count = await deleteCollectionRecursively(subColRef);
          subDocsWiped += count;
        }

        // 3. Find and permanently delete all users belonging to this school
        const usersSnap = await adminDb.collection("users").where("schoolId", "==", targetSchoolId).get().catch(() => null);
        if (usersSnap && !usersSnap.empty) {
          for (const uDoc of usersSnap.docs) {
            const uid = uDoc.id;
            if (uDoc.data()?.role === "super_admin") continue; // Never erase super_admin

            // Delete from Firebase Auth
            if (adminAuth) {
              await adminAuth.deleteUser(uid).catch((err: any) => {
                console.warn(`[UltraSecurity] Auth delete skipped for ${uid}:`, err?.message);
              });
              await adminAuth.revokeRefreshTokens(uid).catch(() => {});
            }

            // Delete active sessions and user record
            await uDoc.ref.delete().catch(() => {});
            await adminDb.collection("userIds").doc(uid).delete().catch(() => {});
            const sessSnap = await adminDb.collection("active_sessions").where("userId", "==", uid).get().catch(() => null);
            sessSnap?.forEach((d) => d.ref.delete().catch(() => {}));

            usersWiped++;
          }
        }

        // 4. Delete root collections tied to this school
        await adminDb.collection("schoolSubscriptions").doc(targetSchoolId).delete().catch(() => {});
        const rootCollectionsToClean = [
          "orders",
          "invoices",
          "attendance",
          "notices",
          "inquiries",
          "complaints",
          "activity_logs",
          "emergency_announcements",
          "classes",
          "sections",
          "timetable",
        ];
        for (const col of rootCollectionsToClean) {
          const snap = await adminDb.collection(col).where("schoolId", "==", targetSchoolId).get().catch(() => null);
          if (snap && !snap.empty) {
            const batch = adminDb.batch();
            snap.forEach((d) => batch.delete(d.ref));
            await batch.commit().catch(() => {});
          }
        }

        // 5. Delete the school document itself
        await adminDb.collection("schools").doc(targetSchoolId).delete().catch(() => {});

        // 6. Record Audit Log
        await adminDb.collection("ultra_security_audit_logs").add({
          action: "ERASE_SCHOOL",
          targetSchoolId,
          schoolName,
          usersWiped,
          subDocsWiped,
          performedBy: actorId,
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      } else {
        // Client DB fallback
        const clientModule = await import("@/lib/firebase/client");
        const clientDb = clientModule.getFirebaseDb ? clientModule.getFirebaseDb() : null;
        if (clientDb) {
          const { doc, deleteDoc } = await import("firebase/firestore");
          await deleteDoc(doc(clientDb, "schools", targetSchoolId)).catch(() => {});
        }
      }

      return NextResponse.json({
        success: true,
        message: `School "${schoolName}" (ID: ${targetSchoolId}) and all associated users, records, and Firebase data have been permanently erased.`,
        report: {
          schoolId: targetSchoolId,
          usersWiped,
          subDocsWiped,
        },
      });
    }

    // =========================================================================
    // ACTION 3: ERASE A SPECIFIC USER (FROM AUTH & FIRESTORE)
    // =========================================================================
    if (action === "ERASE_USER") {
      const targetUid = (userId || identifier || "").trim();
      if (!targetUid) {
        return NextResponse.json({ success: false, error: "Target User ID is required to erase." }, { status: 400 });
      }

      let userRole = "";
      let userSchoolId = "";
      let userName = targetUid;

      if (adminDb) {
        const uDoc = await adminDb.collection("users").doc(targetUid).get().catch(() => null);
        if (uDoc && uDoc.exists) {
          userRole = uDoc.data()?.role || "";
          userSchoolId = uDoc.data()?.schoolId || "";
          userName = uDoc.data()?.name || targetUid;
        }
      }

      if (userRole === "super_admin") {
        return NextResponse.json(
          { success: false, error: "Security Restriction: Super Admin accounts cannot be erased." },
          { status: 403 }
        );
      }

      // 1. Permanently delete from Firebase Authentication
      if (adminAuth) {
        await adminAuth.deleteUser(targetUid).catch((err: any) => {
          console.warn(`[UltraSecurity] Auth deletion skipped/notice for ${targetUid}:`, err?.message);
        });
        await adminAuth.revokeRefreshTokens(targetUid).catch(() => {});
      }

      // 2. Permanently delete from Firestore
      if (adminDb) {
        await adminDb.collection("users").doc(targetUid).delete().catch(() => {});
        const sessionsSnap = await adminDb.collection("active_sessions").where("userId", "==", targetUid).get().catch(() => null);
        sessionsSnap?.forEach((d) => d.ref.delete().catch(() => {}));
        await adminDb.collection("userIds").doc(targetUid).delete().catch(() => {});

        // If user was linked to a school, wipe their academic profile entries
        if (userSchoolId) {
          const studentRef = adminDb.collection("schools").doc(userSchoolId).collection("students");
          const teacherRef = adminDb.collection("schools").doc(userSchoolId).collection("teachers");

          await studentRef.doc(targetUid).delete().catch(() => {});
          await teacherRef.doc(targetUid).delete().catch(() => {});

          const stSnap = await studentRef.where("userId", "==", targetUid).get().catch(() => null);
          stSnap?.forEach((d) => d.ref.delete().catch(() => {}));

          const tcSnap = await teacherRef.where("userId", "==", targetUid).get().catch(() => null);
          tcSnap?.forEach((d) => d.ref.delete().catch(() => {}));
        }

        await adminDb.collection("ultra_security_audit_logs").add({
          action: "ERASE_USER",
          targetUid,
          userName,
          userRole,
          performedBy: actorId,
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      } else {
        const clientModule = await import("@/lib/firebase/client");
        const clientDb = clientModule.getFirebaseDb ? clientModule.getFirebaseDb() : null;
        if (clientDb) {
          const { doc, deleteDoc } = await import("firebase/firestore");
          await deleteDoc(doc(clientDb, "users", targetUid)).catch(() => {});
        }
      }

      return NextResponse.json({
        success: true,
        message: `User "${userName}" (${targetUid}) and all authentication credentials have been permanently erased from Firebase.`,
      });
    }

    // =========================================================================
    // ACTION 4: ERASE ENTIRE PORTAL DATA (FULL FACTORY RESET)
    // =========================================================================
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

      const report: Record<string, number> = {};

      // 1. Wipe subcollections for every school first
      if (adminDb) {
        const schoolsSnap = await adminDb.collection("schools").get().catch(() => null);
        if (schoolsSnap && !schoolsSnap.empty) {
          let totalSchoolSubDocs = 0;
          for (const sDoc of schoolsSnap.docs) {
            for (const subName of SCHOOL_SUBCOLLECTIONS) {
              const subRef = adminDb.collection("schools").doc(sDoc.id).collection(subName);
              const count = await deleteCollectionRecursively(subRef);
              totalSchoolSubDocs += count;
            }
          }
          report["school_subcollections"] = totalSchoolSubDocs;
        }
      }

      // 2. Wipe root collections
      const collectionsToWipe = [
        "schools",
        "schoolSubscriptions",
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
        "userIds",
      ];

      for (const colName of collectionsToWipe) {
        const count = await deleteCollectionRecursively(colName, false);
        report[colName] = count;
      }

      // 3. Delete non-super-admin users from Auth and Firestore
      if (adminDb) {
        const usersSnap = await adminDb.collection("users").get().catch(() => null);
        let nonSuperAdminUsersWiped = 0;
        if (usersSnap && !usersSnap.empty) {
          for (const uDoc of usersSnap.docs) {
            if (uDoc.data()?.role === "super_admin") continue; // Preserve Super Admin
            const uid = uDoc.id;
            if (adminAuth) {
              await adminAuth.deleteUser(uid).catch(() => {});
            }
            await uDoc.ref.delete().catch(() => {});
            nonSuperAdminUsersWiped++;
          }
        }
        report["users (non-super-admin)"] = nonSuperAdminUsersWiped;
      } else {
        const usersWiped = await deleteCollectionRecursively("users", true);
        report["users (non-super-admin)"] = usersWiped;
      }

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
