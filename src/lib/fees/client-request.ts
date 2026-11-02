import { getFirebaseAuth } from "@/lib/firebase/client";

/** Fee endpoints require a verified token, including when the browser has no auth cookie. */
export async function feeFetch(input: RequestInfo | URL, init?: RequestInit) {
  const user = getFirebaseAuth().currentUser;
  const headers = new Headers(init?.headers);
  if (user) headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  return fetch(input, { ...init, headers, cache: "no-store" });
}
