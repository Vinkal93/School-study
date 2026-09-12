import { NextResponse } from "next/server";
import { getIdentityPrefixes, updateIdentityPrefixes } from "@/lib/services/identity.service";

export async function GET() {
  try {
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
    const body = await request.json().catch(() => ({}));
    const { prefixes, actorId } = body;

    if (!prefixes || typeof prefixes !== "object") {
      return NextResponse.json(
        { success: false, error: "Prefixes object is required." },
        { status: 400 }
      );
    }

    const updated = await updateIdentityPrefixes(prefixes, actorId || "super_admin");
    return NextResponse.json({ success: true, prefixes: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update prefixes." },
      { status: 500 }
    );
  }
}
