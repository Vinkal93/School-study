import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { updateHelpVideo, deleteHelpVideo } from "@/lib/services/help-video.service";
import type { UpdateHelpVideoInput } from "@/types/help-video";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/help-videos/[id]
 * Strictly Super Admin only: update an existing help video.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const superAdminResult = await requireSuperAdmin(req);
    if (superAdminResult instanceof NextResponse) {
      return superAdminResult;
    }

    const { id } = await params;
    const body: UpdateHelpVideoInput = await req.json();

    await updateHelpVideo(id, body);

    return NextResponse.json({
      success: true,
      message: "Help video updated successfully",
    });
  } catch (error: any) {
    console.error("[API/help-videos/[id] PATCH] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/help-videos/[id]
 * Strictly Super Admin only: delete a help video.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const superAdminResult = await requireSuperAdmin(req);
    if (superAdminResult instanceof NextResponse) {
      return superAdminResult;
    }

    const { id } = await params;
    await deleteHelpVideo(id);

    return NextResponse.json({
      success: true,
      message: "Help video deleted successfully",
    });
  } catch (error: any) {
    console.error("[API/help-videos/[id] DELETE] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
