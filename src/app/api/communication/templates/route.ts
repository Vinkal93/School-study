import { NextRequest, NextResponse } from "next/server";
import {
  getSchoolTemplates,
  saveSchoolTemplate,
  archiveSchoolTemplate,
} from "@/lib/services/communication.service";
import { requireSchoolAdmin } from "@/lib/auth/serverAuth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      return NextResponse.json({ success: false, error: "School ID is required" }, { status: 400 });
    }

    const authResult = await requireSchoolAdmin(req, schoolId);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const templates = await getSchoolTemplates(schoolId);
    return NextResponse.json({ success: true, templates });
  } catch (err: any) {
    console.error("[API:communication:templates] GET error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to load templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { schoolId, template } = body;

    if (!schoolId || !template) {
      return NextResponse.json({ success: false, error: "School ID and template object are required" }, { status: 400 });
    }

    const authResult = await requireSchoolAdmin(req, schoolId);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const saved = await saveSchoolTemplate(schoolId, template);
    return NextResponse.json({ success: true, template: saved });
  } catch (err: any) {
    console.error("[API:communication:templates] POST error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to save template" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    const templateId = searchParams.get("templateId");

    if (!schoolId || !templateId) {
      return NextResponse.json({ success: false, error: "School ID and Template ID are required" }, { status: 400 });
    }

    const authResult = await requireSchoolAdmin(req, schoolId);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    await archiveSchoolTemplate(schoolId, templateId);
    return NextResponse.json({ success: true, message: "Template deleted" });
  } catch (err: any) {
    console.error("[API:communication:templates] DELETE error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to delete template" }, { status: 500 });
  }
}
