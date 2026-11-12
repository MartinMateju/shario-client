#!/usr/bin/env bash
set -euo pipefail

node e2e/visual/public-site-style-rollout-fixture.mjs > /tmp/skab-rollout-fixture.log 2>&1 &
fixture_pid=$!
cleanup() {
  kill "$fixture_pid" 2>/dev/null || true
  wait "$fixture_pid" 2>/dev/null || true
}
trap cleanup EXIT
curl --fail --silent --show-error --retry 20 --retry-connrefused \
  http://127.0.0.1:4001/ready > /dev/null

rollout_smoke() {
  env \
    SKAB_ROLLOUT_PHASE="$1" \
    SKAB_ROLLOUT_API_URL=http://127.0.0.1:4001 \
    SKAB_ROLLOUT_SITE_URL=http://127.0.0.1:4001 \
    SKAB_ROLLOUT_TENANT_SLUG=studio-alpha \
    SKAB_ROLLOUT_LOCALE=en \
    SKAB_ROLLOUT_EXPECTED_PRESET=classic-editorial-v1 \
    SKAB_ROLLOUT_EXPECTED_PALETTE='{"accentColor":"#4056D6","secondaryColor":"#D9806E","backgroundColor":"#FCFBF8","textColor":"#292925"}' \
    node scripts/verify-public-site-style-rollout.mjs
}

rollout_smoke backend
rollout_smoke frontend

curl --fail --silent --show-error \
  -H 'content-type: application/json' \
  --data '{"stylePreset":"future-layout-v9"}' \
  http://127.0.0.1:4001/__rollout/corrupt > /dev/null
if rollout_smoke backend; then
  echo 'Unknown published presets must fail the rollout smoke.' >&2
  exit 1
fi
curl --fail --silent --show-error --request POST \
  http://127.0.0.1:4001/__rollout/reset > /dev/null

if env \
  SKAB_ROLLOUT_PHASE=backend \
  SKAB_ROLLOUT_API_URL=http://127.0.0.1:4001 \
  SKAB_ROLLOUT_TENANT_SLUG=studio-alpha \
  SKAB_ROLLOUT_EXPECTED_PRESET=classic-editorial-v1 \
  SKAB_ROLLOUT_EXPECTED_ACCENT_COLOR='#000000' \
  SKAB_ROLLOUT_EXPECTED_SECONDARY_COLOR='#D9806E' \
  SKAB_ROLLOUT_EXPECTED_BACKGROUND_COLOR='#FCFBF8' \
  SKAB_ROLLOUT_EXPECTED_TEXT_COLOR='#292925' \
  node scripts/verify-public-site-style-rollout.mjs; then
  echo 'A stale expected palette must fail the rollout smoke.' >&2
  exit 1
fi

curl --fail --silent --show-error --request POST \
  http://127.0.0.1:4001/__rollout/reset > /dev/null
curl --fail --silent --show-error \
  -H 'content-type: application/json' \
  --data '{"publicContractMode":"malformed"}' \
  http://127.0.0.1:4001/__rollout/control > /dev/null
if rollout_smoke backend; then
  echo 'Malformed public contract JSON must fail the rollout smoke.' >&2
  exit 1
fi

curl --fail --silent --show-error --request POST \
  http://127.0.0.1:4001/__rollout/reset > /dev/null
curl --fail --silent --show-error \
  -H 'content-type: application/json' \
  --data '{"publicTenantSlug":"wrong-studio"}' \
  http://127.0.0.1:4001/__rollout/control > /dev/null
if rollout_smoke backend; then
  echo 'A mismatched tenant response must fail the rollout smoke.' >&2
  exit 1
fi

curl --fail --silent --show-error --request POST \
  http://127.0.0.1:4001/__rollout/reset > /dev/null
curl --fail --silent --show-error \
  -H 'content-type: application/json' \
  --data '{"portalLocation":"/en/admin"}' \
  http://127.0.0.1:4001/__rollout/control > /dev/null
if rollout_smoke frontend; then
  echo 'An unexpected portal redirect must fail the rollout smoke.' >&2
  exit 1
fi

