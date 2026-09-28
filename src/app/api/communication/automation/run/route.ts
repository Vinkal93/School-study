import { NextRequest, NextResponse } from "next/server";
import { runSchoolFeeReminderAutomation, saveSchoolAutomationRule, getSchoolAutomationRules } from "@/lib/services/communication-automation.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, triggeredBy, action, rule } = body;

    if (!schoolId) {
      return NextResponse.json({ success: false, error: "School ID is required" }, { status: 400 });
    }

    if (action === "save_rule" && rule) {
      await saveSchoolAutomationRule(schoolId, rule);
      const updatedRules = await getSchoolAutomationRules(schoolId);
      return NextResponse.json({ success: true, message: "Automation rule updated", rules: updatedRules });
    }

    const sender = triggeredBy || {
      uid: "system_automation",
      name: "Fee Automation Engine",
      role: "system",
    };

    const report = await runSchoolFeeReminderAutomation(schoolId, sender);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: any) {
    console.error("[API:communication:automation:run] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute fee automation" },
      { status: 500 }
    );
  }
}
