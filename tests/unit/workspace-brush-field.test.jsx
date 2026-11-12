import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import WorkspaceBrushField from "@/components/decorations/WorkspaceBrushField";
import {
  WORKSPACE_BRUSH_PRESETS,
  WORKSPACE_BRUSH_TEXTURES,
} from "@/components/decorations/WorkspaceBrushField.config";

describe("WorkspaceBrushField", () => {
  it("renders a clipped, non-interactive field with genuine WebP masks", () => {
    const { container } = render(
      <WorkspaceBrushField className="custom-field" variant="overviewHero" />,
    );
    const field = container.querySelector(
      '[data-workspace-brush-field="overviewHero"]',
    );
    const brushes = container.querySelectorAll("[data-workspace-brush]");

    expect(field).toHaveAttribute("aria-hidden", "true");
    expect(field).toHaveAttribute("data-workspace-brush-layer", "background");
    expect(field).toHaveClass(
      "pointer-events-none",
      "absolute",
      "inset-0",
      "z-0",
      "overflow-hidden",
      "custom-field",
    );
    expect(brushes).toHaveLength(2);
    expect([...brushes].map((brush) => brush.dataset.workspaceBrush)).toEqual([
      "arc",
      "diagonal",
    ]);
    expect(
      [...brushes].map((brush) => brush.dataset.workspaceBrushTone),
    ).toEqual(["coral", "cobalt"]);

    for (const brush of brushes) {
      expect(
        brush.style.getPropertyValue("--workspace-brush-mask-image"),
      ).toMatch(/\/images\/workspace\/brush-.*\.webp/);
      expect(
        brush.querySelector('[data-workspace-brush-mask="alpha-webp"]'),
      ).toBeInTheDocument();
    }
    expect(field.querySelector("svg")).not.toBeInTheDocument();
  });

  it("can place a non-interactive perimeter field above the page canvas", () => {
    const { container } = render(
      <WorkspaceBrushField layer="perimeter" variant="bookingShell" />,
    );
    const field = container.querySelector(
      '[data-workspace-brush-field="bookingShell"]',
    );

    expect(field).toHaveAttribute("aria-hidden", "true");
    expect(field).toHaveAttribute("data-workspace-brush-layer", "perimeter");
    expect(field).toHaveClass("pointer-events-none", "z-20");
    expect(field).not.toHaveClass("z-0");
  });

  it.each(Object.entries(WORKSPACE_BRUSH_PRESETS))(
    "renders the %s preset exactly as configured",
    (variant, preset) => {
      const { container, unmount } = render(
        <WorkspaceBrushField variant={variant} />,
      );
      const brushes = container.querySelectorAll("[data-workspace-brush]");

      expect(brushes).toHaveLength(preset.length);
      expect([...brushes].map((brush) => brush.dataset.workspaceBrush)).toEqual(
        preset.map(({ texture }) => texture),
      );

      for (const [index, brush] of [...brushes].entries()) {
        const texture = WORKSPACE_BRUSH_TEXTURES[preset[index].texture];

        expect(
          brush.style.getPropertyValue("--workspace-brush-aspect-ratio"),
        ).toBe(texture.aspect);
        expect(
          brush.style.getPropertyValue("--workspace-brush-mask-image"),
        ).toContain(texture.src);
      }

      unmount();
    },
  );

  it("renders nothing for an unknown preset", () => {
    const { container } = render(
      <>
        <WorkspaceBrushField variant="not-a-preset" />
        <WorkspaceBrushField variant="__proto__" />
      </>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
