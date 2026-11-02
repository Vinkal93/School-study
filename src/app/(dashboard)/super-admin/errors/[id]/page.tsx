"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Building2,
  Users,
  Copy,
  Check,
  Send,
  Loader2,
  ShieldCheck,
  Terminal,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { ErrorIncident, IncidentStatus, ErrorSeverity } from "@/lib/monitoring/error-types";

export default function SuperAdminIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const incidentId = resolvedParams.id;

  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [incident, setIncident] = useState<ErrorIncident | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);

  // New Note state
  const [noteText, setNoteText] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");

  const fetchIncident = async () => {
    try {
      const res = await fetch(`/api/super-admin/errors/${incidentId}`);
      if (res.ok) {
        const data = await res.json();
        setIncident(data.incident);
        if (data.incident?.resolutionSummary) {
          setResolutionSummary(data.incident.resolutionSummary);
        }
      }
    } catch (err) {
      console.error("Failed to load incident detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.role !== "super_admin") {
      router.replace("/login");
      return;
    }
    fetchIncident();
  }, [authLoading, profile, router, incidentId]);

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/super-admin/errors/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          resolutionSummary: newStatus === "resolved" ? resolutionSummary : undefined,
          resolvedBy: newStatus === "resolved" ? profile?.name || "Super Admin" : undefined,
        }),
      });
      if (res.ok) {
        await fetchIncident();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/super-admin/errors/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteText: noteText.trim(),
          noteAuthor: profile?.name || "Super Admin",
        }),
      });
      if (res.ok) {
        setNoteText("");
        await fetchIncident();
      }
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleCopyStack = () => {
    const stack = incident?.sampleEvents?.[0]?.sanitizedStack;
    if (stack && typeof navigator !== "undefined") {
      navigator.clipboard.writeText(stack);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-semibold text-slate-500">
        Loading incident details...
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-12 text-center space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Incident Not Found</h2>
        <Link
          href="/super-admin/errors"
          className="text-xs font-bold text-blue-600 hover:underline"
        >
          ← Return to Error Center
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Back Link */}
      <div>
        <Link
          href="/super-admin/errors"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to All Incidents</span>
        </Link>
      </div>

      {/* Main Incident Card Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Fingerprint: {incident.fingerprint}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 uppercase">
                {incident.module}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {incident.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest: {incident.latestMessage}
            </p>
          </div>

          {/* Status Changer */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Status:</span>
            <select
              value={incident.status}
              disabled={updating}
              onChange={(e) => handleStatusChange(e.target.value as IncidentStatus)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="new">New</option>
              <option value="investigating">Investigating</option>
              <option value="monitoring">Monitoring</option>
              <option value="resolved">Resolved</option>
              <option value="reopened">Reopened</option>
            </select>
          </div>
        </div>

        {/* Telemetry Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Occurrences</span>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {incident.occurrences}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Affected Schools</span>
            <div className="text-lg font-black text-teal-600 dark:text-teal-400">
              {incident.affectedSchoolsCount}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">First Seen (UTC)</span>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {new Date(incident.firstSeen).toLocaleString()}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Last Seen (UTC)</span>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {new Date(incident.lastSeen).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Left Stack Trace & Sample Events, Right Investigation Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Technical Stack Trace & Sample Events */}
        <div className="lg:col-span-8 space-y-6">
          {/* Sanitized Stack Trace Card */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-slate-950 text-slate-200 p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-sky-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Sanitized Diagnostic Stack Trace
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyStack}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                title="Copy sanitized stack trace"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copied" : "Copy Trace"}</span>
              </button>
            </div>

            <pre className="p-3.5 rounded-2xl bg-black/50 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed border border-white/5 max-h-72">
              {incident.sampleEvents?.[0]?.sanitizedStack ||
                `Error: ${incident.latestMessage}\n    at ${incident.module}/${incident.operation}`}
            </pre>
          </div>

          {/* Sample Events List */}
          <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Occurrence Samples (Bounded to 5)
              </h3>
              <span className="text-[11px] text-slate-400">
                {incident.sampleEvents?.length || 0} event samples captured
              </span>
            </div>

            <div className="space-y-3">
              {(incident.sampleEvents || []).map((ev) => (
                <div
                  key={ev.eventId}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-white/5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {ev.referenceCode}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(ev.occurredAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-slate-700 dark:text-slate-300 text-xs">
                    {ev.message}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {ev.schoolId && <span>School: {ev.schoolId}</span>}
                    {ev.userRole && <span>Role: {ev.userRole}</span>}
                    {ev.clientMetadata?.browser && (
                      <span>
                        Client: {ev.clientMetadata.browser} ({ev.clientMetadata.os})
                      </span>
                    )}
                    {ev.sanitizedRoute && <span>Route: {ev.sanitizedRoute}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Investigation Notes & Resolution */}
        <div className="lg:col-span-4 space-y-6">
          {/* Resolution Summary Card */}
          {incident.status === "resolved" && (
            <div className="p-5 rounded-3xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Incident Resolved
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {incident.resolutionSummary || "Marked as resolved."}
              </p>
              <div className="text-[10px] text-slate-400">
                Resolved by {incident.resolvedBy || "Super Admin"} on{" "}
                {incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleDateString() : "recently"}
              </div>
            </div>
          )}

          {/* Investigation Notes Feed */}
          <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Investigation Notes
            </h3>

            {/* Note Input */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Log an investigation finding or triage comment..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={updating || !noteText.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-60"
              >
                {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Add Note</span>
              </button>
            </form>

            {/* Existing Notes */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
              {(incident.investigationNotes || []).length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-2">
                  No notes recorded yet.
                </p>
              ) : (
                incident.investigationNotes?.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {note.author}
                      </span>
                      <span>{new Date(note.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                      {note.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
