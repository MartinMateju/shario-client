#!/usr/bin/env bash
set -euo pipefail

fixture_log=$(mktemp "${TMPDIR:-/tmp}/shario-rollout-fixture.XXXXXX")
PORT=4312 node e2e/visual/public-site-style-rollout-fixture.mjs > "$fixture_log" 2>&1 &
fixture_pid=$!
cleanup() {
  kill "$fixture_pid" 2>/dev/null || true
  wait "$fixture_pid" 2>/dev/null || true
  rm -f "$fixture_log"
}
trap cleanup EXIT
curl --fail --silent --show-error --retry 20 --retry-connrefused \
  --retry-delay 1 --retry-max-time 30 --connect-timeout 2 --max-time 2 \
  http://127.0.0.1:4312/ready > /dev/null

rollout_smoke() {
  env \
    SHARIO_ROLLOUT_PHASE="$1" \
    SHARIO_ROLLOUT_API_URL=http://127.0.0.1:4312 \
    SHARIO_ROLLOUT_SITE_URL=http://127.0.0.1:4312 \
    SHARIO_ROLLOUT_TENANT_SLUG=studio-alpha \
    SHARIO_ROLLOUT_LOCALE=en \
    SHARIO_ROLLOUT_EXPECTED_PRESET=classic-editorial-v1 \
    SHARIO_ROLLOUT_EXPECTED_PALETTE='{"accentColor":"#4056D6","secondaryColor":"#D9806E","backgroundColor":"#FCFBF8","textColor":"#292925"}' \
    node scripts/verify-public-site-style-rollout.mjs
}

rollout_smoke backend
rollout_smoke frontend

curl --fail --silent --show-error \
  -H 'content-type: application/json' \
  --data '{"stylePreset":"future-layout-v9"}' \
  http://127.0.0.1:4312/__rollout/corrupt > /dev/null
if rollout_smoke backend; then
  echo 'Unknown published presets must fail the rollout smoke.' >&2
  exit 1
fi
curl --fail --silent --show-error --request POST \
  http://127.0.0.1:4312/__rollout/reset > /dev/null

if env \
  SHARIO_ROLLOUT_PHASE=backend \
  SHARIO_ROLLOUT_API_URL=http://127.0.0.1:4312 \
  SHARIO_ROLLOUT_TENANT_SLUG=studio-alpha \
  SHARIO_ROLLOUT_EXPECTED_PRESET=classic-editorial-v1 \
  SHARIO_ROLLOUT_EXPECTED_ACCENT_COLOR='#000000' \
  SHARIO_ROLLOUT_EXPECTED_SECONDARY_COLOR='#D9806E' \
  SHARIO_ROLLOUT_EXPECTED_BACKGROUND_COLOR='#FCFBF8' \
  SHARIO_ROLLOUT_EXPECTED_TEXT_COLOR='#292925' \
  node scripts/verify-public-site-style-rollout.mjs; then
  echo 'A stale expected palette must fail the rollout smoke.' >&2
  exit 1
fi

curl --fail --silent --show-error --request POST \
  http://127.0.0.1:4312/__rollout/reset > /dev/null
curl --fail --silent --show-error \
  -H 'content-type: application/json' \
  --data '{"publicContractMode":"malformed"}' \
  http://127.0.0.1:4312/__rollout/control > /dev/null
if rollout_smoke backend; then
  echo 'Malformed public contract JSON must fail the rollout smoke.' >&2
  exit 1
fi

curl --fail --silent --show-error --request POST \
  http://127.0.0.1:4312/__rollout/reset > /dev/null
curl --fail --silent --show-error \
  -H 'content-type: application/json' \
  --data '{"publicTenantSlug":"wrong-studio"}' \
  http://127.0.0.1:4312/__rollout/control > /dev/null
if rollout_smoke backend; then
  echo 'A mismatched tenant response must fail the rollout smoke.' >&2
  exit 1
fi

curl --fail --silent --show-error --request POST \
  http://127.0.0.1:4312/__rollout/reset > /dev/null
curl --fail --silent --show-error \
  -H 'content-type: application/json' \
  --data '{"portalLocation":"/en/admin"}' \
  http://127.0.0.1:4312/__rollout/control > /dev/null
if rollout_smoke frontend; then
  echo 'An unexpected portal redirect must fail the rollout smoke.' >&2
  exit 1
fi

