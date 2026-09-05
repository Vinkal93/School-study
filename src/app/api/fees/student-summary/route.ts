import { NextResponse } from "next/server";
import { getStudentFeeSummary } from "@/lib/services/fee.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const studentId = searchParams.get("studentId");
    const studentName = searchParams.get("studentName") || "Student";
    const admissionNumber = searchParams.get("admissionNumber") || studentId || "";
    const className = searchParams.get("className") || "";
    const sectionName = searchParams.get("sectionName") || "A";

    if (!schoolId || !studentId) {
      return NextResponse.json({ error: "Missing schoolId or studentId" }, { status: 400 });
    }

    const summary = await getStudentFeeSummary(schoolId, {
      id: studentId,
      name: studentName,
      admissionNumber,
      className,
      sectionName,
    });

    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    console.error("GET /api/fees/student-summary error:", err);
    return NextResponse.json({ error: err.message || "Failed to load student fee summary" }, { status: 500 });
  }
}
