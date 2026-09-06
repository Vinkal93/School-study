import { NextResponse } from "next/server";
import { getAllFeatureRegistry, getFeatureRegistryByCategory } from "@/lib/features/featureRegistry";

/**
 * GET /api/super-admin/features/registry
 * Returns standard system feature registry items and category groupings.
 */
export async function GET() {
  try {
    const features = getAllFeatureRegistry();
    const categories = getFeatureRegistryByCategory();

    return NextResponse.json({
      success: true,
      features,
      categories,
      total: features.length,
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/features/registry error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch feature registry." },
      { status: 500 }
    );
  }
}
