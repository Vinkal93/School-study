"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  Banknote,
  Plus,
  Trash2,
  Search,
  Save,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  FolderOpen,
  DollarSign,
  CreditCard,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  getAccountHeads,
  createAccountHead,
  deleteAccountHead,
  type AccountHead,
} from "@/lib/services/account-head.service";
import { getFastCache, setFastCache } from "@/lib/utils/fast-data-cache";
import { toast } from "sonner";

export default function ChartOfAccountsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  // Data state
  const [heads, setHeads] = useState<AccountHead[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Form state
  const [headName, setHeadName] = useState("");
  const [headType, setHeadType] = useState<"INCOME" | "EXPENSE" | "">("");
  const [saving, setSaving] = useState(false);

  // Table Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Load Heads with zero-flicker fast cache
  useEffect(() => {
    if (!schoolId) return;
    const cacheKey = `admin_account_heads_${schoolId}`;
    const cached = getFastCache<AccountHead[]>(cacheKey);
    if (cached) {
      setHeads(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    getAccountHeads(schoolId)
      .then((data) => {
        setHeads(data);
        setFastCache(cacheKey, data, 10 * 60 * 1000);
      })
      .catch((err) => {
        console.error("Failed to load account heads:", err);
        if (!cached) toast.error("Failed to load chart of accounts.");
      })
      .finally(() => setLoading(false));
  }, [schoolId]);

  // Handle Create Head
  const handleSaveHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headName.trim()) {
      toast.error("Please enter a Head Name.");
      return;
    }
    if (!headType) {
      toast.error("Please select a Head Type (Income or Expense).");
      return;
    }

    setSaving(true);
    try {
      const created = await createAccountHead(schoolId, headName.trim(), headType);
      setHeads((prev) => {
        const next = [...prev, created];
        setFastCache(`admin_account_heads_${schoolId}`, next, 10 * 60 * 1000);
        return next;
      });
      setHeadName("");
      setHeadType("");
      toast.success(`Account Head "${created.name}" created successfully!`);
    } catch (err: any) {
      console.error("Save head error:", err);
      toast.error(err.message || "Failed to save account head.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete Head
  const handleDeleteHead = async (head: AccountHead) => {
    if (!confirm(`Are you sure you want to delete account head "${head.name}"?`)) {
      return;
    }

    try {
      await deleteAccountHead(schoolId, head.id);
      setHeads((prev) => {
        const next = prev.filter((h) => h.id !== head.id);
        setFastCache(`admin_account_heads_${schoolId}`, next, 10 * 60 * 1000);
        return next;
      });
      toast.success(`Account Head "${head.name}" deleted.`);
    } catch (err: any) {
      console.error("Delete head error:", err);
      toast.error(err.message || "Failed to delete account head.");
    }
  };

  // Filtered & Paginated List
  const filteredHeads = useMemo(() => {
    if (!searchQuery.trim()) return heads;
    const q = searchQuery.toLowerCase();
    return heads.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        String(h.numericId).includes(q) ||
        h.type.toLowerCase().includes(q)
    );
  }, [heads, searchQuery]);

  const totalPages = Math.ceil(filteredHeads.length / pageSize) || 1;
  const paginatedHeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHeads.slice(start, start + pageSize);
  }, [filteredHeads, currentPage, pageSize]);

  return (
    <EntitlementGate feature="account_chart" title="Chart Of Account" requiredPlan="Professional Plan">
      <div className="mx-auto max-w-7xl space-y-6 p-4 text-slate-900 dark:text-slate-100 sm:p-6">
        {/* Breadcrumb Header matching screenshot */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Banknote className="h-4 w-4" />
            </div>
            <Link href="/admin/accounts/chart-of-accounts" className="text-slate-900 hover:text-indigo-600 dark:text-white">
              Accounts
            </Link>
            <ChevronRight className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400 font-normal">
              Chart of Accounts
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/accounts/add-income"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              Add Income
            </Link>
            <Link
              href="/admin/accounts/add-expense"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
              Add Expense
            </Link>
            <Link
              href="/admin/accounts/statement"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Account Statement
            </Link>
          </div>
        </div>

        {/* 2-Column Layout matching Screenshot */}
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* LEFT CARD: + Add Account Head */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6 self-start">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Plus className="h-5 w-5" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Add Account Head
              </h2>
            </div>

            <form onSubmit={handleSaveHead} className="space-y-5">
              {/* HEAD NAME * */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  HEAD NAME *
                </label>
                <input
                  type="text"
                  required
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  placeholder="e.g. Electricity Bill"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* HEAD TYPE * */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  HEAD TYPE *
                </label>
                <select
                  required
                  value={headType}
                  onChange={(e) => setHeadType(e.target.value as "INCOME" | "EXPENSE")}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Select type --</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>

              {/* Save Head Button (Purple rounded with save icon) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || !headName.trim() || !headType}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Head
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT CARD: Table with Show Entries & Search Heads */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            {/* Top Bar: Show entries & Search input */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entries</span>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search heads..."
                  className="w-full rounded-xl border border-slate-300 bg-white pl-3.5 pr-8 py-1.5 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <Search className="pointer-events-none absolute right-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-bold w-24">ID</th>
                    <th className="px-4 py-3 font-bold">NAME OF HEAD</th>
                    <th className="px-4 py-3 font-bold w-36">TYPE</th>
                    <th className="px-4 py-3 font-bold w-24 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">
                        Loading account heads...
                      </td>
                    </tr>
                  ) : paginatedHeads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">
                        No account heads found. Add one on the left.
                      </td>
                    </tr>
                  ) : (
                    paginatedHeads.map((head) => (
                      <tr key={head.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3.5 font-medium text-slate-600 dark:text-slate-400">
                          {head.numericId}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                          {head.name}
                        </td>
                        <td className="px-4 py-3.5">
                          {head.type === "EXPENSE" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
                              <TrendingDown className="h-3 w-3" />
                              EXPENSE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                              <TrendingUp className="h-3 w-3" />
                              INCOME
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteHead(head)}
                            title="Delete Head"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500 transition hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-900/60"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <div>
                Showing{" "}
                <strong>
                  {filteredHeads.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                </strong>{" "}
                to{" "}
                <strong>
                  {Math.min(currentPage * pageSize, filteredHeads.length)}
                </strong>{" "}
                of <strong>{filteredHeads.length}</strong> entries
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i + 1}
                    type="button"
                    onClick={() => setCurrentPage(i + 1)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                      currentPage === i + 1
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </EntitlementGate>
  );
}
