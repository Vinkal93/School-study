"use client";
export interface UsageGraphSectionProps {
  studentCount: number; teacherCount: number; classCount: number;
  storageBytes: number; notificationCount: number;
}
export function UsageGraphSection({ studentCount, teacherCount, classCount }: UsageGraphSectionProps) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
    <h3 className="font-bold">Current school usage</h3>
    <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[["Students", studentCount], ["Teachers", teacherCount], ["Classes", classCount]].map(([label, count]) =>
        <div key={label} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 text-2xl font-bold">{Number(count).toLocaleString("en-IN")}</dd></div>)}
    </dl>
    <p className="mt-4 text-xs text-slate-500">Counts come from saved school records. Historical usage and storage measurements are not available yet.</p>
  </section>;
}
