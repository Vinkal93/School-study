# SCHOOL STUDY — DISASTER RECOVERY & SRE RUNBOOK

This runbook outlines operational response procedures for production reliability, incident management, data backup, and recovery on the School Study platform.

---

## 1. IDENTIFYING OUTAGES & HEALTH STATUS

### A. Synthetic Health Check Endpoint
- **URL**: `https://school.sbci.online/api/health`
- **Expected Status**: `200 OK`
- **Payload Response**:
  ```json
  {
    "status": "healthy",
    "app": "School Study SaaS Platform",
    "timestamp": "2026-08-31T06:50:00.000Z",
    "latencyMs": 45,
    "environment": "production",
    "checks": {
      "database": { "status": "UP", "latencyMs": 35 },
      "paymentGateway": { "status": "UP", "message": "Mode: TEST, Status: VALID" }
    }
  }
  ```
- **Alert Trigger**: If status is `503 Service Unavailable` or `database.status` is `DEGRADED`, initiate database connectivity inspection.

---

## 2. INSPECTING SERVER & DEPLOYMENT LOGS

1. **Vercel Serverless Logs**:
   - Access **Vercel Dashboard** → `School Study` → **Logs**.
   - Filter by status: `5xx` or search terms `[Razorpay]`, `[Billing]`, `Error:`.
2. **Audit Trail Inspection**:
   - Super Admin Portal → **Audit Logs** (`/super-admin/audit`).
   - Tracks all administrative actions, permission overrides, and billing state changes.

---

## 3. VERIFYING FIREBASE SERVICES

1. **Firestore Database**:
   - Verify cloud status at [Google Cloud Console Status Dashboard](https://status.cloud.google.com/).
   - Inspect Firestore read/write latency in Firebase Console.
2. **Firebase Storage**:
   - Verify storage bucket quotas and permissions in Firebase Storage Console (`storage.rules`).

---

## 4. VERIFYING RAZORPAY GATEWAY

1. **Super Admin Live Ping**:
   - Navigate to `/super-admin/settings`.
   - Click **"Test Razorpay Connection"**.
   - Returns instantaneous gateway connectivity validation against Razorpay upstream servers.
2. **Webhook Status**:
   - Razorpay Dashboard → **Settings** → **Webhooks**.
   - Ensure webhook endpoint `https://school.sbci.online/api/webhooks/razorpay` is returning `200 OK` with 0% delivery failure.

---

## 5. EMERGENCY ROLLBACK PROCEDURE

If a newly deployed build introduces regressions:
1. Go to **Vercel Dashboard** → **Deployments**.
2. Locate the previous healthy deployment.
3. Click the three dots `...` → **Instant Rollback**.
4. Traffic is immediately redirected to the previous immutable build artifact in under 15 seconds.

---

## 6. BACKUP & DATA RECOVERY PROCEDURES

### A. Taking an Instant Database Snapshot
Run the automated backup command:
```bash
npm run backup:firestore
```
- Archives all collections into `backups/firestore-backup-<TIMESTAMP>.json`.
- Automatically generates SHA-256 cryptographic verification checksum.

### B. Dry-Run Disaster Recovery Test (Safe / Non-destructive)
Verify snapshot archive integrity without modifying live data:
```bash
npm run restore:firestore -- --file backups/firestore-backup-<TIMESTAMP>.json --dry-run
```

### C. Live Disaster Recovery Restoration
Restore verified snapshot to Firestore:
```bash
npm run restore:firestore -- --file backups/firestore-backup-<TIMESTAMP>.json --confirm-restore
```

---

## 7. DATA INTEGRITY INVARIANTS

During any backup or recovery operation, the following invariants are strictly preserved:
- `schoolId` multi-tenant boundaries.
- User authentication IDs (`uid`) and security roles (`role`).
- Financial ledgers, invoice IDs, and transaction audit trails.
