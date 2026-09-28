"use client";

import { useState, useEffect, useCallback } from "react";
import type { SchoolCommunicationAccess, CommunicationTemplate, FeeAutomationRule, CommunicationLogEntry } from "@/types/communication";

export function useSchoolCommunication(schoolId?: string) {
  const [access, setAccess] = useState<SchoolCommunicationAccess | null>(null);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [rules, setRules] = useState<FeeAutomationRule[]>([]);
  const [recentLogs, setRecentLogs] = useState<CommunicationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/communication/status?schoolId=${encodeURIComponent(schoolId)}`);
      const data = await res.json();

      if (data.success) {
        setAccess(data.access);
        setTemplates(data.templates || []);
        setRules(data.rules || []);
        setRecentLogs(data.recentLogs || []);
        setError(null);
      } else {
        setError(data.error || "Failed to load communication permissions");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading communication data");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    access,
    templates,
    rules,
    recentLogs,
    loading,
    error,
    refresh: fetchStatus,
  };
}
