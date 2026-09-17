import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("🔥 [CLIENT_TRACE]", JSON.stringify(body));
  } catch (e) {
    console.log("🔥 [CLIENT_TRACE_ERR]", e);
  }
  return NextResponse.json({ ok: true });
}
