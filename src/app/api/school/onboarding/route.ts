import { NextResponse } from "next/server";
import {
  getSchoolOnboardingState,
  saveSchoolInfoStep,
  saveAcademicYearStep,
  saveClassSectionStep,
  completeSchoolOnboarding,
  updateOnboardingStep,
} from "@/lib/services/setup.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      return NextResponse.json({ success: false, error: "schoolId parameter is required." }, { status: 400 });
    }

    const state = await getSchoolOnboardingState(schoolId);
    return NextResponse.json({ success: true, state });
  } catch (error: any) {
    console.error("GET /api/school/onboarding error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load onboarding state." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { schoolId, action, step, data } = body;

    if (!schoolId) {
      return NextResponse.json({ success: false, error: "schoolId is required." }, { status: 400 });
    }

    // Step 1: School Information
    if (step === 1 || action === "saveSchoolInfo") {
      await saveSchoolInfoStep(schoolId, data);
      return NextResponse.json({ success: true, message: "School information saved." });
    }

    // Step 2: Academic Year
    if (step === 2 || action === "saveAcademicYear") {
      const yearId = await saveAcademicYearStep(schoolId, data);
      return NextResponse.json({ success: true, yearId, message: "Academic year saved." });
    }

    // Step 3: Classes & Sections
    if (step === 3 || action === "saveClasses") {
      await saveClassSectionStep(schoolId, data.classes || []);
      return NextResponse.json({ success: true, message: "Classes and sections saved." });
    }

    // Step Navigation / Update Step without data
    if (action === "updateStep") {
      await updateOnboardingStep(schoolId, data.step);
      return NextResponse.json({ success: true });
    }

    // Complete Onboarding
    if (action === "complete" || step === "complete") {
      await completeSchoolOnboarding(schoolId);
      return NextResponse.json({ success: true, message: "School onboarding completed successfully." });
    }

    return NextResponse.json({ success: false, error: `Unrecognized action: ${action || step}` }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/school/onboarding error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process onboarding request." },
      { status: 500 }
    );
  }
}
