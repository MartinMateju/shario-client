import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("locale layout root children", () => {
  it("uses stable keys across the StoreProvider boundary in semantic order", () => {
    const layoutSource = readFileSync(
      path.join(process.cwd(), "src/app/[locale]/layout.js"),
      "utf8",
    );

    const localeSyncIndex = layoutSource.indexOf(
      '<LegacyLocaleSync key="legacy-locale-sync" />',
    );
    const skipLinkIndex = layoutSource.indexOf(
      '<a key="skip-link" className="skip-link" href="#page-content">',
    );
    const platformHeaderIndex = layoutSource.indexOf(
      '<Suspense key="platform-header" fallback={<HeaderPlaceholder />}>',
    );
    const pageContentIndex = layoutSource.indexOf('key="page-content"');

    expect(localeSyncIndex).toBeGreaterThan(-1);
    expect(skipLinkIndex).toBeGreaterThan(localeSyncIndex);
    expect(platformHeaderIndex).toBeGreaterThan(skipLinkIndex);
    expect(pageContentIndex).toBeGreaterThan(platformHeaderIndex);
    expect(layoutSource).toMatch(
      /<div\s+key="page-content"\s+id="page-content"/,
    );
    expect(layoutSource).toContain("tabIndex={-1}");
  });

  it("uses stable keys at tenant and customer-portal layout boundaries", () => {
    const tenantLayoutSource = readFileSync(
      path.join(
        process.cwd(),
        "src/app/[locale]/tenants/[tenantSlug]/layout.js",
      ),
      "utf8",
    );
    const portalLayoutSource = readFileSync(
      path.join(
        process.cwd(),
        "src/app/[locale]/tenants/[tenantSlug]/portal/layout.js",
      ),
      "utf8",
    );

    const tenantContentIndex = tenantLayoutSource.indexOf(
      '<Fragment key="tenant-route-content">{children}</Fragment>',
    );
    const publicConciergeIndex = tenantLayoutSource.indexOf(
      '<PublicStudioConcierge key="public-studio-concierge" />',
    );
    const portalContentIndex = portalLayoutSource.indexOf(
      '<CustomerPortalLocationGate key="customer-portal-location-gate">',
    );
    const portalConciergeIndex = portalLayoutSource.indexOf(
      '<CustomerStudioConcierge key="customer-studio-concierge" />',
    );

    expect(tenantContentIndex).toBeGreaterThan(-1);
    expect(publicConciergeIndex).toBeGreaterThan(tenantContentIndex);
    expect(portalContentIndex).toBeGreaterThan(-1);
    expect(portalConciergeIndex).toBeGreaterThan(portalContentIndex);
  });
});
