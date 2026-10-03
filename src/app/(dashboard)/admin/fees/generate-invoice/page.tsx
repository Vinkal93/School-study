"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useFeeSession } from "@/components/fees/FeeSessionProvider";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { feeFetch } from "@/lib/fees/client-request";
import { getStudents } from "@/lib/services/student.service";
import { formatINR } from "@/lib/services/fee-foundation.service";
import type { StudentProfile } from "@/types";
import type { FeeDemand } from "@/types/fee-foundation";
import { toast } from "sonner";

export default function GenerateFeeInvoicePage() {
  const { profile } = useAuth();
  const { academicYearId, years } = useFeeSession();
  const schoolId = profile?.schoolId || "";
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [studentId, setStudentId] = useState("");
  const [className, setClassName] = useState("all");
  const [demands, setDemands] = useState<FeeDemand[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  useEffect(() => { if (schoolId) getStudents(schoolId, { status: "active" }).then(setStudents).catch(() => toast.error("Students unavailable.")); }, [schoolId]);
  useEffect(() => {
    let cancelled = false;
    if (!schoolId) return;
    setLoading(true); setDemands([]);
    feeFetch(`/api/fees/foundation/demands?schoolId=${encodeURIComponent(schoolId)}&academicYearId=${encodeURIComponent(academicYearId)}`)
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Invoices unavailable."); return data.demands as FeeDemand[]; })
      .then(list => { if (!cancelled) setDemands(list); })
      .catch(error => { if (!cancelled) toast.error(error.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [schoolId, academicYearId, revision]);
  const classes = [...new Set(students.map(student => student.className))].sort();
  const eligible = students.filter(student => className === "all" || student.className === className);
  const visible = useMemo(() => demands.filter(demand => demand.status !== "CANCELLED" && (!studentId || demand.studentId === studentId) && (className === "all" || demand.className === className)), [demands, studentId, className]);
  const generate = async () => {
    if (busy.current || !schoolId || academicYearId === "all") return;
    const ids = studentId ? [studentId] : eligible.map(student => student.id);
    if (!ids.length) { toast.error("No students selected."); return; }
    busy.current = true; setGenerating(true);
    try {
      const response = await feeFetch("/api/fees/foundation/demands/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId, action: "generate", academicYearId, academicYearName: years.find(year => year.id === academicYearId)?.name, studentIds: ids }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Invoice generation failed.");
      const result = data.result || data;
      if (result.errors?.length || result.failed) throw new Error(result.errors?.join("; ") || "Some invoices failed. Reload before retrying.");
      toast.success(`Generated ${result.newlyGenerated || 0} new invoices. Existing invoices preserved.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Invoice generation failed."); }
    finally { busy.current = false; setGenerating(false); setRevision(value => value + 1); }
  };
  return <EntitlementGate feature="fee_structure" title="Fee Invoices" requiredPlan="Professional Plan">
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Fee invoices</h1><p className="text-sm text-muted-foreground">Generate from configured fee structures. Every invoice is linked to student dues and accounting.</p></div><Link href="/admin/fees/structures" className="text-blue-600 underline">Manage fee structures</Link></div>
      <div className="flex flex-wrap gap-3 print:hidden">
        <select aria-label="Invoice class" value={className} onChange={event => { setClassName(event.target.value); setStudentId(""); }} className="rounded-lg border bg-background p-2"><option value="all">All classes</option>{classes.map(name => <option key={name} value={name}>{name}</option>)}</select>
        <select aria-label="Invoice student" value={studentId} onChange={event => setStudentId(event.target.value)} className="rounded-lg border bg-background p-2"><option value="">All students in selected class</option>{eligible.map(student => <option key={student.id} value={student.id}>{student.name} · {student.admissionNumber || student.id}</option>)}</select>
        <button type="button" disabled={generating || academicYearId === "all"} onClick={generate} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{generating ? "Generating…" : "Generate missing invoices"}</button>
        <button type="button" disabled={!visible.length} onClick={() => window.print()} className="rounded-lg border px-4 py-2">Print invoice register</button>
      </div>
      {academicYearId === "all" && <p className="text-sm">Select one academic session to generate invoices.</p>}
      <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-muted"><tr>{["Invoice", "Student", "Class", "Fee head / period", "Due date", "Net charge", "Paid", "Outstanding", "Status"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{visible.map(demand => <tr key={demand.id} className="border-t"><td className="p-3">{demand.invoiceNumber}</td><td className="p-3"><Link href={`/admin/fees/student-fees?studentId=${encodeURIComponent(demand.studentId)}`} className="text-blue-600">{demand.studentName}</Link></td><td className="p-3">{demand.className}</td><td className="p-3">{demand.feeHeadName} · {demand.period}</td><td className="p-3">{demand.dueDate}</td><td className="p-3">{formatINR(demand.netAmountPaise)}</td><td className="p-3">{formatINR(demand.paidAmountPaise)}</td><td className="p-3">{formatINR(demand.balanceAmountPaise)}</td><td className="p-3">{demand.status}</td></tr>)}</tbody></table>{!visible.length && <p className="p-6 text-sm">{loading ? "Loading invoices…" : "No invoices match these filters."}</p>}</div>
    </div>
  </EntitlementGate>;
}
