"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  Filter,
  ShieldCheck,
  Server,
  Layers,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
} from "lucide-react";
import type {
  ArchitectureNode,
  ArchitectureEdge,
  ArchitectureDiagramType,
  ComponentCategory,
} from "@/types/architecture-intelligence";

interface Props {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

const CATEGORY_COLORS: Record<ComponentCategory, { bg: string; border: string; text: string; headerBg: string }> = {
  FRONTEND: { bg: "bg-blue-50/80", border: "border-blue-400", text: "text-blue-800", headerBg: "bg-blue-600" },
  API_GATEWAY: { bg: "bg-purple-50/80", border: "border-purple-400", text: "text-purple-800", headerBg: "bg-purple-600" },
  AUTH_IDENTITY: { bg: "bg-emerald-50/80", border: "border-emerald-400", text: "text-emerald-800", headerBg: "bg-emerald-600" },
  BUSINESS_CORE: { bg: "bg-indigo-50/80", border: "border-indigo-400", text: "text-indigo-800", headerBg: "bg-indigo-600" },
  DATABASE_STORAGE: { bg: "bg-amber-50/80", border: "border-amber-400", text: "text-amber-800", headerBg: "bg-amber-600" },
  PAYMENT_BILLING: { bg: "bg-teal-50/80", border: "border-teal-400", text: "text-teal-800", headerBg: "bg-teal-600" },
  COMMUNICATION: { bg: "bg-sky-50/80", border: "border-sky-400", text: "text-sky-800", headerBg: "bg-sky-600" },
  TELEMETRY_MONITORING: { bg: "bg-rose-50/80", border: "border-rose-400", text: "text-rose-800", headerBg: "bg-rose-600" },
  SECURITY_FIREWALL: { bg: "bg-red-50/80", border: "border-red-400", text: "text-red-800", headerBg: "bg-red-600" },
  MOBILE_RUNTIME: { bg: "bg-cyan-50/80", border: "border-cyan-400", text: "text-cyan-800", headerBg: "bg-cyan-600" },
  EXTERNAL_INTEGRATION: { bg: "bg-slate-50/80", border: "border-slate-400", text: "text-slate-800", headerBg: "bg-slate-600" },
};

export default function ArchitectureVisualizer({ nodes, edges }: Props) {
  const [diagramType, setDiagramType] = useState<ArchitectureDiagramType>("TECHNICAL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter nodes based on selected diagram type, search query, and category
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      // 1. Diagram Type Filter
      if (diagramType === "INVESTOR_SIMPLIFIED") {
        const investorCrucial = [
          "FRONTEND_PWA",
          "NEXTJS_API_GATEWAY",
          "FIREBASE_AUTH_IAM",
          "FIRESTORE_DATABASE",
          "RAZORPAY_GATEWAY",
          "COMMUNICATION_HUB",
          "SECURITY_RATE_LIMITER",
        ];
        if (!investorCrucial.includes(node.id)) return false;
      } else if (diagramType === "BUSINESS_PROCESS") {
        const businessCrucial = [
          "FRONTEND_PWA",
          "NEXTJS_API_GATEWAY",
          "FIREBASE_AUTH_IAM",
          "BUSINESS_LOGIC_CORE",
          "FIRESTORE_DATABASE",
          "RAZORPAY_GATEWAY",
          "COMMUNICATION_HUB",
        ];
        if (!businessCrucial.includes(node.id)) return false;
      }

      // 2. Category Filter
      if (selectedCategory !== "ALL" && node.category !== selectedCategory) {
        return false;
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = node.name.toLowerCase().includes(q);
        const matchesTech = node.technology.toLowerCase().includes(q);
        const matchesDesc = node.description.toLowerCase().includes(q);
        const matchesCategory = node.category.toLowerCase().includes(q);
        if (!matchesName && !matchesTech && !matchesDesc && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [nodes, diagramType, selectedCategory, searchQuery]);

  // Edges between currently filtered nodes
  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [edges, filteredNodes]);

  // Pan / Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".node-card")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.15, 2.0));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 20, y: 20 });
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm overflow-hidden transition-all ${
        isFullscreen ? "h-screen rounded-none" : "h-[740px]"
      }`}
    >
      {/* Top Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 px-4 py-3 backdrop-blur-md">
        {/* Diagram Type Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700 text-xs font-medium">
          <button
            onClick={() => setDiagramType("TECHNICAL")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              diagramType === "TECHNICAL"
                ? "bg-blue-600 text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Technical Topology
          </button>
          <button
            onClick={() => setDiagramType("BUSINESS_PROCESS")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              diagramType === "BUSINESS_PROCESS"
                ? "bg-blue-600 text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Business Process Flow
          </button>
          <button
            onClick={() => setDiagramType("INVESTOR_SIMPLIFIED")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              diagramType === "INVESTOR_SIMPLIFIED"
                ? "bg-blue-600 text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Investor Simplified
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search components or tech..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8.5 w-48 sm:w-60 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-8 pr-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-8.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 text-xs text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none shadow-2xs"
          >
            <option value="ALL">All Categories</option>
            <option value="FRONTEND">Frontend</option>
            <option value="API_GATEWAY">API Gateway</option>
            <option value="AUTH_IDENTITY">Auth & Identity</option>
            <option value="BUSINESS_CORE">Business Core</option>
            <option value="DATABASE_STORAGE">Database & Storage</option>
            <option value="PAYMENT_BILLING">Payments & Billing</option>
            <option value="COMMUNICATION">Messaging Hub</option>
            <option value="SECURITY_FIREWALL">Security & WAF</option>
            <option value="TELEMETRY_MONITORING">Telemetry</option>
          </select>
        </div>

        {/* Zoom & Canvas Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition shadow-2xs"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition shadow-2xs"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetZoom}
            title="Reset View"
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition shadow-2xs"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition shadow-2xs"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Interactive Drag Canvas */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing select-none overflow-hidden bg-slate-50/60 dark:bg-gray-950/60"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          backgroundImage: "radial-gradient(rgba(100, 116, 139, 0.22) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div
          className="relative transition-transform duration-75 origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: "1800px",
            height: "900px",
          }}
        >
          {/* SVG Connector Edges */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full">
            <defs>
              <marker
                id="arrow-default"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
              </marker>
              <marker
                id="arrow-green"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
              </marker>
            </defs>

            {filteredEdges.map((edge) => {
              const srcNode = nodes.find((n) => n.id === edge.source);
              const tgtNode = nodes.find((n) => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;

              const srcX = srcNode.x + 130;
              const srcY = srcNode.y + 45;
              const tgtX = tgtNode.x + 130;
              const tgtY = tgtNode.y + 45;
              const midX = (srcX + tgtX) / 2;
              const midY = (srcY + tgtY) / 2;

              // Cubic bezier curve path
              const dx = tgtX - srcX;
              const curveX = srcX + dx * 0.5;
              const pathD = `M ${srcX} ${srcY} C ${curveX} ${srcY}, ${curveX} ${tgtY}, ${tgtX} ${tgtY}`;

              return (
                <g key={edge.id} className="transition-opacity duration-300">
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeDasharray={edge.protocol.includes("WEBHOOK") ? "5,5" : "none"}
                    markerEnd="url(#arrow-default)"
                    className="opacity-75 hover:opacity-100 transition-opacity"
                  />
                  {/* Edge Protocol Tag */}
                  <rect
                    x={midX - 38}
                    y={midY - 9}
                    width="76"
                    height="18"
                    rx="5"
                    fill="#ffffff"
                    stroke="#cbd5e1"
                    strokeWidth="1"
                    className="shadow-2xs"
                  />
                  <text
                    x={midX}
                    y={midY + 4}
                    textAnchor="middle"
                    fill="#334155"
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="monospace"
                  >
                    {edge.protocol}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Node Cards */}
          {filteredNodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`node-card absolute z-10 w-[260px] rounded-2xl border bg-white dark:bg-gray-900 p-4 shadow-sm backdrop-blur-md cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-blue-400 ${
                  isSelected
                    ? "border-blue-600 ring-2 ring-blue-500/30 shadow-md"
                    : "border-gray-200 dark:border-gray-700"
                }`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                }}
              >
                {/* Header Banner */}
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
                    {node.category.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      node.healthStatus === "HEALTHY"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60"
                        : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {node.healthStatus}
                  </span>
                </div>

                {/* Node Title & Description */}
                <div className="mt-2.5">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center justify-between">
                    {node.name}
                    <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
                  </h4>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {node.description}
                  </p>
                </div>

                {/* Tech Badge */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="font-mono text-gray-700 dark:text-gray-300 truncate max-w-[170px]">
                    {node.technology.split(",")[0]}
                  </span>
                  <span className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[9px] text-gray-700 dark:text-gray-300 uppercase font-bold border border-gray-200 dark:border-gray-700">
                    {node.environment}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="absolute right-0 top-12 bottom-0 z-30 w-80 sm:w-96 border-l border-gray-200 dark:border-gray-800 bg-white/98 dark:bg-gray-900/98 p-5 shadow-2xl backdrop-blur-xl overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {selectedNode.category.replace(/_/g, " ")}
              </span>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">{selectedNode.name}</h3>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-4 text-xs text-gray-600 dark:text-gray-300">
            <div>
              <span className="text-gray-400 dark:text-gray-500 font-semibold uppercase text-[10px] tracking-wider">Purpose</span>
              <p className="mt-1 text-gray-800 dark:text-gray-200 leading-relaxed">{selectedNode.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-3.5 border border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-gray-400 dark:text-gray-500 text-[10px] block">Technology</span>
                <span className="text-gray-900 dark:text-white font-medium">{selectedNode.technology}</span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 text-[10px] block">Runtime</span>
                <span className="text-gray-900 dark:text-white font-medium">{selectedNode.runtime}</span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 text-[10px] block">Owner / Team</span>
                <span className="text-gray-900 dark:text-white font-medium">{selectedNode.owner}</span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 text-[10px] block">Verification</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{selectedNode.verificationState}</span>
              </div>
            </div>

            {/* Features Covered */}
            {selectedNode.featuresCovered.length > 0 && (
              <div>
                <span className="text-gray-400 dark:text-gray-500 font-semibold uppercase text-[10px] tracking-wider">Integrated Capabilities</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedNode.featuresCovered.map((feat) => (
                    <span
                      key={feat}
                      className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Security Controls */}
            {selectedNode.securityControls.length > 0 && (
              <div>
                <span className="text-gray-400 dark:text-gray-500 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <Lock className="h-3 w-3 text-emerald-600" />
                  Security Enforcements
                </span>
                <ul className="mt-1.5 space-y-1">
                  {selectedNode.securityControls.map((sec) => (
                    <li key={sec} className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span>{sec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Inbound & Outbound Connections */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-gray-400 dark:text-gray-500 font-semibold uppercase text-[10px] tracking-wider">Dependency Graph</span>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-2.5 border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400 block text-[10px]">Depends On ({selectedNode.dependencies.length})</span>
                  <span className="text-blue-600 dark:text-blue-400 font-mono text-[11px] font-medium">
                    {selectedNode.dependencies.length > 0 ? selectedNode.dependencies.join(", ") : "None (Root Ingress)"}
                  </span>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-2.5 border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400 block text-[10px]">Supplies Data To ({selectedNode.dataOutputs.length})</span>
                  <span className="text-blue-600 dark:text-blue-400 font-mono text-[11px] font-medium">
                    {selectedNode.dataOutputs.length > 0 ? selectedNode.dataOutputs.join(", ") : "Terminal Node"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend Footer */}
      <div className="absolute bottom-2 left-4 z-20 hidden md:flex items-center gap-4 rounded-xl bg-white/95 dark:bg-gray-900/95 px-3.5 py-1.5 text-[11px] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-md">
        <span className="font-semibold text-gray-800 dark:text-gray-200">Directional Flow:</span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-blue-600 inline-block" /> HTTPS / REST
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-emerald-500 inline-block" /> Database Connection
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-blue-400 inline-block" /> Webhook HMAC
        </span>
      </div>
    </div>
  );
}
