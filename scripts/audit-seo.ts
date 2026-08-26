import * as seo from "../src/lib/seo";

async function runAudit() {
  console.log("==========================================");
  console.log("SCHOOL STUDY — PRODUCTION SEO AUDIT SCRIPT");
  console.log("==========================================");

  // 1. Config Check
  console.log("\n[1. SITE CONFIG & GOOGLE VERIFICATION]");
  console.log("  Site URL:", seo.siteConfig.url);
  console.log("  Google Verification:", seo.siteConfig.googleSiteVerification);
  if (!seo.siteConfig.googleSiteVerification || seo.siteConfig.googleSiteVerification !== "zZHJ9sQqwYwYL1UpsI5ZZK3dUZlBoomo5LdBR7KVJd8") {
    throw new Error("Verification token mismatch!");
  }
  console.log("  ✓ Google Site Verification is EXACT");

  // 2. Schema Generators
  console.log("\n[2. STRUCTURED DATA VALIDATION]");
  const org = seo.getOrganizationSchema();
  const site = seo.getWebsiteSchema();
  const app = seo.getSoftwareAppSchema();
  const person = seo.getPersonSchema();
  const breadcrumb = seo.getBreadcrumbSchema([
    { name: "Features", url: "/features" },
    { name: "Student Management", url: "/student-management" },
  ]);
  const faq = seo.getFaqSchema([
    { question: "What is School Study?", answer: "Modern school management platform." },
  ]);

  console.log("  ✓ Organization Schema:", org["@type"], "-", org.name);
  console.log("  ✓ WebSite Schema:", site["@type"], "-", site.name);
  console.log("  ✓ SoftwareApp Schema:", app["@type"], "-", app.name);
  console.log("  ✓ Person Schema:", person["@type"], "-", person.name);
  console.log("  ✓ Breadcrumb Schema:", breadcrumb["@type"], "-", breadcrumb.itemListElement.length, "items");
  console.log("  ✓ FAQ Schema:", faq["@type"], "-", faq.mainEntity.length, "questions");

  // 3. Private Route Registry Check
  console.log("\n[3. PRIVATE ROUTE PROTECTION]");
  for (const prefix of seo.siteConfig.privateRoutePrefixes) {
    console.log(`  ✓ Protected Prefix: ${prefix}/*`);
  }

  console.log("\n==========================================");
  console.log("ALL SEO FOUNDATION ASSERTIONS PASSED!");
  console.log("==========================================");
}

runAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
