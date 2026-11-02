# Architecture audit — 27 October 2026

Initial inspected revision: `8abcddb`, branch `codex/production-repair-s2`. Status: NOT TESTED (runtime verification pending). Existing reports are historical claims, not evidence for this run.

## Actual architecture

Single Next.js App Router application (`src/app`), React 19, TypeScript, Tailwind 4, Firebase browser SDK 12 and Admin SDK 14. Android is a Capacitor wrapper. Next configuration uses Turbopack, an Admin browser replacement, Sentry instrumentation and an optional verification build directory. Dependencies also include Razorpay, XLSX and jsPDF. There is no installed Playwright test suite or emulator configuration at the initial revision.

Public marketing/pricing and registration routes coexist with admin, teacher, student, super-admin and partner portals. Shared layout components, three portal shell families, HeroUI/custom UI and billing/feature registries coexist; this is not a single consolidated design system.

Authentication uses Firebase Auth, browser persistence, user profiles in `users`, and a JavaScript-written `__session` ID-token cookie. API guards resolve profiles and roles; direct browser database operations rely on Firestore rules. Implemented role union includes super_admin, admin, school_admin, teacher, student, accountant, receptionist, parent, partner and public. These are not uniformly supported by every route.

## Initial source connection map

| Workflow | Source chain | Persistence/authorization boundary |
|---|---|---|
| Registration | `(auth)/register/page.tsx` → `/api/school/register` → Admin Auth creation/claims → Firestore transaction | schools, schoolCodes, users, schoolSubscriptions; requires active plans/planVersions; compensation deletes newly created Auth user on failure |
| Login/session | auth provider → auth service → Firebase Auth → users profile → role redirect → ID-token cookie | Browser local persistence; shared API guard; layouts/proxy are additional navigation controls |
| Student CRUD/import | admin students/backup UI → student/import services → browser Firestore; bulk archive → `/api/admin/students/bulk-delete` | schools/{school}/students plus legacy root students; users, schoolUsage and historical fees/attendance relationships |
| Teachers/HR | admin teachers UI → teacher.service / teacher-hr.service → secondary Auth app + browser Firestore | schools/{school}/teachers, users; assigned class/section and subjects |
| Classes/promotions | admin classes/student promotion UI → academic/student services → Firestore | nested academicYears/classes/sections, students, transfer/promotion history |
| Attendance | teacher/admin attendance UI → attendance.service → browser batches/listeners | root attendance and employee_attendance; deterministic date/student IDs; rules enforce writes |
| Fees | admin fees UI → fee client services → `/api/fees/*` → requireFeeAccess → finance services | legacy and foundation demands/payments/ledger; Admin transaction and entitlement boundaries |
| Pricing/entitlements | super-admin pricing → plans/planVersions → public pricing and registration → schoolSubscriptions → featureAccess | multiple feature registries and entitlement engines; UI gating alone is insufficient |
| Communication | communication UI → `/api/communication/*` → provider/automation services | Twilio SMS/WhatsApp, email configuration, logs/callbacks; external delivery requires provider verification |
| Super admin | portal UI → `/api/super-admin/*` → shared authorization + services | schools/users/settings/plans/financial and security administration |

Each chain still needs role-specific execution, response/UI-state and refresh-persistence verification. Source presence is not proof of successful execution.

## Infrastructure and initial constraints

GitHub release workflow runs types, release regressions and build, followed by Safe release gate. Vercel deployment scopes and production behavior are NOT TESTED. Local `.env.local` exists; values are not included in audit output. Client configuration currently falls back to a real project. Server emulator variables do not connect browser or secondary Auth apps to emulators. Local Java 17 is available; Firebase CLI and Playwright were not found in project binaries.

## Confirmed inspection findings

Shared authentication accepts unverified identities after failed verification. Imported student list records can overwrite document IDs with stored `id`; root fallback reads are incompatible with nested-only updateStudent. Student restore can create partial documents and increment usage repeatedly. Direct student creation writes schoolUsage although rules permit only super-admin writes. Rules permit self-created teacher membership and broad tenant subtree reads. These require focused reproduction and repairs before readiness can be claimed.
