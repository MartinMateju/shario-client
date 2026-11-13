# Deploy the Shario client to Vercel

This repository is the Next.js frontend. Import `MartinMateju/shario-client` as its own Vercel project, using the repository root, the **Next.js** framework preset and **Node.js 22.x**. `vercel.json` selects `npm ci` and `npm run build`; leave the output directory at the framework default. Next.js SSR, API health route and hostname proxy require the normal Next.js deployment, not a static export. Vercel does not use the local `npm start` port.

The Express API and its queue workers belong to the separate `shario-server` deployment. Atlas does not replace that API. Keep MongoDB, Redis, Stripe, email, storage and auth-signing credentials on the backend; none belong in a `NEXT_PUBLIC_*` variable or this frontend's settings.

## Production environment

Set these project environment variables for **Production** before building:

| Variable                              | Production value or requirement                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                | `https://shario.io`                                                                          |
| `NEXT_PUBLIC_ROOT_DOMAIN`             | `shario.io`                                                                                  |
| `TENANT_ROOT_DOMAIN`                  | `shario.io` — must match the public root                                                     |
| `NEXT_PUBLIC_API_URL`                 | `https://api.shario.io` once the separately hosted API is reachable                          |
| `NEXT_PUBLIC_DEFAULT_TIME_ZONE`       | `Europe/Prague`                                                                              |
| `NEXT_PUBLIC_NATIVE_INVOICES_ENABLED` | `false` until its backend rollout is enabled                                                 |
| `NEXT_PUBLIC_ENABLE_PREVIEW_LOCALES`  | `true` to enable the full language selection                                                 |
| `NEXT_PUBLIC_ENABLED_LOCALES`         | `de,pl,sk,da,fr,es,it,pt-PT,sv,nb,fi,hu,el,tr,nl,ro` (English and Czech are always included) |
| `PLATFORM_HOSTNAMES`                  | Optional comma-separated additional platform hostnames                                       |
| `CUSTOM_DOMAIN_TENANTS`               | `{}` initially; verified customer hostname-to-slug mappings later                            |
| `LEGACY_TENANT_SLUGS`                 | Leave empty for the independent Shario installation                                          |

Keep **Automatically expose System Environment Variables** enabled. The proxy accepts this project's exact `VERCEL_URL`, `VERCEL_BRANCH_URL` and `VERCEL_PROJECT_PRODUCTION_URL`; other unknown hosts still return 404. Do not put generated Vercel URLs in the tenant-root variables.

Both language settings are required for all 18 languages in production. Product catalogs require complete key coverage in each language; missing translations block the production build. Preview/noindex status remains separate from catalog completeness. Set these variables separately for a staging environment if needed. Changing the variables requires a new build.

The build checks the four required URL/root settings when `VERCEL=1`. It rejects local-only values, insecure URLs, mismatched tenant roots and a generated `vercel.app` tenant root. This validates configuration shape; it does not prove that the API, DNS or provider accounts are ready. `NEXT_PUBLIC_*` values are built into the browser bundle: redeploy after changing them.

## Domains and backend alignment

Attach `shario.io`, `www.shario.io` and `*.shario.io` to the frontend project, with `www` redirecting to the chosen canonical origin. The wildcard serves workspace websites, portals and dashboards at `{slug}.shario.io`; `admin.shario.io` is the platform administration surface. Follow the DNS values shown by Vercel. Wildcard certificates need Vercel-managed DNS challenges, through its nameservers or the documented challenge delegation method. Preserve existing mail and verification DNS records when moving a DNS zone.

Give `api.shario.io` its own explicit DNS record pointing to the backend; the frontend wildcard must not capture API traffic. Configure the backend's HTTPS client URL, allowed origins, auth cookie domains, OAuth callback URLs and provider webhooks for Shario. Allow only intended frontend origins in `CORS_ALLOWED_ORIGINS`; never allow every `vercel.app` origin with credentials.

Customer custom domains require both a verified domain attached to Vercel and a matching `CUSTOM_DOMAIN_TENANTS` entry, for example `{"space.example":"shared-space"}`. The corresponding tenant and backend custom-domain/auth settings must also be configured. Adding a domain in Vercel alone does not identify its tenant.

## Preview and staging

A generated deployment URL can render the platform marketing and sign-in pages, but it is not a wildcard tenant domain. The client builds tenant links from `NEXT_PUBLIC_ROOT_DOMAIN` and calls the API directly with cookies. Testing a complete login, workspace creation or customer portal therefore needs a separate staging domain and API, for example:

```dotenv
NEXT_PUBLIC_SITE_URL=https://staging.shario.io
NEXT_PUBLIC_ROOT_DOMAIN=staging.shario.io
TENANT_ROOT_DOMAIN=staging.shario.io
NEXT_PUBLIC_API_URL=https://api.staging.shario.io
```

Assign `staging.shario.io` and `*.staging.shario.io` to the chosen Preview branch or custom environment, route `api.staging.shario.io` to its staging API and align that API's CORS/cookies/callbacks. Use staging data and payment test mode. Keep the Preview environment separate from Production; a generated preview URL using production root settings will still link to production tenant hosts. Do not treat a successful marketing preview as an authenticated application test.

Vercel deployment protection can remain enabled for review previews. External callbacks and full browser tests must target domains accessible to those callers, with their callback URLs configured explicitly.

## Verify a deployment

1. Confirm the build used Node 22 and the expected commit; check `/api/health` returns `service: "shario-client"`.
2. Open `/en`, `/cs` and `/en/pricing` on the assigned platform domain. Confirm Shario assets load and pricing can reach the API.
3. On a test workspace's assigned tenant domain, check the website, login, onboarding/dashboard, booking and portal. Confirm refresh keeps the intended session and tenant.
4. Check the configured custom-domain tenant separately if enabled. Unconfigured hosts and direct `/en/tenants/...` URLs must remain unavailable.
5. Check API CORS, cookie and OAuth behavior in the browser before enabling live payments or inviting customers.

Local `.vercel/` linkage is intentionally ignored. Link only to the intended Shario project; never copy a Skab project's linkage or environment files.

## Official references

- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Node.js version selection](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Environment scopes](https://vercel.com/docs/environment-variables) and [system deployment hostnames](https://vercel.com/docs/environment-variables/system-environment-variables)
- [Custom and wildcard domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [Next.js public environment variables](https://nextjs.org/docs/pages/guides/environment-variables)
