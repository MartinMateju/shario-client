import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tenantRoot = resolve(
  projectRoot,
  "src/app/[locale]/tenants/[tenantSlug]",
);
const requiredCanonicalFiles = [
  "(public-foundation)/page.js",
  "(tenant-auth)/login/page.js",
  "(customer-transactions)/layout.js",
];
const missingCanonicalFiles = requiredCanonicalFiles.filter(
  (relativePath) => !existsSync(resolve(tenantRoot, relativePath)),
);

if (missingCanonicalFiles.length > 0) {
  throw new Error(
    [
      "The shared customer-shell update is not fully extracted.",
      ...missingCanonicalFiles.map((path) => `Missing: ${path}`),
    ].join("\n"),
  );
}

const obsoleteRoutePaths = [
  // Older ZIPs owned these URLs directly below [tenantSlug]. Their canonical
  // replacements now live in explicit route groups.
  "page.js",
  "book",
  "courses",
  "help",
  "memberships",
  "login",
  "password",
  "register",

  // Payment results now use the publication-independent transaction shell.
  "src/app/[locale]/tenants/[tenantSlug]/(public-foundation)/memberships/checkout/success/page.js",
  "src/app/[locale]/tenants/[tenantSlug]/(public-foundation)/memberships/checkout/cancel/page.js",
  "src/app/[locale]/tenants/[tenantSlug]/(studio-grohovka-public)/checkout/success/page.js",
  "src/app/[locale]/tenants/[tenantSlug]/(studio-grohovka-public)/checkout/cancel/page.js",
  "src/app/[locale]/tenants/[tenantSlug]/(studio-grohovka-public)/kurzy-keramiky-brno/success/page.js",
  "src/app/[locale]/tenants/[tenantSlug]/(studio-grohovka-public)/kurzy-keramiky-brno/cancel/page.js",
];

for (const relativePath of obsoleteRoutePaths) {
  const target = relativePath.startsWith("src/")
    ? resolve(projectRoot, relativePath)
    : resolve(tenantRoot, relativePath);

  rmSync(target, { force: true, recursive: true });
}

rmSync(resolve(projectRoot, ".next"), { force: true, recursive: true });

console.log(
  `Customer-shell route cleanup complete (${obsoleteRoutePaths.length} legacy route paths checked).`,
);
