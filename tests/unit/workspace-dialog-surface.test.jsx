import { Dialog, DialogTitle } from "@headlessui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogBody,
  WorkspaceDialogFooter,
  WorkspaceDialogHeader,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";

describe("WorkspaceDialogSurface", () => {
  it("renders a large, mobile-full-screen form dialog with a constrained desktop size", () => {
    render(
      <Dialog open onClose={vi.fn()}>
        <WorkspaceDialogBackdrop data-testid="backdrop" />
        <WorkspaceDialogViewport data-testid="viewport">
          <WorkspaceDialogPanel size="xlarge" data-testid="panel">
            <DialogTitle>Profile editor</DialogTitle>
            <form aria-label="Profile form">
              <input aria-label="Profile name" />
            </form>
          </WorkspaceDialogPanel>
        </WorkspaceDialogViewport>
      </Dialog>,
    );

    const backdrop = screen.getByTestId("backdrop");
    const viewport = screen.getByTestId("viewport");
    const dialog = screen.getByRole("dialog", { name: "Profile editor" });
    const panel = screen.getByTestId("panel");

    expect(backdrop).toHaveClass(
      "fixed",
      "inset-0",
      "backdrop-blur-[3px]",
      "data-closed:opacity-0",
    );
    expect(viewport).toHaveClass(
      "flex",
      "min-h-full",
      "items-stretch",
      "sm:items-center",
      "sm:p-6",
    );
    expect(viewport).toHaveAttribute("data-dialog-viewport");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(panel).toHaveAttribute("data-workspace-dialog", "form");
    expect(panel).toHaveClass(
      "h-dvh",
      "max-h-dvh",
      "w-full",
      "overflow-hidden",
      "pt-[env(safe-area-inset-top)]",
      "motion-reduce:transition-none",
      "sm:h-auto",
      "sm:max-h-[calc(100dvh-3rem)]",
      "sm:max-w-6xl",
      "sm:rounded-[24px]",
      "sm:pt-0",
    );
  });

  it("falls back to the standard large desktop width for an unknown size", () => {
    render(
      <Dialog open onClose={vi.fn()}>
        <WorkspaceDialogPanel size="unknown" data-testid="fallback-panel">
          <DialogTitle>Fallback editor</DialogTitle>
          Content
        </WorkspaceDialogPanel>
      </Dialog>,
    );

    expect(
      screen.getByRole("dialog", { name: "Fallback editor" }),
    ).toBeVisible();
    expect(screen.getByTestId("fallback-panel")).toHaveClass("sm:max-w-5xl");
  });

  it("renders compact confirmations with shared anatomy and accessible controls", () => {
    const onClose = vi.fn();

    render(
      <Dialog open onClose={onClose}>
        <WorkspaceDialogBackdrop data-testid="compact-backdrop" />
        <WorkspaceDialogViewport layout="compact">
          <WorkspaceDialogPanel
            layout="compact"
            size="compact"
            data-testid="compact-panel"
          >
            <WorkspaceDialogHeader
              eyebrow="Confirmation"
              title="Remove this item?"
              description="This action cannot be undone."
              closeLabel="Close confirmation"
              onClose={onClose}
            />
            <WorkspaceDialogBody data-testid="dialog-body">
              Body
            </WorkspaceDialogBody>
            <WorkspaceDialogFooter data-testid="dialog-footer">
              <button type="button">Cancel</button>
            </WorkspaceDialogFooter>
          </WorkspaceDialogPanel>
        </WorkspaceDialogViewport>
      </Dialog>,
    );

    const panel = screen.getByTestId("compact-panel");
    expect(panel).toHaveAttribute("data-dialog-layout", "compact");
    expect(panel).toHaveAttribute("data-dialog-tone", "workspace");
    expect(panel).toHaveClass(
      "max-h-[min(85dvh,42rem)]",
      "rounded-t-[24px]",
      "sm:rounded-[24px]",
      "sm:max-w-lg",
    );
    expect(screen.getByTestId("dialog-body")).toHaveAttribute(
      "data-dialog-body",
    );
    expect(screen.getByTestId("dialog-footer")).toHaveClass(
      "pb-[calc(1rem+env(safe-area-inset-bottom))]",
    );

    const closeButton = screen.getByRole("button", {
      name: "Close confirmation",
    });
    expect(closeButton).toHaveClass("h-11", "w-11");
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
