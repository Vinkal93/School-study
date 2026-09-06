# Phase 1: Plan & Pricing Foundation — Comprehensive Audit & Technical Specification

## 1. Executive Summary

SchoolStudy's Plan & Pricing Foundation has been upgraded into a production-grade, 100% dynamic, server-authoritative system. Super Admin can now create, configure, version, archive, and manage arbitrary plans (Basic, Standard, Professional, Enterprise, Premium, or Private Custom School Plans) backed by real Firestore collections, immutable version history snapshots, and strict server-calculated integer paise billing with 18% GST.

---

## 2. Core Architecture & System Specifications

### 2.1 Dynamic Plan Management (`plans` collection)
Every plan is defined dynamically in Firestore with no hardcoded limitations:
- `id`: e.g. `plan_standard-growth`
- `name`: Human-readable title
- `slug`: Unique lowercase slug identifier
- `description`: Institutional tier summary
- `status`: `"ACTIVE" | "INACTIVE" | "ARCHIVED"`
- `displayOrder`: Integer order for public & admin rendering
- `isPopular`: Boolean flag (enforced single popular plan)
- `publicVisible`: Boolean (`true` for public catalog on `/pricing`, `false` for private/custom negotiated plans)
- `version`: Current active version number (e.g. `1`, `2`, `3`)
- `isArchived`: Boolean flag protecting historical records
- `features`: Array of enabled capability keys from Feature Registry
- `limits`: Capacity limits (`maxStudents`, `maxTeachers`, `maxClasses`, `maxStaffAccounts`, `-1` for unlimited)
- `createdAt`, `updatedAt`: ISO 8601 timestamps

### 2.2 Plan Versioning (`planVersions` collection)
To preserve complete financial and entitlement immutability for past invoices and active subscriptions:
- Every plan starts with an initial `_v1` document in `planVersions`.
- Whenever a plan's prices, limits, or features are modified by Super Admin:
  1. The current active version is archived (`status: "ARCHIVED"`, `effectiveUntil: now()`).
  2. A new version document is created (`_v2`, `_v3`, etc.) with `status: "ACTIVE"`, `effectiveFrom: now()`, `effectiveUntil: null`.
  3. The parent plan's `version` pointer is updated.
  4. An audit event `PLAN_VERSION_CREATED` is logged.
- **Historical Immutability Guarantee**: Existing subscriptions and past invoices retain their immutable pointer (`planVersionId: "plan_xxx_v1"`) and locked amount in paise, completely unaffected by subsequent pricing increases.

### 2.3 Single Authoritative Server Pricing (Paise & 18% GST)
Client code NEVER dictates or calculates order amounts:
1. Base Price in integer paise ($P_{base}$)
2. Discount applied ($D_{paise}$) with coupon/offer caps
3. Taxable Amount: $P_{taxable} = P_{base} - D_{paise}$
4. GST (18%): $T_{paise} = \text{round}(P_{taxable} \times 0.18)$
5. Final Payable: $P_{final} = P_{taxable} + T_{paise}$

### 2.4 Feature Registry Foundation (`featureRegistry.ts`)
Authoritative catalog of all 11+ system modules and capabilities in preparation for Phase 2 dynamic sidebar entitlements:
- `dashboard` (`school_dashboard`, `staff_accounts`)
- `students` (`student_management`, `student_portal_access`)
- `teachers` (`teacher_management`, `teacher_portal_access`)
- `classes` (`class_management`)
- `attendance` (`basic_attendance`, `attendance_automation`)
- `timetable_bells` (`timetable_bells`)
- `rules_policies` (`rules_policies`)
- `notices` (`notices_announcements`)
- `fee_management` (`fee_management`)
- `reports_exports` (`advanced_reports`)
- `inquiries` (`inquiries_portal`)
- `subscription_billing` (`multi_school_management`, `priority_support`)

### 2.5 Safe Archive & Deletion Prevention
To prevent broken foreign keys and historical accounting corruption:
- Deleting a plan first queries `schoolSubscriptions`, `invoices`, and `orders`.
- If referenced by any active or historical records:
  - Destructive deletion is blocked.
  - The plan is automatically transitioned to `ARCHIVED` status (`status: "ARCHIVED"`, `isArchived: true`, `publicVisible: false`).
- If completely unreferenced (e.g., freshly created draft plan):
  - Clean deletion purges the plan document and associated draft versions.

---

## 3. Endpoints & API Reference

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/super-admin/pricing` | `GET` | Super Admin | Returns all plans (active, inactive, private, archived) enriched with active version data. |
| `/api/super-admin/pricing` | `POST` | Super Admin | Creates a dynamic plan and generates its initial `_v1` version document. |
| `/api/super-admin/pricing/[id]` | `GET` | Super Admin | Returns single plan detail, active version, and complete historical versions list. |
| `/api/super-admin/pricing/[id]` | `PATCH` | Super Admin | Updates plan properties; automatically triggers version increment on price/entitlement changes. |
| `/api/super-admin/pricing/[id]` | `DELETE` | Super Admin | Safe deletion check (blocks delete if referenced, archives safely). |
| `/api/super-admin/features/registry` | `GET` | Super Admin | Returns standard system feature catalog and category groupings. |
| `/api/pricing` | `GET` | Public | Returns all active & public-visible (`publicVisible === true`) plans for `/pricing`. |

---

## 4. Test Suite Verification Verdict

Automated test execution via `node scripts/test-dynamic-plans-foundation.mjs`:

| # | Test Scenario | Expected Outcome | Result |
| :--- | :--- | :--- | :--- |
| 1 | Feature Registry Module Coverage | 11+ modules, categories, standard routes | **PASSED** |
| 2 | Dynamic Custom Plan Creation | Creates custom tier with v1 snapshot in `planVersions` | **PASSED** |
| 3 | Automated Plan Versioning | Price edit archives v1, creates v2, bumps plan version | **PASSED** |
| 4 | Public vs Private Visibility | Private plans excluded from public `/pricing`, visible in Super Admin | **PASSED** |
| 5 | Server-Authoritative 18% GST Pricing | Base $\rightarrow$ Discount $\rightarrow$ Taxable $\rightarrow$ GST 18% $\rightarrow$ Integer Paise | **PASSED** |
| 6 | Historical Accounting Immutability | Past subscriptions & invoices retain original v1 price snapshot | **PASSED** |
| 7 | Safe Deletion & Archive Protection | Deleting plan with active/past subscribers safely archives plan | **PASSED** |
| 8 | Clean Unreferenced Plan Deletion | Unreferenced plans cleanly removed from Firestore | **PASSED** |
| 9 | Super Admin RBAC Enforcement | Non-super-admin roles rejected with 403 Forbidden | **PASSED** |
| 10 | Audit Logging Trail | `PLAN_CREATED`, `PLAN_UPDATED`, `PLAN_VERSION_CREATED`, `PLAN_ARCHIVED` recorded | **PASSED** |

**Regression Suite Results**:
- `test-offers-promotions.mjs`: **15/15 PASSED**
- `test-feature-control-center.mjs`: **9/9 PASSED**
- `test-finance-center.mjs`: **8/8 PASSED**
- TypeScript Compilation (`npx tsc --noEmit`): **0 ERRORS**
