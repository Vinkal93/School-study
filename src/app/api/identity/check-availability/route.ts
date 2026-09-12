import { NextResponse } from "next/server";
import { checkIdentityAvailable, normalizeIdentity, validateIdentityFormat } from "@/lib/services/identity.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get("id") || "";
    const isSchool = searchParams.get("isSchool") === "true";
    const expectedPrefix = searchParams.get("prefix") || undefined;

    if (!rawId.trim()) {
      return NextResponse.json(
        { available: false, message: "ID parameter is required." },
        { status: 400 }
      );
    }

    const normalized = normalizeIdentity(rawId);
    const format = validateIdentityFormat(normalized, undefined, expectedPrefix);
    if (!format.valid) {
      return NextResponse.json({
        id: normalized,
        available: false,
        message: format.message,
      });
    }

    const result = await checkIdentityAvailable(normalized, isSchool);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { available: false, message: err?.message || "Failed to check availability." },
      { status: 500 }
    );
  }
}
