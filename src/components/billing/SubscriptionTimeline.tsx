"use client";

import React from "react";
import { Clock, ShieldCheck, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
}

export interface SubscriptionTimelineProps {
  events: TimelineEvent[];
}

export function SubscriptionTimeline({ events = [] }: SubscriptionTimelineProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span>Subscription Audit Timeline</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Chronological record of subscription activations, plan adjustments, and payment fulfillment.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="text-xs text-slate-500 italic p-4 text-center">No subscription activity recorded yet.</p>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {events.map((evt) => (
            <div key={evt.id} className="relative flex items-start gap-3 text-xs">
              <div className="absolute -left-6 top-0.5 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-950" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">{evt.title}</span>
                <span className="text-slate-500 dark:text-slate-400 block mt-0.5">{evt.description}</span>
                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                  {new Date(evt.timestamp).toLocaleString("en-IN")} • {evt.actor || "System"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
