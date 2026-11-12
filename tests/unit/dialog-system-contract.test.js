import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");
const directDialogSources = [
  "../../src/components/views/roles/RolesSettingsPage.js",
  "../../src/components/views/team/TeamSettingsPage.js",
  "../../src/components/invoices/InvoiceEditorDialog.js",
  "../../src/components/invoices/CreditNoteDialog.js",
  "../../src/components/invoices/InvoicePaymentsSection.js",
  "../../src/components/memberships/PlanEditorDialog.js",
  "../../src/components/memberships/CustomerMembershipPage.js",
  "../../src/components/public-site-editor/PublicSiteEditorPage.js",
  "../../src/components/ai/BusinessAdvisorPanel.js",
  "../../src/components/ai/AiActionConfirmation.js",
  "../../src/components/modals/OTPModal.js",
  "../../src/components/modals/CourseDetailsModal.js",
  "../../src/components/modals/admin/BookingInfoModal.js",
  "../../src/components/modals/admin/CourseInfoModal.js",
  "../../src/components/bookings/BookingActionButtons.js",
  "../../src/components/modals/CartModal.js",
  "../../src/components/credits/CreditPurchaseModal.js",
  "../../src/components/modals/CourseModal.js",
];
describe("dialog system contract", () => {
  it("defines one explicit responsive surface anatomy", () => {
    const source = readSource(
      "../../src/components/dashboard/WorkspaceDialogSurface.js",
    );
    for (const layout of ["form", "modal", "compact", "media"]) {
      expect(source).toContain(`${layout}: [`);
    }
    expect(source).toContain("data-dialog-backdrop");
    expect(source).toContain("data-dialog-viewport");
    expect(source).toContain("data-dialog-layout={resolvedLayout}");
    expect(source).toContain("data-dialog-header");
    expect(source).toContain("data-dialog-body");
    expect(source).toContain("data-dialog-footer");
    expect(source).toContain("h-11 w-11");
    expect(source).toContain("duration-200");
    expect(source).toContain("motion-reduce:transition-none");
  });
  it.each([
    "../../src/components/modals/ResponsiveModal.js",
    "../../src/components/communications/CommunicationsPrimitives.js",
    "../../src/components/modals/ConformationModal.js",
    "../../src/components/modals/ConfirmationModalWindow.js",
    "../../src/components/views/inventory/InventoryManagementPage.js",
    "../../src/components/views/billing/BillingSettingsPage.js",
    "../../src/components/views/events/EventsManagementPage.js",
    "../../src/components/memberships/MembershipCustomersPanel.js",
  ])("routes %s through the shared surface", (sourcePath) => {
    const source = readSource(sourcePath);
    expect(source).toContain("WorkspaceDialogSurface");
    expect(source).toContain("WorkspaceDialogPanel");
    expect(source).toContain("WorkspaceDialogHeader");
  });
  it("keeps the email compatibility wrapper on the communications modal", () => {
    const source = readSource(
      "../../src/components/communications/email/EmailWorkspacePrimitives.js",
    );
    expect(source).toContain("Modal as CommunicationsModal");
    expect(source).toContain("<CommunicationsModal");
    expect(source).not.toContain("<DialogPanel");
  });
  it.each(directDialogSources)(
    "gives every direct dialog in %s an explicit variant and backdrop",
    (sourcePath) => {
      const source = readSource(sourcePath);
      expect(source).toContain("data-dialog-layout");
      expect(source).toContain("data-dialog-backdrop");
      expect(source).toMatch(/DialogTitle|Dialog\.Title/);
    },
  );
  it.each([
    "../../src/components/views/roles/RolesSettingsPage.js",
    "../../src/components/views/team/TeamSettingsPage.js",
    "../../src/components/invoices/InvoiceEditorDialog.js",
    "../../src/components/invoices/CreditNoteDialog.js",
    "../../src/components/memberships/PlanEditorDialog.js",
  ])(
    "makes mobile form dialogs true safe-area-aware full screens in %s",
    (sourcePath) => {
      const source = readSource(sourcePath);
      expect(source).toContain('data-dialog-layout="form"');
      expect(source).toContain("h-dvh");
      expect(source).toContain("max-h-dvh");
      expect(source).toContain("rounded-none");
      expect(source).toContain("safe-area-inset-top");
    },
  );
  it("marks special layouts so they cannot inherit modal geometry", () => {
    const notificationSource = readSource(
      "../../src/components/notifications/CustomerNotificationMenu.js",
    );
    expect(notificationSource).toContain('data-dialog-layout="popover"');
  });
  it.each([
    "../../src/components/credits/CreditPurchaseModal.js",
    "../../src/components/menu/MobileMenuDialog.js",
    "../../src/components/modals/CourseModal.js",
  ])(
    "gives every migrated direct dialog an accessible title in %s",
    (sourcePath) => {
      const source = readSource(sourcePath);
      expect(source).toContain("DialogTitle");
      expect(source).toContain("data-dialog-layout");
    },
  );
  it("uses explicit panel geometry instead of a role/DOM-shape heuristic", () => {
    const css = readSource("../../src/styles/globals.css");
    expect(css).toContain('[data-dialog-layout="form"]');
    expect(css).toContain('[data-dialog-layout="compact"]');
    expect(css).toContain("--dialog-surface");
    expect(css).not.toContain('[role="dialog"]:has(form)');
  });
  it.each([
    "../../src/components/modals/EmailUserModal.js",
    "../../src/components/modals/EmailModal.js",
    "../../src/components/modals/FormModal.js",
    "../../src/components/modals/GuestCheckoutModal.js",
    "../../src/components/modals/GrantCreditsModal.js",
    "../../src/components/modals/admin/EditUserCreditsModal.js",
    "../../src/components/modals/shells/ShellModals.js",
  ])("removes the unused legacy shell %s", (sourcePath) => {
    expect(existsSync(new URL(sourcePath, import.meta.url))).toBe(false);
  });
});
