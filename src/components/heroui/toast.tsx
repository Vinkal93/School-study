"use client";

import React from "react";
import { toast as sonnerToast } from "sonner";

export interface HeroToastOptions {
  description?: React.ReactNode;
  indicator?: React.ReactNode;
  actionProps?: {
    children: React.ReactNode;
    onPress?: () => void;
    onClick?: () => void;
    className?: string;
    variant?: string;
  };
  variant?: "default" | "info" | "success" | "warning" | "danger" | string;
  isLoading?: boolean;
  timeout?: number;
  [key: string]: any;
}

function formatToastOptions(options?: HeroToastOptions) {
  if (!options) return {};

  const sonnerOpts: any = {
    description: options.description,
    duration: options.timeout !== undefined ? options.timeout : 4000,
  };

  if (options.indicator) {
    sonnerOpts.icon = options.indicator;
  }

  if (options.actionProps) {
    sonnerOpts.action = {
      label: options.actionProps.children,
      onClick: () => {
        if (options.actionProps?.onPress) options.actionProps.onPress();
        if (options.actionProps?.onClick) options.actionProps.onClick();
      },
    };
  }

  return sonnerOpts;
}

export function toast(message: React.ReactNode, options?: HeroToastOptions): string | number {
  const opts = formatToastOptions(options);
  if (options?.isLoading) {
    return sonnerToast.loading(message as string, opts);
  }
  return sonnerToast(message as string, opts);
}

toast.info = (message: React.ReactNode, options?: HeroToastOptions) => {
  return sonnerToast.info(message as string, formatToastOptions(options));
};

toast.success = (message: React.ReactNode, options?: HeroToastOptions) => {
  return sonnerToast.success(message as string, formatToastOptions(options));
};

toast.warning = (message: React.ReactNode, options?: HeroToastOptions) => {
  return sonnerToast.warning(message as string, formatToastOptions(options));
};

toast.danger = (message: React.ReactNode, options?: HeroToastOptions) => {
  return sonnerToast.error(message as string, formatToastOptions(options));
};

toast.error = (message: React.ReactNode, options?: HeroToastOptions) => {
  return sonnerToast.error(message as string, formatToastOptions(options));
};

toast.promise = <T,>(
  promise: Promise<T>,
  handlers: {
    loading: React.ReactNode;
    success: React.ReactNode | ((data: T) => React.ReactNode);
    error: React.ReactNode | ((err: any) => React.ReactNode);
  }
) => {
  return sonnerToast.promise(promise, {
    loading: handlers.loading as any,
    success: (data: T) => {
      if (typeof handlers.success === "function") {
        return handlers.success(data) as any;
      }
      return handlers.success as any;
    },
    error: (err: any) => {
      if (typeof handlers.error === "function") {
        return handlers.error(err) as any;
      }
      return handlers.error as any;
    },
  });
};

toast.update = (
  id: string | number,
  message: React.ReactNode,
  options?: HeroToastOptions
) => {
  sonnerToast.dismiss(id);
  if (options?.variant === "success") {
    return sonnerToast.success(message as string, formatToastOptions(options));
  }
  if (options?.variant === "danger" || options?.variant === "error") {
    return sonnerToast.error(message as string, formatToastOptions(options));
  }
  if (options?.variant === "warning") {
    return sonnerToast.warning(message as string, formatToastOptions(options));
  }
  return sonnerToast(message as string, formatToastOptions(options));
};

toast.close = (id: string | number) => {
  sonnerToast.dismiss(id);
};

export default toast;
