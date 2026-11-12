import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("customer portal help integration contract", () => {
  it("coordinates one authenticated portal drawer across responsive triggers", () => {
    const header = read("src/components/headers/Header.js");
    const desktop = read("src/components/headers/DesktopActions.js");
    const mobile = read("src/components/headers/MobileRight.js");
    const mobileMenu = read("src/components/headers/MobileMenu.js");

    expect(header).toContain("const [customerHelpOpen, setCustomerHelpOpen]");
    expect(header).toContain(
      "isCustomerPortalSurface && tenantIsAuthenticated",
    );
    expect(header.match(/<CustomerPortalHelpDrawer/g)).toHaveLength(1);
    expect(desktop).toContain("<CustomerPortalHelpTrigger");
    expect(mobile).toContain("<CustomerPortalHelpTrigger");
    expect(mobileMenu).toContain("data-customer-portal-mobile-help");
    expect(mobileMenu).toContain('aria-haspopup="dialog"');
  });

  it("keeps the compact accordion controlled and single-open", () => {
    const drawer = read(
      "src/components/customer-shell/CustomerPortalHelpDrawer.js",
    );

    expect(drawer).toContain("const [activeTopicId, setActiveTopicId]");
    expect(drawer).toContain("aria-expanded={open}");
    expect(drawer).toContain('role="region"');
    expect(drawer).toContain("current === topicId ? null : topicId");
    expect(drawer).toMatch(
      /data-customer-portal-help-toggle=\{topic\.id\}\s+data-tenant-hover="preserve"/,
    );
    const drawerBody = drawer.slice(drawer.indexOf("function HelpTopic"));
    expect(drawerBody).not.toContain("var(--tenant-secondary)");
  });

  it("keeps content system-owned while applying the tenant profile theme", () => {
    const drawer = read(
      "src/components/customer-shell/CustomerPortalHelpDrawer.js",
    );
    const header = read("src/components/headers/Header.js");

    expect(drawer).toContain('data-customer-portal-help-content="system"');
    expect(drawer).toContain("const HELP_COPY = Object.freeze");
    // Tenant settings only control available destinations; the help copy stays
    // system-owned instead of becoming editable public-site content.
    expect(drawer).toContain("isCustomerPortalHrefEnabled");
    expect(drawer).not.toContain("customerPortalCustomization");
    expect(drawer).toContain("customerPortalProfileThemeStyle");
    expect(drawer).toContain("data-customer-portal-tour-replay");
    expect(header).toContain("primaryColor={tenantTheme.portalButtonColor}");
    expect(header).toContain(
      "primaryForeground={tenantTheme.portalButtonForeground}",
    );
  });

  it("makes customer help and the AI concierge mutually exclusive", () => {
    const concierge = read("src/components/ai/ConciergeWidget.js");
    const events = read(
      "src/components/customer-shell/customerPortalOverlayEvents.js",
    );

    expect(concierge).toContain("CUSTOMER_PORTAL_HELP_OPEN_EVENT");
    expect(concierge).toContain("CUSTOMER_PORTAL_CONCIERGE_OPEN_EVENT");
    expect(events).toContain('"shario:customer-portal-help-open"');
    expect(events).toContain('"shario:customer-portal-concierge-open"');
    expect(events).toContain('"shario:customer-portal-tour-start"');
  });
});
