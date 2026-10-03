import { doc, runTransaction, serverTimestamp, arrayUnion } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { requireFeatureAccess } from "@/lib/billing";
import type { SchoolClass, StudentProfile } from "@/types";

export function previewSchoolPromotion(students: StudentProfile[], classes: SchoolClass[], mapping: Record<string, string>, sourceYear: string, targetYear: string) {
  if (!sourceYear || !targetYear || sourceYear === targetYear) throw new Error("Select different source and target academic sessions.");
  const byId = new Map(classes.map(c => [c.id, c]));
  const occupied = new Set(students.filter(s => s.academicYearId === targetYear).map(s => `${s.classId}:${s.sectionId || ""}:${s.rollNumber}`));
  return students.filter(s => s.academicYearId === sourceYear && String(s.status || "active").toLowerCase() === "active").map(s => {
    const target = byId.get(mapping[s.classId]);
    if (!target || target.id === s.classId || target.status !== "active") throw new Error(`Choose a destination for ${s.className || s.classId}.`);
    if (target.academicYearId && target.academicYearId !== targetYear) throw new Error(`Choose a destination in the target session for ${target.name}.`);
    const sourceSection = byId.get(s.classId)?.sections?.find(sec => sec.id === s.sectionId);
    const section = target.sections?.find(sec => sec.name.trim().toLowerCase() === (sourceSection?.name || s.sectionName || "").trim().toLowerCase());
    if (s.sectionId && !section) throw new Error(`Create the matching section for ${target.name} before promotion.`);
    const rollKey = `${target.id}:${section?.id || ""}:${s.rollNumber}`;
    if (s.rollNumber !== undefined && s.rollNumber !== null && occupied.has(rollKey)) throw new Error(`Roll number ${s.rollNumber} conflicts in ${target.name}.`);
    if (s.rollNumber !== undefined && s.rollNumber !== null) occupied.add(rollKey);
    return { student: s, target, section };
  });
}

export async function promoteWholeSchool(schoolId: string, rows: ReturnType<typeof previewSchoolPromotion>, sourceYear: string, targetYear: string, actorId: string) {
  await requireFeatureAccess(schoolId, "student_promote");
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");
  const yearSnap = doc(db, "schools", schoolId, "academicYears", targetYear);
  let promoted = 0, skipped = 0;
  const errors: string[] = [];
  // Each student is atomic. Interrupted batches are safely resumable using the same target session.
  for (const row of rows) {
    try {
      const changed = await runTransaction(db, async tx => {
        const ref = doc(db, "schools", schoolId, "students", row.student.id);
        const marker = doc(db, "schools", schoolId, "promotionRuns", `${encodeURIComponent(targetYear)}_${encodeURIComponent(row.student.id)}`);
        const [year, current, done] = await Promise.all([tx.get(yearSnap), tx.get(ref), tx.get(marker)]);
        if (!year.exists()) throw new Error("Target session no longer exists.");
        if (done.exists()) return false;
        if (!current.exists()) throw new Error("Student no longer exists.");
        const data = current.data();
        if (data.rollNumber !== row.student.rollNumber) throw new Error("Roll number changed after preview. Refresh and review.");
        if (data.academicYearId !== sourceYear || data.classId !== row.student.classId || String(data.status || "active").toLowerCase() !== "active") throw new Error("Student changed after preview. Refresh and review.");
        const event = { id: marker.id, fromClassId: data.classId, toClassId: row.target.id, fromAcademicYearId: sourceYear, toAcademicYearId: targetYear, rollNumber: data.rollNumber ?? null, promotedBy: actorId, timestamp: new Date().toISOString() };
        tx.update(ref, { classId: row.target.id, className: row.target.name, sectionId: row.section?.id || "", sectionName: row.section?.name || "", academicYearId: targetYear, promotionHistory: arrayUnion(event), updatedAt: serverTimestamp() });
        tx.set(marker, { ...event, studentId: row.student.id, schoolId });
        return true;
      });
      if (changed) promoted++; else skipped++;
    } catch (err) { errors.push(`${row.student.name}: ${err instanceof Error ? err.message : "Promotion failed"}`); }
  }
  return { promoted, skipped, errors };
}
