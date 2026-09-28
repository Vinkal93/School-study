import { NextRequest, NextResponse } from "next/server";
import { dispatchCommunicationMessage, resolveTemplateVariables, getSchoolCommunicationAccess } from "@/lib/services/communication.service";
import type { SendMessagePayload, BatchSendMessagePayload } from "@/types/communication";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { isBatch, schoolId, triggeredBy } = body;

    if (!schoolId) {
      return NextResponse.json({ success: false, error: "School ID is required" }, { status: 400 });
    }

    const sender = triggeredBy || {
      uid: "system_admin",
      name: "School Administration",
      role: "school_admin",
    };

    // Check school access
    const access = await getSchoolCommunicationAccess(schoolId);
    if (!access.isGloballyEnabled) {
      return NextResponse.json({
        success: false,
        error: "Communication is currently disabled globally by Super Admin.",
      }, { status: 403 });
    }

    if (isBatch) {
      const batchPayload: BatchSendMessagePayload = body;
      const { recipients, channel, contentTemplate, titleTemplate, triggerType } = batchPayload;

      if (!recipients || recipients.length === 0) {
        return NextResponse.json({ success: false, error: "No recipients provided" }, { status: 400 });
      }

      // Verify channel access
      if (channel === "whatsapp" && !access.canSendWhatsApp) {
        return NextResponse.json({ success: false, error: access.lockReason || "WhatsApp channel is locked for your school's plan." }, { status: 403 });
      }
      if (channel === "email" && !access.canSendEmail) {
        return NextResponse.json({ success: false, error: access.lockReason || "Email channel is locked for your school's plan." }, { status: 403 });
      }

      const results = [];
      for (const rec of recipients) {
        const templateData = {
          student_name: rec.studentName,
          parent_name: rec.parentName || "Parent",
          class_name: rec.className || "Class",
          admission_no: rec.admissionNumber || "N/A",
          amount: rec.amount || "0",
          due_date: rec.dueDate || "N/A",
          receipt_no: rec.receiptNo || "N/A",
          school_name: access.schoolName || "School",
          ...(rec.customVariables || {}),
        };

        const resolvedBody = resolveTemplateVariables(contentTemplate, templateData);
        const resolvedTitle = titleTemplate ? resolveTemplateVariables(titleTemplate, templateData) : undefined;

        const res = await dispatchCommunicationMessage(
          {
            schoolId,
            studentId: rec.studentId,
            studentName: rec.studentName,
            admissionNumber: rec.admissionNumber,
            className: rec.className,
            parentName: rec.parentName,
            recipientPhone: rec.recipientPhone,
            recipientEmail: rec.recipientEmail,
            userId: rec.userId,
            channel,
            title: resolvedTitle,
            content: resolvedBody,
            triggerType: triggerType || "manual",
          },
          sender
        );
        results.push(res);
      }

      const successfulCount = results.filter((r) => r.success).length;
      return NextResponse.json({
        success: true,
        total: recipients.length,
        sent: successfulCount,
        failed: recipients.length - successfulCount,
        results,
      });
    }

    // Single message dispatch
    const singlePayload: SendMessagePayload = body;
    const res = await dispatchCommunicationMessage(singlePayload, sender);

    return NextResponse.json(res);
  } catch (err: any) {
    console.error("[API:communication:send] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to dispatch message" },
      { status: 500 }
    );
  }
}
