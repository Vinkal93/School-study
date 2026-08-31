/**
 * PRODUCTION FIRESTORE BACKUP UTILITY
 * 
 * Safely exports core Firestore collections to a timestamped JSON backup archive.
 * Preserves multi-tenant identifiers (schoolId), document IDs, and timestamps.
 * Generates an SHA-256 integrity checksum file.
 * 
 * Usage:
 *   node scripts/backup-firestore.mjs
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const CORE_COLLECTIONS = [
  "users",
  "schools",
  "plans",
  "planVersions",
  "featureDefinitions",
  "accessPolicies",
  "schoolSubscriptions",
  "orders",
  "payments",
  "invoices",
  "financeTransactions",
  "coupons",
  "couponRedemptions",
  "refunds",
  "disputes",
  "subscriptionAdjustments",
  "accessOverrides",
  "limitOverrides",
  "paymentSettings",
  "siteSettings",
  "inquiries",
  "contactInquiries",
  "audit_logs",
  "login_logs",
  "activity_logs"
];

// Load .env.local if present
function loadEnv() {
  const envPath = path.resolve(".env.local");
  const envVars = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq !== -1) {
        envVars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
      }
    }
  }
  return envVars;
}

async function runBackup() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.resolve("backups");
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const env = loadEnv();
  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "school-study-c8991";
  const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";

  console.log(`[BACKUP ENGINE] Starting Firestore snapshot for project: ${projectId}`);
  console.log(`[BACKUP ENGINE] Timestamp: ${timestamp}`);

  const backupData = {
    metadata: {
      projectId,
      timestamp: new Date().toISOString(),
      version: "1.0",
      totalCollections: CORE_COLLECTIONS.length,
      totalDocuments: 0,
    },
    collections: {},
  };

  for (const collName of CORE_COLLECTIONS) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collName}${apiKey ? `?key=${apiKey}` : ""}`;
      const res = await fetch(url);
      
      if (res.ok) {
        const json = await res.json();
        const docs = json.documents || [];
        const extracted = docs.map((doc) => {
          const docId = doc.name.split("/").pop() || "";
          const fields = doc.fields || {};
          const parsedData = {};
          
          for (const [k, v] of Object.entries(fields)) {
            if (v.stringValue !== undefined) parsedData[k] = v.stringValue;
            else if (v.booleanValue !== undefined) parsedData[k] = v.booleanValue;
            else if (v.integerValue !== undefined) parsedData[k] = parseInt(v.integerValue, 10);
            else if (v.doubleValue !== undefined) parsedData[k] = parseFloat(v.doubleValue);
            else if (v.timestampValue !== undefined) parsedData[k] = v.timestampValue;
            else if (v.nullValue !== undefined) parsedData[k] = null;
            else parsedData[k] = v;
          }
          return { id: docId, data: parsedData, createTime: doc.createTime, updateTime: doc.updateTime };
        });

        backupData.collections[collName] = extracted;
        backupData.metadata.totalDocuments += extracted.length;
        console.log(`✓ Collection [${collName}]: ${extracted.length} documents exported.`);
      } else {
        backupData.collections[collName] = [];
        console.log(`- Collection [${collName}]: 0 documents (empty or restricted).`);
      }
    } catch (err) {
      console.warn(`! Collection [${collName}] error:`, err.message);
      backupData.collections[collName] = [];
    }
  }

  const jsonContent = JSON.stringify(backupData, null, 2);
  const backupFileName = `firestore-backup-${timestamp}.json`;
  const backupFilePath = path.join(backupDir, backupFileName);

  fs.writeFileSync(backupFilePath, jsonContent, "utf-8");

  // Calculate SHA-256 integrity hash
  const hash = crypto.createHash("sha256").update(jsonContent).digest("hex");
  const checksumFilePath = path.join(backupDir, `firestore-backup-${timestamp}.sha256`);
  fs.writeFileSync(checksumFilePath, `${hash}  ${backupFileName}\n`, "utf-8");

  console.log(`\n==================================================`);
  console.log(`[BACKUP COMPLETE]`);
  console.log(`File: ${backupFilePath}`);
  console.log(`Checksum (SHA-256): ${hash}`);
  console.log(`Total Documents: ${backupData.metadata.totalDocuments}`);
  console.log(`Duration: ${(Date.now() - startTime) / 1000}s`);
  console.log(`==================================================`);
}

runBackup().catch((e) => {
  console.error("Backup failed:", e);
  process.exit(1);
});
