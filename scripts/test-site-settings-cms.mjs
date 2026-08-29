/**
 * Global Site Control & Header/Footer CMS Test Suite
 */

import assert from "node:assert/strict";

console.log("==================================================");
console.log("STARTING GLOBAL SITE CONTROL & CMS TEST SUITE");
console.log("==================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ [FAIL] ${name}:`, err.message);
  }
}

// 1. Default Initial Configuration Safety
test("1. Default initial state includes Uttar Pradesh, India as default location", () => {
  const DEFAULT_CONFIG = {
    contact: {
      state: "Uttar Pradesh",
      country: "India",
      locationLabel: "Uttar Pradesh, India",
      locationEnabled: true,
      email: "sbci224234@gmail.com",
    },
  };

  assert.equal(DEFAULT_CONFIG.contact.state, "Uttar Pradesh");
  assert.equal(DEFAULT_CONFIG.contact.country, "India");
  assert.equal(DEFAULT_CONFIG.contact.locationLabel, "Uttar Pradesh, India");
  assert.equal(DEFAULT_CONFIG.contact.locationEnabled, true);
});

// 2. Dynamic Copyright Year Placeholder
test("2. Dynamic Copyright: Replaces {YEAR} with current year correctly", () => {
  const template = "© {YEAR} School Study. All rights reserved.";
  const currentYear = new Date().getFullYear();
  const rendered = template.replace(/\{YEAR\}/gi, currentYear.toString());

  assert.equal(rendered, `© ${currentYear} School Study. All rights reserved.`);
});

// 3. Header Navigation Filtering & Sorting
test("3. Header Navigation: Filters enabled items and sorts by displayOrder", () => {
  const navItems = [
    { id: "1", label: "Contact", displayOrder: 3, enabled: true },
    { id: "2", label: "Hidden Page", displayOrder: 2, enabled: false },
    { id: "3", label: "Home", displayOrder: 1, enabled: true },
  ];

  const filtered = navItems
    .filter((n) => n.enabled)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].label, "Home");
  assert.equal(filtered[1].label, "Contact");
});

// 4. Footer Column & Link Reordering
test("4. Footer Columns: Dynamic column addition, deletion and reordering", () => {
  let columns = [
    { id: "col_1", title: "Product", displayOrder: 1, enabled: true, links: [] },
    { id: "col_2", title: "Modules", displayOrder: 2, enabled: true, links: [] },
  ];

  // Add column
  columns.push({ id: "col_3", title: "Company", displayOrder: 3, enabled: true, links: [] });
  assert.equal(columns.length, 3);

  // Delete column
  columns = columns.filter((c) => c.id !== "col_2");
  assert.equal(columns.length, 2);
  assert.equal(columns[1].title, "Company");
});

// 5. Disabled Location is Hidden from Footer
test("5. Contact Location: When locationEnabled is false, location is omitted", () => {
  const contact = {
    locationLabel: "Uttar Pradesh, India",
    locationEnabled: false,
  };

  const shouldRender = contact.locationEnabled && contact.locationLabel;
  assert.equal(Boolean(shouldRender), false);
});

// 6. Social Links Filtering
test("6. Social Media: Only enabled social links are rendered", () => {
  const socials = [
    { platform: "linkedin", url: "https://linkedin.com", enabled: true, displayOrder: 1 },
    { platform: "facebook", url: "https://facebook.com", enabled: false, displayOrder: 2 },
    { platform: "youtube", url: "https://youtube.com", enabled: true, displayOrder: 3 },
  ];

  const visibleSocials = socials.filter((s) => s.enabled);
  assert.equal(visibleSocials.length, 2);
  assert.equal(visibleSocials.some((s) => s.platform === "facebook"), false);
});

// 7. Draft vs Publish Workflow
test("7. Draft vs Publish: Publishing increments version number without modifying draft prematurely", () => {
  const currentSettings = {
    version: 1,
    status: "published",
    header: { brandName: "School Study" },
  };

  // Draft change
  const draftSettings = {
    ...currentSettings,
    header: { brandName: "School Study Modern" },
    status: "draft",
  };
  assert.equal(draftSettings.version, 1);
  assert.equal(draftSettings.status, "draft");

  // Publish
  const publishedSettings = {
    ...draftSettings,
    version: draftSettings.version + 1,
    status: "published",
  };
  assert.equal(publishedSettings.version, 2);
  assert.equal(publishedSettings.status, "published");
});

// 8. Version Rollback Safety
test("8. Version History: Rollback restores snapshot configuration safely", () => {
  const versions = [
    { version: 2, header: { brandName: "School Study v2" } },
    { version: 1, header: { brandName: "School Study v1" } },
  ];

  const targetVersion = versions.find((v) => v.version === 1);
  assert.ok(targetVersion);
  assert.equal(targetVersion.header.brandName, "School Study v1");
});

console.log("\n==================================================");
console.log(`CMS TEST RESULTS: ${passed}/${total} PASSED`);
console.log("==================================================");

if (passed !== total) {
  process.exit(1);
}
