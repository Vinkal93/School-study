"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useSchoolCommunication } from "@/hooks/useSchoolCommunication";
import {
  CommunicationComposerModal,
  type RecipientInfo,
} from "@/components/communication/CommunicationComposerModal";
import { resolveTemplateVariables } from "@/lib/services/communication-template.utils";
import type {
  CommunicationChannel,
  CommunicationLogEntry,
  CommunicationTemplate,
  FeeAutomationRule,
} from "@/types/communication";
import {
  MessageSquare,
  Mail,
  Bell,
  Sparkles,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Lock,
  Unlock,
  ChevronRight,
  TrendingUp,
  Layers,
  RotateCcw,
  Check,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "sonner";

function SchoolCommunicationHubContent() {
  const searchParams = useSearchParams();
  const channelParam = searchParams.get("channel") as CommunicationChannel | null;
  const tabParam = searchParams.get("tab");

  const { profile } = useAuth();
  const effectiveSchoolId =
    profile?.schoolId ||
    (typeof window !== "undefined" ? localStorage.getItem("currentSchoolId") || "" : "");
  const schoolId = effectiveSchoolId;
  const schoolName = (profile as any)?.schoolName || "Institution";

  const { access, templates, rules, recentLogs, loading, error, refresh } =
    useSchoolCommunication(schoolId);

  // Active Hub View
  const [activeTab, setActiveTab] = useState<
    "overview" | "whatsapp" | "email" | "in_app" | "automation" | "logs"
  >(
    tabParam === "automation"
      ? "automation"
      : tabParam === "logs"
      ? "logs"
      : channelParam === "whatsapp"
      ? "whatsapp"
      : channelParam === "email"
      ? "email"
      : channelParam === "in_app"
      ? "in_app"
      : "overview"
  );

  useEffect(() => {
    if (tabParam === "automation") setActiveTab("automation");
    else if (tabParam === "logs") setActiveTab("logs");
    else if (channelParam === "whatsapp") setActiveTab("whatsapp");
    else if (channelParam === "email") setActiveTab("email");
    else if (channelParam === "in_app") setActiveTab("in_app");
  }, [tabParam, channelParam]);

  // Modal State
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerChannel, setComposerChannel] = useState<CommunicationChannel>("whatsapp");
  const [composerCategory, setComposerCategory] = useState<any>("fee_reminder");

  // Quick Send Form in Page
  const [quickChannel, setQuickChannel] = useState<CommunicationChannel>("whatsapp");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [quickRecipientPhone, setQuickRecipientPhone] = useState("");
  const [quickRecipientName, setQuickRecipientName] = useState("John Doe");
  const [quickAmount, setQuickAmount] = useState("4,500");
  const [quickDueDate, setQuickDueDate] = useState("10th of this month");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickBody, setQuickBody] = useState("");
  const [isSendingQuick, setIsSendingQuick] = useState(false);

  // Table Filters
  const [logSearch, setLogSearch] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState("all");
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [isRunningAutomation, setIsRunningAutomation] = useState(false);

  // Filter templates based on channel
  const availableTemplates = useMemo(() => {
    return templates.filter((t) => t.channel === quickChannel);
  }, [templates, quickChannel]);

  // Sync quick send template when channel or template changes
  useEffect(() => {
    if (availableTemplates.length > 0) {
      const match = availableTemplates[0];
      setSelectedTemplateId(match.id);
      setQuickTitle(match.titleTemplate || "");
      setQuickBody(match.bodyTemplate || "");
    } else {
      setSelectedTemplateId("custom");
      setQuickTitle("");
      setQuickBody("");
    }
  }, [quickChannel, availableTemplates]);

  // Preview interpolation
  const interpolatedBody = useMemo(() => {
    return resolveTemplateVariables(quickBody, {
      student_name: quickRecipientName || "Student",
      school_name: schoolName,
      fee_amount: `₹${quickAmount}`,
      due_date: quickDueDate,
      admission_number: "ADM-1029",
      class_name: "Class 10-A",
      receipt_no: "REC-9941",
    });
  }, [quickBody, quickRecipientName, schoolName, quickAmount, quickDueDate]);

  // Quick Send Handler
  const handleQuickSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) {
      toast.error("School context missing.");
      return;
    }

    if (quickChannel === "whatsapp" && !access?.canSendWhatsApp) {
      toast.error("WhatsApp messaging is not enabled on your current plan.");
      return;
    }

    if (!quickBody.trim()) {
      toast.error("Please enter a message body.");
      return;
    }

    if (quickChannel === "whatsapp" && !quickRecipientPhone.trim()) {
      toast.error("Please enter a recipient phone number.");
      return;
    }

    setIsSendingQuick(true);
    try {
      const res = await fetch("/api/communication/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          channel: quickChannel,
          recipients: [
            {
              studentId: "direct_demo",
              studentName: quickRecipientName,
              recipientPhone: quickRecipientPhone,
              recipientEmail: quickRecipientPhone.includes("@") ? quickRecipientPhone : undefined,
              amount: quickAmount,
              dueDate: quickDueDate,
            },
          ],
          title: quickTitle,
          body: quickBody,
          triggerType: "manual",
          schoolName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Message dispatched via ${quickChannel.toUpperCase()}!`);
        refresh();
      } else {
        toast.error(data.error || "Failed to dispatch message");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error dispatching message");
    } finally {
      setIsSendingQuick(false);
    }
  };

  // Trigger manual daily automation job
  const handleRunAutomation = async () => {
    if (!schoolId) return;
    setIsRunningAutomation(true);
    try {
      const res = await fetch("/api/communication/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Automations evaluated! Processed ${data.processedCount || 0} alerts.`);
        refresh();
      } else {
        toast.error(data.error || "Automation run failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Automation failed");
    } finally {
      setIsRunningAutomation(false);
    }
  };

  // Retry failed delivery
  const handleRetryMessage = async (log: CommunicationLogEntry) => {
    setRetryingLogId(log.id);
    try {
      const res = await fetch("/api/communication/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId: log.id, schoolId: log.schoolId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Message retried successfully!");
        refresh();
      } else {
        toast.error(data.message || "Retry failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Retry request failed");
    } finally {
      setRetryingLogId(null);
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return recentLogs.filter((l) => {
      if (activeTab === "whatsapp" && l.channel !== "whatsapp") return false;
      if (activeTab === "email" && l.channel !== "email") return false;
      if (activeTab === "in_app" && l.channel !== "in_app") return false;
      if (logStatusFilter !== "all" && l.status !== logStatusFilter) return false;
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        return (
          l.studentName?.toLowerCase().includes(q) ||
          l.recipient?.toLowerCase().includes(q) ||
          l.title?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [recentLogs, activeTab, logStatusFilter, logSearch]);

  const stats = useMemo(() => {
    const total = recentLogs.length;
    const wa = recentLogs.filter((l) => l.channel === "whatsapp").length;
    const delivered = recentLogs.filter((l) => l.status === "delivered" || l.status === "sent").length;
    const failed = recentLogs.filter((l) => l.status === "failed").length;
    return { total, wa, delivered, failed };
  }, [recentLogs]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Send className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Communication & Notifications Hub
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Send WhatsApp notices, email circulars, and instant in-app alerts to parents and students.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setComposerChannel(activeTab === "email" ? "email" : activeTab === "in_app" ? "in_app" : "whatsapp");
              setComposerCategory("fee_reminder");
              setComposerOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-xs font-bold text-white shadow-sm shadow-indigo-600/30 transition cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Compose Message</span>
          </button>
        </div>
      </div>

      {/* Plan Restriction Banner if WhatsApp is locked */}
      {access && !access.canSendWhatsApp && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                WhatsApp Cloud Messaging is locked on your current plan
              </h4>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                Automated WhatsApp reminders to parents are enabled on Professional and Enterprise tiers.
              </p>
            </div>
          </div>
          <Link
            href="/admin/subscription"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition"
          >
            <span>Upgrade Plan</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Channel Status Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* WhatsApp Gateway */}
        <div
          onClick={() => setActiveTab("whatsapp")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "whatsapp"
              ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                access?.canSendWhatsApp
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {access?.canSendWhatsApp ? "Active Gateway" : "Plan Locked"}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">WhatsApp Cloud</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {stats.wa} messages sent • Central Twilio Gateway
          </p>
        </div>

        {/* Email Alerts */}
        <div
          onClick={() => setActiveTab("email")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "email"
              ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                access?.canSendEmail
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {access?.canSendEmail ? "Active" : "Disabled"}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Email Circulars</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Formatted receipts & announcements
          </p>
        </div>

        {/* In-App Alerts */}
        <div
          onClick={() => setActiveTab("in_app")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "in_app"
              ? "bg-purple-50/50 dark:bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-9 w-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Bell className="h-5 w-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              Free Forever
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">In-App Notifications</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time feed in student & parent apps
          </p>
        </div>

        {/* Automation Rules */}
        <div
          onClick={() => setActiveTab("automation")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "automation"
              ? "bg-amber-50/50 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                access?.canAutomate
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {rules.length} Active Rules
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fee Automations</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Auto-dispatched on due date & overdue
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: "overview", label: "Quick Send & Templates", icon: Sparkles },
          { id: "whatsapp", label: "WhatsApp Channel", icon: MessageSquare },
          { id: "email", label: "Email Channel", icon: Mail },
          { id: "in_app", label: "In-App Feed", icon: Bell },
          { id: "automation", label: "Fee Due Automations", icon: Clock },
          { id: "logs", label: `Delivery Logs (${recentLogs.length})`, icon: TrendingUp },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === t.id
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* SECTION 1: QUICK SEND & INTERACTIVE PREVIEW (Default Overview / WhatsApp / Email) */}
      {(activeTab === "overview" || activeTab === "whatsapp" || activeTab === "email" || activeTab === "in_app") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Compose Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="h-4 w-4 text-indigo-500" />
                  Direct Message Dispatch
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Send directly to a student phone or test WhatsApp alert delivery.
                </p>
              </div>

              {/* Channel Selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setQuickChannel("whatsapp")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    quickChannel === "whatsapp"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setQuickChannel("email")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    quickChannel === "email"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setQuickChannel("in_app")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    quickChannel === "in_app"
                      ? "bg-purple-600 text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  In-App
                </button>
              </div>
            </div>

            <form onSubmit={handleQuickSend} className="space-y-4 text-xs">
              {/* Template Picker */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedTemplateId(id);
                    if (id === "custom") {
                      setQuickTitle("");
                      setQuickBody("");
                    } else {
                      const t = availableTemplates.find((x) => x.id === id);
                      if (t) {
                        setQuickTitle(t.titleTemplate || "");
                        setQuickBody(t.bodyTemplate || "");
                      }
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs"
                >
                  {availableTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.category})
                    </option>
                  ))}
                  <option value="custom">-- Custom Freeform Message --</option>
                </select>
              </div>

              {/* Recipient Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Student / Parent Name
                  </label>
                  <input
                    type="text"
                    value={quickRecipientName}
                    onChange={(e) => setQuickRecipientName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {quickChannel === "email" ? "Recipient Email" : "WhatsApp Phone (+91...)"}
                  </label>
                  <input
                    type="text"
                    value={quickRecipientPhone}
                    onChange={(e) => setQuickRecipientPhone(e.target.value)}
                    placeholder={quickChannel === "email" ? "parent@gmail.com" : "+91 98765 43210"}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Optional Fee context variables for preview */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Fee Amount (Variable)</label>
                  <input
                    type="text"
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                    placeholder="4,500"
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Due Date (Variable)</label>
                  <input
                    type="text"
                    value={quickDueDate}
                    onChange={(e) => setQuickDueDate(e.target.value)}
                    placeholder="10th March 2026"
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                </div>
              </div>

              {/* Title (for Email & In-App) */}
              {quickChannel !== "whatsapp" && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject / Title
                  </label>
                  <input
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder="Important Notice from Institution"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium"
                  />
                </div>
              )}

              {/* Message Body */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Message Content (Supports {"{student_name}"}, {"{fee_amount}"}, {"{school_name}"})
                </label>
                <textarea
                  rows={4}
                  value={quickBody}
                  onChange={(e) => setQuickBody(e.target.value)}
                  placeholder="Type message text here..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  ⚡ Centralized Gateway • No Twilio credentials needed
                </span>
                <button
                  type="submit"
                  disabled={isSendingQuick || (quickChannel === "whatsapp" && !access?.canSendWhatsApp)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSendingQuick ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>{isSendingQuick ? "Dispatching..." : `Send ${quickChannel.toUpperCase()}`}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right: Live Interactive Visual Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-semibold">
                <span className="text-slate-400">Recipient Preview</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                  {quickChannel.toUpperCase()}
                </span>
              </div>

              {quickChannel === "whatsapp" ? (
                /* WhatsApp Chat Phone Mockup */
                <div className="mt-4 p-4 rounded-2xl bg-[#0b141a] border border-[#222d34] min-h-[260px] flex flex-col justify-end">
                  <div className="max-w-[90%] bg-[#005c4b] text-[#e9edef] p-3 rounded-2xl rounded-tr-none text-xs space-y-1 shadow-md self-end">
                    <span className="block font-bold text-emerald-300 text-[11px]">{schoolName}</span>
                    <p className="whitespace-pre-wrap text-[11px] leading-relaxed">
                      {interpolatedBody || "Your message will appear here with live preview variables interpolated."}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/60 pt-1">
                      <span>10:32 AM</span>
                      <Check className="h-3 w-3 text-cyan-400" />
                    </div>
                  </div>
                </div>
              ) : quickChannel === "email" ? (
                /* Email Mockup */
                <div className="mt-4 p-4 rounded-2xl bg-white text-slate-800 min-h-[260px] flex flex-col">
                  <div className="border-b pb-2 mb-2 text-xs">
                    <span className="text-slate-400">From:</span> <strong>{schoolName} &lt;notifications@schoolstudy.in&gt;</strong>
                    <br />
                    <span className="text-slate-400">Subject:</span> <strong>{quickTitle || "Institutional Notice"}</strong>
                  </div>
                  <div className="whitespace-pre-wrap text-xs text-slate-700 leading-relaxed flex-1">
                    {interpolatedBody || "Your email body text will appear here."}
                  </div>
                  <div className="pt-3 border-t text-[10px] text-slate-400 text-center">
                    Sent via {schoolName} Academic Portal
                  </div>
                </div>
              ) : (
                /* In-App Notification Bubble */
                <div className="mt-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 min-h-[260px] flex items-center justify-center">
                  <div className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-lg space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5" />
                        {schoolName}
                      </span>
                      <span className="text-[10px] text-slate-400">Just now</span>
                    </div>
                    <span className="block font-semibold text-xs text-white">{quickTitle || "School Notice"}</span>
                    <p className="text-xs text-slate-300 line-clamp-3 whitespace-pre-wrap">
                      {interpolatedBody || "In-app alert notification body will appear here."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Helper tips */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Info className="h-4 w-4 text-indigo-500" />
                <span>Bulk Message Sending</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                To send bulk reminders to entire classes or all fee defaulters with 1-click, open the Fee Defaulters ledger or click <strong>&quot;Compose Message&quot;</strong> in the top header.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: FEE AUTOMATION RULES */}
      {activeTab === "automation" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Automated Fee Reminder Rules
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Our cron service evaluates these trigger rules daily at 09:00 AM IST to notify guardians without manual intervention.
              </p>
            </div>

            <button
              type="button"
              disabled={isRunningAutomation}
              onClick={handleRunAutomation}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isRunningAutomation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span>{isRunningAutomation ? "Evaluating..." : "Run Automations Now"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-xs text-slate-400">
                No custom automation rules loaded. Standard platform default triggers are active.
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {rule.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rule.enabled
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {rule.enabled ? "Active" : "Paused"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="uppercase font-semibold text-indigo-600 dark:text-indigo-400">
                      Channels: {(rule.channels || []).join(", ")}
                    </span>
                    <span>•</span>
                    <span>
                      Trigger: {rule.daysOffset === 0 ? "On Due Date" : rule.daysOffset < 0 ? `${Math.abs(rule.daysOffset)} Days Before Due` : `${rule.daysOffset} Days Overdue`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 line-clamp-2">
                    {rule.bodyTemplate}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: DELIVERY LOGS & AUDIT TRAIL */}
      {(activeTab === "logs" || activeTab === "whatsapp" || activeTab === "email" || activeTab === "in_app") && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Live Delivery Logs & Audit Trail
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track delivery statuses, timestamps, and retry any failed messages.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search recipient..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                />
              </div>

              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
              >
                <option value="all">All Status</option>
                <option value="delivered">Delivered / Sent</option>
                <option value="failed">Failed Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                  <th className="pb-2.5">Recipient</th>
                  <th className="pb-2.5">Channel</th>
                  <th className="pb-2.5">Type</th>
                  <th className="pb-2.5">Dispatched At</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No delivery logs recorded for this view.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                        <div>{log.studentName || "Student"}</div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {log.recipient || "In-App User"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {log.channel === "whatsapp" ? (
                            <MessageSquare className="h-3 w-3 text-emerald-500" />
                          ) : log.channel === "email" ? (
                            <Mail className="h-3 w-3 text-blue-500" />
                          ) : (
                            <Bell className="h-3 w-3 text-purple-500" />
                          )}
                          {log.channel}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">
                        {log.triggerType === "fee_reminder"
                          ? "Fee Reminder"
                          : log.triggerType === "fee_receipt"
                          ? "Fee Receipt"
                          : log.triggerType === "automation"
                          ? "Auto Reminder"
                          : log.triggerType === "admission"
                          ? "Admission"
                          : "Direct / Manual"}
                      </td>
                      <td className="py-3 text-slate-500 text-[11px]">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.status === "delivered" || log.status === "sent"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {log.status}
                        </span>
                        {log.errorReason && (
                          <span className="block text-[9px] text-red-500 max-w-xs truncate" title={log.errorReason}>
                            {log.errorReason}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {log.status === "failed" && (
                          <button
                            type="button"
                            disabled={retryingLogId === log.id}
                            onClick={() => handleRetryMessage(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                          >
                            <RotateCcw className={`h-3 w-3 ${retryingLogId === log.id ? "animate-spin" : ""}`} />
                            <span>Retry</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Communication Modal */}
      {composerOpen && (
        <CommunicationComposerModal
          isOpen={composerOpen}
          onClose={() => setComposerOpen(false)}
          schoolId={schoolId}
          schoolName={schoolName}
          recipients={[]}
          defaultChannel={composerChannel}
          initialTemplateCategory={composerCategory}
          onSuccess={() => {
            refresh();
            toast.success("Messages dispatched successfully!");
          }}
        />
      )}
    </div>
  );
}

export default function SchoolCommunicationHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <SchoolCommunicationHubContent />
    </Suspense>
  );
}
