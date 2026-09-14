"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Database, Search, Send, AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";

export interface ToolPart {
  type: "file_search" | "api_call" | "database_query" | "email_send" | string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: any;
  output?: any;
  errorText?: string;
}

export interface ToolProps {
  toolPart: ToolPart;
  className?: string;
}

export function Tool({ toolPart, className }: ToolProps) {
  const [expanded, setExpanded] = useState(false);

  const getToolIcon = () => {
    switch (toolPart.type) {
      case "database_query":
        return <Database className="h-3.5 w-3.5 text-blue-500" />;
      case "file_search":
        return <Search className="h-3.5 w-3.5 text-purple-500" />;
      case "email_send":
        return <Send className="h-3.5 w-3.5 text-amber-500" />;
      default:
        return <Database className="h-3.5 w-3.5 text-indigo-500" />;
    }
  };

  const isError = toolPart.state === "output-error";
  const isDone = toolPart.state === "output-available";
  const isRunning = toolPart.state === "input-streaming" || toolPart.state === "input-available";

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 p-2.5 text-xs text-gray-700 dark:text-gray-300 shadow-xs transition-all",
        isError && "border-rose-300 bg-rose-50/40 dark:border-rose-900/40",
        className
      )}
    >
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {getToolIcon()}
          <span className="font-semibold text-gray-900 dark:text-white capitalize">
            {toolPart.type.replace(/_/g, " ")}
          </span>
          <span className="text-[10px] text-gray-400">
            {isRunning ? "Running..." : isDone ? "Completed" : "Failed"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
          {isError && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
          {isRunning && (
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          )}
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-gray-800/80 space-y-1.5 font-mono text-[11px]">
          {toolPart.input && (
            <div>
              <div className="text-gray-400 text-[10px] font-sans font-bold uppercase">Input:</div>
              <pre className="p-2 rounded-lg bg-white dark:bg-gray-950 overflow-x-auto text-gray-800 dark:text-gray-200">
                {JSON.stringify(toolPart.input, null, 2)}
              </pre>
            </div>
          )}
          {toolPart.output && (
            <div>
              <div className="text-gray-400 text-[10px] font-sans font-bold uppercase">Output:</div>
              <pre className="p-2 rounded-lg bg-white dark:bg-gray-950 overflow-x-auto text-emerald-600 dark:text-emerald-400">
                {JSON.stringify(toolPart.output, null, 2)}
              </pre>
            </div>
          )}
          {toolPart.errorText && (
            <div className="text-rose-600 dark:text-rose-400 font-sans">
              {toolPart.errorText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
