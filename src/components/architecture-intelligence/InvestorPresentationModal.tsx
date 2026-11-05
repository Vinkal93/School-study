"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Download,
  FileText,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Layers,
  HelpCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import type { InvestorSlide } from "@/types/architecture-intelligence";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  slides: InvestorSlide[];
}

export default function InvestorPresentationModal({ isOpen, onClose, slides }: Props) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);

  const totalSlides = slides.length;
  const currentSlide = slides[currentSlideIndex] || slides[0];

  const handleNext = useCallback(() => {
    setCurrentSlideIndex((idx) => Math.min(totalSlides - 1, idx + 1));
  }, [totalSlides]);

  const handlePrev = useCallback(() => {
    setCurrentSlideIndex((idx) => Math.max(0, idx - 1));
  }, []);

  // Keyboard navigation (Arrow keys, Space, Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Space") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || !currentSlide) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white select-none overflow-hidden">
      {/* Top Presentation Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-black">
            SS
          </span>
          <div>
            <h3 className="text-sm font-bold text-white leading-none">
              School Study — Investor Deck & Architecture
            </h3>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Slide {currentSlideIndex + 1} of {totalSlides} • Category: {currentSlide.category}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSpeakerNotes((v) => !v)}
            title="Toggle Speaker Notes"
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              showSpeakerNotes
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {showSpeakerNotes ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            Speaker Notes
          </button>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Slide Card Area */}
      <div className="relative flex flex-col justify-center items-center w-full max-w-5xl h-full px-6 py-20">
        <div className="w-full rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 p-10 shadow-2xl backdrop-blur-xl transition-all duration-300">
          {/* Slide Header */}
          <div className="border-b border-slate-800 pb-5">
            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              {currentSlide.category}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 tracking-tight">
              {currentSlide.title}
            </h1>
            <h2 className="text-base sm:text-lg font-medium text-slate-400 mt-1">
              {currentSlide.subtitle}
            </h2>
          </div>

          {/* Slide Body: Bullets */}
          <div className="mt-8 space-y-4">
            {currentSlide.bulletPoints.map((point, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-normal">
                  {point}
                </p>
              </div>
            ))}
          </div>

          {/* Highlight Metrics Grid if present */}
          {currentSlide.highlightMetrics && currentSlide.highlightMetrics.length > 0 && (
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-800 pt-6">
              {currentSlide.highlightMetrics.map((metric, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    {metric.label}
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-indigo-400 mt-1 block">
                    {metric.value}
                  </span>
                  {metric.detail && (
                    <span className="text-xs text-slate-500 mt-0.5 block">{metric.detail}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collapsible Speaker Notes */}
        {showSpeakerNotes && (
          <div className="w-full max-w-5xl mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 backdrop-blur-md">
            <span className="font-bold uppercase tracking-wider text-amber-400 block text-[10px]">
              Speaker Delivery Guidance:
            </span>
            <p className="mt-1 font-medium">{currentSlide.speakerNotes}</p>
          </div>
        )}
      </div>

      {/* Bottom Floating Navigation Controls */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-between px-8">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Navigation: <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">Space</kbd> / <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">Arrows</kbd>
          </span>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-3">
          <button
            disabled={currentSlideIndex === 0}
            onClick={handlePrev}
            className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-30 hover:bg-slate-800 transition shadow-lg"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>

          {/* Dots Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  currentSlideIndex === idx ? "w-6 bg-indigo-500" : "w-2 bg-slate-700 hover:bg-slate-600"
                }`}
              />
            ))}
          </div>

          <button
            disabled={currentSlideIndex === totalSlides - 1}
            onClick={handleNext}
            className="flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-30 hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/30"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
