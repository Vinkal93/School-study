"use client";

import { useEffect, useState } from "react";

export type TextSizeLevel = "sm" | "md" | "lg" | "xl";

const TEXT_SIZES: { key: TextSizeLevel; label: string; scale: string; tooltip: string }[] = [
  { key: "sm", label: "A-", scale: "92%", tooltip: "Compact Text (92%)" },
  { key: "md", label: "A", scale: "100%", tooltip: "Standard Text (100%)" },
  { key: "lg", label: "A+", scale: "110%", tooltip: "Large Text (110%)" },
  { key: "xl", label: "A++", scale: "120%", tooltip: "Extra Large Text (120%)" },
];

export function TextSizeToggle() {
  const [currentSize, setCurrentSize] = useState<TextSizeLevel>("md");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("school_study_text_zoom") as TextSizeLevel;
    if (saved && ["sm", "md", "lg", "xl"].includes(saved)) {
      setCurrentSize(saved);
      const target = TEXT_SIZES.find((s) => s.key === saved);
      if (target) {
        document.documentElement.style.fontSize = target.scale;
      }
    }
  }, []);

  const setSize = (size: TextSizeLevel) => {
    setCurrentSize(size);
    const target = TEXT_SIZES.find((s) => s.key === size);
    if (target) {
      document.documentElement.style.fontSize = target.scale;
      localStorage.setItem("school_study_text_zoom", size);
    }
  };

  if (!mounted) {
    return (
      <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-0.5 text-xs font-bold text-slate-400">
        <span className="px-2 py-1">A</span>
      </div>
    );
  }

  return (
    <div
      aria-label="Text Size Controller"
      role="group"
      className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 p-0.5 shadow-xs transition-all"
    >
      {TEXT_SIZES.map((size) => {
        const isActive = currentSize === size.key;
        return (
          <button
            key={size.key}
            type="button"
            title={size.tooltip}
            aria-label={size.tooltip}
            onClick={() => setSize(size.key)}
            className={`px-2 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer ${
              isActive
                ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs scale-105"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {size.label}
          </button>
        );
      })}
    </div>
  );
}
