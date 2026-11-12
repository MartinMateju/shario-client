import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("door access settings navigation", () => {
  it("adds a permission-protected settings item under the access group", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/settings/settingsNavigation.js"),
      "utf8",
    );

    expect(source).toContain('key: "accessCodes"');
    expect(source).toContain('href: "/app/settings/access-codes"');
    expect(source).toContain("PERMISSIONS.ACCESS_CODES_VIEW");
    expect(source).toContain('module: "access_codes"');
  });

  it("protects the page with the dedicated view permission", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/access-codes/page.js",
      ),
      "utf8",
    );

    expect(source).toContain("PERMISSIONS.ACCESS_CODES_VIEW");
    expect(source).toContain("<PermissionBoundary");
    expect(source).toContain("<AccessCodesPage");
  });
});
