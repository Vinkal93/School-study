"use client";
import type { Plan } from "@/types";
import { ADMIN_FEATURE_REGISTRY } from "@/lib/features/adminFeatureRegistry";

export function DynamicPlanComparison({ currentPlanSlug, allPlans, prices = {}, onSelectUpgrade }: { currentPlanSlug: string; allPlans: Plan[]; prices?: Record<string, { monthlyPrice: number; annualPrice: number; currency: string }>; onSelectUpgrade: (planId: string) => void }) {
  const plans = allPlans.filter(p => p.status === "ACTIVE" && !p.isArchived && p.publicVisible !== false).sort((a,b) => a.displayOrder - b.displayOrder);
  const modules = ADMIN_FEATURE_REGISTRY.filter(f => f.type === "module" && f.planControlled);
  return <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
    <h3 className="text-lg font-bold">Compare subscription plans</h3>
    {!plans.length ? <p className="mt-4 text-sm">No public plans are currently available.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr><th className="p-3">Features</th>{plans.map(p => <th key={p.id} className="p-3"><div>{p.name}</div><div className="mt-1 text-xs font-normal">{prices[p.id] ? `${new Intl.NumberFormat("en-IN", { style: "currency", currency: prices[p.id].currency || "INR" }).format(prices[p.id].monthlyPrice / 100)} / month` : "Pricing unavailable"}</div>{p.slug === currentPlanSlug && <span className="text-xs text-blue-600">Current plan</span>}</th>)}</tr></thead><tbody>
      {([['maxStudents','Students'],['maxTeachers','Teachers'],['maxClasses','Classes'],['maxStaffAccounts','Staff accounts']] as const).map(([key,label]) => <tr key={key} className="border-t"><th className="p-3">{label}</th>{plans.map(p => <td key={p.id} className="p-3">{p.limits[key] === -1 ? "Unlimited" : p.limits[key] ?? "Not configured"}</td>)}</tr>)}
      {modules.map(f => <tr key={f.key} className="border-t"><th className="p-3">{f.label}</th>{plans.map(p => { const mode = p.featureAccess?.[f.key] || (p.features.includes(f.key) ? "FULL_ACCESS" : "HIDDEN"); return <td key={p.id} className="p-3">{mode === "FULL_ACCESS" ? "Included" : mode === "SHOWCASE" ? "Showcase" : "Not included"}</td>; })}</tr>)}
      <tr className="border-t"><td />{plans.map(p => <td key={p.id} className="p-3"><button disabled={p.slug === currentPlanSlug || !prices[p.id]} onClick={() => onSelectUpgrade(p.id)} className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50">{p.slug === currentPlanSlug ? "Current" : "Select plan"}</button></td>)}</tr>
    </tbody></table></div>}
  </section>;
}
