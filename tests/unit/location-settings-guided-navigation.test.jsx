import { render, screen } from "@testing-library/react";

import SettingsLocationsPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/locations/page";

const TENANT_ID = "64b000000000000000000099";
const PRIMARY_ACTIVE_ID = "64b000000000000000000001";
const ACTIVE_ID = "64b000000000000000000002";
const INACTIVE_PRIMARY_ID = "64b000000000000000000003";

const {
  canManage,
  currentSearch,
  getLocationsQuery,
  latestPageProps,
  locationsQuery,
  replace,
} = vi.hoisted(() => ({
  canManage: { value: true },
  currentSearch: { value: new URLSearchParams() },
  getLocationsQuery: vi.fn(),
  latestPageProps: { value: null },
  locationsQuery: { value: {} },
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => currentSearch.value,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: () => ({ tenantId: TENANT_ID }),
  selectCurrentWorkspaceAccess: () => ({ role: "owner" }),
}));

vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: (...args) => getLocationsQuery(...args),
}));

vi.mock("@/config/permissions", () => ({
  PERMISSIONS: {
    LOCATIONS_MANAGE: "locations.manage",
    LOCATIONS_VIEW: "locations.view",
  },
  hasPermission: (_access, permission) =>
    permission !== "locations.manage" || canManage.value,
}));

vi.mock("@/components/auth/PermissionBoundary", () => ({
  default: ({ children }) => children,
}));

vi.mock("@/components/views/locations/StudioLocationsPage", () => ({
  default: (props) => {
    latestPageProps.value = props;
    return <div>Studio location list</div>;
  },
}));

describe("studio location settings navigation", () => {
  beforeEach(() => {
    canManage.value = true;
    currentSearch.value = new URLSearchParams();
    latestPageProps.value = null;
    locationsQuery.value = {
      data: { locations: [] },
      isError: false,
      isFetching: false,
      isLoading: false,
      isUninitialized: false,
    };
    getLocationsQuery.mockReset();
    getLocationsQuery.mockImplementation(() => locationsQuery.value);
    replace.mockReset();
  });

  it("redirects an existing-location Launch Center review to the edit page", () => {
    currentSearch.value = new URLSearchParams(
      `locationId=${PRIMARY_ACTIVE_ID}&setupStep=location&source=launch-center`,
    );

    render(<SettingsLocationsPage />);

    expect(replace).toHaveBeenCalledWith(
      `/app/settings/locations/${PRIMARY_ACTIVE_ID}/edit?setupStep=location&source=launch-center`,
      { scroll: false },
    );
    expect(screen.queryByText("Studio location list")).not.toBeInTheDocument();
  });

  it("resolves a server-provided guided review to the active primary location", () => {
    currentSearch.value = new URLSearchParams(
      "setupStep=location&source=launch-center",
    );
    locationsQuery.value.data = {
      locations: [
        { id: ACTIVE_ID, isActive: true, isPrimary: false },
        { id: INACTIVE_PRIMARY_ID, isActive: false, isPrimary: true },
        { id: PRIMARY_ACTIVE_ID, isActive: true, isPrimary: true },
      ],
    };

    render(<SettingsLocationsPage />);

    expect(replace).toHaveBeenCalledWith(
      `/app/settings/locations/${PRIMARY_ACTIVE_ID}/edit?setupStep=location&source=launch-center`,
      { scroll: false },
    );
  });

  it("prefers an active location over an inactive primary location", () => {
    currentSearch.value = new URLSearchParams("setupStep=location");
    locationsQuery.value.data = {
      locations: [
        { id: INACTIVE_PRIMARY_ID, isActive: false, isPrimary: true },
        { id: ACTIVE_ID, isActive: true, isPrimary: false },
      ],
    };

    render(<SettingsLocationsPage />);

    expect(replace).toHaveBeenCalledWith(
      `/app/settings/locations/${ACTIVE_ID}/edit?setupStep=location`,
      { scroll: false },
    );
  });

  it("routes an empty guided workspace to the create page", () => {
    currentSearch.value = new URLSearchParams(
      "setupStep=location&source=launch-center",
    );

    render(<SettingsLocationsPage />);

    expect(replace).toHaveBeenCalledWith(
      "/app/settings/locations/new?setupStep=location&source=launch-center",
      { scroll: false },
    );
  });

  it("does not flash the list or redirect before guided locations load", () => {
    currentSearch.value = new URLSearchParams("setupStep=location");
    locationsQuery.value = {
      data: undefined,
      isError: false,
      isFetching: true,
      isLoading: true,
      isUninitialized: false,
    };

    render(<SettingsLocationsPage />);

    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText("Studio location list")).not.toBeInTheDocument();
  });

  it("redirects legacy create requests to the full create page", () => {
    currentSearch.value = new URLSearchParams(
      "action=create&setupStep=location&source=launch-center",
    );

    render(<SettingsLocationsPage />);

    expect(replace).toHaveBeenCalledWith(
      "/app/settings/locations/new?setupStep=location&source=launch-center",
      { scroll: false },
    );
    expect(latestPageProps.value).toBeNull();
  });

  it("renders the regular list without editor callbacks", () => {
    currentSearch.value = new URLSearchParams("tab=details");

    render(<SettingsLocationsPage />);

    expect(screen.getByText("Studio location list")).toBeInTheDocument();
    expect(latestPageProps.value).toEqual({
      createHref: "/app/settings/locations/new?tab=details",
      showPageHeader: false,
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("leaves a bare guided review on the list for view-only users", () => {
    canManage.value = false;
    currentSearch.value = new URLSearchParams("setupStep=location");

    render(<SettingsLocationsPage />);

    expect(screen.getByText("Studio location list")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(getLocationsQuery).toHaveBeenCalledWith(
      { tenantId: TENANT_ID, limit: 100 },
      { skip: true },
    );
  });
});
