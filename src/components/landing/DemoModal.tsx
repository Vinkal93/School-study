"use client";

import React from "react";
import Link from "next/link";
import { Play, X } from "lucide-react";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="SchoolStudy Platform Tour"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Play className="h-4 w-4 fill-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                SchoolStudy Platform Tour
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                A quick 2-minute overview of all major portals
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Mockup Frame */}
        <div className="aspect-video w-full rounded-2xl bg-slate-950 flex flex-col items-center justify-center text-center p-6 space-y-3 relative overflow-hidden border border-slate-800">
          <div
            onClick={onClose}
            role="button"
            tabIndex={0}
            aria-label="Play tour video"
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClose(); }}
            className="w-16 h-16 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
          >
            <Play className="h-7 w-7 fill-white ml-1" />
          </div>
          <h4 className="text-sm font-bold text-white">Interactive Tour Demo</h4>
          <p className="text-xs text-slate-300 max-w-sm">
            Explore real-time roll call, fee receipt generation, timetable period bells, and full multi-tenant school administration.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          <Link
            href="/register"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            Start Free Onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}
