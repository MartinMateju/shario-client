import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import WorkspaceSectionHeader from "@/components/dashboard/WorkspaceSectionHeader";

describe("WorkspaceSectionHeader", () => {
  it("renders the local title treatment when requested", () => {
    render(
      <WorkspaceSectionHeader
        eyebrow="Studio"
        title="Products & services"
        description="Manage the catalog."
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Products & services",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Manage the catalog.")).toBeInTheDocument();
  });

  it("keeps actions while removing the duplicate local title", () => {
    render(
      <WorkspaceSectionHeader
        showTitle={false}
        eyebrow="Studio"
        title="Products & services"
        description="Manage the catalog."
        actions={<button type="button">Add product</button>}
      />,
    );

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByText("Manage the catalog.")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add product" }),
    ).toBeInTheDocument();
  });

  it("renders nothing when both the title and actions are absent", () => {
    const { container } = render(
      <WorkspaceSectionHeader showTitle={false} title="Products & services" />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
