"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  Shield,
  Clock,
  User,
  Building2,
  Lock,
  CheckCircle2,
  Copy,
  Check,
  FileText,
  Terminal,
  Activity,
  Layers,
} from "lucide-react";
import type { AuditLogEntry } from "@/types";
import { toast } from "sonner";

interface AuditDetailDrawerProps {
  log: AuditLogEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditDetailDrawer({ log, isOpen, onClose }: AuditDetailDrawerProps) {
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen || !log) return null;

  const handleCopyId = () => {
    if (!log.id) return;
    navigator.clipboard.writeText(log.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast.success("Audit Log ID copied to clipboard");
  };

  const sanitizeStateObject = (obj: any) => {
    if (!obj || typeof obj !== "object") return obj;
    const sanitized = { ...obj };
    const secretKeys = ["password", "token", "accessToken", "refreshToken", "secret", "apiKey"];
    for (const key of Object.keys(sanitized)) {
      if (secretKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = "•••••••• [REDACTED]";
      }
    }
    return sanitized;
  };

  const actorName = log.actorName || log.performedBy?.name || "System / Admin";
  const actorEmail = log.actorEmail || log.performedBy?.email || "—";
  const actorRole = log.actorRole || log.performedBy?.role || "super_admin";
  const actorUid = log.actorId || log.performedBy?.uid || "system";

  const targetName = log.targetUserName || log.targetName || log.targetUserId || log.targetId || "—";
  const targetType = log.entityType || log.targetType || "entity";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-950 h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800">
        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Audit Record Inspector
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Immutable
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                ID: {log.id || "system-log"}
                <button
                  onClick={handleCopyId}
                  className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
                >
                  {copiedId ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Action Overview Card */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase">Action Executed</span>
              <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                {log.action}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Timestamp:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">
                {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "Recent"}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-200/60 dark:border-gray-800 text-xs">
              <span className="text-gray-500 block font-medium">Administrative Reason / Justification:</span>
              <p className="mt-1 font-semibold text-gray-800 dark:text-gray-200 italic bg-white dark:bg-gray-950 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800">
                "{log.reason || "No explicit reason specified by performer."}"
              </p>
            </div>
          </div>

          {/* Actor & Target Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Actor Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/20 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white mb-2">
                <User className="h-4 w-4 text-blue-600" />
                Actor / Performer
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Name:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{actorName}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Email:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{actorEmail}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Role:</span>
                <span className="font-mono uppercase font-bold text-purple-600 dark:text-purple-400">
                  {actorRole}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">UID:</span>
                <span className="font-mono text-[11px] text-gray-500">{actorUid}</span>
              </div>
            </div>

            {/* Target Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/20 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white mb-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                Target Entity
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Target Name / ID:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{targetName}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Entity Type:</span>
                <span className="font-mono capitalize font-semibold text-gray-800 dark:text-gray-200">
                  {targetType}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">School Scope:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {log.targetSchoolName || log.targetSchoolId || "Platform Global"}
                </span>
              </div>
            </div>
          </div>

          {/* State Diff Viewer (Previous State vs New State) */}
          {(log.previousState || log.newState) && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white text-xs">
                <Terminal className="h-4 w-4 text-purple-600" />
                Structured State Modification Diff
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">
                    Previous State
                  </span>
                  <pre className="p-3 rounded-xl bg-gray-900 text-gray-100 dark:bg-gray-900/90 font-mono text-[11px] overflow-x-auto border border-gray-800 max-h-56">
                    {JSON.stringify(sanitizeStateObject(log.previousState) || {}, null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">
                    New State
                  </span>
                  <pre className="p-3 rounded-xl bg-gray-900 text-green-400 dark:bg-gray-900/90 font-mono text-[11px] overflow-x-auto border border-gray-800 max-h-56">
                    {JSON.stringify(sanitizeStateObject(log.newState) || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Network & Device Telemetry */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 dark:border-gray-800 dark:bg-gray-900/20 space-y-2 text-xs">
            <span className="font-bold text-gray-700 dark:text-gray-300 block">
              Network & Telemetry Signature
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-gray-400">Client IP Address:</span>
                <p className="font-mono text-gray-700 dark:text-gray-300">{log.ipAddress || "client-direct"}</p>
              </div>
              <div>
                <span className="text-gray-400">User Agent Signature:</span>
                <p className="text-gray-700 dark:text-gray-300 truncate" title={log.userAgent}>
                  {log.userAgent || "Browser"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
