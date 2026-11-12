import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import AccessCodesPage from "@/components/views/access-codes/AccessCodesPage";

const LOCATION_ID = "64b000000000000000000001";
const mocks = vi.hoisted(() => ({
  retireCode: vi.fn(),
  tenant: { modules: { bookings: true } },
  access: { roleKey: "owner" },
  poolsError: undefined,
  poolsCalls: [],
  codesCalls: [],
  refetchPools: vi.fn(),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector({}),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next-intl", () => ({
  useFormatter: () => ({ dateTime: () => "1 Sep 2026, 09:00" }),
  useTranslations: () => {
    const messages = {
      title: "Door access codes",
      "unavailable.title": "Door access is unavailable",
      "disabled.title": "Door access is turned off",
      "notEntitled.title": "Door access is not included in this plan",
      "unavailable.description": "Review Door access settings and plan.",
      "disabled.description": "Enable Door access in Modules & navigation.",
      "notEntitled.description": "Review plan options or ask the owner.",
      "actions.manageModules": "Modules & navigation",
      "actions.viewPlan": "Review plan",
      "actions.retry": "Retry",
      "errors.pools": "Code pools could not be loaded",
      description: "Secure code inventory",
      location: "Studio location",
      chooseLocation: "Choose a location",
      "scopeNotice.title": "Inventory only — your lock stays manual",
      "scopeNotice.description": "No physical lock or email delivery.",
      "pools.eyebrow": "Doors and entrances",
      "pools.title": "Code pools",
      "pools.lowStock": "Low code inventory",
      "pools.availableCount": "2 eligible codes",
      "warning.title": "This code pool is running low",
      "warning.description": "Only 2 codes remain.",
      "summary.available": "Eligible single-booking",
      "summary.reusable": "Reusable",
      "summary.expiring": "Expiring soon",
      "summary.emergency": "Emergency reserve",
      "poolStatuses.active": "Active",
      "tabs.codes": "Codes",
      "tabs.audit": "Audit history",
      "actions.editPool": "Edit pool",
      "actions.archivePool": "Archive pool",
      "actions.bulkAdd": "Paste or import CSV",
      "actions.addCode": "Add code",
      "filters.search": "Search labels or notes",
      "filters.type": "Code type",
      "filters.status": "Code status",
      "filters.allTypes": "All types",
      "filters.allStatuses": "All statuses",
      "inventory.columns.code": "Masked code",
      "inventory.columns.type": "Type",
      "inventory.columns.status": "Status",
      "inventory.columns.validUntil": "Eligible until",
      "inventory.columns.actions": "Actions",
      "inventory.neverExpires": "Never expires in shario.io",
      "inventory.verified": "Programmed and tested",
      "types.single_booking.label": "Single booking",
      "types.reusable.label": "Reusable",
      "types.emergency_reserve.label": "Emergency reserve",
      "statuses.available": "Available",
      "statuses.draft": "Draft",
      "statuses.disabled": "Disabled",
      "statuses.retired": "Retired",
      "statuses.expired": "Expired",
      "actions.cancel": "Cancel",
      "actions.retiring": "Retiring code…",
      "actions.reveal": "Reveal",
      "actions.edit": "Edit",
      "actions.retire": "Retire",
      "actions.revealFor": "Reveal masked code",
      "actions.editFor": "Edit masked code",
      "actions.retireFor": "Retire masked code",
      "retire.title": "Retire access code",
      "retire.description": "Review the selected record.",
      "retire.codeLabel": "Code to retire",
      "retire.warningTitle": "This action cannot be undone",
      "retire.warningDescription": "The code remains in audit history.",
      "retire.confirm": "Retire code",
    };

    return (key) => messages[key] || key;
  },
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: () => ({ tenantId: LOCATION_ID }),
  selectCurrentTenant: () => mocks.tenant,
  selectCurrentWorkspaceAccess: () => mocks.access,
}));

vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({
    data: {
      locations: [{ id: LOCATION_ID, name: "Main studio", isActive: true }],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/features/accessCodes/accessCodeApiSlice", () => ({
  useGetAccessCodePoolsQuery: (args, options) => {
    mocks.poolsCalls.push({ args, options });
    const error = options.skip ? undefined : mocks.poolsError;
    return {
      data: {
        pools: [
          {
            id: "pool-1",
            locationId: LOCATION_ID,
            name: "Main entrance",
            status: "active",
            lowStock: true,
            lowStockThreshold: 5,
            counts: {
              available: 2,
              reusable: 1,
              expiring: 0,
              emergency: 1,
            },
          },
        ],
      },
      isLoading: false,
      isError: Boolean(error),
      error,
      refetch: mocks.refetchPools,
    };
  },
  useGetAccessCodesQuery: (args, options) => {
    mocks.codesCalls.push({ args, options });
    return {
      data: {
        codes: [
          {
            id: "code-1",
            maskedCode: "••••27",
            label: "Weekday code",
            type: "single_booking",
            status: "available",
            effectiveStatus: "available",
            validUntil: null,
            verifiedAt: "2026-08-20T07:00:00.000Z",
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    };
  },
  useGetAccessCodeAuditQuery: () => ({
    data: { events: [] },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateAccessCodePoolMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateAccessCodePoolMutation: () => [vi.fn(), { isLoading: false }],
  useArchiveAccessCodePoolMutation: () => [vi.fn(), { isLoading: false }],
  useCreateAccessCodeMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateAccessCodeMutation: () => [vi.fn(), { isLoading: false }],
  useRetireAccessCodeMutation: () => [mocks.retireCode, { isLoading: false }],
  useRevealAccessCodeMutation: () => [vi.fn(), { isLoading: false }],
  useBulkCreateAccessCodesMutation: () => [vi.fn(), { isLoading: false }],
}));

describe("AccessCodesPage", () => {
  beforeEach(() => {
    mocks.tenant = { modules: { bookings: true } };
    mocks.access = { roleKey: "owner" };
    mocks.poolsError = undefined;
    mocks.poolsCalls.length = 0;
    mocks.codesCalls.length = 0;
    mocks.refetchPools.mockReset();
    mocks.retireCode.mockReset();
    mocks.retireCode.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
  });

  it("renders a low-stock inventory without exposing plaintext codes", async () => {
    render(<AccessCodesPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Door access codes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Inventory only — your lock stays manual"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("This code pool is running low"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("••••27").length).toBeGreaterThan(0);
    expect(screen.queryByText("001527")).not.toBeInTheDocument();
  });

  it.each([
    { bookings: false, courses: false, access_codes: true },
    { bookings: false, courses: false },
  ])(
    "uses the independent Door access module and permits legacy omission: %j",
    async (modules) => {
      mocks.tenant = { modules };
      render(<AccessCodesPage />);
      expect(
        await screen.findByText("This code pool is running low"),
      ).toBeVisible();
      expect(mocks.poolsCalls.at(-1).options.skip).toBe(false);
    },
  );

  it("refreshes the protected pool query to resolve an effective false flag without exposing cached inventory", () => {
    mocks.tenant = { modules: { bookings: true, access_codes: false } };
    render(<AccessCodesPage />);
    expect(
      screen.getByRole("heading", { name: "Door access is unavailable" }),
    ).toBeVisible();
    expect(mocks.poolsCalls.at(-1).options).toMatchObject({
      skip: false,
      refetchOnMountOrArgChange: true,
    });
    expect(mocks.codesCalls.at(-1).options.skip).toBe(true);
    expect(
      screen.getByRole("link", { name: "Modules & navigation" }),
    ).toHaveAttribute("href", "/app/settings/modules");
    expect(screen.queryByText("••••27")).toBeNull();
  });

  it("skips inventory requests when the owner explicitly turned Door access off", () => {
    mocks.tenant = {
      modules: { access_codes: false },
      workspaceModules: { access_codes: { selected: false } },
    };
    render(<AccessCodesPage />);
    expect(
      screen.getByRole("heading", { name: "Door access is turned off" }),
    ).toBeVisible();
    expect(mocks.poolsCalls.every(({ options }) => options.skip)).toBe(true);
    expect(mocks.codesCalls.every(({ options }) => options.skip)).toBe(true);
    expect(screen.queryByText("••••27")).toBeNull();
  });

  it.each([
    [
      "TENANT_MODULE_DISABLED",
      "Door access is turned off",
      "Modules & navigation",
      undefined,
    ],
    [
      "TENANT_MODULE_NOT_ENTITLED",
      "Door access is not included in this plan",
      "Review plan",
      undefined,
    ],
    [
      "TENANT_MODULE_DISABLED",
      "Door access is turned off",
      "Modules & navigation",
      false,
    ],
    [
      "TENANT_MODULE_NOT_ENTITLED",
      "Door access is not included in this plan",
      "Review plan",
      false,
    ],
  ])(
    "explains API %s and hides cached inventory (effective flag %s)",
    (code, title, link, accessCodes) => {
      mocks.tenant = { modules: { access_codes: accessCodes } };
      mocks.poolsError = {
        status: 403,
        data: { code, details: { module: "access_codes" } },
      };
      render(<AccessCodesPage />);
      expect(screen.getByRole("heading", { name: title })).toBeVisible();
      expect(screen.getByRole("link", { name: link })).toBeVisible();
      expect(screen.queryByText("Code pools could not be loaded")).toBeNull();
      expect(screen.queryByText("••••27")).toBeNull();
      expect(mocks.poolsCalls.at(-1).options.skip).toBe(false);
      expect(mocks.codesCalls.at(-1).options.skip).toBe(true);
    },
  );

  it("does not offer configuration or billing links without permission", () => {
    mocks.access = {
      roleKey: "staff",
      effectivePermissions: ["access_codes.view"],
    };
    mocks.tenant = { modules: { access_codes: false } };
    render(<AccessCodesPage />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it.each([undefined, false])(
    "retries an unexpected server error instead of treating it as an entitlement denial (effective flag %s)",
    (accessCodes) => {
      mocks.tenant = { modules: { access_codes: accessCodes } };
      mocks.poolsError = {
        status: 500,
        data: { message: "Internal server detail" },
      };
      render(<AccessCodesPage />);
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Code pools could not be loaded",
      );
      expect(screen.queryByText("Internal server detail")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(mocks.refetchPools).toHaveBeenCalledOnce();
    },
  );

  it("uses an in-app confirmation dialog before retiring a code", async () => {
    render(<AccessCodesPage />);

    const retireButtons = await screen.findAllByRole("button", {
      name: "Retire masked code",
    });
    fireEvent.click(retireButtons[0]);

    expect(
      screen.getByRole("heading", { name: "Retire access code" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This action cannot be undone"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retire code" }));

    await waitFor(() =>
      expect(mocks.retireCode).toHaveBeenCalledWith("code-1"),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Retire access code" }),
      ).not.toBeInTheDocument(),
    );
  });
});
