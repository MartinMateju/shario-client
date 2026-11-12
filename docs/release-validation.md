# Release validation

Client CI runs lint/catalog validation, critical unit and product contracts, a production build, and the reusable full-stack smoke. The stable `Release ready` job fails unless both quality and smoke succeed. Vercel production promotion requires both `Release ready` and the full regression workflow's `Complete unit and coverage suite` as Blocking checks; a successful Vercel build alone is insufficient. Both jobs run on every main push, including documentation changes.

GitHub's current account plan does not support branch-protection rules for this private repository. Until required checks can also be enforced before merging, the release operator must verify all ten browser suites and both unit/release workflows on the intended pull-request head. The hosting gates above remain required for production promotion.

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

The standalone `e2e-smoke.yml` workflow accepts the same `server_ref` input for focused diagnosis. Normal PR/main CI uses server `main`; merge a required backend change first, then rerun client CI against the merged backend. Never promote from a green check on a different client commit. Consult the uploaded `release-smoke-revisions.txt` for the server revision actually tested.

Locally, with the server checked out next to this repository as `backend`:

```sh
npx playwright test --config=playwright.smoke.config.js
```

Set `E2E_BACKEND_DIR` to an absolute checkout path if needed. Ports 3000, 4001 and 4100 must be free. Start the pinned Mailpit sink on loopback ports 1025 and 8025 using [the local setup instructions](../e2e/README.md); CI supplies it as a fresh service. Mailpit only captures mail and has no configured relay. Missing SMTP capture fails acceptance testing. The smoke builds production assets itself; avoid concurrent large test/build jobs on memory-constrained machines. Use the safe in-memory database default, not production credentials.

The isolated browser harness also requires Redis at 127.0.0.1:6379 and reserves database 15 for test-only resets. Use a dedicated test Redis instance. CI supplies a fresh Redis service; fixture resets drain in-flight API requests before clearing MongoDB and that Redis database.

The Client full regression manual workflow accepts `scope=unit` or `scope=browser` for diagnosis. These named stage runs do not replace the default `all` run or the Release ready gate. Their concurrency groups are separate so diagnosing one stage cannot cancel the other.

Application, test, dependency, build-configuration and workflow changes trigger full regression on pull requests. This includes booking and payment changes outside the visual-test directories. Documentation-only changes retain the main-branch release checks.

Browser regression runs all ten suites in separate jobs, with up to four running at once, alongside the unit/coverage job in a default full run. A failed unit or browser suite does not cancel the others; any failure still fails the workflow. Each browser job retains its own reports and traces on completion, so diagnosing a failed booking or authentication screen does not wait for unrelated suites to finish.
