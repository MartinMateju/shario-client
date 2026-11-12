# Full-stack browser tests

These Playwright tests run the real Next.js frontend against the real Express
API with deterministic tenants, users, subscriptions, locations, and products.
External delivery, queues, Stripe, Meta, and OpenAI calls are disabled in
the E2E backend. A local Mailpit sink captures transactional SMTP messages;
the release smoke also starts a local Postmark stub for managed email.

## Local setup

Keep the extracted projects next to each other:

```text
parent/
  backend/
  frontend/
```

Use Node.js 22, install dependencies in both projects, then install Chromium:

```bash
cd backend && npm ci
cd ../frontend && npm ci
npx playwright install --with-deps chromium
```

Start a dedicated Mailpit instance before running the full-stack tests:

```sh
docker run --rm --name shario-e2e-mailpit -p 127.0.0.1:1025:1025 -p 127.0.0.1:8025:8025 -e MP_SMTP_AUTH=mail@shario-e2e.test:e2e-no-smtp -e MP_SMTP_AUTH_ALLOW_INSECURE=true axllent/mailpit:v1.31.6
```

This uses the same pinned official image and fake SMTP credentials as CI.
Both published ports are loopback-only. No relay or forwarding configuration is
provided, so messages remain in the disposable sink. The cancellation test reads
the Mailpit API on port 8025 and fails if it is unavailable; it never skips email
verification or deletes the shared mailbox. It compares new message IDs against
the test customer's baseline, then checks recipient, booking details, credit
refund, portal link, and exactly-once delivery after a repeated cancellation.

With Mailpit running, execute the release journeys using the configuration that
also starts the local Postmark service:

```sh
npx playwright test --config=playwright.smoke.config.js
```

The Playwright configuration starts both application servers, maps `*.shario.localhost` to
`127.0.0.1` inside Chromium, and resets the E2E database before every test.
It deliberately uses one worker because database resets are suite-wide.

Useful commands:

```bash
npm run test:e2e:list
npm run test:e2e:ui
```

HTML output is written to `playwright-report/`; JUnit and failure artifacts are
written to `test-results/`. CI starts a fresh Mailpit service automatically.

The release smoke also checks teammate invitations with the system Postmark
stub. It follows the URL from the captured email through new-password setup,
ordinary workspace login and session refresh, verifies assigned role/location
scope, preserves existing-account passwords, and exercises resend, revocation
and sign-in links for previously added members. Short desktop and mobile
viewports verify that the invitation modal's submit action stays visible.
These tests use disposable fixture accounts and send no real invitations.

## Customer portal regression tests

Run the focused studio-selection, payment-return, and booking-detail checks with:

```bash
npx playwright test --config=playwright.customer-portal-location.config.js
```

This suite starts the Next.js frontend on port 3098 and the existing customer
portal API fixture on port 4098. It needs no backend database and makes no real
payment requests. It covers desktop and mobile restoration, explicit URL
precedence, unavailable locations, confirmed-order returns, and tenant isolation.
Booking-detail checks cover week/month clicks, the exact reservation's local time
and location, retry after a failed request, and keyboard focus after closing.
Set `PORTAL_LOCATION_FRONTEND_PORT` and `PORTAL_LOCATION_FIXTURE_PORT` to use other
ports. `PLAYWRIGHT_BROWSER_CHANNEL=chrome` uses an installed Chrome browser.

## Membership browser UI contracts

```sh
npx playwright test --config=playwright.membership-contract.config.js
```

This focused desktop/mobile suite uses the real Next.js customer portal with a
disposable local API fixture on ports 3107/4107. It verifies all four Klei plan
prices, automatic monthly renewal disclosures, shared-location checkout data,
pending versus confirmed payment UI, hour/carryover balances, and cancellation
at the period end with undo. Stripe navigation is intercepted by a clearly
labelled local handoff page; no money is charged and no email is sent.

These are browser **UI contract tests**, not proof that a Stripe payment or
webhook was processed. Pair them with the server's recurring-membership HTTP
lifecycle tests and Stripe test-mode verification. The fixture's activation
command supplies the expected paid API response rather than creating a payment.

Set `MEMBERSHIP_FRONTEND_PORT` and `MEMBERSHIP_FIXTURE_PORT` to change ports, and
`PLAYWRIGHT_BROWSER_CHANNEL=chrome` to use installed Chrome.

## Database options

By default, the backend starts a one-node `MongoMemoryReplSet`. If `mongod`
cannot run in the environment, create `backend/.env.e2e` from
`backend/.env.e2e.example` and use a disposable external replica-set database.

External reset is intentionally destructive and requires both safeguards:

```dotenv
E2E_MONGO_URI=mongodb://127.0.0.1:27017/shario-e2e?replicaSet=rs0
E2E_ALLOW_DATABASE_RESET=true
```

The database name must also contain a standalone `e2e` or `test` segment. Never
point this configuration at a shared, staging, or production database.

## Seeded accounts

All accounts use `Playwright!123`:

- `owner@studio-alpha.test`
- `viewer@studio-alpha.test`
- `customer@studio-alpha.test`
- `owner@studio-beta.test`

The backend fixture manifest and reset controls are documented in
`backend/tests/e2e/README.md`.
