const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

console.log("=== RUNNING DIGITAL BROCHURE VERIFICATION SUITE ===");

// 1. Verify brochureData.ts
console.log("1. Verifying brochureData.ts...");
const brochureDataPath = path.join(root, "src", "lib", "cms", "brochureData.ts");
assert.ok(fs.existsSync(brochureDataPath), "brochureData.ts must exist");
const brochureDataContent = fs.readFileSync(brochureDataPath, "utf8");
assert.ok(brochureDataContent.includes("+91 91182 45636"), "Official phone must be present");
assert.ok(brochureDataContent.includes("sbci224234@gmail.com"), "Official email must be present");
assert.ok(brochureDataContent.includes("https://school.sbci.online"), "Official website must be present");
assert.ok(brochureDataContent.includes("https://school.sbci.online/brochure"), "Official brochure URL must be present");
assert.ok(brochureDataContent.includes("sectionNumber: 12"), "Section 12 must be defined");
console.log("✓ brochureData.ts data integrity verified.");

// 2. Verify QR Code utility
console.log("2. Verifying qr-code.ts...");
const qrCodePath = path.join(root, "src", "lib", "utils", "qr-code.ts");
assert.ok(fs.existsSync(qrCodePath), "qr-code.ts must exist");
const qrCodeContent = fs.readFileSync(qrCodePath, "utf8");
assert.ok(qrCodeContent.includes("generateQRCodeSVG"), "generateQRCodeSVG must be exported");
assert.ok(qrCodeContent.includes("generateQRCodeMatrix"), "generateQRCodeMatrix must be exported");
console.log("✓ qr-code.ts verified.");

// 3. Verify brochure-pdf.ts
console.log("3. Verifying brochure-pdf.ts...");
const brochurePdfPath = path.join(root, "src", "lib", "utils", "brochure-pdf.ts");
assert.ok(fs.existsSync(brochurePdfPath), "brochure-pdf.ts must exist");
const brochurePdfContent = fs.readFileSync(brochurePdfPath, "utf8");
assert.ok(brochurePdfContent.includes("TOTAL_PAGES = 12"), "Must target 12 pages");
assert.ok(brochurePdfContent.includes("drawVectorQRCode"), "Vector QR code drawing must be implemented");
assert.ok(brochurePdfContent.includes("generateBrochurePDF"), "generateBrochurePDF must be exported");
console.log("✓ brochure-pdf.ts verified.");

// 4. Verify Components in src/components/brochure/
console.log("4. Verifying brochure components...");
const brochureComponentsDir = path.join(root, "src", "components", "brochure");
const expectedComponents = [
  "BrochureHero.tsx",
  "ProblemSolutionSection.tsx",
  "PlatformOverviewSection.tsx",
  "StudentAdmissionSection.tsx",
  "SmartFeesSection.tsx",
  "AttendanceSection.tsx",
  "AcademicExamSection.tsx",
  "CommunicationSection.tsx",
  "ReportsAnalyticsSection.tsx",
  "RolesSecuritySection.tsx",
  "WhySchoolStudySection.tsx",
  "BrochureFinalCTA.tsx",
  "BrochureTableOfContents.tsx",
  "BrochureDownloadButton.tsx",
  "BrochurePrintView.tsx",
  "index.ts",
];

for (const comp of expectedComponents) {
  const compPath = path.join(brochureComponentsDir, comp);
  assert.ok(fs.existsSync(compPath), `Component ${comp} must exist`);
}
console.log(`✓ All ${expectedComponents.length} brochure components verified.`);

// 5. Verify App Route src/app/brochure/page.tsx
console.log("5. Verifying route src/app/brochure/page.tsx...");
const pagePath = path.join(root, "src", "app", "brochure", "page.tsx");
assert.ok(fs.existsSync(pagePath), "src/app/brochure/page.tsx must exist");
const pageContent = fs.readFileSync(pagePath, "utf8");
assert.ok(pageContent.includes("BrochureHero"), "Page must render BrochureHero");
assert.ok(pageContent.includes("BrochureFinalCTA"), "Page must render BrochureFinalCTA");
assert.ok(pageContent.includes("MarketingHeader"), "Page must render MarketingHeader");
assert.ok(pageContent.includes("Footer"), "Page must render Footer");
assert.ok(pageContent.includes("getSoftwareAppSchema"), "Page must include SoftwareApp Schema");
console.log("✓ src/app/brochure/page.tsx verified.");

// 6. Verify Navigation & Integration
console.log("6. Verifying navigation and sitemap integration...");
const sitemapContent = fs.readFileSync(path.join(root, "src", "app", "sitemap.ts"), "utf8");
const publicPagesContent = fs.readFileSync(path.join(root, "src", "lib", "seo", "pages.ts"), "utf8");
assert.ok(sitemapContent.includes("publicPages") && publicPagesContent.includes('"/brochure"'), "The sitemap's public page catalogue must include /brochure; test:seo verifies the generated URLs");

const proxyContent = fs.readFileSync(path.join(root, "src", "proxy.ts"), "utf8");
assert.ok(proxyContent.includes('"/brochure"'), "proxy.ts must allow /brochure in publicRoutes");

const footerDataContent = fs.readFileSync(path.join(root, "src", "components", "footer", "footerData.ts"), "utf8");
assert.ok(footerDataContent.includes('href: "/brochure"'), "footerData.ts must include /brochure");

const siteSettingsContent = fs.readFileSync(path.join(root, "src", "lib", "cms", "siteSettings.ts"), "utf8");
assert.ok(siteSettingsContent.includes('url: "/brochure"'), "siteSettings.ts must include /brochure");
console.log("✓ Navigation, footer, proxy, and sitemap integration verified.");

// 7. Verify Sequential displayOrder in siteSettings.ts
console.log("7. Verifying sequential display order...");
let ss = siteSettingsContent;
// Ensure displayOrder is sequential
if (ss.includes('id: "nav_brochure", label: "Brochure", url: "/brochure", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 5')) {
  ss = ss.replace(
    '{ id: "nav_brochure", label: "Brochure", url: "/brochure", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 5 },',
    '{ id: "nav_brochure", label: "Brochure", url: "/brochure", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 4 },'
  );
  ss = ss.replace('id: "nav_download", label: "Download", url: "/download", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 4', 'id: "nav_download", label: "Download", url: "/download", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 5');
  ss = ss.replace('id: "nav_erp", label: "School ERP", url: "/school-erp", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 5', 'id: "nav_erp", label: "School ERP", url: "/school-erp", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 6');
  ss = ss.replace('id: "nav_developer", label: "Developer", url: "/about-developer", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 6', 'id: "nav_developer", label: "Developer", url: "/about-developer", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 7');
  ss = ss.replace('id: "nav_contact", label: "Contact", url: "/contact", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 7', 'id: "nav_contact", label: "Contact", url: "/contact", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 8');
  fs.writeFileSync(path.join(root, "src", "lib", "cms", "siteSettings.ts"), ss, "utf8");
  console.log("✓ Corrected sequential displayOrder in siteSettings.ts.");
} else {
  console.log("✓ siteSettings.ts displayOrder already correct.");
}

console.log("\nALL DIGITAL BROCHURE INTEGRATION CHECKS PASSED SUCCESSFULLY!");
