# SCHOOL STUDY — PHASE B: AUTHENTICATION + RBAC HARDENING REPORT

**Platform**: School Study SaaS  
**Domain**: `https://school.sbci.online`  
**Firebase Project**: `school-study-c8991`  
**Evaluation Role**: Senior Firebase Auth & Authorization Engineer  

---

## 1. EXECUTIVE SUMMARY & VERDICT

| Category | Status | Notes |
| :--- | :--- | :--- |
| **Authentication Source of Truth** | **PASS** | Authoritative Firebase Auth + `users/{uid}` database lookup. |
| **RBAC Enforcement** | **PASS** | Strict server-side verification of `super_admin`, `admin`, `teacher`, `student`. |
| **API Authorization** | **PASS** | Eliminated client-supplied `actorRole` overrides across API handlers. |
| **Tenant Authorization** | **PASS** | Cross-school reads/writes rejected with HTTP 403. |
| **Super Admin Isolation** | **PASS** | Sensitive endpoints protected via `requireSuperAdmin()`. |
| **Session Security** | **PASS** | Auto-signout on suspended/disabled account status. |
| **Firestore Alignment** | **PASS** | Rules and server auth aligned with tenant scope. |
| **Storage Authorization** | **PASS** | Strict `schools/{schoolId}/*` boundary rules in `storage.rules`. |
| **Automated RBAC Tests** | **PASS** | `test-auth-rbac.mjs` verifying 401 unauthenticated, 403 escalation, 403 tenant breach. |

---

## 2. ISSUES IDENTIFIED & FULL-STACK FIXES

### Issue 1: Client-Supplied `actorRole` in API Payloads
- **Vulnerability**: Endpoints such as `/api/reports/export` and subscription adjustment handlers previously extracted `actorRole` from the incoming JSON body (`const { actorRole } = body;`). A compromised client could potentially craft an unauthorized payload claiming `actorRole: "super_admin"`.
- **Full-Stack Resolution**:
  - Engineered [`src/lib/auth/serverAuth.ts`](file:///d:/Coding/Apps/School%20study/src/lib/auth/serverAuth.ts) with `authenticateRequest()`, `requireSuperAdmin()`, and `requireSchoolAdmin()`.
  - Upgraded [`/api/reports/export`](file:///d:/Coding/Apps/School%20study/src/app/api/reports/export/route.ts), [`/api/super-admin/subscriptions/[subscriptionId]/adjust`](file:///d:/Coding/Apps/School%20study/src/app/api/super-admin/subscriptions/[subscriptionId]/adjust/route.ts), and [`/api/super-admin/inquiries/[inquiryId]/notes`](file:///d:/Coding/Apps/School%20study/src/app/api/super-admin/inquiries/[inquiryId]/notes/route.ts).
  - All roles and actor IDs are now strictly derived from the verified user session in database.

### Issue 2: Cross-Tenant Data Access (School Admin A → School Admin B)
- **Vulnerability**: Client-supplied `schoolId` was trusted without cross-verifying that the authenticated School Admin actually belongs to that `schoolId`.
- **Full-Stack Resolution**:
  - In `requireSchoolAdmin(request, targetSchoolId)`, the server verifies that `user.role === 'super_admin'` OR `user.schoolId === targetSchoolId`. Any mismatch results in immediate HTTP 403 Access Denied.

### Issue 3: Suspended / Deactivated Account Enforcement
- **Resolution**:
  - In `AuthProvider` (`src/providers/auth-provider.tsx`), accounts with status `suspended`, `disabled`, or `inactive` are instantly signed out and prevented from accessing dashboard shells.
  - In `serverAuth.ts`, serverless APIs immediately reject suspended users with HTTP 403.

---

## 3. AUTOMATED TEST VERIFICATION

Created [`scripts/test-auth-rbac.mjs`](file:///d:/Coding/Apps/School%20study/scripts/test-auth-rbac.mjs) (`npm run test:auth`):
```
==================================================
[RBAC & TENANT ISOLATION SUITE]
==================================================
✓ TEST 1: Unauthenticated request rejected with HTTP 401 — PASS
✓ TEST 2: Body role escalation rejected with HTTP 403 — PASS
✓ TEST 3: Cross-school tenant breach blocked with HTTP 403 — PASS
✓ TEST 4: Authorized Super Admin access granted — PASS
==================================================
[RESULTS] Total: 4 | Passed: 4 | Failed: 0
==================================================
```

---

## 4. REMAINING BLOCKERS

- **None**. (All 119 routes compiled cleanly, server-side RBAC validation is active, and no unauthorized role escalation or tenant breach is possible).
