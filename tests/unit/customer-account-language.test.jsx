import React from "react";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AccountSettingsPage from "@/components/views/settings/AccountSettingsPage";
import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  account: {},
  authState: {},
  tenant: null,
  publicTenant: null,
  locale: "cs",
  pathname: "/portal/account",
  query: "tab=profile&returnTo=%2Fportal",
  saving: false,
  currentDataAvailable: true,
  replace: vi.fn(),
  update: vi.fn(),
  getCurrent: vi.fn(),
  persistCurrent: vi.fn(),
  persistDefault: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations:
    (namespace) =>
    (key, values = {}) => {
      const message = `${namespace}.${key}`
        .split(".")
        .reduce((value, part) => value?.[part], messages);
      return Object.entries(values).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, value),
        message || key,
      );
    },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.query),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/i18n/routing", () => ({ routing: { locales: ["cs", "en", "nl"] } }));
vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      ...mocks.authState,
      auth: { ...mocks.authState.auth, tenant: mocks.tenant },
    }),
  useStore: () => ({ getState: () => mocks.authState }),
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => mocks.publicTenant,
}));

vi.mock("@/i18n/customerLocalePreference", () => ({
  getCustomerCurrentLocale: mocks.getCurrent,
  persistCustomerCurrentLocale: mocks.persistCurrent,
  persistCustomerDefaultLocale: mocks.persistDefault,
}));

vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useGetAccountQuery: () => ({
    data: { account: mocks.account },
    currentData: mocks.currentDataAvailable
      ? { account: mocks.account }
      : undefined,
    isLoading: false,
    isFetching: !mocks.currentDataAvailable,
    isError: false,
  }),
  useUpdateAccountPasswordMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateAccountProfileMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateCustomerPreferencesMutation: () => [
    mocks.update,
    { isLoading: mocks.saving },
  ],
}));

const currentSelect = () =>
  screen.getByRole("combobox", { name: "Current language" });
const defaultSelect = () =>
  screen.getByRole("combobox", { name: "Default language" });
const saveButton = () =>
  screen.getByRole("button", { name: "Save default language" });

beforeEach(() => {
  mocks.account = {
    id: "account-42",
    firstname: "Mia",
    lastname: "Maker",
    email: "mia@example.test",
    customerDefaultLanguage: null,
  };
  mocks.tenant = {
    slug: "clay-studio",
    settings: {
      publicDefaultLanguage: "cs",
      supportedPublicLanguages: ["cs", "en"],
    },
  };
  mocks.publicTenant = null;
  mocks.authState = {
    auth: {
      authContext: "customer",
      token: "customer-token",
      userInfo: { id: "account-42" },
      tenant: mocks.tenant,
      sessionEpoch: 2,
      sessionBoundaryEpoch: 1,
    },
  };
  mocks.locale = "cs";
  mocks.pathname = "/portal/account";
  mocks.query = "tab=profile&returnTo=%2Fportal";
  mocks.saving = false;
  mocks.currentDataAvailable = true;
  mocks.getCurrent.mockReturnValue(null);
  mocks.update.mockImplementation(({ defaultLanguage }) => ({
    unwrap: () =>
      Promise.resolve({
        account: { ...mocks.account, customerDefaultLanguage: defaultLanguage },
      }),
  }));
  window.history.replaceState({}, "", "/cs/portal/account#language");
});

