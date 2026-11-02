import { NextResponse } from "next/server";
import { getIncidentById, updateIncident, IncidentStatus } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/super-admin/errors/[id]
 * Retrieves full details for a single error incident by fingerprint ID.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const incident = await getIncidentById(id);

    if (!incident) {
      return NextResponse.json(
        { success: false, error: "Incident not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      incident,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load incident details.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/errors/[id]
 * Updates incident status, notes, or assigned administrator.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const status = body.status as IncidentStatus | undefined;
    const assignedTo = body.assignedTo as string | undefined;
    const resolutionSummary = body.resolutionSummary as string | undefined;
    const resolvedBy = body.resolvedBy as string | undefined;
    const noteText = body.noteText as string | undefined;
    const noteAuthor = body.noteAuthor as string | undefined;

    const updated = await updateIncident(id, {
      status,
      assignedTo,
      resolutionSummary,
      resolvedBy,
      noteText,
      noteAuthor,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Failed to update incident. Incident may not exist." },
        { status: 404 }
      );
    }

    const refreshed = await getIncidentById(id);

    return NextResponse.json({
      success: true,
      incident: refreshed,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update incident.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
