"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Mail,
  Bell,
  Clock,
  ShieldCheck,
  Building2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Save,
  Send,
  Eye,
  Key,
  Layers,
  Sparkles,
  Settings,
  Sliders,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import type {
  GlobalCommunicationSettings,
  CommunicationLogEntry,
  CommunicationTemplate,
} from "@/types/communication";

export default function SuperAdminCommunicationPage() {
  const [settings, setSettings] = useState<GlobalCommunicationSettings | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [logs, setLogs] = useState<CommunicationLogEntry[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "providers" | "schools" | "plans" | "logs">("overview");

  // Edit states for providers
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioFrom, setTwilioFrom] = useState("");
  const [emailProvider, setEmailProvider] = useState<any>("none");
  const [emailApiKey, setEmailApiKey] = useState("");
  const [emailSender, setEmailSender] = useState("");
  const [emailSenderName, setEmailSenderName] = useState("");

  // Filters for schools and logs
  const [schoolSearch, setSchoolSearch] = useState("");
  const [logChannelFilter, setLogChannelFilter] = useState("all");
  const [logStatusFilter, setLogStatusFilter] = useState("all");
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch full data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/super-admin/communication");
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setSchools(data.schools || []);
        setLogs(data.recentLogs || []);
        setTemplates(data.templates || []);

        // Sync provider form
        setTwilioSid(data.settings.twilio.accountSid || "");
        setTwilioToken(data.settings.twilio.authToken || "");
        setTwilioFrom(data.settings.twilio.fromNumber || "whatsapp:+14155238886");
        setEmailProvider(data.settings.email.provider || "none");
        setEmailApiKey(data.settings.email.apiKey || "");
        setEmailSender(data.settings.email.senderEmail || "notifications@schoolstudy.in");
        setEmailSenderName(data.settings.email.senderName || "School Study Platform");
      } else {
        toast.error(data.error || "Failed to load communication controls");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save Provider Credentials & Master Switches
  const handleSaveProviders = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/super-admin/communication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settingsUpdate: {
            twilio: {
              accountSid: twilioSid.trim(),
              authToken: twilioToken.trim(),
              fromNumber: twilioFrom.trim(),
            },
            email: {
              provider: emailProvider,
              apiKey: emailApiKey.trim(),
              senderEmail: emailSender.trim(),
              senderName: emailSenderName.trim(),
            },
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Provider configuration saved successfully!");
        fetchData();
      } else {
        toast.error(data.error || "Failed to save configuration");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Global Master Switches
  const handleToggleGlobalChannel = async (key: "master" | "whatsapp" | "email" | "in_app" | "automation") => {
    if (!settings) return;
    try {
      const nextSettings: any = {};
      if (key === "master") {
        nextSettings.masterEnabled = !settings.masterEnabled;
      } else {
        nextSettings.channels = {
          ...settings.channels,
          [key]: !settings.channels[key],
        };
      }

      const res = await fetch("/api/super-admin/communication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settingsUpdate: nextSettings }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Global ${key} toggle updated`);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle setting");
    }
  };

  // School Manual Override
  const handleToggleSchoolOverride = async (schoolId: string, currentOverride: boolean | undefined) => {
    try {
      const nextState = currentOverride === false ? true : false;
      const res = await fetch("/api/super-admin/communication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "override_school",
          schoolId,
          overrideData: {
            enabled: nextState,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`School override set to ${nextState ? "Enabled" : "Disabled"}`);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update override");
    }
  };

  // Retry Failed Message
  const handleRetryMessage = async (log: CommunicationLogEntry) => {
    setRetryingLogId(log.id);
    try {
      const res = await fetch("/api/communication/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logId: log.id,
          schoolId: log.schoolId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Message retried successfully!");
        fetchData();
      } else {
        toast.error(data.message || "Retry failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Retry failed");
    } finally {
      setRetryingLogId(null);
    }
  };

  // Filtered Schools
  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return schools;
    const q = schoolSearch.toLowerCase();
    return schools.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.planName.toLowerCase().includes(q)
    );
  }, [schools, schoolSearch]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (logChannelFilter !== "all" && l.channel !== logChannelFilter) return false;
      if (logStatusFilter !== "all" && l.status !== logStatusFilter) return false;
      return true;
    });
  }, [logs, logChannelFilter, logStatusFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = logs.length;
    const wa = logs.filter((l) => l.channel === "whatsapp").length;
    const email = logs.filter((l) => l.channel === "email").length;
    const inApp = logs.filter((l) => l.channel === "in_app").length;
    const delivered = logs.filter((l) => l.status === "delivered" || l.status === "sent").length;
    const failed = logs.filter((l) => l.status === "failed").length;

    return { total, wa, email, inApp, delivered, failed };
  }, [logs]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 px-4 sm:px-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-3 border border-indigo-500/30">
            <ShieldCheck className="h-4 w-4" />
            <span>Platform Operations & Carrier Command</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Multi-Tenant Communication Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Centralized WhatsApp/Twilio infrastructure, Email gateways, In-App delivery pipelines, tenant isolation policies, and fee reminder automation.
          </p>
        </div>

        {/* Master Killswitch Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleToggleGlobalChannel("master")}
            className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer ${
              settings?.masterEnabled
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30"
            }`}
          >
            {settings?.masterEnabled ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Global System: ACTIVE</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span>Global System: PAUSED</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={fetchData}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="Refresh All Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Global Master Channel Switches */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* WhatsApp Master */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                WhatsApp API
              </span>
              <span className="text-[10px] text-slate-400">
                {settings?.twilio.isConfigured ? "Twilio Configured" : "Needs Credentials"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggleGlobalChannel("whatsapp")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
              settings?.channels.whatsapp
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {settings?.channels.whatsapp ? "ON" : "OFF"}
          </button>
        </div>

        {/* Email Master */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Email Provider
              </span>
              <span className="text-[10px] text-slate-400">
                {settings?.email.isConfigured ? "Gateway Ready" : "Unconfigured"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggleGlobalChannel("email")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
              settings?.channels.email
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {settings?.channels.email ? "ON" : "OFF"}
          </button>
        </div>

        {/* In-App Master */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                In-App Feed
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Free Forever
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggleGlobalChannel("in_app")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
              settings?.channels.in_app
                ? "bg-purple-600 text-white shadow-2xs"
                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {settings?.channels.in_app ? "ON" : "OFF"}
          </button>
        </div>

        {/* Automation Master */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Fee Automations
              </span>
              <span className="text-[10px] text-slate-400">Scheduled Jobs</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggleGlobalChannel("automation")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
              settings?.channels.automation
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {settings?.channels.automation ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: "overview", label: "Overview & Analytics", icon: TrendingUp },
          { id: "providers", label: "Gateway Credentials", icon: Key },
          { id: "schools", label: "School Access & Overrides", icon: Building2 },
          { id: "plans", label: "Plan Matrix", icon: Sliders },
          { id: "logs", label: "Live Delivery Logs", icon: Clock },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === t.id
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <t.icon className="h-4 w-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="block text-xs font-bold text-slate-400 uppercase">Total Messages</span>
              <strong className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                {stats.total}
              </strong>
              <span className="text-[11px] text-slate-500 mt-1 block">Platform-wide historical</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="block text-xs font-bold text-emerald-600 uppercase">WhatsApp Sent</span>
              <strong className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                {stats.wa}
              </strong>
              <span className="text-[11px] text-slate-500 mt-1 block">Delivered via Twilio</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="block text-xs font-bold text-purple-600 uppercase">In-App Native</span>
              <strong className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 block">
                {stats.inApp}
              </strong>
              <span className="text-[11px] text-slate-500 mt-1 block">Zero cost native feed</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="block text-xs font-bold text-rose-600 uppercase">Failures</span>
              <strong className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
                {stats.failed}
              </strong>
              <span className="text-[11px] text-slate-500 mt-1 block">Requires gateway review</span>
            </div>
          </div>

          {/* Quick Health Summary */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <span>Multi-Tenant Architecture Status</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">Credential Isolation</span>
                <p className="text-slate-500 text-[11px]">
                  Twilio and Email API keys reside strictly on server-side database docs (`siteSettings/communication_secrets`). School admins never see platform tokens.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">Tenant Data Isolation</span>
                <p className="text-slate-500 text-[11px]">
                  Each school&apos;s communications, student contact numbers, and delivery logs are partitioned inside `schools/{`schoolId`}/communication_logs`.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">Deduplication & Spam Guard</span>
                <p className="text-slate-500 text-[11px]">
                  Daily reminder automations use dynamic idempotency keys (`auto:school:student:rule:date`) to guarantee students are never spammed twice on the same day.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROVIDER GATEWAYS & CREDENTIALS */}
      {activeTab === "providers" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Twilio WhatsApp Gateway */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Twilio WhatsApp Integration
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Official Meta Cloud / Twilio API credentials
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    settings?.twilio.isConfigured
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {settings?.twilio.isConfigured ? "Connected" : "Not Set"}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Twilio Account SID
                  </label>
                  <input
                    type="text"
                    value={twilioSid}
                    onChange={(e) => setTwilioSid(e.target.value)}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Twilio Auth Token
                  </label>
                  <input
                    type="password"
                    value={twilioToken}
                    onChange={(e) => setTwilioToken(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    From WhatsApp Number (Twilio Sandbox or Approved Number)
                  </label>
                  <input
                    type="text"
                    value={twilioFrom}
                    onChange={(e) => setTwilioFrom(e.target.value)}
                    placeholder="whatsapp:+14155238886"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Email Gateway */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Email Delivery Gateway
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Resend, SendGrid, or custom SMTP API
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    settings?.email.isConfigured
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {settings?.email.isConfigured ? "Connected" : "Not Set"}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Provider
                  </label>
                  <select
                    value={emailProvider}
                    onChange={(e) => setEmailProvider(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  >
                    <option value="none">None / Disabled</option>
                    <option value="resend">Resend API</option>
                    <option value="sendgrid">SendGrid API</option>
                    <option value="smtp">Standard SMTP</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={emailApiKey}
                    onChange={(e) => setEmailApiKey(e.target.value)}
                    placeholder="re_xxxxxxxxxxxxxx"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Sender Email
                    </label>
                    <input
                      type="text"
                      value={emailSender}
                      onChange={(e) => setEmailSender(e.target.value)}
                      placeholder="notifications@schoolstudy.in"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Sender Name
                    </label>
                    <input
                      type="text"
                      value={emailSenderName}
                      onChange={(e) => setEmailSenderName(e.target.value)}
                      placeholder="School Study Platform"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Action */}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveProviders}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving Credentials..." : "Save Gateway Credentials"}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: SCHOOL ACCESS & OVERRIDES */}
      {activeTab === "schools" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                placeholder="Search schools by name or code..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
            <p className="text-xs text-slate-400">
              Showing {filteredSchools.length} of {schools.length} schools
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-4">School & Code</th>
                    <th className="p-4">Active Plan</th>
                    <th className="p-4 text-center">WhatsApp</th>
                    <th className="p-4 text-center">Email</th>
                    <th className="p-4 text-center">In-App</th>
                    <th className="p-4 text-center">Automation</th>
                    <th className="p-4 text-center">Manual Override</th>
                    <th className="p-4 text-right">Messages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSchools.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <strong className="block text-slate-900 dark:text-white font-bold">{s.name}</strong>
                        <span className="text-[10px] text-slate-400">{s.code || s.id}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {s.planName}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {s.canWhatsApp ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Lock className="h-3.5 w-3.5" />
                            <span>Locked</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {s.canEmail ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Lock className="h-3.5 w-3.5" />
                            <span>Locked</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 text-purple-600 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {s.canAutomate ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Enabled</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Disabled</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSchoolOverride(s.id, s.overrideEnabled)}
                          className={`px-3 py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
                            s.isOverridden
                              ? s.overrideEnabled
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          {s.isOverridden ? (s.overrideEnabled ? "Override: ON" : "Override: OFF") : "Auto (By Plan)"}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{s.sentCount || 0}</span>
                        {s.failedCount > 0 && (
                          <span className="block text-[10px] text-rose-600">({s.failedCount} fail)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLAN MATRIX */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Define which subscription plans automatically include WhatsApp messaging, Email reports, and Fee Reminder Automations.
          </p>
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-4">Plan Name</th>
                  <th className="p-4 text-center">WhatsApp Access</th>
                  <th className="p-4 text-center">Email Access</th>
                  <th className="p-4 text-center">In-App Feed</th>
                  <th className="p-4 text-center">Fee Automation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.entries(settings?.planAccess || {}).map(([planSlug, channels]) => (
                  <tr key={planSlug} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-4 font-bold capitalize text-slate-900 dark:text-white">
                      {planSlug} Plan
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${channels.whatsapp ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                        {channels.whatsapp ? "Unlocked" : "Locked"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${channels.email ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                        {channels.email ? "Unlocked" : "Locked"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                        Always Free
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${channels.automation ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>
                        {channels.automation ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: LIVE DELIVERY LOGS & FAILED MESSAGES */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={logChannelFilter}
                onChange={(e) => setLogChannelFilter(e.target.value)}
                className="text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <option value="all">All Channels</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="in_app">In-App</option>
              </select>

              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <option value="all">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <span className="text-xs text-slate-400">
              Showing {filteredLogs.length} recent messages
            </span>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-4">Time & ID</th>
                    <th className="p-4">School & Student</th>
                    <th className="p-4">Channel & Recipient</th>
                    <th className="p-4">Trigger</th>
                    <th className="p-4">Status & Details</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        No communication logs found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-4 font-mono text-[11px] text-slate-500">
                          <div>{new Date(l.createdAt).toLocaleTimeString()}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[100px]">{l.id}</div>
                        </td>
                        <td className="p-4">
                          <strong className="block text-slate-900 dark:text-white font-bold">{l.studentName}</strong>
                          <span className="text-[10px] text-slate-400">{l.className || l.admissionNumber || l.schoolId}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold capitalize flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                            {l.channel === "whatsapp" && <MessageSquare className="h-3 w-3 text-emerald-500" />}
                            {l.channel === "email" && <Mail className="h-3 w-3 text-blue-500" />}
                            {l.channel === "in_app" && <Bell className="h-3 w-3 text-purple-500" />}
                            <span>{l.channel}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{l.recipient}</span>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {l.triggerType}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              l.status === "delivered" || l.status === "sent"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : l.status === "failed"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {l.status}
                          </span>
                          {l.errorReason && (
                            <p className="text-[10px] text-rose-500 mt-1 max-w-xs truncate" title={l.errorReason}>
                              {l.errorReason}
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {l.status === "failed" && (
                            <button
                              type="button"
                              disabled={retryingLogId === l.id}
                              onClick={() => handleRetryMessage(l)}
                              className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-bold text-[11px] flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <RotateCcw className={`h-3 w-3 ${retryingLogId === l.id ? "animate-spin" : ""}`} />
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
        </div>
      )}
    </div>
  );
}
