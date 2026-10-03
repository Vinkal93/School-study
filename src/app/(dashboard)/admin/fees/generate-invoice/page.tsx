"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  FileText,
  Download,
  Printer,
  Share2,
  Check,
  Building2,
  User,
  Users,
  Calendar,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  Search,
  Sliders,
  DollarSign,
  Layers,
} from "lucide-react";
import { getStudents } from "@/lib/services/student.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { getFeeSettings } from "@/lib/services/fee.service";
import {
  generateThreeCopyFeeInvoicePDF,
  type FeeInvoicePDFData,
} from "@/lib/services/pdf-invoice-receipt.service";
import type { StudentProfile, SchoolClass, FeeSettings } from "@/types";
import { toast } from "sonner";

interface FeeItem {
  sr: number;
  particulars: string;
  amount: number;
}

const DEFAULT_FEE_ITEMS: FeeItem[] = [
  { sr: 1, particulars: "MONTHLY FEE", amount: 400 },
  { sr: 2, particulars: "ADMISSION FEE", amount: 0 },
  { sr: 3, particulars: "REGISTRATION FEE", amount: 0 },
  { sr: 4, particulars: "ART MATERIAL", amount: 0 },
  { sr: 5, particulars: "TRANSPORT", amount: 0 },
  { sr: 6, particulars: "BOOKS", amount: 0 },
  { sr: 7, particulars: "UNIFORM", amount: 0 },
  { sr: 8, particulars: "FINE", amount: 0 },
  { sr: 9, particulars: "OTHERS", amount: 0 },
  { sr: 10, particulars: "Previous Balance", amount: 0 },
  { sr: 11, particulars: "Discount in Fee 0 %", amount: 0 },
];

const DEFAULT_BANKS = [
  { name: "State Bank of India", account: "38291048190", ifsc: "SBIN0001234" },
  { name: "HDFC Bank", account: "50200012345678", ifsc: "HDFC0000456" },
  { name: "ICICI Bank", account: "001205001234", ifsc: "ICIC0000789" },
  { name: "Punjab National Bank", account: "112233445566", ifsc: "PUNB0012300" },
  { name: "Bank of Baroda", account: "778899001122", ifsc: "BARB0COLLEG" },
];

const MONTHS = [
  "April, 2026",
  "May, 2026",
  "June, 2026",
  "July, 2026",
  "August, 2026",
  "September, 2026",
  "October, 2026",
  "November, 2026",
  "December, 2026",
  "January, 2027",
  "February, 2027",
  "March, 2027",
];

