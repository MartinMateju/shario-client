import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const source = (relativePath) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");
describe("contextual guide targets", () => {
  it.each([
    [
      "src/components/products/ProductsView.js",
      'data-contextual-guide-target="first-offer-create"',
    ],
    [
      "src/components/products/ProductsView.js",
      'data-contextual-guide-target="first-offer-catalog"',
    ],
    [
      "src/components/public-site-editor/PublicSiteEditorPage.js",
      'data-contextual-guide-target="customer-journey-open-site"',
    ],
    [
      "src/components/public-site-editor/PublicSiteEditorPage.js",
      'data-contextual-guide-target="customer-journey-preview-page"',
    ],
    [
      "src/components/views/payments/PaymentConnectSettingsPage.js",
      'data-contextual-guide-target="payments-status"',
    ],
    [
      "src/components/views/payments/PaymentConnectSettingsPage.js",
      'data-contextual-guide-target="payments-onboarding"',
    ],
    [
      "src/components/views/payments/PaymentConnectSettingsPage.js",
      'data-contextual-guide-target="payments-capabilities"',
    ],
    [
      "src/components/views/payments/PaymentConnectSettingsPage.js",
      'data-contextual-guide-target="payments-checklist"',
    ],
    [
      "src/components/migration/MigrationCenterPage.js",
      'data-contextual-guide-target="data-import-types"',
    ],
    [
      "src/components/migration/MigrationCenterPage.js",
      'data-contextual-guide-target="data-import-wizard"',
    ],
    [
      "src/components/migration/MigrationCenterPage.js",
      'data-contextual-guide-target="data-import-history"',
    ],
    [
      "src/components/migration/CustomerImportWizard.js",
      'data-contextual-guide-target="data-import-progress"',
    ],
  ])("keeps %s exposing %s", (file, target) => {
    expect(source(file)).toContain(target);
  });
  it("keeps the existing tab systems used by lifecycle guides stable", () => {
    expect(
      source("src/components/communications/CommunicationsWorkspace.js"),
    ).toContain('id="email-workspace-sections"');
    expect(
      source("src/components/views/membership_plans/MembershipPlansPage.js"),
    ).toContain('const MEMBERSHIP_TABS_ID = "membership-sections"');
  });
});
