import { NextResponse } from "next/server";
import { getPublicSiteSettings } from "@/lib/cms/siteSettings";

export async function GET() {
  try {
    const settings = await getPublicSiteSettings();
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Public Site Settings GET Error:", error);
    return NextResponse.json(
      { error: "Failed to load public site settings: " + (error.message || "") },
      { status: 500 }
    );
  }
}
