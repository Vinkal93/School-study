<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Stable production and feature releases

- `main` is the stable release branch. Before modifying code on main, create a `codex/<feature>` branch; keep existing uncommitted work intact.
- Push feature branches and open a draft pull request targeting main. Attach created PRs to the task when the app tool is available.
- Never force-push main or bypass its required GitHub checks. Do not auto-merge or publish a feature branch to production.
- Validate the latest commit with `npm run typecheck`, `npm run test:release`, and a production build. Release checks, Safe release gate and the Vercel – school-study deployment check must all pass before main receives a change.
- Keep the PR draft until the owner has reviewed the affected workflows on a preview and explicitly approved release. A request to develop or push a feature is not approval to merge or deploy it.
- Preview/testing must use a separate test database and test payment configuration. Branches alone do not isolate school records. Never run migrations or test financial writes against live data.
- Do not automatically deploy Firestore rules/indexes or data migrations with application changes. Prepare backwards-compatible changes and a rollback/backup plan, then obtain the owner's release approval.
- Read `docs/safe-release-workflow.md` and the relevant verification checklist. Report failed/unverified checks accurately; preserve concurrent local edits outside the reviewed snapshot.
- Enable the local guard on a fresh clone with `git config core.hooksPath .githooks`.
