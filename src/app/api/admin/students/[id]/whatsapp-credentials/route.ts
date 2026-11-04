import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/utils/constants";
import { logAuditEvent } from "@/lib/services/audit.service";
import { getSchoolCommunicationAccess, dispatchCommunicationMessage } from "@/lib/services/communication.service";
import type { AuditAction, AuditTargetType } from "@/types/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const studentId = params.id;

    // Server-side authentication and tenant isolation check
    const authResult = await requireSchoolAdmin(req);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const authUser = authResult.user!;
    const schoolId = authUser.schoolId || "";
    const body = await req.json().catch(() => ({}));

    const adminDb = getSafeAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "Database service unavailable." },
        { status: 503 }
      );
    }

    // 1. Fetch Student
    let studentData: any = null;
    const subSnap = await adminDb
      .collection(COLLECTIONS.SCHOOLS)
      .doc(schoolId)
      .collection("students")
      .doc(studentId)
      .get();

    if (subSnap.exists) {
      studentData = subSnap.data();
    } else {
      const rootSnap = await adminDb.collection("students").doc(studentId).get();
      if (rootSnap.exists && rootSnap.data()?.schoolId === schoolId) {
        studentData = rootSnap.data();
      }
    }

    if (!studentData) {
      return NextResponse.json(
        { success: false, error: "Student not found in your institution." },
        { status: 404 }
      );
    }

    // 2. Fetch School Name
    const schoolDoc = await adminDb.collection(COLLECTIONS.SCHOOLS).doc(schoolId).get();
    const schoolName = schoolDoc.exists ? schoolDoc.data()?.name || "School" : "School";

    // 3. Resolve Recipient Phone
    const customPhone = body.recipientPhone ? String(body.recipientPhone).trim() : "";
    const guardianPhone = customPhone || String(studentData.guardianPhone || studentData.phone || "").trim();
    const cleanPhone = guardianPhone.replace(/[^0-9]/g, "");

    if (!cleanPhone || cleanPhone.length < 8) {
      return NextResponse.json(
        { success: false, error: "No valid guardian phone number found for this student. Please enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    // Standardize to country code if 10-digit Indian number
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://school.sbci.online";
    const portalUrl = `${siteUrl}/student/login`;
    const username = studentData.studentId || studentData.admissionNumber || studentData.email || "Student";
    const resetLink = body.resetLink ? String(body.resetLink).trim() : "";

    // 4. Construct Professional Message (No plaintext passwords ever transmitted)
    let messageText = "";
    if (resetLink) {
      messageText = `Dear Parent / Guardian,
Greetings from ${schoolName}!

Here is the secure one-time password setup link for ${studentData.name}:
🌐 Set Password Link: ${resetLink}
👤 Student Login ID: ${username}
🔗 Student Portal: ${portalUrl}

Please set your password using the link above to view academic records, attendance, and fee invoices.
Regards,
${schoolName} Administration`;
    } else {
      messageText = `Dear Parent / Guardian,
Greetings from ${schoolName}!

Here are the official login credentials for ${studentData.name} to access the Student & Guardian Portal:
👤 Portal Login ID: ${username}
📧 Registered Email: ${studentData.email || "Registered with school"}
🔗 Portal Link: ${portalUrl}

If you need a new password, please request a password reset link from the school office or portal.
Regards,
${schoolName} Administration`;
    }

    // 5. Check automated communication access
    let canSendApi = false;
    try {
      const commAccess = await getSchoolCommunicationAccess(schoolId, authUser);
      canSendApi = Boolean(commAccess.isGloballyEnabled && commAccess.canSendWhatsApp);
    } catch {
      canSendApi = false;
    }

    // 6. If API delivery is configured and allowed
    if (canSendApi) {
      try {
        const dispatchResult = await dispatchCommunicationMessage(
          {
            schoolId,
            studentId,
            studentName: studentData.name,
            recipientPhone: formattedPhone,
            parentName: studentData.guardianName || studentData.name,
            channel: "whatsapp",
            title: `Student Portal Credentials — ${studentData.name}`,
            content: messageText,
            triggerType: "manual",
            sendMode: "api",
          },
          {
            uid: authUser.uid,
            name: authUser.name || "School Admin",
            role: authUser.role || "school_admin",
          }
        );

        if (dispatchResult.success) {
          await logAuditEvent({
            actorId: authUser.uid,
            actorName: authUser.name || "School Admin",
            actorEmail: authUser.email,
            actorRole: authUser.role as any,
            actorSchoolId: schoolId,
            targetUserId: studentData.userId || null,
            targetUserName: studentData.name,
            targetSchoolId: schoolId,
            action: "STUDENT_WHATSAPP_CREDENTIALS_SHARED" as AuditAction,
            entityType: "student" as AuditTargetType,
            entityId: studentId,
            reason: "Dispatched student portal credentials via official WhatsApp API gateway.",
            metadata: {
              phone: `+${formattedPhone.slice(0, 4)}***${formattedPhone.slice(-2)}`,
              channel: "whatsapp_api",
            },
          }).catch(() => {});

          return NextResponse.json({
            success: true,
            mode: "api",
            message: `Official WhatsApp credentials message dispatched successfully to guardian (+${formattedPhone}).`,
            recipientPhone: formattedPhone,
          });
        }
      } catch (dispatchErr) {
        console.warn("Automated WhatsApp API dispatch failed, falling back to manual wa.me link:", dispatchErr);
      }
    }

    // 7. Manual (wa.me) Delivery Option
    const encodedMessage = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    await logAuditEvent({
      actorId: authUser.uid,
      actorName: authUser.name || "School Admin",
      actorEmail: authUser.email,
      actorRole: authUser.role as any,
      actorSchoolId: schoolId,
      targetUserId: studentData.userId || null,
      targetUserName: studentData.name,
      targetSchoolId: schoolId,
      action: "STUDENT_WHATSAPP_CREDENTIALS_SHARED" as AuditAction,
      entityType: "student" as AuditTargetType,
      entityId: studentId,
      reason: "Generated WhatsApp click-to-chat credentials message for manual dispatch.",
      metadata: {
        phone: `+${formattedPhone.slice(0, 4)}***${formattedPhone.slice(-2)}`,
        channel: "whatsapp_manual",
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      mode: "manual",
      message: "Ready to send via WhatsApp Web / App.",
      whatsappUrl,
      recipientPhone: formattedPhone,
      messageText,
    });
  } catch (error: any) {
    console.error("[API: WhatsApp Credentials POST]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to prepare WhatsApp credentials." },
      { status: 500 }
    );
  }
}