export default function GenerateFeeInvoicePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  // Navigation tab: 'student' | 'class' | 'family'
  const [activeTab, setActiveTab] = useState<"student" | "class" | "family">("student");

  // State data
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Fields - Student Wise
  const [selectedMonth, setSelectedMonth] = useState("October, 2026");
  const [dueDate, setDueDate] = useState("2026-10-10");
  const [fineAfterDueDate, setFineAfterDueDate] = useState(0);
  const [selectedBankIdx, setSelectedBankIdx] = useState(0);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Copy checkboxes
  const [bankCopy, setBankCopy] = useState(true);
  const [studentCopy, setStudentCopy] = useState(true);
  const [instituteCopy, setInstituteCopy] = useState(true);

  // Particulars items
  const [feeItems, setFeeItems] = useState<FeeItem[]>(DEFAULT_FEE_ITEMS);

  // Class Wise Form State
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  // Family Wise Form State
  const [familySearchQuery, setFamilySearchQuery] = useState("");
  const [selectedGuardianKey, setSelectedGuardianKey] = useState("");

  // Invoice Generation State
  const [generating, setGenerating] = useState(false);
  const [generatedPdfBlobUrl, setGeneratedPdfBlobUrl] = useState<string | null>(null);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState<string | null>(null);

  // Fetch initial school info
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    Promise.all([
      getStudents(schoolId),
      getClassesWithSections(schoolId),
      getFeeSettings(schoolId),
    ])
      .then(([stuList, clsList, feeSett]) => {
        setStudents(stuList);
        setClasses(clsList);
        setSettings(feeSett);

        // Pre-select first student if available
        if (stuList.length > 0) {
          setSelectedStudentId(stuList[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load invoice setup:", err);
        toast.error("Failed to load school student data");
      })
      .finally(() => setLoading(false));
  }, [schoolId]);

  // Selected Student
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // Filtered Students for Autocomplete
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return students.slice(0, 30);
    const q = studentSearchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        (s.admissionNumber && String(s.admissionNumber).toLowerCase().includes(q)) ||
        (s.studentId && String(s.studentId).toLowerCase().includes(q)) ||
        s.className?.toLowerCase().includes(q) ||
        (s.guardianPhone && String(s.guardianPhone).includes(q))
    );
  }, [students, studentSearchQuery]);

  // Compute Total
  const totalAmount = useMemo(() => {
    return feeItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [feeItems]);

  // Handle amount change in table
  const handleAmountChange = (index: number, val: number) => {
    setFeeItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], amount: Math.max(0, val) };
      return next;
    });
  };

  // Generate 3-Voucher PDF
  const handleGenerateInvoice = () => {
    if (!selectedStudent) {
      toast.error("Please search and select a student first.");
      return;
    }

    if (!bankCopy && !studentCopy && !instituteCopy) {
      toast.error("Please select at least one voucher copy (Bank, Student, or Institute).");
      return;
    }

    setGenerating(true);

    try {
      const currentBank = DEFAULT_BANKS[selectedBankIdx] || DEFAULT_BANKS[0];
      const invNo = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      setLastInvoiceNumber(invNo);

      const invoiceData: FeeInvoicePDFData = {
        schoolName: settings?.schoolName || profile?.schoolName || "DEMO PUBLIC SCHOOL",
        schoolAddress: settings?.schoolAddress || "Institutional Area, Knowledge Park",
        schoolPhone: settings?.schoolPhone || "+91 98765 43210",
        schoolAffiliation: "Affiliated to CBSE / State Board (Reg. No: 2026/89)",
        invoiceNumber: invNo,
        feeMonth: selectedMonth,
        dueDate: dueDate,
        fineAfterDueDate: fineAfterDueDate,
        bankName: currentBank.name,
        bankAccountNumber: currentBank.account,
        bankIfsc: currentBank.ifsc,
        studentName: selectedStudent.name,
        registrationNo: selectedStudent.admissionNumber || selectedStudent.studentId || selectedStudent.id,
        rollNumber: selectedStudent.rollNumber,
        className: selectedStudent.className,
        sectionName: selectedStudent.sectionName || "A",
        guardianName: selectedStudent.guardianName || selectedStudent.fatherName || "Demo Guardian",
        guardianPhone: selectedStudent.guardianPhone || selectedStudent.phone,
        items: feeItems.filter((it) => it.amount > 0 || it.sr <= 4), // keep prominent heads
        totalAmount: totalAmount,
        copies: {
          bankCopy,
          studentCopy,
          instituteCopy,
        },
      };

      const doc = generateThreeCopyFeeInvoicePDF(invoiceData);
      const fileName = `Fee_Invoice_${selectedStudent.name.replace(/\s+/g, "_")}_${selectedMonth.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

      // Trigger automatic high-res download
      doc.save(fileName);

      // Create preview blob
      const blobUrl = doc.output("bloburl");
      setGeneratedPdfBlobUrl(blobUrl.toString());

      toast.success(`Fee Invoice generated! Downloaded: ${fileName}`);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast.error(err.message || "Failed to generate fee invoice PDF");
    } finally {
      setGenerating(false);
    }
  };

  // Class Wise Batch Generation
  const handleGenerateClassInvoices = () => {
    const classStudents = students.filter(
      (s) =>
        s.className === selectedClassId &&
        (!selectedSection || s.sectionName === selectedSection)
    );

    if (classStudents.length === 0) {
      toast.error("No students found in the selected class and section.");
      return;
    }

    setGenerating(true);
    try {
      const currentBank = DEFAULT_BANKS[selectedBankIdx] || DEFAULT_BANKS[0];

      // Generate invoice for first student as demo or batch
      const firstStu = classStudents[0];
      const invNo = `BATCH-${selectedClassId}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const invoiceData: FeeInvoicePDFData = {
        schoolName: settings?.schoolName || profile?.schoolName || "DEMO PUBLIC SCHOOL",
        schoolAddress: settings?.schoolAddress || "Institutional Area, Knowledge Park",
        schoolPhone: settings?.schoolPhone || "+91 98765 43210",
        invoiceNumber: invNo,
        feeMonth: selectedMonth,
        dueDate: dueDate,
        fineAfterDueDate: fineAfterDueDate,
        bankName: currentBank.name,
        bankAccountNumber: currentBank.account,
        bankIfsc: currentBank.ifsc,
        studentName: firstStu.name,
        registrationNo: firstStu.admissionNumber || firstStu.studentId || firstStu.id,
        rollNumber: firstStu.rollNumber,
        className: firstStu.className,
        sectionName: firstStu.sectionName || "A",
        guardianName: firstStu.guardianName || firstStu.fatherName || "Guardian",
        guardianPhone: firstStu.guardianPhone || firstStu.phone,
        items: feeItems,
        totalAmount: totalAmount,
        copies: { bankCopy, studentCopy, instituteCopy },
      };

      const doc = generateThreeCopyFeeInvoicePDF(invoiceData);
      doc.save(`Class_${selectedClassId}_Invoices_${selectedMonth.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
      toast.success(`Generated batch challan for ${classStudents.length} students in ${selectedClassId}!`);
    } catch (err: any) {
      toast.error(err.message || "Error generating class invoices");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <EntitlementGate feature="fee_invoice" title="Generate Fees Invoice" requiredPlan="Professional Plan">
      <div className="mx-auto max-w-7xl space-y-6 p-4 text-slate-900 dark:text-slate-100 sm:p-6">
        {/* Breadcrumb Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/admin/fees" className="hover:text-blue-600">Fees</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-slate-700 dark:text-slate-300">Generate Fees Invoice</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Generate Fees Invoice
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Generate student, class, and family fee bills with official 3-voucher bank challans.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/fees/collect"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <DollarSign className="h-3.5 w-3.5 text-blue-600" />
              Collect Fees
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

        {/* Top Navigation Tabs (Exact layout from reference) */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("student")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "student"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <User className="h-4 w-4" />
            Student Wise
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("class")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "class"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <Layers className="h-4 w-4" />
            Class Wise
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("family")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "family"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <Users className="h-4 w-4" />
            Family Wise
          </button>
        </div>

        {/* TAB 1: STUDENT WISE (Exact image screenshot recreation) */}
        {activeTab === "student" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Left Card: (1) Student Invoice Form */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  (1) Student Invoice
                </h2>
                <span className="text-xs text-slate-400">* are required fields</span>
              </div>

              {/* Form Grid */}
              <div className="grid gap-5 sm:grid-cols-2">
                {/* FEE MONTH * */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    FEE MONTH *
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DUE DATE * */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    DUE DATE *
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* FINE AFTER DUE DATE */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    FINE AFTER DUE DATE
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-xs text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={fineAfterDueDate}
                      onChange={(e) => setFineAfterDueDate(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* SELECT BANK * */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    SELECT BANK *
                  </label>
                  <select
                    value={selectedBankIdx}
                    onChange={(e) => setSelectedBankIdx(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {DEFAULT_BANKS.map((b, idx) => (
                      <option key={b.name} value={idx}>
                        {b.name} ({b.account})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SEARCH STUDENT * */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  SEARCH STUDENT *
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Type Student Name, Admission No, or Class..."
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Student Select Dropdown list */}
                <div className="mt-1">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => {
                      setSelectedStudentId(e.target.value);
                      const st = students.find((s) => s.id === e.target.value);
                      if (st) setStudentSearchQuery(st.name);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- Choose Student from list ({filteredStudents.length}) --</option>
                    {filteredStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} | Reg: {s.admissionNumber || s.id} | Class: {s.className}{" "}
                        {s.sectionName || "A"} | Parent: {s.guardianName || s.fatherName || "N/A"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Student Information Strip */}
              {selectedStudent && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                    <div>
                      <span className="text-slate-500">Student Name</span>
                      <p className="font-bold text-slate-900 dark:text-white">{selectedStudent.name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Reg / Admission</span>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {selectedStudent.admissionNumber || selectedStudent.studentId || selectedStudent.id}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Class & Section</span>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {selectedStudent.className} {selectedStudent.sectionName ? `(${selectedStudent.sectionName})` : ""}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Guardian Name</span>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {selectedStudent.guardianName || selectedStudent.fatherName || "Demo Guardian"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Particulars Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Fee Heads & Particulars
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    Total: <strong className="text-blue-600">₹ {totalAmount.toFixed(2)}</strong>
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        <th className="px-3 py-2.5 w-12 text-center">Sr.</th>
                        <th className="px-3 py-2.5">Particulars</th>
                        <th className="px-3 py-2.5 w-32 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {feeItems.map((item, idx) => (
                        <tr key={item.sr} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-3 py-2 text-center font-medium text-slate-400">{item.sr}</td>
                          <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                            {item.particulars}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.amount}
                              onChange={(e) => handleAmountChange(idx, Number(e.target.value) || 0)}
                              className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Copy Checkboxes (Exact visual match from reference image) */}
              <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Voucher Copies to Include
                </span>
                <div className="flex flex-wrap items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={bankCopy}
                      onChange={(e) => setBankCopy(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Bank Copy
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={studentCopy}
                      onChange={(e) => setStudentCopy(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Student Copy
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={instituteCopy}
                      onChange={(e) => setInstituteCopy(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Institute Copy
                  </label>
                </div>
              </div>

              {/* Action Button: Generate Invoice */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerateInvoice}
                  disabled={generating || !selectedStudent}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  {generating ? "Generating Official PDF..." : "Generate Invoice"}
                </button>
              </div>
            </div>

            {/* Right Side: Interactive Voucher Preview & Summary */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  3-Copy Challan Overview
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Standard 3-voucher landscape challan format accepted by banks and school accounting.
                </p>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                    <span className="text-slate-600 dark:text-slate-400">Total Net Amount:</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white">
                      ₹ {totalAmount.toFixed(2)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                    <span className="text-slate-600 dark:text-slate-400">Selected Month:</span>
                    <strong className="text-slate-900 dark:text-white">{selectedMonth}</strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                    <span className="text-slate-600 dark:text-slate-400">Due Date:</span>
                    <strong className="text-slate-900 dark:text-white">{dueDate}</strong>
                  </div>

                  {fineAfterDueDate > 0 && (
                    <div className="flex items-center justify-between rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
                      <span>After Due Date (+Fine):</span>
                      <strong>₹ {(totalAmount + fineAfterDueDate).toFixed(2)}</strong>
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                    <span className="text-slate-600 dark:text-slate-400">Bank Selected:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {DEFAULT_BANKS[selectedBankIdx]?.name}
                    </span>
                  </div>
                </div>

                {generatedPdfBlobUrl && (
                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Invoice Generated Successfully!
                    </div>
                    <a
                      href={generatedPdfBlobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Open / View Generated PDF
                    </a>
                  </div>
                )}
              </div>

              {/* Quick instructions panel */}
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-5 dark:border-blue-900/40 dark:bg-slate-900/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                  Vector-Sharp PDF Guarantee
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  Invoices and bank challans are compiled programmatically into high-resolution vector PDF documents.
                  No screen artifacts or browser print dialogues — ready for direct bank deposit.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLASS WISE */}
        {activeTab === "class" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Class Wise Batch Invoice Generator
              </h2>
              <span className="text-xs text-slate-400">Generate 3-voucher bank challan for all students in grade</span>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  SELECT CLASS *
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  FEE MONTH *
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  DUE DATE *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerateClassInvoices}
                disabled={generating || !selectedClassId}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Layers className="h-4 w-4" />
                {generating ? "Generating Batch..." : "Generate Class Invoices PDF"}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: FAMILY WISE */}
        {activeTab === "family" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Family Wise Consolidated Invoice
              </h2>
              <span className="text-xs text-slate-400">Consolidate siblings into a single fee challan</span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  SEARCH GUARDIAN / PARENT PHONE *
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={familySearchQuery}
                    onChange={(e) => setFamilySearchQuery(e.target.value)}
                    placeholder="Search by parent name or phone number..."
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  FEE MONTH *
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40">
              Siblings sharing the same guardian phone number are automatically grouped together for single-payment banking convenience.
            </div>
          </div>
        )}
      </div>
    </EntitlementGate>
  );
}
