# SUPER ADMIN FINANCE CENTER — PRODUCTION AUDIT & ARCHITECTURE

## 1. Executive Summary

The **Super Admin Finance Center** (`/super-admin/finance`) is an enterprise-grade financial control and statutory compliance platform built for the School ERP ecosystem. It preserves 100% of the Super Admin Classic UI visual fidelity (header, tabs, stats cards, typography, badges, and layout) while implementing rigorous financial controls, double-entry accounting integrity, and statutory tax governance.

### Core Architecture Highlights
- **Integer Paise Precision**: Complete elimination of floating-point rounding errors by storing, computing, and transferring all monetary sums strictly in integer paise (₹1.00 = 100 paise).
- **Double-Entry Ledger Integrity**: Every incoming payment records a `CREDIT` transaction in `financeTransactions`, and any refund records a corresponding `DEBIT` reversal entry referencing the original transaction.
- **Statutory 18% GST Engine**: Full GST compliance with exact taxable base, discount, CGST (9%), SGST (9%), and IGST (18%) persistence.
- **Immutable Tax Invoices**: Invoices generated upon plan purchase remain permanently locked and historical records cannot be altered. Direct print/PDF action links route directly to `/billing/invoices/[id]`.
- **Server-Verified Refunds**: Refunds are executed via `/api/super-admin/finance/refunds` and `processRefund()` with strict balance validation (refund amount cannot exceed remaining refundable balance), automated subscription entitlement adjustments (`NO_CHANGE`, `REVOKE_ENTITLEMENT`, `END_AT_REFUND_TIME`), and immutable Super Admin audit logging.
- **Razorpay Gateway Health & Credential Shield**: Monitors API key, secret, and webhook configuration status while strictly masking secrets (`RxsV****************5j38`) on the server so that sensitive keys are never transmitted to the browser.
- **5-Way Financial Reconciliation**: An automated engine matches Razorpay Payments ↔ Internal Orders ↔ Invoices ↔ Finance Transactions ↔ School Subscriptions, automatically detecting orphan payments, missing invoices, or unfulfilled subscriptions.

---

## 2. Overview 10 KPIs Dashboard

The Overview tab provides real-time financial metrics computed directly from authoritative Firestore documents:

| KPI Metric | Calculation Logic | Source Collection |
| :--- | :--- | :--- |
| **Total Revenue** | Sum of `amount` where status in `['CAPTURED', 'SUCCESS', 'PARTIALLY_REFUNDED']` | `payments` |
| **This Month Revenue** | Captured payment amount where `capturedAt >= startOfMonth` | `payments` |
| **Today Revenue** | Captured payment amount where `capturedAt >= startOfToday` | `payments` |
| **Successful Payments** | Count of transactions with status in `['CAPTURED', 'SUCCESS', 'PARTIALLY_REFUNDED']` | `payments` |
| **Failed Payments** | Count of transactions with status `'FAILED'` | `payments` |
| **Refunds Total** | Total refund count and sum of `refundedAmount` in paise | `payments` & `refunds` |
| **Discounts Applied** | Total discounts granted across all issued invoices | `invoices` |
| **GST Collected** | Total 18% statutory tax collected across invoices | `invoices` |
| **Outstanding / Pending** | Sum of order amounts with status `'CREATED'` or `'PAYMENT_PENDING'` | `orders` |
| **Active Subscriptions** | Count of subscriptions with status `'ACTIVE'` and valid end dates | `schoolSubscriptions` |

---

## 3. Dedicated Financial Modules

### 3.1 Global Transactions Ledger
- Displays every transaction with enriched details: Transaction ID, School Name, School ID, Payer/Admin, Plan Name, Amount, Discount, GST, Final Amount, Payment Method, Gateway, Status, and Timestamp.
- Slide-over Transaction Detail Drawer with complete JSON metadata, 5-way linked entities, and direct trigger for Super Admin refunds.
- Comprehensive multi-criteria filters: Date range, School, Plan, Status, and Payment Method.

### 3.2 Statutory Tax Invoices
- Searchable invoice table with sequential invoice numbers (`INV-YYYY-XXXXX`), School, Plan, Base Amount, Discount, Taxable Amount, 18% GST, Final Amount, Status, and Date.
- Direct **"View / Print Official Invoice"** link opening `/billing/invoices/[id]` with browser print styling and PDF support.
- Immutable storage guarantee: invoice amounts and line items cannot be mutated post-issuance.

