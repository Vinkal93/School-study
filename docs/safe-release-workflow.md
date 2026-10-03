# Safe release workflow

`main` is the stable production branch. Develop on `codex/<feature>` or `feature/<feature>`, push that branch, and open a draft PR targeting main. GitHub runs TypeScript, financial/plan regression tests, and a production build. The required checks must pass against an up-to-date branch before merging; failure or cancellation must block the merge. GitHub protection also applies to administrators and prevents force pushes/deletion.

The repository owner manually merges a ready PR only after testing its latest preview. Auto-merge stays off. A review approval from another person is not required for a solo maintainer: manually merging is the owner's release approval. The PR checklist records this decision; checking its boxes alone does not run tests or certify correctness.

## Local development

Use `git switch -c codex/my-feature`, then commit and `git push -u origin codex/my-feature`. On each new clone, enable the tracked guard with `git config core.hooksPath .githooks`; it blocks direct pushes to main. GitHub branch protection is the authoritative remote guard, including if a local hook is skipped.

Run `npm run typecheck` and `npm run test:release`. For a local build alongside a running dev server, set `NEXT_BUILD_DIR=.next-verification` before `npm run build`; do not start that build against production Firebase/payment secrets. CI installs dependencies from the tracked lockfile and uses build-only Firebase defaults, without private production credentials. Repository `CI_FIREBASE_*` variables can point to a separate testing project when needed; do not connect CI to live school records.

## Hosting configuration

In the hosting dashboard verify production branch = main and feature/PR branches = Preview. Preview must use a separate Firebase project, test payments, restricted test accounts and no production webhook endpoints. A Git branch by itself does not isolate a database. This session must not claim hosting settings are applied without verifying them.

When using Vercel Git integration, merging main can deploy automatically. For an additional publication approval, disable automatic production promotion in the dashboard and manually promote the verified main deployment. Keep the current live deployment until the replacement is ready. GitHub checks do not protect deployments launched manually outside this flow.

After release, test login, one representative admin route, feature access and affected financial workflows. If a deployment fails, restore the previous working deployment. Code rollback does not undo Firebase schema/data changes; use backwards-compatible changes and independently backed-up migrations. Firebase rules/index deployment must be reviewed separately and is not automatically performed by this workflow.

Current regression coverage is 17 financial integrity and 14 plan/access/promotion scenarios using mocked Firestore transactions. It does not replace real-role, test-database, mobile or payment testing. Existing legacy lint debt is not silently bypassed as a passing full-repository lint check: the release gate currently enforces types, these regressions and the production build.
