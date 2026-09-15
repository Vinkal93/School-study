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
  ChevronLeft,
  Menu,
  Moon,
  Sun,
  Bell,
  Mic,
  MicOff,
  Send,
  MoreVertical,
  BookOpen,
  Clock,
  ClipboardCheck,
  FileText,
  FileSpreadsheet,
  Zap,
  Wifi,
  Battery,
  Maximize2,
} from "lucide-react";
import { AiConversationList } from "./AiConversationList";
import type { AiPortalType, AiMessage, AiConversation } from "@/types/ai";
import { useAuth } from "@/hooks/use-auth";

// Prompt Kit components
import { ThinkingBar } from "@/components/prompt-kit/thinking-bar";
import { Tool, type ToolPart } from "@/components/prompt-kit/tool";
import { SystemMessage } from "@/components/prompt-kit/system-message";
import { Button } from "@/components/ui/button";

// ============================================================================
// 1. LEFT SIDE: LIVE PHONE PORTAL VIEWPORT (REAL APP EMBEDDED)
// ============================================================================
interface LivePhoneViewportProps {
  portal: AiPortalType;
  currentUrl: string;
  onNavigate: (url: string) => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

function LivePhoneViewport({
  portal,
  currentUrl,
  onNavigate,
  iframeRef,
}: LivePhoneViewportProps) {
  const [displayPath, setDisplayPath] = useState(currentUrl);
  const [currentTime, setCurrentTime] = useState("09:41");
  const [isLoadingIframe, setIsLoadingIframe] = useState(false);

  // Live time in status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Sync display path when currentUrl changes from parent
  useEffect(() => {
    setDisplayPath(currentUrl);
  }, [currentUrl]);

  // Handle iframe load event to extract real current pathname if navigated inside
  const handleIframeLoad = () => {
    setIsLoadingIframe(false);
    try {
      const win = iframeRef.current?.contentWindow;
      if (win && win.location && win.location.pathname) {
        setDisplayPath(win.location.pathname);
      }
    } catch {
      // Cross-origin security safeguard (not expected in same-origin)
    }
  };

  const handleRefresh = () => {
    setIsLoadingIframe(true);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.location.reload();
    }
  };

