import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("booking-site and customer-portal navigation", () => {
  it("keeps the protected customer portal separate from the public booking site", () => {
    const headerSource = read("src/components/headers/Header.js");
    const publicSiteAction = headerSource.slice(
      headerSource.indexOf("const handleOpenBookingSite"),
      headerSource.indexOf("const handleLogout"),
    );

    expect(headerSource).toContain('navigateToTenantSurface("/portal")');
    expect(publicSiteAction).toContain('pathname: "/?from=workspace"');
    expect(publicSiteAction).toContain("`/${targetLocale}?from=workspace`");
    expect(publicSiteAction).toContain(
      'window.open(target, "_blank", "noopener,noreferrer")',
    );
    expect(publicSiteAction).not.toContain(
      'navigateToTenantSurface("/portal")',
    );
  });

  it("uses the public-site action in the owner account menu", () => {
    const menuSource = read("src/components/headers/UserActionsMenuContent.js");

    expect(menuSource).toContain('label: t("tenantLinks.bookingSite")');
    expect(menuSource).toContain("onClick: onOpenBookingSite");
    expect(menuSource).not.toMatch(
      /label: t\("tenantLinks\.bookingSite"\)[\s\S]{0,180}onClick: onSwitchToUserMode/,
    );
  });

  it("uses the public-site action for the mobile admin shortcut", () => {
    const mobileMenuSource = read("src/components/headers/MobileMenu.js");

    expect(mobileMenuSource).toContain("onOpenBookingSite?.()");
    expect(mobileMenuSource).not.toMatch(
      /if \(isAdminRoute\) \{\s+onSwitchToUserMode\?\.\(\)/,
    );
  });
});
