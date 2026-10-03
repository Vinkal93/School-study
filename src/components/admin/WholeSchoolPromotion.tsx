"use client";
import { useState } from "react";
import type { AcademicYear, SchoolClass, StudentProfile } from "@/types";
import { useAppQuery } from "@/lib/cache";
import { getAcademicYears } from "@/lib/services/academic.service";
import { previewSchoolPromotion, promoteWholeSchool } from "@/lib/services/school-promotion.service";
import { EntitlementGate } from "@/components/common/EntitlementGate";

export function WholeSchoolPromotion({ schoolId, actorId, students, classes, onComplete }: { schoolId: string; actorId: string; students: StudentProfile[]; classes: SchoolClass[]; onComplete: () => void }) {
  const { data: years = [] } = useAppQuery<AcademicYear[]>(schoolId ? `academicYears:${schoolId}` : null, () => getAcademicYears(schoolId), { enabled: !!schoolId });
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ReturnType<typeof previewSchoolPromotion> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failures, setFailures] = useState<string[]>([]);
  const sourceClasses = classes.filter(c => students.some(s => s.classId === c.id && s.academicYearId === source && String(s.status || "active").toLowerCase() === "active"));
  const change = () => { setPreview(null); setMessage(""); };
  return <EntitlementGate capability="student_promote" type="section"><section className="rounded-2xl border border-blue-200 bg-white p-4 sm:p-6 dark:bg-slate-900">
    <h2 className="text-xl font-bold">Promote the whole school</h2>
    <p className="mt-2 text-sm">Select academic sessions and review each class destination. Roll numbers stay the same, matching section names are preserved. Fees are generated separately after promotion.</p>
    <div className="my-4 grid gap-4 sm:grid-cols-2">
      <label>Source session<select aria-label="Source academic session" value={source} onChange={e => { setSource(e.target.value); change(); }} className="mt-1 w-full rounded border p-2"> <option value="">Select session</option>{years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
      <label>Target session<select aria-label="Target academic session" value={target} onChange={e => { setTarget(e.target.value); change(); }} className="mt-1 w-full rounded border p-2"><option value="">Select session</option>{years.filter(y => y.id !== source).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
    </div>
    {source && <button disabled={busy} type="button" className="rounded border px-3 py-2 text-sm" onClick={() => {
      const suggested: Record<string, string> = {};
      sourceClasses.forEach(c => {
        const grade = c.name.match(/\d+/);
        if (!grade) return;
        const next = classes.filter(t => t.status === "active" && (!t.academicYearId || t.academicYearId === target) && Number(t.name.match(/\d+/)?.[0]) === Number(grade[0]) + 1);
        if (next.length === 1) suggested[c.id] = next[0].id;
      });
      setMapping(suggested); change();
    }}>Suggest next class (review before applying)</button>}
    {students.some(s => !s.academicYearId && String(s.status || "active").toLowerCase() === "active") && <p className="mt-3 text-sm text-amber-700">Some active students have no academic session assigned. Assign their source session before including them in promotion.</p>}
    {sourceClasses.map(c => <label key={c.id} className="my-3 grid items-center gap-2 sm:grid-cols-2"><span>{c.name} →</span><select aria-label={`Destination for ${c.name}`} value={mapping[c.id] || ""} onChange={e => { setMapping({ ...mapping, [c.id]: e.target.value }); change(); }} className="w-full rounded border p-2"><option value="">Choose destination</option>{classes.filter(t => t.id !== c.id && t.status === "active" && (!t.academicYearId || t.academicYearId === target)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>)}
    <button disabled={busy} className="mt-4 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" onClick={() => { try { const rows = previewSchoolPromotion(students, classes, mapping, source, target); if (!rows.length) throw new Error("No active students in the selected source session."); setPreview(rows); setMessage(`Ready to promote ${rows.length} students. Review the destinations before applying.`); } catch (err) { setPreview(null); setMessage(err instanceof Error ? err.message : "Preview failed."); } }}>Review promotion</button>
    {preview && <button disabled={busy} className="ml-3 mt-4 rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50" onClick={async () => { setBusy(true); setFailures([]); try { const result = await promoteWholeSchool(schoolId, preview, source, target, actorId); setMessage(`${result.promoted} promoted; ${result.skipped} already processed; ${result.errors.length} failed.`); setFailures(result.errors); setPreview(null); onComplete(); } catch (err) { setMessage(err instanceof Error ? err.message : "Promotion failed."); } finally { setBusy(false); } }}>{busy ? "Promoting…" : `Apply to ${preview.length} students`}</button>}
    {message && <p role="status" className="mt-4 text-sm">{message}</p>}{failures.length > 0 && <ul className="mt-3 text-sm text-red-600">{failures.map(f => <li key={f}>{f}</li>)}</ul>}
  </section></EntitlementGate>;
}
