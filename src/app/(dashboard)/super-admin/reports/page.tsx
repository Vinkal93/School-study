"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Building2,
  CreditCard,
  Users,
  Tag,
  Shield,
  MessageSquare,
  Download,
  Plus,
  RefreshCw,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  FileType,
  Sliders,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type {
  SuperAdminReportType,
  ReportDataResult,
  ReportExportFormat,
  CustomOfferRecord,
  CustomPlanAccessRecord,
} from "@/types/reports";
import { toast } from "sonner";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, setDoc, collection } from "firebase/firestore";

const GLOBAL_REPORTS: { type: SuperAdminReportType; title: string; desc: string; icon: any }[] = [
  { type: "GLOBAL_SCHOOLS", title: "All Schools Directory", desc: "Institutions, admins, active plans, student sizes", icon: Building2 },
  { type: "GLOBAL_SUBSCRIPTIONS", title: "Subscriptions & Expiries", desc: "Plan tiers, expiry countdown, access modes", icon: CreditCard },
  { type: "GLOBAL_REVENUE", title: "Platform Revenue & Gateway", desc: "Gross SaaS payments, Razorpay settlements", icon: DollarSign },
  { type: "GLOBAL_USERS", title: "All User Accounts", desc: "Admins, teachers, students directory", icon: Users },
  { type: "GLOBAL_COUPONS", title: "Coupons & Discounts", desc: "Active codes, redemptions, discount limits", icon: Tag },
  { type: "GLOBAL_AUDIT_LOGS", title: "System Audit Trail", desc: "Admin mutations, adjustments, security events", icon: Shield },
  { type: "GLOBAL_INQUIRIES", title: "Sales Inquiries & Leads", desc: "Public submissions, conversion statuses", icon: MessageSquare },
];

