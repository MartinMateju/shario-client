import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key, values) =>
    ({
      eyebrow: "Customer portal",
      title: "Which studio would you like to visit?",
      description: "Choose a studio.",
      unavailable: "The studio from this link is not currently available.",
      unavailableHint: "Choose another studio below.",
      open: `Open ${values?.studio || "studio"}`,
    })[key] || key,
}));

import PortalLocationChooser from "@/components/customer-shell/PortalLocationChooser";

const locations = [
  {
    id: "64b000000000000000000001",
    name: "Studio Emilka",
    address: { line1: "Clay Street 1", city: "Brno" },
  },
  {
    id: "64b000000000000000000002",
    name: "Studio Olivka",
    address: { line1: "Clay Street 2", city: "Brno" },
  },
];

describe("portal location chooser", () => {
  it("shows every available studio and selects the requested card", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<PortalLocationChooser locations={locations} onSelect={onSelect} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Which studio would you like to visit?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Studio Emilka")).toBeVisible();
    expect(screen.getByText("Studio Olivka")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Open Studio Olivka" }),
    );

    expect(onSelect).toHaveBeenCalledWith("64b000000000000000000002");
  });

  it("explains an invalid or deactivated studio link without falling back", () => {
    render(
      <PortalLocationChooser
        locations={locations}
        reason="unavailable"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Choose another studio below.",
    );
    expect(
      screen.getByText("The studio from this link is not currently available."),
    ).toBeVisible();
  });
});
