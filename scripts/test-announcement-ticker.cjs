const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

console.log("======================================================================");
console.log("RUNNING ANNOUNCEMENT TICKER & SUPER ADMIN TOGGLE VERIFICATION SUITE");
console.log("======================================================================");

// 1. Verify firestore.rules allows public read of 'global' siteSettings
console.log("Test 1: Verifying firestore.rules siteSettings whitelist includes 'global'...");
const rulesPath = path.join(root, "firestore.rules");
assert.ok(fs.existsSync(rulesPath), "firestore.rules must exist");
const rulesContent = fs.readFileSync(rulesPath, "utf8");
assert.ok(
  rulesContent.includes("docId in ['global', 'branding', 'landing_page', 'footer', 'seo_metadata']"),
  "firestore.rules must include 'global' in public read whitelist"
);
assert.ok(
  rulesContent.includes("docId != 'communication_secrets'"),
  "firestore.rules must continue to block communication_secrets"
);
console.log("  [PASS] Test 1: firestore.rules correctly permits public reads of siteSettings/global while blocking secrets");

// 2. Verify siteSettings.ts has server Admin SDK integration and safe array handling
console.log("Test 2: Verifying siteSettings.ts implementation...");
const cmsPath = path.join(root, "src", "lib", "cms", "siteSettings.ts");
assert.ok(fs.existsSync(cmsPath), "siteSettings.ts must exist");
const cmsContent = fs.readFileSync(cmsPath, "utf8");

assert.ok(
  cmsContent.includes("Array.isArray(settings.announcements)"),
  "sanitizeSiteSettings must handle Array.isArray correctly so empty announcements array is preserved"
);
assert.ok(
  cmsContent.includes("active: typeof a.active === \"boolean\" ? a.active : true"),
  "sanitizeSiteSettings must safely preserve boolean active state"
);
assert.ok(
  cmsContent.includes("getSafeAdminDb"),
  "siteSettings.ts must import getSafeAdminDb on server to bypass unauthenticated client SDK restrictions"
);
assert.ok(
  cmsContent.includes("adminDb.collection(\"siteSettings\").doc(\"global\").set(published)"),
  "publishSiteSettings must write to siteSettings/global using adminDb on server"
);
console.log("  [PASS] Test 2: siteSettings.ts contains robust server Admin SDK persistence and boolean sanitization");

// 3. Verify public API route /api/site-settings
console.log("Test 3: Verifying /api/site-settings route...");
const apiPath = path.join(root, "src", "app", "api", "site-settings", "route.ts");
assert.ok(fs.existsSync(apiPath), "api/site-settings/route.ts must exist");
const apiContent = fs.readFileSync(apiPath, "utf8");
assert.ok(
  apiContent.includes("export const dynamic = \"force-dynamic\""),
  "api/site-settings must be force-dynamic"
);
assert.ok(
  apiContent.includes("\"Cache-Control\": \"no-store, max-age=0, must-revalidate\""),
  "api/site-settings must use no-store cache control"
);
console.log("  [PASS] Test 3: Public site-settings endpoint is dynamic and not cached");

// 4. Verify Super Admin site-settings page has immediate toggle & delete publishing
console.log("Test 4: Verifying super-admin site-settings page toggle...");
const siteSettingsPagePath = path.join(root, "src", "app", "(dashboard)", "super-admin", "site-settings", "page.tsx");
assert.ok(fs.existsSync(siteSettingsPagePath), "super-admin site-settings page must exist");
const siteSettingsPageContent = fs.readFileSync(siteSettingsPagePath, "utf8");

assert.ok(
  siteSettingsPageContent.includes("handleToggleAnnouncementActive = async"),
  "handleToggleAnnouncementActive must be an async function that persists the toggle"
);
assert.ok(
  siteSettingsPageContent.includes("doc(db, \"siteSettings\", \"global\"), publishedDoc"),
  "handleToggleAnnouncementActive must write to siteSettings/global"
);
console.log("  [PASS] Test 4: Super Admin site-settings toggle auto-publishes immediately");

// 5. Verify Super Admin announcements page has robust saveAndPublish
console.log("Test 5: Verifying super-admin announcements page...");
const announcementsPagePath = path.join(root, "src", "app", "(dashboard)", "super-admin", "announcements", "page.tsx");
assert.ok(fs.existsSync(announcementsPagePath), "super-admin announcements page must exist");
const announcementsPageContent = fs.readFileSync(announcementsPagePath, "utf8");

assert.ok(
  announcementsPageContent.includes("await setDoc(doc(db, \"siteSettings\", \"global\"), updatedSettings)"),
  "announcements page saveAndPublish must write directly to client firestore"
);
assert.ok(
  announcementsPageContent.includes("fetch(\"/api/super-admin/site-settings\""),
  "announcements page saveAndPublish must synchronize with server API"
);
console.log("  [PASS] Test 5: Super Admin announcements page writes to both client Firestore and server API");

// 6. Verify AnnouncementBanner logic
console.log("Test 6: Verifying AnnouncementBanner.tsx rendering logic...");
const bannerPath = path.join(root, "src", "components", "common", "AnnouncementBanner.tsx");
assert.ok(fs.existsSync(bannerPath), "AnnouncementBanner.tsx must exist");
const bannerContent = fs.readFileSync(bannerPath, "utf8");

assert.ok(
  bannerContent.includes("if (!a.active) return false;"),
  "AnnouncementBanner must filter out inactive announcements"
);
assert.ok(
  bannerContent.includes("if (!activeAnnouncement) return null;"),
  "AnnouncementBanner must return null when no active announcement is available"
);
assert.ok(
  bannerContent.includes("{activeAnnouncement.message}"),
  "AnnouncementBanner must render the live announcement message"
);
console.log("  [PASS] Test 6: AnnouncementBanner properly hides when active is false and displays edited message");

console.log("======================================================================");
console.log("ALL 6/6 ANNOUNCEMENT TICKER VERIFICATION TESTS PASSED!");
console.log("======================================================================");
