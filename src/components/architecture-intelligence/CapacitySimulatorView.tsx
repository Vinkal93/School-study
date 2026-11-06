"use client";

import React, { useState, useMemo } from "react";
import {
  Sliders,
  Cpu,
  Database,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { CapacityPreset, CapacityProjection } from "@/types/architecture-intelligence";
import { calculateCapacityProjection } from "@/lib/services/architecture-intelligence.service";

interface Props {
  presets: CapacityPreset[];
  initialProjection: CapacityProjection;
}

export default function CapacitySimulatorView({ presets, initialProjection }: Props) {
  const [selectedPresetName, setSelectedPresetName] = useState(presets[1]?.name || "");
  const [schoolCount, setSchoolCount] = useState(1000);
  const [avgStudents, setAvgStudents] = useState(500);
  const [avgUsers, setAvgUsers] = useState(45);
  const [reqPerUser, setReqPerUser] = useState(55);
  const [dbOpsPerReq, setDbOpsPerReq] = useState(2.2);

  const applyPreset = (preset: CapacityPreset) => {
    setSelectedPresetName(preset.name);
    setSchoolCount(preset.schoolCount);
    setAvgStudents(preset.avgStudentsPerSchool);
    setAvgUsers(preset.avgUsersPerSchool);
    setReqPerUser(preset.reqPerUserPerDay);
    setDbOpsPerReq(preset.dbOpsPerRequest);
  };

  const projection = useMemo(() => {
    return calculateCapacityProjection({
      name: "Custom Simulation",
      schoolCount,
      avgStudentsPerSchool: avgStudents,
      avgUsersPerSchool: avgUsers,
      reqPerUserPerDay: reqPerUser,
      dbOpsPerRequest: dbOpsPerReq,
      peakConcurrencyRatio: 0.15,
      fileStorageGbPerSchool: 2.0,
      monthlyMessagesPerSchool: 3500,
    });
  }, [schoolCount, avgStudents, avgUsers, reqPerUser, dbOpsPerReq]);

  return (
    <div className="space-y-8">
      {/* Header & Preset Switchers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Scalability & Capacity Simulator</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Model infrastructure workload, peak concurrency bottlenecks, and operating margins at scale.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                selectedPresetName === p.name
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.schoolCount.toLocaleString()} Schools
            </button>
          ))}
        </div>
      </div>

      {/* Simulator Inputs & Dynamic Outputs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sliders Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="h-4 w-4 text-indigo-600" />
            Simulation Input Parameters
          </h3>

          {/* School Count Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-600">Total Schools</span>
              <span className="text-indigo-600 font-bold">{schoolCount.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="50"
              max="10000"
              step="50"
              value={schoolCount}
              onChange={(e) => {
                setSchoolCount(Number(e.target.value));
                setSelectedPresetName("Custom");
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Average Students Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-600">Avg Students / School</span>
              <span className="text-indigo-600 font-bold">{avgStudents.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={avgStudents}
              onChange={(e) => {
                setAvgStudents(Number(e.target.value));
                setSelectedPresetName("Custom");
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Daily Active Users Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-600">Staff & Admin Users / School</span>
              <span className="text-indigo-600 font-bold">{avgUsers}</span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={avgUsers}
              onChange={(e) => {
                setAvgUsers(Number(e.target.value));
                setSelectedPresetName("Custom");
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Requests Per User Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-600">Daily Requests / Active User</span>
              <span className="text-indigo-600 font-bold">{reqPerUser}</span>
            </div>
            <input
              type="range"
              min="20"
              max="200"
              step="5"
              value={reqPerUser}
              onChange={(e) => {
                setReqPerUser(Number(e.target.value));
                setSelectedPresetName("Custom");
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Database Operations Per Request */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-600">Firestore Ops / Request</span>
              <span className="text-indigo-600 font-bold">{dbOpsPerReq.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.1"
              value={dbOpsPerReq}
              onChange={(e) => {
                setDbOpsPerReq(Number(e.target.value));
                setSelectedPresetName("Custom");
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>

        {/* Projected Outputs & Economics Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 space-y-6">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span>Projected Workload & Financial Economics</span>
            <span className="text-xs font-medium text-slate-400">
              Assumes ₹1,999/mo avg SaaS price
            </span>
          </h3>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Students</span>
              <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                {projection.totalStudents.toLocaleString()}
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Peak Bell RPS</span>
              <span className="text-xl font-extrabold text-indigo-600 mt-1 block">
                {projection.peakRequestsPerSecond.toLocaleString()} req/s
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Daily DB Operations</span>
              <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                {(projection.dailyDatabaseOperations / 1000000).toFixed(2)} M / day
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Projected Revenue</span>
              <span className="text-xl font-extrabold text-emerald-600 mt-1 block">
                ₹{(projection.estimatedRevenueInr / 100000).toFixed(2)} L / mo
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Estimated Infra Cost</span>
              <span className="text-xl font-extrabold text-rose-600 mt-1 block">
                ₹{projection.estimatedInfraCostInr.toLocaleString()} / mo
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Projected Gross Margin</span>
              <span className="text-xl font-extrabold text-purple-600 mt-1 block">
                {projection.projectedGrossMarginPercent}%
              </span>
            </div>
          </div>

          {/* Architectural Bottleneck & Recommendations */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-indigo-600 shrink-0" />
              <h4 className="text-xs font-bold text-indigo-900">
                Primary Scaling Consideration: {projection.limitingBottleneck}
              </h4>
            </div>

            <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700">
              {projection.recommendedScalingActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
