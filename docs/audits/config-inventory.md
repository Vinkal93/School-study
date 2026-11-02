# School Study SaaS — Configuration & Environment Inventory

This document inventories every environment variable referenced across the School Study codebase, categorizing them by runtime scope, sensitivity, purpose, and failure behavior.

---

## 1. Classification Overview

| Category | Count | Security Constraint | Exposure |
|---|---|---|---|
| **Public Client (`NEXT_PUBLIC_`)** | 12 | Non-sensitive runtime configuration | Baked into client JS bundles |
| **Server Secret (Private Keys & Tokens)** | 22 | High sensitivity (Database, Payment, Auth) | Server-only; NEVER exposed to browser |
| **Platform & Host Control** | 10 | Vercel & Node environment flags | Edge & Node.js runtime only |
| **Integrations & Third-Party APIs** | 10 | SMS, WhatsApp, Email, AI credentials | Server-only |

---

## 2. Environment Variables Detail

### A. Client-Side Firebase Configuration (Required)
| Variable | Scope | Purpose | Fallback / Behavior if Missing |
|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public | Firebase Web API Key | Fatal client error on auth/firestore init |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Public | Auth callback & redirect domain | Auth redirects fail |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Public | Canonical Firebase project ID | Defaults to `school-study-c8991` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Public | Cloud Storage bucket URL | Photo / Document uploads fail |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| Public | Push notification sender ID | Push notifications disabled |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Public | Web app client identifier | Client initialization fails |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical root URL (SEO, redirects) | Defaults to `https://school.sbci.online` |
| `NEXT_PUBLIC_APP_URL` | Public | Secondary app URL alias | Falls back to `NEXT_PUBLIC_SITE_URL` |
| `NEXT_PUBLIC_PAYMENT_GATEWAY_LIVE` | Public | Toggle live vs test Razorpay checkout | Defaults to test mode |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public | Razorpay client key for payment popup | Checkout popup fails to open |
| `NEXT_PUBLIC_SENTRY_DSN` | Public | Sentry crash reporting DSN | Crash telemetry skipped |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Public | Google Analytics measurement ID | Analytics tracking disabled |

---

### B. Server-Side Firebase Admin Configuration (High Sensitivity)
| Variable | Scope | Purpose | Failure Mode |
|---|---|---|---|
| `FIREBASE_CLIENT_EMAIL` | Server | Service account client email | 503 on server school registration if discrete keys used |
| `FIREBASE_PRIVATE_KEY` | Server | Service account RSA private key (PEM) | Fails server auth and custom claims minting |
| `FIREBASE_PROJECT_ID` | Server | Server Firebase project ID override | Falls back to `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Server | Single-line JSON or Base64 service account | Primary consolidated configuration |
| `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64`| Server | Base64-encoded service account JSON | Alternative for CI/CD environments |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Server | Local path to service account credentials | Local development / docker fallback |
| `GOOGLE_APPLICATION_CREDENTIALS` | Server | Google Cloud ADC default credentials path | Cloud Run / GCP runtime fallback |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Server | Legacy alias for `FIREBASE_CLIENT_EMAIL` | Backwards compatibility |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Server | Legacy alias for `FIREBASE_PRIVATE_KEY` | Backwards compatibility |

---

### C. Payment Gateway (Razorpay)
| Variable | Scope | Purpose | Failure Mode |
|---|---|---|---|
| `RAZORPAY_KEY_ID` | Server | Server-side Razorpay Key ID | Billing order creation rejected |
| `RAZORPAY_KEY_SECRET` | Server | Secret for HMAC signature verification | All signature verifications reject with 400 |
| `RAZORPAY_WEBHOOK_SECRET` | Server | Secret for Razorpay webhook verification | Webhook rejects with 401 |

---

### D. Communication, Email & Third-Party APIs
| Variable | Scope | Purpose | Failure Mode |
|---|---|---|---|
| `TWILIO_ACCOUNT_SID` | Server | Twilio SMS/WhatsApp account SID | Communication dispatches fail gracefully |
| `TWILIO_AUTH_TOKEN` | Server | Twilio authentication token | SMS/WhatsApp authentication rejected |
| `TWILIO_SMS_FROM` | Server | Sender phone number for SMS | SMS delivery skipped |
| `TWILIO_WHATSAPP_FROM` | Server | Twilio WhatsApp sender number | WhatsApp delivery skipped |
| `RESEND_API_KEY` | Server | Resend transactional email API key | Email dispatches fallback to SMTP |
| `SMTP_HOST` | Server | SMTP mail server host | Fallback email disabled |
| `WHATSAPP_ACCESS_TOKEN` | Server | Meta Cloud API WhatsApp token | Direct Meta WhatsApp API skipped |
| `WHATSAPP_API_URL` | Server | Meta Cloud API endpoint | Defaults to Meta Graph API v18 |
| `GEMINI_API_KEY` | Server | Google Gemini API key for AI assistant | AI tools return service unavailable |
| `OPENAI_API_KEY` | Server | OpenAI fallback key | AI fallback skipped |

---

### E. System Security & Internal Secrets
| Variable | Scope | Purpose | Failure Mode |
|---|---|---|---|
| `CRON_SECRET` | Server | Bearer token for scheduled cron jobs | Cron jobs reject with 401 Unauthorized |
| `BACKUP_CRON_SECRET` | Server | Bearer token for automated DB backup | Automated backups reject with 401 |
| `NEXTAUTH_SECRET` | Server | Session encryption secret | Session hashing fallback |
| `ENCRYPTION_KEY` | Server | 256-bit AES key for sensitive tenant data | Cryptographic fallback |
| `SUPER_ADMIN_EMAILS` | Server/Client | Comma-delimited list of Super Admins | Falls back to hardcoded safety list |
| `NODE_ENV` | Runtime | Node environment (`production`/`development`)| Controls logging and caching behavior |

---

## 3. Recommended Centralized Config Module Structure

```text
src/
  config/
    schema.ts       # Zod-style or custom typed schema validation
    server.ts       # Server-only config with strict secret redaction
    public.ts       # Client-safe public config object
    index.ts        # Re-exporting appropriate runtime accessors
```
