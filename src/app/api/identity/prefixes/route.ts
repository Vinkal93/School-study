import { NextResponse } from "next/server";
import { getIdentityPrefixes, updateIdentityPrefixes } from "@/lib/services/identity.service";
import { requireAuth, requireSuperAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;

    const prefixes = await getIdentityPrefixes();
    return NextResponse.json({ success: true, prefixes });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load prefixes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;
    const actorId = auth.user!.uid;

    const rateCheck = enforceRateLimit(request, RATE_LIMIT_PROFILES.STANDARD_API, actorId);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    const body = await request.json().catch(() => ({}));
    const { prefixes } = body;

    if (!prefixes || typeof prefixes !== "object") {
      return NextResponse.json(
        { success: false, error: "Prefixes object is required." },
        { status: 400 }
      );
    }

    const updated = await updateIdentityPrefixes(prefixes, actorId);
    return NextResponse.json({ success: true, prefixes: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update prefixes." },
      { status: 500 }
    );
  }
}