### 3.3 Server-Verified Refund Workflow
- Initiated via the UI modal or drawer with safety controls:
  1. Maximum refundable amount strictly capped at `payment.amount - (payment.refundedAmount || 0)`.
  2. Creates an atomic `DEBIT` transaction entry in `financeTransactions`.
  3. Updates payment status to `REFUNDED` or `PARTIALLY_REFUNDED` and increments `refundedAmount`.
  4. Applies selected subscription policy:
     - `NO_CHANGE`: Preserves access (goodwill or correction).
     - `REVOKE_ENTITLEMENT`: Immediately suspends/cancels school subscription.
     - `END_AT_REFUND_TIME`: Expires school subscription as of the refund moment.
  5. Records an immutable audit log entry in `superAdminAuditLogs`.

### 3.4 Razorpay Gateway Health & Masked Credentials
- Real-time detection of Test vs Live mode based on key prefix (`rzp_test_...` vs `rzp_live_...`).
- Strict credential masking on the server:
  - Key Secret: `RxsV****************5j38`
  - Webhook Secret: `whs_****************9921`
- Raw secrets are never exposed in API responses or frontend state.

### 3.5 5-Way Reconciliation & Anomaly Detection
- Cross-validates:
  $$\text{Payment} \longleftrightarrow \text{Order} \longleftrightarrow \text{Invoice} \longleftrightarrow \text{Finance Tx} \longleftrightarrow \text{Subscription}$$
- Flags inconsistencies:
  - **Orphan Payment**: Payment without linked internal order.
  - **Missing Invoice**: Captured payment without issued tax invoice.
  - **Missing Ledger Record**: Payment without corresponding `financeTransactions` entry.
  - **Subscription Mismatch**: Successful plan payment without active subscription provisioning.

---

## 4. Test Suite Execution & Verification

An automated E2E test suite (`scripts/test-finance-center.mjs`) was created and executed:

```
===============================================================================
   SUPER ADMIN FINANCE CENTER — E2E TEST SUITE                                
===============================================================================

>> Test 1: Plan Purchase -> Order -> Payment -> Invoice -> Finance Tx -> Subscription...
   [PASSED] 5-Way Fulfillment completed with exact integer paise and 18% GST calculation.

>> Test 2: Overview 10 KPIs Computation...
   [PASSED] 10 Financial Overview KPIs verified: {
  totalRevenuePaise: 3421764,
  thisMonthRevenuePaise: 3421764,
  todayRevenuePaise: 3421764,
  successfulPaymentsCount: 2,
  failedPaymentsCount: 1,
  refundsCount: 0,
  refundsPaise: 0,
  discountsPaise: 100000,
  gstCollectedPaise: 521964,
  outstandingPaise: 0,
  activeSubscriptionsCount: 2
}

>> Test 3: Super Admin Refund Workflow with Balance Safeguards...
   [PASSED] Refund validated, ledger reversed with DEBIT transaction, and audited.

>> Test 4: Historical Tax Invoices Immutability...
   [PASSED] Historical tax invoice amounts remain locked and immutable.

>> Test 5: Razorpay Gateway Health & Masked Credentials...
   [PASSED] Gateway secrets strictly masked (never exposed to client).

>> Test 6: 5-Way Reconciliation & Anomaly Detection...
   [PASSED] Reconciliation detected unlinked/missing artifacts for failed payment sample.

>> Test 7: Multi-Criteria Filtering (School, Plan, Status)...
   [PASSED] Financial metrics partitioned accurately by school tenant.

>> Test 8: Super Admin RBAC Security Enforcement...
   [PASSED] Unauthorized callers rejected with HTTP 401 and HTTP 403 Forbidden.

===============================================================================
   ALL 8 E2E TEST SUITE SCENARIOS PASSED WITH ZERO FAILURES!                  
===============================================================================
```

---

## 5. Security & RBAC Enforcement

- **Route Protection**: `/super-admin/finance` is secured with Super Admin layout protection and requires `role === 'SUPER_ADMIN'`.
- **API Guard**: `/api/super-admin/finance` and `/api/super-admin/finance/refunds` verify session cookies / bearer tokens via Firebase Admin SDK. Non-super-admins receive an immediate `HTTP 403 Forbidden`.
- **Client Shielding**: Secrets and private keys are never exposed in wire payloads.
- **Audit Traceability**: All refund actions, manual transaction overrides, and gateway settings updates write persistent records to `superAdminAuditLogs`.
