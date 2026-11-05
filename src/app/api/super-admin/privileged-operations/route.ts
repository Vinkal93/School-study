import { NextRequest, NextResponse } from "next/server";
import {
  createSchoolAdmin,
  disableUser,
  enableUser,
  changeRole,
  updateSchoolStats,
  updatePlatformStats,
} from "@/lib/services/privileged-admin.service";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireSuperAdmin(req);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const performer = authResult.user!;
    const performerUid = performer.uid;

    const rateCheck = enforceRateLimit(req, RATE_LIMIT_PROFILES.STANDARD_API, performerUid);
    if (!rateCheck.allowed && rateCheck.response) {
      return rateCheck.response;
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "createSchoolAdmin": {
        const { input } = body;
        if (!input || !input.uid || !input.email || !input.name || !input.schoolId) {
          return NextResponse.json(
            { error: "Missing required input fields for createSchoolAdmin" },
            { status: 400 }
          );
        }
        const result = await createSchoolAdmin(performerUid, input);
        return NextResponse.json(result);
      }

      case "disableUser": {
        const { targetUid, reason } = body;
        if (!targetUid) {
          return NextResponse.json({ error: "Missing targetUid" }, { status: 400 });
        }
        const result = await disableUser(performerUid, targetUid, reason);
        return NextResponse.json(result);
      }

      case "enableUser": {
        const { targetUid, reason } = body;
        if (!targetUid) {
          return NextResponse.json({ error: "Missing targetUid" }, { status: 400 });
        }
        const result = await enableUser(performerUid, targetUid, reason);
        return NextResponse.json(result);
      }

      case "changeRole": {
        const { targetUid, newRole, reason } = body;
        if (!targetUid || !newRole) {
          return NextResponse.json(
            { error: "Missing targetUid or newRole" },
            { status: 400 }
          );
        }
        const result = await changeRole(performerUid, targetUid, newRole, reason);
        return NextResponse.json(result);
      }

      case "updateSchoolStats": {
        const { schoolId } = body;
        if (!schoolId) {
          return NextResponse.json(
            { error: "Missing schoolId" },
            { status: 400 }
          );
        }
        const result = await updateSchoolStats(schoolId);
        return NextResponse.json(result);
      }

      case "updatePlatformStats": {
        const result = await updatePlatformStats();
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Privileged admin operation failed:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
