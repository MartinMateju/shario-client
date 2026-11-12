import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizePublicTenant } from "@/components/public-tenant/publicTenant.config";
import en from "@/messages/en.json";
import cs from "@/messages/cs.json";

const mocks = vi.hoisted(() => ({
  data: null,
  tenant: null,
  authenticated: true,
  search: "",
  checkout: vi.fn(),
  membershipQuery: vi.fn(),
  membership: null,
  membershipRefetch: vi.fn(),
  scheduleChange: vi.fn(),
  cancelChange: vi.fn(),
  push: vi.fn(),
}));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => mocks.tenant,
  selectIsAuthenticated: () => mocks.authenticated,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ tenantSlug: "klei-atelier" }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({ tenant: mocks.tenant }),
  useOptionalPublicTenant: () => ({ tenant: mocks.tenant }),
}));
vi.mock("@/lib/features/memberships/membershipsApiSlice", () => ({
  useGetPublicMembershipCatalogQuery: () => ({ data: mocks.data }),
  useCreateMembershipCheckoutMutation: () => [mocks.checkout, {}],
  useGetMyMembershipQuery: (...args) => {
    mocks.membershipQuery(...args);
    return {
      data: { membership: mocks.membership },
      refetch: mocks.membershipRefetch,
    };
  },
  useScheduleMyMembershipPlanChangeMutation: () => [mocks.scheduleChange, {}],
  useCancelMyMembershipPlanChangeMutation: () => [mocks.cancelChange, {}],
}));
import PublicMembershipCatalog from "@/components/memberships/PublicMembershipCatalog";
import {
  getLocalizedMembershipText,
  getMembershipName,
} from "@/components/memberships/membership.utils";

const plan = (name = "Keramika", type = "all", locationIds = []) => ({
  id: `plan-${name}`,
  publishedVersion: {
    id: `version-${name}`,
    name,
    description: "Český popis",
    terms: "",
    prices: [
      { currency: "CZK", amountMinor: 89000 },
      { currency: "EUR", amountMinor: 3600 },
    ],
    billing: { type: "recurring", interval: "month" },
    locationScope: { type, locationIds },
    benefits: [],
  },
});
const page = (locale = "en") => (
  <NextIntlClientProvider locale={locale} messages={locale === "cs" ? cs : en}>
    <PublicMembershipCatalog />
  </NextIntlClientProvider>
);

