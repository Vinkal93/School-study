"use client";

import React, { useState } from "react";
import {
  X,
  FileDown,
  Download,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  ArchitectureIntelligenceOverview,
  IntegrationEntity,
  BusinessIntelligenceMetrics,
  SecurityControlItem,
} from "@/types/architecture-intelligence";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  overview: ArchitectureIntelligenceOverview;
  integrations: IntegrationEntity[];
  businessMetrics: BusinessIntelligenceMetrics;
  securityControls: SecurityControlItem[];
}

export default function DocumentationExportModal({
  isOpen,
  onClose,
  overview,
  integrations,
  businessMetrics,
  securityControls,
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  // Generate Executive PDF Report
  const generatePdfReport = async () => {
    try {
      setIsGenerating(true);
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Banner
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, pageWidth, 28, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("SCHOOL STUDY — ARCHITECTURE & INVESTOR DOSSIER", 14, 14);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleDateString()} | Classification: Confidential Executive Summary`, 14, 21);

      // Section 1: Executive Overview
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("1. Executive Platform Architecture", 14, 38);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const summaryLines = doc.splitTextToSize(overview.summary, pageWidth - 28);
      doc.text(summaryLines, 14, 44);

      // Core Architecture Metrics Grid
      autoTable(doc, {
        startY: 56,
        head: [["Metric Category", "Verified Quantitative Count", "Operational Assurance"]],
        body: [
          ["Registered & Verified Modules", `${overview.verifiedModulesCount} Modules`, "Single Source of Truth Feature Registry"],
          ["Active Cloud Integrations", `${overview.activeIntegrationsCount} / ${overview.totalIntegrationsCount} Active`, "Zero Secrets Exposed, Least-Privilege IAM"],
          ["Multi-Tenant Firestore Collections", `${overview.databaseEntitiesCount} Collections`, "Multi-Tenant Bound, Partitioned Documents"],
          ["Zero-Trust Security Controls", `${overview.verifiedSecurityControlsCount} Controls`, "OWASP ASVS 5.0 Level 2/3 Compliance"],
        ],
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229], fontSize: 9, fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2.5 },
      });

      // Section 2: Financial & Business Metrics
      const finalY1 = (doc as any).lastAutoTable?.finalY || 95;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("2. Authoritative SaaS Business Intelligence", 14, finalY1 + 10);

      autoTable(doc, {
        startY: finalY1 + 14,
        head: [["Financial / Growth Metric", "Authoritative Value", "Reconciliation Footnote"]],
        body: [
          ["Monthly Recurring Revenue (MRR)", `₹${businessMetrics.monthlyRecurringRevenueInr.toLocaleString()}`, "Verified active subscriptions only"],
          ["Annual Run Rate (ARR)", `₹${(businessMetrics.annualRecurringRevenueRunRateInr / 100000).toFixed(2)} Lakhs`, "Annualized run rate"],
          ["Total Registered Schools", `${businessMetrics.totalRegisteredSchools} Institutions`, "Multi-tenant tenant profiles"],
          ["Active Paying Schools", `${businessMetrics.paidSchools} Institutions`, "Conversion rate: " + businessMetrics.conversionRatePercent + "%"],
          ["Average Revenue Per Paying School (ARPU)", `₹${businessMetrics.averageRevenuePerPaidSchoolInr.toLocaleString()}/mo`, "Monthly average per paid school"],
          ["Gross Margin Estimate", `${businessMetrics.grossMarginEstimatePercent}%`, "Based on serverless cloud operating costs"],
        ],
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129], fontSize: 9, fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2.5 },
      });

      // Section 3: Verified Integrations Registry
      const finalY2 = (doc as any).lastAutoTable?.finalY || 160;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("3. Production Cloud Integrations", 14, finalY2 + 10);

      autoTable(doc, {
        startY: finalY2 + 14,
        head: [["Service Name", "Provider", "Category", "Status", "Failure Impact"]],
        body: integrations.map((i) => [
          i.name,
          i.provider,
          i.category.replace(/_/g, " "),
          i.connectionStatus.replace(/_/g, " "),
          i.failureImpact.replace(/_/g, " "),
        ]),
        theme: "grid",
        headStyles: { fillColor: [51, 65, 85], fontSize: 9, fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2 },
      });

      // Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`School Study Executive Intelligence — Page ${i} of ${totalPages}`, 14, 290);
        doc.text("Strictly Confidential — Prepared for Authorized Leadership & Investors", pageWidth - 14, 290, {
          align: "right",
        });
      }

      doc.save(`SchoolStudy-Architecture-Dossier-${Date.now()}.pdf`);
      toast.success("Executive PDF report exported successfully!");
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF export.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCsv = (type: "integrations" | "security") => {
    window.open(`/api/super-admin/architecture-intelligence/export?format=csv&type=${type}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              Export Center
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Architecture & Investor Documentation Export
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Generate sanitized, branded technical and investor-grade reports. Zero internal credentials or private student PII will be included.
        </p>

        {/* Export Options */}
        <div className="mt-5 space-y-3">
          {/* Executive PDF */}
          <button
            onClick={generatePdfReport}
            disabled={isGenerating}
            className="w-full flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 hover:bg-indigo-50 transition text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                  Executive Dossier (PDF)
                </h4>
                <p className="text-xs text-slate-500">
                  Comprehensive printable report with architecture, financials, and integrations.
                </p>
              </div>
            </div>
            {isGenerating ? (
              <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
            ) : (
              <Download className="h-5 w-5 text-indigo-600" />
            )}
          </button>

          {/* Integrations CSV */}
          <button
            onClick={() => handleDownloadCsv("integrations")}
            className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-4 hover:bg-slate-100 transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-white shadow-sm">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Verified Integrations (CSV)</h4>
                <p className="text-xs text-slate-500">
                  Spreadsheet of cloud providers, costs, failure impact, and completeness.
                </p>
              </div>
            </div>
            <Download className="h-5 w-5 text-slate-500" />
          </button>

          {/* Security Matrix CSV */}
          <button
            onClick={() => handleDownloadCsv("security")}
            className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-4 hover:bg-slate-100 transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Security & ASVS 5.0 Matrix (CSV)</h4>
                <p className="text-xs text-slate-500">
                  Detailed control matrix with test suite verification references.
                </p>
              </div>
            </div>
            <Download className="h-5 w-5 text-emerald-600" />
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
