"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  GripVertical,
  ExternalLink,
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
  const [quotaInfo, setQuotaInfo] = useState<{
    usedThisMonth: number;
    quotaTotal: number;
    isQuotaExceeded: boolean;
  } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Resizable Phone View State
  const [showPhonePreview, setShowPhonePreview] = useState(true);
  const [phoneWidth, setPhoneWidth] = useState(400); // 400px default
  const [isResizing, setIsResizing] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"phone" | "ai">("ai");
  const [phoneIframeKey, setPhoneIframeKey] = useState(0);

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
    fetchEntitlement();
    fetchConversations();
  }, [portal]);

  const fetchEntitlement = async () => {
    try {
      const res = await fetch("/api/ai/entitlement");
      if (res.ok) {
        const data = await res.json();
        setQuotaInfo({
          usedThisMonth: data.usedThisMonth || 0,
          quotaTotal: data.quotaTotal ?? -1,
          isQuotaExceeded: Boolean(data.isQuotaExceeded),
        });
      }
    } catch (e) {}
  };

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

  // Dragging logic for resizable divider
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.min(Math.max(e.clientX - rect.left, 300), 650);
      setPhoneWidth(newWidth);
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

  // Target portal URL for Phone Preview
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

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || loading) return;

    if (quotaInfo?.isQuotaExceeded) {
      alert("Monthly AI message limit reached. Please contact your administrator to upgrade.");
      return;
    }

    const optimisticUserMessage: AiMessage = {
      id: `temp_${Date.now()}`,
      conversationId: conversationId || "",
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);
    setInputPrompt("");
    setAttachedFiles([]);
    setLoading(true);

    // Trigger tool state visualizer
    setActiveToolPart({
      type: "database_query",
      state: "input-streaming",
      input: {
        portal,
        query: text,
        timestamp: new Date().toISOString(),
      },
    });

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          conversationId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        const errorMessage: AiMessage = {
          id: `err_${Date.now()}`,
          conversationId: conversationId || "",
          role: "assistant",
          content: `⚠️ ${errData.error || "Unable to generate AI response. Please try again."}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setActiveToolPart({
          type: "database_query",
          state: "output-error",
          errorText: errData.error || "Query failed",
        });
      } else {
        const data = await res.json();
        if (!conversationId && data.conversationId) {
          setConversationId(data.conversationId);
          fetchConversations();
        }
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== optimisticUserMessage.id);
          return [...filtered, data.userMessage, data.assistantMessage];
        });
        setActiveToolPart({
          type: "database_query",
          state: "output-available",
          output: {
            status: "200_OK",
            portal,
            model: data.assistantMessage?.metadata?.modelUsed || "compromise-nlp",
          },
        });
        fetchEntitlement();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          conversationId: conversationId || "",
          role: "assistant",
          content: "⚠️ Network connection error. Please check your internet and try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
      setActiveToolPart(null);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestedPrompts = () => {
    switch (portal) {
      case "school_admin":
        return [
          "Give me today's school summary",
          "What is the total pending fee?",
          "Show students with low attendance",
          "Which classes have lowest attendance?",
          "Class-wise student enrollment breakdown",
        ];
      case "teacher":
        return [
          "Summarize my assigned classes",
          "Which students have low attendance?",
          "Show active homework assignments",
          "What's on my timetable today?",
        ];
      case "student":
        return [
          "What is my attendance percentage?",
          "Do I have any homework due this week?",
          "Check my pending fee balance",
          "Upcoming exams schedule",
        ];
      case "super_admin":
        return [
          "Show platform overview & schools count",
          "Summarize active subscriptions",
          "How many AI requests this month?",
        ];
      default:
        return [
          "Give me a school overview",
          "What is the attendance status?",
          "Check recent announcements",
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

        // Skip divider line like | :--- | :--- |
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
          <h3 key={i} className="text-lg font-black text-gray-900 dark:text-white mt-4 mb-2 tracking-tight">
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
        i++; // skip next line as it was rendered
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
      className="flex flex-col h-[calc(100vh-4.5rem)] max-h-[100dvh] bg-gray-50/50 dark:bg-gray-950 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden"
    >
      {/* ============================================================== */}
      {/* 1. TOP DUAL-WORKSPACE HEADER                                   */}
      {/* ============================================================== */}
      <div className="px-4 py-2.5 bg-white dark:bg-gray-900 border-b border-gray-200/80 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
              AI Playground & Live Phone View
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">
              Full offline NLP intelligence synchronized with your portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Mobile switcher */}
          <div className="md:hidden flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveMobileTab("phone")}
              className={`py-1 px-2.5 rounded-md transition ${
                activeMobileTab === "phone"
                  ? "bg-white dark:bg-gray-900 text-indigo-600 shadow-xs"
                  : "text-gray-500"
              }`}
            >
              📱 Phone View
            </button>
            <button
              onClick={() => setActiveMobileTab("ai")}
              className={`py-1 px-2.5 rounded-md transition ${
                activeMobileTab === "ai"
                  ? "bg-white dark:bg-gray-900 text-indigo-600 shadow-xs"
                  : "text-gray-500"
              }`}
            >
              ✨ AI
            </button>
          </div>

          {/* Desktop Phone Toggle */}
          <button
            onClick={() => setShowPhonePreview(!showPhonePreview)}
            className="hidden md:flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition"
          >
            <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
            <span>{showPhonePreview ? "Hide Phone" : "Show Phone"}</span>
          </button>

          <AiContextBadge portal={portal} schoolName={schoolName} />

          <button
            onClick={() => setShowHistory(true)}
            className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition"
            title="Conversation History"
          >
            <History className="h-4 w-4" />
          </button>

          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. DUAL-PANE RESIZABLE WORKSPACE CONTAINER                     */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ------------------------------------------------------------ */}
        {/* LEFT PANE: LIVE INTERACTIVE PHONE MOCKUP PORTAL              */}
        {/* ------------------------------------------------------------ */}
        <div
          style={{ width: showPhonePreview ? `${phoneWidth}px` : "0px" }}
          className={`shrink-0 bg-gray-100 dark:bg-gray-950 flex flex-col items-center justify-center p-3 border-r border-gray-200 dark:border-gray-800 transition-[width] duration-75 overflow-hidden ${
            showPhonePreview ? "flex" : "hidden"
          } ${activeMobileTab === "phone" ? "flex! w-full!" : "hidden md:flex"}`}
        >
          {/* Phone Shell */}
          <div className="relative w-full max-w-[360px] h-[96%] bg-black rounded-[42px] p-3 shadow-2xl border-4 border-gray-800 flex flex-col overflow-hidden">
            {/* Phone Top Notch & Camera */}
            <div className="w-full flex items-center justify-between px-6 pt-1 pb-2 text-[10px] text-white font-semibold">
              <span>9:41</span>
              <div className="h-4 w-24 bg-black rounded-full border border-gray-800 flex items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-gray-900 border border-gray-700" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[9px]">5G</span>
                <span className="h-2 w-3.5 rounded-xs border border-white flex items-center p-0.5">
                  <span className="h-full w-full bg-white rounded-2xs" />
                </span>
              </div>
            </div>

            {/* URL / Refresh Bar */}
            <div className="bg-gray-900/90 rounded-xl px-2.5 py-1.5 mb-2 flex items-center justify-between text-[11px] text-gray-300">
              <div className="flex items-center gap-1.5 truncate">
                <Globe className="h-3 w-3 text-emerald-400 shrink-0" />
                <span className="font-mono text-[10px] truncate">{getPortalUrl()}</span>
              </div>
              <button
                onClick={() => setPhoneIframeKey((k) => k + 1)}
                className="p-1 hover:text-white rounded-md transition"
                title="Reload Phone Portal"
              >
                <RotateCw className="h-3 w-3" />
              </button>
            </div>

            {/* Live Portal Iframe */}
            <div className="flex-1 w-full rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-inner">
              <iframe
                key={phoneIframeKey}
                src={getPortalUrl()}
                title="Live Portal Mobile Preview"
                className="w-full h-full border-0"
              />
            </div>

            {/* Phone Bottom Home Bar */}
            <div className="w-full flex justify-center py-2">
              <div className="h-1 w-28 bg-gray-600 rounded-full" />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* DRAGGABLE RESIZE DIVIDER BAR                                 */}
        {/* ------------------------------------------------------------ */}
        {showPhonePreview && (
          <div
            onMouseDown={handleMouseDown}
            className="hidden md:flex w-2 bg-gray-100 hover:bg-indigo-500/20 active:bg-indigo-500 dark:bg-gray-800 cursor-col-resize items-center justify-center transition-colors group z-10 select-none"
            title="Drag to resize phone preview"
          >
            <div className="h-8 w-1 rounded-full bg-gray-300 group-hover:bg-indigo-500 dark:bg-gray-600 transition" />
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* RIGHT PANE: FULL AI PLAYGROUND                               */}
        {/* ------------------------------------------------------------ */}
        <div
          className={`flex-1 flex flex-col h-full bg-white dark:bg-gray-900 min-w-0 ${
            activeMobileTab === "ai" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Conversation Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Tool Activity Card if active */}
            {activeToolPart && (
              <Tool toolPart={activeToolPart} className="max-w-md mx-auto" />
            )}

            {messages.length === 0 ? (
              /* Empty State */
              <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-8">
                <div className="h-14 w-14 rounded-2xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-indigo-600/20">
                  <Sparkles className="h-7 w-7 animate-pulse" />
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  Ask School Study AI
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                  Powered by local NLP Compromise & Live Firestore data. Zero external API keys needed.
                  Full tables, headings, and metrics returned.
                </p>

                {/* Prompt Suggestions */}
                <div className="w-full mt-6">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                    Suggested Queries
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {getSuggestedPrompts().map((p, idx) => (
                      <PromptSuggestion key={idx} onClick={() => handleSendMessage(p)}>
                        {p}
                      </PromptSuggestion>
                    ))}
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
                      <div className="h-8 w-8 rounded-xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={`relative group max-w-[90%] sm:max-w-2xl rounded-2xl p-4 transition-all ${
                        isUser
                          ? "bg-indigo-600 text-white rounded-tr-xs shadow-md shadow-indigo-600/10"
                          : "bg-gray-50 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700/60 rounded-tl-xs shadow-xs"
                      }`}
                    >
                      {isUser ? (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div>
                          {renderMessageContent(msg.content)}

                          {/* Metric Cards if present */}
                          {msg.metadata?.metrics && Object.keys(msg.metadata.metrics).length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                              {Object.entries(msg.metadata.metrics).map(([label, val]) => (
                                <div
                                  key={label}
                                  className="bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200/60 dark:border-gray-700/60"
                                >
                                  <div className="text-[10px] text-gray-400 uppercase font-bold">
                                    {label}
                                  </div>
                                  <div className="text-sm font-black text-gray-900 dark:text-white mt-0.5">
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
                                    className="text-[11px] py-1 px-2.5"
                                  >
                                    {fPrompt}
                                  </PromptSuggestion>
                                ))}
                              </div>
                            )}

                          {/* Message Footer */}
                          <div className="flex items-center justify-between mt-2 pt-1 text-[11px] text-gray-400">
                            <span>
                              {msg.metadata?.modelUsed || "compromise-nlp-v2"}
                            </span>
                            <button
                              onClick={() => copyToClipboard(msg.content, index)}
                              className="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-200 transition"
                              title="Copy response"
                            >
                              {copiedIndex === index ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  <span className="text-emerald-500 font-medium">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
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

            {/* Reasoning / Thinking State */}
            {loading && (
              <div className="max-w-md">
                <ThinkingBar
                  text="Analyzing portal context & synthesizing live data..."
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
          <div className="p-3 sm:p-4 bg-white dark:bg-gray-900 border-t border-gray-200/80 dark:border-gray-800 shrink-0">
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
                {/* Attached Files Preview */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2.5 border-b border-gray-100 dark:border-gray-800">
                    {attachedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="p-0.5 hover:text-red-500 rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <PromptInputTextarea
                  placeholder={`Ask School Study AI about ${
                    portal === "student"
                      ? "attendance, fees, homework, exams..."
                      : portal === "teacher"
                      ? "classes, students, timetable, assignments..."
                      : "students, fees, attendance, defaulters, reports..."
                  }`}
                />

                <PromptInputActions className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <PromptInputAction tooltip="Attach file / document">
                      <FileUploadTrigger asChild>
                        <button
                          type="button"
                          className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                      </FileUploadTrigger>
                    </PromptInputAction>
                  </div>

                  <PromptInputAction tooltip="Send prompt">
                    <Button
                      size="icon"
                      variant="default"
                      className="h-8 w-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                      disabled={(!inputPrompt.trim() && attachedFiles.length === 0) || loading}
                      onClick={() => handleSendMessage()}
                    >
                      {loading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowUp className="h-4 w-4" />
                      )}
                    </Button>
                  </PromptInputAction>
                </PromptInputActions>
              </PromptInput>

              {/* Drag and drop overlay */}
              <FileUploadContent>
                <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border-2 border-dashed border-indigo-500 text-center shadow-xl">
                  <Paperclip className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    Drop files to attach to AI prompt
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Supports PDF, PNG, JPG, DOCX</p>
                </div>
              </FileUploadContent>
            </FileUpload>

            <p className="text-[10px] text-gray-400 text-center mt-2">
              Context-Aware School Study AI • Direct Firestore integration • Read-Only Safe Mode
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
