import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BrushStrokeEdge from "@/components/decorations/BrushStrokeEdge";

describe("BrushStrokeEdge", () => {
  it("renders a non-interactive clipped gradient wash", () => {
    render(<BrushStrokeEdge className="right-0" />);

    const decoration = screen.getByTestId("brush-edge");
    const wash = decoration.querySelector('[data-edge-wash="primary"]');
    const shape = decoration.querySelector('[data-edge-wash="shape"]');

    expect(decoration).toHaveAttribute("aria-hidden", "true");
    expect(decoration).toHaveAttribute(
      "data-decoration",
      "cobalt-ambient-edge",
    );
    expect(decoration).toHaveAttribute("data-brush-style", "soft-gradient");
    expect(decoration).toHaveClass(
      "pointer-events-none",
      "overflow-hidden",
      "select-none",
      "right-0",
    );
    expect(wash).toBeInTheDocument();
    expect(wash).toHaveClass("blur-[28px]");
    expect(shape).toBeInTheDocument();
    expect(shape.style.clipPath).toMatch(/^polygon\(/);
    expect(shape.style.backgroundImage).toContain("linear-gradient(to left");
    expect(shape.style.backgroundImage).toContain("var(--skab-blue-rgb)");
    expect(decoration.querySelector("svg")).not.toBeInTheDocument();
    expect(decoration.querySelector("filter")).not.toBeInTheDocument();
    expect(decoration.querySelector("animate")).not.toBeInTheDocument();
    expect(decoration.getAttribute("class")).not.toMatch(/animate|transition/);
  });

  it("supports the mirrored coral edge treatment", () => {
    render(<BrushStrokeEdge tone="coral" side="left" />);

    const decoration = screen.getByTestId("brush-edge");
    const shape = decoration.querySelector('[data-edge-wash="shape"]');

    expect(decoration).toHaveAttribute("data-decoration", "coral-ambient-edge");
    expect(decoration).toHaveClass("-scale-x-100");
    expect(shape.style.backgroundImage).toContain("var(--skab-coral-rgb)");
    expect(shape.style.backgroundImage).not.toContain("var(--skab-blue-rgb)");
  });

  it("supports the softer peach treatment on saturated surfaces", () => {
    render(<BrushStrokeEdge tone="peach" />);

    const decoration = screen.getByTestId("brush-edge");
    const shape = decoration.querySelector('[data-edge-wash="shape"]');

    expect(decoration).toHaveAttribute("data-decoration", "peach-ambient-edge");
    expect(shape.style.backgroundImage).toContain("rgba(245, 185, 170");
    expect(shape.style.backgroundImage).not.toContain("var(--skab-blue-rgb)");
  });

  it("falls back to the cobalt treatment for an unknown tone", () => {
    render(<BrushStrokeEdge tone="unknown" />);

    const decoration = screen.getByTestId("brush-edge");
    const shape = decoration.querySelector('[data-edge-wash="shape"]');

    expect(decoration).toHaveAttribute(
      "data-decoration",
      "cobalt-ambient-edge",
    );
    expect(shape.style.backgroundImage).toContain("var(--skab-blue-rgb)");
  });
});
