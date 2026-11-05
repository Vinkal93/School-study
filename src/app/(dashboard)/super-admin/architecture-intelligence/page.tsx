"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Layers,
  Network,
  Cpu,
  Database,
  ShieldCheck,
  TrendingUp,
  Sliders,
  FileText,
  Download,
  Presentation,
  RotateCw,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lock,
  DollarSign,
  Building,
  Users,
  Search,
  ChevronRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import type {
  ArchitectureIntelligenceOverview,
  ArchitectureNode,
  ArchitectureEdge,
  IntegrationEntity,
  FeatureCapability,
  DatabaseEntity,
  DataFlowModel,
  SecurityControlItem,
  BusinessIntelligenceMetrics,
  CapacityPreset,
  CapacityProjection,
  InvestorSlide,
} from "@/types/architecture-intelligence";

import ArchitectureVisualizer from "@/components/architecture-intelligence/ArchitectureVisualizer";
import IntegrationRegistryView from "@/components/architecture-intelligence/IntegrationRegistryView";
import FeatureExplorerView from "@/components/architecture-intelligence/FeatureExplorerView";
import DatabaseDataFlowView from "@/components/architecture-intelligence/DatabaseDataFlowView";
import InfrastructureHealthView from "@/components/architecture-intelligence/InfrastructureHealthView";
import SecurityComplianceView from "@/components/architecture-intelligence/SecurityComplianceView";
import BusinessIntelligenceView from "@/components/architecture-intelligence/BusinessIntelligenceView";
import CapacitySimulatorView from "@/components/architecture-intelligence/CapacitySimulatorView";
import InvestorPresentationModal from "@/components/architecture-intelligence/InvestorPresentationModal";
import DocumentationExportModal from "@/components/architecture-intelligence/DocumentationExportModal";

type TabId =
  | "visualizer"
  | "integrations"
  | "features"
  | "database"
  | "infrastructure"
  | "security"
  | "business"
  | "capacity";

