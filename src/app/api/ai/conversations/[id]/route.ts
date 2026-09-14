import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import type { AiMessage, AiConversation } from "@/types/ai";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;
    const { id: conversationId } = await context.params;

    const adminDb = getSafeAdminDb();
    let conv: AiConversation | null = null;
    let messages: AiMessage[] = [];

    if (adminDb) {
      const convDoc = await adminDb.collection("ai_conversations").doc(conversationId).get();
      if (!convDoc.exists) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      conv = { id: convDoc.id, ...convDoc.data() } as AiConversation;

      // Ownership & Tenant Guard
      if (conv.userId !== user.uid && user.role !== "super_admin") {
        return NextResponse.json({ error: "Access denied to this conversation." }, { status: 403 });
      }

      const msgSnap = await adminDb
        .collection("ai_messages")
        .where("conversationId", "==", conversationId)
        .limit(100)
        .get();

      messages = msgSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as AiMessage[];
    } else {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        const convDoc = await getDoc(doc(clientDb, "ai_conversations", conversationId));
        if (!convDoc.exists()) {
          return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }
        conv = { id: convDoc.id, ...convDoc.data() } as AiConversation;

        if (conv.userId !== user.uid && user.role !== "super_admin") {
          return NextResponse.json({ error: "Access denied to this conversation." }, { status: 403 });
        }

        const msgSnap = await getDocs(
          query(collection(clientDb, "ai_messages"), where("conversationId", "==", conversationId))
        );
        messages = msgSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as AiMessage[];
      }
    }

    // Sort chronologically
    messages.sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );

    return NextResponse.json({ conversation: conv, messages });
  } catch (error: any) {
    console.error("[API: AI Conversation ID GET]", error);
    return NextResponse.json(
      { error: "Failed to retrieve conversation", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;
    const { id: conversationId } = await context.params;

    const adminDb = getSafeAdminDb();
    if (adminDb) {
      const convDoc = await adminDb.collection("ai_conversations").doc(conversationId).get();
      if (!convDoc.exists) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      const data = convDoc.data();
      if (data?.userId !== user.uid && user.role !== "super_admin") {
        return NextResponse.json({ error: "Access denied." }, { status: 403 });
      }

      await adminDb.collection("ai_conversations").doc(conversationId).delete();

      // Delete associated messages
      const msgs = await adminDb
        .collection("ai_messages")
        .where("conversationId", "==", conversationId)
        .get();
      const batch = adminDb.batch();
      msgs.docs.forEach((doc: any) => batch.delete(doc.ref));
      await batch.commit().catch(() => {});
    } else {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        const convRef = doc(clientDb, "ai_conversations", conversationId);
        const convDoc = await getDoc(convRef);
        if (!convDoc.exists()) {
          return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }
        if (convDoc.data()?.userId !== user.uid && user.role !== "super_admin") {
          return NextResponse.json({ error: "Access denied." }, { status: 403 });
        }
        await deleteDoc(convRef);
      }
    }

    return NextResponse.json({ success: true, message: "Conversation deleted successfully" });
  } catch (error: any) {
    console.error("[API: AI Conversation DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete conversation", details: error.message },
      { status: 500 }
    );
  }
}
