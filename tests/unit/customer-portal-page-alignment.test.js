import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
const alignedPageOwners = [
  "src/components/memberships/CustomerMembershipPage.js",
  "src/components/views/voucher/ApplyVouchers.js",
  "src/components/knowledge/KnowledgeBrowser.js",
  "src/components/views/invoices/CustomerInvoicesPage.js",
  "src/components/notifications/CustomerNotificationsPage.js",
  "src/app/[locale]/tenants/[tenantSlug]/portal/credits/page.js",
  "src/components/tables/MyBookingsTable.js",
  "src/app/[locale]/tenants/[tenantSlug]/portal/account/page.js",
];
describe("aligned customer portal pages", () => {
  it.each(alignedPageOwners)(
    "%s adopts the shared premium page and header primitives",
    (file) => {
      const source = read(file);
      expect(source).toContain("CustomerPortalPage");
      expect(source).toContain("CustomerPortalPageHeader");
      expect(source).toContain("<CustomerPortalPage");
      expect(source).toContain("<CustomerPortalPageHeader");
    },
  );
  it("keeps the booking overview hero on the calendar only", () => {
    const menu = read("src/components/menu/Menu.js");
    expect(menu).toContain(
      'const Root = currentTab === STUDIO_CALENDAR_TAB ? "main" : "div"',
    );
    expect(menu).toContain("const content = useMemo(() => {");
    expect(menu).toContain("if (currentTab === STUDIO_CALENDAR_TAB)");
    expect(menu).toContain("{content}");
    expect(menu).toContain("<MenuHeader");
    expect(menu).toContain("headingLevel={1}");
  });
  it("uses one compact-radius calendar panel without a second outer shell", () => {
    const menu = read("src/components/menu/Menu.js");
    const outerStart = menu.indexOf("data-customer-portal-calendar");
    const innerStart = menu.indexOf("data-customer-calendar-shell");
    const outerOpeningTag = menu.slice(outerStart, innerStart);
    const innerOpeningTag = menu.slice(innerStart, innerStart + 650);
    expect(outerOpeningTag).not.toContain("rounded-[22px]");
    expect(outerOpeningTag).not.toContain("shadow-[");
    expect(outerOpeningTag).not.toContain(
      'backgroundColor: "var(--tenant-background)"',
    );
    expect(innerOpeningTag).toContain("rounded-lg");
    expect(innerOpeningTag).toContain('borderRadius: "0.5rem"');
    expect(innerOpeningTag).not.toContain("min-h-[560px]");
    expect(innerOpeningTag).not.toContain("h-[clamp(560px,72dvh,760px)]");
    expect(innerOpeningTag).toContain("shadow-[0_10px_28px");
    expect(menu).toContain("pageScroll");
  });
  it("avoids nested page landmarks on dedicated booking and account routes", () => {
    const bookingsRoute = read(
      "src/app/[locale]/tenants/[tenantSlug]/portal/bookings/page.js",
    );
    const accountRoute = read(
      "src/app/[locale]/tenants/[tenantSlug]/portal/account/page.js",
    );
    expect(bookingsRoute).toContain("<MyBookingsTable headingLevel={1} />");
    expect(bookingsRoute).not.toContain("<main");
    expect(accountRoute).toContain("<CustomerPortalPage");
    expect(accountRoute).toContain("portalMode");
    expect(accountRoute).toContain("showPageHeader={false}");
  });
  it("keeps the public knowledge presentation isolated from the portal variant", () => {
    const hub = read("src/components/knowledge/CustomerKnowledgeHub.js");
    const browser = read("src/components/knowledge/KnowledgeBrowser.js");
    expect(hub).toContain('variant="portal"');
    expect(browser).toContain('if (variant === "portal")');
    expect(browser).toContain("CommunicationsPrimitives");
  });
  it("uses locale-aware compact currency on credits and vouchers", () => {
    const credits = read("src/components/credits/CreditBalance.js");
    const vouchers = read("src/components/views/voucher/ApplyVouchers.js");
    expect(credits).toContain("formatCustomerPortalCurrencyAmount");
    expect(vouchers).toContain("formatCustomerPortalCurrencyAmount");
    expect(credits).not.toContain("CZK 400.00");
    expect(vouchers).toContain(
      'legacyText("VoucherForm__for_example_D4T_32S_053_b5110")',
    );
  });
});
