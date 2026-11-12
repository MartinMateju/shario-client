import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  historyArgs: [],
  search: "",
  tenant: {
    modules: {
      bookings: true,
      courses: true,
      memberships: true,
      credits: true,
      vouchers: true,
    },
  },
  workspaceAccess: {
    role: "custom",
    permissions: [
      "customers.import",
      "products.import",
      "bookings.import",
      "memberships.import",
      "credits.import",
      "vouchers.import",
    ],
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) =>
      values.count === undefined ? key : `${key}:${values.count}`,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => mocks.tenant,
  selectCurrentWorkspaceAccess: () => mocks.workspaceAccess,
}));

vi.mock("@/components/decorations/WorkspaceBrushField", () => ({
  default: () => null,
}));

vi.mock("@/lib/features/data-import/dataImportApiSlice", () => ({
  useGetDataImportHistoryQuery: (args) => {
    mocks.historyArgs.push(args);
    return {
      data: { data: { items: [] } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  },
}));

vi.mock("@/components/migration/DataImportWizard", () => ({
  default: ({ entity }) => <div data-testid="import-wizard">{entity}</div>,
}));

vi.mock("@/components/migration/ImportHistoryPanel", () => ({
  default: ({ selectedEntity, canRollbackEntity }) => {
    mocks.historyArgs.push({ entity: selectedEntity, limit: 20 });
    return (
      <div
        data-testid="import-history"
        data-can-rollback={String(canRollbackEntity(selectedEntity))}
      >
        {selectedEntity}
      </div>
    );
  },
}));

import MigrationCenterPage from "@/components/migration/MigrationCenterPage";

describe("MigrationCenter entity access", () => {
  beforeEach(() => {
    mocks.historyArgs.length = 0;
    mocks.search = "";
    mocks.tenant = {
      modules: {
        bookings: true,
        courses: true,
        memberships: true,
        credits: true,
        vouchers: true,
      },
    };
    mocks.workspaceAccess = {
      role: "custom",
      permissions: [
        "customers.import",
        "products.import",
        "bookings.import",
        "memberships.import",
        "credits.import",
        "vouchers.import",
      ],
    };
  });

  it("initializes and syncs the importer from a valid entity query", () => {
    mocks.search = "entity=bookings";
    const { rerender } = render(<MigrationCenterPage />);

    expect(screen.getByTestId("import-wizard")).toHaveTextContent("bookings");
    expect(mocks.historyArgs.at(-1)).toEqual({
      entity: "bookings",
      limit: 20,
    });

    mocks.search = "entity=credits";
    rerender(<MigrationCenterPage />);

    expect(screen.getByTestId("import-wizard")).toHaveTextContent("credits");
    expect(mocks.historyArgs.at(-1)).toEqual({
      entity: "credits",
      limit: 20,
    });
  });

  it("shows Products & services to a courses-only authorized workspace", () => {
    mocks.tenant = { modules: { bookings: false, courses: true } };
    mocks.workspaceAccess = {
      role: "custom",
      permissions: ["products.import"],
    };

    render(<MigrationCenterPage />);

    expect(
      screen.getByRole("button", { name: /entities\.products\.title/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /entities\.customers\.title/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /entities\.bookings\.title/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("import-wizard")).toHaveTextContent("products");
    expect(mocks.historyArgs.at(-1)).toEqual({
      entity: "products",
      limit: 20,
    });
  });

  it("switches the wizard and filtered history independently", async () => {
    const user = userEvent.setup();
    render(<MigrationCenterPage />);

    await user.click(
      screen.getByRole("button", { name: /entities\.bookings\.title/ }),
    );

    expect(screen.getByTestId("import-wizard")).toHaveTextContent("bookings");
    expect(mocks.historyArgs.at(-1)).toEqual({
      entity: "bookings",
      limit: 20,
    });
    expect(
      screen.getByText("entities.bookings.limitation"),
    ).toBeInTheDocument();
  });

  it("offers granular membership and voucher import modes on three grouped cards", async () => {
    const user = userEvent.setup();
    render(<MigrationCenterPage />);

    expect(
      screen.getByRole("group", {
        name: "entities.memberships.modeLabel",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "entities.vouchers.modeLabel" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "entities.memberships.modes.plans",
      }),
    );
    expect(screen.getByTestId("import-wizard")).toHaveTextContent(
      "membership-plans",
    );
    expect(mocks.historyArgs.at(-1)).toEqual({
      entity: "membership-plans",
      limit: 20,
    });

    await user.click(
      screen.getByRole("button", {
        name: "entities.memberships.modes.customers",
      }),
    );
    expect(screen.getByTestId("import-wizard")).toHaveTextContent(
      "memberships",
    );

    await user.click(
      screen.getByRole("button", {
        name: "entities.vouchers.modes.products",
      }),
    );
    expect(screen.getByTestId("import-wizard")).toHaveTextContent(
      "voucher-products",
    );

    await user.click(
      screen.getByRole("button", {
        name: "entities.vouchers.modes.issued",
      }),
    );
    expect(screen.getByTestId("import-wizard")).toHaveTextContent("vouchers");
  });

  it("requires each dedicated import permission and enabled module", () => {
    mocks.tenant = {
      modules: {
        bookings: false,
        courses: false,
        memberships: true,
        credits: false,
        vouchers: true,
      },
    };
    mocks.workspaceAccess = {
      role: "custom",
      permissions: ["memberships.manage", "credits.import", "vouchers.import"],
    };

    render(<MigrationCenterPage />);

    expect(
      screen.queryByText("entities.memberships.title"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("entities.credits.title"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("entities.vouchers.title")).toBeInTheDocument();
    expect(screen.getByTestId("import-wizard")).toHaveTextContent(
      "voucher-products",
    );
  });

  it("requires rollback, entity import and destructive permissions together", () => {
    mocks.workspaceAccess = {
      role: "custom",
      permissions: [
        "customers.import",
        "customers.manage",
        "data-imports.rollback",
      ],
    };

    const { rerender } = render(<MigrationCenterPage />);
    expect(screen.getByTestId("import-history")).toHaveAttribute(
      "data-can-rollback",
      "true",
    );

    mocks.workspaceAccess = {
      role: "custom",
      permissions: ["customers.import", "data-imports.rollback"],
    };
    rerender(<MigrationCenterPage />);
    expect(screen.getByTestId("import-history")).toHaveAttribute(
      "data-can-rollback",
      "false",
    );
  });
});
