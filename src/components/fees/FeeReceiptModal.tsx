"use client";

import React, { useState } from "react";
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  Building2,
  CreditCard,
  QrCode,
  HelpCircle,
  Wifi,
  Sparkles,
} from "lucide-react";
import type { FeePayment } from "@/types";

interface FeeReceiptModalProps {
  payment: FeePayment | null;
  schoolName?: string;
  isOpen: boolean;
  onClose: () => void;
}

type ReceiptFormat = "thermal58" | "thermal80" | "standardA4";

export function FeeReceiptModal({
  payment,
  schoolName = "School Study ERP",
  isOpen,
  onClose,
}: FeeReceiptModalProps) {
  const [receiptFormat, setReceiptFormat] = useState<ReceiptFormat>("thermal58");
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const amountPaidRupees = (
    (payment.amountPaidPaise || payment.netAmountPaise || 0) / 100
  ).toFixed(2);
  const discountRupees = ((payment.discountPaise || 0) / 100).toFixed(2);
  const lateFeeRupees = ((payment.lateFeePaise || 0) / 100).toFixed(2);
  const netRupees = (
    (payment.netAmountPaise || payment.amountPaidPaise || 0) / 100
  ).toFixed(2);
  const remainingDueRupees =
    payment.remainingDuePaise !== undefined
      ? (payment.remainingDuePaise / 100).toFixed(2)
      : null;

  const paymentDateStr = payment.paymentDate || payment.createdAt || new Date().toISOString();
  const formattedDate = new Date(paymentDateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = new Date(paymentDateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const paymentMethod = payment.paymentMethod || (payment as any).paymentMode || "Cash";
  const referenceNumber = payment.transactionRef || (payment as any).referenceNumber;
  const rawMonths = payment?.periodMonths;
  const periodMonths =
    Array.isArray(rawMonths) && rawMonths.length > 0
      ? rawMonths.join(", ")
      : typeof rawMonths === "string" && (rawMonths as string).trim() !== ""
      ? rawMonths
      : "Standard Tuition Fee";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
      <style>{`
        @media print {
          @page {
            size: ${
              receiptFormat === "thermal58"
                ? "58mm auto"
                : receiptFormat === "thermal80"
                ? "80mm auto"
                : "A4 portrait"
            };
            margin: 0mm !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide all surrounding app elements during print */
          body * {
            visibility: hidden !important;
          }
          /* Show ONLY the printable receipt block */
          #thermal-printable-receipt, #thermal-printable-receipt * {
            visibility: visible !important;
          }
          #thermal-printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${
              receiptFormat === "thermal58"
                ? "58mm"
                : receiptFormat === "thermal80"
                ? "80mm"
                : "100%"
            } !important;
            max-width: ${
              receiptFormat === "thermal58"
                ? "58mm"
                : receiptFormat === "thermal80"
                ? "80mm"
                : "100%"
            } !important;
            margin: 0 auto !important;
            padding: ${
              receiptFormat === "thermal58"
                ? "2mm 2.5mm"
                : receiptFormat === "thermal80"
                ? "3mm 4mm"
                : "15mm"
            } !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace, system-ui !important;
            font-size: ${receiptFormat === "thermal58" ? "10px" : "12px"} !important;
            line-height: 1.25 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh]">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Fee Payment Receipt #{payment.receiptNumber}
              </h3>
              <p className="text-[11px] text-slate-500">
                {payment.studentName} • Class {payment.className} ({payment.sectionName || "A"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                showSetupGuide
                  ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              }`}
              title="Mini Thermal Printer Setup Guide"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Printer Setup Guide</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Format Selector Bar */}
        <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300">
            <span>Select Print Format:</span>
          </div>

          <div className="inline-flex rounded-xl bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700 shadow-xs">
            {[
              {
                id: "thermal58",
                label: "🧾 58mm Thermal (Flipkart Mini)",
                badge: "Recommended",
              },
              {
                id: "thermal80",
                label: "🏷️ 80mm POS Roll",
                badge: null,
              },
              {
                id: "standardA4",
                label: "📄 Standard A4 / A5",
                badge: null,
              },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setReceiptFormat(f.id as ReceiptFormat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  receiptFormat === f.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <span>{f.label}</span>
                {f.badge && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                      receiptFormat === f.id
                        ? "bg-blue-800 text-blue-100"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}
                  >
                    {f.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Mini Printer Setup Guide Drawer / Banner */}
        {showSetupGuide && (
          <div className="px-5 py-4 bg-amber-50/80 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 text-xs space-y-3 animate-in slide-in-from-top-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <h4 className="font-extrabold text-amber-900 dark:text-amber-200">
                  Flipkart ₹500 Mini Thermal Printer (58mm / 2-Inch WiFi & Bluetooth) Setup Guide
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupGuide(false)}
                className="text-amber-600 hover:text-amber-800 p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700 dark:text-slate-300 text-[11px]">
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/70 dark:border-amber-900/50 space-y-1">
                <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                  <span>1. Paper Roll Load</span>
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  58mm (2-inch) रोल को प्रिंटर में डालें। ध्यान रखें कि थर्मल कोटिंग (चिकना हिस्सा) ऊपर प्रिंट-हेड की तरफ हो।
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/70 dark:border-amber-900/50 space-y-1">
                <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                  <span>2. Connect WiFi / Bluetooth</span>
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  प्रिंटर ऑन करें। कंप्यूटर/फोन के Bluetooth या WiFi से पेयर करें (Driver: <strong>POS-58</strong> या <strong>ESC/POS Printer</strong>)।
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/70 dark:border-amber-900/50 space-y-1">
                <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                  <span>3. Chrome Print Settings</span>
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Destination: <strong>POS-58</strong> | Paper Size: <strong>58mm x 210mm</strong> | Margins: <strong>None</strong> | Headers/Footers: <strong>UNCHECK (बंद)</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-amber-200/50 dark:border-amber-900/40 text-[11px]">
              <span className="text-amber-800 dark:text-amber-300 font-semibold">
                💡 Margins 'None' सेट करने पर रसीद बिना कटे 2 सेकंड में सुपर-क्लियर प्रिंट होगी।
              </span>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 cursor-pointer"
              >
                Test Print Now
              </button>
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex items-center justify-center bg-slate-100 dark:bg-slate-950/80">
          {/* ========================================================
              FORMAT 1: 58MM MINI THERMAL (FLIPKART PRINTER)
          ======================================================== */}
          {receiptFormat === "thermal58" && (
            <div
              id="thermal-printable-receipt"
              className="w-full max-w-[290px] bg-white text-black p-4 rounded-xl shadow-lg border border-slate-300 font-mono text-[11px] leading-tight select-text"
            >
              {/* Header Branding */}
              <div className="text-center space-y-1 pb-2 border-b border-dashed border-black">
                <p className="text-sm font-black uppercase tracking-wider">{schoolName}</p>
                <p className="text-[10px] text-neutral-600">SCHOOL FEE RECEIPT</p>
                <p className="text-[9px] text-neutral-500">Official Computer Generated Slip</p>
              </div>

              {/* Receipt Metadata */}
              <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Receipt No:</span>
                  <span className="font-bold">{payment.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Date & Time:</span>
                  <span>
                    {formattedDate} {formattedTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Payment Mode:</span>
                  <span className="font-bold uppercase">{paymentMethod}</span>
                </div>
                {referenceNumber && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Txn Ref:</span>
                    <span className="font-mono">{referenceNumber}</span>
                  </div>
                )}
              </div>

              {/* Student Particulars */}
              <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Student:</span>
                  <span className="font-black text-[11px] uppercase">{payment.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Adm No:</span>
                  <span className="font-bold">{payment.admissionNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Class & Sec:</span>
                  <span className="font-bold">
                    {payment.className} ({payment.sectionName || "A"})
                  </span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="py-2 border-b border-dashed border-black">
                <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-black">
                  <span>Particulars</span>
                  <span>Amount</span>
                </div>
                <div className="pt-1.5 space-y-1">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-bold">{payment.feeType || "Monthly Fee"}</p>
                      <p className="text-[9px] text-neutral-500 truncate max-w-[150px]">
                        {periodMonths}
                      </p>
                    </div>
                    <span className="font-bold">₹{amountPaidRupees}</span>
                  </div>

                  {Number(discountRupees) > 0 && (
                    <div className="flex justify-between text-neutral-600 text-[10px]">
                      <span>Discount / Waiver:</span>
                      <span>-₹{discountRupees}</span>
                    </div>
                  )}

                  {Number(lateFeeRupees) > 0 && (
                    <div className="flex justify-between text-neutral-600 text-[10px]">
                      <span>Late Fee Fine:</span>
                      <span>+₹{lateFeeRupees}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Paid Block */}
              <div className="py-2 border-b-2 border-black space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black tracking-wider">TOTAL PAID:</span>
                  <span className="text-sm font-black">₹{netRupees}</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-700">
                  <span>Payment Status:</span>
                  <span className="font-black uppercase tracking-wider text-[9px] px-1 py-0.5 border border-black">
                    SUCCESS • PAID
                  </span>
                </div>
              </div>

              {/* Outstanding Balance (If any) */}
              {remainingDueRupees !== null && (
                <div className="py-1.5 border-b border-dashed border-black flex justify-between text-[10px]">
                  <span className="text-neutral-600">Remaining Due Balance:</span>
                  <span className="font-bold">₹{remainingDueRupees}</span>
                </div>
              )}

              {/* Cashier & Verification QR */}
              <div className="pt-2 pb-1 text-center space-y-1.5">
                <div className="flex items-center justify-center gap-2 py-1">
                  <div className="w-12 h-12 border border-black p-0.5 flex items-center justify-center">
                    <QrCode className="w-10 h-10 text-black" />
                  </div>
                  <div className="text-left text-[8px] text-neutral-600 leading-tight">
                    <p className="font-bold text-black">SCAN TO VERIFY</p>
                    <p>Official School Study</p>
                    <p>Authentic Digital Stamp</p>
                  </div>
                </div>

                <p className="text-[9px] font-bold">THANK YOU!</p>
                <p className="text-[8px] text-neutral-500">
                  Please preserve this slip for audit records.
                </p>
                <p className="text-[7px] text-neutral-400">
                  Collected By: {payment.collectedByName || "School Accountant"}
                </p>
              </div>
            </div>
          )}

          {/* ========================================================
              FORMAT 2: 80MM POS ROLL (COMMERCIAL POS)
          ======================================================== */}
          {receiptFormat === "thermal80" && (
            <div
              id="thermal-printable-receipt"
              className="w-full max-w-[380px] bg-white text-black p-5 rounded-2xl shadow-lg border border-slate-300 font-mono text-xs leading-normal select-text"
            >
              {/* Header Branding */}
              <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-black">
                <h2 className="text-base font-black uppercase tracking-wider">{schoolName}</h2>
                <p className="text-xs font-semibold">OFFICIAL FEE PAYMENT RECEIPT</p>
                <p className="text-[10px] text-neutral-500">ERP Digital Cash Counter Entry</p>
              </div>

              {/* Metadata */}
              <div className="py-2.5 border-b border-dashed border-black space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Receipt No:</span>
                  <strong className="font-bold">{payment.receiptNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span>
                    {formattedDate} at {formattedTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Mode:</span>
                  <strong className="uppercase">{paymentMethod}</strong>
                </div>
                {referenceNumber && (
                  <div className="flex justify-between">
                    <span>Reference / UTR:</span>
                    <span className="font-mono">{referenceNumber}</span>
                  </div>
                )}
              </div>

              {/* Student Particulars */}
              <div className="py-2.5 border-b border-dashed border-black space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Student Name:</span>
                  <strong className="font-black uppercase">{payment.studentName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Admission Number:</span>
                  <strong>{payment.admissionNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Class & Section:</span>
                  <strong>
                    {payment.className} ({payment.sectionName || "A"})
                  </strong>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="py-3 border-b border-dashed border-black">
                <div className="flex justify-between font-bold text-xs pb-1.5 border-b border-black">
                  <span>Fee Particulars</span>
                  <span>Net Amount</span>
                </div>
                <div className="pt-2 space-y-1.5">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-bold">{payment.feeType || "School Fee"}</p>
                      <p className="text-[10px] text-neutral-500">{periodMonths}</p>
                    </div>
                    <span className="font-bold">₹{amountPaidRupees}</span>
                  </div>

                  {Number(discountRupees) > 0 && (
                    <div className="flex justify-between text-neutral-600 text-xs">
                      <span>Fee Concession / Discount:</span>
                      <span>-₹{discountRupees}</span>
                    </div>
                  )}

                  {Number(lateFeeRupees) > 0 && (
                    <div className="flex justify-between text-neutral-600 text-xs">
                      <span>Late Fee Fine:</span>
                      <span>+₹{lateFeeRupees}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Summary */}
              <div className="py-3 border-b-2 border-black space-y-1.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-black">NET AMOUNT PAID:</span>
                  <span className="text-base font-black">₹{netRupees}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-700">
                  <span>Status:</span>
                  <span className="font-bold uppercase px-1.5 py-0.5 border border-black text-[10px]">
                    PAID IN FULL
                  </span>
                </div>
              </div>

              {remainingDueRupees !== null && (
                <div className="py-2 border-b border-dashed border-black flex justify-between text-xs">
                  <span>Outstanding Remaining Due:</span>
                  <strong>₹{remainingDueRupees}</strong>
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 text-center space-y-2">
                <div className="flex items-center justify-center gap-3 py-1">
                  <div className="w-14 h-14 border border-black p-0.5 flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-black" />
                  </div>
                  <div className="text-left text-[10px] text-neutral-600">
                    <p className="font-bold text-black">DIGITAL VERIFIED</p>
                    <p>Receipt ID: #{payment.receiptNumber}</p>
                    <p>Authorized Cash Counter Slip</p>
                  </div>
                </div>

                <p className="text-xs font-bold">*** THANK YOU ***</p>
                <p className="text-[10px] text-neutral-500">
                  Issued By: {payment.collectedByName || "School Cashier"}
                </p>
              </div>
            </div>
          )}

          {/* ========================================================
              FORMAT 3: STANDARD A4 / A5 MODERN SLIP
          ======================================================== */}
          {receiptFormat === "standardA4" && (
            <div
              id="thermal-printable-receipt"
              className="w-full max-w-xl bg-white text-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 space-y-6 select-text"
            >
              {/* Header Branding */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                    S
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">{schoolName}</h2>
                    <p className="text-xs text-slate-500">Official Fee Receipt & Student Ledger Entry</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>PAID</span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 mt-2">
                    No: <span className="font-mono text-blue-600">{payment.receiptNumber}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">Date: {formattedDate}</p>
                </div>
              </div>

              {/* Student & Class Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Student Name</p>
                  <p className="font-bold text-slate-900 mt-0.5">{payment.studentName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Admission No.</p>
                  <p className="font-bold text-slate-900 mt-0.5">{payment.admissionNumber}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Class & Section</p>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {payment.className} ({payment.sectionName || "A"})
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Payment Mode</p>
                  <p className="font-bold text-blue-600 mt-0.5">{paymentMethod}</p>
                </div>
              </div>

              {/* Fee Itemization Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Fee Description / Period</th>
                      <th className="py-3 px-4 text-right">Base Amount</th>
                      <th className="py-3 px-4 text-right">Discount</th>
                      <th className="py-3 px-4 text-right">Late Fee</th>
                      <th className="py-3 px-4 text-right">Net Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                    <tr>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 capitalize">
                          {payment.feeType || "Tuition"} Fee
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">Periods: {periodMonths}</p>
                      </td>
                      <td className="py-3.5 px-4 text-right">₹{amountPaidRupees}</td>
                      <td className="py-3.5 px-4 text-right text-emerald-600">-₹{discountRupees}</td>
                      <td className="py-3.5 px-4 text-right text-amber-600">+₹{lateFeeRupees}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-blue-600">
                        ₹{netRupees}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Summary Footer */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50 border border-blue-100">
                <div>
                  <p className="text-xs text-blue-800 font-bold">Total Net Payment Collected</p>
                  {referenceNumber && (
                    <p className="text-[11px] text-blue-600 mt-0.5">
                      Txn Ref: {referenceNumber}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-blue-600">₹{netRupees}</span>
                </div>
              </div>

              {remainingDueRupees !== null && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
                  <span className="text-slate-600">Remaining Outstanding Balance:</span>
                  <span
                    className={`font-bold ${
                      Number(remainingDueRupees) > 0 ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    ₹{remainingDueRupees}
                  </span>
                </div>
              )}

              {/* Signature & Stamp */}
              <div className="pt-6 flex items-end justify-between border-t border-slate-200 text-xs">
                <div>
                  <p className="text-slate-500">
                    Collected By:{" "}
                    <span className="font-bold text-slate-800">
                      {payment.collectedByName || "School Cashier"}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Computer Generated Receipt. Valid without physical signature.
                  </p>
                </div>
                <div className="text-center w-36">
                  <div className="border-b border-slate-400 mb-1 h-8"></div>
                  <p className="text-[11px] font-bold text-slate-700">Authorized Stamp</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Controls */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>
              Format:{" "}
              <strong>
                {receiptFormat === "thermal58"
                  ? "58mm Flipkart Mini Roll"
                  : receiptFormat === "thermal80"
                  ? "80mm POS Roll"
                  : "A4 / A5 Slip"}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
