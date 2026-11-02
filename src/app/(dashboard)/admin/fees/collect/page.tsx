"use client";
import { useFeeSession } from "@/components/fees/FeeSessionProvider";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  DollarSign,
  Download,
  Printer,
  Share2,
  CheckCircle2,
  Calendar,
  User,
  Search,
  ChevronRight,
  RefreshCw,
  FileText,
  CreditCard,
  Building,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { getStudents } from "@/lib/services/student.service";
import { getAcademicYears } from "@/lib/services/academic.service";
import { getFeeSettings } from "@/lib/services/fee.service";
import { getFastCache, setFastCache } from "@/lib/utils/fast-data-cache";
import {
  generateProfessionalFeeReceiptPDF,
  type FeeReceiptPDFData,
} from "@/lib/services/pdf-invoice-receipt.service";
import { feeFetch } from "@/lib/fees/client-request";
import type { FeeDemand } from "@/types/fee-foundation";
import type { AcademicYear, StudentProfile, FeePayment, FeeSettings } from "@/types";
import { toast } from "sonner";

interface FeeParticularItem {
  sr: number;
  particulars: string;
  amount: number;
}

const DEFAULT_PARTICULARS: FeeParticularItem[] = [{ sr: 1, particulars: "Discount", amount: 0 }];

