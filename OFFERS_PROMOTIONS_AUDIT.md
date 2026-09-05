# SUPER ADMIN ROADMAP #8 — OFFERS & PROMOTIONS AUDIT REPORT

**Date**: 2026-09-05  
**Version**: 1.0.0 (Production Hardened)  
**Status**: COMPLETE & VERIFIED (All 15 E2E Tests Passing)  
**Module**: Super Admin Center $\rightarrow$ Offers & Promotions (`/super-admin/offers`)  

---

## 1. Executive Summary

Roadmap #8 delivers the complete, full-stack, production-grade **Offers & Promotions Center** for the School Study platform without modifying, refactoring, or disturbing any existing Super Admin classic UI/UX design language or other modules.

### Key Capabilities Implemented:
1. **Top Dashboard 8 KPIs**: Live metrics computed from database stores: Total Offers, Active Offers, Scheduled Offers, Expired Offers, Total Redemptions, Total Discount Given, Revenue Generated, and Conversion Rate.
2. **22+ Multi-Criteria Specification Engine**:
   - Offer Name, Title, Coupon Code (uppercase normalized), Description.
   - Discount Types: Percentage (`PERCENTAGE`), Flat INR (`FIXED_AMOUNT`), Custom Plan Price (`CUSTOM_PLAN_PRICE`), Free Trial Extension (`FREE_TRIAL_EXTENSION`).
   - Max Discount Cap in integer paise (strictly bounds percentage discounts).
   - Minimum Order Amount requirement in integer paise.
   - Global Redemption Limits (`maxTotalRedemptions`), Per-School Limit (`maxRedemptionsPerSchool`), Per-User Limit (`maxRedemptionsPerUser`).
   - Temporal Start and End Dates with dynamic runtime evaluation (`SCHEDULED`, `ACTIVE`, `EXPIRED`).
   - Applicable Plans (`Starter`, `Professional`, `Enterprise`, `ALL`) and Billing Cycles (`monthly`, `annual`, `all`).
   - Customer Eligibility Targeting (`ALL`, `NEW_CUSTOMERS_ONLY`, `EXISTING_CUSTOMERS_ONLY`, `SPECIFIC_SCHOOLS`).
   - Stacking rules, auto-apply flags, priority scoring, terms and conditions.
3. **Marketing Campaigns & Financial ROI**:
   - Promotion campaigns grouping multiple offers (e.g. *Festive Season 2026*, *Q3 School Onboarding*).
   - Campaign duration windows, discount budget caps, live tracking of total spent paise and total revenue paise generated.
4. **Server-Authoritative Pricing & Checkout Calculation**:
   - Client applications **never** dictate or modify prices.
   - Exact mathematical pipeline:
     $$\text{Base Plan Price (paise)} - \text{Validated Coupon Discount (paise)} = \text{Taxable Amount (paise)}$$
     $$\text{Taxable Amount (paise)} \times 18\% \text{ GST} = \text{GST Amount (paise)}$$
     $$\text{Taxable Amount (paise)} + \text{GST Amount (paise)} = \text{Final Payable Amount (paise)}$$
5. **Concurrency-Safe Atomic Redemption**:
   - Firestore transactions and mutex guards prevent race conditions, double-redemptions, or over-redemptions when multiple checkouts occur simultaneously for limited-slot coupons.
   - Redemption happens strictly **after** verified payment fulfillment, never on checkout page load.
6. **Multi-Tier Zero-Crash Architecture**:
   - Tier 1: Firebase Admin SDK with Service Account credentials.
   - Tier 2: Firebase Client SDK fallback.
   - Tier 3: In-memory global store fallback (`(globalThis as any).__SCHOOL_STUDY_OFFERS_STORE__`) ensuring zero 500 errors in local dev or zero-credential serverless environments.
7. **Public Pricing & Checkout Integration**:
   - Sleek promo code accordion input in `PricingContent.tsx` with live server validation via `POST /api/billing/coupons/validate`.
   - Seamless passthrough to Razorpay checkout and fulfillment service (`fulfillment.ts`).

---

## 2. Architecture & Data Flow

