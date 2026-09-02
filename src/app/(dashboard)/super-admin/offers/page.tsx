"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Copy,
  Ban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  X,
  Loader2,
  Building2,
  Users,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useAppQuery } from "@/lib/cache";
import { useAuth } from "@/hooks/use-auth";
import { PageSkeleton } from "@/components/common/skeletons";
import type { CustomOfferRecord, OfferStatus, OfferType } from "@/types/reports";
import { toast } from "sonner";

import { useSearchParams } from "next/navigation";

export default function SuperAdminOffersPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const urlSchoolId = searchParams?.get("schoolId") || "";
  const urlCreate = searchParams?.get("create") === "true";

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals & Drawers State
  const [showCreateModal, setShowCreateModal] = useState(urlCreate || Boolean(urlSchoolId));
  const [showDetailsModal, setShowDetailsModal] = useState<CustomOfferRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Searchable School State for Create Offer
  const [schoolSearchQuery, setSchoolSearchQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("plan_professional");

  // Create Form State
  const [form, setForm] = useState({
    name: "Enterprise Special Offer",
    billingCycle: "monthly" as "monthly" | "annual",
    offerType: "PROMOTIONAL_RECURRING" as OfferType,
    promoDurationMonths: 1,
    originalPriceRupees: 9999,
    customPriceRupees: 1,
    validFromDays: 0, // Starts today
    expiresInDays: 7,
    maxRedemptions: 1,
    offerCode: "",
    notes: "Special onboarding promotional offer for school",
    internalReason: "Approved by Sales Management",
  });

  // 1. Fetch Offers & Analytics Bundle
  const {
    data: bundle,
    isLoading,
    refetch,
  } = useAppQuery(
    "superAdminOffersBundle",
    async () => {
      const res = await fetch("/api/super-admin/offers");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load custom offers.");
      return json;
    },
    { staleTime: 10_000 }
  );

  // 2. Fetch All Schools for Searchable Selector
  const { data: schoolsList } = useAppQuery(
    "superAdminSchoolsList",
    async () => {
      const res = await fetch("/api/super-admin/schools");
      const json = await res.json();
      return json.schools || [];
    },
    { staleTime: 60_000 }
  );

  React.useEffect(() => {
    if (urlSchoolId && schoolsList && !selectedSchool) {
      const match = schoolsList.find((s: any) => s.id === urlSchoolId);
      if (match) setSelectedSchool(match);
    }
  }, [urlSchoolId, schoolsList, selectedSchool]);

  // 3. Fetch All Plans for Plan Selector
  const { data: plansList } = useAppQuery(
    "superAdminPlansList",
    async () => {
      const res = await fetch("/api/super-admin/pricing");
      const json = await res.json();
      return json.plans || [];
    },
    { staleTime: 60_000 }
  );

  const offers: CustomOfferRecord[] = bundle?.offers || [];
  const analytics = bundle?.analytics || {
    totalOffers: 0,
    activeOffersCount: 0,
    scheduledOffersCount: 0,
    expiredOffersCount: 0,
    redeemedOffersCount: 0,
    deactivatedOffersCount: 0,
    totalDiscountGivenRupees: 0,
    totalOfferRevenueRupees: 0,
    conversionRate: 0,
  };

  // Filtered Schools for Selector
  const filteredSchools = useMemo(() => {
    if (!schoolsList || schoolsList.length === 0) return [];
    if (!schoolSearchQuery.trim()) return schoolsList.slice(0, 10);
    const q = schoolSearchQuery.toLowerCase().trim();
    return schoolsList
      .filter(
        (s: any) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.id || "").toLowerCase().includes(q) ||
          (s.adminEmail || "").toLowerCase().includes(q) ||
          (s.adminName || "").toLowerCase().includes(q) ||
          (s.code || "").toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [schoolsList, schoolSearchQuery]);

  // Selected Plan Object
  const currentSelectedPlan = useMemo(() => {
    if (!plansList) return null;
    return plansList.find((p: any) => p.id === selectedPlanId) || null;
  }, [plansList, selectedPlanId]);

  // Auto-calculated Discount
  const computedDiscount = useMemo(() => {
    const orig = form.originalPriceRupees || 9999;
    const cust = form.customPriceRupees ?? 1;
    const disc = Math.max(0, orig - cust);
    const pct = orig > 0 ? parseFloat(((disc / orig) * 100).toFixed(2)) : 0;
    return { disc, pct };
  }, [form.originalPriceRupees, form.customPriceRupees]);

  // Filtered Offers Table
  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
      const matchSearch =
        !search.trim() ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        (o.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.schoolName || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.adminEmail || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.offerCode || "").toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [offers, statusFilter, search]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSchool) {
      toast.error("Please search and select a target school for this offer.");
      return;
    }

    if (form.customPriceRupees < 0) {
      toast.error("Offer price must be a non-negative number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          schoolId: selectedSchool.id,
          schoolName: selectedSchool.name,
          adminEmail: selectedSchool.adminEmail || selectedSchool.email || "",
          adminName: selectedSchool.adminName || "",
          originalPlanId: currentSelectedPlan?.id || selectedPlanId,
          offerPlanId: currentSelectedPlan?.id || selectedPlanId,
          planName: currentSelectedPlan?.name || "Professional Plan",
          billingCycle: form.billingCycle,
          offerType: form.offerType,
          promoDurationMonths: Number(form.promoDurationMonths),
          originalPriceRupees: Number(form.originalPriceRupees),
          customPriceRupees: Number(form.customPriceRupees),
          expiresInDays: Number(form.expiresInDays),
          maxRedemptions: Number(form.maxRedemptions),
          offerCode: form.offerCode?.trim().toUpperCase(),
          notes: form.notes,
          internalReason: form.internalReason,
          actorId: profile?.uid || "super_admin",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create custom offer.");

      toast.success(json.message || "Custom offer created successfully!");
      setShowCreateModal(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to create custom offer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (offerId: string) => {
    if (!confirm(`Are you sure you want to deactivate offer ${offerId}?`)) return;
    try {
      const res = await fetch(`/api/super-admin/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate", actorId: profile?.uid || "super_admin" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to deactivate offer.");

      toast.success(`Offer ${offerId} deactivated successfully.`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate offer.");
    }
  };

  const handleDuplicate = async (offerId: string) => {
    try {
      const res = await fetch(`/api/super-admin/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", actorId: profile?.uid || "super_admin" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to duplicate offer.");

      toast.success(`Offer duplicated as ${json.offer.id}!`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate offer.");
    }
  };

  const getStatusBadge = (status: OfferStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold text-[10px] uppercase">
            <CheckCircle2 className="h-3 w-3" />
            ACTIVE
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 font-bold text-[10px] uppercase">
            <Clock className="h-3 w-3" />
            SCHEDULED
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 font-bold text-[10px] uppercase">
            EXPIRED
          </span>
        );
      case "REDEEMED":
      case "DEPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 font-bold text-[10px] uppercase">
            REDEEMED
          </span>
        );
      case "DEACTIVATED":
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 font-bold text-[10px] uppercase">
            DEACTIVATED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="h-7 w-7 text-amber-500" />
            <span>Offers & Promotions</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create and manage custom subscription offers for schools.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setSelectedSchool(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Offer</span>
          </button>
        </div>
      </div>

      {isLoading && !bundle ? (
        <PageSkeleton hasStats={true} hasTable={true} className="py-2" />
      ) : (
        <>
          {/* 2. Real Analytics Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-slate-400 block text-[10px] font-extrabold uppercase">Active Offers</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{analytics.activeOffersCount}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-slate-400 block text-[10px] font-extrabold uppercase">Scheduled</span>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{analytics.scheduledOffersCount}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-slate-400 block text-[10px] font-extrabold uppercase">Expired</span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{analytics.expiredOffersCount}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-slate-400 block text-[10px] font-extrabold uppercase">Redeemed</span>
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{analytics.redeemedOffersCount}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-slate-400 block text-[10px] font-extrabold uppercase">Total Discount</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">₹{analytics.totalDiscountGivenRupees.toLocaleString("en-IN")}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-slate-400 block text-[10px] font-extrabold uppercase">Offer Revenue</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">₹{analytics.totalOfferRevenueRupees.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* 3. Filter & Offer Table Section */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  <span>Custom Subscription Offers</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing {filteredOffers.length} of {offers.length} recorded custom pricing offers.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 flex-wrap">
                {(["ALL", "ACTIVE", "SCHEDULED", "EXPIRED", "REDEEMED", "DEACTIVATED"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === st
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Offer ID, School Name, Admin Email, or Offer Code..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white font-medium"
              />
            </div>

            {/* Table View */}
            {filteredOffers.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/40 dark:bg-slate-900/40 space-y-2">
                <Sparkles className="h-8 w-8 text-amber-500 mx-auto mb-1" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No custom offers found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Create a new custom offer for a school to unlock promotional pricing (e.g. ₹1/month for Enterprise).
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Custom Offer Now</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-3 px-3">Offer ID</th>
                      <th className="py-3 px-3">School / Admin</th>
                      <th className="py-3 px-3">Plan</th>
                      <th className="py-3 px-3">Original</th>
                      <th className="py-3 px-3">Offer Price</th>
                      <th className="py-3 px-3">Discount</th>
                      <th className="py-3 px-3">Valid Until</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Redeemed</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredOffers.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {o.id}
                          {o.offerCode && <span className="block text-[10px] text-slate-400 font-mono">Code: {o.offerCode}</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 dark:text-white block">{o.schoolName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{o.adminEmail || o.schoolId}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-900 dark:text-white block">{o.planName || o.offerPlanId}</span>
                          <span className="text-[10px] text-slate-400 capitalize">{o.billingCycle || "monthly"}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 line-through">
                          ₹{Math.round(o.originalPricePaise / 100).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3 font-black text-slate-900 dark:text-white text-sm">
                          ₹{Math.round(o.customPricePaise / 100).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-[10px]">
                            {o.discountPercentage || 99.99}% OFF
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono">
                          {new Date(o.validUntil || o.expiresAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-3 px-3">{getStatusBadge(o.status)}</td>
                        <td className="py-3 px-3 font-mono">
                          {o.redeemedCount || 0} / {o.maxRedemptions || 1}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setShowDetailsModal(o)}
                              title="View Offer Details"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(o.id)}
                              title="Duplicate Offer"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-blue-600 hover:bg-blue-50 cursor-pointer"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            {o.status !== "DEACTIVATED" && (
                              <button
                                onClick={() => handleDeactivate(o.id)}
                                title="Deactivate Offer"
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* CREATE OFFER DRAWER / MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <span>Create Custom Subscription Offer</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set custom promotional pricing (e.g. ₹1/month for Enterprise) for a target school.
                </p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Offer Name */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Offer Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Enterprise Special Onboarding Offer"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium"
                />
              </div>

              {/* Searchable School Selection */}
              <div className="space-y-2 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                <label className="block font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span>Target School Selection *</span>
                </label>

                {selectedSchool ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block text-sm">{selectedSchool.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ID: {selectedSchool.id} • Admin: {selectedSchool.adminEmail || "admin@school.com"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSchool(null)}
                      className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Change School
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={schoolSearchQuery}
                      onChange={(e) => setSchoolSearchQuery(e.target.value)}
                      placeholder="Type school name, ID, or admin email to search..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium"
                    />

                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {filteredSchools.map((s: any) => (
                        <div
                          key={s.id}
                          onClick={() => setSelectedSchool(s)}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{s.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ID: {s.id} • {s.adminEmail || "admin@school.com"}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-blue-600">Select</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Plan & Pricing Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Plan *</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => {
                      setSelectedPlanId(e.target.value);
                      const p = plansList?.find((pl: any) => pl.id === e.target.value);
                      if (p) setForm({ ...form, originalPriceRupees: Math.round((p.limits?.monthlyPrice || 999900) / 100) });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  >
                    <option value="plan_enterprise">Enterprise Plan (₹9,999/mo)</option>
                    <option value="plan_professional">Professional Plan (₹1,999/mo)</option>
                    <option value="plan_starter">Starter Plan (₹999/mo)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Billing Cycle *</label>
                  <select
                    value={form.billingCycle}
                    onChange={(e) => setForm({ ...form, billingCycle: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  >
                    <option value="monthly">Monthly Billing</option>
                    <option value="annual">Annual Billing</option>
                  </select>
                </div>
              </div>

              {/* Price Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Regular Plan Price (₹)</label>
                  <input
                    type="number"
                    value={form.originalPriceRupees}
                    onChange={(e) => setForm({ ...form, originalPriceRupees: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Special Offer Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form.customPriceRupees}
                    onChange={(e) => setForm({ ...form, customPriceRupees: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-black text-blue-600 text-sm"
                  />
                </div>
              </div>

              {/* Auto Calculated Discount Card */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between text-xs">
                <div>
                  <span className="text-amber-800 dark:text-amber-300 block font-bold">Offer Pricing Breakdown</span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400">
                    School pays ₹{form.customPriceRupees} instead of ₹{form.originalPriceRupees}
                  </span>
                </div>
                <div className="text-right font-black text-amber-800 dark:text-amber-300 text-sm">
                  <span>₹{computedDiscount.disc} Savings ({computedDiscount.pct}% OFF)</span>
                </div>
              </div>

              {/* Duration & Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valid Until (Days)</label>
                  <input
                    type="number"
                    value={form.expiresInDays}
                    onChange={(e) => setForm({ ...form, expiresInDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Max Redemptions</label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxRedemptions}
                    onChange={(e) => setForm({ ...form, maxRedemptions: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Offer Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. GAI-ENTERPRISE-1"
                    value={form.offerCode}
                    onChange={(e) => setForm({ ...form, offerCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Customer / Internal Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span>Create Custom Offer Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFER DETAILS MODAL */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                <span>Offer Details — {showDetailsModal.id}</span>
              </h3>
              <button onClick={() => setShowDetailsModal(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white text-sm block">{showDetailsModal.name}</span>
                <span className="text-slate-500 block">Target School: <strong>{showDetailsModal.schoolName}</strong> ({showDetailsModal.schoolId})</span>
                <span className="text-slate-500 block">Admin Email: {showDetailsModal.adminEmail || "N/A"}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">ORIGINAL PRICE</span>
                  <span className="font-bold text-slate-700 line-through">₹{Math.round(showDetailsModal.originalPricePaise / 100)}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-800 dark:text-emerald-300 block text-[10px] uppercase font-bold">OFFER PRICE</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300 text-base">₹{Math.round(showDetailsModal.customPricePaise / 100)}</span>
                </div>
              </div>

              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <p><strong>Plan Target:</strong> {showDetailsModal.planName || showDetailsModal.offerPlanId}</p>
                <p><strong>Billing Cycle:</strong> {showDetailsModal.billingCycle || "monthly"}</p>
                <p><strong>Offer Code:</strong> {showDetailsModal.offerCode || "N/A"}</p>
                <p><strong>Valid Until:</strong> {new Date(showDetailsModal.validUntil || showDetailsModal.expiresAt).toLocaleString("en-IN")}</p>
                <p><strong>Created By:</strong> {showDetailsModal.createdBy}</p>
                <p><strong>Notes:</strong> {showDetailsModal.notes || "None"}</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDetailsModal(null)}
                className="px-4 py-2 font-bold text-xs bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
