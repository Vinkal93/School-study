import { NextRequest, NextResponse } from "next/server";
import {
  getSchoolCommunicationAccess,
  getSchoolCommunicationLogs,
  DEFAULT_COMMUNICATION_TEMPLATES,
} from "@/lib/services/communication.service";
import { getSchoolAutomationRules } from "@/lib/services/communication-automation.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      return NextResponse.json({ success: false, error: "School ID is required" }, { status: 400 });
    }

    const [access, logs, rules] = await Promise.all([
      getSchoolCommunicationAccess(schoolId),
      getSchoolCommunicationLogs(schoolId, undefined, undefined, 20),
      getSchoolAutomationRules(schoolId),
    ]);

    // Calculate usage from recent logs
    let waSent = 0;
    let emailSent = 0;
    let inAppSent = 0;
    let failed = 0;

    logs.forEach((l) => {
      if (l.status === "failed") {
        failed++;
      } else {
        if (l.channel === "whatsapp") waSent++;
        else if (l.channel === "email") emailSent++;
        else if (l.channel === "in_app") inAppSent++;
      }
    });

    access.monthlyUsage = {
      ...access.monthlyUsage,
      whatsappSent: waSent,
      emailSent,
      inAppSent,
      failed,
      totalSent: waSent + emailSent + inAppSent,
    };

    return NextResponse.json({
      success: true,
      access,
      templates: DEFAULT_COMMUNICATION_TEMPLATES,
      rules,
      recentLogs: logs,
    });
  } catch (err: any) {
    console.error("[API:communication:status] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch communication status" },
      { status: 500 }
    );
  }
}
