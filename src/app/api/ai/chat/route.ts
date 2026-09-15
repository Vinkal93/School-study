import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { canAccessAiFeature, mapRoleToAiPortal } from "@/lib/ai/entitlement";
import { buildAiContext } from "@/lib/ai/context/contextBuilder";
import { getSystemPromptForPortal } from "@/lib/ai/prompts/systemPrompts";
import { generateAiResponse } from "@/lib/ai/providers/aiProvider";
import { recordAiUsage, getMonthlyAiUsageCount } from "@/lib/ai/usage/usageTracker";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, addDoc, doc, updateDoc, getDocs, query, where, limit } from "firebase/firestore";
import type { AiMessage, AiConversation } from "@/types/ai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate caller
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;
    const portal = mapRoleToAiPortal(user.role);

    // 2. Authoritative 5-tier Entitlement Check
    const entitlement = await canAccessAiFeature({ user });
    if (!entitlement.allowed) {
      return NextResponse.json(
        { error: entitlement.reason || "AI Mode is not enabled for your account." },
        { status: entitlement.status || 403 }
      );
    }

    // 3. Quota check
    if (entitlement.quotaTotal !== -1) {
      const usedThisMonth = user.schoolId
        ? await getMonthlyAiUsageCount({ instituteId: user.schoolId })
        : await getMonthlyAiUsageCount({ userId: user.uid });

      if (usedThisMonth >= (entitlement.quotaTotal || 20)) {
        return NextResponse.json(
          {
            error:
              "Monthly AI message limit reached for your current plan. Please contact your administrator or upgrade your subscription for higher limits.",
            code: "QUOTA_EXCEEDED",
          },
          { status: 429 }
        );
      }
    }

    // 4. Parse request payload
    const body = await req.json().catch(() => ({}));
    const userPrompt = (body.prompt || body.message || "").trim();
    let conversationId = body.conversationId;

    if (!userPrompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();

    // 5. Create or verify conversation
    if (!conversationId) {
      const title = userPrompt.slice(0, 45) + (userPrompt.length > 45 ? "..." : "");
      const newConvData: Omit<AiConversation, "id"> = {
        userId: user.uid,
        instituteId: user.schoolId || "",
        portal,
        title,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
      };

      try {
        if (adminDb) {
          const ref = await adminDb.collection("ai_conversations").add(newConvData);
          conversationId = ref.id;
        } else if (clientDb) {
          const ref = await addDoc(collection(clientDb, "ai_conversations"), newConvData);
          conversationId = ref.id;
        }
      } catch (convErr) {
        console.warn("[API: AI Chat] Could not persist new conversation to Firestore:", convErr);
        conversationId = `conv_${Date.now()}`;
      }
    }

    // 6. Fetch recent conversation history for multi-turn reasoning
    const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
    try {
      if (adminDb) {
        const historySnap = await adminDb
          .collection("ai_messages")
          .where("conversationId", "==", conversationId)
          .limit(6)
          .get();
        historySnap.docs.forEach((d: any) => {
          const m = d.data();
          if (m.role === "user" || m.role === "assistant") {
            conversationHistory.push({ role: m.role, content: m.content });
          }
        });
      }
    } catch (hErr) {
      console.warn("[API: AI Chat] Could not load conversation history:", hErr);
    }

    // 7. Securely assemble live, role-scoped school context
    let contextData = {};
    try {
      contextData = await buildAiContext(user, portal);
    } catch (cErr) {
      console.warn("[API: AI Chat] buildAiContext warning:", cErr);
    }
    const systemPrompt = getSystemPromptForPortal(portal, contextData);

    // 8. Generate AI response (Gemini -> OpenAI -> Context Intelligence fallback)
    const aiResult = await generateAiResponse({
      portal,
      systemPrompt,
      userPrompt,
      conversationHistory,
      contextData,
      model: body.model,
    });

    // 9. Persist User Message
    const userMsg: Omit<AiMessage, "id"> = {
      conversationId: conversationId || `conv_${Date.now()}`,
      role: "user",
      content: userPrompt,
      createdAt: now,
    };

    // 10. Persist Assistant Message
    const assistantMsg: Omit<AiMessage, "id"> = {
      conversationId: conversationId || `conv_${Date.now()}`,
      role: "assistant",
      content: aiResult.content,
      createdAt: new Date().toISOString(),
      metadata: {
        modelUsed: aiResult.model,
        tokensUsed: aiResult.totalTokens,
        quickLinks: aiResult.quickLinks,
        suggestedFollowUps: aiResult.suggestedFollowUps,
        metrics: aiResult.metrics,
      },
    };

    let userMsgId = `temp_u_${Date.now()}`;
    let assistantMsgId = `temp_a_${Date.now()}`;

    try {
      if (adminDb) {
        const uRef = await adminDb.collection("ai_messages").add(userMsg);
        const aRef = await adminDb.collection("ai_messages").add(assistantMsg);
        userMsgId = uRef.id;
        assistantMsgId = aRef.id;

        // Update conversation timestamp & preview
        await adminDb
          .collection("ai_conversations")
          .doc(conversationId)
          .set(
            {
              updatedAt: new Date().toISOString(),
              lastMessagePreview: aiResult.content.slice(0, 100),
            },
            { merge: true }
          );
      } else if (clientDb) {
        const uRef = await addDoc(collection(clientDb, "ai_messages"), userMsg);
        const aRef = await addDoc(collection(clientDb, "ai_messages"), assistantMsg);
        userMsgId = uRef.id;
        assistantMsgId = aRef.id;

        await updateDoc(doc(clientDb, "ai_conversations", conversationId), {
          updatedAt: new Date().toISOString(),
          lastMessagePreview: aiResult.content.slice(0, 100),
        }).catch(() => {});
      }
    } catch (msgPersistErr) {
      console.warn("[API: AI Chat] Could not persist messages to Firestore:", msgPersistErr);
    }

    // 11. Record Usage
    recordAiUsage({
      userId: user.uid,
      instituteId: user.schoolId || "",
      portal,
      planId: entitlement.planId || "free",
      conversationId,
      promptTokens: aiResult.promptTokens,
      completionTokens: aiResult.completionTokens,
      totalTokens: aiResult.totalTokens,
      status: "SUCCESS",
      model: aiResult.model,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return NextResponse.json({
      conversationId,
      message: assistantMsg.content,
      messageId: assistantMsgId,
      metadata: assistantMsg.metadata,
      userMessage: { id: userMsgId, ...userMsg },
      assistantMessage: { id: assistantMsgId, ...assistantMsg },
    });
  } catch (error: any) {
    console.error("[API: AI Chat Error]", error);
    return NextResponse.json(
      {
        error: "AI is temporarily unavailable. Your school data is safe. Please try again.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
