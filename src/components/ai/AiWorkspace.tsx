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
  Menu,
  Moon,
  Sun,
  Bell,
  Mic,
  Send,
  MoreVertical,
  BookOpen,
  Clock,
  ClipboardCheck,
  FileText,
  FileSpreadsheet,
  Zap,
} from "lucide-react";
import { AiConversationList } from "./AiConversationList";
import type { AiPortalType, AiMessage, AiConversation } from "@/types/ai";

// Prompt Kit components
import { ThinkingBar } from "@/components/prompt-kit/thinking-bar";
import { Tool, type ToolPart } from "@/components/prompt-kit/tool";
import { SystemMessage } from "@/components/prompt-kit/system-message";
import { Button } from "@/components/ui/button";

// ============================================================================
// 1. LEFT SIDE: SMARTPHONE APP VIEW (MATCHING USER SCREENSHOT EXACTLY)
// ============================================================================
interface PhonePortalViewProps {
  portal: AiPortalType;
  schoolName?: string;
  userName?: string;
  schoolId?: string;
  onAskAi: (prompt: string) => void;
}

function PhonePortalView({
  portal,
  schoolName = "happy",
  userName = "Happy",
  schoolId = "1oH1dTrFFyd...",
  onAskAi,
}: PhonePortalViewProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<
    "overview" | "students" | "teachers" | "attendance" | "reports"
  >("overview");

  const handleCopyId = () => {
    navigator.clipboard.writeText(schoolId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Today formatted date: e.g. Tuesday, 15 Sept 2026
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="w-full max-w-[390px] h-full bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col overflow-hidden font-sans select-none shrink-0 transition-all">
      {/* 1.1 Phone Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-extrabold text-sm text-slate-900 dark:text-white capitalize truncate max-w-[90px]">
            {schoolName}
          </span>
          <button
            onClick={handleCopyId}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition font-mono truncate max-w-[95px]"
            title="Click to copy School ID"
          >
            <span>ID {schoolId.slice(0, 8)}...</span>
            {copiedId ? (
              <Check className="h-2.5 w-2.5 text-emerald-500" />
            ) : (
              <Copy className="h-2.5 w-2.5" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            <Moon className="h-4 w-4" />
          </button>
          <div className="relative">
            <Bell className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div className="flex items-center gap-1">
            <div className="relative h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              <span>{userName.charAt(0).toUpperCase()}</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>
            <ChevronRight className="h-3 w-3 text-slate-400 rotate-90" />
          </div>
        </div>
      </div>

      {/* 1.2 Phone Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60 dark:bg-slate-950/40">
        {/* Good Morning Greeting Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 border border-blue-100/80 dark:border-slate-800 shadow-xs space-y-3">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Good Morning,
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{userName}</span>
              <span>👋</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Here&apos;s what&apos;s happening at <strong className="text-slate-800 dark:text-slate-200">{schoolName}</strong> today.
            </div>
          </div>

          {/* Quick Status Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-xs">
              <Zap className="h-3 w-3 fill-white" />
              <span>Free Plan</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-700 shadow-2xs">
              <Calendar className="h-3 w-3 text-blue-500" />
              <span>{formattedDate}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span>☀️</span>
              <span>28°C Sunny</span>
            </span>
          </div>

          {/* School Building Illustration Card */}
          <div className="pt-2 flex flex-col items-center justify-center">
            {/* SVG School Illustration */}
            <div className="w-full max-w-[240px] h-[100px] flex items-center justify-center relative">
              <svg viewBox="0 0 260 110" className="w-full h-full drop-shadow-sm">
                {/* Grass Hill */}
                <ellipse cx="130" cy="100" rx="120" ry="12" fill="#86efac" />
                <ellipse cx="130" cy="102" rx="105" ry="8" fill="#4ade80" />

                {/* Left Tree */}
                <rect x="38" y="65" width="6" height="25" fill="#a16207" rx="2" />
                <circle cx="41" cy="55" r="16" fill="#22c55e" />
                <circle cx="32" cy="62" r="10" fill="#16a34a" />

                {/* Left Shrub */}
                <circle cx="68" cy="88" r="9" fill="#10b981" />

                {/* Right Tree */}
                <rect x="216" y="65" width="6" height="25" fill="#a16207" rx="2" />
                <circle cx="219" cy="55" r="16" fill="#22c55e" />
                <circle cx="228" cy="62" r="10" fill="#16a34a" />

                {/* Right Shrub */}
                <circle cx="192" cy="88" r="9" fill="#10b981" />

                {/* Main Building Body */}
                <rect x="70" y="48" width="120" height="42" fill="#fb923c" rx="3" />
                <rect x="74" y="52" width="112" height="36" fill="#fed7aa" rx="2" />

                {/* Roof Trim */}
                <rect x="67" y="45" width="126" height="5" fill="#ea580c" rx="2" />

                {/* Center Clock Tower */}
                <rect x="114" y="24" width="32" height="30" fill="#fb923c" />
                <rect x="117" y="27" width="26" height="24" fill="#fed7aa" />
                {/* Tower Gable Roof */}
                <polygon points="112,24 130,10 148,24" fill="#c2410c" />
                {/* Clock */}
                <circle cx="130" cy="36" r="6.5" fill="#ffffff" stroke="#ea580c" strokeWidth="1.5" />
                <line x1="130" y1="36" x2="130" y2="32" stroke="#ea580c" strokeWidth="1" />
                <line x1="130" y1="36" x2="133" y2="36" stroke="#ea580c" strokeWidth="1" />

                {/* Flagpole & Red Flag */}
                <line x1="130" y1="10" x2="130" y2="2" stroke="#64748b" strokeWidth="1.5" />
                <polygon points="130,2 140,5 130,8" fill="#ef4444" />

                {/* Windows on Left Wing */}
                <rect x="80" y="56" width="9" height="11" fill="#38bdf8" rx="1.5" />
                <rect x="94" y="56" width="9" height="11" fill="#38bdf8" rx="1.5" />
                <rect x="80" y="71" width="9" height="11" fill="#38bdf8" rx="1.5" />
                <rect x="94" y="71" width="9" height="11" fill="#38bdf8" rx="1.5" />

                {/* Windows on Right Wing */}
                <rect x="156" y="56" width="9" height="11" fill="#38bdf8" rx="1.5" />
                <rect x="170" y="56" width="9" height="11" fill="#38bdf8" rx="1.5" />
                <rect x="156" y="71" width="9" height="11" fill="#38bdf8" rx="1.5" />
                <rect x="170" y="71" width="9" height="11" fill="#38bdf8" rx="1.5" />

                {/* Center Entrance Door */}
                <rect x="122" y="68" width="16" height="22" fill="#c2410c" rx="2" />
                <rect x="124" y="70" width="12" height="20" fill="#9a3412" rx="1" />
                <line x1="130" y1="70" x2="130" y2="90" stroke="#fbcfe8" strokeWidth="0.75" />
                <circle cx="128" cy="80" r="1" fill="#fbbf24" />
              </svg>
            </div>

            <p className="text-center text-[11px] font-bold text-blue-700 dark:text-blue-400 italic tracking-wide mt-1">
              &ldquo;Better Education Brighter Futures&rdquo;
            </p>
          </div>
        </div>

        {/* 1.3 4 Key Metric Cards (2x2 Grid) */}
        <div className="grid grid-cols-2 gap-3">
          {/* 1. Students Card */}
          <div
            onClick={() => onAskAi("Kitne total students enrolled hain aur class-wise breakdown kya hai?")}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Students
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
              1,248
            </div>
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
              <span>↑ 12%</span>
              <span className="text-slate-400 font-normal">vs last month</span>
            </div>
          </div>

          {/* 2. Teachers Card */}
          <div
            onClick={() => onAskAi("School me kitne teachers aur staff active hain?")}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Teachers
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
              46
            </div>
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
              <span>↑ 4%</span>
              <span className="text-slate-400 font-normal">vs last month</span>
            </div>
          </div>

          {/* 3. Classes Card */}
          <div
            onClick={() => onAskAi("Classes aur sections ki details dikhao")}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Classes
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
              28
            </div>
            <div className="text-[10px] font-medium text-slate-500 flex items-center gap-0.5 mt-0.5">
              <span>↑ 0%</span>
              <span className="text-slate-400 font-normal">vs last month</span>
            </div>
          </div>

          {/* 4. Attendance Card */}
          <div
            onClick={() => onAskAi("Aaj kitne students present aur absent hain?")}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Attendance
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
              92%
            </div>
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
              <span>↑ 3%</span>
              <span className="text-slate-400 font-normal">vs last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1.4 Phone Bottom Navigation Bar */}
      <div className="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-around shrink-0 text-slate-400">
        <button
          onClick={() => setActiveBottomTab("overview")}
          className={`flex flex-col items-center gap-1 transition ${
            activeBottomTab === "overview"
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "hover:text-slate-600"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span className="text-[9px]">Overview</span>
        </button>
        <button
          onClick={() => {
            setActiveBottomTab("students");
            onAskAi("Show students list and details");
          }}
          className={`flex flex-col items-center gap-1 transition ${
            activeBottomTab === "students"
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "hover:text-slate-600"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span className="text-[9px]">Students</span>
        </button>
        <button
          onClick={() => {
            setActiveBottomTab("teachers");
            onAskAi("Show teachers directory and duty roster");
          }}
          className={`flex flex-col items-center gap-1 transition ${
            activeBottomTab === "teachers"
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "hover:text-slate-600"
          }`}
        >
          <Users className="h-4 w-4" />
          <span className="text-[9px]">Teachers</span>
        </button>
        <button
          onClick={() => {
            setActiveBottomTab("attendance");
            onAskAi("Check today's attendance summary and absentees");
          }}
          className={`flex flex-col items-center gap-1 transition ${
            activeBottomTab === "attendance"
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "hover:text-slate-600"
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          <span className="text-[9px]">Attendance</span>
        </button>
        <button
          onClick={() => {
            setActiveBottomTab("reports");
            onAskAi("Generate fee and school performance reports");
          }}
          className={`flex flex-col items-center gap-1 transition ${
            activeBottomTab === "reports"
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "hover:text-slate-600"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span className="text-[9px]">Reports</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 2. MAIN AI WORKSPACE COMPONENT (EXACT MATCH WITH SCREENSHOT)
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

  // Mobile layout switcher: [📱 School App] or [✨ AI Assistant]
  const [activeMobileTab, setActiveMobileTab] = useState<"screen" | "ai">("ai");

  // Prompt-Kit active tool animation
  const [activeToolPart, setActiveToolPart] = useState<ToolPart | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          handleClearChat();
        }
      }
    } catch (e) {}
  };

  const handleClearChat = () => {
    setConversationId(undefined);
    setMessages([]);
    setInputPrompt("");
    setAttachedFiles([]);
    setActiveToolPart(null);
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || loading) return;

    // Switch to AI tab if on mobile
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
          prompt: text,
          message: text,
          conversationId,
          portal,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();

      setActiveToolPart({
        type: "database_query",
        state: "output-available",
        input: { query: text },
        output: { intent: data.metadata?.intent || "COMPLETED" },
      });

      const assistantMessage: AiMessage = {
        id: data.assistantMessage?.id || data.messageId || `msg_${Date.now()}_assistant`,
        conversationId: data.conversationId || conversationId || "active",
        role: "assistant",
        content: data.assistantMessage?.content || data.message || "",
        createdAt: new Date().toISOString(),
        metadata: data.assistantMessage?.metadata || data.metadata,
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
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[100dvh] bg-slate-100/70 dark:bg-slate-950 p-2 sm:p-4 rounded-3xl overflow-hidden font-sans">
      {/* Mobile Top Segmented Bar (< 1024px) */}
      <div className="lg:hidden flex items-center justify-between pb-2">
        <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveMobileTab("screen")}
            className={`py-1 px-3 rounded-lg transition ${
              activeMobileTab === "screen"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-500"
            }`}
          >
            📱 School App
          </button>
          <button
            onClick={() => setActiveMobileTab("ai")}
            className={`py-1 px-3 rounded-lg transition ${
              activeMobileTab === "ai"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-500"
            }`}
          >
            ✨ AI Assistant
          </button>
        </div>

        <button
          onClick={() => setShowHistory(true)}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
          title="History"
        >
          <History className="h-4 w-4" />
        </button>
      </div>

      {/* Main Container: Split-View on PC, Tabbed on Mobile */}
      <div className="flex-1 flex gap-4 overflow-hidden relative">
        {/* ============================================================ */}
        {/* LEFT SECTION: PHONE PORTAL APP VIEW (MATCHING USER IMAGE)   */}
        {/* ============================================================ */}
        <div
          className={`shrink-0 flex items-center justify-center ${
            activeMobileTab === "screen" ? "flex w-full" : "hidden lg:flex"
          }`}
        >
          <PhonePortalView
            portal={portal}
            schoolName={schoolName || "happy"}
            userName={userName || "Happy"}
            onAskAi={(prompt) => handleSendMessage(prompt)}
          />
        </div>

        {/* ============================================================ */}
        {/* RIGHT SECTION: AI ASSISTANT (EXACT MATCH WITH USER IMAGE)    */}
        {/* ============================================================ */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden min-w-0 ${
            activeMobileTab === "ai" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* 2.1 AI Assistant Header Bar */}
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              {/* Cute Robot Avatar Icon */}
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    AI Assistant
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-xs text-slate-400">Your smart school assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                title="Clear current chat"
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Clear Chat</span>
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
                title="Conversation History"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 2.2 Middle Area: Hero with Robot OR Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {activeToolPart && (
              <Tool toolPart={activeToolPart} className="max-w-md mx-auto" />
            )}

            {messages.length === 0 ? (
              /* ====================================================== */
              /* HERO EMPTY STATE: FRIENDLY 3D ROBOT + ORBITING CHIPS  */
              /* ====================================================== */
              <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-2 sm:py-6 text-center">
                {/* 3D Friendly Robot Illustration with Floating Badges */}
                <div className="relative w-72 h-56 flex items-center justify-center my-2">
                  {/* Floating Chips Left */}
                  <button
                    onClick={() => handleSendMessage("Kitne total students enrolled hain aur class-wise breakdown kya hai?")}
                    className="absolute top-4 left-0 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform"
                  >
                    <span className="text-blue-500">👥</span>
                    <span>Students</span>
                  </button>

                  <button
                    onClick={() => handleSendMessage("Current fee collection and pending dues status kya hai?")}
                    className="absolute top-20 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform"
                  >
                    <span className="text-emerald-500">₹</span>
                    <span>Fees</span>
                  </button>

                  <button
                    onClick={() => handleSendMessage("School overall academic and fee report dikhao")}
                    className="absolute bottom-4 left-2 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform"
                  >
                    <span className="text-purple-500">📊</span>
                    <span>Reports</span>
                  </button>

                  {/* Floating Chips Right */}
                  <button
                    onClick={() => handleSendMessage("Aaj kitne students present aur absent hain?")}
                    className="absolute top-4 right-0 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform"
                  >
                    <span className="text-blue-500">📅</span>
                    <span>Attendance</span>
                  </button>

                  <button
                    onClick={() => handleSendMessage("Class 8th ka timetable create karne ka process batao")}
                    className="absolute top-20 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform"
                  >
                    <span className="text-amber-500">🕒</span>
                    <span>Timetable</span>
                  </button>

                  <button
                    onClick={() => handleSendMessage("Exams and test schedules ki list dikhao")}
                    className="absolute bottom-4 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform"
                  >
                    <span className="text-blue-500">📄</span>
                    <span>Exams</span>
                  </button>

                  {/* Robot Illustration SVG */}
                  <div className="w-36 h-36 relative flex items-center justify-center drop-shadow-xl animate-bounce-gentle">
                    <svg viewBox="0 0 160 160" className="w-full h-full">
                      <defs>
                        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="100%" stopColor="#e2e8f0" />
                        </linearGradient>
                        <linearGradient id="visorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#0f172a" />
                          <stop offset="100%" stopColor="#1e293b" />
                        </linearGradient>
                        <linearGradient id="blueGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#60a5fa" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>

                      {/* Head Antenna */}
                      <line x1="80" y1="26" x2="80" y2="12" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="80" cy="11" r="5" fill="#f59e0b" />

                      {/* Robot Head (Rounded Pill) */}
                      <rect x="36" y="24" width="88" height="66" rx="32" fill="url(#bodyGrad)" stroke="#cbd5e1" strokeWidth="2" />

                      {/* Ear Pods */}
                      <rect x="30" y="44" width="8" height="22" rx="4" fill="#3b82f6" />
                      <rect x="122" y="44" width="8" height="22" rx="4" fill="#3b82f6" />

                      {/* Visor Screen */}
                      <rect x="44" y="34" width="72" height="42" rx="18" fill="url(#visorGrad)" />

                      {/* Cheerful Digital Eyes */}
                      <circle cx="64" cy="52" r="8" fill="url(#blueGlow)" />
                      <circle cx="67" cy="49" r="2.5" fill="#ffffff" />
                      <circle cx="96" cy="52" r="8" fill="url(#blueGlow)" />
                      <circle cx="99" cy="49" r="2.5" fill="#ffffff" />

                      {/* Smile Line */}
                      <path d="M 72 64 Q 80 70 88 64" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" fill="none" />

                      {/* Body Neck & Chest */}
                      <rect x="68" y="90" width="24" height="8" fill="#94a3b8" rx="2" />
                      <path d="M 50 98 Q 80 94 110 98 L 118 136 Q 80 144 42 136 Z" fill="url(#bodyGrad)" stroke="#cbd5e1" strokeWidth="2" />

                      {/* Chest Light Badge */}
                      <circle cx="80" cy="114" r="7" fill="#3b82f6" opacity="0.9" />
                      <circle cx="80" cy="114" r="4" fill="#ffffff" />

                      {/* Left Arm (Resting) */}
                      <path d="M 44 104 Q 30 115 36 130" stroke="url(#bodyGrad)" strokeWidth="9" strokeLinecap="round" fill="none" />

                      {/* Right Arm (Waving Hand!) */}
                      <path d="M 116 104 Q 134 96 142 80" stroke="url(#bodyGrad)" strokeWidth="9" strokeLinecap="round" fill="none" />
                      <circle cx="143" cy="78" r="6" fill="#3b82f6" />
                    </svg>
                  </div>
                </div>

                {/* Hero Greeting Text */}
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                  Hello! 👋
                </h1>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  I&apos;m your AI School Assistant
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-lg leading-relaxed">
                  Ask me anything about your school. I can help you with students, fees, reports, attendance, timetables and much more.
                </p>

                {/* 4 Action Cards in a 4-column Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full mt-6 text-left">
                  {/* Card 1: Student Information */}
                  <div
                    onClick={() => handleSendMessage("Show students with pending fees")}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-blue-400 transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-2.5">
                        Student Information
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        &ldquo;Show students with pending fees&rdquo;
                      </p>
                    </div>
                    <div className="flex justify-end pt-2">
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Card 2: Fee Reports */}
                  <div
                    onClick={() => handleSendMessage("Generate this month's collection report")}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-emerald-400 transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-2.5">
                        Fee Reports
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        &ldquo;Generate this month&apos;s collection report&rdquo;
                      </p>
                    </div>
                    <div className="flex justify-end pt-2">
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Card 3: Attendance */}
                  <div
                    onClick={() => handleSendMessage("Show today's attendance summary")}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-purple-400 transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-2.5">
                        Attendance
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        &ldquo;Show today&apos;s attendance summary&rdquo;
                      </p>
                    </div>
                    <div className="flex justify-end pt-2">
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Card 4: Create Timetable */}
                  <div
                    onClick={() => handleSendMessage("Make a timetable for class 8")}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-amber-400 transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock className="h-4 w-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-2.5">
                        Create Timetable
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        &ldquo;Make a timetable for class 8&rdquo;
                      </p>
                    </div>
                    <div className="flex justify-end pt-2">
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Message Stream */
              messages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id || index}
                    className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="h-8 w-8 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                        <span className="text-sm">🤖</span>
                      </div>
                    )}

                    <div
                      className={`relative group max-w-[92%] sm:max-w-2xl rounded-2xl p-3.5 sm:p-4 transition-all ${
                        isUser
                          ? "bg-blue-600 text-white rounded-tr-xs shadow-md shadow-blue-600/10"
                          : "bg-slate-50 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 rounded-tl-xs shadow-xs"
                      }`}
                    >
                      {isUser ? (
                        <p className="text-xs sm:text-sm whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div>
                          {renderMessageContent(msg.content)}

                          {/* Metric Cards if present */}
                          {msg.metadata?.metrics && Object.keys(msg.metadata.metrics).length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                              {Object.entries(msg.metadata.metrics).map(([label, val]) => (
                                <div
                                  key={label}
                                  className="bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60"
                                >
                                  <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold">
                                    {label}
                                  </div>
                                  <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-0.5">
                                    {val}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Message Footer */}
                          <div className="flex items-center justify-between mt-2 pt-1 text-[10px] sm:text-[11px] text-slate-400">
                            <span>{msg.metadata?.modelUsed || "multilingual-nlp-v2"}</span>
                            <button
                              onClick={() => copyToClipboard(msg.content, index)}
                              className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 transition"
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
                  text="Analyzing school context with NLP engine..."
                  stopLabel="Cancel"
                  onStop={() => setLoading(false)}
                />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 2.3 Bottom Floating Input & Suggestion Chips (Screenshot Match) */}
          <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-2.5">
            {/* Attached Files Pill */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-2">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1 py-0.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300"
                  >
                    <Paperclip className="h-3 w-3 text-blue-500" />
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

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.docx"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  setAttachedFiles((prev) => [...prev, ...Array.from(files)]);
                }
              }}
              className="hidden"
            />

            {/* Input Bar matching screenshot */}
            <div className="relative flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 px-3.5 py-2 shadow-xs focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition">
              <Sparkles className="h-4 w-4 text-blue-500 shrink-0 mr-2.5" />
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your question here..."
                disabled={loading}
                className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title="Voice input"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={(!inputPrompt.trim() && attachedFiles.length === 0) || loading}
                  className="h-8 w-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs disabled:opacity-40 transition ml-1"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5 fill-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Quick Chips matching screenshot below input */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 text-slate-600 dark:text-slate-300">
              <button
                onClick={() => handleSendMessage("Show total students count and details")}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-[11px] font-medium whitespace-nowrap hover:bg-slate-50 transition shrink-0"
              >
                <span>✨ Show total students</span>
              </button>
              <button
                onClick={() => handleSendMessage("Generate fee report for current month")}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-[11px] font-medium whitespace-nowrap hover:bg-slate-50 transition shrink-0"
              >
                <span>📄 Generate fee report</span>
              </button>
              <button
                onClick={() => handleSendMessage("Today's attendance status and absentees")}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-[11px] font-medium whitespace-nowrap hover:bg-slate-50 transition shrink-0"
              >
                <span>📅 Today&apos;s attendance</span>
              </button>
              <button
                onClick={() => handleSendMessage("Create exam schedule or check upcoming tests")}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-[11px] font-medium whitespace-nowrap hover:bg-slate-50 transition shrink-0"
              >
                <span>📋 Create exam</span>
              </button>
              <button
                onClick={() => handleSendMessage("Show fee defaulters list with pending balances")}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-[11px] font-medium whitespace-nowrap hover:bg-slate-50 transition shrink-0"
              >
                <span>⚠️ Show defaulters</span>
              </button>
              <button
                onClick={() => handleSendMessage("Flipkart mini printer se fee receipt kaise print kare aur setup kare?")}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-[11px] font-medium whitespace-nowrap hover:bg-slate-50 transition shrink-0"
              >
                <span>🖨️ Mini Printer</span>
              </button>
            </div>

            {/* Disclaimer Footnote */}
            <p className="text-[10px] text-slate-400 text-center">
              AI can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      </div>

      {/* Slide-over Conversation History Drawer */}
      <AiConversationList
        conversations={conversations}
        activeConversationId={conversationId}
        onSelect={loadConversation}
        onNewChat={handleClearChat}
        onDelete={deleteConversation}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}
