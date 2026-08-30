import type { ReportDataResult, ReportColumnDef } from "@/types/reports";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Sanitizes a cell string against CSV Formula Injection vulnerabilities.
 */
function sanitizeCsvValue(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();

  // If value begins with dangerous formula triggers (=, +, -, @, \t, \r), prepend single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape internal double quotes by doubling them
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Exports report dataset to a valid RFC-4180 CSV with UTF-8 BOM.
 */
export function exportToCsv(dataResult: ReportDataResult): string {
  const headers = dataResult.columns.map((c) => sanitizeCsvValue(c.header)).join(",");
  const rows = dataResult.rows.map((row) =>
    dataResult.columns.map((col) => sanitizeCsvValue(row[col.key] ?? "")).join(",")
  );

  // Prepend UTF-8 BOM so Excel opens UTF-8 encoded characters properly
  const bom = "\uFEFF";
  return bom + [headers, ...rows].join("\r\n");
}

/**
 * Exports report dataset to a real .xlsx Excel binary buffer using XLSX.
 */
export function exportToExcel(dataResult: ReportDataResult): Uint8Array {
  // 1. Prepare worksheet rows
  const sheetData: any[][] = [];

  // Title Header
  sheetData.push([dataResult.title.toUpperCase()]);
  if (dataResult.schoolName) {
    sheetData.push([`Institution: ${dataResult.schoolName}`]);
  }
  sheetData.push([`Generated At: ${new Date(dataResult.generatedAt).toLocaleString("en-IN")}`]);
  sheetData.push([]); // Blank separator

  // Summary Metrics Section
  if (dataResult.summaryMetrics && dataResult.summaryMetrics.length > 0) {
    sheetData.push(["SUMMARY METRICS"]);
    dataResult.summaryMetrics.forEach((m) => {
      sheetData.push([m.label, m.value]);
    });
    sheetData.push([]); // Blank separator
  }

  // Column Headers
  const colHeaders = dataResult.columns.map((c) => c.header);
  sheetData.push(colHeaders);

  // Data Rows
  dataResult.rows.forEach((row) => {
    const r = dataResult.columns.map((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return "";
      return val;
    });
    sheetData.push(r);
  });

  // 2. Create workbook & worksheet
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths based on metadata
  ws["!cols"] = dataResult.columns.map((c) => ({
    wch: Math.max(c.width || 15, c.header.length + 4),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");

  // 3. Write binary buffer
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Uint8Array(excelBuffer);
}

/**
 * Exports report dataset to a real Vector PDF with header, summary cards, and autoTable.
 */
export function exportToPdf(dataResult: ReportDataResult): Uint8Array {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header Banner
  doc.setFillColor(37, 99, 235); // Primary Blue #2563EB
  doc.rect(0, 0, pageWidth, 22, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(dataResult.schoolName || "SCHOOL STUDY PLATFORM", 14, 10);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(dataResult.title, 14, 17);

  doc.setFontSize(8);
  doc.text(
    `Date: ${new Date(dataResult.generatedAt).toLocaleDateString("en-IN")}`,
    pageWidth - 14,
    14,
    { align: "right" }
  );

  let currentY = 28;

  // 2. Summary KPI Metrics Box
  if (dataResult.summaryMetrics && dataResult.summaryMetrics.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("EXECUTIVE SUMMARY", 14, currentY);
    currentY += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    const summaryText = dataResult.summaryMetrics
      .map((m) => `${m.label}: ${m.value}`)
      .join("  |  ");

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, pageWidth - 28, 8, 2, 2, "FD");
    doc.text(summaryText, 18, currentY + 5.5);

    currentY += 13;
  }

  // 3. Data Table using jsPDF-autotable
  const tableHeaders = [dataResult.columns.map((c) => c.header)];
  const tableRows = dataResult.rows.map((row) =>
    dataResult.columns.map((col) => String(row[col.key] ?? "-"))
  );

  autoTable(doc, {
    startY: currentY,
    head: tableHeaders,
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer page number
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${doc.getNumberOfPages()}  •  Generated via School Study SaaS Engine (Confidential)`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: "center" }
      );
    },
  });

  const pdfOutput = doc.output("arraybuffer");
  return new Uint8Array(pdfOutput);
}
