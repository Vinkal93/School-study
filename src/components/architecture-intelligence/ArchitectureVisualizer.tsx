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

  // Filter nodes for active diagram type and category
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const inDiagram = n.diagrams.includes(diagramType);
      const matchesCategory = selectedCategory === "ALL" || n.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.technology.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.featuresCovered.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
      return inDiagram && matchesCategory && matchesSearch;
    });
  }, [nodes, diagramType, selectedCategory, searchQuery]);

  const activeNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Filter edges where both source and target are active in the diagram
  const filteredEdges = useMemo(() => {
    return edges.filter((e) => {
      const inDiagram = e.diagrams.includes(diagramType);
      const nodesActive = activeNodeIds.has(e.source) && activeNodeIds.has(e.target);
      return inDiagram && nodesActive;
    });
  }, [edges, diagramType, activeNodeIds]);

  // Pan / Zoom Controls
  const handleZoomIn = () => setZoom((z) => Math.min(2.0, z + 0.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, z - 0.15));
  const handleResetZoom = () => {
    setZoom(0.85);
    setPan({ x: 30, y: 30 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".node-card")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
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
      className={`relative w-full rounded-2xl border border-slate-200 bg-slate-900 text-slate-100 shadow-xl overflow-hidden transition-all ${
        isFullscreen ? "h-screen rounded-none" : "h-[740px]"
      }`}
    >
      {/* Top Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
        {/* Diagram Type Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setDiagramType("TECHNICAL")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              diagramType === "TECHNICAL" ? "bg-indigo-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Technical Topology
          </button>
          <button
            onClick={() => setDiagramType("BUSINESS_PROCESS")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              diagramType === "BUSINESS_PROCESS" ? "bg-indigo-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Business Process Flow
          </button>
          <button
            onClick={() => setDiagramType("INVESTOR_SIMPLIFIED")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              diagramType === "INVESTOR_SIMPLIFIED" ? "bg-indigo-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Investor Simplified
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search components or tech..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 sm:w-60 rounded-lg border border-slate-700 bg-slate-900 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
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
            className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetZoom}
            title="Reset View"
            className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Interactive Drag Canvas */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing select-none overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
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
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
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
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
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
                    stroke="#4f46e5"
                    strokeWidth="2.5"
                    strokeDasharray={edge.protocol.includes("WEBHOOK") ? "5,5" : "none"}
                    markerEnd="url(#arrow-default)"
                    className="opacity-70 hover:opacity-100 transition-opacity"
                  />
                  {/* Edge Protocol Tag */}
                  <rect
                    x={midX - 38}
                    y={midY - 9}
                    width="76"
                    height="18"
                    rx="4"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x={midX}
                    y={midY + 4}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="9"
                    fontWeight="500"
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
            const categoryStyle = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.FRONTEND;

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`node-card absolute z-10 w-[260px] rounded-xl border bg-slate-900/95 p-3.5 shadow-lg backdrop-blur-md cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-indigo-500/20 hover:border-indigo-400 ${
                  isSelected
                    ? "border-indigo-500 ring-2 ring-indigo-500/40 shadow-xl shadow-indigo-500/30"
                    : "border-slate-800"
                }`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                }}
              >
                {/* Header Banner */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-400">
                    {node.category.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      node.healthStatus === "HEALTHY"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {node.healthStatus}
                  </span>
                </div>

                {/* Node Title & Description */}
                <div className="mt-2.5">
                  <h4 className="text-sm font-bold text-white flex items-center justify-between">
                    {node.name}
                    <ChevronRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5" />
                  </h4>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {node.description}
                  </p>
                </div>

                {/* Tech Badge */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <span className="font-mono text-slate-300 truncate max-w-[170px]">
                    {node.technology.split(",")[0]}
                  </span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400 uppercase font-semibold">
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
        <div className="absolute right-0 top-12 bottom-0 z-30 w-80 sm:w-96 border-l border-slate-800 bg-slate-950/95 p-5 shadow-2xl backdrop-blur-xl overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                {selectedNode.category.replace(/_/g, " ")}
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">{selectedNode.name}</h3>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-4 text-xs text-slate-300">
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Purpose</span>
              <p className="mt-1 text-slate-200 leading-relaxed">{selectedNode.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-900/60 p-3 border border-slate-800/60">
              <div>
                <span className="text-slate-500 text-[10px] block">Technology</span>
                <span className="text-white font-medium">{selectedNode.technology}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Runtime</span>
                <span className="text-white font-medium">{selectedNode.runtime}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Owner / Team</span>
                <span className="text-white font-medium">{selectedNode.owner}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Verification</span>
                <span className="text-emerald-400 font-medium">{selectedNode.verificationState}</span>
              </div>
            </div>

            {/* Features Covered */}
            {selectedNode.featuresCovered.length > 0 && (
              <div>
                <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Integrated Capabilities</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedNode.featuresCovered.map((feat) => (
                    <span
                      key={feat}
                      className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[11px] text-indigo-300"
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
                <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <Lock className="h-3 w-3 text-emerald-400" />
                  Security Enforcements
                </span>
                <ul className="mt-1.5 space-y-1">
                  {selectedNode.securityControls.map((sec) => (
                    <li key={sec} className="flex items-center gap-1.5 text-slate-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span>{sec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Inbound & Outbound Connections */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Dependency Graph</span>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Depends On ({selectedNode.dependencies.length})</span>
                  <span className="text-indigo-400 font-mono text-[11px]">
                    {selectedNode.dependencies.length > 0 ? selectedNode.dependencies.join(", ") : "None (Root Ingress)"}
                  </span>
                </div>
                <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Supplies Data To ({selectedNode.dataOutputs.length})</span>
                  <span className="text-indigo-400 font-mono text-[11px]">
                    {selectedNode.dataOutputs.length > 0 ? selectedNode.dataOutputs.join(", ") : "Terminal Node"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend Footer */}
      <div className="absolute bottom-2 left-4 z-20 hidden md:flex items-center gap-4 rounded-xl bg-slate-950/80 px-3.5 py-1.5 text-[11px] text-slate-400 border border-slate-800 backdrop-blur-md">
        <span className="font-semibold text-slate-300">Directional Flow:</span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-indigo-500 inline-block" /> HTTPS / REST
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-emerald-500 inline-block" /> Database Connection
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-indigo-400 inline-block" /> Webhook HMAC
        </span>
      </div>
    </div>
  );
}
