/**
 * Enterprise Error Storage & Incident Aggregation Engine
 * Stores structured ErrorEvents and aggregates them into deterministic ErrorIncidents.
 * Circuit-breaker protected: Storage failure never breaks user workflows.
 */

import {
  ErrorEvent,
  ErrorIncident,
  IncidentStatus,
  ErrorSeverity,
  MonitoringStats,
  IncidentNote,
} from "./error-types";
import { getSafeAdminDb } from "@/lib/firebase/admin";

export const ERROR_INCIDENTS_COLLECTION = "error_incidents";
export const ERROR_EVENTS_COLLECTION = "error_events";

// In-memory fallback and circuit breaker
const inMemoryIncidents = new Map<string, ErrorIncident>();
const inMemoryEvents: ErrorEvent[] = [];
const MAX_IN_MEMORY_EVENTS = 150;

// Rate limiting for storage: max 120 writes per minute
let writeCounter = 0;
let lastResetWindow = Date.now();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_WRITES_PER_WINDOW = 120;

function checkStorageRateLimit(): boolean {
  const now = Date.now();
  if (now - lastResetWindow > RATE_LIMIT_WINDOW_MS) {
    writeCounter = 0;
    lastResetWindow = now;
  }
  if (writeCounter >= MAX_WRITES_PER_WINDOW) {
    return false;
  }
  writeCounter++;
  return true;
}

/**
 * Persists an ErrorEvent and aggregates it into its deterministic ErrorIncident.
 * Completely non-blocking and safe: Never throws errors outwards.
 */
