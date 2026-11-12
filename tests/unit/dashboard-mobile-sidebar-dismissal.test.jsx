import { useCallback, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key) =>
    ({
      sidebarLabel: "Studio management",
      closeNavigation: "Close dashboard navigation",
    })[key] || key,
}));

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/app/setup" }));

vi.mock("@/components/dashboard/DashboardSidebar", () => ({
  default: ({ onNavigate }) => (
    <button onClick={onNavigate}>Open Launch Center</button>
  ),
}));

import DashboardMobileSidebar from "@/components/dashboard/DashboardMobileSidebar";

function NavigationHarness() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button aria-expanded={open} onClick={() => setOpen(true)}>
        Open navigation
      </button>
      <DashboardMobileSidebar open={open} onClose={close} />
    </>
  );
}

describe("mobile navigation dismissal with the real Headless UI dialog", () => {
  it("removes an entering drawer after one Escape and can reopen without trapping the page", async () => {
    const { container } = render(<NavigationHarness />);
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", {
      name: "Studio management",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(container).toHaveAttribute("aria-hidden", "true");

    // Close immediately after opening, without waiting out the drawer's
    // entrance. The controlled state must also remove the modal and focus trap.
    fireEvent.keyDown(window, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(container).not.toHaveAttribute("aria-hidden");
    await waitFor(() => expect(trigger).toHaveFocus());

    fireEvent.click(trigger);
    await screen.findByRole("dialog", { name: "Studio management" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.click(
      screen.getByRole("button", { name: "Close dashboard navigation" }),
    );
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(container).not.toHaveAttribute("aria-hidden");
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
