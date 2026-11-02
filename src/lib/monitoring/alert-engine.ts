/**
 * Enterprise Alerting Engine & Incident Trigger
 * Evaluates error frequencies against alert rules with cooldowns to prevent notification storms.
 */

import { ErrorEvent, AlertRule, ErrorIncident } from "./error-types";
import { getSafeAdminDb } from "@/lib/firebase/admin";

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: "rule_critical_outage",
    name: "Critical System Outage",
    description: "Triggers on any critical severity incident (e.g. database drop, auth outage).",
    condition: "critical_error",
    threshold: 1,
    timeWindowMinutes: 5,
    severity: "critical",
    enabled: true,
    cooldownMinutes: 15,
    notificationChannels: ["in_app_banner", "super_admin_log"],
  },
  {
    id: "rule_registration_failure",
    name: "Repeated School Registration Failures",
    description: "Triggers when 3 or more school registrations fail within 15 minutes.",
    condition: "frequency",
    threshold: 3,
    timeWindowMinutes: 15,
    severity: "high",
    enabled: true,
    cooldownMinutes: 30,
    notificationChannels: ["in_app_banner", "super_admin_log"],
  },
  {
    id: "rule_payment_spikes",
    name: "Elevated Payment Gateway Failures",
    description: "Triggers when 5 or more billing or payment orders fail within 10 minutes.",
    condition: "rate_surge",
    threshold: 5,
    timeWindowMinutes: 10,
    severity: "high",
    enabled: true,
    cooldownMinutes: 20,
    notificationChannels: ["in_app_banner", "super_admin_log"],
  },
];

// In-memory cooldown tracking: ruleId:fingerprint -> lastTriggeredTime
const alertCooldownMap = new Map<string, number>();

/**
 * Checks if an event triggers any active alert rules and dispatches notifications safely.
 */
export async function evaluateAlerts(
  event: ErrorEvent,
  incident: Partial<ErrorIncident>
): Promise<{ triggered: boolean; ruleNames: string[] }> {
  const triggeredRules: string[] = [];
  const now = Date.now();

  for (const rule of DEFAULT_ALERT_RULES) {
    if (!rule.enabled) continue;

    const cooldownKey = `${rule.id}:${event.fingerprint}`;
    const lastTriggered = alertCooldownMap.get(cooldownKey) || 0;
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;

    if (now - lastTriggered < cooldownMs) {
      continue; // In cooldown, skip notification storm
    }

    let match = false;

    // Rule 1: Critical Error
    if (rule.condition === "critical_error" && event.severity === "critical") {
      match = true;
    }

    // Rule 2: Registration Failures
    if (
      rule.id === "rule_registration_failure" &&
      event.module === "registration" &&
      (incident.occurrences || 1) >= rule.threshold
    ) {
      match = true;
    }

    // Rule 3: Payment Surges
    if (
      rule.id === "rule_payment_spikes" &&
      (event.module === "billing" || event.module === "payment") &&
      (incident.occurrences || 1) >= rule.threshold
    ) {
      match = true;
    }

    if (match) {
      triggeredRules.push(rule.name);
      alertCooldownMap.set(cooldownKey, now);

      // Dispatch alert to Super Admin in-app announcements / alerts collection
      try {
        const db = getSafeAdminDb();
        if (db) {
          await db.collection("super_admin_alerts").add({
            ruleId: rule.id,
            ruleName: rule.name,
            fingerprint: event.fingerprint,
            errorCode: event.errorCode,
            message: event.message,
            severity: event.severity,
            module: event.module,
            referenceCode: event.referenceCode,
            occurrences: incident.occurrences || 1,
            triggeredAt: new Date().toISOString(),
            status: "active",
          });
        }
      } catch (err) {
        console.warn("[AlertEngine] Notice: Failed to persist admin alert:", err);
      }
    }
  }

  return {
    triggered: triggeredRules.length > 0,
    ruleNames: triggeredRules,
  };
}
