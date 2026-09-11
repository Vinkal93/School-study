"use client";

import React, { useState, createContext, useContext } from "react";
import { X, AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AlertDialogContextType {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextType>({
  isOpen: false,
  setIsOpen: () => {},
});

export function AlertDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AlertDialogContext.Provider value={{ isOpen, setIsOpen }}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type !== AlertDialog.Backdrop) {
          return React.cloneElement(child as any, {
            onClick: (e: any) => {
              if ((child.props as any).onClick) (child.props as any).onClick(e);
              setIsOpen(true);
            },
          });
        }
        return child;
      })}
    </AlertDialogContext.Provider>
  );
}

AlertDialog.Backdrop = function AlertDialogBackdrop({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen, setIsOpen } = useContext(AlertDialogContext);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
      onClick={() => setIsOpen(false)}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
};

AlertDialog.Container = function AlertDialogContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("w-full", className)}>{children}</div>;
};

AlertDialog.Dialog = function AlertDialogDialog({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className={cn(
        "relative w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150",
        className
      )}
    >
      {children}
    </div>
  );
};

AlertDialog.CloseTrigger = function AlertDialogCloseTrigger({
  className,
}: {
  className?: string;
}) {
  const { setIsOpen } = useContext(AlertDialogContext);

  return (
    <button
      type="button"
      onClick={() => setIsOpen(false)}
      className={cn(
        "absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer",
        className
      )}
      aria-label="Close"
    >
      <X className="h-4 w-4" />
    </button>
  );
};

AlertDialog.Header = function AlertDialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex items-center gap-3", className)}>{children}</div>;
};

AlertDialog.Icon = function AlertDialogIcon({
  status = "default",
  className,
}: {
  status?: "default" | "accent" | "danger" | "success" | "warning";
  className?: string;
}) {
  const icons = {
    default: <Info className="h-5 w-5 text-slate-600" />,
    accent: <Info className="h-5 w-5 text-blue-600" />,
    danger: <AlertCircle className="h-5 w-5 text-rose-600" />,
    success: <CheckCircle className="h-5 w-5 text-emerald-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
  };

  return <div className={cn("flex-shrink-0", className)}>{icons[status]}</div>;
};

AlertDialog.Heading = function AlertDialogHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight",
        className
      )}
    >
      {children}
    </h3>
  );
};

AlertDialog.Body = function AlertDialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal",
        className
      )}
    >
      {children}
    </div>
  );
};

AlertDialog.Footer = function AlertDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { setIsOpen } = useContext(AlertDialogContext);

  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2.5 pt-2",
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && (child.props as any).slot === "close") {
          return React.cloneElement(child as any, {
            onClick: (e: any) => {
              if ((child.props as any).onClick) (child.props as any).onClick(e);
              setIsOpen(false);
            },
          });
        }
        return child;
      })}
    </div>
  );
};

export default AlertDialog;
