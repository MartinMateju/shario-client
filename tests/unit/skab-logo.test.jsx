import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SkabLogo from "@/components/brand/SkabLogo";

describe("Shario logo", () => {
  it("keeps a single accessible brand name across full and compact variants", () => {
    const { rerender } = render(<SkabLogo />);
    const logo = screen.getByRole("img", { name: "Shario" });
    expect(logo.querySelector("img")).toHaveAttribute(
      "src",
      "/brand/shario-primary.svg",
    );
    expect(logo.querySelector("img")).toHaveAttribute("alt", "");
    rerender(<SkabLogo variant="compact" />);
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(
      screen.getByRole("img", { name: "Shario" }).querySelector("img"),
    ).toHaveAttribute("src", "/brand/shario-app-icon.svg");
  });
});
