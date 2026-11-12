import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CustomerPortalAppearanceSettings, {
  CUSTOMER_PORTAL_COLOR_PRESETS,
} from "@/components/views/settings/CustomerPortalAppearanceSettings";
import { normalizePortalAppearance } from "@/components/public-tenant/publicTenantPortalAppearance";

const mocks = vi.hoisted(() => ({
  state: {},
  context: null,
  update: vi.fn(),
  saving: false,
}));

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key, values = {}) =>
      values.field ? `${key} ${values.field}` : key,
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
  useStore: () => ({ getState: () => mocks.state }),
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => mocks.context,
}));
vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useUpdateCustomerPreferencesMutation: () => [
    mocks.update,
    { isLoading: mocks.saving },
  ],
}));

const customer = { id: "customer-1", portalAppearance: {} };
const studio = {
  id: "studio-1",
  slug: "clay-studio",
  publicSite: {
    customerPortal: { appearance: { backgroundColor: "#EEEEEE" } },
  },
};
const save = () => screen.getByRole("button", { name: "save" });
const backgroundField = () =>
  screen.getByLabelText("fields.backgroundColor", {
    selector: 'input[type="text"]',
  });

beforeEach(() => {
  mocks.state = {
    auth: {
      authContext: "customer",
      token: "token",
      userInfo: customer,
      tenant: studio,
      sessionEpoch: 2,
      sessionBoundaryEpoch: 1,
    },
  };
  mocks.context = { studioTenant: studio, tenant: studio };
  mocks.saving = false;
  mocks.update.mockImplementation(({ portalAppearance }) => ({
    unwrap: () =>
      Promise.resolve({ account: { ...customer, portalAppearance } }),
  }));
});

describe("personal customer portal appearance", () => {
  it("starts with studio inheritance and saves a complete preset without changing language", async () => {
    render(<CustomerPortalAppearanceSettings account={customer} />);
    expect(
      screen.getByRole("button", { name: /studioDescription/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(save()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "presets.dark" }));
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.click(save());
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("saved"),
    );
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({
      portalAppearance: CUSTOMER_PORTAL_COLOR_PRESETS.dark,
    });
    expect(save()).toBeDisabled();
  });

  it("clears every personal field when switching back to studio colours", async () => {
    render(
      <CustomerPortalAppearanceSettings
        account={{
          ...customer,
          portalAppearance: CUSTOMER_PORTAL_COLOR_PRESETS.dark,
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /studioDescription/ }));
    expect(backgroundField()).toHaveValue("");
    expect(backgroundField()).toHaveAttribute("placeholder", "#EEEEEE");
    fireEvent.click(save());
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledExactlyOnceWith({
        portalAppearance: normalizePortalAppearance(),
      }),
    );
  });

  it("retains other saved overrides when resetting a single colour", async () => {
    render(
      <CustomerPortalAppearanceSettings
        account={{
          ...customer,
          portalAppearance: CUSTOMER_PORTAL_COLOR_PRESETS.dark,
        }}
      />,
    );
    fireEvent.click(screen.getByText("customize"));
    fireEvent.click(
      screen.getByRole("button", { name: "resetColor fields.backgroundColor" }),
    );
    fireEvent.click(save());
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledExactlyOnceWith({
        portalAppearance: {
          ...CUSTOMER_PORTAL_COLOR_PRESETS.dark,
          backgroundColor: "",
        },
      }),
    );
  });

  it("rejects invalid custom colours and keeps changes available after a failed save", async () => {
    mocks.update.mockReturnValue({
      unwrap: () => Promise.reject(new Error("offline")),
    });
    render(<CustomerPortalAppearanceSettings account={customer} />);
    fireEvent.change(backgroundField(), { target: { value: "#xyz123" } });
    expect(backgroundField()).toHaveAttribute("aria-invalid", "true");
    expect(save()).toBeDisabled();
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.change(backgroundField(), { target: { value: "#112233" } });
    fireEvent.click(save());
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("saveError"),
    );
    expect(backgroundField()).toHaveValue("#112233");
    expect(save()).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "discard" }));
    expect(backgroundField()).toHaveValue("");
    expect(save()).toBeDisabled();
  });

  it("loads saved colours after a new visit and preserves unsaved edits during an account refresh", () => {
    const { rerender } = render(
      <CustomerPortalAppearanceSettings
        account={{
          ...customer,
          portalAppearance: { backgroundColor: "#223344" },
        }}
      />,
    );
    expect(backgroundField()).toHaveValue("#223344");
    fireEvent.change(backgroundField(), { target: { value: "#334455" } });
    rerender(
      <CustomerPortalAppearanceSettings
        account={{
          ...customer,
          portalAppearance: { backgroundColor: "#445566" },
        }}
      />,
    );
    expect(backgroundField()).toHaveValue("#334455");
    fireEvent.click(screen.getByRole("button", { name: "discard" }));
    expect(backgroundField()).toHaveValue("#445566");
  });

  it("ignores a late save after a different customer signs in", async () => {
    let resolve;
    mocks.update.mockReturnValue({
      unwrap: () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    render(<CustomerPortalAppearanceSettings account={customer} />);
    fireEvent.click(screen.getByRole("button", { name: "presets.light" }));
    fireEvent.click(save());
    mocks.state.auth.userInfo = { id: "customer-2" };
    await act(async () =>
      resolve({
        account: {
          ...customer,
          portalAppearance: CUSTOMER_PORTAL_COLOR_PRESETS.light,
        },
      }),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
