# Localization rollout

shario.io uses BCP 47 locale codes across URLs, UI catalogs and new API fields.
Czech is `cs`; historical `CZ`/`EN` values remain only in explicitly
deprecated compatibility bridges for the client Redux catalog and the server's
legacy `defaultLanguage` field.

## Enabled languages and coverage

Shario enables the same 18 registered languages as Skab: English (`en`), Czech
(`cs`), German (`de`), Polish (`pl`), Slovak (`sk`), Danish (`da`), French (`fr`),
Spanish (`es`), Italian (`it`), European Portuguese (`pt-PT`), Swedish (`sv`),
Norwegian Bokmål (`nb`), Finnish (`fi`), Hungarian (`hu`), Greek (`el`), Turkish
(`tr`), Dutch (`nl`) and Romanian (`ro`).

Every product catalog must contain the same keys as English. The catalog loader
loads only the selected language; it never merges missing messages from English.
The older customer screens also use the active next-intl catalog, including when
the historical Redux language enum is still `EN` or `CZ`.

The supported product copy includes marketing, authentication, customer portal,
bookings, waitlists, memberships, billing, inventory, communication settings,
website editor, imports, notifications and deterministic AI recommendations.
Server diagnostics are displayed through localized screen messages or known error
codes. Tenant-written names, descriptions, messages and knowledge articles remain
in the language supplied by their authors.

English, Czech and Dutch retain their `ready` indexing status. The other languages
retain `preview` and `noindex` metadata during editorial and release review; this
status no longer relaxes the full-catalog requirement. The language selector lists
all enabled languages using their native names.

Norwegian Bokmål uses the canonical `nb` route; `no` and `no-NO` are input
aliases. Regional inputs such as `hu-HU`, `el-GR`, `tr-TR`, `nl-NL` and `ro-RO`
resolve to their canonical routes. European Portuguese uses `pt-PT`.

## Deployment activation

Czech and English are always enabled. A missing or blank allow-list enables all
preview locales automatically during local development. Set the values
explicitly to narrow local routing or activate previews at build and deployment
time:

```dotenv
NEXT_PUBLIC_ENABLED_LOCALES=de,pl,sk,da,fr,es,it,pt-PT,sv,nb,fi,hu,el,tr,nl,ro
NEXT_PUBLIC_ENABLE_PREVIEW_LOCALES=true
```

An explicit allow-list is sufficient in local development and tests. Blank test
and production environments remain core-only; only local development receives
the automatic preview default. Shario production uses both values above. A production build requires them,
and the preview switch accepts only the exact value `true`. Keeping production
routing and locale detection behind this double gate avoids redirecting a
customer to an unfinished language based on their browser or a stale locale
cookie. Preview locales remain `noindex` even when enabled.

## Quality gates

Before changing a locale from preview to ready:

1. Every source key has a reviewed translation.
2. ICU variables, plural arguments and rich-text tags match the English source.
3. Authentication, public website, portal, dashboard, notifications, help and
   automated-communication journeys have been reviewed.
4. Desktop, tablet and mobile layouts have been checked for text expansion.
5. Dates, times, numbers, currencies and plural forms have locale-specific
   coverage.
6. The locale passes the catalog validator and focused application tests.

Tenant-authored content is not part of the product UI catalog. It remains under
tenant control and can later receive a separate, opt-in translation workflow.

## Language selectors and tenant policy

- The shario.io marketing header lists every locale enabled in the routing build.
- A tenant workspace has one authoritative language for every owner and team
  member. Login origin, browser detection, locale cookies, URL input and
  historical personal preferences never override it; workspace routes
  canonicalize to the configured language.
- A tenant public site has one primary language and at most one optional
  secondary language. The primary language is the fallback for every
  unsupported customer URL, while an explicitly selected configured secondary
  language remains valid across public, authentication, transaction and portal
  surfaces.
- The tenant profile-menu language action opens General settings only for
  members who can update the workspace. Other team members see the inherited
  workspace language as read-only.

Tenant-authored public-site fields support the tenant's configured primary and
optional secondary locale. Shario never translates that custom copy automatically.
Outgoing email/SMS template language is a separate server feature; product screen
localization does not automatically translate stored message templates.

## Development and validation

`npm run i18n:check` checks every registered catalog, including Czech, for missing
or extra keys, empty translations, ICU argument types and rich-text structure.
Both production build commands run this check before building. The real ICU
formatter is also exercised in tests with singular, plural and fractional counts.
Add new messages to all 18 catalogs in the same change; English fallback is not
available as a development shortcut.

AI briefing and advisor copy is maintained in the `AIProduct` namespace alongside
the frontend messages. Export its validated catalogs into the separate Shario
server repository after editing it:

```sh
node scripts/export-ai-product-catalogs.mjs /absolute/path/to/shario-server/src/modules/ai/ai-product-messages.ts
```

Commit both repositories when that shared product copy changes. The server tests
check full locale coverage and preserve the underlying operational and financial
facts while translating the display strings. During an AI provider outage, the
assistant and concierge use localized unavailable messages or an exact-language
knowledge answer, without appending an English fallback answer.
