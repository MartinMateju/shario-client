import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("workspace UI consistency contract", () => {
  it("marks the tenant shell as the scope for workspace-wide styling", () => {
    const shellSource = readSource(
      "../../src/components/dashboard/TenantDashboardShell.js",
    );

    expect(shellSource).toContain('data-workspace-ui="true"');
    expect(shellSource).toContain("data-skab-workspace-surface");
    expect(shellSource).toContain("bg-canvas");
    expect(shellSource).not.toContain("bg-brand-offset");
  });

  it("uses the shared paper and white palette across desktop and mobile workspace chrome", () => {
    const sidebarSource = readSource(
      "../../src/components/dashboard/DashboardSidebar.js",
    );
    const topbarSource = readSource(
      "../../src/components/dashboard/DashboardTopbar.js",
    );
    const shellSource = readSource(
      "../../src/components/dashboard/TenantDashboardShell.js",
    );
    const mobileSidebarSource = readSource(
      "../../src/components/dashboard/DashboardMobileSidebar.js",
    );

    expect(sidebarSource).toContain("bg-surface-panel");
    expect(sidebarSource).toContain("border-b border-line bg-surface-panel");
    expect(topbarSource).toContain("border-b border-line ${styles.topbar}");
    expect(
      readSource("../../src/components/dashboard/dashboardShell.module.css"),
    ).toContain("background: var(--studio-white)");
    expect(shellSource).toContain("border-r border-line bg-surface-panel");
    expect(mobileSidebarSource).toContain("bg-surface-panel");
    expect(mobileSidebarSource).toContain("bg-surface-raised");
  });

  it("keeps the desktop shell compact without reducing interactive targets", () => {
    const shellSource = readSource(
      "../../src/components/dashboard/TenantDashboardShell.js",
    );

    expect(shellSource).toContain('collapsed: "72px"');
    expect(shellSource).toContain('expanded: "224px"');
    expect(shellSource).toContain("px-4 pb-10 pt-5");
  });

  it("keeps sidebar controls internal and all navigation targets accessible", () => {
    const sidebarSource = readSource(
      "../../src/components/dashboard/DashboardSidebar.js",
    );

    expect(sidebarSource).toContain("data-workspace-sidebar-header");
    expect(sidebarSource).toContain("data-workspace-sidebar-toggle");
    expect(sidebarSource).toContain("data-workspace-sidebar-footer");
    expect(sidebarSource).toContain("data-workspace-sidebar-primary-list");
    expect(sidebarSource).toContain("h-11 w-11");
    expect(sidebarSource).toContain("ml-3 min-h-11");
    expect(sidebarSource).not.toContain("h-[19px]");
    expect(sidebarSource).not.toContain("strokeWidth={1.7}");
    expect(sidebarSource).not.toContain("translate-x-full");
    expect(sidebarSource).not.toContain("data-launch-center-attention");
  });

  it("uses readable muted workspace text tokens", () => {
    const css = readSource("../../src/styles/globals.css");
    const normalizedCss = css.replace(/\s+/g, " ");

    expect(normalizedCss).toContain(
      '[data-workspace-ui="true"] { --color-ink-muted: #66635e; --color-ink-subtle: #73736e; }',
    );
  });

  it("gives legacy and modern tables and forms the same opt-out-aware baseline", () => {
    const css = readSource("../../src/styles/globals.css");

    expect(css).toContain(
      ':where([data-workspace-ui="true"], [role="dialog"])',
    );
    expect(css).toContain('table:not([data-ui-unstyled="true"])');
    expect(css).toContain('form:not([data-ui-unstyled="true"])');
    expect(css).toContain("font-variant-numeric: tabular-nums");
    expect(css).toContain("border-radius: 0.875rem");
    expect(css).toContain("min-height: 2.75rem");
  });

  it("uses explicit mobile dialog variants without styling the Headless UI root", () => {
    const css = readSource("../../src/styles/globals.css");
    const normalizedCss = css.replace(/\s+/g, " ");

    expect(normalizedCss).toMatch(
      /\[data-dialog-layout="form"\] \{[^}]*width: 100vw !important;[^}]*min-height: 100dvh;[^}]*max-height: 100dvh !important;[^}]*border-radius: 0 !important;/,
    );
    expect(normalizedCss).toMatch(
      /\[data-dialog-layout="compact"\] \{[^}]*max-height: min\(85dvh, 42rem\) !important;/,
    );
    expect(normalizedCss).not.toContain('[role="dialog"]:has(form)');
  });

  it.each([
    "../../src/components/dashboard/DashboardMobileSidebar.js",
    "../../src/components/menu/MobileMenuDialog.js",
    "../../src/components/headers/MobileUserActionsSheet.js",
    "../../src/components/headers/MobileMenu.js",
    "../../src/components/sidebars/Drawer.js",
    "../../src/components/sidebars/Sidebar.js",
    "../../src/components/sidebars/SidebarForm.js",
    "../../src/components/invoices/InvoiceDetailsDialog.js",
    "../../src/components/sales/OrderDetailsDialog.js",
    "../../src/components/ai/AiWorkspaceProvider.js",
    "../../src/components/ai/ConciergeWidget.js",
  ])("keeps %s opted into the drawer layout", (sourcePath) => {
    expect(readSource(sourcePath)).toContain('data-dialog-layout="drawer"');
  });
});
