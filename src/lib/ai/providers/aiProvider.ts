import type { AiPortalType, AiMessage } from "@/types/ai";

export interface GenerateAiResponseParams {
  portal: AiPortalType;
  systemPrompt: string;
  userPrompt: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  contextData: any;
  model?: string;
  maxTokens?: number;
  toolCall?: {
    tool: string;
    params: Record<string, any>;
  };
  authHeaders?: Record<string, string>;
  toolResult?: any;
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
  toolResult?: any;
}

/**
 * Universal AI Provider Engine.
 *
 * 1. If a toolCall is present, executes it via /api/ai/tools and synthesizes response from real data.
 * 2. If GEMINI_API_KEY is available and no tool call, uses Google Gemini.
 * 3. If OPENAI_API_KEY is available and no tool call, uses OpenAI-compatible endpoint.
 * 4. Fallback: Context Intelligence Engine analyzing real Firestore metrics without external dependency.
 */
export async function generateAiResponse(
  params: GenerateAiResponseParams
): Promise<GenerateAiResponseResult> {
  // 1. If a tool call is specified, execute it directly from real data
  if (params.toolCall) {
    try {
      const result = await executeAiTool(params.toolCall, params.authHeaders);
      if (result) {
        // Synthesize a natural-language response from the real tool data
        const response = synthesizeResponseFromToolData(
          params.portal,
          params.userPrompt,
          params.contextData,
          result
        );
        return {
          content: response.content,
          model: "ai-tools-v1",
          promptTokens: 150,
          completionTokens: response.content.length / 4,
          totalTokens: 150 + response.content.length / 4,
          quickLinks: response.quickLinks,
          suggestedFollowUps: response.suggestedFollowUps,
          metrics: response.metrics,
          toolResult: result.data,
        };
      }
    } catch (err: any) {
      console.warn("[AI Provider] Tool execution failed:", err.message);
      // Fall through to LLM or NLP fallback
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // 2. Google Gemini Provider
  if (geminiKey) {
    try {
      const result = await callGeminiApi(geminiKey, params);
      if (result) return result;
    } catch (err: any) {
      console.warn("[AI Provider] Gemini call failed, trying fallback:", err.message);
    }
  }

  // 3. OpenAI / Compatible Provider
  if (openaiKey) {
    try {
      const result = await callOpenAiApi(openaiKey, params);
      if (result) return result;
    } catch (err: any) {
      console.warn("[AI Provider] OpenAI call failed, trying fallback:", err.message);
    }
  }

  // 4. Resilient Context Intelligence Engine (Real data analytical synthesizer)
  return generateContextualAnalyticalResponse(params);
}

/**
 * Executes a structured AI tool call against the backend /api/ai/tools endpoint.
 * This ensures all Firestore queries happen server-side with proper auth/tenant isolation.
 */
async function executeAiTool(
  toolCall: { tool: string; params: Record<string, any> },
  authHeaders?: Record<string, string>
): Promise<{ data: any } | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/ai/tools`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      tool: toolCall.tool,
      params: toolCall.params,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.error || errData.details || `Tool ${toolCall.tool} failed with status ${res.status}`
    );
  }

  const data = await res.json();
  return data;
}

// Import the synthesis function from nlpEngine
import { synthesizeResponseFromToolData } from "@/lib/ai/nlp/nlpEngine";

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

  // If we have tool result data, include it in the prompt for context-aware generation
  let systemPrompt = params.systemPrompt;
  if (params.toolResult) {
    systemPrompt += `\n\nREAL DATA FROM DATABASE TOOL:\n${JSON.stringify(params.toolResult, null, 2)}\n\nUse this real data to answer the user's question. Do not fabricate or hallucinate values.`;
  }

  contents.push({
    role: "user",
    parts: [{ text: params.userPrompt }],
  });

  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
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
  let systemPrompt = params.systemPrompt;
  if (params.toolResult) {
    systemPrompt += `\n\nREAL DATA FROM DATABASE TOOL:\n${JSON.stringify(params.toolResult, null, 2)}\n\nUse this real data to answer the user's question. Do not fabricate or hallucinate values.`;
  }

  const messages = [
    { role: "system", content: systemPrompt },
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

/**
 * Deterministic Context Intelligence Engine powered by NLP.
 * Analyzes authorized real-time Firestore context to answer questions factually with full markdown formatting.
 * This is the fallback that uses the NLP synthesis engine with real data.
 */
function generateContextualAnalyticalResponse(
  params: GenerateAiResponseParams
): GenerateAiResponseResult {
  const { portal, userPrompt, contextData } = params;
  const nlpOutput = synthesizeResponseFromToolData(
    portal,
    userPrompt,
    contextData,
    params.toolResult || contextData
  );

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
        "Which students have overdue fees?",
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
      return ["Explain this data", "Show relevant reports"];
  }
}
