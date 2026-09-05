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
  Tag,
  Calendar,
  Percent,
  TrendingUp,
  Download,
  DollarSign,
  Layers,
  ArrowRight,
  ChevronRight,
  Trash2,
  Play,
  Pause,
  FileSpreadsheet,
} from "lucide-react";
import { useAppQuery } from "@/lib/cache";
import { useAuth } from "@/hooks/use-auth";
import { PageSkeleton } from "@/components/common/skeletons";
import type {
  OfferPromotion,
  PromotionCampaign,
  CouponRedemptionRecord,
  OffersDashboardMetrics,
  OfferDiscountType,
  OfferStatus,
  CampaignStatus,
  TargetAudience,
} from "@/types/offerPromotion";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

export default function SuperAdminOffersPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const urlCreate = searchParams?.get("create") === "true";

  // Tab State
  const [activeTab, setActiveTab] = useState<"offers" | "campaigns" | "redemptions">("offers");

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [discountTypeFilter, setDiscountTypeFilter] = useState<string>("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");

  // Modals & Drawers State
  const [showCreateModal, setShowCreateModal] = useState(urlCreate);
  const [editingOffer, setEditingOffer] = useState<OfferPromotion | null>(null);
  const [selectedOfferDetail, setSelectedOfferDetail] = useState<OfferPromotion | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Searchable School State for Create Offer
  const [schoolSearchQuery, setSchoolSearchQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);

  // Form State for Offer Create/Edit
  const [form, setForm] = useState({
    name: "Festive Special Discount",
    title: "Special Offer",
    description: "Exclusive promotional discount on subscription plans",
    code: "",
    discountType: "PERCENTAGE" as OfferDiscountType,
    discountValue: 20,
    maxDiscountCapRupees: 2000,
    minOrderAmountRupees: 0,
    maxTotalRedemptions: 100,
    maxRedemptionsPerSchool: 1,
    maxRedemptionsPerUser: 1,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    neverExpires: false,
    applicablePlans: ["ALL"],
    applicableBillingCycles: ["all"] as ("monthly" | "annual" | "all")[],
    targetAudience: "ALL" as TargetAudience,
    autoApply: false,
    priority: 1,
    isStackable: false,
    campaignId: "",
    status: "ACTIVE" as OfferStatus,
    termsAndConditions: "Cannot be combined with other offers. One redemption per school.",
    notes: "",
    internalReason: "",
  });

  // Campaign Form State
  const [campaignForm, setCampaignForm] = useState({
    name: "Q3 School Onboarding Drive",
    description: "Targeted campaigns for newly onboarding schools",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    budgetLimitRupees: 50000,
    status: "ACTIVE" as CampaignStatus,
    notes: "",
  });

  // 1. Fetch Offers & Analytics Bundle
  const {
    data: bundle,
    isLoading,
    refetch,
  } = useAppQuery(
    "superAdminOffersPromotionsBundle",
    async () => {
      const res = await fetch("/api/super-admin/offers");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load offers & promotions.");
      return json;
    },
    { staleTime: 10_000 }
  );

  // 2. Fetch Schools for School Targeting
  const { data: schoolsList } = useAppQuery(
    "superAdminSchoolsList",
    async () => {
      const res = await fetch("/api/super-admin/schools");
      const json = await res.json();
      return json.schools || [];
    },
    { staleTime: 60_000 }
  );

  // 3. Fetch Plans List
  const { data: plansList } = useAppQuery(
    "superAdminPlansList",
    async () => {
      const res = await fetch("/api/super-admin/pricing");
      const json = await res.json();
      return json.plans || [];
    },
    { staleTime: 60_000 }
  );

  const offers: OfferPromotion[] = bundle?.offers || [];
  const campaigns: PromotionCampaign[] = bundle?.campaigns || [];
  const metrics: OffersDashboardMetrics = bundle?.metrics || {
    totalOffers: 0,
    activeOffers: 0,
    scheduledOffers: 0,
    expiredOffers: 0,
    pausedOffers: 0,
    totalRedemptions: 0,
    totalDiscountGivenPaise: 0,
    totalDiscountGivenRupees: 0,
    totalRevenueGeneratedPaise: 0,
    totalRevenueGeneratedRupees: 0,
    conversionRate: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
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
          (s.adminEmail || "").toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [schoolsList, schoolSearchQuery]);

  // Filtered Offers Table
  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
      const matchType = discountTypeFilter === "ALL" || o.discountType === discountTypeFilter;
      const matchPlan =
        planFilter === "ALL" ||
        o.applicablePlans.includes("ALL") ||
        o.applicablePlans.includes(planFilter);
      const matchSearch =
        !search.trim() ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.code.toLowerCase().includes(search.toLowerCase()) ||
        (o.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.description || "").toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchType && matchPlan && matchSearch;
    });
  }, [offers, statusFilter, discountTypeFilter, planFilter, search]);

  // Open Edit Offer
  const handleOpenEdit = (offer: OfferPromotion) => {
    setEditingOffer(offer);
    setForm({
      name: offer.name,
      title: offer.title || offer.name,
      description: offer.description || "",
      code: offer.code,
      discountType: offer.discountType,
      discountValue: offer.discountType === "PERCENTAGE" ? offer.discountValue : offer.discountValue / 100,
      maxDiscountCapRupees: offer.maxDiscountCapPaise ? offer.maxDiscountCapPaise / 100 : 0,
      minOrderAmountRupees: (offer.minOrderAmountPaise || 0) / 100,
      maxTotalRedemptions: offer.maxTotalRedemptions,
      maxRedemptionsPerSchool: offer.maxRedemptionsPerSchool,
      maxRedemptionsPerUser: offer.maxRedemptionsPerUser,
      startDate: offer.startDate ? offer.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      endDate: offer.endDate ? offer.endDate.slice(0, 10) : "",
      neverExpires: !offer.endDate,
      applicablePlans: offer.applicablePlans || ["ALL"],
      applicableBillingCycles: offer.applicableBillingCycles || ["all"],
      targetAudience: offer.targetAudience || "ALL",
      autoApply: Boolean(offer.autoApply),
      priority: offer.priority || 1,
      isStackable: Boolean(offer.isStackable),
      campaignId: offer.campaignId || "",
      status: offer.status,
      termsAndConditions: offer.termsAndConditions || "",
      notes: offer.notes || "",
      internalReason: offer.internalReason || "",
    });
    setShowCreateModal(true);
  };

  // Reset Create Form
  const handleOpenCreate = () => {
    setEditingOffer(null);
    setForm({
      name: "Special Promotional Offer",
      title: "Special Offer",
      description: "Exclusive promotional discount on subscription plans",
      code: `PROMO${Math.floor(10 + Math.random() * 90)}`,
      discountType: "PERCENTAGE",
      discountValue: 20,
      maxDiscountCapRupees: 2000,
      minOrderAmountRupees: 0,
      maxTotalRedemptions: 100,
      maxRedemptionsPerSchool: 1,
      maxRedemptionsPerUser: 1,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      neverExpires: false,
      applicablePlans: ["ALL"],
      applicableBillingCycles: ["all"],
      targetAudience: "ALL",
      autoApply: false,
      priority: 1,
      isStackable: false,
      campaignId: "",
      status: "ACTIVE",
      termsAndConditions: "Cannot be combined with other offers. One redemption per school.",
      notes: "",
      internalReason: "",
    });
    setShowCreateModal(true);
  };

  // Submit Create / Edit Offer
  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Offer name is required.");
      return;
    }
    if (!form.code.trim()) {
      toast.error("Coupon code is required.");
      return;
    }
    if (form.discountValue < 0) {
      toast.error("Discount value must be non-negative.");
      return;
    }

    setSubmitting(true);
    try {
      const discountValueCalculated =
        form.discountType === "PERCENTAGE"
          ? Number(form.discountValue)
          : Math.round(Number(form.discountValue) * 100);

      const maxDiscountCapPaise =
        form.maxDiscountCapRupees > 0
          ? Math.round(Number(form.maxDiscountCapRupees) * 100)
          : undefined;

      const minOrderAmountPaise =
        form.minOrderAmountRupees > 0
          ? Math.round(Number(form.minOrderAmountRupees) * 100)
          : 0;

      const payload = {
        name: form.name.trim(),
        title: form.title.trim() || form.name.trim(),
        description: form.description.trim(),
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: discountValueCalculated,
        maxDiscountCapPaise,
        minOrderAmountPaise,
        maxTotalRedemptions: Number(form.maxTotalRedemptions),
        maxRedemptionsPerSchool: Number(form.maxRedemptionsPerSchool),
        maxRedemptionsPerUser: Number(form.maxRedemptionsPerUser),
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.neverExpires ? null : new Date(form.endDate).toISOString(),
        applicablePlans: form.applicablePlans,
        applicableBillingCycles: form.applicableBillingCycles,
        targetAudience: form.targetAudience,
        targetSchoolIds: selectedSchool ? [selectedSchool.id] : [],
        autoApply: form.autoApply,
        priority: Number(form.priority),
        isStackable: form.isStackable,
        campaignId: form.campaignId || undefined,
        status: form.status,
        termsAndConditions: form.termsAndConditions,
        notes: form.notes,
        internalReason: form.internalReason,
        actorId: profile?.uid || "super_admin",
      };

      if (editingOffer) {
        const res = await fetch(`/api/super-admin/offers/${editingOffer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to update offer.");
        toast.success(`Offer "${json.offer.name}" updated successfully!`);
      } else {
        const res = await fetch("/api/super-admin/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to create offer.");
        toast.success(`Offer "${json.offer.name}" (${json.offer.code}) created successfully!`);
      }

      setShowCreateModal(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save offer.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Offer Status
  const handleToggleStatus = async (offer: OfferPromotion) => {
    const targetStatus = offer.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const res = await fetch(`/api/super-admin/offers/${offer.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, actorId: profile?.uid || "super_admin" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to change status.");
      toast.success(`Offer ${offer.code} changed to ${targetStatus}.`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    }
  };

  // Duplicate Offer
  const handleDuplicate = async (offer: OfferPromotion) => {
    const newCode = prompt(`Enter new coupon code for cloned offer:`, `${offer.code}_COPY`);
    if (!newCode) return;

    try {
      const res = await fetch(`/api/super-admin/offers/${offer.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newCode: newCode.trim().toUpperCase(), actorId: profile?.uid || "super_admin" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to duplicate offer.");
      toast.success(`Offer cloned successfully as ${json.offer.code}!`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate offer.");
    }
  };

  // Archive Offer
  const handleArchive = async (offer: OfferPromotion) => {
    if (!confirm(`Are you sure you want to archive offer "${offer.name}" (${offer.code})?`)) return;
    try {
      const res = await fetch(`/api/super-admin/offers/${offer.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to archive offer.");
      toast.success(`Offer ${offer.code} archived successfully.`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to archive offer.");
    }
  };

  // Create Campaign Submit
  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.name.trim()) {
      toast.error("Campaign name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignForm.name.trim(),
          description: campaignForm.description.trim(),
          startDate: new Date(campaignForm.startDate).toISOString(),
          endDate: campaignForm.endDate ? new Date(campaignForm.endDate).toISOString() : null,
          budgetLimitPaise: Math.round(Number(campaignForm.budgetLimitRupees) * 100),
          status: campaignForm.status,
          notes: campaignForm.notes,
          actorId: profile?.uid || "super_admin",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to create campaign.");
      toast.success(`Campaign "${json.campaign.name}" created successfully!`);
      setShowCampaignModal(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to create campaign.");
    } finally {
      setSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (offers.length === 0) {
      toast.info("No offers available to export.");
      return;
    }
    const headers = [
      "ID",
      "Code",
      "Name",
      "Discount Type",
      "Discount Value",
      "Max Cap (INR)",
      "Min Order (INR)",
      "Redemptions",
      "Max Limit",
      "Total Discount (INR)",
      "Total Revenue (INR)",
      "Status",
      "Start Date",
      "End Date",
    ];
    const rows = offers.map((o) => [
      o.id,
      o.code,
      `"${(o.name || "").replace(/"/g, '""')}"`,
      o.discountType,
      o.discountType === "PERCENTAGE" ? `${o.discountValue}%` : `₹${o.discountValue / 100}`,
      o.maxDiscountCapPaise ? o.maxDiscountCapPaise / 100 : "None",
      (o.minOrderAmountPaise || 0) / 100,
      o.usedCount || 0,
      o.maxTotalRedemptions === -1 ? "Unlimited" : o.maxTotalRedemptions,
      (o.totalDiscountGivenPaise || 0) / 100,
      (o.totalRevenueGeneratedPaise || 0) / 100,
      o.status,
      o.startDate ? o.startDate.slice(0, 10) : "",
      o.endDate ? o.endDate.slice(0, 10) : "Never",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `offers_promotions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Offers report exported to CSV.");
  };

  if (isLoading && !bundle) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            Offers & Promotions Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Centrally create, schedule, govern, and track coupons, promotions, campaigns, and conversion analytics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => setShowCampaignModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition"
          >
            <Layers className="w-3.5 h-3.5" />
            New Campaign
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Offer
          </button>
        </div>
      </div>

      {/* Top 8 KPIs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Offers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Offers</span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{metrics.totalOffers}</p>
          <span className="text-[10px] text-slate-400">All time</span>
        </div>

        {/* Active Offers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active</span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{metrics.activeOffers}</p>
          <span className="text-[10px] text-slate-400">Live now</span>
        </div>

        {/* Scheduled */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Scheduled</span>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{metrics.scheduledOffers}</p>
          <span className="text-[10px] text-slate-400">Future start</span>
        </div>

        {/* Expired */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Expired</span>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">{metrics.expiredOffers}</p>
          <span className="text-[10px] text-slate-400">Past validity</span>
        </div>

        {/* Redemptions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Redemptions</span>
          <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">{metrics.totalRedemptions}</p>
          <span className="text-[10px] text-slate-400">Orders redeemed</span>
        </div>

        {/* Discount Given */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Discounts</span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">₹{metrics.totalDiscountGivenRupees.toLocaleString("en-IN")}</p>
          <span className="text-[10px] text-slate-400">Total subsidized</span>
        </div>

        {/* Revenue Generated */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Revenue</span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">₹{metrics.totalRevenueGeneratedRupees.toLocaleString("en-IN")}</p>
          <span className="text-[10px] text-slate-400">From promo sales</span>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Conversion</span>
          <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{metrics.conversionRate}%</p>
          <span className="text-[10px] text-slate-400">Usage rate</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("offers")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "offers"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Offers & Coupons ({offers.length})
        </button>
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "campaigns"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Campaigns ({campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab("redemptions")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "redemptions"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Redemption History ({metrics.totalRedemptions})
        </button>
      </div>

      {/* TAB 1: OFFERS & COUPONS */}
      {activeTab === "offers" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-3 shadow-sm">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by code, title, name, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PAUSED">Paused</option>
              <option value="EXPIRED">Expired</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            {/* Discount Type Filter */}
            <select
              value={discountTypeFilter}
              onChange={(e) => setDiscountTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Discount Types</option>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED_AMOUNT">Flat Amount (INR)</option>
              <option value="CUSTOM_PLAN_PRICE">Custom Plan Price</option>
            </select>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Target Plans</option>
              <option value="plan_starter">Starter Plan</option>
              <option value="plan_professional">Professional Plan</option>
              <option value="plan_enterprise">Enterprise Plan</option>
            </select>
          </div>

          {/* Offers Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Coupon / Title</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Eligibility & Min Order</th>
                    <th className="py-3 px-4">Validity</th>
                    <th className="py-3 px-4">Redemptions</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredOffers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        No offers found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOffers.map((offer) => {
                      const isExpired = offer.status === "EXPIRED";
                      const isActive = offer.status === "ACTIVE";
                      const isScheduled = offer.status === "SCHEDULED";
                      const isPaused = offer.status === "PAUSED";

                      return (
                        <tr key={offer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                          {/* Code & Title */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                {offer.code}
                              </span>
                              {offer.campaignName && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  {offer.campaignName}
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-white mt-1">{offer.name}</p>
                            <span className="text-[10px] text-slate-400">{offer.id}</span>
                          </td>

                          {/* Discount */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {offer.discountType === "PERCENTAGE"
                                ? `${offer.discountValue}% OFF`
                                : offer.discountType === "FIXED_AMOUNT"
                                ? `₹${(offer.discountValue / 100).toLocaleString("en-IN")} FLAT`
                                : `Custom ₹${(offer.discountValue / 100).toLocaleString("en-IN")}`}
                            </span>
                            {offer.maxDiscountCapPaise && (
                              <p className="text-[10px] text-slate-400">
                                Max Cap: ₹{(offer.maxDiscountCapPaise / 100).toLocaleString("en-IN")}
                              </p>
                            )}
                          </td>

                          {/* Eligibility & Min Order */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {offer.targetAudience === "NEW_CUSTOMERS_ONLY"
                                  ? "New Customers Only"
                                  : offer.targetAudience === "SPECIFIC_SCHOOLS"
                                  ? "Specific School"
                                  : "All Schools"}
                              </span>
                              <p className="text-[10px] text-slate-500">
                                Min Order: ₹{((offer.minOrderAmountPaise || 0) / 100).toLocaleString("en-IN")}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Plans: {offer.applicablePlans.includes("ALL") ? "All Plans" : offer.applicablePlans.join(", ")}
                              </p>
                            </div>
                          </td>

                          {/* Validity */}
                          <td className="py-3 px-4">
                            <div className="text-[11px] space-y-0.5">
                              <p>From: {offer.startDate ? offer.startDate.slice(0, 10) : "Immediate"}</p>
                              <p>To: {offer.endDate ? offer.endDate.slice(0, 10) : "Never Expires"}</p>
                            </div>
                          </td>

                          {/* Redemptions */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-white">{offer.usedCount || 0}</span>
                              <span className="text-slate-400">
                                / {offer.maxTotalRedemptions === -1 ? "∞" : offer.maxTotalRedemptions}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Spent: ₹{((offer.totalDiscountGivenPaise || 0) / 100).toLocaleString("en-IN")}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                isActive
                                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                  : isScheduled
                                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                                  : isPaused
                                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isActive ? "bg-emerald-500" : isScheduled ? "bg-blue-500" : isPaused ? "bg-amber-500" : "bg-rose-500"
                                }`}
                              />
                              {offer.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => setSelectedOfferDetail(offer)}
                                title="View Details & Analytics"
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(offer)}
                                title="Edit Offer"
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(offer)}
                                title={isActive ? "Pause Offer" : "Activate Offer"}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600"
                              >
                                {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleDuplicate(offer)}
                                title="Duplicate / Clone"
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-purple-600"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleArchive(offer)}
                                title="Archive Offer"
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAMPAIGNS */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-purple-600 dark:text-purple-400 font-bold">{camp.id}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {camp.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white mt-1">{camp.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{camp.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {camp.startDate.slice(0, 10)} to {camp.endDate ? camp.endDate.slice(0, 10) : "Open"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Spent / Budget:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      ₹{(camp.totalSpentPaise / 100).toLocaleString("en-IN")} /{" "}
                      {camp.budgetLimitPaise ? `₹${(camp.budgetLimitPaise / 100).toLocaleString("en-IN")}` : "No Limit"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenue Generated:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{(camp.totalRevenuePaise / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{camp.attachedOfferIds?.length || 0} attached offers</span>
                  <button
                    onClick={() => {
                      setStatusFilter("ALL");
                      setSearch(camp.id);
                      setActiveTab("offers");
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    View Offers <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REDEMPTIONS */}
      {activeTab === "redemptions" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Audit Trail & Redemption History</h3>
              <p className="text-xs text-slate-500">Every coupon used across checkout is atomically verified and tracked.</p>
            </div>
          </div>
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <Receipt className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="font-medium text-slate-600 dark:text-slate-300">Live Concurrency-Guarded Redemptions Store</p>
            <p className="mt-1">
              Total Recorded Redemptions: <strong>{metrics.totalRedemptions}</strong> across{" "}
              <strong>₹{metrics.totalRevenueGeneratedRupees.toLocaleString("en-IN")}</strong> in billing transactions.
            </p>
          </div>
        </div>
      )}

      {/* CREATE / EDIT OFFER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-600" />
                  {editingOffer ? `Edit Offer: ${editingOffer.code}` : "Create New Promotion / Coupon"}
                </h3>
                <p className="text-xs text-slate-500">Configure 22+ multi-criteria rules and discount policies.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOfferSubmit} className="space-y-4 text-xs">
              {/* Row 1: Code & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DIWALI50"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 uppercase font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Offer Title / Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50% Festive Season Discount"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Discount Type</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Flat Amount (INR)</option>
                    <option value="CUSTOM_PLAN_PRICE">Custom Override Price</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {form.discountType === "PERCENTAGE" ? "Discount % *" : "Discount Value (₹) *"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={form.discountType === "PERCENTAGE" ? 100 : 1000000}
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = no cap"
                    value={form.maxDiscountCapRupees}
                    onChange={(e) => setForm({ ...form, maxDiscountCapRupees: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Row 3: Minimum Order & Redemption Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.minOrderAmountRupees}
                    onChange={(e) => setForm({ ...form, minOrderAmountRupees: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Global Max Redemptions</label>
                  <input
                    type="number"
                    placeholder="-1 for unlimited"
                    value={form.maxTotalRedemptions}
                    onChange={(e) => setForm({ ...form, maxTotalRedemptions: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Limit Per School</label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxRedemptionsPerSchool}
                    onChange={(e) => setForm({ ...form, maxRedemptionsPerSchool: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Row 4: Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">End Date</label>
                    <label className="flex items-center gap-1 text-[11px] text-slate-500">
                      <input
                        type="checkbox"
                        checked={form.neverExpires}
                        onChange={(e) => setForm({ ...form, neverExpires: e.target.checked })}
                      />
                      Never Expires
                    </label>
                  </div>
                  <input
                    type="date"
                    disabled={form.neverExpires}
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Row 5: Targeting & Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Audience</label>
                  <select
                    value={form.targetAudience}
                    onChange={(e) => setForm({ ...form, targetAudience: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Schools</option>
                    <option value="NEW_CUSTOMERS_ONLY">New Schools Only (First Purchase)</option>
                    <option value="EXISTING_CUSTOMERS_ONLY">Existing / Renewal Customers</option>
                    <option value="SPECIFIC_SCHOOLS">Specific Target School</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Attach to Campaign</label>
                  <select
                    value={form.campaignId}
                    onChange={(e) => setForm({ ...form, campaignId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    <option value="">No Campaign (Standalone)</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Specific School Selector */}
              {form.targetAudience === "SPECIFIC_SCHOOLS" && (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Select Target School</label>
                  <input
                    type="text"
                    placeholder="Search school name or ID..."
                    value={schoolSearchQuery}
                    onChange={(e) => setSchoolSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {filteredSchools.map((s: any) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedSchool(s)}
                        className={`p-1.5 rounded text-xs cursor-pointer flex justify-between ${
                          selectedSchool?.id === s.id
                            ? "bg-blue-600 text-white font-bold"
                            : "hover:bg-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>{s.name}</span>
                        <span className="opacity-75">{s.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Terms & Conditions */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={form.termsAndConditions}
                  onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })}
                  placeholder="Terms displayed to users during checkout..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 transition"
                >
                  {submitting ? "Saving Offer..." : editingOffer ? "Update Offer" : "Create Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CAMPAIGN MODAL */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600" />
                  Create Promotion Campaign
                </h3>
                <p className="text-xs text-slate-500">Group offers under an umbrella marketing drive.</p>
              </div>
              <button
                onClick={() => setShowCampaignModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCampaignSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={campaignForm.startDate}
                    onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={campaignForm.endDate}
                    onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Campaign Discount Budget (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={campaignForm.budgetLimitRupees}
                  onChange={(e) => setCampaignForm({ ...campaignForm, budgetLimitRupees: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFER DETAILS & ANALYTICS DRAWER */}
      {selectedOfferDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-lg h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                  {selectedOfferDetail.code}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{selectedOfferDetail.name}</h3>
              </div>
              <button
                onClick={() => setSelectedOfferDetail(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Redemptions</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedOfferDetail.usedCount || 0}{" "}
                  <span className="text-xs text-slate-400">
                    / {selectedOfferDetail.maxTotalRedemptions === -1 ? "∞" : selectedOfferDetail.maxTotalRedemptions}
                  </span>
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Total Discount</span>
                <p className="text-lg font-bold text-amber-600 mt-0.5">
                  ₹{((selectedOfferDetail.totalDiscountGivenPaise || 0) / 100).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Revenue Generated</span>
                <p className="text-lg font-bold text-emerald-600 mt-0.5">
                  ₹{((selectedOfferDetail.totalRevenueGeneratedPaise || 0) / 100).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Status</span>
                <p className="text-lg font-bold text-blue-600 mt-0.5">{selectedOfferDetail.status}</p>
              </div>
            </div>

            {/* Rule Specs */}
            <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-4">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Rule Specifications
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                <div>Discount Type:</div>
                <div className="font-semibold text-slate-900 dark:text-white">{selectedOfferDetail.discountType}</div>
                <div>Discount Value:</div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {selectedOfferDetail.discountType === "PERCENTAGE"
                    ? `${selectedOfferDetail.discountValue}%`
                    : `₹${selectedOfferDetail.discountValue / 100}`}
                </div>
                <div>Max Discount Cap:</div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {selectedOfferDetail.maxDiscountCapPaise
                    ? `₹${selectedOfferDetail.maxDiscountCapPaise / 100}`
                    : "No Cap"}
                </div>
                <div>Min Order Requirement:</div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  ₹{(selectedOfferDetail.minOrderAmountPaise || 0) / 100}
                </div>
                <div>Target Audience:</div>
                <div className="font-semibold text-slate-900 dark:text-white">{selectedOfferDetail.targetAudience}</div>
                <div>Limit per School:</div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {selectedOfferDetail.maxRedemptionsPerSchool}
                </div>
                <div>Stackable:</div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {selectedOfferDetail.isStackable ? "Yes" : "No"}
                </div>
              </div>
            </div>

            {/* Terms */}
            {selectedOfferDetail.termsAndConditions && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-1">
                  Terms & Conditions
                </h4>
                <p className="text-slate-500 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  {selectedOfferDetail.termsAndConditions}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedOfferDetail(null);
                  handleOpenEdit(selectedOfferDetail);
                }}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                Edit Offer
              </button>
              <button
                onClick={() => setSelectedOfferDetail(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
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