export async function recordErrorEvent(
  event: ErrorEvent,
  title: string
): Promise<{ success: boolean; incidentId: string }> {
  const incidentId = event.fingerprint;

  // Update in-memory cache first for instant retrieval & circuit breaker
  let cachedIncident = inMemoryIncidents.get(incidentId);
  const nowIso = event.occurredAt || new Date().toISOString();

  if (!cachedIncident) {
    cachedIncident = {
      id: incidentId,
      fingerprint: incidentId,
      title,
      errorCode: event.errorCode,
      module: event.module,
      operation: event.operation,
      severity: event.severity,
      category: event.category,
      status: "new",
      occurrences: 1,
      affectedUsersCount: event.userId ? 1 : 0,
      affectedSchoolsCount: event.schoolId ? 1 : 0,
      affectedSchools: event.schoolId ? [event.schoolId] : [],
      affectedUserIds: event.userId ? [event.userId] : [],
      firstSeen: nowIso,
      lastSeen: nowIso,
      latestEventId: event.eventId,
      latestMessage: event.message,
      sanitizedRoute: event.sanitizedRoute,
      sampleEvents: [event],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    inMemoryIncidents.set(incidentId, cachedIncident);
  } else {
    cachedIncident.occurrences += 1;
    cachedIncident.lastSeen = nowIso;
    cachedIncident.latestEventId = event.eventId;
    cachedIncident.latestMessage = event.message;

    // Auto-reopen if new occurrence on resolved incident
    if (cachedIncident.status === "resolved") {
      cachedIncident.status = "reopened";
      cachedIncident.reopenReason = `Recurred automatically at ${nowIso}`;
    }

    if (event.schoolId && !cachedIncident.affectedSchools.includes(event.schoolId)) {
      cachedIncident.affectedSchools.push(event.schoolId);
      cachedIncident.affectedSchoolsCount = cachedIncident.affectedSchools.length;
    }
    if (event.userId) {
      cachedIncident.affectedUserIds = cachedIncident.affectedUserIds || [];
      if (!cachedIncident.affectedUserIds.includes(event.userId)) {
        cachedIncident.affectedUserIds.push(event.userId);
        cachedIncident.affectedUsersCount = cachedIncident.affectedUserIds.length;
      }
    }

    // Keep bounded latest 5 sample events
    cachedIncident.sampleEvents = [event, ...cachedIncident.sampleEvents.slice(0, 4)];
    cachedIncident.updatedAt = nowIso;
  }

  // Add to bounded in-memory event list
  inMemoryEvents.unshift(event);
  if (inMemoryEvents.length > MAX_IN_MEMORY_EVENTS) {
    inMemoryEvents.pop();
  }

  // Attempt Firestore persistence if rate limit permits and Admin DB is ready
  if (checkStorageRateLimit()) {
    try {
      const db = getSafeAdminDb();
      if (db) {
        // 1. Write the discrete ErrorEvent
        await db.collection(ERROR_EVENTS_COLLECTION).doc(event.eventId).set(event);

        // 2. Upsert the aggregated Incident record
        const incidentRef = db.collection(ERROR_INCIDENTS_COLLECTION).doc(incidentId);
        const docSnap = await incidentRef.get();

        if (!docSnap.exists) {
          await incidentRef.set(cachedIncident);
        } else {
          const existing = docSnap.data() as Partial<ErrorIncident>;
          const schools = Array.from(
            new Set([...(existing.affectedSchools || []), ...(event.schoolId ? [event.schoolId] : [])])
          );
          const users = Array.from(
            new Set([...(existing.affectedUserIds || []), ...(event.userId ? [event.userId] : [])])
          );

          const newStatus = existing.status === "resolved" ? "reopened" : existing.status || "new";

          await incidentRef.update({
            occurrences: (existing.occurrences || 0) + 1,
            lastSeen: nowIso,
            latestEventId: event.eventId,
            latestMessage: event.message,
            status: newStatus,
            affectedSchools: schools,
            affectedSchoolsCount: schools.length,
            affectedUserIds: users,
            affectedUsersCount: users.length,
            sampleEvents: [event, ...(existing.sampleEvents || []).slice(0, 4)],
            updatedAt: nowIso,
          });
        }
      }
    } catch (dbErr) {
      // Safe fallback: Log warning without crashing user request
      console.warn("[ErrorStorage] Notice: Failed to persist error incident to database:", dbErr);
    }
  }

  return { success: true, incidentId };
}

/**
 * Retrieves incidents with flexible filtering, search, and pagination.
 */
export async function getIncidents(options: {
  status?: IncidentStatus | "all";
  severity?: ErrorSeverity | "all";
  module?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ incidents: ErrorIncident[]; total: number }> {
  const limit = options.limit || 25;
  const offset = options.offset || 0;

  let list: ErrorIncident[] = [];

  // Try Firestore first
  try {
    const db = getSafeAdminDb();
    if (db) {
      let query: any = db.collection(ERROR_INCIDENTS_COLLECTION);

      if (options.status && options.status !== "all") {
        query = query.where("status", "==", options.status);
      }
      if (options.severity && options.severity !== "all") {
        query = query.where("severity", "==", options.severity);
      }

      // Order by lastSeen descending
      query = query.orderBy("lastSeen", "desc").limit(100);
      const snapshot = await query.get();

      list = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as ErrorIncident[];
    }
  } catch (err) {
    console.warn("[ErrorStorage] Notice: Firestore query notice, falling back to memory:", err);
  }

  // Fallback to in-memory incidents if database returned empty
  if (list.length === 0 && inMemoryIncidents.size > 0) {
    list = Array.from(inMemoryIncidents.values()).sort(
      (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );

    if (options.status && options.status !== "all") {
      list = list.filter((i) => i.status === options.status);
    }
    if (options.severity && options.severity !== "all") {
      list = list.filter((i) => i.severity === options.severity);
    }
  }

  // Client-side text search & module filter
  if (options.module && options.module !== "all") {
    list = list.filter((i) => (i.module || "").toLowerCase() === options.module?.toLowerCase());
  }

  if (options.search && options.search.trim()) {
    const term = options.search.toLowerCase().trim();
    list = list.filter(
      (i) =>
        i.title.toLowerCase().includes(term) ||
        i.errorCode.toLowerCase().includes(term) ||
        i.latestMessage.toLowerCase().includes(term) ||
        i.module.toLowerCase().includes(term) ||
        i.fingerprint.toLowerCase().includes(term)
    );
  }

  const total = list.length;
  const paginated = list.slice(offset, offset + limit);

  return { incidents: paginated, total };
}

/**
 * Retrieves a single incident by ID / fingerprint.
 */
export async function getIncidentById(id: string): Promise<ErrorIncident | null> {
  try {
    const db = getSafeAdminDb();
    if (db) {
      const snap = await db.collection(ERROR_INCIDENTS_COLLECTION).doc(id).get();
      if (snap.exists) {
        return { id: snap.id, ...snap.data() } as ErrorIncident;
      }
    }
  } catch (err) {
    console.warn("[ErrorStorage] Notice: Could not read incident from database:", err);
  }

  return inMemoryIncidents.get(id) || null;
}

/**
 * Updates an incident's lifecycle status, notes, or assigned administrator.
 */
export async function updateIncident(
  id: string,
  updates: {
    status?: IncidentStatus;
    assignedTo?: string;
    resolutionSummary?: string;
    resolvedBy?: string;
    noteText?: string;
    noteAuthor?: string;
  }
): Promise<boolean> {
  const nowIso = new Date().toISOString();

  // Update in-memory first
  const cached = inMemoryIncidents.get(id);
  if (cached) {
    if (updates.status) cached.status = updates.status;
    if (updates.assignedTo !== undefined) cached.assignedTo = updates.assignedTo;
    if (updates.resolutionSummary) cached.resolutionSummary = updates.resolutionSummary;
    if (updates.status === "resolved") {
      cached.resolvedAt = nowIso;
      cached.resolvedBy = updates.resolvedBy || "Super Admin";
    }
    if (updates.noteText && updates.noteAuthor) {
      cached.investigationNotes = cached.investigationNotes || [];
      cached.investigationNotes.push({
        id: `note_${Date.now()}`,
        author: updates.noteAuthor,
        text: updates.noteText,
        createdAt: nowIso,
      });
    }
    cached.updatedAt = nowIso;
  }

  // Update database
  try {
    const db = getSafeAdminDb();
    if (db) {
      const docRef = db.collection(ERROR_INCIDENTS_COLLECTION).doc(id);
      const patchData: Record<string, any> = { updatedAt: nowIso };

      if (updates.status) patchData.status = updates.status;
      if (updates.assignedTo !== undefined) patchData.assignedTo = updates.assignedTo;
      if (updates.resolutionSummary) patchData.resolutionSummary = updates.resolutionSummary;
      if (updates.status === "resolved") {
        patchData.resolvedAt = nowIso;
        patchData.resolvedBy = updates.resolvedBy || "Super Admin";
      }

      if (updates.noteText && updates.noteAuthor) {
        const snap = await docRef.get();
        const existingNotes: IncidentNote[] = snap.exists ? snap.data()?.investigationNotes || [] : [];
        existingNotes.push({
          id: `note_${Date.now()}`,
          author: updates.noteAuthor,
          text: updates.noteText,
          createdAt: nowIso,
        });
        patchData.investigationNotes = existingNotes;
      }

      await docRef.update(patchData);
      return true;
    }
  } catch (err) {
    console.warn("[ErrorStorage] Notice: Failed to update incident in database:", err);
  }

  return Boolean(cached);
}

/**
 * Calculates live dashboard telemetry metrics across all incidents.
 */
export async function getMonitoringStats(): Promise<MonitoringStats> {
  const { incidents } = await getIncidents({ limit: 1000 });

  const stats: MonitoringStats = {
    totalIncidents: incidents.length,
    openIncidents: 0,
    criticalIncidents: 0,
    affectedSchoolsCount: 0,
    affectedUsersCount: 0,
    totalOccurrences: 0,
    resolvedToday: 0,
    topModules: [],
    severityBreakdown: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    },
    statusBreakdown: {
      new: 0,
      investigating: 0,
      monitoring: 0,
      resolved: 0,
      reopened: 0,
    },
  };

  const allSchools = new Set<string>();
  const moduleCounts: Record<string, number> = {};
  const todayDateStr = new Date().toISOString().split("T")[0];

  for (const inc of incidents) {
    stats.totalOccurrences += inc.occurrences || 1;
    stats.affectedUsersCount += inc.affectedUsersCount || 0;

    if (inc.status !== "resolved") {
      stats.openIncidents += 1;
    } else if (inc.resolvedAt && inc.resolvedAt.startsWith(todayDateStr)) {
      stats.resolvedToday += 1;
    }

    if (inc.severity === "critical" && inc.status !== "resolved") {
      stats.criticalIncidents += 1;
    }

    if (stats.severityBreakdown[inc.severity] !== undefined) {
      stats.severityBreakdown[inc.severity] += 1;
    }
    if (stats.statusBreakdown[inc.status] !== undefined) {
      stats.statusBreakdown[inc.status] += 1;
    }

    (inc.affectedSchools || []).forEach((s) => allSchools.add(s));

    const mod = inc.module || "General";
    moduleCounts[mod] = (moduleCounts[mod] || 0) + (inc.occurrences || 1);
  }

  stats.affectedSchoolsCount = allSchools.size;
  stats.topModules = Object.entries(moduleCounts)
    .map(([module, count]) => ({ module, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return stats;
}
