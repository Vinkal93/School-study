"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Copy, Check } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  referenceCode: string;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    referenceCode: "",
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "ERR-";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return { hasError: true, error, referenceCode: code, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Non-blocking report to server ingest endpoint
    if (typeof window !== "undefined") {
      fetch("/api/super-admin/errors/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message,
          errorCode: "REACT_RENDER_CRASH",
          stack: error.stack || errorInfo.componentStack,
          module: this.props.moduleName || "frontend_ui",
          operation: "renderComponent",
          route: window.location.pathname,
          clientMetadata: {
            userAgent: navigator.userAgent,
            url: window.location.href,
          },
        }),
      }).catch(() => {});
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, copied: false });
  };

  private handleCopyCode = () => {
    if (this.state.referenceCode && typeof navigator !== "undefined") {
      navigator.clipboard.writeText(this.state.referenceCode);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 3000);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="my-4 p-5 sm:p-6 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-slate-900 dark:text-rose-100 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>

            <div className="flex-1 space-y-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {this.props.fallbackTitle || "Something went wrong in this section"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                An unexpected interface error occurred. Other sections of your workspace remain operational. You can attempt to reload this section or provide the incident reference to your administrator.
              </p>

              {/* Reference Code Strip */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Incident Reference:
                </span>
                <button
                  type="button"
                  onClick={this.handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Click to copy error reference"
                >
                  <span>{this.state.referenceCode}</span>
                  {this.state.copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-105 active:scale-95"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
