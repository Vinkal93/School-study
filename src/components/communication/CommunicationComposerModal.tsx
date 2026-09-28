"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Send,
  MessageSquare,
  Mail,
  Bell,
  Lock,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useSchoolCommunication } from "@/hooks/useSchoolCommunication";
import { resolveTemplateVariables } from "@/lib/services/communication-template.utils";
import type {
  CommunicationChannel,
  CommunicationTriggerType,
  CommunicationTemplate,
} from "@/types/communication";

export interface RecipientInfo {
  studentId: string;
  studentName: string;
  admissionNumber?: string;
  className?: string;
  parentName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  userId?: string;
  amount?: string | number;
  dueDate?: string;
  receiptNo?: string;
}

export interface CommunicationComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName?: string;
  recipients: RecipientInfo[];
  defaultChannel?: CommunicationChannel;
  triggerType?: CommunicationTriggerType;
  initialTemplateCategory?: "fee_reminder" | "admission_welcome" | "payment_receipt" | "general";
  onSuccess?: () => void;
}

export function CommunicationComposerModal({
  isOpen,
  onClose,
  schoolId,
  schoolName = "School",
  recipients = [],
  defaultChannel = "whatsapp",
  triggerType = "manual",
  initialTemplateCategory = "fee_reminder",
  onSuccess,
}: CommunicationComposerModalProps) {
  const { access, templates, loading: accessLoading } = useSchoolCommunication(schoolId);

  const [channel, setChannel] = useState<CommunicationChannel>(defaultChannel);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("custom");
  const [customTitle, setCustomTitle] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");

  // Filter templates by selected channel & category
  const availableTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (t.channel !== channel) return false;
      if (initialTemplateCategory && t.category !== initialTemplateCategory && t.category !== "general") {
        return true; // Still allow other templates as options
      }
      return true;
    });
  }, [templates, channel, initialTemplateCategory]);

  // Load first relevant template by default
  useEffect(() => {
    if (availableTemplates.length > 0) {
      const match = availableTemplates.find((t) => t.category === initialTemplateCategory) || availableTemplates[0];
      setSelectedTemplateId(match.id);
      setCustomTitle(match.titleTemplate || "");
      setCustomBody(match.bodyTemplate || "");
    } else {
      setSelectedTemplateId("custom");
    }
  }, [availableTemplates, initialTemplateCategory]);

  // Check if current channel is permitted
  const isChannelLocked = useMemo(() => {
    if (!access) return false;
    if (channel === "whatsapp") return !access.canSendWhatsApp;
    if (channel === "email") return !access.canSendEmail;
    if (channel === "in_app") return !access.canSendInApp;
    return false;
  }, [access, channel]);

  // Template switch handler
  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    if (tplId === "custom") {
      setCustomTitle("");
      setCustomBody("");
      return;
    }
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      setCustomTitle(tpl.titleTemplate || "");
      setCustomBody(tpl.bodyTemplate || "");
    }
  };

  // Preview data based on first recipient
  const previewRecipient = recipients[0] || {
    studentName: "Aarav Sharma",
    parentName: "Rajesh Sharma",
    className: "10th - A",
    admissionNumber: "ADM-2026-001",
    amount: "2,500",
    dueDate: "10th Oct 2026",
    receiptNo: "REC-88412",
  };

  const previewData = useMemo(() => {
    return {
      student_name: previewRecipient.studentName,
      parent_name: previewRecipient.parentName || "Parent",
      class_name: previewRecipient.className || "Class",
      admission_no: previewRecipient.admissionNumber || "N/A",
      amount: previewRecipient.amount || "0",
      due_date: previewRecipient.dueDate || "Due Date",
      receipt_no: previewRecipient.receiptNo || "N/A",
      school_name: schoolName,
      pay_link: `https://schoolstudy.in/pay/${schoolId}/${previewRecipient.studentId || "student"}`,
      phone: previewRecipient.recipientPhone || "9876543210",
      login_url: "https://schoolstudy.in/login",
    };
  }, [previewRecipient, schoolName, schoolId]);

  const resolvedPreviewTitle = useMemo(() => {
    return resolveTemplateVariables(customTitle, previewData);
  }, [customTitle, previewData]);

  const resolvedPreviewBody = useMemo(() => {
    return resolveTemplateVariables(customBody, previewData);
  }, [customBody, previewData]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (isChannelLocked) {
      toast.error(access?.lockReason || "This channel is locked. Upgrade your plan to send messages.");
      return;
    }

    if (!customBody.trim()) {
      toast.error("Please enter a message or choose a template.");
      return;
    }

    if (recipients.length === 0) {
      toast.error("No recipients selected.");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/communication/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isBatch: recipients.length > 1,
          schoolId,
          channel,
          titleTemplate: customTitle,
          contentTemplate: customBody,
          triggerType,
          scheduledFor: sendMode === "schedule" ? scheduleDate : null,
          recipients: recipients.map((r) => ({
            ...r,
            recipientPhone: r.recipientPhone,
            recipientEmail: r.recipientEmail,
            userId: r.userId || r.studentId,
          })),
          // Single payload fallback
          ...(recipients.length === 1
            ? {
                studentId: recipients[0].studentId,
                studentName: recipients[0].studentName,
                admissionNumber: recipients[0].admissionNumber,
                className: recipients[0].className,
                parentName: recipients[0].parentName,
                recipientPhone: recipients[0].recipientPhone,
                recipientEmail: recipients[0].recipientEmail,
                userId: recipients[0].userId || recipients[0].studentId,
                title: resolvedPreviewTitle,
                content: resolvedPreviewBody,
              }
            : {}),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          recipients.length > 1
            ? `Dispatched to ${data.sent || recipients.length} recipients successfully!`
            : "Message dispatched successfully!"
        );
        onSuccess?.();
        onClose();
      } else {
        toast.error(data.error || "Failed to dispatch message.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Send Communication
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  {recipients.length} Recipient{recipients.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-tenant WhatsApp, Email, and In-App student messaging
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

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form & Configuration (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Channel Tabs */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Select Communication Channel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={() => setChannel("whatsapp")}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    channel === "whatsapp"
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>WhatsApp</span>
                    </div>
                    {access && !access.canSendWhatsApp && (
                      <Lock className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {access?.canSendWhatsApp ? "Instant Alert" : "Requires Pro Plan"}
                  </span>
                </button>

                {/* Email */}
                <button
                  type="button"
                  onClick={() => setChannel("email")}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    channel === "email"
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Email</span>
                    </div>
                    {access && !access.canSendEmail && (
                      <Lock className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {access?.canSendEmail ? "Detailed Statement" : "Requires Starter"}
                  </span>
                </button>

                {/* In-App Notification (Always Free) */}
                <button
                  type="button"
                  onClick={() => setChannel("in_app")}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    channel === "in_app"
                      ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Bell className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span>In-App</span>
                    </div>
                    <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                      FREE
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Student Portal Feed
                  </span>
                </button>
              </div>
            </div>

            {/* Locked Warning Banner */}
            {isChannelLocked && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-start justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-start gap-2.5">
                  <Lock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {channel.toUpperCase()} is locked on your current plan ({access?.planName || "Free"})
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                      {access?.lockReason || "Upgrade your subscription to unlock automated WhatsApp and Email notifications."}
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/billing"
                  className="shrink-0 px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
                >
                  Upgrade
                </Link>
              </div>
            )}

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Message Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="custom">-- Custom Message Composer --</option>
                {availableTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title (for Email & In-App) */}
            {(channel === "email" || channel === "in_app") && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Subject / Notification Title
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Fee Reminder Notice - {{school_name}}"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            )}

            {/* Message Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Message Content Template
                </label>
                <span className="text-[10px] text-slate-400">
                  Dynamic variables: &#123;&#123;student_name&#125;&#125;, &#123;&#123;amount&#125;&#125;, &#123;&#123;due_date&#125;&#125;
                </span>
              </div>
              <textarea
                rows={5}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                placeholder="Type your message here with dynamic variables..."
                className="w-full text-xs font-mono p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Send Option: Send Now vs Schedule */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSendMode("now")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    sendMode === "now"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500"
                  }`}
                >
                  Send Immediately
                </button>
                <button
                  type="button"
                  onClick={() => setSendMode("schedule")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    sendMode === "schedule"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500"
                  }`}
                >
                  Schedule Later
                </button>
              </div>

              {sendMode === "schedule" && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="text-xs p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Message Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span>Live Student Preview</span>
              </h3>
              <span className="text-[10px] text-slate-400">
                Previewing: {previewRecipient.studentName}
              </span>
            </div>

            {/* Phone/Screen Mockup Container */}
            <div className="flex-1 p-4 rounded-3xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
              <div className="space-y-3">
                {/* Channel Preview Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  <span className="font-bold flex items-center gap-1.5">
                    {channel === "whatsapp" && <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />}
                    {channel === "email" && <Mail className="h-3.5 w-3.5 text-blue-500" />}
                    {channel === "in_app" && <Bell className="h-3.5 w-3.5 text-purple-500" />}
                    <span>{channel.toUpperCase()} CHANNEL</span>
                  </span>
                  <span>Now</span>
                </div>

                {/* Email Subject / Title */}
                {resolvedPreviewTitle && (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                    {resolvedPreviewTitle}
                  </div>
                )}

                {/* Bubble Message */}
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${
                    channel === "whatsapp"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-slate-800 dark:text-slate-200"
                      : channel === "email"
                        ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                        : "bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {resolvedPreviewBody || "Your message preview will appear here as you type..."}
                </div>
              </div>

              {/* Summary Pill */}
              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Total Recipients:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-bold">{recipients.length} Student(s)</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="text-xs text-slate-500">
            {isChannelLocked ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Feature locked on current subscription plan
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Channel active and ready to deliver
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSending || isChannelLocked || recipients.length === 0 || !customBody.trim()}
              onClick={handleSend}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>
                    {sendMode === "schedule" ? "Schedule Message" : `Send Now (${recipients.length})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
