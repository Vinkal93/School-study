import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import {
  getSecurityIncidents,
  createSecurityIncident,
  updateSecurityIncident,
} from "@/lib/services/security-center.service";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireSuperAdmin(req);
    if (errorResponse) return errorResponse;

    const incidents = await getSecurityIncidents();
    return NextResponse.json({
      success: true,
      data: incidents,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireSuperAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    if (!body.title || !body.severity || !body.affectedSystem) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, severity, affectedSystem" },
        { status: 400 }
      );
    }

    const incident = await createSecurityIncident(
      {
        title: body.title,
        severity: body.severity,
        status: body.status || "OPEN",
        affectedSystem: body.affectedSystem,
        affectedSchools: body.affectedSchools || ["all"],
        timeline: [
          {
            timestamp: new Date().toISOString(),
            event: body.initialEvent || `Incident declared: ${body.title}`,
            actor: user?.name || user?.email || "Super Admin",
          },
          ...(body.timeline || []),
        ],
        linkedFindingIds: body.linkedFindingIds || [],
        actions: body.actions || [],
        owner: body.owner || user?.email || "Super Admin",
      },
      user?.uid || "super_admin"
    );

    return NextResponse.json({
      success: true,
      data: incident,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create incident" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireSuperAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

    const updated = await updateSecurityIncident(
      id,
      updates,
      user?.uid || "super_admin"
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update incident" },
      { status: 500 }
    );
  }
}
