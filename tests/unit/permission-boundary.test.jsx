import { beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/config/permissions";
import PermissionBoundary from "@/components/auth/PermissionBoundary";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  useAccessQuery: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));

vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useGetCurrentWorkspaceAccessQuery: (...args) => mocks.useAccessQuery(...args),
}));

const authState = ({
  workspaceAccess = null,
  workspaceAccessResolved = true,
  userInfo = {
    id: "user-1",
    tenant: "tenant-1",
  },
} = {}) => ({
  token: "access-token",
  userInfo,
  tenant: {
    id: "tenant-1",
  },
  workspaceAccess,
  workspaceAccessResolved,
  sessionReady: true,
});

beforeEach(() => {
  mocks.useAccessQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isFetching: false,
  });
});

describe("PermissionBoundary", () => {
  it("renders children only when all required permission groups pass", () => {
    renderWithProviders(
      <PermissionBoundary
        permission={PERMISSIONS.WORKSPACE_VIEW}
        allOf={[PERMISSIONS.BOOKINGS_VIEW]}
        anyOf={[PERMISSIONS.BOOKINGS_CREATE, PERMISSIONS.BOOKINGS_UPDATE]}
        fallback={<p>Denied</p>}
      >
        <p>Authorized workspace</p>
      </PermissionBoundary>,
      {
        preloadedState: {
          auth: authState({
            workspaceAccess: {
              role: "staff",
              status: "active",
              permissions: [
                PERMISSIONS.WORKSPACE_VIEW,
                PERMISSIONS.BOOKINGS_VIEW,
                PERMISSIONS.BOOKINGS_UPDATE,
              ],
            },
          }),
        },
      },
    );

    expect(screen.getByText("Authorized workspace")).toBeInTheDocument();
    expect(screen.queryByText("Denied")).not.toBeInTheDocument();
    expect(mocks.useAccessQuery).toHaveBeenCalledWith(undefined, {
      skip: true,
    });
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("allows an active owner through an owner-only boundary", () => {
    renderWithProviders(
      <PermissionBoundary
        ownerOnly
        permission={PERMISSIONS.WORKSPACE_DELETE}
        fallback={<p>Not owner</p>}
      >
        <p>Owner controls</p>
      </PermissionBoundary>,
      {
        preloadedState: {
          auth: authState({
            workspaceAccess: {
              role: "owner",
              status: "active",
              permissions: [],
            },
          }),
        },
      },
    );

    expect(screen.getByText("Owner controls")).toBeInTheDocument();
    expect(screen.queryByText("Not owner")).not.toBeInTheDocument();
  });

  it("shows a loading fallback while unresolved access is being fetched", () => {
    mocks.useAccessQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
    });

    renderWithProviders(
      <PermissionBoundary
        permission={PERMISSIONS.WORKSPACE_VIEW}
        loadingFallback={<p>Checking access</p>}
        fallback={<p>Denied</p>}
      >
        <p>Workspace</p>
      </PermissionBoundary>,
      {
        preloadedState: {
          auth: authState({
            workspaceAccessResolved: false,
          }),
        },
      },
    );

    expect(screen.getByText("Checking access")).toBeInTheDocument();
    expect(screen.queryByText("Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Denied")).not.toBeInTheDocument();
    expect(mocks.useAccessQuery).toHaveBeenCalledWith(undefined, {
      skip: false,
    });
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("treats an explicitly resolved null access response as denied", async () => {
    mocks.useAccessQuery.mockReturnValue({
      data: {
        workspaceAccess: null,
      },
      isLoading: false,
      isFetching: false,
    });

    renderWithProviders(
      <PermissionBoundary
        permission={PERMISSIONS.WORKSPACE_VIEW}
        fallback={<p>Customer fallback</p>}
        fallbackHref="/portal"
      >
        <p>Workspace</p>
      </PermissionBoundary>,
      {
        preloadedState: {
          auth: authState({
            workspaceAccessResolved: false,
          }),
        },
      },
    );

    expect(screen.getByText("Customer fallback")).toBeInTheDocument();
    expect(screen.queryByText("Workspace")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledOnce();
    });
    expect(mocks.replace).toHaveBeenCalledWith("/portal");
  });

  it("renders the fallback and redirects an authenticated member who lacks access", async () => {
    renderWithProviders(
      <PermissionBoundary
        permissions={[PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.BOOKINGS_CREATE]}
        fallback={<p>Permission denied</p>}
        fallbackHref="/app"
      >
        <p>Bookings</p>
      </PermissionBoundary>,
      {
        preloadedState: {
          auth: authState({
            workspaceAccess: {
              role: "staff",
              status: "active",
              permissions: [PERMISSIONS.BOOKINGS_VIEW],
            },
          }),
        },
      },
    );

    expect(screen.getByText("Permission denied")).toBeInTheDocument();
    expect(screen.queryByText("Bookings")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/app");
    });
  });

  it("retains the legacy wildcard fallback for unresolved managers", () => {
    renderWithProviders(
      <PermissionBoundary
        permission={PERMISSIONS.INVOICES_EXPORT}
        fallback={<p>Denied</p>}
      >
        <p>Legacy workspace</p>
      </PermissionBoundary>,
      {
        preloadedState: {
          auth: authState({
            workspaceAccessResolved: false,
            userInfo: {
              id: "user-1",
              tenant: "tenant-1",
              tenantRole: "ADMIN",
            },
          }),
        },
      },
    );

    expect(screen.getByText("Legacy workspace")).toBeInTheDocument();
    expect(screen.queryByText("Denied")).not.toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
