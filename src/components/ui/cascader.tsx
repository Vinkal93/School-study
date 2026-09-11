"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { ChevronRight, Check, X, Search, Shield, ChevronDown } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils/cn";

export interface CascaderNode {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  children?: CascaderNode[];
}

export interface CascaderProps {
  items: CascaderNode[];
  value?: string[];
  onValueChange?: (values: string[]) => void;
  multiple?: boolean;
  max?: number;
  placeholder?: string;
  className?: string;
}

export function Cascader({
  items,
  value = [],
  onValueChange,
  multiple = true,
  max = 10,
  placeholder = "Select permissions...",
  className,
}: CascaderProps) {
  const [open, setOpen] = useState(false);
  const [activeParent, setActiveParent] = useState<CascaderNode | null>(items[0] || null);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleToggleValue = (nodeValue: string) => {
    if (!multiple) {
      onValueChange?.([nodeValue]);
      setOpen(false);
      return;
    }

    if (value.includes(nodeValue)) {
      onValueChange?.(value.filter((v) => v !== nodeValue));
    } else {
      if (max && value.length >= max) return;
      onValueChange?.([...value, nodeValue]);
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.([]);
  };

  // Find label mapping
  const valueLabels = useMemo(() => {
    const map = new Map<string, string>();
    const traverse = (nodes: CascaderNode[]) => {
      for (const n of nodes) {
        map.set(n.value, n.label);
        if (n.children) traverse(n.children);
      }
    };
    traverse(items);
    return map;
  }, [items]);

  return (
    <div ref={containerRef} className={cn("relative inline-block w-full max-w-sm", className)}>
      {/* Trigger Button */}
      <div
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-between w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 pr-6">
          {value.length === 0 ? (
            <span className="text-slate-400 truncate">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              {value.slice(0, 3).map((val) => (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold text-[11px]"
                >
                  {valueLabels.get(val) || val}
                </span>
              ))}
              {value.length > 3 && (
                <span className="text-[11px] font-bold text-slate-500">
                  +{value.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {value.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Clear all"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      {/* Cascader Panel Popup */}
      {open && (
        <div className="absolute top-full mt-1.5 z-50 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search permissions..."
              className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          {/* Two-Column Cascading Panel */}
          <div className="flex divide-x divide-slate-100 dark:divide-slate-800 h-64">
            {/* Left Column: Categories / Areas */}
            <div className="w-1/2 overflow-y-auto p-1.5 space-y-0.5 bg-slate-50/50 dark:bg-slate-950/40">
              {items.map((node) => {
                const isActive = activeParent?.value === node.value;
                const selectedCount = (node.children || []).filter((c) => value.includes(c.value)).length;

                return (
                  <button
                    key={node.value}
                    type="button"
                    onClick={() => setActiveParent(node)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer",
                      isActive
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {node.icon}
                      <span className="truncate">{node.label}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      {selectedCount > 0 && (
                        <span className="h-4 w-4 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[10px] text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                          {selectedCount}
                        </span>
                      )}
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Actions / Permissions */}
            <div className="w-1/2 overflow-y-auto p-1.5 space-y-0.5">
              {activeParent?.children?.map((leaf) => {
                const isSelected = value.includes(leaf.value);
                const disabled = leaf.disabled;

                return (
                  <button
                    key={leaf.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleToggleValue(leaf.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left",
                      isSelected
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                      disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {leaf.icon}
                      <span className="truncate">{leaf.label}</span>
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer with Clear and Summary */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between text-[11px] text-slate-500">
            <span>{value.length} selected {max ? `(max ${max})` : ""}</span>
            <button
              type="button"
              disabled={value.length === 0}
              onClick={handleClearAll}
              className="text-slate-500 hover:text-rose-600 disabled:opacity-40 cursor-pointer font-medium"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
