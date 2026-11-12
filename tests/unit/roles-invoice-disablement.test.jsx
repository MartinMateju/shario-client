import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: null,
  catalog: null,
  tenant: null,
  updateRole: vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
  createRole: vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
}));

vi.mock("@/config/features", () => ({ NATIVE_INVOICES_ENABLED: false }));

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const messages = {
      "actions.edit": "Edit role",
      "actions.save": "Save role",
      "editor.name": "Role name",
      "editor.selected": "{count} selected",
      "permissionNames.invoices_view": "View invoices",
      "permissionNames.invoices_create": "Create invoice drafts",
      "permissionNames.payments_view": "View payments",
      "permissionNames.subscription_view": "View subscription billing",
      "permissionNames.memberships_view": "View memberships",
    };
    const translate = (key, values = {}) =>
      (messages[key] || key).replace(
        /\{(\w+)\}/g,
        (_, name) => values[name] ?? `{${name}}`,
      );
    translate.has = (key) => key in messages;
    return translate;
  },
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        workspaceAccess: {
          role: "admin",
          status: "active",
          effectivePermissions: ["roles.view", "roles.manage"],
        },
      },
    }),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => mocks.tenant,
  selectCurrentWorkspaceAccess: (state) => state.auth.workspaceAccess,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useGetWorkspaceRolesQuery: () => ({ data: { roles: [mocks.role] } }),
  useGetPermissionCatalogQuery: () => ({ data: mocks.catalog }),
  useCreateWorkspaceRoleMutation: () => [
    mocks.createRole,
    { isLoading: false },
  ],
  useUpdateWorkspaceRoleMutation: () => [
    mocks.updateRole,
    { isLoading: false },
  ],
  useDeleteWorkspaceRoleMutation: () => [vi.fn(), { isLoading: false }],
}));

import RolesSettingsPage from "@/components/views/roles/RolesSettingsPage";

describe("roles with native invoicing disabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenant = null;
    mocks.role = {
      roleId: "custom-bookkeeper",
      key: "custom",
      name: "Bookkeeper",
      description: "Reviews studio payments",
      permissions: [
        "invoices.view",
        "invoices.create",
        "payments.view",
        "subscription.view",
        "memberships.view",
      ],
    };
    mocks.catalog = {
      permissions: mocks.role.permissions.map((key) => ({
        key,
        category: key.split(".")[0],
      })),
    };
  });

  it("blocks new Professional V3 custom roles while keeping existing roles editable", () => {
    mocks.tenant = {
      plan: "professional",
      planVersion: 3,
      capabilities: { enterprise: { customRolesAndPermissions: false } },
    };
    render(<RolesSettingsPage />);
    expect(screen.queryByRole("button", { name: "actions.create" })).toBeNull();
    expect(screen.getByText("planRestriction")).toBeVisible();
    expect(screen.getByRole("button", { name: "Edit role" })).toBeEnabled();
  });

  it.each([
    {
      plan: "enterprise",
      planVersion: 3,
      capabilities: { enterprise: { customRolesAndPermissions: true } },
    },
    {
      plan: "professional",
      planVersion: 2,
      capabilities: { enterprise: { customRolesAndPermissions: false } },
    },
  ])(
    "allows role creation when the stored plan contract permits it ($plan V$planVersion)",
    (tenant) => {
      mocks.tenant = tenant;
      render(<RolesSettingsPage />);
      fireEvent.click(screen.getByRole("button", { name: "actions.create" }));
      expect(screen.getByRole("dialog")).toBeVisible();
    },
  );

  it("hides native invoice permissions but preserves saved grants when editing a role", async () => {
    render(<RolesSettingsPage />);

    const roleCard = screen.getByRole("article");
    expect(within(roleCard).queryByText(/Invoices/)).not.toBeInTheDocument();
    expect(within(roleCard).getByText("Payments · View")).toBeInTheDocument();
    expect(
      within(roleCard).getByText("Subscription · View"),
    ).toBeInTheDocument();
    expect(
      within(roleCard).getByText("Memberships · View"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit role" }));

    const editor = screen.getByRole("dialog");
    expect(within(editor).queryByText("View invoices")).not.toBeInTheDocument();
    expect(
      within(editor).queryByText("Create invoice drafts"),
    ).not.toBeInTheDocument();
    expect(within(editor).getByText("3 selected")).toBeInTheDocument();
    expect(
      within(editor).getByRole("checkbox", { name: /View payments/ }),
    ).toBeChecked();
    expect(
      within(editor).getByRole("checkbox", {
        name: /View subscription billing/,
      }),
    ).toBeChecked();
    expect(
      within(editor).getByRole("checkbox", { name: /View memberships/ }),
    ).toBeChecked();

    fireEvent.change(
      within(editor).getByRole("textbox", { name: "Role name" }),
      {
        target: { value: "Studio bookkeeper" },
      },
    );
    fireEvent.click(within(editor).getByRole("button", { name: "Save role" }));

    await waitFor(() => {
      expect(mocks.updateRole).toHaveBeenCalledExactlyOnceWith({
        roleId: "custom-bookkeeper",
        name: "Studio bookkeeper",
        description: "Reviews studio payments",
        permissions: mocks.role.permissions,
      });
    });
    expect(mocks.createRole).not.toHaveBeenCalled();
  });
});
