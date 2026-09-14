import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, doc, getDocs, query, where, orderBy, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;
    const body = await request.json().catch(() => ({}));
    const {
      schoolId,
      classId,
      className,
      sectionId,
      sectionName,
      bellId,
      bellNumber,
      subject,
      bookName,
      title,
      description,
      assignedDate,
      dueDate,
      attachmentUrl,
    } = body;

    if (!schoolId || !classId || !subject?.trim() || !title?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: schoolId, classId, subject, title, and description are required." },
        { status: 400 }
      );
    }

    // 1. Tenant Verification
    if (user.role !== "super_admin" && user.schoolId !== schoolId) {
      return NextResponse.json(
        { error: "Cross-school violation: User does not belong to the specified school." },
        { status: 403 }
      );
    }

    // 2. Role Verification
    if (user.role !== "super_admin" && user.role !== "admin" && user.role !== "school_admin" && user.role !== "teacher") {
      return NextResponse.json(
        { error: "Access Denied: Only teachers and administrators can assign homework." },
        { status: 403 }
      );
    }

    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();
    const nowIso = new Date().toISOString();

    let homeworkId = "";

    if (adminDb) {
      const homeworkRef = adminDb.collection("schools").doc(schoolId).collection("homework").doc();
      homeworkId = homeworkRef.id;

      const homeworkData = {
        id: homeworkId,
        schoolId,
        classId,
        className: className || "",
        sectionId: sectionId || "",
        sectionName: sectionName || "",
        bellId: bellId || "",
        bellNumber: bellNumber ? Number(bellNumber) : null,
        subject: subject.trim(),
        bookName: bookName ? bookName.trim() : "",
        title: title.trim(),
        description: description.trim(),
        assignedDate: assignedDate || nowIso.split("T")[0],
        dueDate: dueDate || null,
        teacherId: user.uid,
        teacherName: user.name || "Teacher",
        attachmentUrl: attachmentUrl || "",
        status: "assigned",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await homeworkRef.set(homeworkData);

      // Dispatch real-time notification to class
      try {
        const notifRef = adminDb.collection("schools").doc(schoolId).collection("notifications").doc();
        await notifRef.set({
          id: notifRef.id,
          schoolId,
          title: `📝 New Homework: ${subject.trim()} (${className || "Class"})`,
          message: `${user.name || "Teacher"} assigned "${title.trim()}". Due: ${dueDate || "Next class"}`,
          type: "homework",
          targetAudience: "class",
          targetClassId: classId,
          link: "/student/homework",
          actionLabel: "Open Homework",
          idempotencyKey: `homework_${homeworkId}`,
          priority: "high",
          senderUid: user.uid,
          senderName: user.name || "Teacher",
          senderRole: user.role,
          createdAt: nowIso,
        });
      } catch (notifErr) {
        console.warn("Notification dispatch notice:", notifErr);
      }
    } else if (clientDb) {
      const homeworkRef = doc(collection(clientDb, "schools", schoolId, "homework"));
      homeworkId = homeworkRef.id;

      const homeworkData = {
        id: homeworkId,
        schoolId,
        classId,
        className: className || "",
        sectionId: sectionId || "",
        sectionName: sectionName || "",
        bellId: bellId || "",
        bellNumber: bellNumber ? Number(bellNumber) : null,
        subject: subject.trim(),
        bookName: bookName ? bookName.trim() : "",
        title: title.trim(),
        description: description.trim(),
        assignedDate: assignedDate || nowIso.split("T")[0],
        dueDate: dueDate || null,
        teacherId: user.uid,
        teacherName: user.name || "Teacher",
        attachmentUrl: attachmentUrl || "",
        status: "assigned",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(homeworkRef, homeworkData);

      try {
        const notifRef = doc(collection(clientDb, "schools", schoolId, "notifications"));
        await setDoc(notifRef, {
          id: notifRef.id,
          schoolId,
          title: `📝 New Homework: ${subject.trim()} (${className || "Class"})`,
          message: `${user.name || "Teacher"} assigned "${title.trim()}". Due: ${dueDate || "Next class"}`,
          type: "homework",
          targetAudience: "class",
          targetClassId: classId,
          link: "/student/homework",
          actionLabel: "Open Homework",
          idempotencyKey: `homework_${homeworkId}`,
          priority: "high",
          senderUid: user.uid,
          senderName: user.name || "Teacher",
          senderRole: user.role,
          createdAt: serverTimestamp(),
        });
      } catch (notifErr) {
        console.warn("Notification dispatch notice:", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: homeworkId,
      message: "Homework assigned successfully! Students can now view it.",
    });
  } catch (error: any) {
    console.error("Homework API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign homework." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const teacherId = searchParams.get("teacherId");
    const classId = searchParams.get("classId");

    if (!schoolId) {
      return NextResponse.json({ error: "schoolId parameter is required" }, { status: 400 });
    }

    if (user.role !== "super_admin" && user.schoolId !== schoolId) {
      return NextResponse.json({ error: "Access denied: cross-school request" }, { status: 403 });
    }

    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();
    const items: any[] = [];

    if (adminDb) {
      let q: any = adminDb.collection("schools").doc(schoolId).collection("homework");
      if (teacherId) q = q.where("teacherId", "==", teacherId);
      if (classId) q = q.where("classId", "==", classId);

      const snap = await q.orderBy("createdAt", "desc").get();
      snap.forEach((d: any) => items.push({ id: d.id, ...d.data() }));
    } else if (clientDb) {
      const constraints: any[] = [];
      if (teacherId) constraints.push(where("teacherId", "==", teacherId));
      if (classId) constraints.push(where("classId", "==", classId));
      constraints.push(orderBy("createdAt", "desc"));

      const q = query(collection(clientDb, "schools", schoolId, "homework"), ...constraints);
      const snap = await getDocs(q);
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    }

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error("GET Homework API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load homework." }, { status: 500 });
  }
}
