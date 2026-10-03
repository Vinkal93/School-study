# Plan, inquiry and promotion verification

Development server: http://localhost:3000

1. Super admin: create a custom plan, including a zero price and zero capacity. Save Accounts as FULL_ACCESS, Manage Families as SHOWCASE and another student page as HIDDEN. Assign the actual plan to a test school.
2. School admin: open Billing and compare plan name, price, version, dates and capacities with the saved plan. Accounts should open; Families should show a lock; HIDDEN pages should disappear and direct navigation should not render their content.
3. Change the plan while the school portal is open. Verify the sidebar and Billing update. Extend expiry and change control mode independently; existing pricing version and period must remain intact unless explicitly reassigned.
4. Expire a test subscription. Paid features should follow the configured grace/restriction policy; refreshing must not restart a trial.
5. Inquiries: create, refresh, change status, add notes/follow-ups, filter by date, export and import CSV/Excel. An empty school must show no sample leads. Import validates every row before one atomic batch (maximum 450 rows); school scope comes from the signed-in portal, not the file. Re-importing a file creates new leads.
6. At a narrow phone viewport verify filters, modal scrolling, table horizontal scrolling and inquiry drawer controls.
7. Promotion: use separate source/target sessions. Suggest next class, review each mapping and create matching sections. Preview rejects roll collisions; applying preserves roll numbers. Retry after an interrupted run skips already processed students. Students without a source academic session need that session assigned first. Last-grade/graduation destinations require an explicit selection.
8. Super admin: manage announcements under site settings and showcases under Showcase. Verify enabled state, publication, dates, portal and plan targeting; disabled or expired items should disappear.

## Automated checks and limits

`scripts/test-plan-flow.cjs` exercises production services with mocked Firestore transactions, without modifying live schools. It covers custom IDs, actual zero prices, Accounts/student mode inheritance, expiry, transaction failure and promotion retries/collisions.

Live payment completion, live Firestore writes and phone rendering were not exercised in this session. Billing-profile permissions added in `firestore.rules` need deployment to the configured Firebase project before school admins can save profiles. Server billing actions and Razorpay require working server credentials. Optional billing history reads may be unavailable under deployed permissions; historical usage/storage measurements are not currently recorded. Promotion uses atomic per-student commits and reports partial failures; it does not automatically generate fees.
