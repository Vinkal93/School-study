import { NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, collectionGroup, getDocs, query, where, limit } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawIdentifier = (body?.identifier || "").trim();

    if (!rawIdentifier) {
      return NextResponse.json(
        { success: false, error: "Identifier is required." },
        { status: 400 }
      );
    }

    // 1. If it's already an email address, return immediately
    if (rawIdentifier.includes("@")) {
      return NextResponse.json({
        success: true,
        email: rawIdentifier.toLowerCase(),
      });
    }

    const idUpper = rawIdentifier.toUpperCase();
    const idRaw = rawIdentifier;
    const searchVariants = Array.from(new Set([idUpper, idRaw]));

    // Try Admin DB if initialized and authenticated
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      try {
        // 0. Check authoritative userIds registry
        const idSnap = await adminDb.collection("userIds").doc(idUpper).get();
        if (idSnap.exists && idSnap.data()?.email) {
          return NextResponse.json({
            success: true,
            email: idSnap.data()!.email.toLowerCase(),
            userId: idUpper,
            role: idSnap.data()?.role,
          });
        }

        // A. Search users collection by userId or studentId
        for (const variant of searchVariants) {
          const userSnap = await adminDb
            .collection("users")
            .where("userId", "==", variant)
            .limit(1)
            .get();
          if (!userSnap.empty && userSnap.docs[0].data().email) {
            return NextResponse.json({
              success: true,
              email: userSnap.docs[0].data().email.toLowerCase(),
              userId: variant,
              role: userSnap.docs[0].data().role,
            });
          }
        }
        for (const variant of searchVariants) {
          const userSnap = await adminDb
            .collection("users")
            .where("studentId", "==", variant)
            .limit(1)
            .get();
          if (!userSnap.empty && userSnap.docs[0].data().email) {
            return NextResponse.json({
              success: true,
              email: userSnap.docs[0].data().email.toLowerCase(),
            });
          }
        }

        // B. Search users collection by teacherCode
        for (const variant of searchVariants) {
          const userSnap = await adminDb
            .collection("users")
            .where("teacherCode", "==", variant)
            .limit(1)
            .get();
          if (!userSnap.empty && userSnap.docs[0].data().email) {
            return NextResponse.json({
              success: true,
              email: userSnap.docs[0].data().email.toLowerCase(),
            });
          }
        }

        // C. Search users collection by admissionNumber
        for (const variant of searchVariants) {
          const userSnap = await adminDb
            .collection("users")
            .where("admissionNumber", "==", variant)
            .limit(1)
            .get();
          if (!userSnap.empty && userSnap.docs[0].data().email) {
            return NextResponse.json({
              success: true,
              email: userSnap.docs[0].data().email.toLowerCase(),
            });
          }
        }

        // D. Fallback: Search collectionGroup students
        for (const variant of searchVariants) {
          const studentSnap = await adminDb
            .collectionGroup("students")
            .where("studentId", "==", variant)
            .limit(1)
            .get();
          if (!studentSnap.empty && studentSnap.docs[0].data().email) {
            return NextResponse.json({
              success: true,
              email: studentSnap.docs[0].data().email.toLowerCase(),
            });
          }
        }

        // E. Fallback: Search collectionGroup students by admissionNumber
        for (const variant of searchVariants) {
          const studentSnap = await adminDb
            .collectionGroup("students")
            .where("admissionNumber", "==", variant)
            .limit(1)
            .get();
          if (!studentSnap.empty && studentSnap.docs[0].data().email) {
            return NextResponse.json({
              success: true,
              email: studentSnap.docs[0].data().email.toLowerCase(),
            });
          }
        }

        // F. Fallback: Search collectionGroup teachers by teacherCode
        for (const variant of searchVariants) {
          const teacherSnap = await adminDb
            .collectionGroup("teachers")
            .where("teacherCode", "==", variant)
            .limit(1)
            .get();
          if (!teacherSnap.empty && teacherSnap.docs[0].data().email) {
            return NextResponse.json({
              success: true,
              email: teacherSnap.docs[0].data().email.toLowerCase(),
            });
          }
        }
      } catch (adminErr: any) {
        console.warn("Notice: Admin DB identifier lookup fallback to client SDK:", adminErr?.message);
      }
    }

    // 2. Client SDK fallback on server
    const clientDb = getFirebaseDb();
    if (clientDb) {
      // Check userIds doc
      try {
        const idSnap = await getDocs(query(collection(clientDb, "userIds"), where("userId", "==", idUpper), limit(1)));
        if (!idSnap.empty && idSnap.docs[0].data().email) {
          return NextResponse.json({
            success: true,
            email: idSnap.docs[0].data().email.toLowerCase(),
            userId: idUpper,
          });
        }
      } catch (e) {}

      // Search users collection
      for (const variant of searchVariants) {
        try {
          const qUserId = query(
            collection(clientDb, "users"),
            where("userId", "==", variant),
            limit(1)
          );
          const snap = await getDocs(qUserId);
          if (!snap.empty && snap.docs[0].data().email) {
            return NextResponse.json({
              success: true,
              email: snap.docs[0].data().email.toLowerCase(),
              userId: variant,
            });
          }
        } catch (e) {}

        try {
          const qStudent = query(
            collection(clientDb, "users"),
            where("studentId", "==", variant),
            limit(1)
          );
          const snap = await getDocs(qStudent);
          if (!snap.empty && snap.docs[0].data().email) {
            return NextResponse.json({
              success: true,
              email: snap.docs[0].data().email.toLowerCase(),
            });
          }
        } catch (e) {
          // ignore
        }

        try {
          const qTeacher = query(
            collection(clientDb, "users"),
            where("teacherCode", "==", variant),
            limit(1)
          );
          const snap = await getDocs(qTeacher);
          if (!snap.empty && snap.docs[0].data().email) {
            return NextResponse.json({
              success: true,
              email: snap.docs[0].data().email.toLowerCase(),
            });
          }
        } catch (e) {
          // ignore
        }

        try {
          const qAdm = query(
            collection(clientDb, "users"),
            where("admissionNumber", "==", variant),
            limit(1)
          );
          const snap = await getDocs(qAdm);
          if (!snap.empty && snap.docs[0].data().email) {
            return NextResponse.json({
              success: true,
              email: snap.docs[0].data().email.toLowerCase(),
            });
          }
        } catch (e) {
          // ignore
        }
      }

      // Search collectionGroup students
      for (const variant of searchVariants) {
        try {
          const qGroup = query(
            collectionGroup(clientDb, "students"),
            where("studentId", "==", variant),
            limit(1)
          );
          const snap = await getDocs(qGroup);
          if (!snap.empty && snap.docs[0].data().email) {
            return NextResponse.json({
              success: true,
              email: snap.docs[0].data().email.toLowerCase(),
            });
          }
        } catch (e) {
          // ignore
        }

        try {
          const qGroupAdm = query(
            collectionGroup(clientDb, "students"),
            where("admissionNumber", "==", variant),
            limit(1)
          );
          const snap = await getDocs(qGroupAdm);
          if (!snap.empty && snap.docs[0].data().email) {
            return NextResponse.json({
              success: true,
              email: snap.docs[0].data().email.toLowerCase(),
            });
          }
        } catch (e) {
          // ignore
        }
      }

      // Search collectionGroup teachers
      for (const variant of searchVariants) {
        try {
          const qGroupTeacher = query(
            collectionGroup(clientDb, "teachers"),
            where("teacherCode", "==", variant),
            limit(1)
          );
          const snap = await getDocs(qGroupTeacher);
          if (!snap.empty && snap.docs[0].data().email) {
            return NextResponse.json({
              success: true,
              email: snap.docs[0].data().email.toLowerCase(),
            });
          }
        } catch (e) {
          // ignore
        }
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: `No account found with ID "${rawIdentifier}". Please check your Student/Teacher ID or sign in using your registered email.`,
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("Resolve identifier error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to resolve identifier." },
      { status: 500 }
    );
  }
}