export default function ArchitectureInvestorCenterPage() {
  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("visualizer");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Data States
  const [overview, setOverview] = useState<ArchitectureIntelligenceOverview | null>(null);
  const [nodes, setNodes] = useState<ArchitectureNode[]>([]);
  const [edges, setEdges] = useState<ArchitectureEdge[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationEntity[]>([]);
  const [features, setFeatures] = useState<FeatureCapability[]>([]);
  const [databaseEntities, setDatabaseEntities] = useState<DatabaseEntity[]>([]);
  const [dataFlows, setDataFlows] = useState<DataFlowModel[]>([]);
  const [securityControls, setSecurityControls] = useState<SecurityControlItem[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessIntelligenceMetrics | null>(null);
  const [capacityPresets, setCapacityPresets] = useState<CapacityPreset[]>([]);
  const [capacityProjection, setCapacityProjection] = useState<CapacityProjection | null>(null);

  // Modal States
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [presentationSlides, setPresentationSlides] = useState<InvestorSlide[]>([]);
  const [exportOpen, setExportOpen] = useState(false);

  // Fetch token securely
  const getAuthToken = useCallback(async () => {
    if (firebaseUser) {
      return await firebaseUser.getIdToken().catch(() => "");
    }
    return "";
  }, [firebaseUser]);

  // Load Primary Architecture Data
  const loadArchitectureData = useCallback(async () => {
    try {
      setRefreshing(true);
      const token = await getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/super-admin/architecture-intelligence", { headers });
      const json = await res.json();

      if (json.success && json.data) {
        setOverview(json.data.overview);
        setNodes(json.data.nodes || []);
        setEdges(json.data.edges || []);
        setIntegrations(json.data.integrations || []);
        setFeatures(json.data.features || []);
        setDatabaseEntities(json.data.databaseEntities || []);
        setDataFlows(json.data.dataFlows || []);
        setSecurityControls(json.data.securityControls || []);
        setBusinessMetrics(json.data.businessMetrics || null);
        setCapacityPresets(json.data.capacityPresets || []);
        setCapacityProjection(json.data.defaultCapacityProjection || null);
      } else {
        toast.error(json.error || "Failed to load architecture intelligence.");
      }
    } catch (err: any) {
      console.error("Load architecture data error:", err);
      toast.error("Network error loading architecture center.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthToken]);

  // Load Presentation Slides
  const loadPresentation = async () => {
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/super-admin/architecture-intelligence/presentation", { headers });
      const json = await res.json();
      if (json.success && json.data?.slides) {
        setPresentationSlides(json.data.slides);
        setPresentationOpen(true);
      } else {
        toast.error("Unable to load presentation deck.");
      }
    } catch (err) {
      toast.error("Failed to initialize presentation mode.");
    }
  };

  useEffect(() => {
    loadArchitectureData();
  }, [loadArchitectureData]);

  if (loading) {
    return (
      <div className="flex min-h-[600px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="text-sm font-medium text-slate-500">
          Loading Architecture & Investor Intelligence 5.0...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              Executive Architecture 5.0
            </span>
            <span className="text-xs text-slate-400 font-mono">Zero-Trust ASVS 5.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
            Architecture & Investor Intelligence Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Factual repository topology, verified third-party integrations, live financial traction, and interactive capacity planning.
          </p>
        </div>

        {/* Executive Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => loadArchitectureData()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
            Refresh
          </button>

          <button
            onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Export Dossier
          </button>

          <button
            onClick={loadPresentation}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-700 transition"
          >
            <Presentation className="h-4 w-4" />
            Investor Presentation Mode
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      {overview && businessMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Verified Modules</span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">{overview.verifiedModulesCount}</span>
            <span className="text-[10px] text-emerald-600 font-semibold">100% Documented</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Cloud Integrations</span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
              {overview.activeIntegrationsCount} / {overview.totalIntegrationsCount}
            </span>
            <span className="text-[10px] text-indigo-600 font-semibold">All Active & Health-Checked</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Firestore Schemas</span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">{overview.databaseEntitiesCount}</span>
            <span className="text-[10px] text-slate-500 font-medium">Multi-Tenant Partitioned</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Monthly Run Rate</span>
            <span className="text-xl font-extrabold text-emerald-600 mt-0.5 block">
              ₹{businessMetrics.monthlyRecurringRevenueInr.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">
              ₹{(businessMetrics.annualRecurringRevenueRunRateInr / 100000).toFixed(1)}L ARR
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Paying Schools</span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
              {businessMetrics.paidSchools} / {businessMetrics.totalRegisteredSchools}
            </span>
            <span className="text-[10px] text-purple-600 font-semibold">{businessMetrics.conversionRatePercent}% Conversion</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Security Controls</span>
            <span className="text-xl font-extrabold text-emerald-600 mt-0.5 block">
              {overview.verifiedSecurityControlsCount} Verified
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">ASVS 5.0 Compliant</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("visualizer")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "visualizer"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Network className="h-4 w-4" />
          Interactive Visualizer
        </button>

        <button
          onClick={() => setActiveTab("integrations")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "integrations"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Cpu className="h-4 w-4" />
          Integrations Registry ({integrations.length})
        </button>

        <button
          onClick={() => setActiveTab("features")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "features"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Layers className="h-4 w-4" />
          Feature Capabilities ({features.length})
        </button>

        <button
          onClick={() => setActiveTab("database")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "database"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Database className="h-4 w-4" />
          Database & Data Flows
        </button>

        <button
          onClick={() => setActiveTab("infrastructure")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "infrastructure"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Server className="h-4 w-4" />
          Infrastructure & Health
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "security"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Security Matrix
        </button>

        <button
          onClick={() => setActiveTab("business")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "business"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Business Intelligence
        </button>

        <button
          onClick={() => setActiveTab("capacity")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "capacity"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Sliders className="h-4 w-4" />
          Capacity Simulator
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "visualizer" && (
        <ArchitectureVisualizer nodes={nodes} edges={edges} />
      )}

      {activeTab === "integrations" && (
        <IntegrationRegistryView integrations={integrations} />
      )}

      {activeTab === "features" && (
        <FeatureExplorerView features={features} />
      )}

      {activeTab === "database" && (
        <DatabaseDataFlowView entities={databaseEntities} dataFlows={dataFlows} />
      )}

      {activeTab === "infrastructure" && overview && (
        <InfrastructureHealthView overview={overview} />
      )}

      {activeTab === "security" && (
        <SecurityComplianceView controls={securityControls} />
      )}

      {activeTab === "business" && businessMetrics && (
        <BusinessIntelligenceView metrics={businessMetrics} />
      )}

      {activeTab === "capacity" && capacityProjection && (
        <CapacitySimulatorView
          presets={capacityPresets}
          initialProjection={capacityProjection}
        />
      )}

      {/* Investor Presentation Full-screen Modal */}
      <InvestorPresentationModal
        isOpen={presentationOpen}
        onClose={() => setPresentationOpen(false)}
        slides={presentationSlides}
      />

      {/* Documentation Export Modal */}
      {overview && businessMetrics && (
        <DocumentationExportModal
          isOpen={exportOpen}
          onClose={() => setExportOpen(false)}
          overview={overview}
          integrations={integrations}
          businessMetrics={businessMetrics}
          securityControls={securityControls}
        />
      )}
    </div>
  );
}
