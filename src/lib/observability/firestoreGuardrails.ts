/**
 * SCHOOL STUDY — ZERO-WASTE FIRESTORE GUARDRAILS & OBSERVABILITY ENGINE 3.0
 * 
 * Invariant: Never write a Firestore document to track a Firestore read/write!
 * Telemetry is tracked entirely in-memory with sliding-window bounding, zero write amplification,
 * and zero PII/credential exposure.
 */

export interface FirestoreOperationMetric {
  feature: string;
  type: "read" | "write" | "delete" | "listener" | "aggregation";
  target: string;
  count: number;
  lastExecutedAt: number;
}

export interface GuardrailWarning {
  id: string;
  type: "WRITE_BURST" | "DUPLICATE_QUERY" | "LISTENER_STORM" | "QUOTA_EXHAUSTED" | "SUSPICIOUS_WRITE_LOOP";
  feature: string;
  message: string;
  timestamp: number;
  count: number;
}

export interface FirestoreGuardrailSummary {
  totalReads: number;
  totalWrites: number;
  totalDeletes: number;
  totalAggregations: number;
  activeListeners: number;
  quotaErrors: number;
  peakWriteRatePerMin: number;
  operationsByFeature: Record<string, { reads: number; writes: number; deletes: number }>;
  warnings: GuardrailWarning[];
  sessionStartedAt: number;
  lastActivityAt: number;
}

class FirestoreGuardrailTracker {
  private reads = 0;
  private writes = 0;
  private deletes = 0;
  private aggregations = 0;
  private listeners = 0;
  private quotaErrors = 0;
  private sessionStartedAt = Date.now();
  private lastActivityAt = Date.now();

  // Sliding 60s windows for rate computation
  private recentWriteTimestamps: number[] = [];
  private recentQueryFingerprints = new Map<string, number[]>();
  private featureCounts = new Map<string, { reads: number; writes: number; deletes: number }>();
  private warnings: GuardrailWarning[] = [];
  private readonly MAX_WARNINGS = 50;

  /**
   * Records a read operation with zero database write amplification.
   */
  recordRead(feature: string, targetCollection: string, documentCount: number = 1): void {
    const count = Math.max(1, documentCount);
    this.reads += count;
    this.lastActivityAt = Date.now();

    const feat = this.getFeatureBucket(feature);
    feat.reads += count;

    // Detect duplicate query storms (same query executed > 3 times in 10s)
    this.detectDuplicateQuery(feature, targetCollection);
  }

  /**
   * Records a write operation and checks for runaway write loops / bursts.
   */
  recordWrite(feature: string, targetCollection: string, documentCount: number = 1): void {
    const count = Math.max(1, documentCount);
    this.writes += count;
    const now = Date.now();
    this.lastActivityAt = now;

    const feat = this.getFeatureBucket(feature);
    feat.writes += count;

    // Slide window (keep last 60 seconds)
    this.recentWriteTimestamps.push(now);
    const windowStart = now - 60_000;
    while (this.recentWriteTimestamps.length > 0 && this.recentWriteTimestamps[0] < windowStart) {
      this.recentWriteTimestamps.shift();
    }

    // Guardrail: Alert if > 12 writes occur within 60s in the same client session
    if (this.recentWriteTimestamps.length >= 12) {
      this.addWarning({
        id: `burst_${feature}_${Math.floor(now / 10000)}`,
        type: "WRITE_BURST",
        feature,
        message: `High write frequency detected: ${this.recentWriteTimestamps.length} writes in the last 60 seconds in module "${feature}".`,
        timestamp: now,
        count: this.recentWriteTimestamps.length,
      });
    }

    // Guardrail: Alert if a single feature exceeds 20 writes in the session without user mutation
    if (feat.writes > 25) {
      this.addWarning({
        id: `loop_${feature}`,
        type: "SUSPICIOUS_WRITE_LOOP",
        feature,
        message: `Potential write loop: Feature "${feature}" has performed ${feat.writes} writes in this session.`,
        timestamp: now,
        count: feat.writes,
      });
    }
  }

  /**
   * Records a delete operation.
   */
  recordDelete(feature: string, _targetCollection: string, documentCount: number = 1): void {
    const count = Math.max(1, documentCount);
    this.deletes += count;
    this.lastActivityAt = Date.now();
    const feat = this.getFeatureBucket(feature);
    feat.deletes += count;
  }

