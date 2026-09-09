import { NextResponse } from "next/server";
import { authenticateRequest, requireSuperAdmin, type AuthenticatedUser } from "@/lib/auth/serverAuth";
import { APPROVED_PARTNER_PERMISSIONS, PENDING_PARTNER_PERMISSIONS } from "./constants";
import { getPartnerByUserId } from "./store";
import type { Partner, PartnerPermission, PartnerStatus } from "@/types/partner";

export function partnerHasPermission(partner: Partner | null, permission: PartnerPermission): boolean {
  if (!partner) return false;
  if (partner.status === "approved") return APPROVED_PARTNER_PERMISSIONS.includes(permission);
  return PENDING_PARTNER_PERMISSIONS.includes(permission);
}

export async function requirePartner(
  request: Request,
  options?: { approved?: boolean; permission?: PartnerPermission }
): Promise<{ user?: AuthenticatedUser; partner?: Partner; errorResponse?: NextResponse }> {
  const auth = await authenticateRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return { errorResponse: auth.errorResponse };
  }
  if (auth.user.role !== "partner") {
    return {
      errorResponse: NextResponse.json(
        { error: "Access Denied. Partner portal credentials are required." },
        { status: 403 }
      ),
    };
  }
  const partner = await getPartnerByUserId(auth.user.uid);
  if (!partner) {
    return {
      errorResponse: NextResponse.json({ error: "Partner profile not found." }, { status: 404 }),
    };
  }
  if (partner.status === "suspended") {
    return {
      errorResponse: NextResponse.json(
        { error: "Your partner account is suspended. Contact School Study support." },
        { status: 403 }
      ),
    };
  }
  if (options?.approved && partner.status !== "approved") {
    return {
      errorResponse: NextResponse.json(
        { error: "Your partner application is not approved yet.", status: partner.status },
        { status: 403 }
      ),
    };
  }
  if (options?.permission && !partnerHasPermission(partner, options.permission)) {
    return {
      errorResponse: NextResponse.json({ error: "You do not have permission for this action." }, { status: 403 }),
    };
  }
  return { user: auth.user, partner };
}

export async function requireSuperAdminOrPartnerSelf(
  request: Request,
  partnerId: string
): Promise<{ user?: AuthenticatedUser; partner?: Partner; asAdmin?: boolean; errorResponse?: NextResponse }> {
  const admin = await requireSuperAdmin(request);
  if (admin.user) {
    const { getPartner } = await import("./store");
    const partner = await getPartner(partnerId);
    if (!partner) return { errorResponse: NextResponse.json({ error: "Partner not found." }, { status: 404 }) };
    return { user: admin.user, partner, asAdmin: true };
  }
  const partnerAuth = await requirePartner(request);
  if (partnerAuth.errorResponse || !partnerAuth.partner) return partnerAuth;
  if (partnerAuth.partner.id !== partnerId) {
    return {
      errorResponse: NextResponse.json(
        { error: "Access Denied. You cannot access another partner's records." },
        { status: 403 }
      ),
    };
  }
  return { ...partnerAuth, asAdmin: false };
}

export function requestMeta(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";
  const userAgent = request.headers.get("user-agent") || "";
  return { ip, userAgent };
}

export function applicationVisibleStatus(status: PartnerStatus): PartnerStatus {
  return status;
}
