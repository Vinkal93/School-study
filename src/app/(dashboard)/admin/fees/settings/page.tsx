"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { Settings, Save, Clock, CreditCard, Shield, Loader2 } from "lucide-react";
import type { FeeSettings } from "@/types";
import { getFeeSettings, updateFeeSettings } from "@/lib/services/fee.service";
import { toast } from "sonner";

export default function AdminFeeSettingsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receiptPrefix, setReceiptPrefix] = useState("REC");
  const [dueDayOfMonth, setDueDayOfMonth] = useState(10);
  const [lateFeeEnabled, setLateFeeEnabled] = useState(true);
  const [graceDays, setGraceDays] = useState(5);
  const [lateFeeType, setLateFeeType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [lateFeeValue, setLateFeeValue] = useState(50);

  useEffect(() => {
    async function loadSettings() {
      if (!schoolId) return;
      setLoading(true);
      try {
        const s = await getFeeSettings(schoolId);
        setReceiptPrefix(s.receiptPrefix || "REC");
        setDueDayOfMonth(s.feeDueDayOfMonth || 10);
        setLateFeeEnabled(s.lateFeeRule?.enabled ?? true);
        setGraceDays(s.lateFeeRule?.graceDays || 5);
        setLateFeeType(s.lateFeeRule?.type || "FIXED");
        setLateFeeValue(s.lateFeeRule?.value || 50);
      } catch (err) {
        toast.error("Failed to load fee settings.");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [schoolId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setSaving(true);
    try {
      await updateFeeSettings(schoolId, {
        receiptPrefix,
        feeDueDayOfMonth: dueDayOfMonth,
        lateFeeRule: {
          enabled: lateFeeEnabled,
          graceDays,
          type: lateFeeType,
          value: lateFeeValue,
          maxLimitPaise: 50000,
        },
      });
      toast.success("Fee settings updated successfully!");
    } catch (err) {
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntitlementGate feature="fee_management" title="Fee Settings & Late Fee Rules" requiredPlan="Professional Plan">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fee Settings & Rules</h1>
          <p className="text-xs text-slate-500 mt-1">Configure receipt prefixes, monthly due dates, and server-calculated late fee rules.</p>
        </div>

        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-sm text-xs">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-600">1. Receipt & Billing Defaults</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Receipt Prefix</label>
                <input
                  type="text"
                  required
                  value={receiptPrefix}
                  onChange={(e) => setReceiptPrefix(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Due Day of Month (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={dueDayOfMonth}
                  onChange={(e) => setDueDayOfMonth(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Late Fee Calculation Rules */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-600">2. Late Fee Configuration</h3>
              <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lateFeeEnabled}
                  onChange={(e) => setLateFeeEnabled(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Enable Server Late Fee</span>
              </label>
            </div>

            {lateFeeEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Grace Days</label>
                  <input
                    type="number"
                    min="0"
                    value={graceDays}
                    onChange={(e) => setGraceDays(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Late Fee Type</label>
                  <select
                    value={lateFeeType}
                    onChange={(e) => setLateFeeType(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="FIXED">Fixed Amount (₹)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Value ({lateFeeType === "FIXED" ? "₹" : "%"})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lateFeeValue}
                    onChange={(e) => setLateFeeValue(parseFloat(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 transition-all"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save Fee Settings</span>
            </button>
          </div>
        </form>
      </div>
    </EntitlementGate>
  );
}
