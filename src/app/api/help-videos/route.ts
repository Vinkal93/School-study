import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireSuperAdmin } from "@/lib/auth/serverAuth";
import { getHelpVideos, createHelpVideo } from "@/lib/services/help-video.service";
import type { CreateHelpVideoInput } from "@/types/help-video";

export const dynamic = "force-dynamic";

/**
 * GET /api/help-videos
 * Authenticated users can list videos matching their role.
 * Non-super-admins strictly CANNOT see super_admin videos or draft videos.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult.user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isSuperAdmin = user.role === "super_admin";

    const videos = await getHelpVideos(user.role, isSuperAdmin);

    return NextResponse.json({
      success: true,
      videos,
      isSuperAdmin,
    });
  } catch (error: any) {
    console.error("[API/help-videos GET] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/help-videos
 * Strictly Super Admin only: publish a new help/tutorial video.
 */
export async function POST(req: NextRequest) {
  try {
    const superAdminResult = await requireSuperAdmin(req);
    if (superAdminResult instanceof NextResponse) {
      return superAdminResult;
    }

    const user = superAdminResult.user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: CreateHelpVideoInput = await req.json();

    if (!body.title?.trim() || !body.videoUrl?.trim()) {
      return NextResponse.json(
        { error: "Title and Video URL are required" },
        { status: 400 }
      );
    }

    const videoId = await createHelpVideo(
      {
        title: body.title.trim(),
        description: body.description?.trim() || "",
        videoUrl: body.videoUrl.trim(),
        thumbnailUrl: body.thumbnailUrl?.trim() || "",
        category: body.category || "general",
        targetRole: body.targetRole || "all",
        duration: body.duration || "5:00",
        tags: Array.isArray(body.tags) ? body.tags : [],
        published: body.published ?? true,
        displayOrder: Number(body.displayOrder) || 50,
      },
      user.uid
    );

    return NextResponse.json(
      {
        success: true,
        message: "Help video published successfully",
        videoId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API/help-videos POST] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
