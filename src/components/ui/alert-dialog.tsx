"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

interface AlertDialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextType>({
  open: false,
  setOpen: () => {},
});

export interface AlertDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AlertDialog({ children, open: controlledOpen, onOpenChange }: AlertDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (val: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(val);
    }
    onOpenChange?.(val);
  };

  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export interface AlertDialogTriggerProps {
  render?: React.ReactNode;
  children?: React.ReactNode;
  asChild?: boolean;
  className?: string;
  onClick?: () => void;
}

export function AlertDialogTrigger({ render, children, className, onClick }: AlertDialogTriggerProps) {
  const { setOpen } = useContext(AlertDialogContext);

  const handleClick = (e: React.MouseEvent) => {
    onClick?.();
    setOpen(true);
  };

  if (render && React.isValidElement(render)) {
    return React.cloneElement(render as React.ReactElement<any>, {
      onClick: (e: any) => {
        (render as any).props?.onClick?.(e);
        handleClick(e);
      },
    });
  }

  return (
    <div onClick={handleClick} className={cn("inline-block cursor-pointer", className)}>
      {children}
    </div>
  );
}

export interface AlertDialogContentProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function AlertDialogContent({ children, className, size = "default" }: AlertDialogContentProps) {
  const { open, setOpen } = useContext(AlertDialogContext);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen]);

  if (!open || !mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={() => setOpen(false)}
      />

      {/* Dialog Box */}
      <div
        role="alertdialog"
        aria-modal="true"
        className={cn(
          "relative z-50 w-full rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 transition-all animate-in zoom-in-95 duration-150 my-auto",
          size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-lg" : "max-w-md",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}

export function AlertDialogMedia({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center shrink-0", className)}>
      {children}
    </div>
  );
}

export function AlertDialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-base font-bold text-slate-900 dark:text-white tracking-tight", className)}>
      {children}
    </h2>
  );
}

export function AlertDialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal", className)}>
      {children}
    </p>
  );
}

export function AlertDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-end gap-2.5", className)}>
      {children}
    </div>
  );
}

export function AlertDialogCancel({
  children,
  className,
  variant = "outline",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "outline" | "ghost";
  onClick?: () => void;
}) {
  const { setOpen } = useContext(AlertDialogContext);

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
      className={cn(
        "inline-flex items-center justify-center font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer",
        variant === "ghost"
          ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
          : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-xs",
        className
      )}
    >
      {children}
    </button>
  );
}

export function AlertDialogAction({
  children,
  className,
  variant = "default",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "ghost" | "destructive";
  onClick?: () => void;
}) {
  const { setOpen } = useContext(AlertDialogContext);

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
      className={cn(
        "inline-flex items-center justify-center font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs",
        variant === "destructive"
          ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20"
          : variant === "ghost"
          ? "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60"
          : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20",
        className
      )}
    >
      {children}
    </button>
  );
}
