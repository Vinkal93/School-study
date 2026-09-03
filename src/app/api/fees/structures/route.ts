import { NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { canAccessFeature } from "@/lib/billing/featureAccess";
import {
  getFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
} from "@/lib/services/fee.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const academicYearId = searchParams.get("academicYearId") || undefined;

    if (!schoolId) {
      return NextResponse.json({ error: "School ID required" }, { status: 400 });
    }

    const access = await canAccessFeature(schoolId, "fee_management");
    if (!access.allowed) {
      return NextResponse.json({ error: "Fee management feature locked" }, { status: 403 });
    }

    const structures = await getFeeStructures(schoolId, academicYearId);
    return NextResponse.json({ success: true, structures });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch fee structures" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, academicYearId, className, sectionName, feeType, title, amountRupees, frequency } = body;

    if (!schoolId || !title || !className || !amountRupees) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const access = await canAccessFeature(schoolId, "fee_management");
    if (!access.allowed) {
      return NextResponse.json({ error: "Fee management feature locked" }, { status: 403 });
    }

    const structure = await createFeeStructure(schoolId, {
      academicYearId: academicYearId || "ay_current",
      className,
      sectionName,
      feeType: feeType || "tuition",
      title,
      amountRupees,
      frequency: frequency || "monthly",
    });

    return NextResponse.json({ success: true, structure });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create fee structure" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const structureId = searchParams.get("id");

    if (!schoolId || !structureId) {
      return NextResponse.json({ error: "School ID and Structure ID required" }, { status: 400 });
    }

    const access = await canAccessFeature(schoolId, "fee_management");
    if (!access.allowed) {
      return NextResponse.json({ error: "Fee management feature locked" }, { status: 403 });
    }

    const result = await deleteFeeStructure(schoolId, structureId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete fee structure" }, { status: 400 });
  }
}
