"use client";

import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import { ConfirmDialog, ConfirmDialogSeverity } from "./ConfirmDialog";
import { createPortal } from "react-dom";
import { AlertCircle, HelpCircle, X } from "lucide-react";

export interface ConfirmOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  message?: React.ReactNode;
  severity?: ConfirmDialogSeverity;
  confirmVariant?: ConfirmDialogSeverity;
  confirmLabel?: string;
  cancelLabel?: string;
  entityName?: string;
}

export interface PromptOptions {
  title: string;
  description?: string;
  message?: string;
  inputLabel?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  validate?: (value: string) => string | null;
}

interface ConfirmationContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  prompt: (options: PromptOptions | string) => Promise<string | null>;
  alert: (message: string, title?: string) => Promise<void>;
}

const ConfirmationContext = createContext<ConfirmationContextType | null>(null);

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  // Confirm state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
  }>({
    isOpen: false,
    options: { title: "Confirm Action" },
  });

  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const rawOpts: ConfirmOptions =
      typeof options === "string" ? { title: "Confirmation Required", description: options } : options;
    const opts: ConfirmOptions = {
      ...rawOpts,
      description: rawOpts.description ?? rawOpts.message,
      severity: rawOpts.severity ?? rawOpts.confirmVariant ?? "warning",
    };

    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({
        isOpen: true,
        options: opts,
      });
    });
  }, []);

  const handleConfirmClose = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    if (confirmResolverRef.current) {
      confirmResolverRef.current(false);
      confirmResolverRef.current = null;
    }
  };

  const handleConfirmAction = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    if (confirmResolverRef.current) {
      confirmResolverRef.current(true);
      confirmResolverRef.current = null;
    }
  };

  // Prompt state
  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    options: PromptOptions;
    value: string;
    error: string | null;
  }>({
    isOpen: false,
    options: { title: "Input Required" },
    value: "",
    error: null,
  });

  const promptResolverRef = useRef<((value: string | null) => void) | null>(null);

  const prompt = useCallback((options: PromptOptions | string): Promise<string | null> => {
    const rawOpts: PromptOptions =
      typeof options === "string" ? { title: "Input Required", description: options } : options;
    const opts: PromptOptions = {
      ...rawOpts,
      description: rawOpts.description ?? rawOpts.message,
    };

    return new Promise((resolve) => {
      promptResolverRef.current = resolve;
      setPromptState({
        isOpen: true,
        options: opts,
        value: opts.defaultValue || "",
        error: null,
      });
    });
  }, []);

  const handlePromptClose = () => {
    setPromptState((prev) => ({ ...prev, isOpen: false }));
    if (promptResolverRef.current) {
      promptResolverRef.current(null);
      promptResolverRef.current = null;
    }
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promptState.options.validate) {
      const err = promptState.options.validate(promptState.value);
      if (err) {
        setPromptState((prev) => ({ ...prev, error: err }));
        return;
      }
    }
    setPromptState((prev) => ({ ...prev, isOpen: false }));
    if (promptResolverRef.current) {
      promptResolverRef.current(promptState.value);
      promptResolverRef.current = null;
    }
  };

  // Alert state
  const alert = useCallback((message: string, title: string = "Alert"): Promise<void> => {
    return new Promise((resolve) => {
      confirmResolverRef.current = () => resolve();
      setConfirmState({
        isOpen: true,
        options: {
          title,
          description: message,
          severity: "info",
          confirmLabel: "OK",
          cancelLabel: undefined,
        },
      });
    });
  }, []);

  return (
    <ConfirmationContext.Provider value={{ confirm, prompt, alert }}>
      {children}

      {/* Portal Dialog for Confirm */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={handleConfirmClose}
        onConfirm={handleConfirmAction}
        title={confirmState.options.title}
        description={confirmState.options.description}
        severity={confirmState.options.severity || "danger"}
        confirmLabel={confirmState.options.confirmLabel}
        cancelLabel={confirmState.options.cancelLabel}
        entityName={confirmState.options.entityName}
      />

      {/* Portal Dialog for Prompt */}
      {promptState.isOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={handlePromptClose}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {promptState.options.title}
                </h3>
                {promptState.options.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {promptState.options.description}
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={handlePromptSubmit} className="space-y-4 mt-4">
              <div>
                {promptState.options.inputLabel && (
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {promptState.options.inputLabel}
                  </label>
                )}
                <input
                  type="text"
                  autoFocus
                  value={promptState.value}
                  onChange={(e) => setPromptState((prev) => ({ ...prev, value: e.target.value, error: null }))}
                  placeholder={promptState.options.placeholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {promptState.error && (
                  <p className="text-xs text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {promptState.error}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handlePromptClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  {promptState.options.cancelLabel || "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {promptState.options.confirmLabel || "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    // Graceful fallback if invoked outside provider
    return {
      confirm: async (opts: ConfirmOptions | string) => {
        if (typeof window === "undefined") return true;
        const msg = typeof opts === "string" ? opts : (opts.description?.toString() || opts.message?.toString() || opts.title?.toString() || "Are you sure?");
        return window.confirm(msg);
      },
      prompt: async (opts: PromptOptions | string) => {
        if (typeof window === "undefined") return null;
        const msg = typeof opts === "string" ? opts : (opts.description || opts.message || opts.title);
        const def = typeof opts === "string" ? "" : opts.defaultValue;
        return window.prompt(msg, def);
      },
      alert: async (msg: string) => {
        if (typeof window === "undefined") return;
        window.alert(msg);
      },
    };
  }
  return context;
}
