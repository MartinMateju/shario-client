import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BrushStrokeSwash from "@/components/decorations/BrushStrokeSwash";
import {
  BRUSH_SWASH_TEXTURES,
  DEFAULT_BRUSH_SWASH_TEXTURE,
} from "@/components/decorations/BrushStrokeSwash.config";

describe("BrushStrokeSwash", () => {
  it("renders an accessible, non-interactive WebP brush mask", () => {
    render(<BrushStrokeSwash className="right-0" />);

    const decoration = screen.getByTestId("brush-swash");
    const mask = decoration.querySelector('[data-brush-mask="alpha-webp"]');

    expect(decoration).toHaveAttribute("aria-hidden", "true");
    expect(decoration).toHaveAttribute("data-decoration", "cobalt-brush-swash");
    expect(decoration).toHaveAttribute("data-brush-style", "textured-mask");
    expect(decoration).toHaveAttribute(
      "data-brush-texture",
      DEFAULT_BRUSH_SWASH_TEXTURE,
    );
    expect(decoration).toHaveAttribute(
      "data-brush-texture-src",
      BRUSH_SWASH_TEXTURES.loaded.src,
    );
    expect(decoration).toHaveClass(
      "pointer-events-none",
      "absolute",
      "select-none",
      "right-0",
    );
    expect(decoration).not.toHaveClass("aspect-[4/1]");
    expect(decoration.style.getPropertyValue("--brush-aspect-ratio")).toBe(
      BRUSH_SWASH_TEXTURES.loaded.aspect,
    );
    expect(decoration.style.getPropertyValue("--brush-mask-image")).toContain(
      BRUSH_SWASH_TEXTURES.loaded.src,
    );
    expect(decoration.style.getPropertyValue("--brush-rgb")).toBe("37 99 235");
    expect(mask).toBeInTheDocument();
    expect(decoration.querySelector("svg")).not.toBeInTheDocument();
    expect(decoration.getAttribute("class")).not.toMatch(/blur|animate/);
  });

  it.each(Object.entries(BRUSH_SWASH_TEXTURES))(
    "selects the %s texture and preserves its native aspect ratio",
    (texture, config) => {
      render(<BrushStrokeSwash texture={texture} />);

      const decoration = screen.getByTestId("brush-swash");

      expect(decoration).toHaveAttribute("data-brush-texture", texture);
      expect(decoration).toHaveAttribute("data-brush-texture-src", config.src);
      expect(decoration.style.getPropertyValue("--brush-aspect-ratio")).toBe(
        config.aspect,
      );
      expect(decoration.style.getPropertyValue("--brush-mask-image")).toContain(
        config.src,
      );
    },
  );

  it("mirrors the texture without changing the outer placement transform", () => {
    const { container } = render(
      <BrushStrokeSwash className="rotate-[9deg]" side="left" tone="coral" />,
    );

    const decoration = screen.getByTestId("brush-swash");
    const mask = container.querySelector('[data-brush-mask="alpha-webp"]');

    expect(decoration).toHaveAttribute("data-decoration", "coral-brush-swash");
    expect(decoration).toHaveClass("rotate-[9deg]");
    expect(decoration.style.getPropertyValue("--brush-rgb")).toBe("255 113 91");
    expect(mask.getAttribute("class")).toMatch(/flip/);
  });

  it("supports peach and sand, then safely falls back to cobalt", () => {
    const { rerender } = render(<BrushStrokeSwash tone="peach" />);

    expect(screen.getByTestId("brush-swash")).toHaveAttribute(
      "data-decoration",
      "peach-brush-swash",
    );
    expect(
      screen.getByTestId("brush-swash").style.getPropertyValue("--brush-rgb"),
    ).toBe("77 215 197");

    rerender(<BrushStrokeSwash tone="sand" />);

    expect(screen.getByTestId("brush-swash")).toHaveAttribute(
      "data-decoration",
      "sand-brush-swash",
    );
    expect(
      screen.getByTestId("brush-swash").style.getPropertyValue("--brush-rgb"),
    ).toBe("195 173 255");

    rerender(<BrushStrokeSwash tone="unknown" />);

    expect(screen.getByTestId("brush-swash")).toHaveAttribute(
      "data-decoration",
      "cobalt-brush-swash",
    );
  });

  it("supports a safe tenant color without changing the texture contract", () => {
    const { rerender } = render(
      <BrushStrokeSwash color="#4056D6" texture="rake" />,
    );

    const decoration = screen.getByTestId("brush-swash");

    expect(decoration).toHaveAttribute("data-decoration", "custom-brush-swash");
    expect(decoration.style.getPropertyValue("--brush-rgb")).toBe("64 86 214");
    expect(decoration).toHaveAttribute("data-brush-texture", "rake");

    rerender(<BrushStrokeSwash color="var(--unsafe-color)" tone="coral" />);

    expect(screen.getByTestId("brush-swash")).toHaveAttribute(
      "data-decoration",
      "coral-brush-swash",
    );
    expect(
      screen.getByTestId("brush-swash").style.getPropertyValue("--brush-rgb"),
    ).toBe("255 113 91");
  });

  it("falls back to the loaded texture for an unknown texture", () => {
    render(<BrushStrokeSwash texture="unknown" />);

    const decoration = screen.getByTestId("brush-swash");

    expect(decoration).toHaveAttribute(
      "data-brush-texture",
      DEFAULT_BRUSH_SWASH_TEXTURE,
    );
    expect(decoration).toHaveAttribute(
      "data-brush-texture-src",
      BRUSH_SWASH_TEXTURES.loaded.src,
    );
  });
});