export default function AdminCollectFeePage() {
  const { academicYearId } = useFeeSession();
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  // Data states
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [demands, setDemands] = useState<FeeDemand[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceRevision, setInvoiceRevision] = useState(0);
  const inFlight = useRef(false);
  const requestKey = useRef<{ fingerprint: string; key: string } | null>(null);
  const currentYear = years.find(y => y.id === academicYearId);
  const monthOptions = [...new Set(demands.filter(d => d.status !== "CANCELLED" && d.balanceAmountPaise > 0).map(d => d.period))];
  // Student selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // Billing state
  const [feeMonth, setFeeMonth] = useState("");
  const selectedInvoices = demands.filter(d => d.period === feeMonth && d.status !== "CANCELLED" && d.balanceAmountPaise > 0);
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [paymentMethod, setPaymentMethod] = useState<FeePayment["paymentMethod"]>("Cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [remarks, setRemarks] = useState("");

  // Particulars items table
  const [particulars, setParticulars] = useState<FeeParticularItem[]>(DEFAULT_PARTICULARS);

  // Deposit input state
  const [depositAmount, setDepositAmount] = useState<number>(0);

  // Completed Receipt Result state
  const [submittedReceipt, setSubmittedReceipt] = useState<{
    receiptNumber: string;
    studentName: string;
    registrationNo: string;
    className: string;
    sectionName: string;
    guardianName: string;
    guardianPhone: string;
    feeMonth: string;
    paymentDate: string;
    paymentTime: string;
    paymentMethod: string;
    transactionRef?: string;
    totalAmount: number;
    depositAmount: number;
    remainingBalance: number;
    discountAmount: number;
    items: FeeParticularItem[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDemands([]);
    setParticulars(DEFAULT_PARTICULARS);
    if (!schoolId || !selectedStudentId || !currentYear?.id) return;
    setLoadingInvoices(true);
    feeFetch(`/api/fees/foundation/demands?schoolId=${encodeURIComponent(schoolId)}&studentId=${encodeURIComponent(selectedStudentId)}&academicYearId=${encodeURIComponent(currentYear.id)}`)
      .then(async response => { const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || "Invoice load failed."); return data.demands as FeeDemand[]; })
      .then(list => { if (cancelled) return; setDemands(list); setFeeMonth(previous => list.some(d => d.period === previous && d.balanceAmountPaise > 0) ? previous : list.find(d => d.status !== "CANCELLED" && d.balanceAmountPaise > 0)?.period || ""); })
      .catch(error => { if (!cancelled) toast.error(error.message); })
      .finally(() => { if (!cancelled) setLoadingInvoices(false); });
    return () => { cancelled = true; };
  }, [schoolId, selectedStudentId, currentYear?.id, invoiceRevision]);
  useEffect(() => {
    const rows = demands.filter(d => d.period === feeMonth && d.status !== "CANCELLED" && d.balanceAmountPaise > 0)
      .map((d, index) => ({ sr: index + 1, particulars: d.feeHeadName, amount: d.balanceAmountPaise / 100 }));
    setParticulars([...rows, { sr: rows.length + 1, particulars: "Discount", amount: 0 }]);
  }, [demands, feeMonth]);


  // Fetch initial data with instant zero-flicker cache
  useEffect(() => {
    if (!schoolId) return;
    const cacheKey = `admin_fees_collect_${schoolId}`;
    const cached = getFastCache<{
      students: StudentProfile[];
      years: AcademicYear[];
      settings: FeeSettings | null;
    }>(cacheKey);

    if (cached) {
      setStudents(cached.students);
      setYears(cached.years);
      setSettings(cached.settings);
      if (cached.students.length > 0) {
        setSelectedStudentId((prev) => prev || cached.students[0].id);
      }
      setLoading(false);
    } else {
      setLoading(true);
    }

    Promise.all([
      getStudents(schoolId),
      getAcademicYears(schoolId),
      getFeeSettings(schoolId),
    ])
      .then(([stuList, yrList, feeSett]) => {
        setStudents(stuList);
        setYears(yrList);
        setSettings(feeSett);
        setFastCache(cacheKey, { students: stuList, years: yrList, settings: feeSett }, 10 * 60 * 1000);

        // Pre-select first student if available and none selected yet
        if (stuList.length > 0) {
          setSelectedStudentId((prev) => prev || stuList[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load collect fee dependencies:", err);
        if (!cached) toast.error("Failed to load students data.");
      })
      .finally(() => setLoading(false));
  }, [schoolId]);

  // Selected Student
  const currentStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // Filtered Students for dropdown search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students.slice(0, 30);
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        (s.admissionNumber && String(s.admissionNumber).toLowerCase().includes(q)) ||
        (s.studentId && String(s.studentId).toLowerCase().includes(q)) ||
        s.className?.toLowerCase().includes(q) ||
        (s.guardianName && s.guardianName.toLowerCase().includes(q)) ||
        (s.guardianPhone && String(s.guardianPhone).includes(q))
    );
  }, [students, searchQuery]);

  // Total Gross calculation (heads 1 to 10 minus discount)
  const totalAmount = useMemo(() => {
    const gross = particulars.slice(0, -1).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const discount = Number(particulars[particulars.length - 1]?.amount) || 0;
    return Math.max(0, gross - discount);
  }, [particulars]);

  // Sync initial deposit with total when particulars change
  useEffect(() => {
    setDepositAmount(totalAmount);
  }, [totalAmount]);

  // Due Balance Calculation
  const dueBalance = useMemo(() => {
    return Math.max(0, totalAmount - (Number(depositAmount) || 0));
  }, [totalAmount, depositAmount]);

  // Handle amount edit on particular rows
  const handleParticularChange = (index: number, val: number) => {
    setParticulars((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], amount: Math.max(0, val) };
      return copy;
    });
  };

  // Submit Fees
  const handleSubmitFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    if (!currentStudent) {
      toast.error("Please select a student.");
      return;
    }

    if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
      toast.error("Please enter a valid deposit amount.");
      return;
    }

    inFlight.current = true;
    setSubmitting(true);

    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const resolvedYearId = currentYear?.id || years[0]?.id || "ay_current";
      const payload = {
        schoolId,
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        admissionNumber: currentStudent.admissionNumber || currentStudent.id,
        className: currentStudent.className,
        sectionName: currentStudent.sectionName || "",
        academicYearId: resolvedYearId,
        feeType: "tuition",
        periodMonths: [feeMonth],
        targetDemandIds: selectedInvoices.map((d) => d.id),
        amountPaidRupees: depositAmount,
        discountRupees: Number(particulars[particulars.length - 1]?.amount) || 0,
        paymentMethod,
        transactionRef: transactionRef.trim(),
        remarks: remarks.trim(),
        paymentDate,
      };
      const fingerprint = JSON.stringify(payload);
      if (requestKey.current?.fingerprint !== fingerprint) requestKey.current = { fingerprint, key: crypto.randomUUID() };
      const response = await feeFetch("/api/fees/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, idempotencyKey: requestKey.current.key }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Payment could not be recorded.");
      const receiptNo = result.receiptNumber;

      const regNo =
        currentStudent.admissionNumber ||
        currentStudent.studentId ||
        (currentStudent.rollNumber ? String(currentStudent.rollNumber) : "1");

      const guardian =
        currentStudent.guardianName ||
        currentStudent.fatherName ||
        "";

      const receiptRecord = {
        receiptNumber: receiptNo,
        studentName: currentStudent.name,
        registrationNo: regNo,
        className: currentStudent.className,
        sectionName: currentStudent.sectionName || "A",
        guardianName: guardian,
        guardianPhone: currentStudent.guardianPhone || currentStudent.phone || "",
        feeMonth: feeMonth,
        paymentDate: paymentDate,
        paymentTime: timeStr,
        paymentMethod: paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
        totalAmount: totalAmount,
        depositAmount: depositAmount,
        remainingBalance: (result.payment.remainingDuePaise ?? Math.round(dueBalance * 100)) / 100,
        discountAmount: Number(particulars[particulars.length - 1]?.amount) || 0,
        items: particulars,
      };

      setSubmittedReceipt(receiptRecord);
      requestKey.current = null;
      setInvoiceRevision(revision => revision + 1);
      toast.success(`Fee collected successfully! Receipt ${receiptNo}`);

      // Automatically trigger official high-res PDF generation and download
      downloadOfficialPDF(receiptRecord);
    } catch (err: any) {
      console.error("Fee collection error:", err);
      toast.error(err.message || "Could not record fee payment.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  // Download Vector-Sharp Professional PDF
  const downloadOfficialPDF = (receiptData: NonNullable<typeof submittedReceipt>) => {
    try {
      const pdfInput: FeeReceiptPDFData = {
        schoolName: settings?.schoolName || profile?.schoolName || "School",
        schoolAddress: settings?.schoolAddress || "",
        schoolPhone: settings?.schoolPhone || "",
        schoolAffiliation: "",
        receiptNumber: receiptData.receiptNumber,
        paymentDate: receiptData.paymentDate,
        paymentTime: receiptData.paymentTime,
        studentName: receiptData.studentName,
        studentIdOrAdmissionNo: receiptData.registrationNo,
        className: receiptData.className,
        sectionName: receiptData.sectionName,
        guardianName: receiptData.guardianName,
        guardianPhone: receiptData.guardianPhone,
        feeMonth: receiptData.feeMonth,
        paymentMethod: receiptData.paymentMethod,
        transactionRef: receiptData.transactionRef,
        cashierName: profile?.name || "School Cashier",
        items: receiptData.items.map((it) => ({
          sr: it.sr,
          particulars: it.particulars,
          amount: it.amount,
        })),
        totalAmount: receiptData.totalAmount,
        depositAmount: receiptData.depositAmount,
        remainingBalance: receiptData.remainingBalance,
        discountAmount: receiptData.discountAmount,
      };

      const doc = generateProfessionalFeeReceiptPDF(pdfInput);
      const safeName = receiptData.studentName.replace(/\s+/g, "_");
      const fileName = `Fee_Receipt_${receiptData.receiptNumber}_${safeName}.pdf`;

      // True direct PDF file download
      doc.save(fileName);
      toast.success(`Official PDF Receipt downloaded: ${fileName}`);
    } catch (err: any) {
      console.error("Receipt PDF download error:", err);
      toast.error("Failed to generate PDF file.");
    }
  };

  // WhatsApp Share receipt message
  const handleShareWhatsApp = (receiptData: NonNullable<typeof submittedReceipt>) => {
    const rawPhone = receiptData.guardianPhone || "";
    const cleanPhone = String(rawPhone).replace(/[^0-9]/g, "");

    const msg = encodeURIComponent(
      `*OFFICIAL FEE PAYMENT RECEIPT*\n` +
        `--------------------------------\n` +
        `🏫 *${settings?.schoolName || "School"}*\n` +
        `🧾 Receipt No: *${receiptData.receiptNumber}*\n` +
        `👤 Student: *${receiptData.studentName}* (Reg: ${receiptData.registrationNo})\n` +
        `📚 Class: *${receiptData.className}*\n` +
        `🗓️ Fee Month: *${receiptData.feeMonth}*\n` +
        `📅 Date: ${receiptData.paymentDate} at ${receiptData.paymentTime}\n` +
        `💳 Payment Mode: ${receiptData.paymentMethod}\n` +
        `--------------------------------\n` +
        `💵 Total Amount: ₹${receiptData.totalAmount.toFixed(2)}\n` +
        `✅ Deposit Amount: ₹${receiptData.depositAmount.toFixed(2)}\n` +
        `⚠️ Due Balance: ₹${receiptData.remainingBalance.toFixed(2)}\n` +
        `Status: *${receiptData.remainingBalance <= 0 ? "FULLY PAID" : "PARTIAL PAID"}*\n` +
        `--------------------------------\n` +
        `Thank you for your payment.`
    );

    const url = cleanPhone.length >= 10 ? `https://wa.me/91${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  };

  // Reset for next fee collection
  const handleCollectAnother = () => {
    setSubmittedReceipt(null);
    setDepositAmount(0);
    setParticulars(DEFAULT_PARTICULARS);
    setTransactionRef("");
    setRemarks("");
  };

  return (
    <EntitlementGate feature="fee_collect" title="Collect Fees" requiredPlan="Professional Plan">
      <div className="mx-auto max-w-5xl space-y-6 p-4 text-slate-900 dark:text-slate-100 sm:p-6">
        {/* Header Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/admin/fees" className="hover:text-blue-600">Fees</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-slate-700 dark:text-slate-300">Collect Fees</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Collect Fees
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Student Wise Fees Collection & Instant Professional PDF Receipts
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/fees/generate-invoice"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              Generate Invoice
            </Link>
            <Link
              href="/admin/fees/paid-slip"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Printer className="h-3.5 w-3.5" />
              Fees Paid Slips
            </Link>
          </div>
        </div>

        {/* POST-SUBMISSION RECEIPT CARD (Exact match to user's prompt) */}
        {submittedReceipt && (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            {/* Success Notification Banner */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                      Payment Recorded Successfully!
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Receipt No: <strong>{submittedReceipt.receiptNumber}</strong> • Vector PDF generated and ready
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadOfficialPDF(submittedReceipt)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <Download className="h-4 w-4" />
                    Download Official PDF Receipt
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(submittedReceipt)}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
                  >
                    <Share2 className="h-4 w-4 text-emerald-600" />
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={handleCollectAnother}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Collect Next Fee
                  </button>
                </div>
              </div>
            </div>

            {/* Exact Visual Receipt Layout from prompt */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
                      Fees
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Fees Paid Receipt
                    </h2>
                  </div>

                  {/* Fully Paid Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${
                      submittedReceipt.remainingBalance <= 0
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {submittedReceipt.remainingBalance <= 0 ? "Fully Paid" : "Partial Payment"}
                  </span>
                </div>

                {/* Student Metadata Subtitle */}
                <div className="mt-3 rounded-xl bg-white p-3 text-xs font-medium text-slate-700 shadow-sm border border-slate-200/80 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div>
                      Student: <strong className="text-slate-900 dark:text-white">{submittedReceipt.studentName}</strong>
                    </div>
                    <div>
                      Reg: <strong className="text-slate-900 dark:text-white">{submittedReceipt.registrationNo}</strong>
                    </div>
                    <div>
                      Class: <strong className="text-slate-900 dark:text-white">{submittedReceipt.className}</strong>
                    </div>
                    <div>
                      Month: <strong className="text-blue-600 dark:text-blue-400">{submittedReceipt.feeMonth}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Metric Value Boxes */}
              <div className="grid gap-4 p-6 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Amount
                  </span>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                    ₹ {submittedReceipt.totalAmount.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Deposit Amount
                  </span>
                  <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹ {submittedReceipt.depositAmount.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Remaining Balance
                  </span>
                  <p
                    className={`mt-1 text-2xl font-black ${
                      submittedReceipt.remainingBalance <= 0
                        ? "text-slate-900 dark:text-white"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    ₹ {submittedReceipt.remainingBalance.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Itemized Particulars Summary in receipt card */}
              <div className="px-6 pb-6">
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        <th className="px-4 py-2.5 w-12 text-center">Sr.</th>
                        <th className="px-4 py-2.5">Particulars</th>
                        <th className="px-4 py-2.5 w-32 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {submittedReceipt.items.map((it) => (
                        <tr key={it.sr} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 text-center text-slate-400">{it.sr}</td>
                          <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">
                            {it.particulars}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-900 dark:text-white">
                            {it.amount.toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Download PDF button below table */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400">
                    * High-resolution vector PDF generated with complete school letterhead & signatures.
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadOfficialPDF(submittedReceipt)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    Download Official PDF Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

          {!submittedReceipt && !loadingInvoices && !monthOptions.length && currentStudent && (
            <div className="rounded-xl border p-4 space-y-3">
              <p>No outstanding invoices for this student in {currentYear?.name || "the selected session"}. Configure Fee Structure, then generate the schedule.</p>
              <button type="button" disabled={submitting || !currentYear} className="rounded-lg bg-blue-600 px-4 py-2 text-white" onClick={async () => {
                if (inFlight.current || !currentYear) return;
                inFlight.current = true; setSubmitting(true);
                try {
                  const response = await feeFetch("/api/fees/foundation/demands/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId, studentId: currentStudent.id, academicYearId: currentYear.id, academicYearName: currentYear.name }) });
                  const data = await response.json();
                  if (!response.ok || !data.success) throw new Error(data.error || "Schedule generation failed.");
                  toast.success(`${data.count} invoices in fee schedule`); setInvoiceRevision(revision => revision + 1);
                } catch (error) { toast.error(error instanceof Error ? error.message : "Schedule generation failed."); }
                finally { inFlight.current = false; setSubmitting(false); }
              }}>Generate fee schedule</button>
            </div>
          )}

        {/* MAIN COLLECTION FORM (Matching User's Specified Workflow) */}
        {!submittedReceipt && (
          <form onSubmit={handleSubmitFees} className="space-y-6">
            {/* Top Navigation & Required notice */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                  Student Wise
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Fees Collection
                </span>
              </div>
              <span className="text-xs font-medium text-slate-400">
                * are required fields.
              </span>
            </div>

            {/* Student Search & Quick-Select Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                SEARCH STUDENT *
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Student Name, Admission No, or Class..."
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    const st = students.find((s) => s.id === e.target.value);
                    if (st) setSearchQuery(st.name);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Select Student ({filteredStudents.length}) --</option>
                  {filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} | Reg: {s.admissionNumber || s.id} | Class: {s.className}{" "}
                      {s.sectionName || "A"} | Guardian: {s.guardianName || s.fatherName || ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exact Metadata Fields Displayed (Registration, Student Name, Guardian Name, Class) */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40 sm:grid-cols-4">
                <div>
                  <span className="text-xs text-slate-500">Registration</span>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                    {currentStudent?.admissionNumber || currentStudent?.studentId || "1"}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500">Student Name</span>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                    {currentStudent?.name || "Aarav singh"}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500">Guardian Name</span>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                    {currentStudent?.guardianName || currentStudent?.fatherName || ""}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500">Class</span>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                    {currentStudent?.className || "Class 5"} {currentStudent?.sectionName ? `(${currentStudent.sectionName})` : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Fee Month & Date Bar */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Fees Month *
                </label>
                <select
                  value={feeMonth}
                  onChange={(e) => setFeeMonth(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as FeePayment["paymentMethod"])}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Debit / Credit Card</option>
                </select>
              </div>
            </div>

            {/* 11 Particulars Table (Exact Match to Prompt) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Particulars & Fee Breakdown
                </h3>
                <span className="text-xs text-slate-400">Edit any head amount as required</span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3 w-16 text-center font-bold">Sr.</th>
                      <th className="px-4 py-3 font-bold">Particulars</th>
                      <th className="px-4 py-3 w-36 text-right font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {particulars.map((item, idx) => (
                      <tr key={item.sr} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 text-center font-semibold text-slate-400">{item.sr}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                          {item.particulars}
                        </td>
                        <td className="px-4 py-1.5 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.amount}
                              readOnly={idx !== particulars.length - 1}
                            onChange={(e) => handleParticularChange(idx, Number(e.target.value) || 0)}
                            className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-right text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Panel (Total, Deposit, Due Balance) */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Total</span>
                  <strong className="text-base font-bold text-slate-900 dark:text-white">
                    {totalAmount.toFixed(0)}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <label htmlFor="depositInput" className="font-semibold text-slate-700 dark:text-slate-300">
                    Deposit *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">₹</span>
                    <input
                      id="depositInput"
                      type="number"
                      min="0"
                      max={totalAmount}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
                      required
                      className="w-32 rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-1.5 text-right text-sm font-bold text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/80 pt-2 text-sm dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Due Balance</span>
                  <strong
                    className={`text-base font-bold ${
                      dueBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {dueBalance.toFixed(0)}
                  </strong>
                </div>
              </div>

              {/* Submit Fees Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !currentStudent}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50"
                >
                  <DollarSign className="h-4 w-4" />
                  {submitting ? "Processing Payment..." : "Submit Fees"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </EntitlementGate>
  );
}
