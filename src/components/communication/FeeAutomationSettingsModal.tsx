"use client";

import React, { useState } from "react";
import {
  X,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Mail,
  Bell,
  Lock,
  Layers,
  Sparkles,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useSchoolCommunication } from "@/hooks/useSchoolCommunication";
import type { FeeAutomationRule, CommunicationChannel } from "@/types/communication";

export interface FeeAutomationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName?: string;
}

export function FeeAutomationSettingsModal({
  isOpen,
  onClose,
  schoolId,
  schoolName = "School",
}: FeeAutomationSettingsModalProps) {
  const { access, rules, refresh } = useSchoolCommunication(schoolId);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const canAutomate = access?.canAutomate;

  const handleToggleRule = async (rule: FeeAutomationRule) => {
    try {
      const res = await fetch("/api/communication/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          action: "save_rule",
          rule: {
            ...rule,
            enabled: !rule.enabled,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Rule "${rule.name}" ${!rule.enabled ? "enabled" : "disabled"}`);
        refresh();
      } else {
        toast.error(data.error || "Failed to update rule");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update rule");
    }
  };

  const handleToggleChannel = async (rule: FeeAutomationRule, ch: CommunicationChannel) => {
    const nextChannels = rule.channels.includes(ch)
      ? rule.channels.filter((c) => c !== ch)
      : [...rule.channels, ch];

    if (nextChannels.length === 0) {
      toast.error("At least one communication channel must be selected.");
      return;
    }

    try {
      const res = await fetch("/api/communication/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          action: "save_rule",
          rule: {
            ...rule,
            channels: nextChannels,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Updated channels for "${rule.name}"`);
        refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update channels");
    }
  };

  const handleRunNow = async () => {
    if (!canAutomate) {
      toast.error(access?.lockReason || "Automation requires a Growth or Professional plan.");
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);
    try {
      const res = await fetch("/api/communication/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId }),
      });
      const data = await res.json();
      if (data.success) {
        setExecutionResult(data.report);
        toast.success(
          `Automation executed! Dispatched ${data.report.messagesDispatched} reminders across enabled channels.`
        );
      } else {
        toast.error(data.error || "Automation run failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "Automation execution error.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Fee Reminder Automation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatic scheduled WhatsApp, Email & In-App payment reminders
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {!canAutomate && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-start justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-start gap-2.5">
                <Lock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">Automation Locked on Current Plan</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    {access?.lockReason || "Automated fee alerts require Growth or Professional subscription plan."}
                  </p>
                </div>
              </div>
              <Link
                href="/admin/billing"
                className="shrink-0 px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
              >
                Upgrade Plan
              </Link>
            </div>
          )}

          {/* Rules List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Configured Reminder Triggers
            </h3>

            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {rule.name}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        rule.enabled
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {rule.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {rule.type === "before_due" && "Triggers 3 days before student due date"}
                    {rule.type === "on_due" && "Triggers on exact fee due date"}
                    {rule.type === "overdue" && "Triggers 3 days after unpaid due date"}
                    {rule.type === "late_fee" && "Triggers when late fees are accrued"}
                  </p>

                  {/* Channel Toggles */}
                  <div className="flex items-center gap-1.5 pt-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold mr-1">Channels:</span>
                    <button
                      type="button"
                      onClick={() => handleToggleChannel(rule, "whatsapp")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        rule.channels.includes("whatsapp")
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleChannel(rule, "email")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        rule.channels.includes("email")
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      <Mail className="h-3 w-3" />
                      <span>Email</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleChannel(rule, "in_app")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        rule.channels.includes("in_app")
                          ? "bg-purple-600 text-white shadow-2xs"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      <Bell className="h-3 w-3" />
                      <span>In-App</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      rule.enabled
                        ? "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                    }`}
                  >
                    {rule.enabled ? "Pause" : "Enable"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Execution Report if Run */}
          {executionResult && (
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Execution Summary</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(executionResult.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Scanned</span>
                  <strong className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    {executionResult.totalStudentsScanned}
                  </strong>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Dispatched</span>
                  <strong className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    {executionResult.messagesDispatched}
                  </strong>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Skipped (Dup)</span>
                  <strong className="text-sm font-extrabold text-slate-500">
                    {executionResult.duplicatesSkipped}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <p className="text-xs text-slate-400">
            Automations execute daily at 09:00 AM with duplicate prevention.
          </p>

          <button
            type="button"
            disabled={isRunning || !canAutomate}
            onClick={handleRunNow}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Running Automation...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Run Automation Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
