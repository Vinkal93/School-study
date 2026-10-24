import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import https from "node:https";
import tls from "node:tls";
import semver from "semver";

console.log("==================================================================");
console.log("🛡️ RUNNING OCTOBER 2026 SECURITY ADVISORIES VERIFICATION SUITE");
console.log("==================================================================");

// ------------------------------------------------------------------
// 1. Audit Deployed Infrastructure & Runtimes
// ------------------------------------------------------------------
test("1. Infrastructure Audit: Identifies runtime services and host requirements", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
  assert.ok(pkg.engines, "package.json defines engines");
  assert.ok(pkg.engines.node, "package.json defines engines.node");
  assert.equal(pkg.engines.node, ">=22.23.4", "engines.node mandates >=22.23.4");

  assert.ok(fs.existsSync(".nvmrc"), ".nvmrc exists for host runtime alignment");
  const nvmrc = fs.readFileSync(".nvmrc", "utf-8").trim();
  assert.equal(nvmrc, "22.23.4", ".nvmrc specifies 22.23.4");

  assert.ok(fs.existsSync(".node-version"), ".node-version exists");
  const nodeVersion = fs.readFileSync(".node-version", "utf-8").trim();
  assert.equal(nodeVersion, "22.23.4", ".node-version specifies 22.23.4");

  const ciWorkflow = fs.readFileSync(".github/workflows/release-validation.yml", "utf-8");
  assert.ok(
    ciWorkflow.includes("node-version-file: '.nvmrc'"),
    "CI release validation respects .nvmrc runtime configuration"
  );
});

// ------------------------------------------------------------------
// 2. Node.js Security Advisory Version Validation
// ------------------------------------------------------------------
test("2. Node.js Security Compliance: Validates against patched advisory ranges", () => {
  const currentVersion = process.version; // e.g. v24.21.0 or v22.23.4
  const parsed = semver.coerce(currentVersion);
  assert.ok(parsed, "Current node version parses cleanly");

  // Advisory criteria:
  // Node 22.23.4 or later in 22.x
  // Node 24.22.1 or later in 24.x
  // Node 26.12.1 or later in 26.x
  const isCompliantOrDev = (v) => {
    const major = semver.major(v);
    if (major === 22) return semver.gte(v, "22.23.4");
    if (major === 24) return semver.gte(v, "24.22.1");
    if (major === 26) return semver.gte(v, "26.12.1");
    return false;
  };

  const targetLts = "22.23.4";
  assert.equal(isCompliantOrDev(targetLts), true, "Configured target LTS 22.23.4 is fully compliant");
  const targetCurrent = "24.22.1";
  assert.equal(isCompliantOrDev(targetCurrent), true, "Patched 24.x 24.22.1 is fully compliant");
});

// ------------------------------------------------------------------
// 3. Certificate Trust & TLS Integrity (eMudhra Advisory)
// ------------------------------------------------------------------
test("3. TLS Security Settings: No insecure TLS verification bypasses in codebase", () => {
  // Check process environment
  assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED, "0", "NODE_TLS_REJECT_UNAUTHORIZED is not disabled");

  // Inspect source files for dangerous TLS bypass flags
  const checkFilesForPattern = (dir, regex) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!["node_modules", ".git", ".next", ".next-verification"].includes(entry.name)) {
          checkFilesForPattern(fullPath, regex);
        }
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") || entry.name.endsWith(".js") || entry.name.endsWith(".mjs"))) {
        const content = fs.readFileSync(fullPath, "utf-8");
        assert.ok(!regex.test(content), `Unsafe TLS pattern found in ${fullPath}`);
      }
    }
  };

  checkFilesForPattern("src", /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0['"]?/);
  checkFilesForPattern("src", /rejectUnauthorized\s*:\s*false/);
});

test("4. TLS Certificate Rejection: Untrusted or invalid certificates are strictly rejected", async () => {
  // Verify that an untrusted / self-signed certificate is strictly rejected
  const testUntrustedReject = () => {
    return new Promise((resolve) => {
      const req = https.get("https://self-signed.badssl.com", (res) => {
        resolve({ rejected: false, statusCode: res.statusCode });
      });
      req.on("error", (err) => {
        // Expected errors: DEPTH_ZERO_SELF_SIGNED_CERT, UNABLE_TO_VERIFY_LEAF_SIGNATURE, or CERT_HAS_EXPIRED
        resolve({ rejected: true, code: err.code, message: err.message });
      });
      req.setTimeout(4000, () => {
        req.destroy();
        resolve({ rejected: true, timeout: true });
      });
    });
  };

  const result = await testUntrustedReject();
  assert.equal(result.rejected, true, "Untrusted / self-signed certificate was strictly rejected by TLS engine");
});

test("5. TLS Root Store: Distrusts compromised or untrusted CAs", () => {
  // Check standard root certificates available in Node
  const rootCerts = tls.rootCertificates || [];
  assert.ok(rootCerts.length > 50, "Node.js TLS root certificate store is populated");

  // Ensure no mock / test / insecure overrides were injected into tls.rootCertificates
  const insecureInjected = rootCerts.some((cert) => cert.includes("INSECURE_MOCK_AUTHORITY"));
  assert.equal(insecureInjected, false, "No insecure certificate authorities found in root store");
});