  /**
   * Records a fast count or aggregation query.
   */
  recordAggregation(feature: string): void {
    this.aggregations += 1;
    this.lastActivityAt = Date.now();
    const feat = this.getFeatureBucket(feature);
    feat.reads += 1;
  }

  /**
   * Tracks active realtime subscription lifecycle.
   */
  recordListenerSubscribed(feature: string): void {
    this.listeners += 1;
    if (this.listeners > 8) {
      this.addWarning({
        id: `listener_storm_${this.listeners}`,
        type: "LISTENER_STORM",
        feature,
        message: `Elevated concurrent realtime subscriptions: ${this.listeners} active listeners. Ensure shared multiplexing is active.`,
        timestamp: Date.now(),
        count: this.listeners,
      });
    }
  }

  recordListenerUnsubscribed(): void {
    this.listeners = Math.max(0, this.listeners - 1);
  }

  /**
   * Records a 429 or quota exceeded error.
   */
  recordQuotaExceeded(feature: string, details?: string): void {
    this.quotaErrors += 1;
    this.addWarning({
      id: `quota_${Date.now()}`,
      type: "QUOTA_EXHAUSTED",
      feature,
      message: `Firestore 429 RESOURCE_EXHAUSTED encountered: ${details || "Quota limit reached"}. Backoff active.`,
      timestamp: Date.now(),
      count: this.quotaErrors,
    });
  }

  private detectDuplicateQuery(feature: string, targetCollection: string): void {
    const now = Date.now();
    const key = `${feature}:${targetCollection}`;
    let history = this.recentQueryFingerprints.get(key);
    if (!history) {
      history = [];
      this.recentQueryFingerprints.set(key, history);
    }

    history.push(now);
    const tenSecAgo = now - 10_000;
    while (history.length > 0 && history[0] < tenSecAgo) {
      history.shift();
    }

    if (history.length >= 4) {
      this.addWarning({
        id: `dup_${key}_${Math.floor(now / 5000)}`,
        type: "DUPLICATE_QUERY",
        feature,
        message: `Repeated query detected on "${targetCollection}" (${history.length} executions in 10s). Verify SWR cache key.`,
        timestamp: now,
        count: history.length,
      });
    }
  }

  private getFeatureBucket(feature: string) {
    let f = this.featureCounts.get(feature);
    if (!f) {
      f = { reads: 0, writes: 0, deletes: 0 };
      this.featureCounts.set(feature, f);
    }
    return f;
  }

  private addWarning(w: GuardrailWarning): void {
    // Avoid spamming duplicate warnings with identical id
    if (this.warnings.some((existing) => existing.id === w.id)) return;
    this.warnings.unshift(w);
    if (this.warnings.length > this.MAX_WARNINGS) {
      this.warnings.pop();
    }
  }

  /**
   * Returns a sanitized diagnostic snapshot without PII.
   */
  getSummary(): FirestoreGuardrailSummary {
    const opsByFeature: Record<string, { reads: number; writes: number; deletes: number }> = {};
    this.featureCounts.forEach((val, key) => {
      opsByFeature[key] = { ...val };
    });

    const now = Date.now();
    const windowStart = now - 60_000;
    const peakRate = this.recentWriteTimestamps.filter((t) => t >= windowStart).length;

    return {
      totalReads: this.reads,
      totalWrites: this.writes,
      totalDeletes: this.deletes,
      totalAggregations: this.aggregations,
      activeListeners: this.listeners,
      quotaErrors: this.quotaErrors,
      peakWriteRatePerMin: peakRate,
      operationsByFeature: opsByFeature,
      warnings: [...this.warnings],
      sessionStartedAt: this.sessionStartedAt,
      lastActivityAt: this.lastActivityAt,
    };
  }

  reset(): void {
    this.reads = 0;
    this.writes = 0;
    this.deletes = 0;
    this.aggregations = 0;
    this.listeners = 0;
    this.quotaErrors = 0;
    this.recentWriteTimestamps = [];
    this.recentQueryFingerprints.clear();
    this.featureCounts.clear();
    this.warnings = [];
    this.sessionStartedAt = Date.now();
    this.lastActivityAt = Date.now();
  }
}

export const firestoreGuardrails = new FirestoreGuardrailTracker();
