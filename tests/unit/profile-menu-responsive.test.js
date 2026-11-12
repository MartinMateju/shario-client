import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path) =>
  readFileSync(resolve(process.cwd(), "src/components/headers", path), "utf8");

describe("profile overlay short-height containment", () => {
  it("keeps the workspace desktop popover inside the dynamic viewport", () => {
    const dashboardMenu = read("UserProfileMenu.js");
    const content = read("UserActionsMenuContent.js");

    expect(dashboardMenu).toContain("relative hidden xl:block");
    expect(dashboardMenu).toContain("max-h-[calc(100dvh-132px)]");
    expect(dashboardMenu).toContain("flex-col");
    expect(content).toContain("overflow-y-auto");
    expect(content).toContain("overscroll-contain");
    expect(content).toContain("data-profile-menu-footer");
    expect(content).toContain("isAdminRoute && hasPublicWorkspace");
  });

  it("uses a full-height right drawer for the compact workspace header", () => {
    const dashboardMenu = read("UserProfileMenu.js");
    const content = read("UserActionsMenuContent.js");

    expect(dashboardMenu).toContain("data-workspace-profile-drawer-trigger");
    expect(dashboardMenu).toContain(
      'aria-haspopup={dialogId ? "dialog" : undefined}',
    );
    expect(dashboardMenu).toContain("data-profile-menu-drawer");
    expect(dashboardMenu).toContain('data-dialog-layout="drawer"');
    expect(dashboardMenu).toContain('className="relative z-[110] xl:hidden"');
    expect(dashboardMenu).toContain("h-dvh");
    expect(dashboardMenu).toContain("w-full max-w-[320px]");
    expect(dashboardMenu).toContain(
      "<Transition show={mobileMenuOpen} as={Fragment}>",
    );
    expect(dashboardMenu).toContain("<TransitionChild");
    expect(dashboardMenu).toContain("transform-gpu");
    expect(dashboardMenu).toContain(
      "transform-gpu transition-transform duration-300 ease-out",
    );
    expect(dashboardMenu).toContain(
      "transform-gpu transition-transform duration-200 ease-in",
    );
    expect(dashboardMenu).toContain("will-change-transform");
    expect(dashboardMenu).toContain("shadow-floating");
    expect(dashboardMenu).toContain("backdrop-blur-[2px]");
    expect(dashboardMenu).toContain('enterFrom="translate-x-full"');
    expect(dashboardMenu).toContain('enterTo="translate-x-0"');
    expect(dashboardMenu).toContain('leaveFrom="translate-x-0"');
    expect(dashboardMenu).toContain('leaveTo="translate-x-full"');
    expect(dashboardMenu).not.toContain("calc(100vw-16px)");
    expect(dashboardMenu).not.toContain("data-closed:translate-x-full");
    expect(dashboardMenu).toContain("env(safe-area-inset-bottom)");
    expect(dashboardMenu).toContain('window.matchMedia("(min-width: 1280px)")');
    expect(dashboardMenu).toContain("data-autofocus");
    expect(content).toContain("min-h-0 flex-1 overflow-y-auto");
    expect(content).toContain("overscroll-contain");
  });

  it("keeps the responsive customer drawer fixed while actions scroll above the safe area", () => {
    const customerActions = read("DesktopActions.js");
    const sheet = read("MobileUserActionsSheet.js");
    const content = read("UserActionsMenuContent.js");

    expect(customerActions).toContain(
      "data-customer-portal-profile-drawer-trigger",
    );
    expect(sheet).toContain("max-h-[min(90dvh,760px)]");
    expect(sheet).toContain("sm:translate-x-full");
    expect(sheet).toContain("sm:w-[min(420px,calc(100vw-32px))]");
    expect(sheet).toContain("shrink-0 items-center");
    expect(sheet).toContain("env(safe-area-inset-bottom)");
    expect(sheet).toMatch(/isCustomerPortal\s*\?\s*""/);
    expect(content).toContain("min-h-0 flex-1 overflow-y-auto");
    expect(content).toContain("overscroll-contain");
    expect(content).toContain(
      "scrollbar-hidden scroll-pb-3 px-3 py-2 sm:px-2.5 sm:py-1.5",
    );
  });

  it("uses an avatar-only trigger with 44px mobile and 48px desktop targets", () => {
    const dashboardMenu = read("UserProfileMenu.js");

    expect(dashboardMenu).toContain(
      "h-11 w-11 touch-manipulation justify-center border",
    );
    expect(dashboardMenu).toContain("md:h-12 md:w-12");
    expect(dashboardMenu).toContain("touch-manipulation");
    expect(dashboardMenu).toContain("active:scale-[0.97]");
    expect(dashboardMenu).toContain("md:hover:-translate-y-0.5");
    expect(dashboardMenu).toContain("open");
    expect(dashboardMenu).toContain(
      "border-cobalt-200 bg-surface-raised ring-1 ring-inset ring-cobalt-100",
    );
    expect(dashboardMenu).toContain("border-line bg-surface-raised/90");
    expect(dashboardMenu).toContain("!isDashboardVariant ?");
    expect(dashboardMenu).toContain("group/topbar-action relative");
    expect(dashboardMenu).toContain(
      "<UtilityTooltip>{menuLabel}</UtilityTooltip>",
    );
    expect(dashboardMenu).not.toContain(
      'title={isDashboardVariant ? t("account.menu") : undefined}',
    );
  });
});
