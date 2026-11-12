import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("user profile menu viewport layout", () => {
  it("uses a right drawer below the workspace desktop breakpoint", () => {
    const workspaceMenu = read("src/components/headers/UserProfileMenu.js");

    expect(workspaceMenu).toContain("data-profile-menu-drawer");
    expect(workspaceMenu).toContain("data-workspace-profile-drawer");
    expect(workspaceMenu).toContain("data-workspace-profile-drawer-trigger");
    expect(workspaceMenu).toContain('data-dialog-layout="drawer"');
    expect(workspaceMenu).toContain("relative z-[110] xl:hidden");
    expect(workspaceMenu).toContain("relative hidden xl:block");
    expect(workspaceMenu).toContain("h-dvh");
    expect(workspaceMenu).toContain("w-full max-w-[320px]");
    expect(workspaceMenu).toContain(
      "<Transition show={mobileMenuOpen} as={Fragment}>",
    );
    expect(workspaceMenu).toContain("<TransitionChild");
    expect(workspaceMenu).toContain("transform-gpu");
    expect(workspaceMenu).toContain(
      "transform-gpu transition-transform duration-300 ease-out",
    );
    expect(workspaceMenu).toContain(
      "transform-gpu transition-transform duration-200 ease-in",
    );
    expect(workspaceMenu).toContain("will-change-transform");
    expect(workspaceMenu).toContain("shadow-floating");
    expect(workspaceMenu).toContain('enterFrom="translate-x-full"');
    expect(workspaceMenu).toContain('enterTo="translate-x-0"');
    expect(workspaceMenu).toContain('leaveFrom="translate-x-0"');
    expect(workspaceMenu).toContain('leaveTo="translate-x-full"');
    expect(workspaceMenu).not.toContain("calc(100vw-16px)");
    expect(workspaceMenu).not.toContain("data-closed:translate-x-full");
    expect(workspaceMenu).toContain("env(safe-area-inset-bottom)");
    expect(workspaceMenu).toContain("data-profile-menu-panel");
  });

  it("keeps the workspace desktop popover constrained and visually unchanged", () => {
    const workspaceMenu = read("src/components/headers/UserProfileMenu.js");

    expect(workspaceMenu).toContain("max-h-[calc(100dvh-132px)]");
    expect(workspaceMenu).toContain("w-[min(340px,calc(100vw-20px))]");
    expect(workspaceMenu).toContain("rounded-[22px] border border-line");
    expect(workspaceMenu).toContain("bg-surface-raised");
    expect(workspaceMenu).toContain("flex-col");
    expect(workspaceMenu).not.toContain("bg-brand-offset");
  });

  it("routes customers into their existing responsive drawer", () => {
    const customerActions = read("src/components/headers/DesktopActions.js");
    const customerDrawer = read(
      "src/components/headers/MobileUserActionsSheet.js",
    );

    expect(customerActions).toContain(
      "data-customer-portal-profile-drawer-trigger",
    );
    expect(customerActions).toContain('aria-haspopup="dialog"');
    expect(customerActions).toContain("userActionsControls");
    expect(customerActions).not.toContain("data-customer-portal-profile-menu");

    expect(customerDrawer).toContain("data-customer-portal-profile-drawer");
    expect(customerDrawer).toContain('data-dialog-layout="drawer"');
    expect(customerDrawer).toContain("sm:w-[min(420px,calc(100vw-32px))]");
  });

  it("gives the customer account drawer a viewport cap and internal scroll area", () => {
    const source = read("src/components/headers/MobileUserActionsSheet.js");

    expect(source).toContain("data-profile-menu-sheet");
    expect(source).toContain("data-customer-portal-profile-drawer");
    expect(source).toContain("max-h-[min(90dvh,760px)]");
    expect(source).toContain("sm:w-[min(420px,calc(100vw-32px))]");
    expect(source).toContain("min-h-0 flex-1 overflow-hidden");
    expect(source).toMatch(/isCustomerPortal\s*\?\s*""/);
  });

  it("coordinates profile overlays while hiding the scrollbar chrome", () => {
    const styles = read("src/styles/globals.css");
    const concierge = read("src/components/ai/ConciergeWidget.js");

    expect(styles).toContain("body:has([data-customer-portal-profile-sheet])");
    expect(styles).toContain("[data-customer-concierge-launcher]");
    expect(styles).toContain("visibility: hidden");
    expect(styles).toContain("pointer-events: none");
    expect(styles).toContain("@utility scrollbar-hidden");
    expect(styles).toContain("scrollbar-width: none");
    expect(styles).toContain("&::-webkit-scrollbar");
    expect(styles).toContain("display: none");
    expect(styles).not.toContain(
      "[data-customer-portal-profile-content] [data-profile-menu-scroll]",
    );
    expect(styles).not.toContain(
      "[data-profile-menu-scroll]::-webkit-scrollbar-thumb",
    );
    const content = read("src/components/headers/UserActionsMenuContent.js");
    expect(content).toContain(
      "scrollbar-hidden scroll-pb-3 px-3 py-2 sm:px-2.5 sm:py-1.5",
    );
    expect(concierge).toContain("transition-[opacity,transform,border-color]");
  });
});
