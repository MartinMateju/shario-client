import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key) => {
    const labels = {
      sidebarLabel: "Studio management",
      closeNavigation: "Close dashboard navigation",
    };

    return labels[key] || key;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/app",
}));

vi.mock("@headlessui/react", () => ({
  Dialog: ({ children, open, ...props }) =>
    open ? (
      <div data-testid="mobile-dialog" {...props}>
        {children}
      </div>
    ) : null,
  DialogBackdrop: (props) => <div {...props} />,
  DialogPanel: ({ children, ...props }) => <div {...props}>{children}</div>,
  DialogTitle: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
}));

vi.mock("@/components/dashboard/DashboardSidebar", () => ({
  default: ({ mobile, onNavigate, canUseSetupCenter, launchCenterStatus }) => (
    <button
      type="button"
      onClick={onNavigate}
      data-can-use-setup-center={canUseSetupCenter ? "true" : "false"}
      data-launch-center-status={launchCenterStatus?.status}
      data-launch-center-completed={launchCenterStatus?.completed}
      data-launch-center-total={launchCenterStatus?.total}
      data-mobile-sidebar={mobile ? "true" : "false"}
    >
      {mobile ? "Open mobile destination" : "Open desktop destination"}
    </button>
  ),
}));

import DashboardMobileSidebar from "@/components/dashboard/DashboardMobileSidebar";

describe("DashboardMobileSidebar", () => {
  it("closes after a destination is selected", () => {
    const onClose = vi.fn();

    render(<DashboardMobileSidebar open onClose={onClose} />);
    onClose.mockClear();

    fireEvent.click(
      screen.getByRole("button", { name: "Open mobile destination" }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the explicit close control available", () => {
    const onClose = vi.fn();

    render(<DashboardMobileSidebar open onClose={onClose} />);
    onClose.mockClear();

    fireEvent.click(
      screen.getByRole("button", { name: "Close dashboard navigation" }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("forwards the complete Launch Center status into the drawer", () => {
    render(
      <DashboardMobileSidebar
        open
        onClose={vi.fn()}
        canUseSetupCenter
        launchCenterStatus={{
          status: "attention",
          completed: 5,
          total: 5,
          issueCount: 1,
        }}
      />,
    );

    const navigation = screen.getByRole("button", {
      name: "Open mobile destination",
    });

    expect(navigation).toHaveAttribute("data-can-use-setup-center", "true");
    expect(navigation).toHaveAttribute(
      "data-launch-center-status",
      "attention",
    );
    expect(navigation).toHaveAttribute("data-launch-center-completed", "5");
    expect(navigation).toHaveAttribute("data-launch-center-total", "5");
    expect(navigation).toHaveAttribute("data-mobile-sidebar", "true");
    expect(
      screen.queryByRole("button", { name: /studio navigation/i }),
    ).not.toBeInTheDocument();
  });

  it("respects mobile safe areas without widening beyond the viewport", () => {
    render(<DashboardMobileSidebar open onClose={vi.fn()} />);

    const panel = document.getElementById("workspace-mobile-navigation");
    const backdrop = screen.getByTestId("mobile-dialog").firstChild;
    const closeButton = screen.getByRole("button", {
      name: "Close dashboard navigation",
    });

    expect(screen.getByTestId("mobile-dialog")).toHaveAttribute(
      "data-skab-workspace-surface",
    );
    expect(panel).toHaveClass(
      "w-full",
      "max-w-[320px]",
      "pt-[env(safe-area-inset-top)]",
      "pb-[env(safe-area-inset-bottom)]",
    );
    expect(closeButton).toHaveClass(
      "top-[calc(0.875rem+env(safe-area-inset-top))]",
      "h-11",
      "w-11",
      "touch-manipulation",
      "active:scale-[0.97]",
    );
    expect(backdrop).toHaveClass("motion-reduce:transition-none");
  });
});
