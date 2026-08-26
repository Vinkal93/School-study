"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  PlusCircle,
  Search,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Loader2,
  RefreshCw,
  Power,
  SlidersHorizontal,
} from "lucide-react";
import { getAllSchools, updateSchoolStatus } from "@/lib/services/school.service";
import type { School, SchoolStatus } from "@/types";
import { toast } from "sonner";

export default function SchoolsManagementPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadSchools = async () => {
    setLoading(true);
    try {
      const data = await getAllSchools();
      setSchools(data);
    } catch (err) {
      toast.error("Failed to load schools list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
  }, []);

  const handleToggleStatus = async (school: School) => {
    const nextStatus: SchoolStatus = school.status === "active" ? "inactive" : "active";
    setTogglingId(school.id);
    try {
      await updateSchoolStatus(school.id, nextStatus);
      setSchools((prev) =>
        prev.map((s) => (s.id === school.id ? { ...s, status: nextStatus } : s))
      );
      toast.success(
        `School "${school.name}" is now ${nextStatus === "active" ? "Activated" : "Deactivated"}.`
      );
    } catch (err) {
      toast.error("Failed to update school status.");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredSchools = schools.filter((school) => {
    const matchesSearch =
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (school.city && school.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (school.email && school.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (school.adminEmail && school.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ? true : school.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Schools Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View, activate, deactivate, and manage all school tenants on the platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadSchools}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/super-admin/schools/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" />
            Add New School
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, code, city, admin..."
            className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SlidersHorizontal className="h-4 w-4 text-gray-400 hidden sm:inline-block" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline-block">
            Status:
          </span>
          {(["all", "active", "inactive"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                statusFilter === st
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {st} ({st === "all" ? schools.length : schools.filter((s) => s.status === st).length})
            </button>
          ))}
        </div>
      </div>

      {/* Schools Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-medium text-gray-900 dark:text-white">
              No schools match your filter
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search or add a new school tenant.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="py-3.5 px-4 font-medium">School</th>
                  <th className="py-3.5 px-4 font-medium">Code</th>
                  <th className="py-3.5 px-4 font-medium">Location</th>
                  <th className="py-3.5 px-4 font-medium">Admin / Contact</th>
                  <th className="py-3.5 px-4 font-medium">Status</th>
                  <th className="py-3.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredSchools.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {s.logoUrl ? (
                          <img
                            src={s.logoUrl}
                            alt={s.name}
                            className="h-9 w-9 rounded-lg object-contain border border-gray-200 bg-white"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-sm">
                            {s.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{s.name}</p>
                          {s.phone && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />
                              {s.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                      <span className="rounded bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
                        {s.code}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-300">
                      {s.city ? (
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          <span>
                            {s.city}
                            {s.state ? `, ${s.state}` : ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-300">
                      {s.adminEmail ? (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          <span>{s.adminEmail}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          s.status === "active"
                            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {s.status === "active" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {s.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/super-admin/schools/${s.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          Explore
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(s)}
                          disabled={togglingId === s.id}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            s.status === "active"
                              ? "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/40 dark:text-red-400 dark:hover:bg-red-900/20"
                              : "border border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800/40 dark:text-green-400 dark:hover:bg-green-900/20"
                          } disabled:opacity-50`}
                        >
                          {togglingId === s.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                          {s.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
