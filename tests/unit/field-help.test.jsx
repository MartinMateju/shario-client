import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import FieldHelp from "@/components/ui/form/FieldHelp";

describe("FieldHelp", () => {
  it("opens from an accessible button and closes with Escape", async () => {
    const user = userEvent.setup();

    render(
      <FieldHelp label="Explain studio capacity">
        Capacity is the number of people who may be present at the same time.
      </FieldHelp>,
    );

    const trigger = screen.getByRole("button", {
      name: "Explain studio capacity",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByText(/number of people who may be present/),
    ).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(/number of people who may be present/),
    ).toBeVisible();

    await user.keyboard("{Escape}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("supports an explanatory text trigger without changing its popover behavior", async () => {
    const user = userEvent.setup();

    render(
      <FieldHelp
        label="Why configure activities?"
        triggerText="Why configure activities?"
      >
        Activities protect limited studio equipment.
      </FieldHelp>,
    );

    await user.click(
      screen.getByRole("button", { name: "Why configure activities?" }),
    );

    expect(
      screen.getByText("Activities protect limited studio equipment."),
    ).toBeVisible();
  });
});
