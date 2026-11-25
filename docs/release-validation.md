# Release validation

Client CI validates each pull request with lint/catalog checks, product/rollout contracts, the **complete unit suite with coverage**, and the full-stack browser smoke. The smoke creates the single CI production build, including preview locales, using loopback services. The critical selection is already part of the complete suite and is not run twice. The stable `Build and critical tests`, `Complete unit and coverage suite`, and `Release ready` gates require real successful dependencies or verified matching PR evidence; skipped/cancelled/failed work alone never passes them.

On a main push, the workflow first looks for successful validation of the PR merged into that exact commit. It reuses evidence only for a same-repository PR targeting main, the latest successful run/attempt of this workflow, matching complete Git source trees (including workflow/config/lock files), matching paired-server source, and unexpired evidence no more than seven days old. The evidence records the actual checked-out commit, source tree, run and attempt. No fork, different backend, changed merge contents, missing artifact, failed/latest pending run, or API lookup failure can manufacture a pass: those cases run fresh validation. Manual dispatch always runs fresh. A reused run links the original validation and does not issue new reusable evidence.

Vercel production promotion still requires `Release ready` and `Complete unit and coverage suite` as Blocking GitHub checks on the production commit. Both statuses are emitted by Client CI, including when identical PR evidence is reused. Vercel's native lint duplicates GitHub lint and should be removed; this app has no independent `typecheck` script for Vercel's native TypeCheck check. Keep the GitHub gates in place when removing those native checks. Vercel still creates the actual deployment with production environment settings; the isolated CI bundle must never be deployed to production.

The release operator must verify all three stable gates on the intended PR head before merging. Broad unit coverage and all twelve browser regression suites also run daily at 02:17 UTC and on manual dispatch; these are intentional fresh drift checks, not additional merge-triggered runs. Run affected browser regressions before merging risky UI changes. Fork PRs can run lint, coverage and a standalone build without private-server access, but cannot produce `Release ready` or reusable release evidence.

The smoke starts an isolated Mongo replica set and backend, local Postmark and SMTP capture services, and a production Next.js build with loopback API settings. It records both tested Git commits and retains the HTML/JUnit reports even on success. It covers registration/onboarding, sender verification and test email delivery, tenant isolation, customer login/intent restoration, staff booking, and paid studio-credit booking/cancellation/refund. The cancellation journey checks failed and pending requests, the success icon, the persisted balance and duplicate cancellation. It also requires exactly one SMTP cancellation email with the correct recipient, booking date/time, refund amount/currency and portal link; failed or pending cancellation must send none.

Card settlement, signed webhook validation/replay, transaction rollback and concurrent cancellation are covered by the server's real-Mongo checkout integration tests. These substitute the external card provider; they do not establish Stripe live-account readiness or exercise real charges. Restore-capability checks are excluded at the user's request.

Booking-edit smoke tests extend a real fixture booking using credits, verify its unchanged ID and added-time charge, move it without losing the extended duration, and cancel it with a single combined refund. A second journey extends an active booking after its door code was issued. The calendar-boundary check verifies that the half-hour before an existing private booking is not shaded as occupied, while a new booking that would overlap it remains unavailable.

## Cross-repository access

`SHARIO_CI_SERVER_DEPLOY_KEY` in this repository contains a dedicated SSH key registered as a **read-only** deploy key on `MartinMateju/shario-server`. It is supplied only to checkout and removed before dependency installation (`persist-credentials: false`). Forked PRs cannot run the private full-stack smoke. No personal access token or write permission is needed. Rotate this key through the server's deploy-key settings and the client's Actions secret without committing or printing it.

## Paired releases

For a server change that adds fixtures/contracts, validate its exact commit with the client branch before merging:

```sh
gh workflow run client-ci.yml --repo MartinMateju/shario-client \
  --ref CLIENT_BRANCH -f server_ref=FULL_SERVER_COMMIT_SHA
```

The standalone `e2e-smoke.yml` workflow accepts the same `server_ref` input for focused diagnosis. Normal PR/main CI resolves server `main` once and pins that exact SHA for smoke and provenance. Merge and deploy required backward-compatible server changes first. If the server source tree has changed since client validation, fresh paired validation is required; a merge that only changes the server commit ID while preserving its tree does not require another smoke run. Consult the uploaded `release-smoke-revisions.txt` and validation evidence for the original tested revision. Manually dispatched diagnostic runs are not substitutes for a successful PR run in the automatic reuse path.

Locally, with the server checked out next to this repository as `backend`:

```sh
npx playwright test --config=playwright.smoke.config.js
```

Set `E2E_BACKEND_DIR` to an absolute checkout path if needed. Ports 3000, 4001 and 4100 must be free. Start the pinned Mailpit sink on loopback ports 1025 and 8025 using [the local setup instructions](../e2e/README.md); CI supplies it as a fresh service. Mailpit only captures mail and has no configured relay. Missing SMTP capture fails acceptance testing. The smoke builds production assets itself; avoid concurrent large test/build jobs on memory-constrained machines. Use the safe in-memory database default, not production credentials.

The isolated browser harness also requires Redis at 127.0.0.1:6379 and reserves database 15 for test-only resets. Use a dedicated test Redis instance. CI supplies a fresh Redis service; fixture resets drain in-flight API requests before clearing MongoDB and that Redis database.

The Client full regression manual workflow accepts `scope=unit` or `scope=browser` for diagnosis and `scope=all` for a complete candidate check. These manual runs do not replace the exact-main-commit Vercel checks or the Release ready gate. Their concurrency groups are separate by event and scope, so diagnosing one stage cannot cancel the other, and a main push cannot cancel the daily browser sweep.

Ordinary pull requests run the full unit suite once in Client CI; the separate full-regression workflow has no push trigger. No existing critical tests or coverage floors are removed. Documentation changes still receive source-bound validation. The daily browser sweep complements PR coverage and focused verification of changed features.

Browser regression builds once and shares the same source-checked build artifact across all twelve suites, with up to four running at once, alongside the unit/coverage job in a default full run. A failed unit or browser suite does not cancel the others; any failure still fails the workflow. Each browser job retains its own reports and traces on completion, so diagnosing a failed booking or authentication screen does not wait for unrelated suites to finish.
