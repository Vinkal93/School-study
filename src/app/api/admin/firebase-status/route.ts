import { NextResponse } from "next/server";
import { getFirebaseAdminDiagnostics } from "@/lib/firebase/admin";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;

    const rateCheck = enforceRateLimit(request, RATE_LIMIT_PROFILES.STANDARD_API, auth.user!.uid);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    const diagnostics = await getFirebaseAdminDiagnostics(true);

    return NextResponse.json({
      status: "ok",
      adminConfigured: diagnostics.configured,
      detectedSource: diagnostics.detectedSource,
      projectId: diagnostics.projectId.authoritative,
      clientEmail: diagnostics.clientEmailMasked,
      hasPrivateKey: diagnostics.formatValidation.privateKeyFormat === "valid_pem",
      connectivity: diagnostics.connectivity,
      ...(diagnostics.connectivityMessage ? { connectivityDetails: diagnostics.connectivityMessage } : {}),
      isEmulator: diagnostics.isEmulator,
      environmentScope: diagnostics.environmentScope,
      projectIdConsistency: diagnostics.projectId,
      variablesPresent: diagnostics.variables,
      formatValidation: diagnostics.formatValidation,
      instructions: diagnostics.instructions,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        adminConfigured: false,
        error: error?.message || "Unknown error checking Firebase Admin status",
      },
      { status: 500 }
    );
  }
}
