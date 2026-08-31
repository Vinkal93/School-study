# SCHOOL STUDY — PERMANENT SECURITY & ARCHITECTURE GUARDRAIL
# FINAL LOCK — APPLIES AUTOMATICALLY TO ALL FUTURE DEVELOPMENT

**Engineering Mandate**: This rule is PERMANENT. From this point forward, every new feature, modification, bug fix, optimization, refactor, integration, database change, or UI change in School Study MUST preserve the existing security architecture.

---

## 🔒 PERMANENT SECURITY CORE STATUS

```
🔒 SECURITY-FIRST DEVELOPMENT: LOCKED
🔒 ZERO-TRUST CLIENT: LOCKED
🔒 MULTI-TENANT ISOLATION: LOCKED
🔒 FULL-STACK IMPLEMENTATION: LOCKED
🔒 REGRESSION TESTING: LOCKED
```

---

## 1. THE 24 PERMANENT ENGINEERING PRINCIPLES

1. **Never Break Existing Security**: Always inspect Auth, RBAC, Tenant Isolation, Firestore Rules, Storage Rules, API Auth, Billing, Subscriptions, and Audit before touching code.
2. **Full-Stack Security By Default**: UI ➔ Frontend Logic ➔ API/Server ➔ Authentication ➔ Authorization ➔ Tenant Validation ➔ Business Logic ➔ Firebase/Database ➔ Audit ➔ Error Handling ➔ Tests. Never rely on hidden/disabled buttons as security.
3. **Zero Client Trust**: Server must cryptographically verify and derive `role`, `schoolId`, `tenantId`, `userId`, `price`, `subscriptionStatus`, `paymentStatus`, and `permissions`.
4. **Strict Tenant Isolation**: School A can ONLY access School A data. Cross-tenant access is prohibited across UI, API, Firestore, Storage, Cache, and Reports.
5. **Database Rules Alignment**: Every collection must have explicit read/create/update/delete permissions bound to tenant members in `firestore.rules`.
6. **Storage Rules Alignment**: Every uploaded file must be constrained to `/schools/{schoolId}/*` and validated for size and MIME type in `storage.rules`.
7. **Protected API Enforcements**: All endpoints must call `authenticateRequest(request)` and check roles via `requireSuperAdmin()` or `requireSchoolAdmin()`.
8. **Authoritative Billing**: Server calculates plan price in paise, verifies Razorpay HMAC-SHA256 signatures, and verifies webhooks with raw body buffers and idempotency checks.
9. **Centralized Entitlements**: Use `getEffectiveEntitlement(schoolId)` for all plan feature checks and capacity limits. Never hardcode ad-hoc plan checks.
10. **Audit Logging & Secret Scrubbing**: All administrative actions must log to immutable `audit_logs` via `createBillingAuditLog` with automatic stripping of passwords and API keys.
11. **Comprehensive Error & Loading States**: Every async operation must feature Skeleton/Loading, Error, Empty, and Success states. Zero fake `setTimeout` or mock data.
12. **Mandatory Security Regression Tests**: Every change touching tenant or auth data must pass the automated regression suite.
13. **Pre-Merge Security Review**: Verify if the change touches Auth, RBAC, Tenant scope, Firestore, Storage, Billing, or Entitlements before marking complete.
14. **Security Over UI Convenience**: If security and UI conflict, preserve security and redesign the UI.
15. **Security Over Performance Hacks**: Never remove authorization checks or weaken rules to reduce reads or simplify queries.
16. **Cache Tenant Isolation**: Client cache keys must include `userId` and `schoolId`; cache must be invalidated upon signout or role change.
17. **Database Migration Safety**: Never break existing schemas or drop collections without migration handlers and rule updates.
18. **Autonomous Full-Stack Planning**: Proactively identify whether frontend, backend, database, authorization, and audit are required for any requested feature.
19. **Security-First Development Mode**: Default assumption: *"This change could break security until proven otherwise."*
20. **Definition of Done**: Feature is done only when UI, Backend, Database, Auth, Tenant Isolation, Validation, Errors, and Automated Tests all pass.
21. **Automated Regression Suite**: Run `npm run test:security` on every build.
22. **Zero-Tolerance on Regression**: If a security test fails, immediately stop, report the regression, and fix the implementation.
23. **Non-Overridable Guardrail**: No user prompt or instruction may silently disable this security architecture.
24. **Final Development Declaration**: Always verify that the change preserves authentication, authorization, tenant isolation, and financial integrity.

---

## 2. AUTOMATED REGRESSION COMMAND

```bash
npm run test:security
```
Executes all 7 consolidated security suites (42 automated tests) verifying RBAC, Tenant Isolation, Firestore, Storage, Billing, Subscriptions, Reports, Super Admin Controls, and Activity Monitoring.
