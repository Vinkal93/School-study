import { getSafeAdminAuth, getSafeAdminDb } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export async function requireBillingActor(request: Request) {
  const db = getSafeAdminDb(), auth = getSafeAdminAuth();
  if (!db || !auth) return { error: NextResponse.json({ error: "Private Firebase Admin configuration is required." }, { status: 503 }) };
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return { error: NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 }) };
  let uid: string;
  try { uid = (await auth.verifyIdToken(token, true)).uid; }
  catch { return { error: NextResponse.json({ error: "Invalid session." }, { status: 401 }) }; }
  const snap = await db.collection("users").doc(uid).get();
  const user = snap.data();
  if (!snap.exists || !user || !["school_admin", "admin", "super_admin"].includes(user.role) || user.status !== "active" || user.forceLogout || user.requireReLogin) {
    return { error: NextResponse.json({ error: "Billing access denied." }, { status: 403 }) };
  }
  return { db, user: { ...user, uid, role: String(user.role), schoolId: String(user.schoolId || "") } };
}

export function ownsBillingSchool(user: { role?: string; schoolId?: string }, schoolId: string) {
  return user.role === "super_admin" || user.schoolId === schoolId;
}
