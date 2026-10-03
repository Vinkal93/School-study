# Fee management verification

Run `node scripts/test-fee-integrity.cjs` to test production calculations and services against an isolated in-memory Firestore transaction fixture. No school records are changed by these tests. The fixture checks read-before-write ordering and rollback, but is not a substitute for an authenticated Firebase integration test.

## Local configuration

Fee APIs require Firebase Admin credentials through `FIREBASE_SERVICE_ACCOUNT_KEY` (service-account JSON in the server environment) or `GOOGLE_APPLICATION_CREDENTIALS` (an existing service-account credential file). Keep these private and out of Git; never use a `NEXT_PUBLIC_` variable for credentials. Restart Next after updating the server environment. Without these credentials, fee APIs return HTTP 503 with a configuration error.

## Manual checks

Use a test school/student and a specific academic session.

1. Create monthly tuition and transport structures. Generate invoices twice; verify the second run preserves invoice IDs, amounts, and existing payments.
2. Change the session in the Fee Management selector. Dashboard, student fees, collection, transactions, ledgers, discounts, receipts, reports and accounting should use that session.
3. Collect a partial payment against actual invoices. Compare cash received, remaining invoice dues, receipt, student ledger, cashbook and balanced accounting voucher.
4. Add a concession with a reason. Verify it reduces receivables and does not increase cash collection.
5. Retry a payment/adjustment/refund after a failed response. The same request must not create a second financial event.
6. Refund part of a receipt, then its remainder. Verify consumed allocations are not refunded twice and dues are restored. Reversal after a partial refund should be rejected.
7. Open partial/refunded/reversed receipts; their status must not say paid in full.
8. Set a ledger start date after an earlier invoice. Verify earlier movements appear in opening balance.
9. Record a school expense. Verify expense, voucher and cashbook outflow agree. Trial balance debits and credits should match.

Legacy payments without reconciled invoice allocations cannot safely be refunded automatically; the mutation rejects them rather than guessing which invoice to reopen. Existing historical data is not mass-migrated by this change.
