# Admission, fee and subscription flow audit — 2026-10-03

## Implemented flow

School registration requires a published, active, zero-price registration plan and its real pricing version. Auth creation is compensated when the atomic school/admin/subscription transaction fails. The registration UI signs into the returned admin UID, rejects external redirects and preserves the pending plan checkout. Registration itself cannot grant a paid plan.

Admission validates the school class and specific academic session before creating student Auth. Student/login profiles, roll reservation and usage are committed together. Failed writes remove the newly created Auth account. Saved admission calls the authoritative invoice-generation API. If invoice setup fails, the UI explicitly reports that admission was saved and invoices need retrying; it does not silently claim fees are ready or require duplicate admission.

Fee collection uses the existing authoritative demand/receipt/allocation/journal transaction. Partial collection, exact session isolation, discounts, repeated refunds, receipt retry, reversal, cashbook, student ledger and trial balance are covered by financial regression fixtures. A receipt identifier alone no longer proves a legacy month is fully paid. Fee APIs enforce the school plan capability after verified authentication.

Checkout verifies the actor and school, reads actual published pricing, preserves zero prices, validates offer scope/duration, and persists an internal order before opening the gateway. Missing configuration returns an explicit error. Payment verification checks HMAC and fetches the captured gateway payment; order, amount and currency must match. Callback and webhook share one atomic idempotent commit for order/payment/invoice/finance/subscription/school/audit records. Delivery failures remain retryable. Same-plan renewal preserves remaining paid days; suspension and zero-day grace are preserved. Mandate authentication alone cannot activate paid access. Expired recurring periods cannot appear active.

Billing reads no longer invent plans, prices, subscriptions or payment events. The assigned pricing version is read explicitly. Server reads use private Admin access; browser bundles substitute a fail-closed stub for private Admin SDK imports. Renewal endpoints authenticate the school and do not claim success after a gateway failure or enable autopay without a real mandate.

## Verification evidence and limits

- `npm run test:release`: 70 isolated scenarios: 17 financial, 22 plan/admission/promotion, 6 fee-server access and 25 checkout/payment/registration. Fixtures execute production TypeScript with simulated database/gateway transactions; they do not write live records or charge cards.
- Type checking and production build are required against the latest branch commit. Consult the PR checks for the final result; earlier successful commits do not validate later edits.
- Browser/mobile journeys, a real separate Firebase test project, actual Razorpay test checkout, mandate renewal, offer/coupon exhaustion races, gateway refunds and webhook delivery/retries remain unverified without test configuration. No real financial test writes or migrations were performed.
- Automatic scheduled downgrades are explicitly unavailable until a verified gateway schedule processor exists. The endpoint directs users to cancel renewal and use target-plan checkout, preserving paid access; it no longer pretends a background downgrade was scheduled successfully.
- Limited-use offers/coupons require concurrency testing and reservation policy before release. Captured-payment counters are updated once, but simultaneous pre-payment checkout is not an atomic redemption reservation.

## Required before release

1. Configure a separate Firebase test service account and Razorpay test keys/webhook secret, outside Git. Reproduce new-school registration, role redirects, plan assignment, exact-session admission, invoice generation, partial collection, receipt, reports and expiry as real users.
2. Run real Razorpay successful/cancelled/failed checkout and duplicate/out-of-order webhook deliveries. Confirm one subscription credit, one invoice and one finance transaction. Test mandate cancellation and retry after database outage.
3. Review the Firestore rules patch separately. It removes duplicate public write permissions for subscriptions, orders, payments and invoices. The complete ruleset is not certified: legacy overrides, usage, history and finance rules need separate emulator review. Rules were not deployed.
4. Export/back up billing data and the currently deployed rules before applying reviewed rules. Check school-admin own-school reads, cross-school denial, super-admin configuration and Admin-only fulfillment. Restore the previous rules only as an owner-approved emergency rollback; a code rollback does not undo data.
5. Keep PR #2 draft. Require Release checks, Safe release gate and Vercel deployment success, then owner preview approval before main merge. This audit is not an MVP production-readiness certificate.
