"use client";

import React, { useState, createContext, useContext } from "react";
import { cn } from "@/lib/utils/cn";

interface TooltipContextType {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  placement: "top" | "bottom" | "left" | "right";
  setPlacement: (p: "top" | "bottom" | "left" | "right") => void;
}

const TooltipContext = createContext<TooltipContextType>({
  isOpen: false,
  setIsOpen: () => {},
  placement: "top",
  setPlacement: () => {},
});

export function Tooltip({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<"top" | "bottom" | "left" | "right">("top");
  let timeout: any = null;

  const handleMouseEnter = () => {
    if (delay > 0) {
      timeout = setTimeout(() => setIsOpen(true), delay);
    } else {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (timeout) clearTimeout(timeout);
    setIsOpen(false);
  };

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen, placement, setPlacement }}>
      <div
        className="relative inline-flex items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

Tooltip.Trigger = function TooltipTrigger({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("inline-flex items-center cursor-pointer", className)} {...props}>
      {children}
    </div>
  );
};

Tooltip.Content = function TooltipContent({
  children,
  placement = "top",
  showArrow = false,
  className,
}: {
  children: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  showArrow?: boolean;
  className?: string;
}) {
  const { isOpen } = useContext(TooltipContext);

  if (!isOpen) return null;

  const placementClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[placement];

  return (
    <div
      role="tooltip"
      className={cn(
        "absolute z-50 px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs shadow-xl pointer-events-none whitespace-nowrap animate-in fade-in-50 zoom-in-95 duration-150",
        placementClasses,
        className
      )}
    >
      {children}
    </div>
  );
};

Tooltip.Arrow = function TooltipArrow() {
  return null; // CSS handles border/rounded style cleanly
};

export default Tooltip;
