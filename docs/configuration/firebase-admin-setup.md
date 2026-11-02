# Firebase Admin Configuration & Registration Setup Guide

**Repository:** `Vinkal93/School-study`  
**Production URL:** `https://school.sbci.online`  

---

## 1. Overview & Architecture

School Study uses Firebase for both client authentication and server-side privileged operations (school tenant registration, custom claims provisioning, and atomic account creation).

### Security Boundary
- **Client Components (`src/lib/firebase/client.ts`):** Only access public variables prefixed with `NEXT_PUBLIC_FIREBASE_*`.
- **Server Services (`src/lib/firebase/admin.ts`):** Strictly server-only. Uses Google Firebase Admin SDK with private service account credentials. Private keys must **NEVER** have a `NEXT_PUBLIC_` prefix and must never be exposed to the browser.

---

## 2. Supported Configuration Formats

The server automatically detects and normalizes credentials in any of the following formats:

### Pattern A: Discrete Variables (Recommended for Vercel)
```env
FIREBASE_PROJECT_ID=school-study-c8991
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@school-study-c8991.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...=\n-----END PRIVATE KEY-----\n"
```
> [!NOTE]
> The private key can be formatted with literal `\n`, multi-line newlines, or Base64 encoded. The system's normalizer strips wrapping quotes and resolves escaped characters automatically.

### Pattern B: Consolidated Service Account JSON
```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"school-study-c8991","private_key_id":"...","private_key":"...","client_email":"..."}'
```

### Pattern C: Base64 Encoded JSON (For CI/CD or Strict Shells)
```env
FIREBASE_SERVICE_ACCOUNT_KEY_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50...
```

---

## 3. Local Development Setup (`.env.local`)

To run school self-registration locally:

1. **Obtain Service Account Credentials:**
   - Go to [Firebase Console](https://console.firebase.google.com/) > Select **school-study-c8991**.
   - Navigate to **Project Settings** > **Service Accounts** tab.
   - Click **Generate new private key** and download the JSON file.

2. **Add to `.env.local`:**
   Open `.env.local` in your project root and append:
   ```env
   # Server-side Firebase Admin (DO NOT COMMIT)
   FIREBASE_PROJECT_ID=school-study-c8991
   FIREBASE_CLIENT_EMAIL=your-service-account-email@school-study-c8991.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

3. **Or Synchronize via Vercel CLI:**
   If you have linked the project with Vercel:
   ```bash
   npx vercel env pull .env.local
   ```

4. **Restart the Next.js Dev Server:**
   Next.js only reads `.env.local` changes on server restart:
   ```bash
   npm run dev
   ```

5. **Verify Configuration:**
   Visit `http://localhost:3000/api/admin/firebase-status` in your browser.  
   The response should indicate:
   ```json
   {
     "status": "ok",
     "adminConfigured": true,
     "hasPrivateKey": true,
     "connectivity": "connected"
   }
   ```

---

## 4. Vercel Preview & Production Configuration

In Vercel, environment variables must be assigned to the correct **Environment Scope**:

| Variable | Development Scope | Preview Scope | Production Scope | Sensitive / Encrypted |
|---|---|---|---|---|
| `FIREBASE_PROJECT_ID` | ✅ | ✅ | ✅ | Plain text |
| `FIREBASE_CLIENT_EMAIL`| ✅ | ✅ | ✅ | Sensitive |
| `FIREBASE_PRIVATE_KEY` | ✅ | ✅ | ✅ | Sensitive |

### Important Steps for Vercel
1. In the Vercel Dashboard, go to **Settings > Environment Variables**.
2. Verify that `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` are checked for both **Production** and **Preview**.
3. **Trigger a Redeployment:** Environment variable updates in Vercel do **not** take effect in existing deployments. You must trigger a redeploy from the Deployments tab or push a new commit to activate new credentials.

---

## 5. Diagnostic Health Check Endpoint

An endpoint is provided at `/api/admin/firebase-status` that reports:
- Configuration status (`configured: true | false`)
- Masked client email (e.g., `f***@school-study-c8991.iam.gserviceaccount.com`)
- Valid PEM key detection
- Project ID consistency between client and server
- Firestore connectivity probe

> [!CAUTION]
> The diagnostic endpoint never returns or prints secret keys.
