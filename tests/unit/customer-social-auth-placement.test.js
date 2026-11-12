import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const srcRoot = path.join(process.cwd(), "src");
const appRoot = path.join(srcRoot, "app", "[locale]");

const findSourceFiles = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) return findSourceFiles(absolutePath);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [absolutePath] : [];
  });

const relative = (absolutePath) =>
  path.relative(srcRoot, absolutePath).split(path.sep).join("/");

const filesContaining = (directory, token) =>
  findSourceFiles(directory)
    .filter((file) => fs.readFileSync(file, "utf8").includes(token))
    .map(relative)
    .sort();

describe("customer social authentication placement", () => {
  it("mounts social sign-in buttons only on tenant customer auth pages", () => {
    expect(filesContaining(appRoot, "CustomerSocialAuthButtons")).toEqual([
      "app/[locale]/tenants/[tenantSlug]/(tenant-auth)/login/page.js",
      "app/[locale]/tenants/[tenantSlug]/(tenant-auth)/register/page.js",
    ]);
  });

  it("mounts the social callback only under the tenant customer auth group", () => {
    expect(filesContaining(appRoot, "CustomerSocialAuthComplete")).toEqual([
      "app/[locale]/tenants/[tenantSlug]/(tenant-auth)/login/complete/page.js",
    ]);
  });

  it("keeps the provider query hook out of platform and workspace auth pages", () => {
    expect(
      filesContaining(srcRoot, "useGetCustomerSocialProvidersQuery"),
    ).toEqual([
      "components/auth/CustomerSocialAuthButtons.js",
      "lib/features/auth/authApiSlice.js",
    ]);
  });
});