export default function SuperAdminReportsPage() {
  const { firebaseUser, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"reports" | "offers" | "demo">("reports");

  // Report Preview & Export State
  const [selectedReportType, setSelectedReportType] = useState<SuperAdminReportType>("GLOBAL_SCHOOLS");
  const [reportData, setReportData] = useState<ReportDataResult | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ReportExportFormat | null>(null);

  // Custom Offers State
  const [offers, setOffers] = useState<CustomOfferRecord[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState({
    schoolId: "",
    schoolName: "",
    offerPlanId: "professional",
    originalPriceRupees: 1999,
    customPriceRupees: 999,
    durationDays: 30,
    couponCode: "",
    expiresInDays: 14,
    notes: "",
  });

  // Demo Access State
  const [demoRecords, setDemoRecords] = useState<CustomPlanAccessRecord[]>([]);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoForm, setDemoForm] = useState({
    schoolId: "",
    schoolName: "",
    accessTier: "PROFESSIONAL" as "PROFESSIONAL" | "ENTERPRISE",
    durationDays: 7,
    reason: "VIP Onboarding Demo",
  });

  const loadGlobalReport = async (type: SuperAdminReportType) => {
    setSelectedReportType(type);
    setLoadingReport(true);
    try {
      const res = await fetch("/api/reports/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: type,
          actorId: profile?.email || firebaseUser?.uid || "super_admin",
          actorRole: "super_admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load global report.");
      setReportData(json.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate report.");
      setReportData(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExport = async (format: ReportExportFormat) => {
    setExportingFormat(format);
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: selectedReportType,
          format,
          actorId: profile?.email || "super_admin",
          actorRole: "super_admin",
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Export failed.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedReportType.toLowerCase()}_global_report.${format === "xlsx" ? "xlsx" : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${format.toUpperCase()} report exported successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Export failed.");
    } finally {
      setExportingFormat(null);
    }
  };

  const loadOffers = async () => {
    setLoadingOffers(true);
    try {
      const res = await fetch("/api/super-admin/custom-offers");
      const json = await res.json();
      if (json.success) setOffers(json.offers || []);
    } catch (e) {
    } finally {
      setLoadingOffers(false);
    }
  };

  const loadDemoRecords = async () => {
    setLoadingDemo(true);
    try {
      const res = await fetch("/api/super-admin/custom-access");
      const json = await res.json();
      if (json.success) setDemoRecords(json.records || []);
    } catch (e) {
    } finally {
      setLoadingDemo(false);
    }
  };

  useEffect(() => {
    loadGlobalReport("GLOBAL_SCHOOLS");
    loadOffers();
    loadDemoRecords();
  }, []);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerForm.schoolId.trim()) {
      toast.error("Please enter a valid school ID.");
      return;
    }

    try {
      // 1. Try API Endpoint first
      const res = await fetch("/api/super-admin/custom-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...offerForm,
          actorId: profile?.email || firebaseUser?.uid || "super_admin",
        }),
      });

      if (res.ok) {
        const json = await res.json();
        toast.success(json.message || "Custom offer created successfully!");
        setShowOfferModal(false);
        loadOffers();
        return;
      }

      // 2. Client SDK Fallback if API route encounters network or permission error
      const db = getFirebaseDb();
      if (!db) throw new Error("Database unavailable.");

      const durationDays = offerForm.durationDays || 30;
      const expiresInDays = offerForm.expiresInDays || 14;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expiresInDays * 86400000).toISOString();
      const originalPaise = Math.round((offerForm.originalPriceRupees || 1999) * 100);
      const customPaise = Math.round((offerForm.customPriceRupees || 999) * 100);

      const offerRef = doc(collection(db, "customOffers"));
      const offerRecord: CustomOfferRecord = {
        id: offerRef.id,
        schoolId: offerForm.schoolId.trim(),
        schoolName: offerForm.schoolName.trim() || offerForm.schoolId.trim(),
        originalPlanId: "starter",
        offerPlanId: offerForm.offerPlanId,
        originalPricePaise: originalPaise,
        customPricePaise: customPaise,
        durationDays,
        discountPaise: Math.max(0, originalPaise - customPaise),
        couponCode: offerForm.couponCode?.trim().toUpperCase(),
        status: "ACTIVE",
        expiresAt,
        notes: offerForm.notes?.trim() || "Super Admin custom offer",
        createdBy: profile?.email || firebaseUser?.uid || "super_admin",
        createdAt: now.toISOString(),
      };

      await setDoc(offerRef, offerRecord);

      toast.success(`Custom offer of ₹${offerForm.customPriceRupees} created successfully!`);
      setShowOfferModal(false);
      loadOffers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create offer.");
    }
  };

  const handleCreateDemoAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoForm.schoolId.trim()) {
      toast.error("Please enter a valid school ID.");
      return;
    }

    try {
      const res = await fetch("/api/super-admin/custom-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...demoForm,
          actorId: profile?.email || firebaseUser?.uid || "super_admin",
        }),
      });

      if (res.ok) {
        const json = await res.json();
        toast.success(json.message || "Demo access granted!");
        setShowDemoModal(false);
        loadDemoRecords();
        return;
      }

      // Client Fallback
      const db = getFirebaseDb();
      if (!db) throw new Error("Database unavailable.");

      const now = new Date();
      const durationDays = demoForm.durationDays || 7;
      const endAt = new Date(now.getTime() + durationDays * 86400000).toISOString();

      const accessRef = doc(collection(db, "customPlanAccess"));
      const record: CustomPlanAccessRecord = {
        id: accessRef.id,
        schoolId: demoForm.schoolId.trim(),
        schoolName: demoForm.schoolName.trim() || demoForm.schoolId.trim(),
        accessTier: demoForm.accessTier,
        featuresGranted: ["advanced_reports", "attendance_automation", "notices_announcements"],
        durationDays,
        startAt: now.toISOString(),
        endAt,
        isDemo: true,
        reason: demoForm.reason || "Demo access preview",
        status: "ACTIVE",
        createdBy: profile?.email || firebaseUser?.uid || "super_admin",
        createdAt: now.toISOString(),
      };

      await setDoc(accessRef, record);

      toast.success(`${demoForm.accessTier} demo access granted for ${durationDays} days!`);
      setShowDemoModal(false);
      loadDemoRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to grant demo access.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-purple-600" />
            <span>Platform Reports, Custom Offers & Demo Access</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Global cross-tenant reports, school-specific pricing offers, and demo plan overrides.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "reports"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Global Reports
          </button>
          <button
            onClick={() => setActiveTab("offers")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "offers"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Custom Offers
          </button>
          <button
            onClick={() => setActiveTab("demo")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "demo"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Demo Access
          </button>
        </div>
      </div>

      {/* TAB 1: GLOBAL PLATFORM REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          {/* Quick Select Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {GLOBAL_REPORTS.map((r) => {
              const Icon = r.icon;
              const isSelected = selectedReportType === r.type;
              return (
                <button
                  key={r.type}
                  onClick={() => loadGlobalReport(r.type)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                  }`}
                >
                  <Icon className={`h-4 w-4 mb-2 ${isSelected ? "text-blue-600" : "text-slate-500"}`} />
                  <p className="text-xs font-bold leading-tight line-clamp-1">{r.title}</p>
                </button>
              );
            })}
          </div>

          {/* Report Workspace */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">{reportData?.title || "Report Preview"}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{reportData?.description}</p>
              </div>

              {/* Export Toolbar */}
              <div className="flex items-center gap-2">
                <button
                  disabled={loadingReport || Boolean(exportingFormat)}
                  onClick={() => loadGlobalReport(selectedReportType)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingReport ? "animate-spin" : ""}`} />
                </button>
                <button
                  disabled={exportingFormat !== null}
                  onClick={() => handleExport("csv")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-all"
                >
                  <FileType className="h-4 w-4 text-emerald-600" />
                  <span>CSV</span>
                </button>
                <button
                  disabled={exportingFormat !== null}
                  onClick={() => handleExport("xlsx")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-all"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>Excel</span>
                </button>
                <button
                  disabled={exportingFormat !== null}
                  onClick={() => handleExport("pdf")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            {reportData?.summaryMetrics && reportData.summaryMetrics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {reportData.summaryMetrics.map((m, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{m.label}</p>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Data Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    {reportData?.columns.map((col) => (
                      <th key={col.key} className="px-4 py-3">
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {reportData?.rows.map((row, rIdx) => (
                    <tr key={row.id || rIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      {reportData.columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {col.type === "badge" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {row[col.key] || "ACTIVE"}
                            </span>
                          ) : col.type === "currency" ? (
                            <span className="font-semibold text-slate-900 dark:text-white">
                              ₹{Number(row[col.key] || 0).toLocaleString("en-IN")}
                            </span>
                          ) : (
                            row[col.key] || "-"
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOM OFFERS MANAGER */}
      {activeTab === "offers" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">School-Specific Custom Offers</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grant tailored plan pricing (e.g. Professional for ₹999) without modifying the global plan price.
              </p>
            </div>
            <button
              onClick={() => setShowOfferModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create Custom Offer</span>
            </button>
          </div>

          {/* Offers Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Offer Plan</th>
                  <th className="px-4 py-3">Custom Price</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {offers.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{o.schoolName || o.schoolId}</td>
                    <td className="px-4 py-3 uppercase font-semibold text-purple-600">{o.offerPlanId}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">₹{(o.customPricePaise / 100).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-slate-500">₹{(o.discountPaise / 100).toLocaleString("en-IN")} OFF</td>
                    <td className="px-4 py-3">{o.durationDays} Days</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        o.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(o.expiresAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {offers.length === 0 && !loadingOffers && (
              <div className="text-center py-12 text-xs text-slate-500">No custom offers created yet.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DEMO & CUSTOM PLAN ACCESS */}
      {activeTab === "demo" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Demo & VIP Plan Overrides</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grant temporary full feature access (7 or 30 days) to any institution for demo and evaluation.
              </p>
            </div>
            <button
              onClick={() => setShowDemoModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-sm transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Grant Demo Access</span>
            </button>
          </div>

          {/* Demo Records Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Granted Tier</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Access End</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {demoRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{r.schoolName || r.schoolId}</td>
                    <td className="px-4 py-3 font-semibold text-purple-600">{r.accessTier}</td>
                    <td className="px-4 py-3">{r.durationDays} Days</td>
                    <td className="px-4 py-3 text-slate-500">{r.reason}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(r.endAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {demoRecords.length === 0 && !loadingDemo && (
              <div className="text-center py-12 text-xs text-slate-500">No demo overrides active.</div>
            )}
          </div>
        </div>
      )}

      {/* CREATE OFFER MODAL */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Create School-Specific Offer</h3>
            <form onSubmit={handleCreateOffer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">School ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. school_abc123"
                  value={offerForm.schoolId}
                  onChange={(e) => setOfferForm({ ...offerForm, schoolId: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">School Name</label>
                <input
                  type="text"
                  placeholder="e.g. Delhi Public Academy"
                  value={offerForm.schoolName}
                  onChange={(e) => setOfferForm({ ...offerForm, schoolName: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Custom Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={offerForm.customPriceRupees}
                    onChange={(e) => setOfferForm({ ...offerForm, customPriceRupees: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Duration (Days)</label>
                  <input
                    type="number"
                    value={offerForm.durationDays}
                    onChange={(e) => setOfferForm({ ...offerForm, durationDays: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700"
                >
                  Publish Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRANT DEMO MODAL */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Grant Demo Plan Access</h3>
            <form onSubmit={handleCreateDemoAccess} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">School ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. school_abc123"
                  value={demoForm.schoolId}
                  onChange={(e) => setDemoForm({ ...demoForm, schoolId: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Demo Tier</label>
                <select
                  value={demoForm.accessTier}
                  onChange={(e) => setDemoForm({ ...demoForm, accessTier: e.target.value as any })}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="PROFESSIONAL">Professional Tier (Advanced Reports & Attendance)</option>
                  <option value="ENTERPRISE">Enterprise Tier (Unlimited Capacities)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Duration (Days)</label>
                <input
                  type="number"
                  value={demoForm.durationDays}
                  onChange={(e) => setDemoForm({ ...demoForm, durationDays: Number(e.target.value) })}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Reason</label>
                <input
                  type="text"
                  value={demoForm.reason}
                  onChange={(e) => setDemoForm({ ...demoForm, reason: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDemoModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700"
                >
                  Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
