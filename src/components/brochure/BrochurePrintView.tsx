"use client";

/**
 * Dedicated Print View Style Controller for the Digital Brochure
 * Injects print-specific styles ensuring each section maps cleanly to printable pages with zero overflow.
 */
export function BrochurePrintView() {
  return (
    <style jsx global>{`
      @media print {
        /* Hide website navigation, breadcrumbs, table of contents, floating buttons, and global footer */
        header,
        nav,
        footer,
        .print\\:hidden,
        button,
        input,
        textarea {
          display: none !important;
        }

        /* Ensure clean white background and crisp text */
        body,
        main,
        div {
          background: #ffffff !important;
          color: #0f172a !important;
          box-shadow: none !important;
        }

        /* Enforce exact page boundaries on sections */
        section {
          page-break-inside: avoid;
          break-inside: avoid;
          padding-top: 1.5rem !important;
          padding-bottom: 1.5rem !important;
        }

        /* Page break after major sections */
        #section-1-hero,
        #section-2-problem-solution,
        #section-3-architecture,
        #section-4-students,
        #section-5-fees,
        #section-6-attendance,
        #section-7-academics,
        #section-8-communication,
        #section-9-reports,
        #section-10-roles,
        #section-11-why-us {
          page-break-after: always;
          break-after: page;
        }

        /* Remove fixed paddings and max widths for full paper width */
        .max-w-7xl {
          max-width: 100% !important;
          padding-left: 0.5in !important;
          padding-right: 0.5in !important;
        }

        /* Force high quality graphic rendering */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `}</style>
  );
}
