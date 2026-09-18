"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  Settings,
  Save,
  Clock,
  CreditCard,
  Shield,
  Loader2,
  Calendar,
  Building2,
  QrCode,
  Bell,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { FeeSettings } from "@/types";
import { getFeeSettings, updateFeeSettings } from "@/lib/services/fee.service";
import { toast } from "sonner";

const MONTH_OPTIONS = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

export default function AdminFeeSettingsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Session & Timing Defaults
  const [academicSession, setAcademicSession] = useState("2026-27");
  const [feeStartMonth, setFeeStartMonth] = useState("April");
  const [billingFrequency, setBillingFrequency] = useState<"monthly" | "quarterly" | "annual">("monthly");
  const [dueDayOfMonth, setDueDayOfMonth] = useState(10);
  const [receiptPrefix, setReceiptPrefix] = useState("REC");

  // 2. School Identity & UPI Configuration
  const [schoolName, setSchoolName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiNumber, setUpiNumber] = useState("");

  // 3. Late Fee Rules
  const [lateFeeEnabled, setLateFeeEnabled] = useState(false);
  const [graceDays, setGraceDays] = useState(5);
  const [lateFeeType, setLateFeeType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [lateFeeValue, setLateFeeValue] = useState(50);
  const [maxLimitPaise, setMaxLimitPaise] = useState(500); // In rupees for UI

  // 4. Reminders
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3);
  const [reminderNote, setReminderNote] = useState("");

  useEffect(() => {
    async function loadSettings() {
      if (!schoolId) return;
      setLoading(true);
      try {
        let s: FeeSettings;
        try {
          const res = await fetch(`/api/fees/settings?schoolId=${schoolId}`);
          const data = await res.json();
          s = data.success && data.settings ? data.settings : await getFeeSettings(schoolId);
        } catch {
          s = await getFeeSettings(schoolId);
        }

        setAcademicSession(s.academicSession || "2026-27");
        setFeeStartMonth(s.feeStartMonth || "April");
        setBillingFrequency(s.billingFrequency || "monthly");
        setDueDayOfMonth(s.feeDueDayOfMonth || 10);
        setReceiptPrefix(s.receiptPrefix || "REC");
        setSchoolName(s.schoolName || profile?.schoolName || "");
        setUpiId(s.upiId || "");
        setUpiNumber(s.upiNumber || "");

        setLateFeeEnabled(Boolean(s.lateFeeRule?.enabled));
        setGraceDays(s.lateFeeRule?.graceDays ?? 5);
        setLateFeeType(s.lateFeeRule?.type || "FIXED");
        setLateFeeValue(s.lateFeeRule?.value ?? 50);
        setMaxLimitPaise((s.lateFeeRule?.maxLimitPaise || 50000) / 100);

        setReminderEnabled(s.reminderSettings?.enabled ?? true);
        setReminderDaysBefore(s.reminderSettings?.daysBeforeDue ?? 3);
        setReminderNote(s.reminderSettings?.customNote || "");
      } catch (err) {
        console.error("Failed to load fee settings:", err);
        toast.error("Failed to load fee settings.");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [schoolId, profile?.schoolName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setSaving(true);
    try {
      const payload: Partial<FeeSettings> = {
        academicSession,
        feeStartMonth,
        billingFrequency,
        feeDueDayOfMonth: dueDayOfMonth,
        receiptPrefix: receiptPrefix.trim().toUpperCase() || "REC",
        schoolName: schoolName.trim(),
        upiId: upiId.trim(),
        upiNumber: upiNumber.trim(),
        lateFeeRule: {
          enabled: lateFeeEnabled,
          graceDays: Math.max(0, graceDays),
          type: lateFeeType,
          value: Math.max(0, lateFeeValue),
          maxLimitPaise: Math.round(Math.max(0, maxLimitPaise) * 100),
        },
        reminderSettings: {
          enabled: reminderEnabled,
          daysBeforeDue: Math.max(1, reminderDaysBefore),
          customNote: reminderNote.trim(),
        },
      };

      // Try API route with client fallback
      try {
        const res = await fetch("/api/fees/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schoolId, settings: payload, actorId: profile?.id || "admin" }),
        });
        const data = await res.json();
        if (!data.success) {
          await updateFeeSettings(schoolId, payload);
        }
      } catch {
        await updateFeeSettings(schoolId, payload);
      }

      toast.success("Fee settings successfully saved to database!");
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntitlementGate feature="fee_settings" title="Fee Settings & Late Fee Rules" requiredPlan="Professional Plan">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Fee Engine Settings & Rules</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure academic session start month, automated dues schedule, UPI details, and server-side late fee calculations.
          </p>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-xs text-slate-500">Loading authoritative school fee settings from database...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm text-xs">
            
            {/* Section 1: Academic Session & Start Month */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Calendar className="h-4 w-4" />
                <h3 className="text-xs font-black uppercase tracking-wider">1. Academic Session & Calculation Start</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Session
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026-27"
                    value={academicSession}
                    onChange={(e) => setAcademicSession(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Current academic year cycle</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fee Start Month
                  </label>
                  <select
                    value={feeStartMonth}
                    onChange={(e) => setFeeStartMonth(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} {m === "April" ? "(Default Academic)" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Months before this are omitted</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Billing Frequency
                  </label>
                  <select
                    value={billingFrequency}
                    onChange={(e) => setBillingFrequency(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="monthly">Monthly Cycle</option>
                    <option value="quarterly">Quarterly Cycle</option>
                    <option value="annual">Annual Cycle</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Schedule calculation mode</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Due Day of Month (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={dueDayOfMonth}
                    onChange={(e) => setDueDayOfMonth(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Date when monthly fee becomes due (e.g. 10th)</p>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Receipt Number Prefix
                  </label>
                  <input
                    type="text"
                    required
                    value={receiptPrefix}
                    onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">e.g. REC &rarr; REC-20260914-0001</p>
                </div>
              </div>
            </div>

            {/* Section 2: School Branding & UPI Payment Details */}
            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-blue-600">
                <Building2 className="h-4 w-4" />
                <h3 className="text-xs font-black uppercase tracking-wider">2. School Name & UPI Payment Details</h3>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Official School Name (for Receipts & Statements)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lord Buddha Public School"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Prints on official receipts and appears in parent fee notices</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    School UPI ID (VPA)
                  </label>
                  <div className="relative">
                    <QrCode className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. schoolname@upi or 9876543210@paytm"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-mono text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Generates dynamic click-to-pay links in WhatsApp/SMS</p>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    UPI Contact Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={upiNumber}
                    onChange={(e) => setUpiNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">School Accounts desk contact for payment confirmations</p>
                </div>
              </div>
            </div>

            {/* Section 3: Late Fee Configuration */}
            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600">
                  <Shield className="h-4 w-4" />
                  <h3 className="text-xs font-black uppercase tracking-wider">3. Late Fee Rules (Strict ON / OFF)</h3>
                </div>
                <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lateFeeEnabled}
                    onChange={(e) => setLateFeeEnabled(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-xs ${lateFeeEnabled ? "text-emerald-600 font-black" : "text-slate-500 font-bold"}`}>
                    {lateFeeEnabled ? "Late Fee: ENABLED (ON)" : "Late Fee: DISABLED (OFF)"}
                  </span>
                </label>
              </div>

              {!lateFeeEnabled ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 text-xs flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Late fee is turned OFF.</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Overdue student dues will strictly have ₹0 late fees added. No silent penalties will apply.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Grace Days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={graceDays}
                      onChange={(e) => setGraceDays(parseInt(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Days after due date before fine</p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Late Fee Type
                    </label>
                    <select
                      value={lateFeeType}
                      onChange={(e) => setLateFeeType(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    >
                      <option value="FIXED">Fixed (₹)</option>
                      <option value="PERCENTAGE">Percentage (%)</option>
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">Fixed ₹ or % of month fee</p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Value ({lateFeeType === "FIXED" ? "₹" : "%"})
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={lateFeeValue}
                      onChange={(e) => setLateFeeValue(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">{lateFeeType === "FIXED" ? "e.g. ₹50" : "e.g. 5%"}</p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Max Limit (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={maxLimitPaise}
                      onChange={(e) => setMaxLimitPaise(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Maximum cap per month</p>
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Reminders & Alerts */}
            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600">
                  <Bell className="h-4 w-4" />
                  <h3 className="text-xs font-black uppercase tracking-wider">4. Reminder & Notification Defaults</h3>
                </div>
                <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Enable Payment Reminders</span>
                </label>
              </div>

              {reminderEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Days Before Due Date
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={reminderDaysBefore}
                      onChange={(e) => setReminderDaysBefore(parseInt(e.target.value) || 3)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-slate-900 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Trigger notice e.g. 3 days before due</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Custom Note / Instructions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Please clear dues before the 10th to avoid late fees."
                      value={reminderNote}
                      onChange={(e) => setReminderNote(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Appended to WhatsApp and SMS statements</p>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                All settings are securely persisted in live school database.
              </span>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Fee Settings</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </EntitlementGate>
  );
}