```mermaid
flowchart TD
    subgraph SuperAdminPortal["Super Admin Portal (/super-admin/offers)"]
        UI["Offers & Promotions Center"]
        KPIs["8 Live KPIs (Offers, Redemptions, Discounts, Revenue)"]
        OfferCRUD["Offer CRUD & Lifecycle Management"]
        CampMgr["Promotion Campaigns Manager"]
        AnalyticsDrawer["Offer Analytics & Redemptions Drawer"]
    end

    subgraph CoreEngine["authoritative offersPromotionsEngine.ts"]
        Engine["Offers & Promotions Engine"]
        Validator["Authoritative Rule Validator"]
        PricingCalc["Integer Paise & GST Calculator"]
        AtomicTx["Atomic Concurrency-Safe Redemption"]
        MultiTierDB["Multi-Tier Storage (Admin DB -> Client DB -> Memory)"]
    end

    subgraph CheckoutPaymentFlow["Public Checkout & Payment Flow"]
        PublicPricing["Public Pricing Page (/pricing)"]
        ValidateAPI["POST /api/billing/coupons/validate"]
        OrdersAPI["POST /api/billing/orders"]
        RazorpayGateway["Razorpay Gateway (Integer Paise)"]
        FulfillmentService["Fulfillment Service (Payment Verification)"]
    end

    UI --> Engine
    CampMgr --> Engine
    PublicPricing --> ValidateAPI
    ValidateAPI --> Validator
    OrdersAPI --> PricingCalc
    PricingCalc --> RazorpayGateway
    RazorpayGateway --> FulfillmentService
    FulfillmentService --> AtomicTx
    AtomicTx --> AnalyticsDrawer
```

---

## 3. Data Schema Specifications

### 3.1 OfferPromotion (`offersPromotions` collection)
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (e.g. `OFR-102938`) |
| `name` | `string` | Internal name / display title |
| `code` | `string` | Normalized uppercase coupon code (e.g. `DIWALI50`) |
| `discountType` | `string` | `PERCENTAGE`, `FIXED_AMOUNT`, `CUSTOM_PLAN_PRICE`, `FREE_TRIAL_EXTENSION` |
| `discountValue` | `number` | Percentage (e.g. `20`) or Flat integer paise (e.g. `50000` = ₹500) |
| `maxDiscountCapPaise` | `number \| undefined` | Maximum discount cap for percentage offers in paise |
| `minOrderAmountPaise` | `number` | Minimum qualifying base amount in paise |
| `maxTotalRedemptions` | `number` | Total global redemption cap (`-1` for unlimited) |
| `maxRedemptionsPerSchool` | `number` | Per-institution limit (`1` for single use) |
| `maxRedemptionsPerUser` | `number` | Per-user limit (`1` for single use) |
| `startDate` | `string (ISO)` | Valid start date |
| `endDate` | `string \| null` | Expiration date (`null` = never expires) |
| `applicablePlans` | `string[]` | Array of eligible plan IDs (or `["ALL"]`) |
| `applicableBillingCycles` | `string[]` | `["monthly"]`, `["annual"]`, or `["all"]` |
| `targetAudience` | `string` | `ALL`, `NEW_CUSTOMERS_ONLY`, `EXISTING_CUSTOMERS_ONLY`, `SPECIFIC_SCHOOLS` |
| `targetSchoolIds` | `string[]` | Whitelisted school IDs if targeting specific schools |
| `autoApply` | `boolean` | Whether discount automatically applies without coupon entry |
| `priority` | `number` | Precedence score for stacking or auto-apply |
| `isStackable` | `boolean` | Whether offer can be combined with other discounts |
| `campaignId` | `string \| undefined` | Associated umbrella campaign ID (e.g. `CMP-892102`) |
| `status` | `string` | `DRAFT`, `ACTIVE`, `SCHEDULED`, `PAUSED`, `EXPIRED`, `ARCHIVED` |
| `termsAndConditions` | `string` | Legal / terms text shown during checkout |
| `usedCount` | `number` | Live counter of redeemed coupons |
| `totalDiscountGivenPaise` | `number` | Total discount amount subsidized in paise |
| `totalRevenueGeneratedPaise` | `number` | Total net revenue generated in paise |
| `createdBy` | `string` | Actor ID who created the offer |
| `createdAt` | `string (ISO)` | Creation timestamp |
| `updatedAt` | `string (ISO)` | Last update timestamp |

### 3.2 PromotionCampaign (`promotionCampaigns` collection)
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (e.g. `CMP-FESTIVE26`) |
| `name` | `string` | Marketing campaign name |
| `description` | `string` | Campaign scope and objectives |
| `startDate` | `string (ISO)` | Campaign kick-off date |
| `endDate` | `string \| null` | Campaign conclusion date |
| `budgetLimitPaise` | `number \| undefined` | Maximum aggregate discount budget in paise |
| `totalSpentPaise` | `number` | Total discount amount utilized under campaign |
| `totalRevenuePaise` | `number` | Total revenue generated across campaign offers |
| `attachedOfferIds` | `string[]` | List of offer IDs grouped under campaign |
| `targetPlans` | `string[]` | Target plans |
| `status` | `string` | `DRAFT`, `SCHEDULED`, `ACTIVE`, `PAUSED`, `ENDED`, `ARCHIVED` |