describe("customer account language preferences", () => {
  it("does not render a previous customer's editable account while a new account query loads", () => {
    const { rerender } = render(<AccountSettingsPage portalMode />);
    expect(screen.getByDisplayValue("Mia")).toBeInTheDocument();
    mocks.authState.auth.userInfo = { id: "account-99" };
    mocks.currentDataAvailable = false;
    rerender(<AccountSettingsPage portalMode />);
    expect(screen.queryByDisplayValue("Mia")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save default language" }),
    ).not.toBeInTheDocument();
    mocks.currentDataAvailable = true;
    rerender(<AccountSettingsPage portalMode />);
    expect(screen.queryByDisplayValue("Mia")).not.toBeInTheDocument();
  });

  it("offers current and saved language independently, limited to the studio public pair", () => {
    render(<AccountSettingsPage portalMode />);

    expect(currentSelect()).toHaveValue("cs");
    expect(defaultSelect()).toHaveValue("");
    expect(
      within(currentSelect())
        .getAllByRole("option")
        .map((option) => option.value),
    ).toEqual(["cs", "en"]);
    expect(
      within(defaultSelect())
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Studio default (Čeština)", "Čeština", "English"]);
    expect(
      screen.getByText("Default for future visits: Čeština"),
    ).toBeVisible();
    expect(saveButton()).toBeDisabled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("changes the current URL locale and preserves the query and hash without saving a default", () => {
    render(<AccountSettingsPage portalMode />);
    fireEvent.change(currentSelect(), { target: { value: "en" } });

    expect(mocks.persistCurrent).toHaveBeenCalledWith("en", "clay-studio");
    expect(mocks.replace).toHaveBeenCalledWith(
      "/portal/account?tab=profile&returnTo=%2Fportal#language",
      { locale: "en", scroll: false },
    );
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.persistDefault).not.toHaveBeenCalled();
    expect(defaultSelect()).toHaveValue("");
  });

  it("saves the default while preserving the current visit language and URL", async () => {
    render(<AccountSettingsPage portalMode />);
    fireEvent.change(defaultSelect(), { target: { value: "en" } });
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Your default language was saved. Your current language is unchanged.",
      ),
    );
    expect(mocks.update).toHaveBeenCalledWith({ defaultLanguage: "en" });
    expect(mocks.persistCurrent).toHaveBeenCalledWith("cs", "clay-studio");
    expect(mocks.persistDefault).toHaveBeenCalledWith("en", "clay-studio");
    expect(mocks.persistCurrent.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.persistDefault.mock.invocationCallOrder[0],
    );
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(currentSelect()).toHaveValue("cs");
    expect(defaultSelect()).toHaveValue("en");
    expect(
      screen.getByText("Default for future visits: English"),
    ).toBeVisible();
    expect(saveButton()).toBeDisabled();
  });

  it("allows returning the saved preference to the studio default", async () => {
    mocks.account.customerDefaultLanguage = "en";
    render(<AccountSettingsPage portalMode />);
    fireEvent.change(defaultSelect(), { target: { value: "" } });
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(mocks.persistDefault).toHaveBeenCalledWith(null, "clay-studio"),
    );
    expect(mocks.update).toHaveBeenCalledWith({ defaultLanguage: null });
    expect(
      screen.getByText("Default for future visits: Čeština"),
    ).toBeVisible();
  });

  it("preserves a newer current language choice made while the default is being saved", async () => {
    let completeSave;
    mocks.update.mockReturnValue({
      unwrap: () =>
        new Promise((resolve) => {
          completeSave = resolve;
        }),
    });
    render(<AccountSettingsPage portalMode />);
    fireEvent.change(defaultSelect(), { target: { value: "en" } });
    fireEvent.click(saveButton());
    fireEvent.change(currentSelect(), { target: { value: "en" } });
    mocks.getCurrent.mockReturnValue("en");
    completeSave({
      account: { ...mocks.account, customerDefaultLanguage: "en" },
    });

    await waitFor(() =>
      expect(mocks.persistDefault).toHaveBeenCalledWith("en", "clay-studio"),
    );
    expect(mocks.persistCurrent).toHaveBeenLastCalledWith("en", "clay-studio");
    expect(mocks.persistCurrent).not.toHaveBeenCalledWith("cs", "clay-studio");
    expect(mocks.replace).toHaveBeenCalledTimes(1);
  });

  it("keeps the old saved preference and pending selection when saving fails", async () => {
    mocks.update.mockReturnValue({
      unwrap: () =>
        Promise.reject({ data: { message: "Please sign in again." } }),
    });
    render(<AccountSettingsPage portalMode />);
    fireEvent.change(defaultSelect(), { target: { value: "en" } });
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please sign in again.",
      ),
    );
    expect(defaultSelect()).toHaveValue("en");
    expect(
      screen.getByText("Default for future visits: Čeština"),
    ).toBeVisible();
    expect(saveButton()).toBeEnabled();
    expect(mocks.persistCurrent).not.toHaveBeenCalled();
    expect(mocks.persistDefault).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("preserves an unavailable saved language and explains the effective fallback", async () => {
    mocks.account.customerDefaultLanguage = "de";
    render(<AccountSettingsPage portalMode />);

    expect(defaultSelect()).toHaveValue("de");
    expect(
      within(defaultSelect()).getByRole("option", {
        name: "Deutsch (not available here)",
      }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Your saved default, Deutsch, is not currently offered by this studio. Čeština will be used until it is available again.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("Default for future visits: Čeština"),
    ).toBeVisible();
    expect(saveButton()).toBeDisabled();
    expect(mocks.update).not.toHaveBeenCalled();

    fireEvent.change(defaultSelect(), { target: { value: "en" } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(mocks.persistDefault).toHaveBeenCalledWith("en", "clay-studio"),
    );
    expect(
      screen.queryByText(/Your saved default, Deutsch/),
    ).not.toBeInTheDocument();
  });

  it("uses the public studio settings instead of workspace settings", () => {
    mocks.publicTenant = {
      tenant: {
        slug: "public-studio",
        settings: {
          publicDefaultLanguage: "nl",
          supportedPublicLanguages: ["nl", "cs"],
        },
      },
    };
    render(<AccountSettingsPage portalMode />);

    expect(
      within(currentSelect())
        .getAllByRole("option")
        .map((option) => option.value),
    ).toEqual(["nl", "cs"]);
    expect(screen.getByText("Studio default (Nederlands)")).toBeVisible();
    fireEvent.change(currentSelect(), { target: { value: "nl" } });
    expect(mocks.persistCurrent).toHaveBeenCalledWith("nl", "public-studio");
  });

  it("disables duplicate saves while the preference request is in flight", () => {
    const { rerender } = render(<AccountSettingsPage portalMode />);
    fireEvent.change(defaultSelect(), { target: { value: "en" } });
    mocks.saving = true;
    rerender(<AccountSettingsPage portalMode />);

    expect(defaultSelect()).toBeDisabled();
    expect(saveButton()).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: "Language" }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(currentSelect()).toBeEnabled();
  });

  it("reflects refreshed saved preferences while preserving an unsaved edit", () => {
    const { rerender } = render(<AccountSettingsPage portalMode />);
    mocks.account = { ...mocks.account, customerDefaultLanguage: "en" };
    rerender(<AccountSettingsPage portalMode />);
    expect(defaultSelect()).toHaveValue("en");
    fireEvent.change(defaultSelect(), { target: { value: "cs" } });

    mocks.account = { ...mocks.account, customerDefaultLanguage: null };
    rerender(<AccountSettingsPage portalMode />);
    expect(defaultSelect()).toHaveValue("cs");
    expect(
      screen.getByText("Default for future visits: Čeština"),
    ).toBeVisible();
    expect(saveButton()).toBeEnabled();
  });

  it("keeps these customer controls out of workspace account settings", () => {
    render(<AccountSettingsPage />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save default language" }),
    ).not.toBeInTheDocument();
  });

  it("ignores a default save after the form unmounts", async () => {
    let completeSave;
    mocks.update.mockReturnValue({
      unwrap: () =>
        new Promise((resolve) => {
          completeSave = resolve;
        }),
    });
    const { unmount } = render(<AccountSettingsPage portalMode />);
    fireEvent.change(defaultSelect(), { target: { value: "en" } });
    fireEvent.click(saveButton());
    unmount();
    await act(async () => {
      completeSave({
        account: { id: "account-42", customerDefaultLanguage: "en" },
      });
    });
    expect(mocks.persistCurrent).not.toHaveBeenCalled();
    expect(mocks.persistDefault).not.toHaveBeenCalled();
  });

  it.each(["account", "tenant", "session"])(
    "ignores a late save after the %s changes",
    async (change) => {
      let completeSave;
      mocks.update.mockReturnValue({
        unwrap: () =>
          new Promise((resolve) => {
            completeSave = resolve;
          }),
      });
      const { rerender } = render(<AccountSettingsPage portalMode />);
      fireEvent.change(defaultSelect(), { target: { value: "en" } });
      fireEvent.click(saveButton());
      if (change === "account")
        mocks.account = { ...mocks.account, id: "account-99" };
      if (change === "tenant")
        mocks.tenant = { ...mocks.tenant, slug: "other-studio" };
      if (change === "session")
        mocks.authState = {
          auth: { ...mocks.authState.auth, sessionBoundaryEpoch: 3 },
        };
      rerender(<AccountSettingsPage portalMode />);
      await act(async () => {
        completeSave({
          account: { id: "account-42", customerDefaultLanguage: "en" },
        });
      });
      expect(mocks.persistCurrent).not.toHaveBeenCalled();
      expect(mocks.persistDefault).not.toHaveBeenCalled();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    },
  );

  it("ignores a late failure after the signed-in customer changes", async () => {
    let rejectSave;
    mocks.update.mockReturnValue({
      unwrap: () =>
        new Promise((_resolve, reject) => {
          rejectSave = reject;
        }),
    });
    render(<AccountSettingsPage portalMode />);
    fireEvent.change(defaultSelect(), { target: { value: "en" } });
    fireEvent.click(saveButton());
    mocks.authState = {
      auth: { ...mocks.authState.auth, userInfo: { id: "account-99" } },
    };
    await act(async () => {
      rejectSave(new Error("Old request failed"));
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.persistDefault).not.toHaveBeenCalled();
  });
});
