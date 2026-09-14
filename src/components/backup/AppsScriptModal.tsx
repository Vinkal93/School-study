"use client";

import { useState } from "react";
import { X, Copy, Check, ExternalLink, Terminal, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { generateGoogleAppsScript } from "@/lib/services/apps-script-generator.service";
import { toast } from "sonner";

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName?: string;
  defaultSecret?: string;
  onTestConnection?: (webAppUrl: string, secret: string) => void;
}

export function AppsScriptModal({
  isOpen,
  onClose,
  schoolName = "School Study",
  defaultSecret = "SCHOOL_STUDY_SECURE_SYNC_SECRET",
  onTestConnection,
}: AppsScriptModalProps) {
  const [copied, setCopied] = useState(false);
  const [testUrl, setTestUrl] = useState("");
  const [testSecret, setTestSecret] = useState(defaultSecret);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  if (!isOpen) return null;

  const scriptCode = generateGoogleAppsScript({
    schoolName,
    defaultSecret: testSecret || defaultSecret,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    toast.success("Apps Script code copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRunTest = async () => {
    if (!testUrl.trim()) {
      toast.error("Please enter your deployed Web App URL to test.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/super-admin/backup/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webAppUrl: testUrl.trim(),
          syncSecret: testSecret.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      setTestResult(data);
      if (res.ok && data.success) {
        toast.success(`✓ Connected! ${data.message} (${data.latencyMs || 0}ms)`);
        if (onTestConnection) {
          onTestConnection(testUrl.trim(), testSecret.trim());
        }
      } else {
        toast.error(`✕ ${data.reason || data.error || "Connection test failed."}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reach test endpoint.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Google Apps Script Generator
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deploy this automated bridge script inside your Google Sheet to enable live synchronization.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-600 dark:text-slate-300">
          {/* Step-by-Step Deployment Guide */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3">
            <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300 text-sm">
              <Sparkles className="h-4 w-4" />
              <span>Step-by-Step Deployment Guide</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5 bg-white dark:bg-slate-900/70 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40">
                <span className="font-bold text-blue-600 dark:text-blue-400">1. Create Google Sheet</span>
                <p className="text-slate-500 dark:text-slate-400">Open Google Sheets and create a blank new spreadsheet for {schoolName}.</p>
              </div>
              <div className="space-y-1.5 bg-white dark:bg-slate-900/70 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40">
                <span className="font-bold text-blue-600 dark:text-blue-400">2. Open Apps Script</span>
                <p className="text-slate-500 dark:text-slate-400">In the top menu, go to <strong>Extensions &gt; Apps Script</strong>.</p>
              </div>
              <div className="space-y-1.5 bg-white dark:bg-slate-900/70 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40">
                <span className="font-bold text-blue-600 dark:text-blue-400">3. Paste Generated Script</span>
                <p className="text-slate-500 dark:text-slate-400">Clear existing code in <code>Code.gs</code> and paste the code below.</p>
              </div>
              <div className="space-y-1.5 bg-white dark:bg-slate-900/70 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40">
                <span className="font-bold text-blue-600 dark:text-blue-400">4. Deploy as Web App</span>
                <p className="text-slate-500 dark:text-slate-400">Click <strong>Deploy &gt; New deployment</strong>, select <strong>Web app</strong>. Execute as: <em>Me</em>, Who has access: <em>Anyone</em>.</p>
              </div>
              <div className="space-y-1.5 bg-white dark:bg-slate-900/70 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40">
                <span className="font-bold text-blue-600 dark:text-blue-400">5. Copy Web App URL</span>
                <p className="text-slate-500 dark:text-slate-400">Authorize permissions when prompted and copy the generated <code>/exec</code> URL.</p>
              </div>
              <div className="space-y-1.5 bg-white dark:bg-slate-900/70 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40">
                <span className="font-bold text-blue-600 dark:text-blue-400">6. Save &amp; Test Connection</span>
                <p className="text-slate-500 dark:text-slate-400">Paste URL into School Study, verify the Sync Secret, and click Test Connection.</p>
              </div>
            </div>
          </div>

          {/* Code Viewer with Copy Button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Generated Script (Code.gs)</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied!" : "Copy Entire Script"}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed max-h-72 overflow-y-auto border border-slate-800 select-all">
              {scriptCode}
            </pre>
          </div>

          {/* In-Modal Quick Connection Tester */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 space-y-3">
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
              Quick Connection Verification:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Deployed Web App URL
                </label>
                <input
                  type="url"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Sync Secret Token
                </label>
                <input
                  type="text"
                  value={testSecret}
                  onChange={(e) => setTestSecret(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleRunTest}
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                {testing ? (
                  <span>Testing Connection...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Test Web App Connection</span>
                  </>
                )}
              </button>

              {testResult && (
                <div
                  className={`text-xs p-3 rounded-xl border ${
                    testResult.success
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300"
                  }`}
                >
                  <div className="font-bold flex items-center justify-between gap-2 mb-1">
                    <span>{testResult.success ? "✓ Google Sheets Connected" : "✕ Connection Failed"}</span>
                    {testResult.latencyMs !== undefined && (
                      <span className="text-[10px] opacity-75 font-mono">{testResult.latencyMs} ms</span>
                    )}
                  </div>
                  {testResult.success ? (
                    <div className="text-[11px] opacity-90">
                      Spreadsheet: {testResult.spreadsheetName || "Online"} {testResult.spreadsheetId ? `(${testResult.spreadsheetId.slice(0, 10)}...)` : ""}
                    </div>
                  ) : (
                    <div className="space-y-0.5 text-[11px]">
                      {testResult.reason && <div><span className="font-semibold">Reason:</span> {testResult.reason}</div>}
                      {testResult.suggestedFix && <div className="mt-1 font-semibold text-rose-800 dark:text-rose-200">Suggested Fix: {testResult.suggestedFix}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Automated Apps Script Generator v2.4 • Zero hardcoded credentials
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