describe("localized public membership catalogue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mocks.authenticated = true;
    mocks.membership = null;
    mocks.search = "";
    mocks.tenant = normalizePublicTenant({
      slug: "klei-atelier",
      name: "Klei",
      settings: {
        currency: "CZK",
        publicDefaultLanguage: "cs",
        supportedPublicLanguages: ["cs", "en"],
      },
    });
    mocks.data = {
      tenant: { currency: "CZK" },
      locations: [
        { id: "a", name: "Grohova" },
        { id: "b", name: "Václavská" },
      ],
      plans: [plan()],
    };
    mocks.checkout.mockReturnValue({
      unwrap: async () => ({ checkout: { sessionId: "unpaid" } }),
    });
  });

  it("renders translated names, descriptions, terms and benefit labels with per-field fallback", () => {
    const version = mocks.data.plans[0].publishedVersion;
    version.terms = "České podmínky";
    version.translations = {
      en: {
        name: "Studio membership",
        description: "English description",
        terms: "English terms",
      },
    };
    version.benefits = [
      {
        key: "clay",
        type: "boolean",
        enabled: true,
        label: "Hlína v ceně",
        translations: { en: { label: "Clay included" } },
      },
      {
        key: "tools",
        type: "boolean",
        enabled: true,
        label: "Nástroje",
        translations: { en: { label: "  " } },
      },
    ];
    render(page());
    expect(
      screen.getByRole("heading", { name: "Studio membership" }),
    ).toBeInTheDocument();
    expect(screen.getByText("English description")).toBeInTheDocument();
    expect(screen.getByText("English terms")).toBeInTheDocument();
    expect(screen.getByText("Clay included")).toBeInTheDocument();
    expect(screen.getByText("Nástroje")).toBeInTheDocument();
    expect(screen.queryByText("České podmínky")).not.toBeInTheDocument();
  });

  it("resets agreement when the displayed language changes", async () => {
    mocks.data.plans[0].publishedVersion.terms = "České podmínky";
    mocks.data.plans[0].publishedVersion.translations = {
      en: { terms: "English terms" },
    };
    const view = render(page());
    await userEvent.click(screen.getByRole("checkbox"));
    expect(
      screen.getByRole("button", { name: "Choose this plan" }),
    ).toBeEnabled();
    view.rerender(page("cs"));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText("České podmínky")).toBeInTheDocument();
  });

  it("uses primary currency for display and checkout despite a different currency URL", async () => {
    mocks.data.tenant.currency = "EUR";
    mocks.search = "currency=CZK";
    render(page());
    expect(
      screen.queryByRole("combobox", { name: /currency/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("€36", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText(/CZK/)).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Choose this plan" }),
    );
    expect(mocks.checkout).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "EUR" }),
    );
  });

  it("does not silently offer another currency when a primary price is missing", () => {
    mocks.data.plans[0].publishedVersion.prices = [
      { currency: "EUR", amountMinor: 3600 },
    ];
    render(page());
    expect(
      screen.queryByRole("button", { name: "Choose this plan" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Keramika" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it.each(["all", "shared_selected"])(
    "hides redundant %s location choices and ignores stale location queries",
    async (scope) => {
      mocks.data.plans = [
        plan("First", scope, scope === "all" ? [] : ["a", "b"]),
        plan("Second", scope, scope === "all" ? [] : ["a", "b"]),
      ];
      mocks.search = "locationId=removed-studio&currency=EUR";
      render(page());
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.getAllByRole("article")).toHaveLength(2);
      await userEvent.click(
        within(screen.getAllByRole("article")[0]).getByRole("button", {
          name: "Choose this plan",
        }),
      );
      expect(mocks.checkout.mock.calls[0][0]).toMatchObject({
        currency: "CZK",
      });
      expect(mocks.checkout.mock.calls[0][0]).not.toHaveProperty("locationId");
    },
  );

  it("retains a useful location filter for differently scoped shared plans", async () => {
    mocks.data.plans = [
      plan("Shared", "shared_selected", ["a", "b"]),
      plan("Grohova only", "shared_selected", ["a"]),
    ];
    render(page());
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Location" }),
      "b",
    );
    expect(screen.getByRole("heading", { name: "Shared" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Grohova only" }),
    ).not.toBeInTheDocument();
  });

  it("still requires the customer to choose one location for a selected multi-location plan", async () => {
    mocks.data.plans = [plan("Choose studio", "selected", ["a", "b"])];
    render(page());
    await userEvent.click(
      screen.getByRole("button", { name: "Choose this plan" }),
    );
    expect(mocks.checkout).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Location" }),
      "b",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Choose this plan" }),
    );
    expect(mocks.checkout).toHaveBeenCalledWith(
      expect.objectContaining({ locationId: "b" }),
    );
  });

  it("auto-selects the only eligible studio without a redundant selector", async () => {
    mocks.data.plans = [plan("Only Grohova", "selected", ["a"])];
    render(page());
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Choose this plan" }),
    );
    expect(mocks.checkout).toHaveBeenCalledWith(
      expect.objectContaining({ locationId: "a" }),
    );
  });

  it("preserves guest plan selection with the primary currency at sign-in", async () => {
    mocks.authenticated = false;
    mocks.search = "currency=EUR";
    render(page());
    expect(mocks.membershipQuery).toHaveBeenCalledWith(undefined, {
      skip: true,
      refetchOnMountOrArgChange: true,
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Choose this plan" }),
    );
    expect(mocks.checkout).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledOnce());
    const next = new URLSearchParams(
      mocks.push.mock.calls[0][0].split("?")[1],
    ).get("next");
    expect(new URLSearchParams(next.split("?")[1]).get("currency")).toBe("CZK");
    expect(next).toContain("planId=plan-Keramika");
  });

  it("checks the signed-in customer's membership before offering a new purchase", () => {
    render(page());
    expect(mocks.membershipQuery).toHaveBeenCalledWith(undefined, {
      skip: false,
      refetchOnMountOrArgChange: true,
    });
  });

  it("does not fetch an authenticated membership for a public preview", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PublicMembershipCatalog previewData={mocks.data} />
      </NextIntlClientProvider>,
    );
    expect(mocks.membershipQuery).toHaveBeenCalledWith(undefined, {
      skip: true,
      refetchOnMountOrArgChange: true,
    });
  });

  it("localizes purchased snapshots and keeps old memberships readable", () => {
    const snapshot = {
      name: "Původní členství",
      translations: { en: { name: "Purchased membership" } },
    };
    expect(getMembershipName({ planSnapshot: snapshot }, "en")).toBe(
      "Purchased membership",
    );
    expect(getMembershipName({ planSnapshot: snapshot }, "cs")).toBe(
      "Původní členství",
    );
    expect(getMembershipName({ name: "Legacy" }, "en")).toBe("Legacy");
    expect(
      getLocalizedMembershipText(
        { label: "Fallback", translations: { en: { label: "  " } } },
        "label",
        "en",
      ),
    ).toBe("Fallback");
  });

  it("uses current source-language edits over stale primary translations", () => {
    expect(
      getLocalizedMembershipText(
        {
          sourceLanguage: "en",
          name: "Updated plan",
          translations: { en: { name: "Old plan" }, cs: { name: "Členství" } },
        },
        "name",
        "en",
      ),
    ).toBe("Updated plan");
    expect(
      getLocalizedMembershipText(
        {
          label: "Updated hours",
          translations: { en: { label: "Old hours" } },
        },
        "label",
        "en",
        "en",
      ),
    ).toBe("Updated hours");
  });
});
