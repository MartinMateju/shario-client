import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import WorkspaceTabs, {
  WorkspaceTabPanel,
  getWorkspaceTabId,
  getWorkspaceTabPanelId,
} from "@/components/dashboard/WorkspaceTabs";
import {
  getHorizontalRevealScrollLeft,
  revealElementHorizontally,
} from "@/components/ui/horizontalScroll";

const TestIcon = (props) => <svg data-testid="test-icon" {...props} />;

function TabsFixture({
  activationMode = "manual",
  initialValue = "overview",
  onChange = vi.fn(),
  tabs = [
    { id: "overview", label: "Overview", icon: TestIcon },
    { id: "bookings", label: "Bookings", badge: 3 },
    { id: "settings", label: "Settings" },
  ],
}) {
  const [value, setValue] = useState(initialValue);

  const handleChange = (nextValue) => {
    onChange(nextValue);
    setValue(nextValue);
  };

  return (
    <>
      <WorkspaceTabs
        id="studio-sections"
        tabs={tabs}
        value={value}
        onChange={handleChange}
        ariaLabel="Studio sections"
        activationMode={activationMode}
      />
      {tabs.map((tab) => (
        <WorkspaceTabPanel
          key={tab.id}
          tabsId="studio-sections"
          tabId={tab.id}
          active={tab.id === value}
        >
          {tab.label} panel
        </WorkspaceTabPanel>
      ))}
    </>
  );
}

describe("WorkspaceTabs", () => {
  it("connects tabs and panels with stable accessible ids", () => {
    render(<TabsFixture />);

    const tablist = screen.getByRole("tablist", {
      name: "Studio sections",
    });
    const overview = screen.getByRole("tab", { name: "Overview" });
    const panel = screen.getByRole("tabpanel", { name: "Overview" });

    expect(tablist).toHaveAttribute("aria-orientation", "horizontal");
    expect(overview).toHaveAttribute(
      "id",
      getWorkspaceTabId("studio-sections", "overview"),
    );
    expect(overview).toHaveAttribute(
      "aria-controls",
      getWorkspaceTabPanelId("studio-sections", "overview"),
    );
    expect(panel).toHaveAttribute(
      "aria-labelledby",
      getWorkspaceTabId("studio-sections", "overview"),
    );
    expect(overview).toHaveAttribute("aria-selected", "true");
    expect(overview).toHaveAttribute("tabindex", "0");
    expect(overview).toHaveClass("motion-reduce:transition-none");
    expect(screen.getByTestId("test-icon")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByText("3")).toBeVisible();
  });

  it("uses manual activation while moving focus with the keyboard", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TabsFixture onChange={onChange} />);

    const overview = screen.getByRole("tab", { name: "Overview" });
    const bookings = screen.getByRole("tab", { name: /Bookings/ });

    overview.focus();
    await user.keyboard("{ArrowRight}");

    expect(bookings).toHaveFocus();
    expect(overview).toHaveAttribute("aria-selected", "true");
    expect(onChange).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("bookings");
    expect(bookings).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: /Bookings/ })).toBeVisible();
  });

  it("wraps focus and skips disabled tabs", async () => {
    const user = userEvent.setup();
    render(
      <TabsFixture
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "bookings", label: "Bookings", disabled: true },
          { id: "settings", label: "Settings" },
        ]}
      />,
    );

    const overview = screen.getByRole("tab", { name: "Overview" });
    const settings = screen.getByRole("tab", { name: "Settings" });

    overview.focus();
    await user.keyboard("{ArrowLeft}");
    expect(settings).toHaveFocus();

    await user.keyboard("{Home}");
    expect(overview).toHaveFocus();

    await user.keyboard("{End}");
    expect(settings).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(overview).toHaveFocus();
  });

  it("supports automatic activation when a lightweight screen opts in", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TabsFixture activationMode="automatic" onChange={onChange} />);

    screen.getByRole("tab", { name: "Overview" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith("bookings");
    expect(screen.getByRole("tab", { name: /Bookings/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("renders the responsive card variant without changing tab semantics", () => {
    render(
      <WorkspaceTabs
        id="catalog"
        variant="cards"
        tabs={[
          {
            id: "access",
            label: "Studio Access",
            description: "Bookable studio time",
            badge: 2,
            icon: TestIcon,
            iconClass: "bg-cobalt-50 text-cobalt-600",
          },
          { id: "classes", label: "Classes", badge: 4 },
        ]}
        value="access"
        onChange={vi.fn()}
        ariaLabel="Catalog"
      />,
    );

    const tablist = screen.getByRole("tablist", { name: "Catalog" });
    const access = screen.getByRole("tab", { name: /Studio Access/ });

    expect(tablist).toHaveClass("grid-cols-2", "lg:grid-cols-4");
    expect(access).toHaveAttribute("aria-selected", "true");
    expect(access).toHaveClass("border-cobalt-200");
    expect(screen.getByText("Bookable studio time")).toBeVisible();
    expect(screen.getByText("2")).toBeVisible();
  });

  it("sanitizes caller-provided ids", () => {
    expect(getWorkspaceTabId("Reports: Q3", "Sales / VAT")).toBe(
      "Reports-Q3-tab-Sales-VAT",
    );
    expect(getWorkspaceTabPanelId("Reports: Q3", "Sales / VAT")).toBe(
      "Reports-Q3-panel-Sales-VAT",
    );
  });

  it("keeps a late active tab selected without scrolling the page", () => {
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    render(<TabsFixture initialValue="settings" />);

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("calculates horizontal-only reveal positions for clipped tabs", () => {
    expect(
      getHorizontalRevealScrollLeft({
        clientWidth: 240,
        scrollWidth: 720,
        scrollLeft: 0,
        itemOffsetLeft: 510,
        itemWidth: 110,
        padding: 16,
      }),
    ).toBe(396);

    expect(
      getHorizontalRevealScrollLeft({
        clientWidth: 240,
        scrollWidth: 720,
        scrollLeft: 396,
        itemOffsetLeft: 410,
        itemWidth: 100,
        padding: 16,
      }),
    ).toBe(394);
  });

  it("changes only the rail's horizontal scroll position", () => {
    const scroller = {
      clientWidth: 240,
      scrollWidth: 720,
      scrollLeft: 0,
      getBoundingClientRect: () => ({ left: 100 }),
    };
    const item = {
      offsetWidth: 110,
      getBoundingClientRect: () => ({ left: 610, width: 110 }),
    };

    expect(revealElementHorizontally(scroller, item, 16)).toBe(true);
    expect(scroller.scrollLeft).toBe(396);
  });
});
