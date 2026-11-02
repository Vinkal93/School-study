import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BROCHURE_CONTACT,
  BROCHURE_COLORS,
  BROCHURE_SECTIONS,
  PROBLEM_SOLUTION_DATA,
  BROCHURE_KEY_STATS,
  BROCHURE_PRICING_SUMMARY,
} from "@/lib/cms/brochureData";
import { generateQRCodeMatrix } from "@/lib/utils/qr-code";

/**
 * Draw a clean vector QR code on the PDF using native jsPDF rects.
 * Ensures razor-sharp print rendering without bitmap pixelation.
 */
function drawVectorQRCode(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  sizeMm: number,
  colorHex = "#0F172A",
  bgHex = "#FFFFFF"
) {
  const matrix = generateQRCodeMatrix(text);
  const matrixSize = matrix.length;
  const quietZone = 4;
  const totalGrid = matrixSize + quietZone * 2;
  const cellSize = sizeMm / totalGrid;

  // Background box
  doc.setFillColor(bgHex);
  doc.roundedRect(x, y, sizeMm, sizeMm, 2, 2, "F");

  // Foreground modules
  doc.setFillColor(colorHex);
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        const px = x + (c + quietZone) * cellSize;
        const py = y + (r + quietZone) * cellSize;
        doc.rect(px, py, cellSize + 0.05, cellSize + 0.05, "F");
      }
    }
  }
}

/**
 * Standard Running Header for Pages 2 to 12
 */
function drawPageHeader(doc: jsPDF, sectionNumber: number, sectionCategory: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235); // Blue
  doc.text("SCHOOL STUDY", 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`|  SECTION ${String(sectionNumber).padStart(2, "0")} — ${sectionCategory.toUpperCase()}`, 40, 12);

  doc.text("school.sbci.online", 196, 12, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, 15, 196, 15);
}

/**
 * Standard Running Footer for All 12 Pages
 */
