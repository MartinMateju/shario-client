# Localization rollout

shario.io uses BCP 47 locale codes across URLs, UI catalogs and new API fields.
Czech is `cs`; historical `CZ`/`EN` values remain only in explicitly
deprecated compatibility bridges for the client Redux catalog and the server's
legacy `defaultLanguage` field.

## Roadmap

| Stage   | Locales                   |
| ------- | ------------------------- |
| Current | `en`, `cs`                |
| Wave 1  | `de`, `pl`, `sk`, `da`    |
| Wave 2A | `fr`, `es`, `it`, `pt-PT` |
| Wave 2B | `sv`, `nb`, `fi`          |
| Wave 2C | `hu`, `el`, `tr`          |
| Wave 2D | `nl`                      |
| Wave 2E | `ro`                      |

All Wave 2 entries now have preview catalogs and can be enabled through the
controlled rollout gates. Norwegian Bokmål uses the canonical `nb` route; `no`
and `no-NO` are accepted only as input aliases.

Wave 2C regional inputs `hu-HU`, `el-GR` and `tr-TR` resolve to the canonical
`hu`, `el` and `tr` routes; the legacy Greek input `gr-GR` also resolves to
`el`.
Wave 2D regional input `nl-NL` resolves to the canonical `nl` route.
Wave 2E regional input `ro-RO` resolves to the canonical `ro` route.

## Current preview milestone

The preview implementation translates 16 launch-critical namespaces plus the
three tenant-core namespaces `Dashboard`, `WorkspaceSettingsNav`, and
`WorkspaceSettings` (1,424 messages per language) for Wave 1 and all five
Wave 2 groups. The covered surfaces include metadata, shared navigation,
platform and customer authentication, the marketing home page, public tenant and booking flows,
customer shell, confirmations, verification, purchase status, notifications,
the tenant dashboard shell and overview, and General settings.

All remaining namespaces use the complete English catalog as an explicit
fallback. These locales therefore remain `preview` and `noindex`; they are
suitable for staging and language review, but not yet for a production claim of
complete localization.

## Preview activation

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
the automatic preview default. A production build requires both values above,
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

Preview product chrome falls back to English outside the launch-critical and
tenant-core namespaces. Tenant-authored public-site fields support the tenant's
configured primary and optional secondary locale, but shario.io never translates
that custom copy automatically.
