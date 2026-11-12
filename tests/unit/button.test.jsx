import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/buttons/Button";
import { renderWithProviders, screen } from "@/test/test-utils";

describe("Button", () => {
  it("supports accessible interaction through the shared test providers", async () => {
    const onClick = vi.fn();
    const { user } = renderWithProviders(
      <Button onClick={onClick}>Create booking</Button>,
    );

    const button = screen.getByRole("button", { name: "Create booking" });
    await user.click(button);

    expect(onClick).toHaveBeenCalledOnce();
    expect(button).toBeEnabled();
  });

  it("announces loading state and prevents duplicate interaction", async () => {
    const onClick = vi.fn();
    const { user } = renderWithProviders(
      <Button loading onClick={onClick}>
        Save invoice
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save invoice" });
    await user.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveClass(
      "motion-reduce:transform-none",
      "motion-reduce:transition-none",
    );
    expect(button.querySelector(".animate-spin")).toHaveClass(
      "motion-reduce:animate-none",
    );
    expect(onClick).not.toHaveBeenCalled();
  });
});
