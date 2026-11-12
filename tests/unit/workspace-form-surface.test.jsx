import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  WorkspaceFormActions,
  WorkspaceFormSection,
  workspaceInputClass,
  workspaceLabelClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
  workspaceTextareaClass,
} from "@/components/dashboard/WorkspaceFormSurface";

describe("WorkspaceFormSurface", () => {
  it("groups related fields in the shared section hierarchy", () => {
    render(
      <WorkspaceFormSection
        as="fieldset"
        title="Piece details"
        description="Information used to calculate the price."
        className="section-override"
        data-testid="section"
      >
        <label className={workspaceLabelClass} htmlFor="piece-name">
          Name
        </label>
        <input id="piece-name" className={workspaceInputClass} />
      </WorkspaceFormSection>,
    );

    const section = screen.getByTestId("section");
    const input = screen.getByLabelText("Name");

    expect(section.tagName).toBe("FIELDSET");
    expect(section).toHaveClass(
      "rounded-[20px]",
      "border-line",
      "shadow-xs",
      "section-override",
    );
    expect(screen.getByRole("heading", { name: "Piece details" })).toHaveClass(
      "text-[13px]",
      "font-semibold",
      "text-ink",
    );
    expect(
      screen.getByText("Information used to calculate the price."),
    ).toHaveClass("text-[11px]", "text-ink-muted");
    expect(input).toHaveClass(
      "min-h-12",
      "w-full",
      "rounded-[14px]",
      "text-base",
      "sm:text-[13px]",
      "focus:border-cobalt-500",
      "aria-invalid:border-danger",
    );
  });

  it("keeps modal actions visible and makes both actions easy to tap on mobile", () => {
    render(
      <WorkspaceFormActions className="actions-override">
        <button type="button" className={workspaceSecondaryButtonClass}>
          Cancel
        </button>
        <button type="submit" className={workspacePrimaryButtonClass}>
          Save profile
        </button>
      </WorkspaceFormActions>,
    );

    const actions = screen.getByText("Cancel").closest("footer");
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const submit = screen.getByRole("button", { name: "Save profile" });

    expect(actions).toHaveClass(
      "sticky",
      "bottom-0",
      "flex-col-reverse",
      "pb-[calc(1rem+env(safe-area-inset-bottom))]",
      "sm:flex-row",
      "actions-override",
    );
    expect(cancel).toHaveClass(
      "min-h-12",
      "w-full",
      "rounded-full",
      "text-[13px]",
      "sm:min-h-11",
      "sm:w-auto",
    );
    expect(submit).toHaveClass(
      "min-h-12",
      "w-full",
      "rounded-full",
      "bg-cobalt-500",
      "text-[13px]",
      "sm:min-h-11",
      "sm:w-auto",
    );
  });

  it("exports matching label, input and textarea states for bespoke forms", () => {
    expect(workspaceLabelClass).toContain("text-[12px]");
    expect(workspaceLabelClass).toContain("text-ink-soft");
    expect(workspaceInputClass).toContain("disabled:cursor-not-allowed");
    expect(workspaceInputClass).toContain("aria-invalid:border-danger");
    expect(workspaceTextareaClass).toContain(workspaceInputClass);
    expect(workspaceTextareaClass).toContain("min-h-[112px]");
    expect(workspaceTextareaClass).toContain("resize-y");
  });
});
