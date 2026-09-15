"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowUp,
  Plus,
  History,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Smartphone,
  Maximize2,
  Minimize2,
  Paperclip,
  X,
  RotateCw,
  Globe,
  ExternalLink,
  Users,
  GraduationCap,
  Building2,
  ShieldCheck,
  Receipt,
  Calendar,
  DollarSign,
  Printer,
  TrendingUp,
  Layers,
  ChevronRight,
} from "lucide-react";
import { AiContextBadge } from "./AiContextBadge";
import { AiConversationList } from "./AiConversationList";
import type { AiPortalType, AiMessage, AiConversation } from "@/types/ai";

// Prompt Kit components
import {
  PromptInput,
  PromptInputActions,
  PromptInputAction,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
import {
  FileUpload,
  FileUploadTrigger,
  FileUploadContent,
} from "@/components/prompt-kit/file-upload";
import { PromptSuggestion } from "@/components/prompt-kit/prompt-suggestion";
import { ThinkingBar } from "@/components/prompt-kit/thinking-bar";
import { Tool, type ToolPart } from "@/components/prompt-kit/tool";
import { SystemMessage } from "@/components/prompt-kit/system-message";
import { Button } from "@/components/ui/button";

// ============================================================================
// DEVTOOLS-STYLE RESPONSIVE SCHOOL SCREEN (NO PHONE HARDWARE BEZEL/NOTCH)
// ============================================================================
interface ResponsivePortalDevViewProps {
  portal: AiPortalType;
  schoolName?: string;
  userName?: string;
  portalUrl: string;
  onAskAi: (prompt: string) => void;
  onRefresh?: () => void;
}

type DevViewTab = "overview" | "fees" | "attendance" | "students" | "links";

function ResponsivePortalDevView({
  portal,
  schoolName,
  userName,
  portalUrl,
  onAskAi,
  onRefresh,
}: ResponsivePortalDevViewProps) {
  const [activeTab, setActiveTab] = useState<DevViewTab>("overview");

  const getPortalTitle = () => {
    switch (portal) {
      case "super_admin":
        return "School Study Super Admin";
      case "teacher":
        return "Teacher Workdesk";
      case "student":
        return "Student Study Space";
      default:
        return schoolName || "School Administration";
    }
  };

  const getPortalBadge = () => {
    switch (portal) {
      case "super_admin":
        return "Super Admin";
      case "teacher":
        return "Faculty";
      case "student":
        return "Student";
      default:
        return "Admin Portal";
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. DevTools Web Viewport Header (URL + Live status) */}
      <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-md bg-indigo-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
            {portal === "super_admin" ? "SA" : portal === "teacher" ? "TC" : portal === "student" ? "ST" : "AD"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                {getPortalTitle()}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            </div>
            <p className="text-[10px] text-slate-400 truncate font-mono">{portalUrl}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Refresh Screen"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          )}
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Open in Full Tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* 2. Quick Navigation Tabs inside the Responsive Screen */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-900/90 border-b border-slate-800 overflow-x-auto text-[11px] font-medium shrink-0 scrollbar-none">
        <button
          onClick={() => setActiveTab("overview")}
          className={`py-1 px-2.5 rounded-lg whitespace-nowrap transition ${
            activeTab === "overview"
              ? "bg-indigo-600 text-white font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab("fees")}
          className={`py-1 px-2.5 rounded-lg whitespace-nowrap transition ${
            activeTab === "fees"
              ? "bg-indigo-600 text-white font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          💰 Fees
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`py-1 px-2.5 rounded-lg whitespace-nowrap transition ${
            activeTab === "attendance"
              ? "bg-indigo-600 text-white font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          📅 Attendance
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`py-1 px-2.5 rounded-lg whitespace-nowrap transition ${
            activeTab === "students"
              ? "bg-indigo-600 text-white font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          👨‍🎓 Students
        </button>
        <button
          onClick={() => setActiveTab("links")}
          className={`py-1 px-2.5 rounded-lg whitespace-nowrap transition ${
            activeTab === "links"
              ? "bg-indigo-600 text-white font-semibold shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          ⚡ Shortcuts
        </button>
      </div>

      {/* 3. Tab Body - Scrollable Content with Interactive "Ask AI" buttons */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TAB: OVERVIEW */}
        {activeTab === "overview" && (
          <>
            {/* User Greeting & Sync Status */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-purple-950/50 border border-indigo-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                  {getPortalBadge()}
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  NLP Sync Active
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-1">
                {userName || "Administrator"} 👋
              </h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                App screen is connected with AI. Click any button below to immediately query live data.
              </p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
                <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
                  <span>Enrolled</span>
                  <GraduationCap className="h-3 w-3 text-indigo-400" />
                </div>
                <div className="text-base font-bold text-white mt-1">Live Directory</div>
                <button
                  onClick={() => onAskAi("Kitne total students enrolled hain aur class-wise breakdown kya hai?")}
                  className="mt-2 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 py-1 px-2 rounded-md transition w-full justify-center"
                >
                  <Sparkles className="h-2.5 w-2.5" /> Ask AI Count
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
                <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
                  <span>Today Present</span>
                  <Calendar className="h-3 w-3 text-emerald-400" />
                </div>
                <div className="text-base font-bold text-emerald-400 mt-1">Attendance</div>
                <button
                  onClick={() => onAskAi("Aaj kitne students present aur absent hain?")}
                  className="mt-2 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 py-1 px-2 rounded-md transition w-full justify-center"
                >
                  <Sparkles className="h-2.5 w-2.5" /> Check Today
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
                <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
                  <span>Fees Desk</span>
                  <DollarSign className="h-3 w-3 text-amber-400" />
                </div>
                <div className="text-base font-bold text-amber-400 mt-1">Collection</div>
                <button
                  onClick={() => onAskAi("Fee defaulters ki list aur pending due amount batao")}
                  className="mt-2 text-[10px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 py-1 px-2 rounded-md transition w-full justify-center"
                >
                  <Sparkles className="h-2.5 w-2.5" /> Defaulter List
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
                <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
                  <span>Mini Printer</span>
                  <Printer className="h-3 w-3 text-purple-400" />
                </div>
                <div className="text-base font-bold text-purple-400 mt-1">58mm Receipt</div>
                <button
                  onClick={() => onAskAi("Flipkart mini printer se fee receipt kaise print kare aur setup kare?")}
                  className="mt-2 text-[10px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 py-1 px-2 rounded-md transition w-full justify-center"
                >
                  <Sparkles className="h-2.5 w-2.5" /> Printer Guide
                </button>
              </div>
            </div>
          </>
        )}

        {/* TAB: FEES */}
        {activeTab === "fees" && (
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-emerald-400" /> Fee Desk & Collections
                </span>
                <Link
                  href="/admin/fees/student-fees"
                  className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  Open Page <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Zero dummy data. Query exact collected fees, pending balances, discounts, and payment modes.
              </p>

              <div className="grid grid-cols-1 gap-1.5 mt-3">
                <button
                  onClick={() => onAskAi("Current month me total kitni fee collect hui hai aur kitna pending hai?")}
                  className="w-full text-left py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-200 flex items-center justify-between border border-slate-700/60 transition"
                >
                  <span>📊 Total Collection & Pending Balance</span>
                  <Sparkles className="h-3 w-3 text-indigo-400" />
                </button>
                <button
                  onClick={() => onAskAi("Top fee defaulters kaun hain jinka payment pending hai?")}
                  className="w-full text-left py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-200 flex items-center justify-between border border-slate-700/60 transition"
                >
                  <span>⚠️ List All Fee Defaulters</span>
                  <Sparkles className="h-3 w-3 text-amber-400" />
                </button>
                <button
                  onClick={() => onAskAi("Student fee kaise collect kare aur receipt kaise generate kare?")}
                  className="w-full text-left py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-200 flex items-center justify-between border border-slate-700/60 transition"
                >
                  <span>🧾 Fee Collection Procedure</span>
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                </button>
              </div>
            </div>

            {/* Special Card: ₹500 Mini Thermal Printer */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-950/70 via-slate-900 to-indigo-950/60 border border-purple-500/30">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white">₹500 Flipkart Mini Thermal Printer</h4>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                58mm receipt printing setup for Bluetooth/WiFi portable POS printers.
              </p>
              <button
                onClick={() => onAskAi("Flipkart mini printer se receipt print karne ka complete setup step by step batao")}
                className="mt-2.5 w-full py-1.5 px-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <Sparkles className="h-3 w-3" />
                <span>Show Mini Printer Setup Guide</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: ATTENDANCE */}
        {activeTab === "attendance" && (
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-indigo-400" /> Attendance Manager
                </span>
                <Link
                  href="/admin/attendance"
                  className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  Open Page <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Real-time daily attendance rates and absentee management.
              </p>

              <div className="grid grid-cols-1 gap-1.5 mt-3">
                <button
                  onClick={() => onAskAi("Aaj kitne bache absent hain unke naam batao?")}
                  className="w-full text-left py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-200 flex items-center justify-between border border-slate-700/60 transition"
                >
                  <span>❌ Absent Students Today</span>
                  <Sparkles className="h-3 w-3 text-red-400" />
                </button>
                <button
                  onClick={() => onAskAi("Jin students ki attendance 75 percent se kam hai unki list dikhao")}
                  className="w-full text-left py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-200 flex items-center justify-between border border-slate-700/60 transition"
                >
                  <span>⚠️ Low Attendance (&lt;75%) Alert</span>
                  <Sparkles className="h-3 w-3 text-amber-400" />
                </button>
                <button
                  onClick={() => onAskAi("Teacher attendance kaise mark kare portal me step by step?")}
                  className="w-full text-left py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-200 flex items-center justify-between border border-slate-700/60 transition"
                >
                  <span>📝 Mark Attendance Tutorial</span>
                  <Sparkles className="h-3 w-3 text-indigo-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: STUDENTS */}
        {activeTab === "students" && (
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-emerald-400" /> Student Directory
                </span>
                <Link
                  href="/admin/students"
                  className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  Open Page <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Class rosters, admissions records, and student profiles.
              </p>

              <div className="grid grid-cols-1 gap-1.5 mt-3">
                <button
                  onClick={() => onAskAi("Har class me kitne students hain list dikhao")}
                  className="w-full text-left py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-200 flex items-center justify-between border border-slate-700/60 transition"
                >
                  <span>🏫 Class-wise Student Strength</span>
                  <Sparkles className="h-3 w-3 text-indigo-400" />
                </button>
                <button
                  onClick={() => onAskAi("Naya student admission kaise kare portal me?")}
                  className="w-full text-left py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-200 flex items-center justify-between border border-slate-700/60 transition"
                >
                  <span>➕ New Admission Process</span>
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                </button>
                <button
                  onClick={() => onAskAi("School teachers aur faculty ka status batao")}
                  className="w-full text-left py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-200 flex items-center justify-between border border-slate-700/60 transition"
                >
                  <span>👨‍🏫 Teachers & Staff Roster</span>
                  <Sparkles className="h-3 w-3 text-purple-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SHORTCUTS & LINKS */}
        {activeTab === "links" && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5 text-indigo-400" /> Direct Portal Navigation
            </h4>
            <div className="grid grid-cols-1 gap-1 pt-1">
              <Link
                href="/admin"
                className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between transition"
              >
                <span>🏢 Admin Dashboard</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
              <Link
                href="/admin/fees/student-fees"
                className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between transition"
              >
                <span>💰 Student Fees Management</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
              <Link
                href="/admin/students"
                className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between transition"
              >
                <span>👨‍🎓 Students List</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
              <Link
                href="/admin/attendance"
                className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between transition"
              >
                <span>📅 Attendance Register</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Dev View Status Bar */}
      <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live School Context
        </span>
        <span className="font-mono text-slate-500">DevTools Mode</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN AI WORKSPACE COMPONENT
// ============================================================================
export interface AiWorkspaceProps {
  portal: AiPortalType;
  schoolName?: string;
  userName?: string;
}

export function AiWorkspace({ portal, schoolName, userName }: AiWorkspaceProps) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // DevMode Split View (Default TRUE on PC, with smooth resizable width)
  const [showDevView, setShowDevView] = useState(true);
  const [devViewWidth, setDevViewWidth] = useState(420); // 420px default
  const [isResizing, setIsResizing] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"ai" | "screen">("ai");

  // Tool parts for prompt-kit
  const [activeToolPart, setActiveToolPart] = useState<ToolPart | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    fetchConversations();
  }, [portal]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (e) {}
  };

  const loadConversation = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ai/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setConversationId(data.conversation.id);
        setMessages(data.messages || []);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (conversationId === id) {
          handleNewChat();
        }
      }
    } catch (e) {}
  };

  const handleNewChat = () => {
    setConversationId(undefined);
    setMessages([]);
    setInputPrompt("");
    setAttachedFiles([]);
    setActiveToolPart(null);
  };

  // Dragging logic for resizable divider between Dev Screen and AI
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.min(Math.max(e.clientX - rect.left, 320), 750);
      setDevViewWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const getPortalUrl = () => {
    switch (portal) {
      case "super_admin":
        return "/super-admin";
      case "teacher":
        return "/teacher";
      case "student":
        return "/student";
      default:
        return "/admin";
    }
  };

  // Send message handler (can be called directly or from "Ask AI" buttons on the Dev Screen)
  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || loading) return;

    // If on mobile, switch to AI tab automatically so user sees the response!
    setActiveMobileTab("ai");

    const userMessage: AiMessage = {
      id: `msg_${Date.now()}_user`,
      conversationId: conversationId || "active",
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!promptToSend) {
      setInputPrompt("");
    }
    setLoading(true);

    // Prompt-kit tool status animation
    setActiveToolPart({
      type: "database_query",
      state: "input-available",
      input: { query: text, portal },
    });

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
          portal,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = await response.json();

      setActiveToolPart({
        type: "database_query",
        state: "output-available",
        input: { query: text },
        output: { intent: data.metadata?.intent || "COMPLETED" },
      });

      const assistantMessage: AiMessage = {
        id: data.messageId || `msg_${Date.now()}_assistant`,
        conversationId: data.conversationId || conversationId || "active",
        role: "assistant",
        content: data.message,
        createdAt: new Date().toISOString(),
        metadata: data.metadata,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (err: any) {
      const errorMessage: AiMessage = {
        id: `msg_${Date.now()}_err`,
        conversationId: conversationId || "active",
        role: "assistant",
        content: `Error: ${err.message || "Failed to process query"}. Please try again.`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => setActiveToolPart(null), 1200);
    }
  };

  const getSuggestedPrompts = () => {
    switch (portal) {
      case "super_admin":
        return [
          "Kitne schools active hain system me?",
          "System health aur uptime status kya hai?",
          "Super admin portal ke kya kya controls hain?",
        ];
      case "teacher":
        return [
          "Class 10-A ki attendance kaise mark kare?",
          "Aaj mere kitne periods scheduled hain?",
          "Homework assign karne ka process kya hai?",
        ];
      case "student":
        return [
          "Mera attendance percentage kitna hai?",
          "Meri school fee status kya hai?",
          "Next exam kab aur kaun sa subject hai?",
        ];
      default:
        return [
          "Flipkart mini printer se fee receipt kaise print kare?",
          "Fee defaulters ki list aur pending dues dikhao",
          "Aaj kitne students absent hain?",
          "Class wise student strength kya hai?",
        ];
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Full Markdown + Table Renderer
  const renderMessageContent = (content: string) => {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = (key: number) => {
      if (tableRows.length === 0) return null;
      const headers = tableRows[0];
      const rows = tableRows.slice(1);
      tableRows = [];
      inTable = false;

      return (
        <div key={`table_${key}`} className="my-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100/80 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-gray-800">
              <tr>
                {headers.map((h, hi) => (
                  <th key={hi} className="py-2.5 px-3 whitespace-nowrap">
                    {renderFormattedText(h.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900/60 text-gray-700 dark:text-gray-300">
              {rows.map((r, ri) => (
                <tr key={ri} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition">
                  {r.map((cell, ci) => (
                    <td key={ci} className="py-2 px-3">
                      {renderFormattedText(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Table line detect
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        const cells = line
          .trim()
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());

        if (cells.every((c) => /^:?-+:?$/.test(c))) {
          continue;
        }

        inTable = true;
        tableRows.push(cells);
        continue;
      } else if (inTable) {
        elements.push(flushTable(i));
      }

      if (line.startsWith("## ")) {
        elements.push(
          <h3 key={i} className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-4 mb-2 tracking-tight">
            {line.replace("## ", "")}
          </h3>
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <h4 key={i} className="text-sm font-bold text-gray-900 dark:text-white mt-3 mb-1">
            {line.replace("### ", "")}
          </h4>
        );
      } else if (line.startsWith("• ") || line.startsWith("- ")) {
        const item = line.replace(/^[•-]\s*/, "");
        elements.push(
          <div key={i} className="flex items-start gap-2 pl-1 py-0.5">
            <span className="text-indigo-500 font-bold">•</span>
            <span className="text-xs sm:text-sm">{renderFormattedText(item)}</span>
          </div>
        );
      } else if (line.startsWith("> [!IMPORTANT]") || line.startsWith("> [!TIP]") || line.startsWith("> [!NOTE]")) {
        const type = line.includes("IMPORTANT") ? "action" : line.includes("TIP") ? "warning" : "info";
        elements.push(
          <SystemMessage key={i} variant={type as any} fill className="my-2">
            {lines[i + 1] ? renderFormattedText(lines[i + 1].replace(/^>\s*/, "")) : ""}
          </SystemMessage>
        );
        i++;
      } else if (line.startsWith("> ")) {
        elements.push(
          <blockquote
            key={i}
            className="pl-3 border-l-2 border-indigo-400 text-gray-600 dark:text-gray-300 italic text-xs my-1.5"
          >
            {renderFormattedText(line.replace(/^>\s*/, ""))}
          </blockquote>
        );
      } else if (line.trim() === "---") {
        elements.push(<hr key={i} className="my-3 border-gray-200 dark:border-gray-800" />);
      } else if (line.trim() === "") {
        elements.push(<div key={i} className="h-1" />);
      } else {
        elements.push(<p key={i} className="text-xs sm:text-sm">{renderFormattedText(line)}</p>);
      }
    }

    if (inTable) {
      elements.push(flushTable(lines.length));
    }

    return <div className="space-y-1.5 leading-relaxed">{elements}</div>;
  };

  const renderFormattedText = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderBoldText(text.substring(lastIndex, match.index)));
      }
      const label = match[1];
      const href = match[2];
      parts.push(
        <Link
          key={match.index}
          href={href}
          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
        >
          {label} <ArrowRight className="h-3 w-3 inline" />
        </Link>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(renderBoldText(text.substring(lastIndex)));
    }

    return parts.length > 0 ? parts : renderBoldText(text);
  };

  const renderBoldText = (text: string) => {
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <strong key={match.index} className="font-bold text-gray-900 dark:text-white">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-[calc(100vh-4rem)] max-h-[100dvh] bg-gray-50/50 dark:bg-gray-950 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden"
    >
      {/* ============================================================== */}
      {/* 1. TOP HEADER (DevTools toggle + Mobile switcher + New Chat)    */}
      {/* ============================================================== */}
      <div className="px-3 sm:px-4 py-2.5 bg-white dark:bg-gray-900 border-b border-gray-200/80 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white shadow-xs shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
              <span>School Study AI</span>
              <span className="hidden sm:inline text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                Dev Mode Split
              </span>
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden md:block truncate">
              Live School screen on side with full Hinglish & English NLP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          {/* Mobile Switcher (< 768px): [✨ AI Chat] / [📱 School Screen] */}
          <div className="md:hidden flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveMobileTab("ai")}
              className={`py-1 px-2.5 rounded-md transition ${
                activeMobileTab === "ai"
                  ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-gray-500"
              }`}
            >
              ✨ AI Chat
            </button>
            <button
              onClick={() => setActiveMobileTab("screen")}
              className={`py-1 px-2.5 rounded-md transition ${
                activeMobileTab === "screen"
                  ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-gray-500"
              }`}
            >
              📱 School Screen
            </button>
          </div>

          {/* Desktop Dev Mode Split-Screen Toggle */}
          <button
            onClick={() => setShowDevView(!showDevView)}
            className="hidden md:flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            title="Toggle Dev Mode Responsive School Screen"
          >
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            <span>{showDevView ? "Hide School Screen" : "Show School Screen"}</span>
          </button>

          {/* Context Badge */}
          <div className="hidden sm:block">
            <AiContextBadge portal={portal} schoolName={schoolName} />
          </div>

          {/* History */}
          <button
            onClick={() => setShowHistory(true)}
            className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition"
            title="Conversation History"
          >
            <History className="h-4 w-4" />
          </button>

          {/* New Chat */}
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1 py-1.5 px-2.5 sm:px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. DUAL-PANE WORKSPACE CONTAINER                               */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ------------------------------------------------------------ */}
        {/* LEFT PANE: DEVTOOLS-STYLE RESPONSIVE SCHOOL SCREEN           */}
        {/* ------------------------------------------------------------ */}
        <div
          style={{ width: showDevView ? `${devViewWidth}px` : "0px" }}
          className={`shrink-0 bg-slate-950 flex flex-col border-r border-slate-800 transition-[width] duration-75 overflow-hidden ${
            showDevView ? "flex" : "hidden"
          } ${activeMobileTab === "screen" ? "flex! w-full!" : "hidden md:flex"}`}
        >
          {/* DevTools Viewport Control Header */}
          <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-200">Device Simulator</span>
              <span className="text-[10px] text-slate-500 font-mono">({devViewWidth}px)</span>
            </div>

            {/* Quick Width Presets */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => setDevViewWidth(360)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                  devViewWidth === 360 ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-400"
                }`}
              >
                360
              </button>
              <button
                onClick={() => setDevViewWidth(420)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                  devViewWidth === 420 ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-400"
                }`}
              >
                420
              </button>
              <button
                onClick={() => setDevViewWidth(540)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                  devViewWidth === 540 ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-400"
                }`}
              >
                540
              </button>
            </div>
          </div>

          {/* The Live Responsive School Portal View */}
          <div className="flex-1 w-full overflow-hidden flex flex-col">
            <ResponsivePortalDevView
              portal={portal}
              schoolName={schoolName}
              userName={userName}
              portalUrl={getPortalUrl()}
              onAskAi={(prompt) => handleSendMessage(prompt)}
            />
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* DRAGGABLE RESIZE DIVIDER BAR (DEVTOOLS STYLE)                */}
        {/* ------------------------------------------------------------ */}
        {showDevView && (
          <div
            onMouseDown={handleMouseDown}
            className="hidden md:flex w-2 bg-gray-100 hover:bg-indigo-500/20 active:bg-indigo-500 dark:bg-gray-800 cursor-col-resize items-center justify-center transition-colors group z-10 select-none"
            title="Drag to resize School Screen width"
          >
            <div className="h-10 w-1 rounded-full bg-gray-300 group-hover:bg-indigo-500 dark:bg-gray-600 transition" />
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* RIGHT PANE: FULL AI CHAT WORKSPACE                           */}
        {/* ------------------------------------------------------------ */}
        <div
          className={`flex-1 flex flex-col h-full bg-white dark:bg-gray-900 min-w-0 ${
            activeMobileTab === "ai" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
            {activeToolPart && (
              <Tool toolPart={activeToolPart} className="max-w-md mx-auto" />
            )}

            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-6 sm:py-8 px-2">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center mb-3 sm:mb-4 shadow-lg shadow-indigo-600/20">
                  <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 animate-pulse" />
                </div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  Ask School Study AI
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                  Complete in-house multi-lingual NLP engine. Ask in Hindi, Hinglish, or English about fees, defaulters, 58mm printer setup, attendance, and students.
                </p>

                {/* Prompt Suggestions */}
                <div className="w-full mt-5 sm:mt-6">
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Popular Queries
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                    {getSuggestedPrompts().map((p, idx) => (
                      <PromptSuggestion
                        key={idx}
                        onClick={() => handleSendMessage(p)}
                        className="text-xs py-1 px-2.5"
                      >
                        {p}
                      </PromptSuggestion>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id || index}
                    className={`flex gap-2 sm:gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                    )}

                    <div
                      className={`relative group max-w-[92%] sm:max-w-2xl rounded-2xl p-3 sm:p-4 transition-all ${
                        isUser
                          ? "bg-indigo-600 text-white rounded-tr-xs shadow-md shadow-indigo-600/10"
                          : "bg-gray-50 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700/60 rounded-tl-xs shadow-xs"
                      }`}
                    >
                      {isUser ? (
                        <p className="text-xs sm:text-sm whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div>
                          {renderMessageContent(msg.content)}

                          {/* Metric Cards */}
                          {msg.metadata?.metrics && Object.keys(msg.metadata.metrics).length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                              {Object.entries(msg.metadata.metrics).map(([label, val]) => (
                                <div
                                  key={label}
                                  className="bg-white dark:bg-gray-900 p-2 sm:p-2.5 rounded-lg border border-gray-200/60 dark:border-gray-700/60"
                                >
                                  <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-bold">
                                    {label}
                                  </div>
                                  <div className="text-xs sm:text-sm font-black text-gray-900 dark:text-white mt-0.5">
                                    {val}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Follow-up Prompts */}
                          {msg.metadata?.suggestedFollowUps &&
                            msg.metadata.suggestedFollowUps.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex flex-wrap gap-1.5">
                                {msg.metadata.suggestedFollowUps.map((fPrompt, fIdx) => (
                                  <PromptSuggestion
                                    key={fIdx}
                                    onClick={() => handleSendMessage(fPrompt)}
                                    className="text-[10px] sm:text-[11px] py-1 px-2"
                                  >
                                    {fPrompt}
                                  </PromptSuggestion>
                                ))}
                              </div>
                            )}

                          {/* Message Footer */}
                          <div className="flex items-center justify-between mt-2 pt-1 text-[10px] sm:text-[11px] text-gray-400">
                            <span>
                              {msg.metadata?.modelUsed || "multilingual-nlp-v2"}
                            </span>
                            <button
                              onClick={() => copyToClipboard(msg.content, index)}
                              className="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-200 transition"
                              title="Copy response"
                            >
                              {copiedIndex === index ? (
                                <>
                                  <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500" />
                                  <span className="text-emerald-500 font-medium">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {loading && (
              <div className="max-w-md">
                <ThinkingBar
                  text="Analyzing query with NLP engine & fetching live data..."
                  stopLabel="Cancel"
                  onStop={() => setLoading(false)}
                />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ============================================================ */}
          {/* PROMPT-KIT INPUT AREA WITH FILE UPLOAD                      */}
          {/* ============================================================ */}
          <div className="p-2.5 sm:p-4 bg-white dark:bg-gray-900 border-t border-gray-200/80 dark:border-gray-800 shrink-0">
            <FileUpload
              onFilesAdded={(newFiles) => setAttachedFiles((prev) => [...prev, ...newFiles])}
              accept=".jpg,.jpeg,.png,.pdf,.docx"
            >
              <PromptInput
                value={inputPrompt}
                onValueChange={setInputPrompt}
                isLoading={loading}
                onSubmit={() => handleSendMessage()}
              >
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 border-b border-gray-100 dark:border-gray-800">
                    {attachedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1 py-0.5 px-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-700 dark:text-gray-300"
                      >
                        <Paperclip className="h-3 w-3 text-indigo-500" />
                        <span className="max-w-[100px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="p-0.5 hover:text-red-500 rounded-full"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <PromptInputTextarea
                  placeholder={`Ask in Hindi / Hinglish / English (${
                    portal === "student"
                      ? "fees, attendance, homework..."
                      : portal === "teacher"
                      ? "attendance, classes, timetable..."
                      : "fees, mini printer setup, defaulters, attendance..."
                  })`}
                />

                <PromptInputActions className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <PromptInputAction tooltip="Attach file / document">
                      <FileUploadTrigger asChild>
                        <button
                          type="button"
                          className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                          <Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                      </FileUploadTrigger>
                    </PromptInputAction>
                  </div>

                  <PromptInputAction tooltip="Send prompt">
                    <Button
                      size="icon"
                      variant="default"
                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                      disabled={(!inputPrompt.trim() && attachedFiles.length === 0) || loading}
                      onClick={() => handleSendMessage()}
                    >
                      {loading ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </PromptInputAction>
                </PromptInputActions>
              </PromptInput>

              <FileUploadContent>
                <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-gray-900 border-2 border-dashed border-indigo-500 text-center shadow-xl">
                  <Paperclip className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                    Drop files to attach to AI prompt
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Supports PDF, PNG, JPG, DOCX</p>
                </div>
              </FileUploadContent>
            </FileUpload>

            <p className="text-[9px] sm:text-[10px] text-gray-400 text-center mt-1.5 sm:mt-2">
              School Study In-House NLP Engine • Live Data Synchronization • Hindi / English Support
            </p>
          </div>
        </div>
      </div>

      {/* Slide-over Conversation History Drawer */}
      <AiConversationList
        conversations={conversations}
        activeConversationId={conversationId}
        onSelect={loadConversation}
        onNewChat={handleNewChat}
        onDelete={deleteConversation}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}
