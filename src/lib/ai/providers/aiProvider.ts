import type { AiPortalType } from "@/types/ai";

export interface GenerateAiResponseParams {
  portal: AiPortalType;
  systemPrompt: string;
  userPrompt: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  contextData: any;
  model?: string;
  maxTokens?: number;
}

export interface GenerateAiResponseResult {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  quickLinks?: Array<{ label: string; href: string }>;
  suggestedFollowUps?: string[];
  metrics?: Record<string, string | number>;
}

/**
 * Universal AI Provider Engine.
 *
 * 1. If GEMINI_API_KEY is available, uses Google Gemini.
 * 2. If OPENAI_API_KEY is available, uses OpenAI-compatible endpoint.
 * 3. Fallback: Context Intelligence Engine analyzing real Firestore metrics without external dependency.
 */
export async function generateAiResponse(
  params: GenerateAiResponseParams
): Promise<GenerateAiResponseResult> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // 1. Google Gemini Provider
  if (geminiKey) {
    try {
      const result = await callGeminiApi(geminiKey, params);
      if (result) return result;
    } catch (err: any) {
      console.warn("[AI Provider] Gemini call failed, trying fallback:", err.message);
    }
  }

  // 2. OpenAI / Compatible Provider
  if (openaiKey) {
    try {
      const result = await callOpenAiApi(openaiKey, params);
      if (result) return result;
    } catch (err: any) {
      console.warn("[AI Provider] OpenAI call failed, trying fallback:", err.message);
    }
  }

  // 3. Resilient Context Intelligence Engine (Real data analytical synthesizer)
  return generateContextualAnalyticalResponse(params);
}

/**
 * Google Gemini API Client using standard fetch.
 */
async function callGeminiApi(
  apiKey: string,
  params: GenerateAiResponseParams
): Promise<GenerateAiResponseResult | null> {
  const model = params.model || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents: any[] = [];
  if (params.conversationHistory && params.conversationHistory.length > 0) {
    params.conversationHistory.slice(-6).forEach((msg) => {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: params.userPrompt }],
  });

  const body = {
    systemInstruction: {
      parts: [{ text: params.systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: params.maxTokens || 1024,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Gemini API returned status ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  return {
    content: text,
    model,
    promptTokens: data?.usageMetadata?.promptTokenCount || 250,
    completionTokens: data?.usageMetadata?.candidatesTokenCount || 150,
    totalTokens: data?.usageMetadata?.totalTokenCount || 400,
    quickLinks: extractContextLinks(params.portal),
    suggestedFollowUps: generateFollowUps(params.portal, params.userPrompt),
  };
}

/**
 * OpenAI / Compatible Client using standard fetch.
 */
async function callOpenAiApi(
  apiKey: string,
  params: GenerateAiResponseParams
): Promise<GenerateAiResponseResult | null> {
  const model = params.model || "gpt-4o-mini";
  const messages = [
    { role: "system", content: params.systemPrompt },
    ...(params.conversationHistory || []).slice(-6),
    { role: "user", content: params.userPrompt },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: params.maxTokens || 1024,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API returned status ${res.status}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) return null;

  return {
    content: text,
    model,
    promptTokens: data?.usage?.prompt_tokens || 200,
    completionTokens: data?.usage?.completion_tokens || 100,
    totalTokens: data?.usage?.total_tokens || 300,
    quickLinks: extractContextLinks(params.portal),
    suggestedFollowUps: generateFollowUps(params.portal, params.userPrompt),
  };
}

import { synthesizeRichNlpResponse } from "@/lib/ai/nlp/nlpEngine";

/**
 * Deterministic Context Intelligence Engine powered by NLP compromise.
 * Analyzes authorized real-time Firestore context to answer questions factually with full markdown formatting.
 */
function generateContextualAnalyticalResponse(
  params: GenerateAiResponseParams
): GenerateAiResponseResult {
  const { portal, userPrompt, contextData } = params;
  const nlpOutput = synthesizeRichNlpResponse({
    portal,
    userPrompt,
    contextData,
  });

  return {
    content: nlpOutput.content,
    model: "compromise-nlp-v2",
    promptTokens: 150,
    completionTokens: 250,
    totalTokens: 400,
    quickLinks: nlpOutput.quickLinks,
    suggestedFollowUps: nlpOutput.suggestedFollowUps,
    metrics: nlpOutput.metrics,
  };
}

function extractContextLinks(portal: AiPortalType): Array<{ label: string; href: string }> {
  switch (portal) {
    case "school_admin":
      return [
        { label: "Fee Reports", href: "/admin/fees/reports" },
        { label: "Attendance", href: "/admin/attendance" },
        { label: "Students", href: "/admin/students" },
      ];
    case "teacher":
      return [
        { label: "Attendance", href: "/teacher/attendance" },
        { label: "Homework", href: "/teacher/homework" },
        { label: "Timetable", href: "/teacher/timetable" },
      ];
    case "student":
      return [
        { label: "My Attendance", href: "/student/attendance" },
        { label: "Homework", href: "/student/homework" },
        { label: "Fee Receipts", href: "/student/fees" },
      ];
    default:
      return [];
  }
}

function generateFollowUps(portal: AiPortalType, _lastQuery: string): string[] {
  switch (portal) {
    case "school_admin":
      return [
        "What is today's school summary?",
        "Show pending fees and defaulters",
        "Which classes have lowest attendance?",
      ];
    case "teacher":
      return [
        "Show my timetable for today",
        "Which homework assignments are active?",
        "Summarize my class attendance",
      ];
    case "student":
      return [
        "What is my attendance percentage?",
        "Do I have any homework due this week?",
        "Check my pending fee balance",
      ];
    default:
      return ["Explain this metric", "Show relevant reports"];
  }
}
