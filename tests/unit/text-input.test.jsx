import { describe, expect, it } from "vitest";

import TextInput from "@/components/forms/TextInput";
import { renderWithProviders, screen } from "@/test/test-utils";

describe("TextInput", () => {
  it("associates its label, required state, helper text, and error", () => {
    renderWithProviders(
      <TextInput
        label="E-mail"
        type="email"
        required
        helperText="Use your studio address."
        error="Enter a valid address."
      />,
    );

    const input = screen.getByRole("textbox", { name: /e-mail/i });
    const helper = screen.getByText("Use your studio address.");
    const error = screen.getByText("Enter a valid address.");

    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute(
      "aria-describedby",
      `${helper.id} ${error.id}`,
    );
  });
});
