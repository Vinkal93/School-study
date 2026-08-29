import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";

export interface DisputeRecord {
  id: string;
  schoolId: string;
  paymentId: string;
  razorpayDisputeId?: string;
  amount: number; // Integer PAISE
  currency: string;
  status: "OPEN" | "UNDER_REVIEW" | "WON" | "LOST" | "CLOSED";
  reason: string;
  createdAt: string;
  updatedAt?: string;
}

export async function getDisputesList(): Promise<DisputeRecord[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  const snap = await getDocs(collection(db, "disputes"));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DisputeRecord));
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}