function drawPageFooter(doc: jsPDF, pageNumber: number, totalPages = 12) {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, 283, 196, 283);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Official Product Brochure • Contact: ${BROCHURE_CONTACT.phoneDisplay} | ${BROCHURE_CONTACT.email}`,
    14,
    289
  );

  doc.setFont("helvetica", "bold");
  doc.text(`Page ${pageNumber} of ${totalPages}`, 196, 289, { align: "right" });
}

/**
 * Standard Section Title Block for Internal Pages
 */
function drawSectionHeader(
  doc: jsPDF,
  badgeText: string,
  titleText: string,
  subtitleText: string,
  descText: string,
  startY = 24
): number {
  // Badge Pill
  doc.setFillColor(238, 242, 255); // Indigo light
  doc.roundedRect(14, startY, 52, 6, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(37, 99, 235);
  doc.text(badgeText.toUpperCase(), 17, startY + 4.2);

  // Main Section Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(16, 42, 67); // Navy
  doc.text(titleText, 14, startY + 13);

  // Subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(13, 148, 136); // Teal
  doc.text(subtitleText, 14, startY + 19);

  // Short Paragraph
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate
  const splitDesc = doc.splitTextToSize(descText, 182);
  doc.text(splitDesc, 14, startY + 25);

  return startY + 26 + splitDesc.length * 4;
}

/**
 * Main Generator Function: Generates a 12-page vector PDF
 */
export async function generateBrochurePDF(): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const TOTAL_PAGES = 12;

  // =========================================================================
  // PAGE 1: COVER / HERO PAGE
  // =========================================================================
  {
    // Deep Navy Header Box with stylish diagonal cut accent
    doc.setFillColor(16, 42, 67); // #102A43
    doc.rect(0, 0, 210, 112, "F");

    // Decorative Royal Blue Strip
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 112, 210, 4, "F");

    // Official Badge Pill
    doc.setFillColor(30, 58, 138); // Dark blue pill
    doc.roundedRect(14, 16, 76, 7, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(147, 197, 253);
    doc.text("OFFICIAL PRODUCT BROCHURE 2026", 18, 20.8);

    // Platform Brand & Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("School Study", 14, 35);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(56, 189, 248); // Sky blue
    doc.text("Smart School Management & Cloud ERP Platform", 14, 43);

    // Cover Tagline & Value Statement
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(226, 232, 240);
    const coverDesc = doc.splitTextToSize(
      "The comprehensive, secure, and intuitive cloud platform engineered for modern educational institutions. Streamline student admissions, automate fee collection, accelerate daily roll-call in under 30 seconds, and connect administrators, teachers, and parents in real time.",
      182
    );
    doc.text(coverDesc, 14, 52);

    // Cover Highlights Pills inside Hero
    const highlights = [
      "100% Cloud-Native SaaS",
      "Instant 24h Paperless Setup",
      "Zero Server Hardware Needed",
      "Strict Multi-Tenant Isolation",
    ];
    let pillX = 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    highlights.forEach((h) => {
      const textWidth = doc.getTextWidth(h);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pillX, 74, textWidth + 6, 6, 2, 2, "F");
      doc.setTextColor(16, 42, 67);
      doc.text(h, pillX + 3, 78.2);
      pillX += textWidth + 9;
    });

    // Contact summary banner inside hero bottom
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(
      `Official Website: ${BROCHURE_CONTACT.websiteUrl}  |  Direct Support: ${BROCHURE_CONTACT.phoneDisplay}`,
      14,
      94
    );
    doc.text(
      `Official Inquiries: ${BROCHURE_CONTACT.email}  |  Serving Schools Pan-India`,
      14,
      101
    );

    // 4 Key Metric Cards (Middle Page)
    const metricsStartY = 126;
    const cardWidth = 43;
    const cardGap = 3.3;

    BROCHURE_KEY_STATS.forEach((stat, idx) => {
      const cx = 14 + idx * (cardWidth + cardGap);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cx, metricsStartY, cardWidth, 26, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(37, 99, 235);
      doc.text(stat.value, cx + 5, metricsStartY + 9);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(stat.label, cx + 5, metricsStartY + 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      const sub = doc.splitTextToSize(stat.subtext, cardWidth - 8);
      doc.text(sub, cx + 5, metricsStartY + 20);
    });

    // Middle Informational Box: What this brochure contains
    const tocStartY = 160;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, tocStartY, 182, 54, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(16, 42, 67);
    doc.text("What's Inside This Comprehensive Product Brochure", 20, tocStartY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    const leftToc = [
      "01. Executive Cover & Key Metrics",
      "02. The Problem & Modern Cloud Solution",
      "03. Architecture & Multi-Tenant Security",
      "04. Student Lifecycle & Admissions",
      "05. Smart Fee Management & Billing",
      "06. Smart Attendance & Roll-Call",
    ];
    const rightToc = [
      "07. Academic Planning & Timetables",
      "08. Communication & Campus Notice Board",
      "09. Executive Reports & Live Analytics",
      "10. Multi-Role Portals & Governance",
      "11. Why School Study? (ROI & Pricing)",
      "12. Getting Started, Demo & Contacts",
    ];

    leftToc.forEach((item, i) => {
      doc.text(`•  ${item}`, 20, tocStartY + 16 + i * 5.8);
    });
    rightToc.forEach((item, i) => {
      doc.text(`•  ${item}`, 106, tocStartY + 16 + i * 5.8);
    });

    // Lower Card: QR Code & Live Access
    const qrBoxY = 222;
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(14, qrBoxY, 182, 52, 3, 3, "FD");

    // Draw Vector QR Code
    drawVectorQRCode(doc, BROCHURE_CONTACT.brochureUrl, 20, qrBoxY + 6, 40, "#102A43", "#FFFFFF");

    // QR Description
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(16, 42, 67);
    doc.text("Scan to View Live Interactive Digital Brochure", 68, qrBoxY + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const qrNotes = doc.splitTextToSize(
      "Point your smartphone camera at this QR code to access the interactive web version of this brochure, explore feature walkthroughs, view video previews, and initiate an instant live demo request via WhatsApp.",
      120
    );
    doc.text(qrNotes, 68, qrBoxY + 21);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235);
    doc.text(`URL: ${BROCHURE_CONTACT.brochureUrl}`, 68, qrBoxY + 38);

    drawPageFooter(doc, 1, TOTAL_PAGES);
  }

  // =========================================================================
  // PAGE 2: SECTION 2 — THE PROBLEM & MODERN SOLUTION
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 2, "Operational Transformation");

    const startY = drawSectionHeader(
      doc,
      "Section 02 — Executive Comparison",
      BROCHURE_SECTIONS.problemSolution.title,
      BROCHURE_SECTIONS.problemSolution.subtitle,
      BROCHURE_SECTIONS.problemSolution.description
    );

    // AutoTable for Problem vs Solution Matrix
    const tableBody = PROBLEM_SOLUTION_DATA.map((item) => [
      item.traditionalPain + "\n" + item.traditionalDetail,
      item.schoolStudySolution + "\n" + item.schoolStudyDetail,
      item.impactMetric,
    ]);

    autoTable(doc, {
      startY: startY + 3,
      head: [["Traditional Paper / Excel Chaos", "School Study Modern Cloud Solution", "Measurable Impact"]],
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: [16, 42, 67],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "left",
      },
      columnStyles: {
        0: { cellWidth: 70, textColor: [185, 28, 28], fontStyle: "normal" }, // Red/dark slate
        1: { cellWidth: 80, textColor: [15, 23, 42], fontStyle: "normal" },
        2: { cellWidth: 32, textColor: [13, 148, 136], fontStyle: "bold", halign: "center" }, // Teal
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 3.5,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      margin: { left: 14, right: 14 },
    });

    drawPageFooter(doc, 2, TOTAL_PAGES);
  }

  // =========================================================================
  // PAGE 3: SECTION 3 — PLATFORM ARCHITECTURE & SECURITY
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 3, "Cloud Architecture & Security");

    const startY = drawSectionHeader(
      doc,
      "Section 03 — Infrastructure & Reliability",
      BROCHURE_SECTIONS.platformArchitecture.title,
      BROCHURE_SECTIONS.platformArchitecture.subtitle,
      BROCHURE_SECTIONS.platformArchitecture.description
    );

    // 4 Architecture Pillars in 2x2 Grid
    const pillars = [
      {
        title: "Multi-Tenant Data Partitioning",
        desc: "Each school's records (students, fees, attendance, staff) are strictly isolated with database-level security rules. Zero cross-institution data exposure is mathematically guaranteed.",
        tech: "Firebase Multi-Tenant Rules",
      },
      {
        title: "High-Performance Modern Web Core",
        desc: "Engineered on Next.js 16 App Router with server-side security, lightning-fast client transitions, and minimal JS footprint (< 410 KB) for instant loading on 4G/5G networks.",
        tech: "Next.js 16 • React 19 • Turbopack",
      },
      {
        title: "Cross-Device Responsive & PWA",
        desc: "Zero installation headaches. Accessible on any Android/iOS smartphone, Chromebook, Windows PC, or Mac. Teachers mark roll-call from their phones while accountants work on desktops.",
        tech: "PWA • Mobile Optimized Touch UI",
      },
      {
        title: "Bank-Grade Encryption & Audit Trails",
        desc: "256-bit SSL/TLS encryption for all communications. Critical administrative actions, fee edits, and student record modifications are logged with tamper-evident audit trails.",
        tech: "256-Bit SSL • Automated Cloud Backups",
      },
    ];

    const boxW = 88;
    const boxH = 46;

    pillars.forEach((p, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = 14 + col * (boxW + 6);
      const by = startY + 6 + row * (boxH + 6);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(bx, by, boxW, boxH, 2.5, 2.5, "FD");

      // Pillar Tag
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(37, 99, 235);
      doc.text(p.tech.toUpperCase(), bx + 5, by + 7);

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(16, 42, 67);
      doc.text(p.title, bx + 5, by + 14);

      // Desc
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const sDesc = doc.splitTextToSize(p.desc, boxW - 10);
      doc.text(sDesc, bx + 5, by + 21);
    });

    // Technical Architecture Diagram / Comparison Banner
    const bannerY = startY + 116;
    doc.setFillColor(16, 42, 67);
    doc.roundedRect(14, bannerY, 182, 54, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Guaranteed SLA & Infrastructure Availability", 20, bannerY + 10);

    const points = [
      "99.9% Cloud Availability backed by Google Cloud & Firebase global CDN edge network.",
      "Redundant daily automated cloud snapshots preventing any loss of student historical data.",
      "Instant vertical and horizontal auto-scaling accommodating admissions rush and exam periods.",
      "Zero on-premise hardware maintenance fees, UPS backup costs, or local server crash risks.",
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    points.forEach((pt, i) => {
      doc.text(`✓  ${pt}`, 20, bannerY + 20 + i * 7.5);
    });

    drawPageFooter(doc, 3, TOTAL_PAGES);
  }

  // =========================================================================
  // PAGE 4: SECTION 4 — STUDENT & ADMISSIONS MANAGEMENT
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 4, "Student & Admissions");

    const startY = drawSectionHeader(
      doc,
      "Section 04 — Core Module",
      BROCHURE_SECTIONS.studentAdmissions.title,
      BROCHURE_SECTIONS.studentAdmissions.subtitle,
      BROCHURE_SECTIONS.studentAdmissions.description
    );

    const features = BROCHURE_SECTIONS.studentAdmissions.features || [];
    features.forEach((feat, idx) => {
      const fy = startY + 4 + idx * 56;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, fy, 182, 50, 2.5, 2.5, "FD");

      // Feature Number Badge
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(20, fy + 6, 24, 6, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(`CAPABILITY 0${idx + 1}`, 22, fy + 10.2);

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(16, 42, 67);
      doc.text(feat.title, 48, fy + 11);

      // Description
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const splitText = doc.splitTextToSize(feat.description, 168);
      doc.text(splitText, 20, fy + 20);

      // Benefits Checklist
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(13, 148, 136); // Teal
      feat.benefits.forEach((b, bIdx) => {
        doc.text(`✓  ${b}`, 20 + bIdx * 56, fy + 42);
      });
    });

    drawPageFooter(doc, 4, TOTAL_PAGES);
  }

  // =========================================================================
  // PAGE 5: SECTION 5 — SMART FEES & BILLING
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 5, "Smart Fees & Billing");

    const startY = drawSectionHeader(
      doc,
      "Section 05 — Financial Operations",
      BROCHURE_SECTIONS.smartFees.title,
      BROCHURE_SECTIONS.smartFees.subtitle,
      BROCHURE_SECTIONS.smartFees.description
    );

    const features = BROCHURE_SECTIONS.smartFees.features || [];
    features.forEach((feat, idx) => {
      const fy = startY + 4 + idx * 56;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, fy, 182, 50, 2.5, 2.5, "FD");

      doc.setFillColor(13, 148, 136); // Teal badge
      doc.roundedRect(20, fy + 6, 24, 6, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(`FINANCE 0${idx + 1}`, 23, fy + 10.2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(16, 42, 67);
      doc.text(feat.title, 48, fy + 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const splitText = doc.splitTextToSize(feat.description, 168);
      doc.text(splitText, 20, fy + 20);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(37, 99, 235);
      feat.benefits.forEach((b, bIdx) => {
        doc.text(`✓  ${b}`, 20 + bIdx * 56, fy + 42);
      });
    });

    drawPageFooter(doc, 5, TOTAL_PAGES);
  }

  // =========================================================================
  // PAGE 6: SECTION 6 — ATTENDANCE & ROLL-CALL AUTOMATION
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 6, "Attendance & Roll-Call");

    const startY = drawSectionHeader(
      doc,
      "Section 06 — Daily Classroom Operations",
      BROCHURE_SECTIONS.attendance.title,
      BROCHURE_SECTIONS.attendance.subtitle,
      BROCHURE_SECTIONS.attendance.description
    );

    const features = BROCHURE_SECTIONS.attendance.features || [];
    features.forEach((feat, idx) => {
      const fy = startY + 4 + idx * 56;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, fy, 182, 50, 2.5, 2.5, "FD");

      doc.setFillColor(37, 99, 235);
      doc.roundedRect(20, fy + 6, 24, 6, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(`ROLL-CALL 0${idx + 1}`, 22, fy + 10.2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(16, 42, 67);
      doc.text(feat.title, 48, fy + 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const splitText = doc.splitTextToSize(feat.description, 168);
      doc.text(splitText, 20, fy + 20);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(13, 148, 136);
      feat.benefits.forEach((b, bIdx) => {
        doc.text(`✓  ${b}`, 20 + bIdx * 56, fy + 42);
      });
    });

    drawPageFooter(doc, 6, TOTAL_PAGES);
  }

  // =========================================================================
  // PAGE 7: SECTION 7 — ACADEMICS, TIMETABLES & EXAMS
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 7, "Academics & Timetables");

    const startY = drawSectionHeader(
      doc,
      "Section 07 — Curriculum & Evaluation",
      BROCHURE_SECTIONS.academics.title,
      BROCHURE_SECTIONS.academics.subtitle,
      BROCHURE_SECTIONS.academics.description
    );

    const features = BROCHURE_SECTIONS.academics.features || [];
    features.forEach((feat, idx) => {
      const fy = startY + 4 + idx * 56;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, fy, 182, 50, 2.5, 2.5, "FD");

      doc.setFillColor(99, 102, 241); // Indigo
      doc.roundedRect(20, fy + 6, 24, 6, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(`ACADEMIC 0${idx + 1}`, 22, fy + 10.2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(16, 42, 67);
      doc.text(feat.title, 48, fy + 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const splitText = doc.splitTextToSize(feat.description, 168);
      doc.text(splitText, 20, fy + 20);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(37, 99, 235);
      feat.benefits.forEach((b, bIdx) => {
        doc.text(`✓  ${b}`, 20 + bIdx * 56, fy + 42);
      });
    });

    drawPageFooter(doc, 7, TOTAL_PAGES);
  }

  // =========================================================================
  // PAGE 8: SECTION 8 — COMMUNICATION & NOTICE BOARD
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 8, "Communication & Notice Board");

    const startY = drawSectionHeader(
      doc,
      "Section 08 — Institutional Communication",
      BROCHURE_SECTIONS.communication.title,
      BROCHURE_SECTIONS.communication.subtitle,
      BROCHURE_SECTIONS.communication.description
    );

    const features = BROCHURE_SECTIONS.communication.features || [];
    features.forEach((feat, idx) => {
      const fy = startY + 4 + idx * 56;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, fy, 182, 50, 2.5, 2.5, "FD");

      doc.setFillColor(217, 119, 6); // Amber
      doc.roundedRect(20, fy + 6, 24, 6, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(`NOTICE 0${idx + 1}`, 24, fy + 10.2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(16, 42, 67);
      doc.text(feat.title, 48, fy + 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const splitText = doc.splitTextToSize(feat.description, 168);
      doc.text(splitText, 20, fy + 20);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(13, 148, 136);
      feat.benefits.forEach((b, bIdx) => {
        doc.text(`✓  ${b}`, 20 + bIdx * 56, fy + 42);
      });
    });

    drawPageFooter(doc, 8, TOTAL_PAGES);
  }

  // =========================================================================
  // PAGE 9: SECTION 9 — REPORTS, DASHBOARDS & ANALYTICS
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 9, "Reports & Analytics");

    const startY = drawSectionHeader(
      doc,
      "Section 09 — Decision Intelligence",
      BROCHURE_SECTIONS.reportsAnalytics.title,
      BROCHURE_SECTIONS.reportsAnalytics.subtitle,
      BROCHURE_SECTIONS.reportsAnalytics.description
    );

    const features = BROCHURE_SECTIONS.reportsAnalytics.features || [];
    features.forEach((feat, idx) => {
      const fy = startY + 4 + idx * 56;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, fy, 182, 50, 2.5, 2.5, "FD");

      doc.setFillColor(37, 99, 235);
      doc.roundedRect(20, fy + 6, 24, 6, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(`ANALYTICS 0${idx + 1}`, 21, fy + 10.2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(16, 42, 67);
      doc.text(feat.title, 48, fy + 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const splitText = doc.splitTextToSize(feat.description, 168);
      doc.text(splitText, 20, fy + 20);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(13, 148, 136);
      feat.benefits.forEach((b, bIdx) => {
        doc.text(`✓  ${b}`, 20 + bIdx * 56, fy + 42);
      });
    });

    drawPageFooter(doc, 9, TOTAL_PAGES);
  }

  // =========================================================================
  // PAGE 10: SECTION 10 — ROLES & PORTALS HIERARCHY
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 10, "Role Portals & Security");

    const startY = drawSectionHeader(
      doc,
      "Section 10 — Least-Privilege Architecture",
      BROCHURE_SECTIONS.rolesSecurity.title,
      BROCHURE_SECTIONS.rolesSecurity.subtitle,
      BROCHURE_SECTIONS.rolesSecurity.description
    );

    const portals = BROCHURE_SECTIONS.rolesSecurity.features || [];
    const boxW = 88;
    const boxH = 48;

    portals.forEach((p, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = 14 + col * (boxW + 6);
      const by = startY + 6 + row * (boxH + 6);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(bx, by, boxW, boxH, 2.5, 2.5, "FD");

      // Badge
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(37, 99, 235);
      doc.text(`ROLE PORTAL 0${idx + 1}`, bx + 5, by + 7);

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(16, 42, 67);
      doc.text(p.title, bx + 5, by + 14);

      // Description
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const splitDesc = doc.splitTextToSize(p.description, boxW - 10);
      doc.text(splitDesc, bx + 5, by + 21);

      // Capabilities
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(13, 148, 136);
      p.benefits.forEach((b, bIdx) => {
        doc.text(`✓ ${b}`, bx + 5, by + 34 + bIdx * 4);
      });
    });

    // Security Guarantee Box at bottom
    const secBoxY = startY + 120;
    doc.setFillColor(16, 42, 67);
    doc.roundedRect(14, secBoxY, 182, 48, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("Guaranteed Least-Privilege Role Isolation", 20, secBoxY + 10);

    const secPoints = [
      "No student can ever access teacher grading or another family's fee ledger.",
      "Teachers are restricted strictly to their assigned class rosters and timetable periods.",
      "Institutional financial summaries and fee structure modifications require School Admin authorization.",
      "Global platform settings and SaaS tenant provisioning are isolated in the Super Admin gateway.",
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(226, 232, 240);
    secPoints.forEach((sp, i) => {
      doc.text(`✓  ${sp}`, 20, secBoxY + 19 + i * 6.8);
    });

    drawPageFooter(doc, 10, TOTAL_PAGES);
  }

  // =========================================================================
  // PAGE 11: SECTION 11 — WHY SCHOOL STUDY & PRICING
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 11, "Institutional Value & Plans");

    const startY = drawSectionHeader(
      doc,
      "Section 11 — Return On Investment",
      BROCHURE_SECTIONS.whySchoolStudy.title,
      BROCHURE_SECTIONS.whySchoolStudy.subtitle,
      BROCHURE_SECTIONS.whySchoolStudy.description
    );

    // 3 Pricing Tiers Cards
    const tierW = 58;
    const tierH = 92;

    BROCHURE_PRICING_SUMMARY.forEach((plan, idx) => {
      const tx = 14 + idx * (tierW + 4);
      const isPop = idx === 1;

      if (isPop) {
        doc.setFillColor(238, 242, 255);
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.6);
      } else {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
      }
      doc.roundedRect(tx, startY + 4, tierW, tierH, 3, 3, "FD");

      // Badge
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      if (isPop) {
        doc.setTextColor(37, 99, 235);
      } else {
        doc.setTextColor(100, 116, 139);
      }
      doc.text(plan.badge.toUpperCase(), tx + 5, startY + 11);

      // Plan Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(16, 42, 67);
      doc.text(plan.plan, tx + 5, startY + 19);

      // Student Capacity
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(13, 148, 136);
      doc.text(plan.students, tx + 5, startY + 25);

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(tx + 5, startY + 28, tx + tierW - 5, startY + 28);

      // Features list
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      plan.features.forEach((feat, fIdx) => {
        doc.text(`✓ ${feat}`, tx + 5, startY + 34 + fIdx * 8.5);
      });
    });

    // Key Differentiators Strip
    const diffY = startY + 106;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, diffY, 182, 54, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(16, 42, 67);
    doc.text("The School Study Advantage Over Traditional Software", 20, diffY + 9);

    const diffs = [
      "Zero Expensive Server Purchases: No ₹1,50,000+ local server hardware or AMC fees required.",
      "Instant 24-Hour Go-Live: Migrate your students easily using our bulk CSV import assistant.",
      "Dedicated Personal Assistance: Direct WhatsApp & phone support with senior software engineers.",
      "Automatic Feature Upgrades: Continuous software improvements delivered at zero additional cost.",
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    diffs.forEach((d, dIdx) => {
      doc.text(`✓  ${d}`, 20, diffY + 18 + dIdx * 8.5);
    });

    drawPageFooter(doc, 11, TOTAL_PAGES);
  }

  // =========================================================================
  // PAGE 12: SECTION 12 — DEMO, NEXT STEPS & CONTACT
  // =========================================================================
  {
    doc.addPage();
    drawPageHeader(doc, 12, "Next Steps & Live Demo");

    const startY = drawSectionHeader(
      doc,
      "Section 12 — Direct Contacts & Onboarding",
      BROCHURE_SECTIONS.finalCta.title,
      BROCHURE_SECTIONS.finalCta.subtitle,
      BROCHURE_SECTIONS.finalCta.description
    );

    // Left Column: 3 Contact Cards
    const contactCards = [
      {
        title: "Official WhatsApp Support",
        detail: BROCHURE_CONTACT.phoneDisplay,
        sub: "Instant response for live demos and pricing quotes",
        action: `wa.me/${BROCHURE_CONTACT.whatsappNumber}`,
      },
      {
        title: "Direct Phone Inquiries",
        detail: BROCHURE_CONTACT.phoneDisplay,
        sub: "Speak directly with our product implementation lead",
        action: "Mon-Sat: 9:00 AM – 7:00 PM IST",
      },
      {
        title: "Official Business Email",
        detail: BROCHURE_CONTACT.email,
        sub: "Institutional RFP, quotations, and official notices",
        action: "Response guaranteed within 24 hours",
      },
    ];

    const cardW = 100;
    const cardH = 34;

    contactCards.forEach((c, cIdx) => {
      const cy = startY + 4 + cIdx * (cardH + 4);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, cy, cardW, cardH, 2.5, 2.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(37, 99, 235);
      doc.text(c.title, 19, cy + 8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(16, 42, 67);
      doc.text(c.detail, 19, cy + 17);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(c.sub, 19, cy + 24);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(13, 148, 136);
      doc.text(c.action, 19, cy + 30);
    });

    // Right Column: QR Code Box to Live Brochure & Demo
    const qrBoxX = 120;
    const qrBoxY = startY + 4;
    const qrBoxW = 76;
    const qrBoxH = 110;

    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 3, 3, "FD");

    // Draw Vector QR Code
    drawVectorQRCode(doc, BROCHURE_CONTACT.brochureUrl, qrBoxX + 13, qrBoxY + 8, 50, "#102A43", "#FFFFFF");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(16, 42, 67);
    doc.text("Scan for Live Demo", qrBoxX + 16, qrBoxY + 66);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const qNotes = doc.splitTextToSize(
      "Scan this QR code to access the web brochure or book a personalized 1-on-1 walkthrough.",
      qrBoxW - 12
    );
    doc.text(qNotes, qrBoxX + 6, qrBoxY + 73);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(37, 99, 235);
    doc.text("school.sbci.online/brochure", qrBoxX + 10, qrBoxY + 98);

    // 3-Step Implementation Roadmap at Bottom
    const roadY = startY + 120;
    doc.setFillColor(16, 42, 67);
    doc.roundedRect(14, roadY, 182, 46, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("Your 3-Step Path to a Modern School", 20, roadY + 9);

    const steps = [
      { num: "01", title: "Schedule Live Demo", desc: "Contact via WhatsApp to see the software configured for your school." },
      { num: "02", title: "Bulk Import Rosters", desc: "Upload student, class, and teacher rosters with our CSV assistant." },
      { num: "03", title: "Go Live in 24 Hours", desc: "Start digital roll-call and fee receipts immediately with staff guidance." },
    ];

    steps.forEach((st, sIdx) => {
      const sx = 20 + sIdx * 58;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(56, 189, 248);
      doc.text(`STEP ${st.num}: ${st.title}`, sx, roadY + 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(203, 213, 225);
      const splitSt = doc.splitTextToSize(st.desc, 54);
      doc.text(splitSt, sx, roadY + 24);
    });

    drawPageFooter(doc, 12, TOTAL_PAGES);
  }

  return doc;
}
