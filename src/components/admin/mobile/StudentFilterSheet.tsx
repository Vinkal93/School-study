"use client";

import React from "react";
import { X, RotateCcw, Filter, Check } from "lucide-react";
import type { SchoolClass } from "@/types";

export interface StudentFiltersState {
  classId: string;
  sectionId: string;
  status: string;
  gender: string;
  admissionYear: string;
  feeStatus: string;
  transport: string;
  searchQuery: string;
}

interface StudentFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  uniqueClasses: SchoolClass[];
  filters: StudentFiltersState;
  onChangeFilter: <K extends keyof StudentFiltersState>(key: K, value: StudentFiltersState[K]) => void;
  onReset: () => void;
  onApply: () => void;
}

export function StudentFilterSheet({
  isOpen,
  onClose,
  uniqueClasses,
  filters,
  onChangeFilter,
  onReset,
  onApply,
}: StudentFilterSheetProps) {
  if (!isOpen) return null;

  const selectedClass = uniqueClasses.find((c) => c.id === filters.classId);
  const availableSections = selectedClass?.sections || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-250 ease-out z-10">
        {/* Drag Handle (Mobile) */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Filter Students
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:underline px-2 py-1 cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Filter Sheet"
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="space-y-3.5 text-xs">
          {/* Class */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Class
            </label>
            <select
              value={filters.classId}
              onChange={(e) => {
                onChangeFilter("classId", e.target.value);
                onChangeFilter("sectionId", "all");
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Select Class (All)</option>
              {uniqueClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Section
            </label>
            <select
              value={filters.sectionId}
              onChange={(e) => onChangeFilter("sectionId", e.target.value)}
              disabled={filters.classId === "all"}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:border-blue-500 focus:outline-none disabled:opacity-50"
            >
              <option value="all">Select Section (All)</option>
              {availableSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status & Gender 2-col */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => onChangeFilter("status", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="tc_issued">TC Issued</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Gender
              </label>
              <select
                value={filters.gender}
                onChange={(e) => onChangeFilter("gender", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Admission Year & Fee Status 2-col */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Admission Year
              </label>
              <select
                value={filters.admissionYear}
                onChange={(e) => onChangeFilter("admissionYear", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:border-blue-500 focus:outline-none"
              >
                <option value="all">Select Year (All)</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fee Status
              </label>
              <select
                value={filters.feeStatus}
                onChange={(e) => onChangeFilter("feeStatus", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="due">Fee Due</option>
              </select>
            </div>
          </div>

          {/* Transport */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Transport
            </label>
            <select
              value={filters.transport}
              onChange={(e) => onChangeFilter("transport", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="yes">School Bus / Van (Enrolled)</option>
              <option value="no">Self / Not Enrolled</option>
            </select>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              onApply();
              onClose();
            }}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
