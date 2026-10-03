/** Shared fee repository: browser uses the signed-in SDK; authorized routes use Admin SDK. */
import * as client from "firebase/firestore";
import { getFirebaseDb as getClientDb } from "@/lib/firebase/client";

// Server initialization is performed only by requireFeeAccess after token verification.
let serverDb: any = null;
export function configureFeeServerDatabase(database: unknown) {
  if (typeof window !== "undefined") throw new Error("Server fee database cannot be configured in a browser.");
  serverDb = database;
}
export function getFirebaseDb(): client.Firestore {
  if (typeof window !== "undefined") return getClientDb();
  if (serverDb) return serverDb as client.Firestore;
  const fallback = getClientDb();
  if (fallback) return fallback;
  throw new Error("Fee server database is unavailable.");
}
const isServer = (value: any) => !!value && !value.type && (typeof value.collection === "function" || typeof value.get === "function" || typeof value.doc === "function");
const snapshot = (value: any) => ({ id: value.id, ref: value.ref, exists: () => value.exists, data: () => value.data() });
const wrap = <T,>(fn: unknown) => fn as T;
function clean(value: any): any {
  if (Array.isArray(value)) return value.map(item => item === undefined ? null : clean(item));
  if (value && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, clean(item)]));
  return value;
}

export const collection = wrap<typeof client.collection>((db: any, ...segments: string[]) => isServer(db) ? db.collection(segments.join("/")) : client.collection(db, ...segments as [string, ...string[]]));
export const doc = wrap<typeof client.doc>((db: any, ...segments: string[]) => isServer(db) ? db.doc(segments.join("/")) : client.doc(db, ...segments as [string, ...string[]]));
export const where = wrap<typeof client.where>((...args: any[]) => isServer(serverDb) && typeof window === "undefined" ? { kind: "where", args } : client.where(...args as Parameters<typeof client.where>));
export const orderBy = wrap<typeof client.orderBy>((...args: any[]) => isServer(serverDb) && typeof window === "undefined" ? { kind: "orderBy", args } : client.orderBy(...args as Parameters<typeof client.orderBy>));
export const limit = wrap<typeof client.limit>((...args: any[]) => isServer(serverDb) && typeof window === "undefined" ? { kind: "limit", args } : client.limit(...args as Parameters<typeof client.limit>));
export const query = wrap<typeof client.query>((ref: any, ...constraints: any[]) => isServer(ref) ? constraints.reduce((q, constraint) => q[constraint.kind](...constraint.args), ref) : client.query(ref, ...constraints));
export const getDoc = wrap<typeof client.getDoc>(async (ref: any) => isServer(ref) ? snapshot(await ref.get()) : client.getDoc(ref));
export const getDocs = wrap<typeof client.getDocs>(async (ref: any) => {
  if (!isServer(ref)) return client.getDocs(ref);
  const result = await ref.get();
  const docs = result.docs.map(snapshot);
  return { docs, size: result.size, empty: result.empty, forEach: (fn: (doc: unknown) => void) => docs.forEach(fn) };
});
export const setDoc = wrap<typeof client.setDoc>((ref: any, data: any, options?: any) => isServer(ref) ? options ? ref.set(clean(data), options) : ref.set(clean(data)) : options ? client.setDoc(ref, data, options) : client.setDoc(ref, data));
export const updateDoc = wrap<typeof client.updateDoc>((ref: any, ...args: any[]) => isServer(ref) ? ref.update(...args.map(clean)) : (client.updateDoc as any)(ref, ...args));
export const deleteDoc = wrap<typeof client.deleteDoc>((ref: any) => isServer(ref) ? ref.delete() : client.deleteDoc(ref));
export const writeBatch = wrap<typeof client.writeBatch>((db: any) => {
  if (!isServer(db)) return client.writeBatch(db);
  const batch = db.batch();
  const wrapped = {
    set: (ref: any, value: any, options?: any) => { options ? batch.set(ref, clean(value), options) : batch.set(ref, clean(value)); return wrapped; },
    update: (ref: any, value: any) => { batch.update(ref, clean(value)); return wrapped; },
    delete: (ref: any) => { batch.delete(ref); return wrapped; },
    commit: () => batch.commit(),
  };
  return wrapped;
});
export const runTransaction = wrap<typeof client.runTransaction>((db: any, fn: any, options?: any) => {
  if (!isServer(db)) return client.runTransaction(db, fn, options);
  return db.runTransaction((transaction: any) => fn({
    get: async (ref: any) => snapshot(await transaction.get(ref)),
    set: (ref: any, value: any, options?: any) => options ? transaction.set(ref, clean(value), options) : transaction.set(ref, clean(value)),
    update: (ref: any, value: any) => transaction.update(ref, clean(value)),
    delete: (ref: any) => transaction.delete(ref),
  }), options);
});
export const serverTimestamp = wrap<typeof client.serverTimestamp>(() => isServer(serverDb) && typeof window === "undefined" ? new Date() : client.serverTimestamp());
export const onSnapshot = client.onSnapshot;
export const Timestamp = client.Timestamp;
export type { Transaction } from "firebase/firestore";
