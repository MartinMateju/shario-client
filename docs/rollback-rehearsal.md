# Isolated rollback rehearsal

This drill switches **real processes** from the candidate source snapshots to two pinned compatible Git revisions. It starts a production-built Next server, the API's real startup entry point, and the email, automation scheduler and data import workers. API and worker entry points run from TypeScript through `tsx`; this does not test a compiled server `dist` artifact. It retains the same disposable Mongo replica set, Redis database and local provider receipt history throughout the switch.

This is a local process rehearsal. It does **not** test Render/Vercel deployment controls, production credentials, DNS/traffic switching, or a database backup restore. It must not be marked as evidence that a production rollback was performed.

The baseline predates the protected operations endpoint. Rolling back to it removes that monitoring coverage and should raise the external monitor's alert. During such a rollback, use the documented health/readiness, worker-log and queue checks until compatible monitoring is restored; do not treat the missing endpoint as a healthy aggregate result.

## Run

Use Node 22 with installed dependencies in sibling `frontend` and `backend` checkouts. Provide a fresh **dedicated** local Redis on `127.0.0.1:6379` with database 15 empty, and optionally Mailpit SMTP on `127.0.0.1:1025` with the fixture account `mail@shario-e2e.test` / `e2e-no-smtp`. The workflow provisions both services. Ports 4310, 4311 and 4100 must be free. The runner provisions Mongo itself and binds its Postmark capture server to loopback. It refuses nonempty Redis databases or another run's ownership marker, and never flushes Redis. Recreate the dedicated Redis instance between rehearsals; do not delete unrelated jobs to make this guard pass.

```sh
node --test ../backend/tests/rollback/safety.test.mjs
node --test tests/rollback-processes.test.mjs
node --test tests/rollback-dependencies.test.mjs
node scripts/rollback-rehearsal.mjs \
  --server-target a4cedc2d1d45da552c6a7bae0bb8cf15bfb2bb7f \
  --client-target ca3ee1a67b27d5031e8a5ccf1648277c1b291e93 \
  --dedicated-redis isolated-rehearsal \
  --output /absolute/path/to/disposable-rehearsal-evidence
```

Both defaults are the Shario `main` commits immediately before the skab.io feature port that introduced this harness. The workflow requires an explicit full client SHA. The older pre-release pair is not implicitly considered compatible. Before choosing another pair, review schema/index/data compatibility. The runner requires matching dependency lockfiles before reusing installed dependencies; it fails with a bounded diagnostic rather than silently using incompatible target dependencies.

When the client target has a different dependency lock from the candidate, prepare a separate checkout of that exact target and run `npm ci` there before the rehearsal. Pass its checkout root with `--rollback-client-dependencies /absolute/path/to/pinned-client-checkout`. Its `package.json` and `package-lock.json` must both match the archived target byte for byte, and its installed `node_modules` must be a real directory separate from the candidate's dependencies. The workflow checks out the pinned client target and installs its dependencies separately, then supplies this path automatically. The harness never installs dependencies itself. Candidate and server snapshots retain their existing lock-match requirement; the new option applies only to the rollback client.

The GitHub workflow is **Isolated rollback rehearsal**. It runs on same-repository pull requests changing the harness, docs, workflow or package scripts, using the server's `main` branch as the candidate. The server must already contain `tests/rollback`, so merge the companion server change first. Fork pull requests are excluded. Once the workflow exists on the default branch, it also supports manual dispatch: set `server_ref` to the candidate server commit and the two target inputs to the reviewed immutable rollback pair. The server repository is public, so no deploy key is needed; no production environment secrets are passed to application processes.

## What is exercised

1. Archive the rollback refs and snapshot candidate tracked files plus new runtime/test/script files. Record commits and content hashes. Neither checkout is edited by the drill.
2. Build both clients with `next build --webpack`, then run `next start`. Google Fonts use Next's test response hook with bundled fonts to keep builds offline; this is not a visual fidelity check.
3. Seed an empty private database once. Start the actual API and all three workers with a clean allowlisted environment. The test-control queue-disable flag is absent from the running application processes. Verify API health/readiness, worker telemetry and a successful scheduler scan. For the candidate, also verify that the protected aggregate endpoint reports all three real worker heartbeats and registered critical crons as healthy; unauthenticated access must fail. The pinned baseline's existing global API authentication returns 401 for this unknown route and must not expose the new operations schema.
4. Create a real booking checkout through application services, submit a signed payment completion to the running API twice, cancel it through the real refund service, and create a credit-paid booking. Capture booking/order identities, paid state, balance, credit transactions and checkout idempotency records.
5. Deliver a booking lifecycle email through the real BullMQ worker to the local Postmark capture server. Capture its immutable delivery identity and receipt.
6. Stop the candidate client and start the target client while the candidate API still runs. Then gracefully drain the candidate API/workers. Queue another lifecycle email and an already-completed import replay while workers are stopped.
7. Start the pinned target API/workers against the **same** Mongo/Redis. Replay checkout and signed payment requests and repeat the refund request; assert balances and financial records remain unchanged. Replay the delivered email job and verify exactly one provider receipt, deliver the queued email once, and verify the real importer skips the terminal import replay without applying it again.
8. Confirm all application processes are still running, stop them and Mongo, and write the evidence report. Any unexpected process exit (including a zero exit code or a signal) fails the drill. During intentional shutdown, each process must satisfy its graceful-exit policy; a timeout or forced kill also fails.

Stripe's real SDK transport is replaced only at the provider boundary with a deliberately narrow synthetic account/session transport. Unknown requests fail closed; no money moves. The supported cancellation in this scenario restores credits, so no card refund provider call is claimed. The import check proves terminal replay safety and worker consumption, not an end-to-end import of a new file. Scheduled automation scans are observed, rather than pretending every automation type was tested.

## Safety and evidence

Child processes do not inherit `.env`, provider keys, Mongo/Redis URLs, proxy settings or Node hooks. A preload guard blocks non-loopback sockets and forces unspecified API listener bindings to loopback. The source snapshots contain no actual `.env` files. `tests/rollback/safety.test.mjs` checks these boundaries. Do not reuse Redis database 15 for another task during the drill. The runner does not connect to any production database or hosted deployment API.

`report.json` records the pass/fail result, exact revisions/content hashes, process IDs/commands, health and worker checks, preserved-state checks and receipt counts. It separately records rollback start, restored client, restored API/workers and verified data timestamps; `recoveryDurationMs` excludes build/setup time. Logs and before/after JSON files show failures and provide supporting evidence. These artifacts contain only synthetic fixture accounts and dummy secrets; the GitHub workflow uploads the reports/logs, not dependencies or entire source snapshots. A failed run is not release evidence. A successful local report supplements the separate backup/restore, actual alert delivery and hosting control-plane checks.

No automatic deployment, PR merge, production rollback or database restore is performed by this workflow.

## Recorded rehearsals

No Shario rehearsal has been recorded yet. Use the latest **Isolated rollback rehearsal** check and its retained artifact as evidence for a committed candidate/target pair. Historical timings do not certify a newer revision.
