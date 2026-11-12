# Hostname routing

The browser-facing URL structure is:

| Surface                           | URL                                        |
| --------------------------------- | ------------------------------------------ |
| Tenant public website             | `https://{slug}.shario.io/{locale}`        |
| Owner/staff app                   | `https://{slug}.shario.io/{locale}/app`    |
| Customer portal                   | `https://{slug}.shario.io/{locale}/portal` |
| Paid custom domain                | `https://customer-domain.com/{locale}`     |
| shario.io platform administration | `https://admin.shario.io/{locale}`         |

`proxy.js` keeps these URLs visible and rewrites them internally:

- `{slug}.shario.io/en/app` -> `/en/tenants/{slug}/app`
- `{slug}.shario.io/en/portal` -> `/en/tenants/{slug}/portal`
- `{slug}.shario.io/en` -> `/en/tenants/{slug}`
- `admin.shario.io/en` -> `/en/internal-admin`

The internal `/tenants` and `/internal-admin` paths return `404` when someone
tries to request them directly.

## Environment

```dotenv
NEXT_PUBLIC_SITE_URL=https://shario.io
NEXT_PUBLIC_ROOT_DOMAIN=shario.io
TENANT_ROOT_DOMAIN=shario.io

# Optional comma-separated platform/preview hosts.
PLATFORM_HOSTNAMES=deploy-preview-123.netlify.app

# Optional comma-separated allowlist for redirects from the retired
# shario.io/{locale}/{slug}/login path format.
LEGACY_TENANT_SLUGS=studio-grohovka

# Optional paid custom-domain mapping. Keep this server-side (no
# NEXT_PUBLIC_ prefix). Replace it with a cached edge resolver when the number
# of domains grows.
CUSTOM_DOMAIN_TENANTS={"customer-domain.com":"studio-grohovka"}
```

Local development uses wildcard localhost without a hosts-file entry:

- `http://studio-grohovka.localhost:4310/en/app`
- `http://studio-grohovka.localhost:4310/en/portal`
- `http://admin.localhost:4310/en`

If the Next.js dev server reports a cross-origin development warning, add
`allowedDevOrigins: ["*.localhost"]` to the project-level `next.config.js`.

## Deployment requirements

- Configure wildcard DNS and TLS for `*.shario.io`.
- Allow credentialed CORS from `https://*.shario.io` and configured custom
  domains on the API; do not combine credentials with `Access-Control-Allow-Origin: *`.
- The HTTP-only refresh cookie must work after moving from `shario.io` to a
  tenant subdomain. Hosting the API at `api.shario.io` keeps standard subdomains
  same-site.
- `/auth/refresh` must return `{accessToken, user, tenant}` for tenant users,
  and `tenant.slug` must match the hostname. Platform-role refresh responses
  may omit `tenant` but must include `user.platformRole`.
- Add each paid custom domain to the deployment provider and TLS setup before
  adding it to `CUSTOM_DOMAIN_TENANTS`.
- Resolve the rewritten `tenantSlug` against the tenant API before rendering
  real public content, and return `notFound()` for missing or inactive tenants.
  The proxy validates slug syntax; the database remains the source of truth.

Legacy tenant URLs beginning with `/admin`, `/rezervace`, `/onboarding`,
`/heslo`, and `/heslo-reset` are permanently redirected to their new routes.

The tenant refresh response should therefore include the same serialized
tenant used by login:

```js
res.status(200).json({
  accessToken: result.accessToken,
  user: serializeUser(result.user, result.tenant),
  tenant: serializeTenant(result.tenant),
});
```
