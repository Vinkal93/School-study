/**
 * Centralized Configuration Hub
 * Part of Phase 2: Centralized Configuration System
 */

export * from "./schema";
export * from "./public";

// Server config is dynamically exported to prevent client build bundling crashes
export async function loadServerConfig() {
  if (typeof window !== "undefined") {
    throw new Error("loadServerConfig cannot be called from the client");
  }
  const { getServerConfig, validateServerConfig, getServerConfigHealth } = await import("./server");
  return { getServerConfig, validateServerConfig, getServerConfigHealth };
}
