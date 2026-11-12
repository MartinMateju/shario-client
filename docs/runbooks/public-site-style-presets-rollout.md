# Public-site style presets: verification and rollout

This runbook is the release gate for Classic Editorial, Modern Minimal and Warm
Organic. Do not deploy the frontend until every backend gate below has passed.

## 1. Establish the release candidates

Record the exact server and client commit SHAs. The server candidate must
contain server PR #42, and the client candidate must contain client PR #110.
Run the focused server public-site persistence workflow and the client
`Public site style rollout CI` workflow on those exact revisions.

The client workflow must pass its unit, production build, browser-owned
preview/save/publish journey, and desktop/mobile public, login and customer
workspace checks. Run its companion-backend job with the repository
secret `SHARIO_CI_REPOSITORIES_TOKEN` and set `backend_ref` to the exact recorded
server SHA to execute the real full-stack publication spec as well.

`SHARIO_CI_REPOSITORIES_TOKEN` must be a fine-grained, read-only token scoped
only to `MartinMateju/shario-server`. Store it in a protected GitHub Actions
secret, never in repository content. Backend and frontend rollout-phase
dispatches run the companion job automatically and stop if it is not green.

## 2. Prepare the backend deployment

Current server `main` also contains the course-waitlist rollout. Before
deploying it, configure a stable `WAITLIST_TOKEN_PEPPER` of at least 32
characters in the production backend environment. Keep waitlists disabled
until the documented index, worker, email and webhook checks are complete.

Confirm the authoritative Render service and deployed backend hostname. DNS for
`api.shario.io` must resolve to that service before using it as the verification
origin.

## 3. Deploy and verify the backend first

Deploy the recorded server SHA through Render. Do not proceed merely because a
build completed: confirm that the deployed revision is the recorded candidate.

Verify the runtime and public read contract using a known, dedicated rollout
tenant. Record the approved preset and all four palette values before the
deployment; do not derive the expected values from the deployment being
verified. Replace the example values below with that recorded baseline:

```bash
SHARIO_ROLLOUT_PHASE=backend \
SHARIO_ROLLOUT_API_URL=https://api.shario.io \
SHARIO_ROLLOUT_TENANT_SLUG=studio-olivie \
SHARIO_ROLLOUT_EXPECTED_PRESET=classic-editorial-v1 \
SHARIO_ROLLOUT_EXPECTED_ACCENT_COLOR='#4056D6' \
SHARIO_ROLLOUT_EXPECTED_SECONDARY_COLOR='#D9806E' \
SHARIO_ROLLOUT_EXPECTED_BACKGROUND_COLOR='#FCFBF8' \
SHARIO_ROLLOUT_EXPECTED_TEXT_COLOR='#292925' \
node scripts/verify-public-site-style-rollout.mjs
```

The gate requires `/health` and `/ready` to return 200, a public tenant config,
the exact approved preset ID, and the exact four approved palette values.

The companion `public-site-editor.spec.js` is a state-changing, seeded-data
test. Run it only through the isolated local client/server job; never point it
at production. Production verification in this runbook is read-only. A
separate staging mutation is permitted only with a protected disposable QA
tenant and a previously tested snapshot-restore procedure.

## 4. Deploy and verify the frontend

Only after the backend gate is green, deploy the recorded client SHA through
Netlify. Confirm the deployed revision, then run:

```bash
SHARIO_ROLLOUT_PHASE=frontend \
SHARIO_ROLLOUT_API_URL=https://api.shario.io \
SHARIO_ROLLOUT_SITE_URL=https://studio-olivie.shario.io \
SHARIO_ROLLOUT_TENANT_SLUG=studio-olivie \
SHARIO_ROLLOUT_LOCALE=en \
SHARIO_ROLLOUT_EXPECTED_PRESET=classic-editorial-v1 \
SHARIO_ROLLOUT_EXPECTED_ACCENT_COLOR='#4056D6' \
SHARIO_ROLLOUT_EXPECTED_SECONDARY_COLOR='#D9806E' \
SHARIO_ROLLOUT_EXPECTED_BACKGROUND_COLOR='#FCFBF8' \
SHARIO_ROLLOUT_EXPECTED_TEXT_COLOR='#292925' \
node scripts/verify-public-site-style-rollout.mjs
```

This repeats the backend gate before checking the public website, login and
customer workspace entry point for the published preset. Review the desktop
and mobile screenshot/accessibility artifacts from the client rollout workflow
before approving the release.

For a GitHub `workflow_dispatch` with phase `backend` or `frontend`, both
`expected_preset` and `expected_palette` are mandatory even though GitHub
cannot express conditional required fields. Supply `expected_palette` as a
JSON object with `accentColor`, `secondaryColor`, `backgroundColor` and
`textColor`. An empty or mismatched value deliberately fails the smoke job.

## 5. Rollback

If frontend verification fails, roll back Netlify first so the older client is
again paired with the compatible newer backend. If backend readiness or the
public contract fails, do not deploy the frontend; roll Render back to the last
known-good server revision and investigate before retrying.

Never merge or promote a rollout PR without explicit approval.
