import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const readSource = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
describe("customer overlay style preset propagation", () => {
  it("keeps the booking drawer inside the selected tenant preset", () => {
    const source = readSource("src/components/sidebars/Sidebar.js");
    expect(source).toContain("data-tenant-style={tenantTheme.stylePresetId}");
    expect(source).toContain("data-customer-booking-drawer");
    expect(source).toContain('data-tenant-surface="panel"');
    expect(source).toContain('data-tenant-type="display"');
    expect(source).toContain('data-tenant-type="label"');
    expect(source).toContain('data-tenant-button="primary"');
    expect(source.match(/data-tenant-surface="field"/g).length).toBeGreaterThan(
      5,
    );
  });
  it("keeps the portalled cart and its media on the selected preset", () => {
    const source = readSource("src/components/modals/CartModal.js");
    expect(source).toContain("data-tenant-style={tenantTheme.stylePresetId}");
    expect(source).toContain("data-cart-modal");
    expect(source).toContain('data-dialog-layout="modal"');
    expect(source).toContain('data-tenant-surface="panel"');
    expect(source).toContain('data-tenant-type="eyebrow"');
    expect(source).toContain('data-tenant-type="display"');
    expect(source).toContain('data-tenant-type="label"');
    expect(source).toContain('data-tenant-button="primary"');
    expect(source).toContain('data-tenant-button="secondary"');
    expect(source.match(/data-tenant-surface="card"/g).length).toBeGreaterThan(
      2,
    );
    expect(source.match(/data-tenant-surface="media"/g)).toHaveLength(2);
    expect(source).toContain("data-tenant-image");
    expect(source).not.toContain(
      "0 10px 24px color-mix(in srgb, var(--tenant-accent)",
    );
  });
  it("passes the public tenant preset into the portalled concierge", () => {
    const bridge = readSource("src/components/ai/CustomerStudioConcierge.js");
    const widget = readSource("src/components/ai/ConciergeWidget.js");
    const message = readSource("src/components/ai/AiMessage.js");
    expect(bridge).toContain("useOptionalPublicTenant");
    expect(bridge).toContain(
      "getPublicTenantTheme(publicTenant?.tenant || {}, {",
    );
    expect(bridge).toContain("tenantStylePresetId={tenantTheme.stylePresetId}");
    expect(bridge).toContain("tenantThemeStyle={tenantTheme.style}");
    expect(widget).toContain("tenantStylePresetId = null");
    expect(widget).toContain("tenantThemeStyle = null");
    expect(widget).toContain("data-tenant-style=");
    expect(widget).toContain("tenantStylePresetId || undefined");
    expect(widget).toContain("tenantThemeStyle || undefined");
    expect(widget).toContain("data-customer-concierge-panel");
    expect(widget).toContain('surface === "customer" ? "panel" : undefined');
    expect(widget).toContain('surface === "customer" ? "field" : undefined');
    expect(widget).toContain('surface === "customer" ? "primary" : undefined');
    expect(widget).toContain(
      'surface === "customer" ? "secondary" : undefined',
    );
    expect(widget).toContain("data-tenant-button-compact");
    expect(widget).toContain("data-customer-concierge-send");
    expect(widget).toContain('tenantThemed={surface === "customer"}');
    expect(message).toContain("data-tenant-ai-message");
    expect(message).toContain('tenantThemed ? "secondary" : undefined');
  });
  it("keeps credit purchase, studio selection, calendar, and error states semantic", () => {
    const credits = readSource("src/components/credits/CreditPurchaseModal.js");
    const chooser = readSource(
      "src/components/customer-shell/PortalLocationChooser.js",
    );
    const menu = readSource("src/components/menu/Menu.js");
    const switcher = readSource("src/components/menu/StudioSwitcher.js");
    const portal = readSource(
      "src/app/[locale]/tenants/[tenantSlug]/portal/page.js",
    );
    expect(credits).toContain("useOptionalPublicTenant");
    expect(credits).toMatch(
      /getPublicTenantTheme\(publicTenantContext\?\.tenant \|\| tenant \|\| \{\}, \{/,
    );
    expect(credits).toContain("data-tenant-style={tenantTheme.stylePresetId}");
    expect(credits).toContain("data-credit-purchase-panel");
    expect(credits).toContain('data-dialog-layout="modal"');
    expect(credits.match(/data-tenant-surface="card"/g).length).toBeGreaterThan(
      2,
    );
    expect(credits).toContain('data-tenant-button="primary"');
    expect(credits).toContain('data-tenant-button="secondary"');
    expect(credits).toContain("var(--tenant-accent)");
    expect(credits).toContain("var(--tenant-text-on-surface)");
    for (const source of [chooser, menu, switcher, portal]) {
      expect(source).toContain("data-tenant-surface");
    }
    expect(chooser).toContain("data-customer-portal-surface");
    expect(chooser).toContain('data-tenant-layout="panel"');
    expect(chooser).not.toContain('data-tenant-button="secondary"');
    expect(menu).toContain("data-customer-calendar-shell");
    expect(menu).toContain('data-tenant-type="display"');
    expect(menu).not.toMatch(
      /data-customer-portal-calendar\s+data-tenant-layout="section"/,
    );
    expect(switcher).toContain("data-tenant-navigation");
    expect(switcher).toContain('data-tenant-surface="panel"');
    expect(switcher).not.toMatch(
      /data-customer-selected-studio\s+data-tenant-type="label"/,
    );
    expect(portal).toContain("data-customer-portal-page");
    expect(portal).toContain("data-customer-portal-loading-state");
    expect(portal).toContain('data-tenant-button="primary"');
  });
  it("carries tenant hover tokens into every live customer and public portal", () => {
    const portalTheme = readSource(
      "src/components/public-tenant/publicTenantPortalTheme.js",
    );
    const bookingDrawer = readSource("src/components/sidebars/Drawer.js");
    const confirmation = readSource(
      "src/components/modals/ConformationModal.js",
    );
    const invoice = readSource(
      "src/components/invoices/InvoiceDetailsDialog.js",
    );
    const mobileMenu = readSource("src/components/menu/MobileMenuDialog.js");
    const menuBox = readSource("src/components/listboxes/MenuBox.js");
    const comboBox = readSource("src/components/comboboxes/ComboBox.js");
    const voucherDrawer = readSource("src/components/sidebars/SidebarForm.js");
    const courseCard = readSource("src/components/cards/CourseCard.js");
    const courseModal = readSource(
      "src/components/modals/CourseDetailsModal.js",
    );
    const voucherConfirmation = readSource(
      "src/components/views/voucher/ApplyVouchers.js",
    );
    const registration = readSource(
      "src/app/[locale]/tenants/[tenantSlug]/(tenant-auth)/register/page.js",
    );
    expect(portalTheme).toContain("getPublicTenantPortalTheme");
    expect(portalTheme).toContain('"soft-light"');
    expect(portalTheme).toContain(
      'theme.style?.["--tenant-secondary-on-soft-light"]',
    );
    expect(portalTheme).toContain(
      '"--tenant-interactive-hover": secondaryOnInteractionSurfaceColor',
    );
    expect(bookingDrawer).toContain(
      "data-tenant-style={tenantTheme?.stylePresetId}",
    );
    expect(bookingDrawer.match(/customerMode/g).length).toBeGreaterThanOrEqual(
      3,
    );
    expect(bookingDrawer).toContain('confirmIntent="danger"');
    expect(confirmation).toContain("customerMode = false");
    expect(confirmation).toContain(
      "customerMode ? tenantStylePresetId || undefined : undefined",
    );
    expect(confirmation).toContain(
      "data-tenant-intent={confirmIntent || undefined}",
    );
    expect(confirmation).toContain('data-tenant-button="primary"');
    expect(invoice).toContain(
      "customerMode ? tenantTheme?.stylePresetId : undefined",
    );
    expect(mobileMenu).toContain(
      "data-tenant-style={tenantTheme?.stylePresetId}",
    );
    expect(mobileMenu).toContain(
      "data-tenant-hover-fill={isActive || undefined}",
    );
    for (const primitive of [menuBox, comboBox, courseModal]) {
      expect(primitive).toContain("tenantStylePresetId = null");
      expect(primitive).toContain("tenantThemeStyle = null");
      expect(primitive).toContain(
        "data-tenant-style={tenantStylePresetId || undefined}",
      );
      expect(primitive).toContain("style={tenantThemeStyle || undefined}");
    }
    expect(voucherDrawer.match(/tenantStylePresetId=/g)).toHaveLength(2);
    expect(voucherDrawer.match(/tenantThemeStyle=/g)).toHaveLength(2);
    expect(courseCard).toContain(
      "tenantStylePresetId={tenantTheme?.stylePresetId}",
    );
    expect(courseCard).toContain("tenantThemeStyle={tenantTheme?.style}");
    for (const customerConfirmation of [voucherConfirmation, registration]) {
      expect(customerConfirmation).toContain("customerMode");
      expect(customerConfirmation).toContain(
        "tenantStylePresetId={tenantTheme?.stylePresetId}",
      );
      expect(customerConfirmation).toContain(
        "tenantThemeStyle={tenantTheme?.style}",
      );
    }
    for (const listbox of [menuBox, comboBox]) {
      expect(listbox).toContain("data-tenant-interactive-label");
      expect(listbox).toContain('data-tenant-hover="preserve"');
      expect(listbox).toContain("aria-invalid={highlightFocus || undefined}");
      expect(listbox).toContain(
        'data-tenant-hover={highlightFocus ? "preserve" : undefined}',
      );
    }
  });
});
