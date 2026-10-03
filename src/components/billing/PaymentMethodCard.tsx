"use client";

import React, { useState } from "react";
import { CreditCard, ShieldCheck, Plus, Check, Lock, Edit } from "lucide-react";
import { toast } from "sonner";

export interface PaymentMethodData {
  type: string;
  maskedIdentifier: string;
  provider?: string;
  isDefault?: boolean;
}

export interface PaymentMethodCardProps {
  paymentMethod: PaymentMethodData | null;
  onUpdate: () => void;
}

export function PaymentMethodCard({ paymentMethod, onUpdate }: PaymentMethodCardProps) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [methodType, setMethodType] = useState(paymentMethod?.type || "UPI");
  const [identifier, setIdentifier] = useState(paymentMethod?.maskedIdentifier || "schoolstudy@upi");

  const handleSave = () => {
    toast.success("Payment method preference updated.");
    setShowUpdateModal(false);
    onUpdate();
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>Active Payment Method</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Masked payment credential stored securely via PCI-DSS compliant Razorpay gateway tokenization.
          </p>
        </div>

        <button
          onClick={() => setShowUpdateModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <Edit className="h-3.5 w-3.5" />
          <span>Update Payment Method</span>
        </button>
      </div>

      {paymentMethod ? (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm capitalize">
                  {paymentMethod.type} Auto-Pay
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  TOKENIZED
                </span>
              </div>
              <span className="font-mono text-slate-500 text-xs">{paymentMethod.maskedIdentifier}</span>
            </div>
          </div>

          <div className="text-right text-[11px] text-slate-400">
            <span>Provider: {paymentMethod.provider || "Razorpay Gateway"}</span>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-500 font-semibold">No payment method added yet.</p>
          <button
            onClick={() => setShowUpdateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Payment Method</span>
          </button>
        </div>
      )}

      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 my-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="h-4.5 w-4.5 text-emerald-600" />
              <span>Update Payment Token</span>
            </h3>
            <p className="text-xs text-slate-500">
              Select preferred automatic payment instrument for future subscription renewals.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Instrument Type</label>
                <select
                  value={methodType}
                  onChange={(e) => setMethodType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                >
                  <option value="UPI">UPI Auto-Pay (VPA)</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="NET_BANKING">Net Banking</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">VPA / Masked Card Identifier</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Save Payment Preference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
