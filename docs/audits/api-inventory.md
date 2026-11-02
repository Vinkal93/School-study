# School Study SaaS — API Inventory

Total Endpoints: 176

| Endpoint | Methods | Source File | Auth / Security |
|---|---|---|---|
| `/api/activity/log` | `POST` | `src/app/api/activity/log/route.ts` | Public / Open |
| `/api/admin/backup/export` | `GET` | `src/app/api/admin/backup/export/route.ts` | Authenticated User |
| `/api/admin/backup/import/execute` | `POST` | `src/app/api/admin/backup/import/execute/route.ts` | Authenticated User |
| `/api/admin/backup/import/preview` | `POST` | `src/app/api/admin/backup/import/preview/route.ts` | Authenticated User |
| `/api/admin/backup/template` | `GET` | `src/app/api/admin/backup/template/route.ts` | Authenticated User |
| `/api/admin/firebase-status` | `GET` | `src/app/api/admin/firebase-status/route.ts` | Authenticated User |
| `/api/admin/repair-classes-students` | `POST` | `src/app/api/admin/repair-classes-students/route.ts` | Authenticated User |
| `/api/admin/search` | `GET` | `src/app/api/admin/search/route.ts` | Authenticated User |
| `/api/admin/students/[id]/credentials` | `GET`, `POST` | `src/app/api/admin/students/[id]/credentials/route.ts` | Authenticated User |
| `/api/admin/students/bulk-delete` | `POST` | `src/app/api/admin/students/bulk-delete/route.ts` | Authenticated User |
| `/api/ai/chat` | `POST` | `src/app/api/ai/chat/route.ts` | Authenticated User |
| `/api/ai/conversations` | `GET`, `POST` | `src/app/api/ai/conversations/route.ts` | Authenticated User |
| `/api/ai/conversations/[id]` | `GET`, `DELETE` | `src/app/api/ai/conversations/[id]/route.ts` | Authenticated User |
| `/api/ai/entitlement` | `GET` | `src/app/api/ai/entitlement/route.ts` | Authenticated User |
| `/api/ai/tools` | `POST` | `src/app/api/ai/tools/route.ts` | Authenticated User |
| `/api/auth/impersonate` | `POST`, `DELETE` | `src/app/api/auth/impersonate/route.ts` | Authenticated User |
| `/api/auth/resolve-identifier` | `POST` | `src/app/api/auth/resolve-identifier/route.ts` | Public / Open |
| `/api/auth/verify-super-admin-pin` | `POST` | `src/app/api/auth/verify-super-admin-pin/route.ts` | Authenticated User |
| `/api/billing/auto-renew` | `POST` | `src/app/api/billing/auto-renew/route.ts` | Public / Open |
| `/api/billing/calculate` | `POST` | `src/app/api/billing/calculate/route.ts` | Public / Open |
| `/api/billing/coupons/validate` | `POST` | `src/app/api/billing/coupons/validate/route.ts` | Public / Open |
| `/api/billing/dashboard` | `GET` | `src/app/api/billing/dashboard/route.ts` | Public / Open |
| `/api/billing/dashboard-bundle` | `GET` | `src/app/api/billing/dashboard-bundle/route.ts` | Public / Open |
| `/api/billing/offers` | `GET` | `src/app/api/billing/offers/route.ts` | Public / Open |
| `/api/billing/offers/checkout` | `POST` | `src/app/api/billing/offers/checkout/route.ts` | Public / Open |
| `/api/billing/offers/verify` | `POST` | `src/app/api/billing/offers/verify/route.ts` | Public / Open |
| `/api/billing/orders` | `POST` | `src/app/api/billing/orders/route.ts` | Public / Open |
| `/api/billing/profile` | `PUT` | `src/app/api/billing/profile/route.ts` | Public / Open |
| `/api/billing/subscription` | `GET` | `src/app/api/billing/subscription/route.ts` | Public / Open |
| `/api/billing/subscription/cancel` | `POST` | `src/app/api/billing/subscription/cancel/route.ts` | Public / Open |
| `/api/billing/subscription/downgrade` | `POST` | `src/app/api/billing/subscription/downgrade/route.ts` | Public / Open |
| `/api/billing/subscription/resume` | `POST` | `src/app/api/billing/subscription/resume/route.ts` | Public / Open |
| `/api/billing/subscriptions/create` | `POST` | `src/app/api/billing/subscriptions/create/route.ts` | Public / Open |
| `/api/billing/verify` | `POST` | `src/app/api/billing/verify/route.ts` | Public / Open |
| `/api/communication/automation/run` | `POST` | `src/app/api/communication/automation/run/route.ts` | Public / Open |
| `/api/communication/manual-action` | `POST` | `src/app/api/communication/manual-action/route.ts` | Public / Open |
| `/api/communication/retry` | `POST` | `src/app/api/communication/retry/route.ts` | Public / Open |
| `/api/communication/send` | `POST` | `src/app/api/communication/send/route.ts` | Public / Open |
| `/api/communication/status` | `GET`, `POST` | `src/app/api/communication/status/route.ts` | Public / Open |
| `/api/communication/templates` | `GET`, `POST`, `DELETE` | `src/app/api/communication/templates/route.ts` | Public / Open |
| `/api/communication/test` | `POST` | `src/app/api/communication/test/route.ts` | Public / Open |
| `/api/communication/webhook/twilio` | `POST` | `src/app/api/communication/webhook/twilio/route.ts` | Public / Open |
| `/api/complaints` | `GET`, `POST` | `src/app/api/complaints/route.ts` | Public / Open |
| `/api/complaints/[id]` | `PATCH`, `DELETE` | `src/app/api/complaints/[id]/route.ts` | Public / Open |
| `/api/debug-log` | `POST` | `src/app/api/debug-log/route.ts` | Public / Open |
| `/api/feature-showcase/active` | `GET`, `POST` | `src/app/api/feature-showcase/active/route.ts` | Authenticated User |
| `/api/features/effective` | `GET` | `src/app/api/features/effective/route.ts` | Public / Open |
| `/api/fees/adjustments` | `POST` | `src/app/api/fees/adjustments/route.ts` | Public / Open |
| `/api/fees/collect` | `POST` | `src/app/api/fees/collect/route.ts` | Public / Open |
| `/api/fees/defaulters` | `GET` | `src/app/api/fees/defaulters/route.ts` | Public / Open |
| `/api/fees/foundation/accounting/balance-sheet` | `GET` | `src/app/api/fees/foundation/accounting/balance-sheet/route.ts` | Authenticated User |
| `/api/fees/foundation/accounting/coa` | `GET`, `POST` | `src/app/api/fees/foundation/accounting/coa/route.ts` | Authenticated User |
| `/api/fees/foundation/accounting/comparison` | `GET` | `src/app/api/fees/foundation/accounting/comparison/route.ts` | Authenticated User |
| `/api/fees/foundation/accounting/expenses` | `GET`, `POST` | `src/app/api/fees/foundation/accounting/expenses/route.ts` | Authenticated User |
| `/api/fees/foundation/accounting/general-ledger` | `GET` | `src/app/api/fees/foundation/accounting/general-ledger/route.ts` | Authenticated User |
| `/api/fees/foundation/accounting/journal` | `GET`, `POST` | `src/app/api/fees/foundation/accounting/journal/route.ts` | Authenticated User |
| `/api/fees/foundation/accounting/profit-and-loss` | `GET` | `src/app/api/fees/foundation/accounting/profit-and-loss/route.ts` | Authenticated User |
| `/api/fees/foundation/accounting/trial-balance` | `GET` | `src/app/api/fees/foundation/accounting/trial-balance/route.ts` | Authenticated User |
| `/api/fees/foundation/adjustments` | `GET`, `POST` | `src/app/api/fees/foundation/adjustments/route.ts` | Authenticated User |
| `/api/fees/foundation/analytics/dashboard` | `GET` | `src/app/api/fees/foundation/analytics/dashboard/route.ts` | Authenticated User |
| `/api/fees/foundation/analytics/defaulters` | `GET`, `POST` | `src/app/api/fees/foundation/analytics/defaulters/route.ts` | Authenticated User |
| `/api/fees/foundation/analytics/export` | `POST` | `src/app/api/fees/foundation/analytics/export/route.ts` | Authenticated User |
| `/api/fees/foundation/analytics/reports` | `GET` | `src/app/api/fees/foundation/analytics/reports/route.ts` | Authenticated User |
| `/api/fees/foundation/demands` | `GET`, `POST` | `src/app/api/fees/foundation/demands/route.ts` | Public / Open |
| `/api/fees/foundation/demands/bulk` | `POST` | `src/app/api/fees/foundation/demands/bulk/route.ts` | Authenticated User |
| `/api/fees/foundation/demands/generate` | `POST` | `src/app/api/fees/foundation/demands/generate/route.ts` | Authenticated User |
| `/api/fees/foundation/heads` | `GET`, `POST` | `src/app/api/fees/foundation/heads/route.ts` | Authenticated User |
| `/api/fees/foundation/ledger/cash-bank` | `GET` | `src/app/api/fees/foundation/ledger/cash-bank/route.ts` | Authenticated User |
| `/api/fees/foundation/ledger/export` | `POST` | `src/app/api/fees/foundation/ledger/export/route.ts` | Authenticated User |
| `/api/fees/foundation/ledger/student` | `GET` | `src/app/api/fees/foundation/ledger/student/route.ts` | Authenticated User |
| `/api/fees/foundation/outstanding` | `GET` | `src/app/api/fees/foundation/outstanding/route.ts` | Authenticated User |
| `/api/fees/foundation/payments` | `GET`, `POST` | `src/app/api/fees/foundation/payments/route.ts` | Authenticated User |
| `/api/fees/foundation/payments/[id]` | `GET` | `src/app/api/fees/foundation/payments/[id]/route.ts` | Authenticated User |
| `/api/fees/foundation/payments/allocate` | `POST` | `src/app/api/fees/foundation/payments/allocate/route.ts` | Authenticated User |
| `/api/fees/foundation/refunds` | `GET`, `POST` | `src/app/api/fees/foundation/refunds/route.ts` | Authenticated User |
| `/api/fees/foundation/reversals` | `POST` | `src/app/api/fees/foundation/reversals/route.ts` | Authenticated User |
| `/api/fees/foundation/structures` | `GET`, `POST`, `PUT`, `DELETE` | `src/app/api/fees/foundation/structures/route.ts` | Authenticated User |
| `/api/fees/foundation/structures/duplicate` | `POST` | `src/app/api/fees/foundation/structures/duplicate/route.ts` | Authenticated User |
| `/api/fees/foundation/student-summary` | `GET` | `src/app/api/fees/foundation/student-summary/route.ts` | Authenticated User |
| `/api/fees/foundation/waiver` | `POST` | `src/app/api/fees/foundation/waiver/route.ts` | Authenticated User |
| `/api/fees/reports/export` | `POST` | `src/app/api/fees/reports/export/route.ts` | Public / Open |
| `/api/fees/settings` | `GET`, `POST` | `src/app/api/fees/settings/route.ts` | Public / Open |
| `/api/fees/structures` | `GET`, `POST`, `DELETE` | `src/app/api/fees/structures/route.ts` | Public / Open |
| `/api/fees/student-summary` | `GET` | `src/app/api/fees/student-summary/route.ts` | Authenticated User |
| `/api/health` | `GET` | `src/app/api/health/route.ts` | Public / Open |
| `/api/help-videos` | `GET`, `POST` | `src/app/api/help-videos/route.ts` | Super Admin |
| `/api/help-videos/[id]` | `PATCH`, `DELETE` | `src/app/api/help-videos/[id]/route.ts` | Public / Open |
| `/api/identity/check-availability` | `GET` | `src/app/api/identity/check-availability/route.ts` | Public / Open |
| `/api/identity/prefixes` | `GET`, `POST` | `src/app/api/identity/prefixes/route.ts` | Public / Open |
| `/api/pricing` | `GET` | `src/app/api/pricing/route.ts` | Public / Open |
| `/api/reports/export` | `POST` | `src/app/api/reports/export/route.ts` | Public / Open |
| `/api/reports/preview` | `POST` | `src/app/api/reports/preview/route.ts` | Public / Open |
| `/api/school/inquiries` | `GET`, `POST` | `src/app/api/school/inquiries/route.ts` | Public / Open |
| `/api/school/inquiries/[inquiryId]` | `GET`, `PATCH`, `DELETE` | `src/app/api/school/inquiries/[inquiryId]/route.ts` | Public / Open |
| `/api/school/onboarding` | `GET`, `POST` | `src/app/api/school/onboarding/route.ts` | Public / Open |
| `/api/school/register` | `POST` | `src/app/api/school/register/route.ts` | Authenticated User |
| `/api/school/upload-logo` | `POST` | `src/app/api/school/upload-logo/route.ts` | Public / Open |
| `/api/site-settings` | `GET` | `src/app/api/site-settings/route.ts` | Public / Open |
| `/api/super-admin/activity` | `GET` | `src/app/api/super-admin/activity/route.ts` | Public / Open |
| `/api/super-admin/activity/sessions` | `GET`, `POST` | `src/app/api/super-admin/activity/sessions/route.ts` | Public / Open |
| `/api/super-admin/ai/settings` | `GET`, `PATCH` | `src/app/api/super-admin/ai/settings/route.ts` | Authenticated User |
| `/api/super-admin/ai/usage` | `GET` | `src/app/api/super-admin/ai/usage/route.ts` | Authenticated User |
| `/api/super-admin/analytics` | `GET` | `src/app/api/super-admin/analytics/route.ts` | Public / Open |
| `/api/super-admin/audit` | `GET` | `src/app/api/super-admin/audit/route.ts` | Public / Open |
| `/api/super-admin/backup/config` | `GET`, `POST` | `src/app/api/super-admin/backup/config/route.ts` | Authenticated User |
| `/api/super-admin/backup/cron` | `GET`, `POST` | `src/app/api/super-admin/backup/cron/route.ts` | Public / Open |
| `/api/super-admin/backup/logs` | `GET` | `src/app/api/super-admin/backup/logs/route.ts` | Authenticated User |
| `/api/super-admin/backup/sync` | `POST` | `src/app/api/super-admin/backup/sync/route.ts` | Authenticated User |
| `/api/super-admin/backup/test` | `POST` | `src/app/api/super-admin/backup/test/route.ts` | Authenticated User |
| `/api/super-admin/billing/access-policy` | `GET`, `POST`, `PUT` | `src/app/api/super-admin/billing/access-policy/route.ts` | Public / Open |
| `/api/super-admin/campaigns` | `GET`, `POST` | `src/app/api/super-admin/campaigns/route.ts` | Public / Open |
| `/api/super-admin/campaigns/[id]` | `PATCH` | `src/app/api/super-admin/campaigns/[id]/route.ts` | Public / Open |
| `/api/super-admin/communication` | `GET`, `POST` | `src/app/api/super-admin/communication/route.ts` | Public / Open |
| `/api/super-admin/coupons` | `GET`, `POST` | `src/app/api/super-admin/coupons/route.ts` | Public / Open |
| `/api/super-admin/coupons/[id]` | `PUT`, `DELETE` | `src/app/api/super-admin/coupons/[id]/route.ts` | Public / Open |
| `/api/super-admin/custom-access` | `GET`, `POST` | `src/app/api/super-admin/custom-access/route.ts` | Public / Open |
| `/api/super-admin/custom-offers` | `GET`, `POST` | `src/app/api/super-admin/custom-offers/route.ts` | Public / Open |
| `/api/super-admin/emergency/metrics` | `GET` | `src/app/api/super-admin/emergency/metrics/route.ts` | Public / Open |
| `/api/super-admin/emergency/user-security` | `POST` | `src/app/api/super-admin/emergency/user-security/route.ts` | Public / Open |
| `/api/super-admin/feature-showcase` | `GET`, `POST` | `src/app/api/super-admin/feature-showcase/route.ts` | Public / Open |
| `/api/super-admin/features` | `GET`, `POST` | `src/app/api/super-admin/features/route.ts` | Public / Open |
| `/api/super-admin/features/overrides` | `GET`, `POST`, `DELETE` | `src/app/api/super-admin/features/overrides/route.ts` | Public / Open |
| `/api/super-admin/features/registry` | `GET` | `src/app/api/super-admin/features/registry/route.ts` | Public / Open |
| `/api/super-admin/finance` | `GET` | `src/app/api/super-admin/finance/route.ts` | Public / Open |
| `/api/super-admin/finance/disputes` | `GET` | `src/app/api/super-admin/finance/disputes/route.ts` | Public / Open |
| `/api/super-admin/finance/refunds` | `GET`, `POST` | `src/app/api/super-admin/finance/refunds/route.ts` | Public / Open |
| `/api/super-admin/import/execute` | `POST` | `src/app/api/super-admin/import/execute/route.ts` | Authenticated User |
| `/api/super-admin/import/preview` | `POST` | `src/app/api/super-admin/import/preview/route.ts` | Authenticated User |
| `/api/super-admin/inquiries` | `GET`, `POST` | `src/app/api/super-admin/inquiries/route.ts` | Public / Open |
| `/api/super-admin/inquiries/[inquiryId]` | `GET`, `PATCH` | `src/app/api/super-admin/inquiries/[inquiryId]/route.ts` | Public / Open |
| `/api/super-admin/inquiries/[inquiryId]/notes` | `POST` | `src/app/api/super-admin/inquiries/[inquiryId]/notes/route.ts` | Public / Open |
| `/api/super-admin/offers` | `GET`, `POST` | `src/app/api/super-admin/offers/route.ts` | Public / Open |
| `/api/super-admin/offers/[id]` | `GET`, `PATCH`, `DELETE` | `src/app/api/super-admin/offers/[id]/route.ts` | Public / Open |
| `/api/super-admin/offers/[id]/duplicate` | `POST` | `src/app/api/super-admin/offers/[id]/duplicate/route.ts` | Public / Open |
| `/api/super-admin/offers/[id]/status` | `POST` | `src/app/api/super-admin/offers/[id]/status/route.ts` | Public / Open |
| `/api/super-admin/payment-settings` | `GET`, `POST` | `src/app/api/super-admin/payment-settings/route.ts` | Public / Open |
| `/api/super-admin/payment-settings/test` | `GET`, `POST` | `src/app/api/super-admin/payment-settings/test/route.ts` | Public / Open |
| `/api/super-admin/portal-ui` | `GET`, `POST` | `src/app/api/super-admin/portal-ui/route.ts` | Public / Open |
| `/api/super-admin/pricing` | `GET`, `POST`, `PUT`, `DELETE` | `src/app/api/super-admin/pricing/route.ts` | Public / Open |
| `/api/super-admin/pricing/[id]` | `GET`, `PATCH`, `DELETE` | `src/app/api/super-admin/pricing/[id]/route.ts` | Public / Open |
| `/api/super-admin/pricing/assign` | `GET`, `POST` | `src/app/api/super-admin/pricing/assign/route.ts` | Public / Open |
| `/api/super-admin/pricing/gst` | `GET`, `POST` | `src/app/api/super-admin/pricing/gst/route.ts` | Public / Open |
| `/api/super-admin/privileged-operations` | `POST` | `src/app/api/super-admin/privileged-operations/route.ts` | Public / Open |
| `/api/super-admin/schools` | `GET` | `src/app/api/super-admin/schools/route.ts` | Public / Open |
| `/api/super-admin/schools/[id]` | `PATCH` | `src/app/api/super-admin/schools/[id]/route.ts` | Public / Open |
| `/api/super-admin/schools/[id]/analytics` | `GET` | `src/app/api/super-admin/schools/[id]/analytics/route.ts` | Public / Open |
| `/api/super-admin/schools/[id]/emergency` | `GET`, `POST` | `src/app/api/super-admin/schools/[id]/emergency/route.ts` | Public / Open |
| `/api/super-admin/schools/[id]/entitlements` | `GET`, `POST` | `src/app/api/super-admin/schools/[id]/entitlements/route.ts` | Public / Open |
| `/api/super-admin/schools/[id]/manage-admin` | `POST` | `src/app/api/super-admin/schools/[id]/manage-admin/route.ts` | Public / Open |
| `/api/super-admin/schools/[id]/subscription` | `GET`, `POST` | `src/app/api/super-admin/schools/[id]/subscription/route.ts` | Public / Open |
| `/api/super-admin/schools/[id]/users` | `GET` | `src/app/api/super-admin/schools/[id]/users/route.ts` | Public / Open |
| `/api/super-admin/search` | `GET` | `src/app/api/super-admin/search/route.ts` | Super Admin |
| `/api/super-admin/security-center` | `GET`, `POST` | `src/app/api/super-admin/security-center/route.ts` | Public / Open |
| `/api/super-admin/security-center/findings` | `GET`, `POST` | `src/app/api/super-admin/security-center/findings/route.ts` | Public / Open |
| `/api/super-admin/security-center/findings/[id]` | `GET`, `PATCH` | `src/app/api/super-admin/security-center/findings/[id]/route.ts` | Public / Open |
| `/api/super-admin/security-center/incidents` | `GET`, `POST`, `PATCH` | `src/app/api/super-admin/security-center/incidents/route.ts` | Public / Open |
| `/api/super-admin/security-center/reports` | `GET` | `src/app/api/super-admin/security-center/reports/route.ts` | Public / Open |
| `/api/super-admin/security-center/retest` | `POST` | `src/app/api/super-admin/security-center/retest/route.ts` | Public / Open |
| `/api/super-admin/settings` | `GET`, `POST` | `src/app/api/super-admin/settings/route.ts` | Public / Open |
| `/api/super-admin/site-settings` | `GET`, `POST` | `src/app/api/super-admin/site-settings/route.ts` | Public / Open |
| `/api/super-admin/subscriptions` | `GET` | `src/app/api/super-admin/subscriptions/route.ts` | Public / Open |
| `/api/super-admin/subscriptions/[subscriptionId]` | `GET` | `src/app/api/super-admin/subscriptions/[subscriptionId]/route.ts` | Public / Open |
| `/api/super-admin/subscriptions/[subscriptionId]/adjust` | `POST` | `src/app/api/super-admin/subscriptions/[subscriptionId]/adjust/route.ts` | Public / Open |
| `/api/super-admin/subscriptions/check-expiring` | `GET`, `POST` | `src/app/api/super-admin/subscriptions/check-expiring/route.ts` | Public / Open |
| `/api/super-admin/ultra-security` | `POST` | `src/app/api/super-admin/ultra-security/route.ts` | Authenticated User |
| `/api/super-admin/users/[id]` | `GET`, `PATCH` | `src/app/api/super-admin/users/[id]/route.ts` | Public / Open |
| `/api/super-admin/users/[id]/actions` | `POST` | `src/app/api/super-admin/users/[id]/actions/route.ts` | Super Admin |
| `/api/super-admin/users/restriction` | `POST` | `src/app/api/super-admin/users/restriction/route.ts` | Public / Open |
| `/api/super-admin/users/status` | `POST` | `src/app/api/super-admin/users/status/route.ts` | Public / Open |
| `/api/teacher/attendance` | `GET`, `POST` | `src/app/api/teacher/attendance/route.ts` | Super Admin |
| `/api/teacher/devices` | `POST`, `DELETE` | `src/app/api/teacher/devices/route.ts` | Authenticated User |
| `/api/teacher/homework` | `GET`, `POST` | `src/app/api/teacher/homework/route.ts` | Authenticated User |
| `/api/timetable` | `GET`, `POST`, `DELETE` | `src/app/api/timetable/route.ts` | Super Admin |
| `/api/timetable/apply-all` | `POST` | `src/app/api/timetable/apply-all/route.ts` | Super Admin |
| `/api/timetable/scheduler` | `GET`, `POST` | `src/app/api/timetable/scheduler/route.ts` | Public / Open |
| `/api/webhooks/razorpay` | `POST` | `src/app/api/webhooks/razorpay/route.ts` | Public / Open |
