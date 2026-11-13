import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

const isLocalHostname = (hostname) =>
  hostname === "localhost" ||
  hostname.endsWith(".localhost") ||
  hostname === "127.0.0.1" ||
  hostname === "0.0.0.0" ||
  hostname === "[::1]";

export function validateVercelEnvironment(env = process.env) {
  if (env.VERCEL !== "1") return [];

  const errors = [];
  for (const key of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_API_URL"]) {
    try {
      const url = new URL(String(env[key] || "").trim());
      if (
        url.protocol !== "https:" ||
        isLocalHostname(url.hostname) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        (key === "NEXT_PUBLIC_SITE_URL" && url.pathname !== "/")
      ) {
        throw new Error("Invalid deployment URL");
      }
    } catch {
      errors.push(
        `${key} must be an absolute HTTPS URL without credentials, query parameters or fragments; local hosts are not deployable. NEXT_PUBLIC_SITE_URL must be an origin without a path.`,
      );
    }
  }

  const roots = ["NEXT_PUBLIC_ROOT_DOMAIN", "TENANT_ROOT_DOMAIN"].map((key) => {
    const hostname = String(env[key] || "")
      .trim()
      .toLowerCase();
    if (
      !HOSTNAME_PATTERN.test(hostname) ||
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) ||
      isLocalHostname(hostname) ||
      hostname === "vercel.app" ||
      hostname.endsWith(".vercel.app")
    ) {
      errors.push(
        `${key} must be your tenant root hostname, without a protocol, port or path. Use a custom domain for wildcard tenants, not localhost or a generated vercel.app URL.`,
      );
    }
    return hostname;
  });

  if (roots[0] !== roots[1]) {
    errors.push("NEXT_PUBLIC_ROOT_DOMAIN and TENANT_ROOT_DOMAIN must match.");
  }

  return errors;
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  const errors = validateVercelEnvironment();
  if (errors.length) {
    console.error(
      `Vercel deployment configuration is incomplete:\n${errors.map((error) => `- ${error}`).join("\n")}\nSee docs/VERCEL.md.`,
    );
    process.exitCode = 1;
  }
}
