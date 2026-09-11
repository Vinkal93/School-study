"use client";

import React from "react";

export type AnnotationAction =
  | "highlight"
  | "underline"
  | "box"
  | "circle"
  | "strike-through"
  | "crossed-off"
  | "bracket";

export interface HighlighterProps {
  children: React.ReactNode;
  action?: AnnotationAction;
  color?: string;
  strokeWidth?: number;
  animationDuration?: number;
  iterations?: number;
  padding?: number;
  multiline?: boolean;
  isView?: boolean;
  className?: string;
}

export function Highlighter({
  children,
  action = "highlight",
  color = "#2563EB",
  strokeWidth = 3,
  className = "",
}: HighlighterProps) {
  if (action === "underline") {
    return (
      <span className={`relative inline-block ${className}`}>
        {children}
        <span
          aria-hidden="true"
          className="absolute left-0 -bottom-0.5 w-full rounded-full pointer-events-none"
          style={{
            height: strokeWidth,
            backgroundColor: color,
            boxShadow: `0 2px 8px ${color}40`,
          }}
        />
      </span>
    );
  }

  if (action === "highlight") {
    return (
      <span
        className={`relative inline-block rounded-md px-1.5 py-0.5 transition-colors ${className}`}
        style={{
          backgroundColor: color,
        }}
      >
        {children}
      </span>
    );
  }

  if (action === "box" || action === "circle") {
    return (
      <span
        className={`relative inline-block px-2 py-0.5 ${
          action === "circle" ? "rounded-full" : "rounded-lg"
        } border-2 ${className}`}
        style={{
          borderColor: color,
        }}
      >
        {children}
      </span>
    );
  }

  if (action === "strike-through") {
    return (
      <span className={`relative inline-block ${className}`}>
        {children}
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-full pointer-events-none"
          style={{
            height: strokeWidth,
            backgroundColor: color,
          }}
        />
      </span>
    );
  }

  return (
    <span className={`relative inline-block ${className}`}>
      {children}
    </span>
  );
}

export default Highlighter;

