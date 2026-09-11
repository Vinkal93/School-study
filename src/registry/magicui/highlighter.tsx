"use client";

import React, { useLayoutEffect, useRef } from "react";
import { useInView } from "framer-motion";
import { annotate } from "rough-notation";

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
  color = "#ffd1dc",
  strokeWidth = 1.5,
  animationDuration = 600,
  iterations = 2,
  padding = 2,
  multiline = true,
  isView = false,
  className,
}: HighlighterProps) {
  const elementRef = useRef<HTMLSpanElement>(null);

  const isInView = useInView(elementRef, {
    once: true,
    margin: "-10%",
  });

  const shouldShow = !isView || isInView;

  useLayoutEffect(() => {
    const element = elementRef.current;
    let annotation: any = null;
    let resizeObserver: ResizeObserver | null = null;

    if (shouldShow && element) {
      const annotationConfig: any = {
        type: action,
        color,
        strokeWidth,
        animationDuration,
        iterations,
        padding,
        multiline,
      };

      try {
        const currentAnnotation = annotate(element, annotationConfig);
        annotation = currentAnnotation;
        currentAnnotation.show();

        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => {
            currentAnnotation.hide();
            currentAnnotation.show();
          });

          resizeObserver.observe(element);
          if (document.body) {
            resizeObserver.observe(document.body);
          }
        }
      } catch (err) {
        console.warn("Rough-notation annotation error:", err);
      }
    }

    return () => {
      try {
        annotation?.remove();
      } catch {
        // ignore cleanup error
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [
    shouldShow,
    action,
    color,
    strokeWidth,
    animationDuration,
    iterations,
    padding,
    multiline,
  ]);

  return (
    <span
      ref={elementRef}
      className={`relative inline-block bg-transparent ${className || ""}`}
    >
      {children}
    </span>
  );
}

export default Highlighter;
