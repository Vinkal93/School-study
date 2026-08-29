import { NextResponse } from "next/server";
import { getDisputesList } from "@/lib/payments/disputes";

export async function GET() {
  try {
    const disputes = await getDisputesList();
    return NextResponse.json({ disputes });
  } catch (error: any) {
    console.error("Super Admin Disputes GET Error:", error);
    return NextResponse.json(
      { error: "Failed to load disputes: " + (error.message || "") },
      { status: 500 }
    );
  }
}