  const handleGoBack = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.history.back();
      }
    } catch {
      // Fallback
    }
  };

  // Quick shortcuts based on portal
  const quickLinks =
    portal === "super_admin"
      ? [
          { label: "Dashboard", url: "/super-admin" },
          { label: "Schools", url: "/super-admin/schools" },
          { label: "Billing", url: "/super-admin/subscriptions" },
        ]
      : portal === "teacher"
      ? [
          { label: "Dashboard", url: "/teacher" },
          { label: "Attendance", url: "/teacher/attendance" },
          { label: "Homework", url: "/teacher/homework" },
        ]
      : portal === "student"
      ? [
          { label: "Dashboard", url: "/student" },
          { label: "Fees", url: "/student/fees" },
          { label: "Exams", url: "/student/exams" },
        ]
      : [
          { label: "Dashboard", url: "/admin" },
          { label: "Students", url: "/admin/students" },
          { label: "Fees", url: "/admin/fees/student-fees" },
          { label: "Attendance", url: "/admin/attendance" },
          { label: "Classes", url: "/admin/classes" },
          { label: "Backup", url: "/admin/backup" },
        ];

  return (
    <div className="w-full max-w-[400px] min-w-[360px] h-full flex flex-col items-center justify-center select-none shrink-0 py-1">
      {/* Smartphone Chassis Shell */}
      <div className="w-full h-full max-h-[96vh] rounded-[44px] border-[6px] border-slate-800 dark:border-slate-700 bg-slate-950 shadow-2xl flex flex-col overflow-hidden relative ring-1 ring-white/10">
        {/* Dynamic Island Notch & Speaker */}
        <div className="pt-2 pb-1 px-5 flex items-center justify-between text-white text-[11px] font-semibold shrink-0 bg-slate-950 z-20">
          <span className="font-mono tracking-tighter pl-1">{currentTime}</span>
          {/* Dynamic Island Pill */}
          <div className="h-5 w-24 bg-black rounded-full flex items-center justify-between px-2.5 shadow-inner">
            <span className="h-2 w-2 rounded-full bg-blue-500/80 animate-pulse" />
            <span className="h-2 w-2 rounded-full bg-slate-800" />
          </div>
          {/* Status Icons */}
          <div className="flex items-center gap-1.5 text-white/80 pr-1">
            <Wifi className="h-3 w-3" />
            <Battery className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Compact Phone Address / Navigation Bar */}
        <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-1.5 text-xs text-slate-300 shrink-0 z-20">
          <div className="flex items-center gap-1">
            <button
              onClick={handleGoBack}
              title="Go back inside mobile portal"
              className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleRefresh}
              title="Reload mobile portal"
              className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <RotateCw
                className={`h-3.5 w-3.5 ${isLoadingIframe ? "animate-spin text-blue-400" : ""}`}
              />
            </button>
          </div>

          {/* Current Path Indicator */}
          <div className="flex-1 mx-1 px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 truncate flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-blue-400 shrink-0" />
            <span className="truncate">{displayPath}</span>
          </div>

          <a
            href={displayPath}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new browser tab"
            className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Horizontal Quick Jump Tabs */}
        <div className="px-2.5 py-1 bg-slate-950 border-b border-slate-800/60 flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0 z-20">
          {quickLinks.map((item) => {
            const isActive = displayPath === item.url;
            return (
              <button
                key={item.url}
                onClick={() => onNavigate(item.url)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Live Interactive Application Viewport */}
        <div className="relative flex-1 w-full bg-white dark:bg-slate-950 overflow-hidden">
          {isLoadingIframe && (
            <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-10">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 shadow-md text-xs font-semibold text-slate-700 dark:text-slate-200">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
                <span>Loading portal...</span>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={currentUrl}
            title="Live School Study Portal Viewport"
            className="w-full h-full border-0 bg-white dark:bg-slate-950"
            onLoad={handleIframeLoad}
          />
        </div>

        {/* Bottom Phone Home Gesture Indicator */}
        <div className="py-1.5 bg-slate-950 flex items-center justify-center shrink-0 z-20">
          <div className="w-28 h-1 bg-slate-600/70 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. MAIN AI WORKSPACE COMPONENT (WHATSAPP WEB STYLE SPLIT WORKSPACE)
// ============================================================================
export interface AiWorkspaceProps {
  portal: AiPortalType;
  schoolName?: string;
  userName?: string;
}

export function AiWorkspace({ portal, schoolName, userName }: AiWorkspaceProps) {
  const { firebaseUser } = useAuth();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Phone Navigation & Viewport State
  const defaultRoute =
    portal === "super_admin"
      ? "/super-admin"
      : portal === "teacher"
      ? "/teacher"
      : portal === "student"
      ? "/student"
      : "/admin";

  const [phoneUrl, setPhoneUrl] = useState<string>(defaultRoute);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Mobile layout switcher: [📱 School App] or [✨ AI Assistant]
  const [activeMobileTab, setActiveMobileTab] = useState<"screen" | "ai">("ai");

  // Prompt-Kit active tool animation
  const [activeToolPart, setActiveToolPart] = useState<ToolPart | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    fetchConversations();
  }, [portal, firebaseUser]);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {};
    try {
      const token = firebaseUser ? await firebaseUser.getIdToken().catch(() => "") : "";
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {}
    return headers;
  };

  const fetchConversations = async () => {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/ai/conversations", { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (e) {}
  };

  const loadConversation = async (id: string) => {
    try {
      setLoading(true);
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/ai/conversations/${id}`, { headers: authHeaders });
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
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/ai/conversations/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
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

  // Navigates the live phone iframe
  const handleNavigatePhone = (path: string) => {
    setPhoneUrl(path);
    if (iframeRef.current) {
      iframeRef.current.src = path;
    }
  };

  const handleSendMessage = async (promptToSend?: string, targetPhoneRoute?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || loading) return;

    // Switch to AI tab if on mobile
    setActiveMobileTab("ai");

    // If a target phone route was requested, also navigate the left phone
    if (targetPhoneRoute) {
      handleNavigatePhone(targetPhoneRoute);
    }

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
      const authHeaders = await getAuthHeaders();
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          prompt: text,
          message: text,
          query: text,
          question: text,
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

      // If AI intent suggested a page navigation, automatically navigate the phone viewport
      if (data.metadata?.targetRoute) {
        handleNavigatePhone(data.metadata.targetRoute);
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

  // Speech to text toggle
  const handleToggleSpeech = () => {
    if (isListening) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Full Markdown + Table Renderer with interactive phone navigation
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
        <div
          key={`table_${key}`}
          className="my-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs"
        >
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
          <h3
            key={i}
            className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-4 mb-2 tracking-tight"
          >
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
            <span className="text-blue-500 font-bold">•</span>
            <span className="text-xs sm:text-sm">{renderFormattedText(item)}</span>
          </div>
        );
      } else if (
        line.startsWith("> [!IMPORTANT]") ||
        line.startsWith("> [!TIP]") ||
        line.startsWith("> [!NOTE]")
      ) {
        const type = line.includes("IMPORTANT")
          ? "action"
          : line.includes("TIP")
          ? "warning"
          : "info";
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
            className="pl-3 border-l-2 border-blue-400 text-gray-600 dark:text-gray-300 italic text-xs my-1.5"
          >
            {renderFormattedText(line.replace(/^>\s*/, ""))}
          </blockquote>
        );
      } else if (line.trim() === "---") {
        elements.push(<hr key={i} className="my-3 border-gray-200 dark:border-gray-800" />);
      } else if (line.trim() === "") {
        elements.push(<div key={i} className="h-1" />);
      } else {
        elements.push(
          <p key={i} className="text-xs sm:text-sm">
            {renderFormattedText(line)}
          </p>
        );
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

      // Internal app links navigate the phone viewport on click!
      const isInternalLink =
        href.startsWith("/admin") ||
        href.startsWith("/super-admin") ||
        href.startsWith("/teacher") ||
        href.startsWith("/student");

      if (isInternalLink) {
        parts.push(
          <button
            key={match.index}
            onClick={() => handleNavigatePhone(href)}
            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md text-xs border border-blue-200 dark:border-blue-900"
            title={`Navigate left phone view to ${href}`}
          >
            <span>📱 {label}</span>
            <ArrowRight className="h-3 w-3 inline" />
          </button>
        );
      } else {
        parts.push(
          <Link
            key={match.index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline"
          >
            {label} <ArrowRight className="h-3 w-3 inline" />
          </Link>
        );
      }
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
    <div className="flex flex-col h-screen h-[100dvh] w-screen overflow-hidden bg-slate-100/80 dark:bg-slate-950 p-2 sm:p-3 font-sans">
      {/* Mobile Screen Segmented Switcher (< 1024px) */}
      <div className="lg:hidden flex items-center justify-between pb-2 shrink-0">
        <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveMobileTab("screen")}
            className={`py-1.5 px-3.5 rounded-lg transition ${
              activeMobileTab === "screen"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-500"
            }`}
          >
            📱 Mobile Portal
          </button>
          <button
            onClick={() => setActiveMobileTab("ai")}
            className={`py-1.5 px-3.5 rounded-lg transition ${
              activeMobileTab === "ai"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-500"
            }`}
          >
            ✨ AI Assistant
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href={defaultRoute}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
          >
            Exit AI
          </Link>
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            title="History"
          >
            <History className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Split View: Left Phone Viewport + Right AI Assistant */}
      <div className="flex-1 flex gap-3 sm:gap-4 overflow-hidden relative">
        {/* ============================================================ */}
        {/* LEFT SECTION: REAL LIVE PHONE PORTAL VIEWPORT                */}
        {/* ============================================================ */}
        <div
          className={`shrink-0 items-center justify-center ${
            activeMobileTab === "screen" ? "flex w-full" : "hidden lg:flex"
          }`}
        >
          <LivePhoneViewport
            portal={portal}
            currentUrl={phoneUrl}
            onNavigate={handleNavigatePhone}
            iframeRef={iframeRef}
          />
        </div>

        {/* ============================================================ */}
        {/* RIGHT SECTION: MODERN AI ASSISTANT WORKSPACE (FLEX: 1)       */}
        {/* ============================================================ */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden min-w-0 ${
            activeMobileTab === "ai" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Top Bar Header */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
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
                <p className="text-xs text-slate-400">
                  {schoolName ? `${schoolName} • ` : ""}Interactive School Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={defaultRoute}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                title="Exit AI Mode to full desktop dashboard"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                <span>Exit AI Mode</span>
              </Link>

              <button
                onClick={handleClearChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                title="Clear current chat"
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden md:inline">Clear Chat</span>
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

          {/* Chat Stream / Empty Hero State */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {activeToolPart && (
              <Tool toolPart={activeToolPart} className="max-w-md mx-auto" />
            )}

            {messages.length === 0 ? (
              /* Hero Empty State: 3D Robot + Floating Chips */
              <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-2 sm:py-6 text-center">
                {/* 3D Friendly Robot Illustration with Floating Badges */}
                <div className="relative w-72 h-56 flex items-center justify-center my-2">
                  {/* Floating Chips Left */}
                  <button
                    onClick={() =>
                      handleSendMessage(
                        "Kitne total students enrolled hain aur class-wise breakdown kya hai?",
                        "/admin/students"
                      )
                    }
                    className="absolute top-4 left-0 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform cursor-pointer"
                  >
                    <span className="text-blue-500">👥</span>
                    <span>Students</span>
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        "Current fee collection and pending dues status kya hai?",
                        "/admin/fees/student-fees"
                      )
                    }
                    className="absolute top-20 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform cursor-pointer"
                  >
                    <span className="text-emerald-500">₹</span>
                    <span>Fees</span>
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        "School overall academic and fee report dikhao",
                        "/admin/reports"
                      )
                    }
                    className="absolute bottom-4 left-2 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform cursor-pointer"
                  >
                    <span className="text-purple-500">📊</span>
                    <span>Reports</span>
                  </button>

                  {/* Floating Chips Right */}
                  <button
                    onClick={() =>
                      handleSendMessage(
                        "Aaj kitne students present aur absent hain?",
                        "/admin/attendance"
                      )
                    }
                    className="absolute top-4 right-0 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform cursor-pointer"
                  >
                    <span className="text-blue-500">📅</span>
                    <span>Attendance</span>
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        "Class 8th ka timetable create karne ka process batao",
                        "/admin/timetable"
                      )
                    }
                    className="absolute top-20 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform cursor-pointer"
                  >
                    <span className="text-amber-500">🕒</span>
                    <span>Timetable</span>
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        "Exams and test schedules ki list dikhao",
                        "/admin/exams"
                      )
                    }
                    className="absolute bottom-4 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform cursor-pointer"
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
                      <line
                        x1="80"
                        y1="26"
                        x2="80"
                        y2="12"
                        stroke="#cbd5e1"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <circle cx="80" cy="11" r="5" fill="#f59e0b" />

                      {/* Robot Head */}
                      <rect
                        x="36"
                        y="24"
                        width="88"
                        height="66"
                        rx="32"
                        fill="url(#bodyGrad)"
                        stroke="#cbd5e1"
                        strokeWidth="2"
                      />

                      {/* Ear Pods */}
                      <rect x="30" y="44" width="8" height="22" rx="4" fill="#3b82f6" />
                      <rect x="122" y="44" width="8" height="22" rx="4" fill="#3b82f6" />

                      {/* Visor Screen */}
                      <rect x="44" y="34" width="72" height="42" rx="18" fill="url(#visorGrad)" />

                      {/* Digital Eyes */}
                      <circle cx="64" cy="52" r="8" fill="url(#blueGlow)" />
                      <circle cx="67" cy="49" r="2.5" fill="#ffffff" />
                      <circle cx="96" cy="52" r="8" fill="url(#blueGlow)" />
                      <circle cx="99" cy="49" r="2.5" fill="#ffffff" />

                      {/* Smile */}
                      <path
                        d="M 72 64 Q 80 70 88 64"
                        stroke="#60a5fa"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        fill="none"
                      />

                      {/* Neck & Chest */}
                      <rect x="68" y="90" width="24" height="8" fill="#94a3b8" rx="2" />
                      <path
                        d="M 50 98 Q 80 94 110 98 L 118 136 Q 80 144 42 136 Z"
                        fill="url(#bodyGrad)"
                        stroke="#cbd5e1"
                        strokeWidth="2"
                      />

                      {/* Chest Light */}
                      <circle cx="80" cy="114" r="7" fill="#3b82f6" opacity="0.9" />
                      <circle cx="80" cy="114" r="4" fill="#ffffff" />

                      {/* Left Arm */}
                      <path
                        d="M 44 104 Q 30 115 36 130"
                        stroke="url(#bodyGrad)"
                        strokeWidth="9"
                        strokeLinecap="round"
                        fill="none"
                      />

                      {/* Right Arm Waving */}
                      <path
                        d="M 116 104 Q 134 96 142 80"
                        stroke="url(#bodyGrad)"
                        strokeWidth="9"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <circle cx="143" cy="78" r="6" fill="#3b82f6" />
                    </svg>
                  </div>
                </div>

                {/* Hero Greeting Text */}
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                  Hello{userName ? `, ${userName}` : ""}! 👋
                </h1>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  I&apos;m your AI School Assistant
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-lg leading-relaxed">
                  Ask me anything about your school. Both the AI workspace and the phone on your
                  left work together in real time!
                </p>

                {/* 4 Action Cards in a 4-column Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full mt-6 text-left">
                  {/* Card 1: Student Information */}
                  <div
                    onClick={() =>
                      handleSendMessage("Show students with pending fees", "/admin/students")
                    }
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
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-blue-500 font-semibold">
                        Opens /students
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Card 2: Fee Reports */}
                  <div
                    onClick={() =>
                      handleSendMessage(
                        "Generate this month's collection report",
                        "/admin/fees/student-fees"
                      )
                    }
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
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-emerald-500 font-semibold">
                        Opens /fees
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Card 3: Attendance */}
                  <div
                    onClick={() =>
                      handleSendMessage(
                        "Show today's attendance summary",
                        "/admin/attendance"
                      )
                    }
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
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-purple-500 font-semibold">
                        Opens /attendance
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Card 4: Create Timetable */}
                  <div
                    onClick={() =>
                      handleSendMessage("Make a timetable for class 8", "/admin/timetable")
                    }
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
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-amber-500 font-semibold">
                        Opens /timetable
                      </span>
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
                          {msg.metadata?.metrics &&
                            Object.keys(msg.metadata.metrics).length > 0 && (
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

          {/* Bottom Floating Input & Suggestion Chips */}
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

            {/* Main Input Composer */}
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
                placeholder={
                  isListening
                    ? "Listening... Please speak your question"
                    : "Ask anything about your school..."
                }
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
                  onClick={handleToggleSpeech}
                  className={`p-1.5 rounded-lg transition ${
                    isListening
                      ? "text-red-500 bg-red-50 dark:bg-red-950 animate-pulse"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  }`}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
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

            {/* Suggestion Chips with Direct Phone Linkages */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 text-slate-600 dark:text-slate-300">
              <button
                onClick={() =>
                  handleSendMessage("Show total students count and details", "/admin/students")
                }
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-[11px] font-medium whitespace-nowrap hover:bg-slate-50 transition shrink-0"
              >
                <span>✨ Show total students</span>
              </button>
              <button
                onClick={() =>
                  handleSendMessage(
                    "Generate fee report for current month",
                    "/admin/fees/student-fees"
                  )
                }
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-[11px] font-medium whitespace-nowrap hover:bg-slate-50 transition shrink-0"
              >
                <span>📄 Generate fee report</span>
              </button>
              <button
                onClick={() =>
                  handleSendMessage(
                    "Today's attendance status and absentees",
                    "/admin/attendance"
                  )
                }
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-[11px] font-medium whitespace-nowrap hover:bg-slate-50 transition shrink-0"
              >
                <span>📅 Today&apos;s attendance</span>
              </button>
              <button
                onClick={() =>
                  handleSendMessage(
                    "Create exam schedule or check upcoming tests",
                    "/admin/exams"
                  )
                }
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-[11px] font-medium whitespace-nowrap hover:bg-slate-50 transition shrink-0"
              >
                <span>📋 Create exam</span>
              </button>
              <button
                onClick={() =>
                  handleSendMessage(
                    "Show fee defaulters list with pending balances",
                    "/admin/fees/defaulters"
                  )
                }
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-[11px] font-medium whitespace-nowrap hover:bg-slate-50 transition shrink-0"
              >
                <span>⚠️ Show defaulters</span>
              </button>
              <button
                onClick={() =>
                  handleSendMessage(
                    "Flipkart mini printer se fee receipt kaise print kare aur setup kare?",
                    "/admin/fees/receipts"
                  )
                }
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-[11px] font-medium whitespace-nowrap hover:bg-slate-50 transition shrink-0"
              >
                <span>🖨️ Mini Printer Setup</span>
              </button>
            </div>

            {/* Footnote */}
            <p className="text-[10px] text-slate-400 text-center">
              AI assistant with NLP engine. Click any blue link or card to navigate the live phone
              on the left.
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
