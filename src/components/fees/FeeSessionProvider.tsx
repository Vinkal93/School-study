"use client";

import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getAcademicYears } from "@/lib/services/academic.service";
import type { AcademicYear } from "@/types";

const SessionContext = createContext<{ academicYearId: string; setAcademicYearId: Dispatch<SetStateAction<string>>; years: AcademicYear[] } | null>(null);
export function useFeeSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Fee session provider is required.");
  return value;
}
export function FeeSessionProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [academicYearId, setAcademicYearId] = useState("");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loadedSchool, setLoadedSchool] = useState("");
  const [error, setError] = useState("");
  const schoolId = profile?.schoolId || (profile?.role === "super_admin" && typeof window !== "undefined" ? localStorage.getItem("currentSchoolId") || "" : "");
  useEffect(() => {
    let cancelled = false;
    if (!schoolId) return;
    getAcademicYears(schoolId).then(list => {
      if (cancelled) return;
      setError("");
      setYears(list);
      const saved = sessionStorage.getItem(`fee-session:${schoolId}`);
      setAcademicYearId(saved === "all" || list.some(year => year.id === saved) ? saved! : list.find(year => year.isCurrent)?.id || list[0]?.id || "all");
      setLoadedSchool(schoolId);
    }).catch(() => { if (!cancelled) setError("Academic sessions could not be loaded. Reload to try again."); });
    return () => { cancelled = true; };
  }, [schoolId]);
  useEffect(() => { if (loadedSchool === schoolId && academicYearId) sessionStorage.setItem(`fee-session:${schoolId}`, academicYearId); }, [academicYearId, schoolId, loadedSchool]);
  if (!schoolId) return <div className="p-6 text-sm">Select a school to open fee management.</div>;
  if (loadedSchool !== schoolId) return <div className="p-6 text-sm">{error || "Loading fee session…"}</div>;
  return <SessionContext.Provider value={{ academicYearId, setAcademicYearId, years }}>
    <div className="mx-4 mt-4 flex items-center justify-between gap-4 rounded-xl border p-3 text-sm">
      <span>Fee Management · Academic session</span>
      <select aria-label="Fee management academic session" value={academicYearId} onChange={event => setAcademicYearId(event.target.value)} className="rounded-lg border bg-background px-3 py-2">
        {years.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}
        <option value="all">All sessions</option>
      </select>
    </div>
    <div key={`${schoolId}:${academicYearId}`}>{children}</div>
  </SessionContext.Provider>;
}
