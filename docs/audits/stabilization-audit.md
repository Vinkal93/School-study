# School Study SaaS — Comprehensive Stabilization Audit

This audit document details every architectural defect, reliability vulnerability, and user-facing bug identified across the School Study codebase, categorized by severity, root cause, affected files, dependencies, and resolution.

---

## Issue Matrix

| Issue ID | Category | Severity | Description | Status |
|---|---|---|---|---|
| **ISSUE-01** | API / Registration | **P0 (Critical)** | School Registration HTTP 503 on `/super-admin/schools/new` & public `/register` | Under Remediation |
| **ISSUE-02** | Data Consistency | **P0 (Critical)** | Metric discrepancy (505 vs 496 students) between `/admin` dashboard and `/admin/students` | Fixed |
| **ISSUE-03** | UX / Dialogs | **P1 (High)** | Native browser dialogs (`confirm`, `prompt`, `alert`) in production admin pages | Under Remediation |
| **ISSUE-04** | UI / Components | **P1 (High)** | Non-standard native checkboxes across 30 admin pages lacking accessible styling | Under Remediation |
| **ISSUE-05** | Privacy / UX | **P1 (High)** | Intrusive cookie consent banner rendering automatically on homepage | Under Remediation |
| **ISSUE-06** | Configuration | **P1 (High)** | Decentralized `process.env` access across 54 variables without typed schema validation | Under Remediation |
| **ISSUE-07** | CRUD Architecture | **P1 (High)** | Discrepancy between bulk imported students and manually enrolled student models | Under Remediation |
| **ISSUE-08** | Error Observability| **P2 (Medium)** | Missing correlation request IDs and structured server error responses | Under Remediation |
| **ISSUE-09** | Performance | **P2 (Medium)** | Redundant Firestore listeners and unmemoized metric calculations | Under Remediation |

---

## Detailed Findings & Root Cause Analysis

### ISSUE-01: School Registration HTTP 503 (`POST /api/school/register`)
- **Severity:** P0 (Core Business Workflow)
- **Affected Files:**
  - `src/app/api/school/register/route.ts`
  - `src/lib/services/school.service.ts`
  - `src/app/(dashboard)/super-admin/schools/new/page.tsx`
  - `src/components/auth/SchoolRegistrationFlow.tsx`
- **Root Cause:**
  1. `/api/school/register` returned hard HTTP 503 if Firebase Admin SDK was uninitialized on the serverless instance (missing or unescaped `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`).
  2. When an authenticated Super Admin invoked school creation from the Super Admin portal, client code had no fallback to execute authenticated mutations using the existing Super Admin session, causing a blocker even when the caller possessed full administrative rights.
  3. Error responses lacked standardized error schemas, structured request IDs, and retry guidance.
- **Proposed Fix:**
  - Standardize error schema: `{ success: false, error: { code, message, requestId, retryable } }`.
  - Add explicit server-side state machine with compensation (rollback Auth user if Firestore write fails).
  - Enable seamless fallback when called by an authenticated Super Admin session.

---

### ISSUE-02: Metric Count Discrepancy (505 vs 496 Students)
- **Severity:** P0 (Data Integrity)
- **Affected Files:**
  - `src/hooks/useRealtimeSchoolDashboard.ts`
  - `src/app/(dashboard)/admin/page.tsx`
  - `src/lib/billing/usage.ts`
  - `src/app/(dashboard)/admin/students/page.tsx`
- **Root Cause:**
  - The school document `schools/{schoolId}` held a stale static metadata property `studentCount: 505`.
  - Raw `getCountFromServer(collection(db, "schools", schoolId, "students"))` counted all 505 documents including 9 soft-deleted and archived records.
  - `/admin/students` filtered `status !== "deleted" && status !== "archived"` showing 496.
- **Resolution:**
  - Stripped stale static metadata override in `useRealtimeSchoolDashboard`.
  - Implemented active status filter in aggregation queries and unified single source of truth on main dashboard.

---

### ISSUE-03: Native Browser Dialogs (`confirm`, `prompt`, `alert`)
- **Severity:** P1 (UX / Brand Standards)
- **Affected Files:**
  - `src/app/(dashboard)/admin/teachers/page.tsx` (native `confirm`)
  - `src/app/(dashboard)/super-admin/offers/page.tsx` (native `prompt`)
  - `src/components/admin/mobile/StudentActionsSheet.tsx` (native `alert`)
  - `src/components/ai/AiWorkspace.tsx` (native `alert`)
- **Root Cause:**
  - Quick developer shortcuts using window native methods instead of the shared `ConfirmDialog` or accessible modal system.
- **Proposed Fix:**
  - Replace `confirm()` in `teachers/page.tsx` with portal-backed `ConfirmDialog`.
  - Replace `prompt()` in `offers/page.tsx` with an in-app Input Dialog.
  - Replace `alert()` with accessible `toast.error()` or `AlertDialog`.

---

### ISSUE-04: Non-Standard Checkbox Implementations
- **Severity:** P1 (Design System & Accessibility)
- **Affected Files:** 30 dashboard page files across admin and super-admin.
- **Root Cause:**
  - Direct HTML `<input type="checkbox">` with inconsistent Tailwind classes, lack of Material 3 styling, and improper focus rings.
- **Proposed Fix:**
  - Create standardized `src/components/ui/Checkbox.tsx` component with accessible keyboard navigation, ripple/hover effects, light/dark mode support, and checked indeterminate state.
  - Replace direct raw checkboxes with the unified `Checkbox` component.

---

### ISSUE-05: Intrusive Homepage Cookie Popup
- **Severity:** P1 (UX & Conversion)
- **Affected Files:**
  - `src/components/common/CookieConsentBanner.tsx`
  - `src/app/page.tsx`
  - `src/app/layout.tsx`
- **Root Cause:**
  - `CookieConsentBanner` automatically rendered a full-screen intrusive popup on root landing `/` navigation.
- **Proposed Fix:**
  - Remove intrusive modal from the homepage.
  - Provide dedicated `/cookies` policy page with informational panel.
  - Ensure essential authentication and session cookies function without blocking page engagement.

---

### ISSUE-06: Decentralized Environment Variables Access
- **Severity:** P1 (Security & Architecture)
- **Affected Files:** 54 references across client and server files.
- **Root Cause:**
  - Direct calls to `process.env.*` scattered throughout codebase without centralized validation or format checking.
- **Proposed Fix:**
  - Implement `src/config/schema.ts`, `src/config/server.ts`, `src/config/public.ts`, and `src/config/index.ts`.
  - Strict secret isolation preventing server-only environment variables from leaking into client bundles.

---

### ISSUE-07: Error Handling & Observability
- **Severity:** P2 (Observability)
- **Affected Files:** Server API routes under `src/app/api`.
- **Root Cause:**
  - Inconsistent error shapes: some return `{ error: string }`, others return `{ message: string }`, others throw raw 500.
- **Proposed Fix:**
  - Unified API response utility `createApiResponse` with standard success/error formats and unique `requestId` tracing.