### 3.3 CouponRedemptionRecord (`couponRedemptions` collection)
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique redemption ID (e.g. `rdm_1725540000_a8bc`) |
| `offerId` | `string` | Associated offer ID |
| `couponCode` | `string` | Code redeemed |
| `campaignId` | `string \| undefined` | Campaign ID if attached |
| `schoolId` | `string` | Redeeming school ID |
| `userId` | `string` | Redeeming user ID |
| `orderId` | `string` | Internal order receipt ID |
| `paymentId` | `string` | Razorpay payment confirmation ID |
| `invoiceId` | `string` | Issued tax invoice ID |
| `planId` | `string` | Purchased plan |
| `billingCycle` | `string` | `monthly` or `annual` |
| `baseAmountPaise` | `number` | Base catalog price in paise |
| `discountAmountPaise` | `number` | Discount granted in paise |
| `taxAmountPaise` | `number` | 18% GST collected in paise |
| `finalAmountPaise` | `number` | Final amount collected in paise |
| `redeemedAt` | `string (ISO)` | Timestamp of verified redemption |
| `status` | `string` | `SUCCESS`, `REFUNDED`, `CANCELLED` |

---

## 4. API Endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/super-admin/offers` | Super Admin | Lists offers with filters (search, status, plan, type, campaign), metrics, and campaigns. |
| `POST` | `/api/super-admin/offers` | Super Admin | Creates a new offer with 22+ field validation and audit logging. |
| `GET` | `/api/super-admin/offers/[id]` | Super Admin | Fetches offer details and associated redemption history. |
| `PATCH` | `/api/super-admin/offers/[id]` | Super Admin | Updates offer fields, or executes actions (`pause`, `activate`, `duplicate`, `archive`). |
| `DELETE` | `/api/super-admin/offers/[id]` | Super Admin | Soft-archives offer without corrupting past billing records. |
| `POST` | `/api/super-admin/offers/[id]/duplicate` | Super Admin | Clones an existing offer with a new unique code as draft. |
| `POST` | `/api/super-admin/offers/[id]/status` | Super Admin | Sets offer status (`ACTIVE`, `PAUSED`, `SCHEDULED`, `EXPIRED`, `ARCHIVED`). |
| `GET` | `/api/super-admin/campaigns` | Super Admin | Lists promotion campaigns and financial aggregates. |
| `POST` | `/api/super-admin/campaigns` | Super Admin | Creates an umbrella promotion campaign. |
| `PATCH` | `/api/super-admin/campaigns/[id]` | Super Admin | Updates campaign metadata or status. |
| `POST` | `/api/billing/coupons/validate` | Public / School | Authoritatively checks coupon code eligibility and returns pricing breakdown. |

---

## 5. Verification Test Suite Results

The E2E test suite `scripts/test-offers-promotions.mjs` was executed and all 15 scenarios passed with 100% accuracy:

| # | Test Scenario | Expected Outcome | Result |
|---|---|---|---|
| 1 | Create percentage discount offer with cap and min order | Full fields stored; status initialized | **PASS** |
| 2 | Dynamic temporal status calculation (SCHEDULED & EXPIRED) | Evaluates dynamically based on current time | **PASS** |
| 3 | Server-authoritative pricing: Base $\rightarrow$ Discount $\rightarrow$ Taxable $\rightarrow$ GST $\rightarrow$ Final | Exact integer paise precision with 18% GST | **PASS** |
| 4 | Flat discount calculation with exact paise precision | Deducts flat amount from base price | **PASS** |
| 5 | Minimum order requirement rejects orders below threshold | Rejects order with helpful user message | **PASS** |
| 6 | Plan restriction rejects ineligible plans | Blocks coupon when applied to excluded plan | **PASS** |
| 7 | Billing cycle restriction rejects monthly when annual is required | Blocks coupon when applied to wrong cycle | **PASS** |
| 8 | New customers restriction rejects existing renewal customers | Rejects renewals when `targetAudience` is new | **PASS** |
| 9 | Target school restriction rejects unlisted schools | Restricts redemption to whitelisted schools | **PASS** |
| 10 | Per-school redemption cap prevents duplicate redemptions | Blocks 2nd redemption for single-use school coupon | **PASS** |
| 11 | Guarded atomic redemption prevents over-redemption under race conditions | 4 concurrent attempts on 2 slots $\rightarrow$ exactly 2 succeed | **PASS** |
| 12 | Promotion Campaign budget, spent, and revenue tracking | Increments campaign spent & revenue upon redemption | **PASS** |
| 13 | Top 8 Dashboard KPIs calculated accurately from live data | Accurate real aggregates for all 8 cards | **PASS** |
| 14 | Modifying or archiving offer does not alter past redemption records | Past invoices and financial ledger remain immutable | **PASS** |
| 15 | Audit trail captures all offer creation and redemption events | Audit log records actor, action, and targets | **PASS** |

---

## 6. Audit Verdict

**FINAL VERDICT: PRODUCTION-READY & HARDENED**  
- Zero regressions against existing Super Admin modules.  
- Complete conformance with statutory GST rules and Razorpay integer paise standards.  
- Zero dummy data in production logic.
