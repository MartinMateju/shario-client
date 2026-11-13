# Shario client

Shario is the independent shared-space edition of Skab: bookings, memberships, a customizable website, customer accounts and everyday operations. This repository contains the Next.js application and the approved Shario visual identity.

## Start locally

Use Node 22 (see `.nvmrc`). Keep the two repositories next to each other:

```text
Developer/
  shario-client/
  shario-server/
```

In both repositories run `npm ci`. Then, from `shario-server`, run:

```sh
npm run setup:local
npm run infra:up
npm run dev
```

The setup command creates fresh ignored local configuration in both repositories; it refuses to overwrite existing configuration. Docker Compose starts a dedicated MongoDB replica set and Redis. Provider credentials remain placeholders until you configure your own Shario accounts.

In another terminal, from this repository:

```sh
npm run dev
```

Open http://shario.localhost:4310/en. The API runs on port 4311. New workspaces use `{slug}.shario.localhost:4310`. Localhost subdomains are resolved by modern browsers; no Skab hosts are used.

## Verification

```sh
npm run lint
npm run i18n:check
npm test
npm run test:products
npm run build
npx playwright test --config=playwright.marketing.config.js
```

The full-stack Playwright configuration expects the sibling `shario-server` checkout and a disposable Redis instance on `127.0.0.1:6381` (database 15). It starts a temporary MongoDB replica set and mocks Stripe/R2. The larger release smoke also needs Mailpit and a local Postmark stub; see `e2e/README.md`. Never point the test harness at a production database.

## Vercel deployment

See [the Vercel setup guide](docs/VERCEL.md) for project settings, required environment variables, wildcard tenant domains and staging. The frontend uses the normal Next.js deployment on Node 22; its API and workers run separately from this repository. Vercel builds validate deployment URLs and tenant-root settings before compiling.

## Brand and tenant customization

The platform uses Manrope, Shario Blue `#2563EB`, Ink `#182333`, white surfaces and aqua/coral/yellow/lilac accents. Canonical artwork is in `public/brand/`; the Manrope font and license are in `src/fonts/` (`Manrope-OFL.txt`). Shario marketing is translated into all 18 registered languages. Enable the locale list and rollout switch from `.env.example` in the deployment environment. Existing generic product translations remain available, with English fallback on deeper screens in incomplete catalogs; see [localization coverage](docs/localization-rollout.md).

Tenant websites keep their own colors, logo, typography choices, pages, domain and booking surfaces. Some internal `SkabLogo` component names and `--skab-*` CSS aliases are retained to preserve the copied component contracts; their rendered identity is Shario.

## Scope and provenance

See [the fork decisions](docs/SHARIO-FORK.md). The original Skab checkout is not a runtime dependency and was not modified. Do not copy Skab environment files or reuse its production provider configuration.

No hosting, DNS or live billing resources are created by this repository. Configure the Shario domains and dedicated provider accounts before deployment. Native invoice management and commerce imports retain their existing rollout switches; Stripe payments and membership billing remain supported.
