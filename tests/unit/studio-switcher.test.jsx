import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  activeStudioId: "507f1f77bcf86cd799439011",
  dispatch: vi.fn(),
}));

const labels = {
  changeStudio: "Change studio",
  plan: "Plan: {plan}",
  "studioSwitcher.unnamedStudio": "Unnamed studio",
  "studioSwitcher.yourStudios": "Your studios",
  "studioSwitcher.selected": "Selected",
  "studioSwitcher.addNewStudio": "Add new studio",
  "studioSwitcher.addNewStudioDescription": "Create another studio",
  "studioSwitcher.loadError": "We couldn’t load your studios",
  "studioSwitcher.loadErrorDescription": "Check your connection and try again.",
  "studioSwitcher.retry": "Try again",
};

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key, values = {}) =>
      (labels[key] || key).replace(
        /\{(\w+)\}/g,
        (_, name) => values[name] ?? `{${name}}`,
      ),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: () => mocks.activeStudioId,
}));

import StudioSwitcher from "@/components/dashboard/StudioSwitcher";

describe("StudioSwitcher responsive presentation", () => {
  beforeEach(() => {
    mocks.activeStudioId = "507f1f77bcf86cd799439011";
    mocks.dispatch.mockClear();
  });

  it("keeps a long active studio name readable without growing the header", () => {
    const longName =
      "Studio Olivka Ceramics and Community Workshop in Central Brno";

    render(
      <StudioSwitcher
        variant="topbar"
        tenantId="507f191e810c19729de860ea"
        planLabel="Professional"
        studios={[
          {
            _id: mocks.activeStudioId,
            name: longName,
            address: {
              line1: "Very Long Street Name 108",
              postalCode: "602 00",
              city: "Brno",
            },
          },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: `Change studio: ${longName}`,
    });
    const visibleName = within(trigger).getByText(longName);

    expect(trigger).toHaveClass(
      "h-12",
      "w-full",
      "min-w-0",
      "bg-surface-raised",
      "rounded-[18px]",
      "shadow-[0_3px_12px_rgb(32_40_36/0.06)]",
      "focus-visible:ring-offset-surface-panel",
    );
    expect(visibleName).toHaveClass("truncate", "text-[13px]");
    expect(visibleName).toHaveAttribute("title", longName);
    expect(within(trigger).getByText("SO")).toHaveClass(
      "bg-[var(--studio-soft)]",
      "rounded-[12px]",
      "text-[var(--studio-ink)]",
    );
    expect(
      within(trigger).getByText("Very Long Street Name 108, 602 00 Brno"),
    ).toHaveClass("truncate", "text-[var(--studio-muted)]");
  });

  it("uses the shared cobalt selected state inside the studio menu", async () => {
    const longName =
      "The Pottery House and Community Ceramics Workshop in Central Brno";

    render(
      <StudioSwitcher
        variant="topbar"
        tenantId="507f191e810c19729de860ea"
        studios={[
          {
            _id: mocks.activeStudioId,
            name: longName,
          },
          {
            _id: "507f1f77bcf86cd799439012",
            name: "North Workshop",
          },
        ]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: `Change studio: ${longName}`,
      }),
    );

    const activeStudio = await screen.findByRole("menuitem", {
      name: new RegExp(longName),
    });

    expect(activeStudio).toHaveAttribute("aria-current", "true");
    expect(activeStudio).toHaveClass(
      "bg-[var(--color-primary-soft)]",
      "ring-[var(--studio-rule)]",
      "data-focus:ring-[var(--studio-blue)]",
    );
    expect(within(activeStudio).getByText(longName)).toHaveClass(
      "break-words",
      "leading-4",
    );
    expect(within(activeStudio).getByText(longName)).not.toHaveClass(
      "truncate",
    );
    expect(within(activeStudio).getByText(longName)).toHaveAttribute(
      "title",
      longName,
    );
    expect(activeStudio.closest('[role="menu"]')).toHaveAttribute(
      "data-skab-workspace-surface",
    );
    expect(activeStudio.closest('[role="menu"]')).toHaveClass(
      "bg-surface-raised",
      "w-[min(380px,calc(100vw-24px))]",
      "min-w-[var(--button-width)]",
      "motion-reduce:transform-none",
      "motion-reduce:transition-none",
    );
  });

  it("stops decorative loading pulses when reduced motion is requested", () => {
    const { container } = render(
      <StudioSwitcher
        isLoading
        variant="topbar"
        tenantId="507f191e810c19729de860ea"
      />,
    );

    expect(container.querySelector(".animate-pulse")).toHaveClass(
      "motion-reduce:animate-none",
    );
  });

  it("keeps the mobile error retry action at least 44px tall", () => {
    const onRetry = vi.fn();

    render(
      <StudioSwitcher
        isError
        mobile
        tenantId="507f191e810c19729de860ea"
        onRetry={onRetry}
      />,
    );

    const retry = screen.getByRole("button", { name: "Try again" });

    expect(retry).toHaveClass("min-h-11", "touch-manipulation");
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
