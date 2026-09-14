import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { canAccessAiFeature, mapRoleToAiPortal } from "@/lib/ai/entitlement";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs, addDoc, orderBy, limit } from "firebase/firestore";
import type { AiConversation } from "@/types/ai";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;
    const entitlement = await canAccessAiFeature({ user });
    if (!entitlement.allowed) {
      return NextResponse.json({ error: entitlement.reason }, { status: entitlement.status });
    }

    const adminDb = getSafeAdminDb();
    let conversations: AiConversation[] = [];

    if (adminDb) {
      const snap = await adminDb
        .collection("ai_conversations")
        .where("userId", "==", user.uid)
        .orderBy("updatedAt", "desc")
        .limit(50)
        .get()
        .catch(async () => {
          // Fallback if composite index not yet built: simple where query then in-memory sort
          return await adminDb.collection("ai_conversations").where("userId", "==", user.uid).limit(50).get();
        });

      conversations = snap.docs.map((d: any) => ({
        id: d.id,
        ...d.data(),
      })) as AiConversation[];
    } else {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        try {
          const q = query(
            collection(clientDb, "ai_conversations"),
            where("userId", "==", user.uid),
            limit(50)
          );
          const snap = await getDocs(q);
          conversations = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as AiConversation[];
        } catch (clientErr) {
          console.warn("[API: AI Conversations GET clientDb fallback error]", clientErr);
          conversations = [];
        }
      }
    }

    // Sort in memory just in case
    conversations.sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error("[API: AI Conversations GET]", error);
    return NextResponse.json(
      { error: "Failed to retrieve conversations", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;
    const entitlement = await canAccessAiFeature({ user });
    if (!entitlement.allowed) {
      return NextResponse.json({ error: entitlement.reason }, { status: entitlement.status });
    }

    const body = await req.json().catch(() => ({}));
    const title = (body.title || "New Conversation").slice(0, 100);
    const portal = body.portal || mapRoleToAiPortal(user.role);

    const now = new Date().toISOString();
    const newConv: Omit<AiConversation, "id"> = {
      userId: user.uid,
      instituteId: user.schoolId || "",
      portal,
      title,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };

    let convId = "";
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      const ref = await adminDb.collection("ai_conversations").add(newConv);
      convId = ref.id;
    } else {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        try {
          const ref = await addDoc(collection(clientDb, "ai_conversations"), newConv);
          convId = ref.id;
        } catch (clientErr) {
          console.warn("[API: AI Conversations POST clientDb error, using local id]", clientErr);
          convId = `conv_${Date.now()}`;
        }
      } else {
        convId = `conv_${Date.now()}`;
      }
    }

    return NextResponse.json({
      conversation: {
        id: convId,
        ...newConv,
      },
    });
  } catch (error: any) {
    console.error("[API: AI Conversations POST]", error);
    return NextResponse.json(
      { error: "Failed to create conversation", details: error.message },
      { status: 500 }
    );
  }
}
