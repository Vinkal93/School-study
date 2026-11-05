"use client";

import React, { useState } from "react";
import {
  Database,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ChevronRight,
  Play,
  RotateCcw,
  Lock,
} from "lucide-react";
import type { DatabaseEntity, DataFlowModel } from "@/types/architecture-intelligence";

interface Props {
  entities: DatabaseEntity[];
  dataFlows: DataFlowModel[];
}

export default function DatabaseDataFlowView({ entities, dataFlows }: Props) {
  const [selectedFlowId, setSelectedFlowId] = useState(dataFlows[0]?.id || "");
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const currentFlow = dataFlows.find((f) => f.id === selectedFlowId) || dataFlows[0];

  return (
    <div className="space-y-10">
      {/* SECTION 1: Interactive Data Flow Stepper */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Interactive Execution Engine
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Multi-Tenant Data Flow Simulator</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Step through critical platform workflows showing input validation, zero-trust authorization, and atomic database commits.
            </p>
          </div>

          {/* Workflow Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedFlowId}
              onChange={(e) => {
                setSelectedFlowId(e.target.value);
                setActiveStepIndex(0);
              }}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none shadow-sm"
            >
              {dataFlows.map((flow) => (
                <option key={flow.id} value={flow.id}>
                  {flow.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Flow Summary */}
        {currentFlow && (
          <div className="mt-5">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800">{currentFlow.name}</h4>
                <p className="text-xs text-slate-600 mt-0.5">{currentFlow.summary}</p>
              </div>
              <span className="text-[11px] text-slate-500 italic max-w-sm">
                Context: {currentFlow.businessContext}
              </span>
            </div>

            {/* Stepper Navigation */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {currentFlow.steps.map((step, idx) => {
                const isActive = activeStepIndex === idx;
                const isPassed = activeStepIndex > idx;
                return (
                  <button
                    key={step.stepNumber}
                    onClick={() => setActiveStepIndex(idx)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                        : isPassed
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] bg-black/10">
                      {step.stepNumber}
                    </span>
                    <span>{step.action}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Step Visual Inspector Card */}
            {currentFlow.steps[activeStepIndex] && (
              <div className="mt-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-indigo-100/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-sm">
                      {currentFlow.steps[activeStepIndex].stepNumber}
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">
                        {currentFlow.steps[activeStepIndex].action}
                      </h4>
                      <span className="text-xs text-slate-500 font-medium">
                        Actor: {currentFlow.steps[activeStepIndex].actor}
                      </span>
                    </div>
                  </div>

                  <span className="rounded-lg bg-indigo-100/70 border border-indigo-200 px-2.5 py-1 text-xs font-mono font-semibold text-indigo-800">
                    {currentFlow.steps[activeStepIndex].endpointOrMethod}
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-700 leading-relaxed">
                  {currentFlow.steps[activeStepIndex].description}
                </p>

                {/* Technical Boundaries Matrix */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-xl bg-white p-3.5 border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Validation Boundary
                    </span>
                    <span className="text-slate-800 font-medium mt-1 block">
                      {currentFlow.steps[activeStepIndex].validationBoundary}
                    </span>
                  </div>

                  <div className="rounded-xl bg-white p-3.5 border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Zero-Trust Authorization
                    </span>
                    <span className="text-emerald-800 font-medium mt-1 block">
                      {currentFlow.steps[activeStepIndex].authorizationCheck}
                    </span>
                  </div>

                  <div className="rounded-xl bg-white p-3.5 border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      Target Collection / Service
                    </span>
                    <span className="text-indigo-800 font-mono font-semibold mt-1 block">
                      {currentFlow.steps[activeStepIndex].targetCollectionOrService}
                    </span>
                  </div>
                </div>

                {/* Step Navigation Actions */}
                <div className="mt-5 pt-3 border-t border-indigo-100 flex items-center justify-between">
                  <button
                    disabled={activeStepIndex === 0}
                    onClick={() => setActiveStepIndex((idx) => Math.max(0, idx - 1))}
                    className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition"
                  >
                    Previous Step
                  </button>

                  <div className="flex items-center gap-2">
                    {activeStepIndex < currentFlow.steps.length - 1 ? (
                      <button
                        onClick={() => setActiveStepIndex((idx) => Math.min(currentFlow.steps.length - 1, idx + 1))}
                        className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                      >
                        Next Step <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveStepIndex(0)}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Replay Flow
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: Database Schema & Collection Entities */}
      <div>
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="h-4 w-4 text-indigo-600" />
            Cloud Firestore Multi-Tenant Entity Model
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Document schema collections with field statistics and security rule enforcement guarantees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {entities.map((entity) => (
            <div
              key={entity.collectionName}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {entity.category.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  ~{entity.approximateFieldCount} fields
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-900 mt-2 font-mono">
                /{entity.collectionName}
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{entity.displayName}</p>

              <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                {entity.documentStructureSummary}
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Tenant Key:</span>
                  <code className="text-indigo-600 font-mono text-[10px]">{entity.tenantKeyField}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Isolation:</span>
                  <span className="text-emerald-600 font-medium">Strict Enforced</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