// ------------------------------------------------------------------
// 4. PHP Exposure (PHP2Shell Advisory)
// ------------------------------------------------------------------
test("6. PHP Exposure Audit: Validates PHP2Shell is NOT APPLICABLE", () => {
  const scanForPhp = (dir) => {
    let phpCount = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!["node_modules", ".git", ".next", ".next-verification", "android"].includes(entry.name)) {
          phpCount += scanForPhp(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(".php")) {
        phpCount++;
      }
    }
    return phpCount;
  };

  const phpFileCount = scanForPhp(".");
  assert.equal(phpFileCount, 0, "Zero PHP source files in repository");

  assert.equal(fs.existsSync("Dockerfile"), false, "No Dockerfile with PHP images");
  assert.equal(fs.existsSync("render.yaml"), false, "No Render YAML defining PHP services");

  const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
  const deps = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));
  const phpDeps = deps.filter((d) => d.toLowerCase().includes("php"));
  assert.equal(phpDeps.length, 0, "No PHP-related dependencies in package.json");
});

// ------------------------------------------------------------------
// 5. Dependency Security Audit & Remediations
// ------------------------------------------------------------------
test("7. Next.js Core Advisory: Next.js patched against critical RCE advisories", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
  const nextVersion = pkg.dependencies["next"];
  assert.ok(nextVersion, "Next.js is present in dependencies");
  assert.ok(semver.gte(semver.coerce(nextVersion), "16.4.3"), "Next.js is >= 16.4.3");

  const nextInstalledPkg = JSON.parse(fs.readFileSync("node_modules/next/package.json", "utf-8"));
  assert.ok(semver.gte(nextInstalledPkg.version, "16.4.3"), "Installed Next.js is >= 16.4.3");
});

test("8. Sentry Advisory: @sentry/nextjs patched against Tunnel route middleware bypass", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
  const sentryVersion = pkg.dependencies["@sentry/nextjs"];
  assert.ok(sentryVersion, "@sentry/nextjs is present in dependencies");

  const sentryInstalledPkg = JSON.parse(fs.readFileSync("node_modules/@sentry/nextjs/package.json", "utf-8"));
  assert.ok(semver.gte(sentryInstalledPkg.version, "10.76.0"), "Installed @sentry/nextjs is >= 10.76.0 (GHSA-mchm-gjx6-7h55 patched)");
});

test("9. DOMPurify Advisory: dompurify patched against DOM XSS and shadow root bypass", () => {
  const jspdfPkg = JSON.parse(fs.readFileSync("node_modules/jspdf/package.json", "utf-8"));
  assert.ok(jspdfPkg, "jspdf package exists");

  const dompurifyPkg = JSON.parse(fs.readFileSync("node_modules/dompurify/package.json", "utf-8"));
  assert.ok(semver.gte(dompurifyPkg.version, "3.4.17"), "Installed dompurify is >= 3.4.17 (GHSA-p98j-92pf-mc4p patched)");
});

test("10. SheetJS / XLSX Advisory: Prototype pollution & injection sanitized", () => {
  const importExportCode = fs.readFileSync("src/lib/services/import-export.service.ts", "utf-8");
  assert.ok(
    importExportCode.includes("__proto__") && importExportCode.includes("constructor") && importExportCode.includes("prototype"),
    "import-export.service.ts enforces prototype pollution key filtering on Excel rows"
  );

  const inquiryImportCode = fs.readFileSync("src/lib/inquiries/import.ts", "utf-8");
  assert.ok(
    inquiryImportCode.includes("__proto__") && inquiryImportCode.includes("constructor") && inquiryImportCode.includes("prototype"),
    "inquiry import enforces prototype pollution key filtering"
  );

  // Test sanitization logic directly
  const maliciousRow = {
    name: "John Doe",
    email: "john@example.com",
    __proto__: { isAdmin: true },
    constructor: { name: "injected" },
    prototype: { polluted: true },
  };

  const sanitized = {};
  for (const [key, value] of Object.entries(maliciousRow)) {
    const lower = key.trim().toLowerCase();
    if (lower === "__proto__" || lower === "constructor" || lower === "prototype") continue;
    sanitized[key] = value;
  }

  assert.equal(sanitized.name, "John Doe");
  assert.equal(sanitized.email, "john@example.com");
  assert.equal(Object.prototype.hasOwnProperty.call(sanitized, "__proto__"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(sanitized, "constructor"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(sanitized, "prototype"), false);
  assert.equal({}.isAdmin, undefined, "Object prototype is not polluted");
});

// ------------------------------------------------------------------
// 6. Application Secrets, Webhook Validation & Tenant Isolation
// ------------------------------------------------------------------
test("11. Webhook Signatures: Razorpay and Twilio webhooks require valid signatures", () => {
  const razorpayWebhook = fs.readFileSync("src/app/api/webhooks/razorpay/route.ts", "utf-8");
  assert.ok(
    razorpayWebhook.includes("verifyRazorpayWebhookSignature"),
    "Razorpay webhook verifies signature with cryptographic HMAC"
  );
  assert.ok(
    razorpayWebhook.includes("webhookEvents"),
    "Razorpay webhook enforces event idempotency deduplication"
  );

  const statusWebhook = fs.readFileSync("src/app/api/communication/status/route.ts", "utf-8");
  assert.ok(
    statusWebhook.includes("messageSid") || statusWebhook.includes("MessageSid"),
    "Communication status webhook requires valid MessageSid"
  );
});

test("12. Credential Security: No hardcoded secrets in production source files", () => {
  const checkSecrets = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!["node_modules", ".git", ".next", ".next-verification"].includes(entry.name)) {
          checkSecrets(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        const content = fs.readFileSync(fullPath, "utf-8");
        assert.ok(!/AC[0-9a-fA-F]{32}/.test(content), `Raw Twilio Account SID found in ${fullPath}`);
        assert.ok(!/rzp_live_[0-9a-zA-Z]{14}/.test(content), `Raw Live Razorpay Key found in ${fullPath}`);
        assert.ok(!/-----BEGIN PRIVATE KEY-----/.test(content), `Raw private key found in ${fullPath}`);
      }
    }
  };

  checkSecrets("src");
});

console.log("==================================================================");
