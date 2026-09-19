"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { traceClient } from "@/lib/debug-client";

// Speech Recognition type declarations (not in standard DOM lib)
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

import {
  Sparkles,
  History,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  X,
  Send,
  MoreVertical,
  Clock,
  Paperclip,
  Mic,
  MicOff,
} from "lucide-react";
import { AiConversationList } from "./AiConversationList";
import type { AiMessage, AiConversation, AiPortalType } from "@/types/ai";
import { useAuth } from "@/hooks/use-auth";

// Prompt-Kit active tool animation
import { ThinkingBar } from "@/components/prompt-kit/thinking-bar";
import { Tool, type ToolPart } from "@/components/prompt-kit/tool";
import { SystemMessage } from "@/components/prompt-kit/system-message";
import { Button } from "@/components/ui/button";

// Structured AI tool result types
export interface AiToolResult {
  data: any | null;
  error?: string;
  tool?: string;
}

// ============================================================================
// AI WORKSPACE COMPONENT (Full-width desktop layout — NO phone frame)
// ============================================================================

export interface AiWorkspaceProps {
  portal: AiPortalType;
  schoolName?: string;
  userName?: string;
}

export function AiWorkspace({
  portal,
  schoolName,
  userName,
}: AiWorkspaceProps) {
  const { firebaseUser } = useAuth();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    undefined
  );
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Prompt-Kit active tool animation
  const [activeToolPart, setActiveToolPart] = useState<ToolPart | null>(null);
  const [toolResult, setToolResult] = useState<AiToolResult | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, toolResult]);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {};
    try {
      const token = firebaseUser
        ? await firebaseUser.getIdToken().catch(() => "")
        : "";
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {}
    return headers;
  };

  const fetchConversations = async () => {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/ai/conversations", {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {}
  };

  useEffect(() => {
    traceClient("AiWorkspace:mount_or_user_changed", {
      portal,
      hasUser: !!firebaseUser,
      uid: firebaseUser?.uid,
    });
    fetchConversations();
  }, [portal, firebaseUser]);

  const loadConversation = async (id: string) => {
    try {
      setLoading(true);
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/ai/conversations/${id}`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setConversationId(data.conversation.id);
        setMessages(data.messages || []);
      }
    } catch {} finally {
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
    } catch {}
  };

  const handleClearChat = () => {
    setConversationId(undefined);
    setMessages([]);
    setInputPrompt("");
    setAttachedFiles([]);
    setActiveToolPart(null);
    setToolResult(null);
  };

  const handleSendMessage = async (
    promptToSend?: string,
    targetRoute?: string
  ) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || loading) return;

    if (!promptToSend) {
      setInputPrompt("");
    }
    setLoading(true);
    setToolResult(null);

    const userMessage: AiMessage = {
      id: `msg_${Date.now()}_user`,
      conversationId: conversationId || "active",
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Show tool animation while fetching
    setActiveToolPart({
      type: "database_query",
      state: "input-streaming",
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
        throw new Error(
          errData.error || `Request failed with status ${response.status}`
        );
      }

      const data = await response.json();

      setActiveToolPart({
        type: "database_query",
        state: "output-available",
        input: { query: text, intent: data.metadata?.intent || "COMPLETED" },
        output: data.toolResult || { intent: data.metadata?.intent || "COMPLETED" },
      });

      const assistantMessage: AiMessage = {
        id:
          data.assistantMessage?.id ||
          data.messageId ||
          `msg_${Date.now()}_assistant`,
        conversationId: data.conversationId || conversationId || "active",
        role: "assistant",
        content: data.assistantMessage?.content || data.message || "",
        createdAt: new Date().toISOString(),
        metadata: {
          modelUsed: data.assistantMessage?.metadata?.modelUsed || data.metadata?.modelUsed || "ai-tools-v1",
          tokensUsed: data.metadata?.tokensUsed,
          quickLinks: data.assistantMessage?.metadata?.quickLinks || data.metadata?.quickLinks,
          suggestedFollowUps:
            data.assistantMessage?.metadata?.suggestedFollowUps ||
            data.metadata?.suggestedFollowUps,
          metrics: data.assistantMessage?.metadata?.metrics || data.metadata?.metrics,
          toolResult: data.toolResult,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setToolResult(data.toolResult || null);

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (err: unknown) {
      const errorMessage: AiMessage = {
        id: `msg_${Date.now()}_err`,
        conversationId: conversationId || "active",
        role: "assistant",
        content: `Error: ${
          err instanceof Error ? err.message : "Failed to process query"
        }. Please try again.`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setToolResult(null);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setActiveToolPart(null);
      }, 2000);
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

    const SpeechRecognitionConstructor =
      (
        window as Window & {
          SpeechRecognition?: SpeechRecognitionConstructor;
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }
      ).SpeechRecognition ||
      (
        window as Window & {
          SpeechRecognition?: SpeechRecognitionConstructor;
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      alert(
        "Speech Recognition is not supported in this browser. Please use Chrome or Edge."
      );
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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

  // Markdown + Table Renderer (no phone navigation — just links)
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
          className="my-3 overflow-x-auto rounded-xl border border-gray-200 shadow-xs dark:border-gray-800"
        >
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-100/80 font-bold text-gray-700 dark:border-gray-800 dark:bg-gray-800/90 dark:text-gray-200">
              <tr>
                {headers.map((h, hi) => (
                  <th key={hi} className="px-3 py-2.5 whitespace-nowrap">
                    {renderFormattedText(h.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white text-gray-700 dark:divide-gray-800 dark:bg-gray-900/60 dark:text-gray-300">
              {rows.map((r, ri) => (
                <tr
                  key={ri}
                  className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                >
                  {r.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2">
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
            className="mt-4 mb-2 text-base font-black tracking-tight text-gray-900 sm:text-lg dark:text-white"
          >
            {line.replace("## ", "")}
          </h3>
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <h4
            key={i}
            className="mt-3 mb-1 text-sm font-bold text-gray-900 dark:text-white"
          >
            {line.replace("### ", "")}
          </h4>
        );
      } else if (line.startsWith("• ") || line.startsWith("- ")) {
        const item = line.replace(/^[•-]\s*/, "");
        elements.push(
          <div key={i} className="flex items-start gap-2 py-0.5 pl-1">
            <span className="font-bold text-blue-500">•</span>
            <span className="text-xs sm:text-sm">
              {renderFormattedText(item)}
            </span>
          </div>
        );
      } else if (
        line.startsWith("> [!IMPORTANT]") ||
        line.startsWith("> [!TIP]") ||
        line.startsWith("> [!NOTE]") ||
        line.startsWith("> [!WARNING]")
      ) {
        const type = line.includes("IMPORTANT")
          ? "action"
          : line.includes("WARNING")
          ? "warning"
          : line.includes("TIP")
          ? "warning"
          : "info";
        elements.push(
          <SystemMessage key={i} variant={type as any} fill className="my-2">
            {lines[i + 1]
              ? renderFormattedText(lines[i + 1].replace(/^>\s*/, ""))
              : ""}
          </SystemMessage>
        );
        i++;
      } else if (line.startsWith("> ")) {
        elements.push(
          <blockquote
            key={i}
            className="my-1.5 border-l-2 border-blue-400 pl-3 text-xs text-gray-600 italic dark:text-gray-300"
          >
            {renderFormattedText(line.replace(/^>\s*/, ""))}
          </blockquote>
        );
      } else if (line.trim() === "---") {
        elements.push(
          <hr key={i} className="my-3 border-gray-200 dark:border-gray-800" />
        );
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

      // Internal app links open in same window (no phone iframe navigation needed)
      const isInternalLink =
        href.startsWith("/admin") ||
        href.startsWith("/super-admin") ||
        href.startsWith("/teacher") ||
        href.startsWith("/student");

      if (isInternalLink) {
        parts.push(
          <Link
            key={match.index}
            href={href}
            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-600 hover:underline dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-400"
            title={`Open ${href} in a new tab`}
          >
            {label}
            <ArrowRight className="inline h-3 w-3" />
          </Link>
        );
      } else {
        parts.push(
          <a
            key={match.index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline dark:text-blue-400"
          >
            {label}
            <ArrowRight className="inline h-3 w-3" />
          </a>
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
        <strong
          key={match.index}
          className="font-bold text-gray-900 dark:text-white"
        >
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

  // Render action buttons from AI metadata
  const renderActionButtons = (msg: AiMessage) => {
    const quickLinks = msg.metadata?.quickLinks;
    if (!quickLinks || quickLinks.length === 0) return null;

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {quickLinks.map((link, idx) => (
          <Link
            key={idx}
            href={link.href}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40"
          >
            {link.label}
          </Link>
        ))}
      </div>
    );
  };

  // Render suggested follow-up chips
  const renderFollowUps = (msg: AiMessage) => {
    const followUps = msg.metadata?.suggestedFollowUps;
    if (!followUps || followUps.length === 0) return null;

    return (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {followUps.map((fu, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(fu)}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {fu}
          </button>
        ))}
      </div>
    );
  };

  // Default suggested prompts for the empty state
  const defaultSuggestedPrompts = [
    { label: "Show students with pending fees", icon: "👥" },
    { label: "How much fee is pending?", icon: "💰" },
    { label: "Show today's attendance", icon: "📅" },
    { label: "How many students are enrolled?", icon: "🎓" },
    { label: "Show this month's fee collection", icon: "📊" },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50 font-sans dark:bg-slate-950">
      {/* Top Bar Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-md">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                AI Assistant
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Online
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={portal === "super_admin" ? "/super-admin" : "/admin"}
            className="hidden items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Exit AI Mode to full dashboard"
          >
            <ArrowRight className="h-3.5 w-3.5 rotate-180" />
            <span>Exit AI Mode</span>
          </Link>

          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Clear current chat"
          >
            <Trash2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden md:inline">Clear Chat</span>
          </button>

          <button
            onClick={() => setShowHistory(true)}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Conversation History"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chat Stream / Empty Hero State */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        {activeToolPart && (
          <div className="max-w-md">
            <Tool toolPart={activeToolPart} className="mx-auto" />
          </div>
        )}

        {messages.length === 0 ? (
          // Hero Empty State: Clean Welcome + Suggested Prompts
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center py-4 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-lg">
              <span className="text-3xl">🤖</span>
            </div>

            <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
              Hello{userName ? `, ${userName}` : ""}! 👋
            </h1>
            <h2 className="mt-0.5 text-lg font-extrabold text-slate-900 sm:text-xl dark:text-white">
              I&apos;m your AI School Assistant
            </h2>
            <p className="mt-2 max-w-lg text-xs leading-relaxed text-slate-500 sm:text-sm dark:text-slate-400">
              Ask me anything about your school — fees, attendance, students, exams, timetable, and more. I use your real school database with strict data isolation. No phone frames, no fake data.
            </p>

            {/* Suggested Prompt Chips */}
            <div className="mt-6 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {defaultSuggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt.label)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-xs font-medium text-slate-700 shadow-xs transition hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <span>{prompt.icon}</span>
                  <span>{prompt.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Message Stream
          messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id || index}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-xs">
                    <span className="text-xs">🤖</span>
                  </div>
                )}

                <div
                  className={`group relative max-w-[92%] rounded-2xl p-3.5 transition-all sm:max-w-2xl sm:p-4 ${
                    isUser
                      ? "rounded-tr-xs bg-blue-600 text-white shadow-md shadow-blue-600/10"
                      : "border border-slate-200/80 bg-white text-slate-800 shadow-xs dark:border-slate-700/60 dark:bg-slate-800/90 dark:text-slate-200"
                  }`}
                >
                  {isUser ? (
                    <p className="text-xs whitespace-pre-wrap sm:text-sm">
                      {msg.content}
                    </p>
                  ) : (
                    <div>
                      {renderMessageContent(msg.content)}

                      {/* Metrics Cards if present */}
                      {msg.metadata?.metrics &&
                        Object.keys(msg.metadata.metrics).length > 0 && (
                          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-3 sm:grid-cols-3 dark:border-slate-700/60">
                            {Object.entries(msg.metadata.metrics).map(
                              ([label, val]) => (
                                <div
                                  key={label}
                                  className="rounded-lg border border-slate-200/60 bg-white p-2 dark:border-slate-700/60 dark:bg-slate-900"
                                >
                                  <div className="text-[9px] font-bold text-slate-400 uppercase sm:text-[10px]">
                                    {label}
                                  </div>
                                  <div className="mt-0.5 text-xs font-black text-slate-900 sm:text-sm dark:text-white">
                                    {val}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}

                      {/* Action Buttons */}
                      {renderActionButtons(msg)}

                      {/* Suggested Follow-ups */}
                      {renderFollowUps(msg)}

                      {/* Message Footer */}
                      <div className="mt-2 flex items-center justify-between pt-1 text-[10px] text-slate-400 sm:text-[11px]">
                        <span>
                          {msg.metadata?.modelUsed || "ai-tools-v1"}
                        </span>
                        <button
                          onClick={() => copyToClipboard(msg.content, index)}
                          className="flex items-center gap-1 transition hover:text-slate-600 dark:hover:text-slate-200"
                          title="Copy response"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500 sm:h-3.5 sm:w-3.5" />
                              <span className="font-medium text-emerald-500">
                                Copied
                              </span>
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
              text="Analyzing school data with NLP engine..."
              stopLabel="Cancel"
              onStop={() => setLoading(false)}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Fixed Input Composer */}
      <div className="shrink-0 space-y-2.5 border-t border-slate-100 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
        {/* Attached Files Pill */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-2">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <Paperclip className="h-3 w-3 text-blue-500" />
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setAttachedFiles((prev) =>
                      prev.filter((_, i) => i !== idx)
                    )
                  }
                  className="rounded-full p-0.5 hover:text-red-500"
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
        <div className="relative flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 shadow-xs transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700/80 dark:bg-slate-800/90">
          <Sparkles className="mr-2.5 h-4 w-4 shrink-0 text-blue-500" />
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
            className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-sm dark:text-white"
          />

          <div className="ml-2 flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg p-1.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleToggleSpeech}
              className={`rounded-lg p-1.5 transition ${
                isListening
                  ? "animate-pulse bg-red-50 text-red-500 dark:bg-red-950"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={
                (!inputPrompt.trim() && attachedFiles.length === 0) ||
                loading
              }
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-40"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 fill-white" />
              )}
            </button>
          </div>
        </div>

        {/* Suggestion Chips (always visible at bottom when no messages) */}
        {messages.length === 0 && !loading && (
          <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto py-0.5 text-slate-600 dark:text-slate-300">
            {defaultSuggestedPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt.label)}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <span>{prompt.icon}</span>
                <span>{prompt.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Footnote */}
        <p className="text-center text-[10px] text-slate-400">
          AI assistant with NLP engine. Uses authenticated school data only.
        </p>
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
