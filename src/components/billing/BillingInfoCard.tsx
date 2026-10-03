"use client";

import React, { useState } from "react";
import { Building2, Edit, Mail, Phone, MapPin, Receipt, ShieldCheck, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface BillingProfileData {
  schoolId?: string;
  billingName: string;
  schoolName: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  pan: string;
  currency?: string;
}

export interface BillingInfoCardProps {
  schoolId: string;
  profile: BillingProfileData;
  onProfileUpdated: () => void;
}

export function BillingInfoCard({
  schoolId,
  profile,
  onProfileUpdated,
}: BillingInfoCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<BillingProfileData>({
    billingName: profile?.billingName || "School Administrator",
    schoolName: profile?.schoolName || "School Campus",
    email: profile?.email || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
    gstin: profile?.gstin || "",
    pan: profile?.pan || "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.email || !form.email.includes("@")) {
      toast.error("Please provide a valid billing email address.");
      return;
    }

    if (!form.phone || form.phone.trim().length < 10) {
      toast.error("Please provide a valid contact phone number.");
      return;
    }

    if (form.gstin && form.gstin.trim().length > 0 && form.gstin.trim().length !== 15) {
      toast.error("GSTIN must be exactly 15 characters long.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/billing/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, ...form }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update billing details.");

      toast.success("Billing details updated successfully.");
      setShowEditModal(false);
      onProfileUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to update billing details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Billing & Tax Information</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Official billing identity used for invoicing, GST compliance, and payment receipts.
          </p>
        </div>

        <button
          onClick={() => {
            setForm({
              billingName: profile?.billingName || "School Administrator",
              schoolName: profile?.schoolName || "School Campus",
              email: profile?.email || "",
              phone: profile?.phone || "",
              address: profile?.address || "",
              gstin: profile?.gstin || "",
              pan: profile?.pan || "",
            });
            setShowEditModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <Edit className="h-3.5 w-3.5" />
          <span>Edit Billing Details</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Billing Entity Name</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">{profile?.billingName || "School Administrator"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Institution Name</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{profile?.schoolName || "Greenwood Campus"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Billing Address</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{profile?.address || "Address not provided"}</span>
          </div>
        </div>

        <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Billing Email</span>
            <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              {profile?.email || "admin@schoolstudy.in"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Phone</span>
            <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {profile?.phone || "+91 98765 43210"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">GSTIN</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{profile?.gstin || "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">PAN</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{profile?.pan || "N/A"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit className="h-4.5 w-4.5 text-blue-600" />
                <span>Edit Billing Information</span>
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Billing Entity Name *</label>
                <input
                  type="text"
                  required
                  value={form.billingName}
                  onChange={(e) => setForm({ ...form, billingName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Institution Name *</label>
                <input
                  type="text"
                  required
                  value={form.schoolName}
                  onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Billing Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Registered Address</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">GSTIN (15 chars)</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="29AAAAA0000A1Z5"
                    value={form.gstin}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">PAN Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="AAAAA0000A"
                    value={form.pan}
                    onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>Save Billing Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
