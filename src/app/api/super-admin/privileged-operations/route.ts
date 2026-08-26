import { NextRequest, NextResponse } from "next/server";
import {
  createSchoolAdmin,
  disableUser,
  enableUser,
  changeRole,
  updateSchoolStats,
  updatePlatformStats,
  verifySuperAdmin,
} from "@/lib/services/privileged-admin.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, performerUid } = body;

    if (!performerUid) {
      return NextResponse.json(
        { error: "Missing performerUid parameter" },
        { status: 401 }
      );
    }

    // Explicit server-side Super Admin check
    await verifySuperAdmin(performerUid);

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
          return NextResponse.json({ error: "Missing targetUid or newRole" }, { status: 400 });
        }
        const result = await changeRole(performerUid, targetUid, newRole, reason);
        return NextResponse.json(result);
      }

      case "updateSchoolStats": {
        const { schoolId } = body;
        if (!schoolId) {
          return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });
        }
        const result = await updateSchoolStats(schoolId);
        return NextResponse.json({ success: true, stats: result });
      }

      case "updatePlatformStats": {
        const result = await updatePlatformStats();
        return NextResponse.json({ success: true, stats: result });
      }

      default:
        return NextResponse.json(
          { error: `Unknown privileged action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Privileged operation error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error executing privileged operation" },
      { status: 500 }
    );
  }
}
