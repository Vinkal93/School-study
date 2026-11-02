# Broken connections — initial inventory

All rows are source-backed; execution status is NOT TESTED until evidence is recorded. Severity describes impact, not proof of deployment exposure.

| ID | Severity | Workflow/root cause | Relevant source | Proposed repair |
|---|---|---|---|---|
| AUTH-01 | P0 | Failed verification falls back to decoded JWT, plain UID or x-user-id; profile lookup then grants victim permissions | src/lib/auth/serverAuth.ts | Require verified token before any identity lookup; regression-test actual guard |
| ENV-01 | P1 | Browser and secondary Auth apps ignore server emulator settings; defaults point to real project | src/lib/firebase/client.ts, env.ts, student.service.ts, teacher.service.ts | Explicit demo-project-only emulator connection and isolated runner |
| STUDENT-01 | P1 | Stored id overrides snapshot ID; legacy root read feeds nested-only update | src/lib/services/student.service.ts | Authoritative document identity and tenant-checked record resolution |
| STUDENT-02 | P1 | Restore/status can create incomplete records without verifying existence or tenant; repeated restore increments usage | src/lib/services/student.service.ts | Resolve existing owned record; atomic idempotent state/usage transition |
| RULES-01 | P0 | Self-profile create permits teacher role and arbitrary schoolId, trusted by membership helpers | firestore.rules users create + isSchoolMember/isTeacher | Server-managed provisioning and emulator negative tests; separate rules release required |
| RULES-02 | P1 | Recursive tenant read grants all members access to all nested records | firestore.rules schools recursive match | Explicit collection-specific role/ownership rules; test compatibility before separate deployment |
| CRUD-01 | P1 | Student creation transaction writes schoolUsage from school-admin client, but rules only allow super-admin writes | student.service.ts createStudentWithAuth; firestore.rules schoolUsage | Move provisioning/usage transaction to authenticated server boundary |
| QA-01 | P1 | Several named full-stack tests reimplement simplified logic rather than execute application code | scripts/test-auth-rbac.mjs, test-student-deletion-authoritative.cjs | Actual-module regression and emulator/E2E tests; do not infer workflow pass from simulated pass |
| DIAG-01 | P2 | Public diagnostic probes database and emits raw exception details; configured status overstates credential validity | src/app/api/admin/firebase-status/route.ts; firebase/admin.ts | Redacted availability/validity diagnostics and protected connectivity probe |

Known teacher indexOf failure: root cause NOT TESTED; existing normalizer is not proof that all invalid document paths are handled. Registration retry after process interruption and cross-system compensation remain NOT TESTED.
