"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  FileText,
  Calendar,
  AlertTriangle,
  Receipt,
  Loader2,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { getStudentFeeSummary, getFeeSettings, type StudentFeeSummary } from "@/lib/services/fee.service";
import type { FeeSettings } from "@/types";
import {
  formatStudentFeeMessage,
  generateWhatsAppLink,
  type FeeShareMode,
} from "@/lib/services/fee-share.service";
import { useAuth } from "@/hooks/use-auth";

export interface ShareFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    rollNumber?: number | string;
    className: string;
    sectionName?: string;
    phone?: string;
    parentPhone?: string;
  } | null;
  initialMode?: FeeShareMode;
}

export function ShareFeeModal({
  isOpen,
  onClose,
  schoolId,
  student,
  initialMode = "FULL_DUE",
}: ShareFeeModalProps) {
  const { profile } = useAuth();
  const [mode, setMode] = useState<FeeShareMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<StudentFeeSummary | null>(null);
  const [feeSettings, setFeeSettings] = useState<FeeSettings | null>(null);
  const [copied, setCopied] = useState(false);
  const [customPhone, setCustomPhone] = useState("");

  // Sync initial phone and mode
  useEffect(() => {
    if (student) {
      setCustomPhone(student.phone || student.parentPhone || "");
      setMode(initialMode);
    }
  }, [student, initialMode]);

  // Load authoritative fee data from database
  useEffect(() => {
    async function loadData() {
      if (!isOpen || !schoolId || !student?.id) return;
      setLoading(true);
      try {
        const [data, settings] = await Promise.all([
          getStudentFeeSummary(schoolId, {
            id: student.id,
            name: student.name,
            admissionNumber: student.admissionNumber || student.id,
            className: student.className,
            sectionName: student.sectionName || "A",
          }),
          getFeeSettings(schoolId),
        ]);
        setSummary(data);
        setFeeSettings(settings);
      } catch (err) {
        console.error("Failed to load fee summary for sharing:", err);
        toast.error("Failed to load student fee ledger.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isOpen, schoolId, student]);

  // Generate formatted message
  const formattedMessage = useMemo(() => {
    if (!student || !summary) return "";
    return formatStudentFeeMessage({
      schoolName: feeSettings?.schoolName || (profile as any)?.schoolName || "School",
      schoolPhone: (profile as any)?.phone || "",
      schoolEmail: (profile as any)?.email || "",
      upiId: feeSettings?.upiId || "",
      upiNumber: feeSettings?.upiNumber || "",
      studentName: student.name,
      admissionNumber: student.admissionNumber || student.id,
      rollNumber: student.rollNumber,
      className: student.className,
      sectionName: student.sectionName,
      phone: customPhone,
      mode,
      summary,
    });
  }, [student, summary, profile, feeSettings, mode, customPhone]);

  if (!isOpen || !student) return null;

  const handleCopy = async () => {
    if (!formattedMessage) return;
    try {
      await navigator.clipboard.writeText(formattedMessage);
      setCopied(true);
      toast.success("Fee statement copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy text to clipboard.");
    }
  };

  const handleWhatsApp = () => {
    if (!formattedMessage) return;
    const link = generateWhatsAppLink(customPhone, formattedMessage);
    if (!link) {
      toast.error("Please enter a valid phone number with country code.");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const modesList: Array<{ id: FeeShareMode; label: string; icon: any; desc: string }> = [
    {
      id: "FULL_DUE",
      label: "Full Fee Statement",
      icon: FileText,
      desc: "Complete assigned, paid, and total pending breakdown",
    },
    {
      id: "CURRENT_MONTH",
      label: "Current Month",
      icon: Calendar,
      desc: "Active month fee amount and upcoming due date",
    },
    {
      id: "PAYMENT_REMINDER",
      label: "Payment Reminder",
      icon: AlertTriangle,
      desc: "Polite reminder for overdue periods and settlement",
    },
    {
      id: "PAYMENT_HISTORY",
      label: "Receipt History",
      icon: Receipt,
      desc: "Past verified receipts and paid transaction records",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Share Fee Statement
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {student.name} • {student.className} ({student.sectionName || "A"}) • Adm #{student.admissionNumber || student.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-xs font-semibold">Retrieving real fee ledger from database...</p>
            </div>
          ) : (
            <>
              {/* Mode Selection Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Choose Statement Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {modesList.map((m) => {
                    const Icon = m.icon;
                    const isSelected = mode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id)}
                        className={`flex flex-col text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-extrabold text-xs">
                          <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />
                          <span>{m.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {m.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  WhatsApp / Contact Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="Enter phone number (e.g. 9876543210)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white shadow-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Prefix with country code if outside India (defaults to +91).
                </p>
              </div>

              {/* Live Preview Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Live Message Preview
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓ Verified Real Data
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 font-mono text-[11px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-56 overflow-y-auto select-all shadow-inner">
                  {formattedMessage}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-[11px] text-slate-400 text-center sm:text-left">
            ℹ️ Sharing fee details does not modify any financial balance or mark fees as paid.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopy}
              disabled={loading || !formattedMessage}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "Copied!" : "Copy Statement"}</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              disabled={loading || !formattedMessage || !customPhone.trim()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <MessageSquare className="h-4 w-4 fill-current" />
              <span>Share on WhatsApp</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
