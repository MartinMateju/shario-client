import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspaceMobileCard,
  WorkspaceMobileList,
  WorkspacePagination,
  WorkspaceRowActions,
  WorkspaceStatusPill,
  WorkspaceTable,
  WorkspaceTableBody,
  WorkspaceTableCell,
  WorkspaceTableFrame,
  WorkspaceTableHeader,
  WorkspaceTableHeadCell,
  WorkspaceTableRow,
  WorkspaceTableScroller,
  WorkspaceToolbar,
  WorkspaceTruncatedText,
} from "@/components/dashboard/WorkspaceDataSurface";

vi.mock("next-intl", async () => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs();
});

const TestIcon = (props) => <svg data-testid="empty-icon" {...props} />;

describe("WorkspaceDataSurface", () => {
  it("keeps cards and standalone toolbars on the shared surface hierarchy", () => {
    render(
      <>
        <WorkspaceCard as="section" aria-label="Revenue summary">
          Card content
        </WorkspaceCard>
        <WorkspaceToolbar aria-label="Order filters">
          Toolbar content
        </WorkspaceToolbar>
      </>,
    );

    expect(screen.getByRole("region", { name: "Revenue summary" })).toHaveClass(
      "min-w-0",
      "max-w-full",
      "border-line",
      "bg-white",
      "shadow-card",
    );
    expect(screen.getByRole("region", { name: "Order filters" })).toHaveClass(
      "min-w-0",
      "max-w-full",
      "rounded-[24px]",
      "shadow-sm",
    );
  });

  it("makes wide tables keyboard-scrollable and keeps metadata readable", () => {
    render(
      <WorkspaceTableFrame>
        <WorkspaceTableScroller ariaLabel="Customers table">
          <table>
            <thead>
              <tr>
                <WorkspaceTableHeadCell>Name</WorkspaceTableHeadCell>
              </tr>
            </thead>
          </table>
        </WorkspaceTableScroller>
      </WorkspaceTableFrame>,
    );

    const region = screen.getByRole("region", { name: "Customers table" });
    const header = within(region).getByRole("columnheader", { name: "Name" });

    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveClass(
      "max-w-full",
      "overflow-x-auto",
      "overscroll-x-contain",
    );
    expect(region.parentElement).toHaveClass("min-w-0", "max-w-full");
    expect(header).toHaveAttribute("scope", "col");
    expect(header).toHaveClass("text-[10px]", "uppercase", "text-ink-muted");
  });

  it("gives table rows and cells one semantic, extensible visual contract", () => {
    render(
      <WorkspaceTable aria-label="Studio inventory" className="table-override">
        <WorkspaceTableHeader data-testid="table-header">
          <WorkspaceTableRow data-testid="heading-row">
            <WorkspaceTableHeadCell>Item</WorkspaceTableHeadCell>
          </WorkspaceTableRow>
        </WorkspaceTableHeader>
        <WorkspaceTableBody data-testid="table-body">
          <WorkspaceTableRow data-testid="data-row" className="row-override">
            <WorkspaceTableCell
              data-testid="data-cell"
              className="cell-override"
            >
              Stoneware clay
            </WorkspaceTableCell>
          </WorkspaceTableRow>
        </WorkspaceTableBody>
      </WorkspaceTable>,
    );

    const table = screen.getByRole("table", { name: "Studio inventory" });
    const header = screen.getByTestId("table-header");
    const body = screen.getByTestId("table-body");
    const headingRow = screen.getByTestId("heading-row");
    const dataRow = screen.getByTestId("data-row");
    const dataCell = screen.getByTestId("data-cell");

    expect(table).toHaveAttribute("data-workspace-table", "true");
    expect(table).toHaveClass(
      "w-full",
      "border-separate",
      "text-[13px]",
      "table-override",
    );
    expect(header.tagName).toBe("THEAD");
    expect(header).toHaveClass("bg-sand-50");
    expect(body.tagName).toBe("TBODY");
    expect(headingRow).toHaveClass("transition-colors", "hover:bg-sand-50/80");
    expect(dataRow).toHaveClass(
      "transition-colors",
      "hover:bg-sand-50/80",
      "row-override",
    );
    expect(dataCell.tagName).toBe("TD");
    expect(dataCell).toHaveClass(
      "border-b",
      "px-4",
      "py-3.5",
      "text-[13px]",
      "cell-override",
    );
  });

  it("provides readable mobile cards, status tones and touch-sized actions", () => {
    render(
      <WorkspaceMobileList data-testid="mobile-list">
        <WorkspaceMobileCard
          title="Stoneware firing"
          subtitle="External pieces"
          status={
            <WorkspaceStatusPill tone="success">Active</WorkspaceStatusPill>
          }
          actions={<button type="button">Edit</button>}
        >
          1,220 °C target temperature
        </WorkspaceMobileCard>
      </WorkspaceMobileList>,
    );

    const list = screen.getByTestId("mobile-list");
    const card = screen.getByRole("article");
    const status = screen.getByText("Active");
    const action = screen.getByRole("button", { name: "Edit" });

    expect(list).toHaveClass("grid", "gap-3", "md:hidden");
    expect(card).toHaveClass("rounded-[24px]", "p-4");
    expect(
      screen.getByRole("heading", { name: "Stoneware firing" }),
    ).toHaveClass("break-words", "text-[14px]");
    expect(screen.getByText("External pieces")).toHaveClass(
      "break-words",
      "text-ink-muted",
    );
    expect(status).toHaveClass(
      "rounded-full",
      "border-success/20",
      "bg-success-soft",
      "text-success",
    );
    expect(action.parentElement).toHaveClass(
      "[&_button]:min-h-11",
      "[&_button]:min-w-11",
    );
  });

  it("keeps row actions touch-sized and disables pagination at its boundaries", () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const { rerender } = render(
      <>
        <WorkspaceRowActions data-testid="row-actions">
          <button type="button">More</button>
        </WorkspaceRowActions>
        <WorkspacePagination
          page={1}
          pageCount={3}
          pageLabel="Inventory pages"
          previousLabel="Previous inventory page"
          nextLabel="Next inventory page"
          onPrevious={onPrevious}
          onNext={onNext}
        />
      </>,
    );

    const previous = screen.getByRole("button", {
      name: "Previous inventory page",
    });
    const next = screen.getByRole("button", {
      name: "Next inventory page",
    });

    expect(screen.getByTestId("row-actions")).toHaveClass(
      "[&_button]:min-h-11",
      "[&_button]:min-w-11",
    );
    expect(
      screen.getByRole("navigation", { name: "Inventory pages" }),
    ).toBeVisible();
    expect(screen.getByText("1 / 3")).toBeVisible();
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
    expect(next).toHaveClass("min-h-11", "rounded-full");

    fireEvent.click(previous);
    fireEvent.click(next);
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onNext).toHaveBeenCalledOnce();

    rerender(
      <WorkspacePagination
        page={3}
        pageCount={3}
        pageLabel="Inventory pages"
        previousLabel="Previous inventory page"
        nextLabel="Next inventory page"
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Previous inventory page" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Next inventory page" }),
    ).toBeDisabled();
  });

  it("renders a consistent empty state and preserves its action", () => {
    const onCreate = vi.fn();

    render(
      <WorkspaceEmptyState
        icon={TestIcon}
        title="No products yet"
        description="Create the first catalog item."
        action={
          <button type="button" onClick={onCreate}>
            Create product
          </button>
        }
      />,
    );

    expect(
      screen.getByRole("heading", { name: "No products yet" }),
    ).toHaveClass("break-words", "text-[16px]");
    expect(screen.getByText("Create the first catalog item.")).toHaveClass(
      "break-words",
      "text-[12px]",
    );
    expect(screen.getByTestId("empty-icon")).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Create product" }));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("keeps truncated content available on hover without changing its text", () => {
    render(
      <WorkspaceTruncatedText as="p">
        A very long customer name
      </WorkspaceTruncatedText>,
    );

    const text = screen.getByText("A very long customer name");
    expect(text).toHaveClass("truncate");
    expect(text).toHaveAttribute("title", "A very long customer name");
  });
});
