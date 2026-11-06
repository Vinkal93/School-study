import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";
import {
  getArchitectureOverview,
  ARCHITECTURE_NODES,
  ARCHITECTURE_EDGES,
  INTEGRATION_REGISTRY,
  getFeatureCapabilities,
  DATABASE_ENTITIES,
  DATA_FLOW_MODELS,
  SECURITY_CONTROL_ITEMS,
  getAuthoritativeBusinessMetrics,
  CAPACITY_PRESETS,
  calculateCapacityProjection,
  hasArchitecturePermission,
} from "@/lib/services/architecture-intelligence.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Enforce Zero-Trust Super Admin Authentication
    const authResult = await requireSuperAdmin(req);
    if (authResult.errorResponse) return authResult.errorResponse;
    const user = authResult.user!;

    // 2. Granular Server-Side Permission Check
    if (!hasArchitecturePermission(user.role, "architecture_intelligence.view")) {
      return NextResponse.json(
        { success: false, error: "Access Denied: Missing architecture_intelligence.view permission." },
        { status: 403 }
      );
    }

    // 3. Rate Limiting Protection
    const rateCheck = enforceRateLimit(req, RATE_LIMIT_PROFILES.STANDARD_API, user.uid);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    // 4. Fetch Authoritative Architecture & Business Data in Parallel
    const [overview, businessMetrics] = await Promise.all([
      getArchitectureOverview(),
      getAuthoritativeBusinessMetrics(),
    ]);

    const featureCapabilities = getFeatureCapabilities();
    const defaultCapacityProjection = calculateCapacityProjection(CAPACITY_PRESETS[1]); // 1,000 schools preset

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        overview,
        nodes: ARCHITECTURE_NODES,
        edges: ARCHITECTURE_EDGES,
        integrations: INTEGRATION_REGISTRY,
        features: featureCapabilities,
        databaseEntities: DATABASE_ENTITIES,
        dataFlows: DATA_FLOW_MODELS,
        securityControls: SECURITY_CONTROL_ITEMS,
        businessMetrics,
        capacityPresets: CAPACITY_PRESETS,
        defaultCapacityProjection,
      },
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/architecture-intelligence error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load architecture intelligence data." },
      { status: 500 }
    );
  }
}
