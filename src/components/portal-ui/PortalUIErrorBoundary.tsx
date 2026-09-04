"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  fallback: ReactNode;
  children: ReactNode;
  portalName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Portal UI Error Boundary
 * Automatically catches any render exceptions within Modern UI 2.0
 * and immediately falls back to Classic with zero downtime or session loss.
 */
export class PortalUIErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[PortalUIErrorBoundary] Caught error in ${this.props.portalName || "Portal"} Modern UI 2.0 shell. Transparently falling back to Classic:`,
      error,
      errorInfo
    );
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
