import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { normalizePublicTenant } from "@/components/public-tenant/publicTenant.config";
import en from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  tenant: null,
  location: null,
  query: null,
  search: "",
  customerQuery: vi.fn(),
  publicQuery: vi.fn(),
  checkout: vi.fn(),
  scheduleChange: vi.fn(),
  cancelChange: vi.fn(),
  cancelMembership: vi.fn(),
  membershipRefetch: vi.fn(),
  membershipQueryState: {},
  membership: null,
  authenticated: true,
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
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key) => en.Memberships.checkout.cancelled[key],
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useCustomerPortalLocation: () => mocks.location,
  useOptionalCustomerPortalLocation: () => mocks.location,
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({ tenant: mocks.tenant }),
  useOptionalPublicTenant: () => ({ tenant: mocks.tenant }),
}));
vi.mock("@/lib/features/memberships/membershipsApiSlice", () => ({
  useGetCustomerMembershipCatalogQuery: (...args) => {
    mocks.customerQuery(...args);
    return mocks.query;
  },
  useGetPublicMembershipCatalogQuery: (...args) => {
    mocks.publicQuery(...args);
    return { data: mocks.query.currentData };
  },
  useCreateMembershipCheckoutMutation: () => [mocks.checkout, {}],
  useGetMyMembershipQuery: () => ({
    data: { membership: mocks.membership },
    refetch: mocks.membershipRefetch,
    ...mocks.membershipQueryState,
  }),
  useGetMyMembershipLedgerQuery: () => ({}),
  useCancelMyMembershipMutation: () => [mocks.cancelMembership, {}],
  useScheduleMyMembershipPlanChangeMutation: () => [mocks.scheduleChange, {}],
  useCancelMyMembershipPlanChangeMutation: () => [mocks.cancelChange, {}],
  useCreateMembershipBillingPortalMutation: () => [vi.fn(), {}],
  useResumeMyMembershipMutation: () => [vi.fn(), {}],
  useGetMembershipCheckoutStatusQuery: () => ({
    data: { checkout: { status: "expired" } },
    refetch: vi.fn(),
  }),
}));

import CustomerMembershipCatalog from "@/components/memberships/CustomerMembershipCatalog";
import CustomerMembershipPage from "@/components/memberships/CustomerMembershipPage";
import PublicMembershipCatalog from "@/components/memberships/PublicMembershipCatalog";
import MembershipCheckoutSuccess from "@/components/memberships/MembershipCheckoutSuccess";
import MembershipCheckoutCancelPage from "@/app/[locale]/tenants/[tenantSlug]/(customer-transactions)/memberships/checkout/cancel/page";

const plan = (name, locationId = "location-a") => ({
  id: `plan-${name}`,
  publishedVersion: {
    id: `version-${name}`,
    name,
    prices: [{ currency: "CZK", amountMinor: 150000 }],
    billing: { type: "recurring", interval: "month" },
    locationScope: locationId
      ? { type: "selected", locationIds: [locationId] }
      : { type: "all", locationIds: [] },
    benefits: [],
  },
});
const catalog = (...plans) => ({
  tenant: { currency: "CZK", name: "Klei" },
  locations: [{ id: "location-a", name: "Václavská" }],
  plans,
});
const renderPage = (child) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {child}
    </NextIntlClientProvider>,
  );
const activeMembership = (overrides = {}) => ({
  id: "member-paid",
  planId: "plan-Monthly clay",
  status: "active",
  canSchedulePlanChange: true,
  currentPeriodStart: "2026-11-01T00:00:00.000Z",
  currentPeriodEnd: "2026-12-01T00:00:00.000Z",
  currency: "CZK",
  amountMinor: 150000,
  planSnapshot: {
    name: "Monthly clay",
    billing: { type: "recurring", interval: "month", intervalCount: 1 },
    benefits: [],
  },
  ...overrides,
});
const catalogueSurface = (surface) =>
  surface === "public" ? (
    <PublicMembershipCatalog />
  ) : (
    <CustomerMembershipCatalog />
  );

describe("customer membership catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mocks.tenant = {
      ...normalizePublicTenant({
        slug: "klei-atelier",
        name: "Klei",
        publicCapabilities: { memberships: false },
        publicSite: { pages: { memberships: { visible: false } } },
      }),
      id: "tenant-a",
    };
    mocks.location = {
      activeLocationId: "location-a",
      activeLocationReference: "vaclavska",
    };
    mocks.search = "location=vaclavska";
    mocks.membership = null;
    mocks.authenticated = true;
    mocks.membershipQueryState = {};
    mocks.query = {
      currentData: catalog(plan("Monthly clay")),
      refetch: vi.fn(),
    };
    mocks.checkout.mockReturnValue({
      unwrap: async () => ({ checkout: { sessionId: "checkout-test" } }),
    });
    mocks.scheduleChange
      .mockReset()
      .mockReturnValue({ unwrap: async () => ({}) });
    mocks.cancelChange
      .mockReset()
      .mockReturnValue({ unwrap: async () => ({}) });
  });

  it("keeps Browse memberships in the authenticated portal with the selected studio", () => {
    renderPage(<CustomerMembershipPage />);
    expect(
      screen.getByRole("link", { name: "Browse memberships" }),
    ).toHaveAttribute("href", "/portal/membership/plans?location=vaclavska");
  });

  it.each([
    ["expired", "vaclavska"],
    ["expired", "grohova"],
    ["cancelled", "vaclavska"],
    ["cancelled", "grohova"],
  ])(
    "lets a customer choose another plan after an unpaid %s membership at %s",
    (status, locationReference) => {
      mocks.location.activeLocationReference = locationReference;
      mocks.membership = {
        id: "member-unpaid",
        status,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        planSnapshot: { name: "Previous membership", benefits: [] },
      };
      renderPage(<CustomerMembershipPage />);

      expect(
        screen.getByRole("link", { name: "Browse memberships" }),
      ).toHaveAttribute(
        "href",
        `/portal/membership/plans?location=${locationReference}`,
      );
      expect(
        screen.getByRole("heading", { name: "Previous membership" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", {
          name: en.Memberships.portal.billing.invoices,
        }),
      ).toHaveAttribute("href", "/portal/membership/invoices");
      expect(
        screen.queryByRole("button", {
          name: en.Memberships.portal.billing.open,
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: en.Memberships.portal.cancel.action,
        }),
      ).not.toBeInTheDocument();
    },
  );

  it.each(["cancelled", "expired"])(
    "preserves billing access and history for a previously paid %s membership",
    (status) => {
      mocks.membership = {
        id: "member-paid",
        status,
        cancelAtPeriodEnd: true,
        currentPeriodStart: "2026-10-01T00:00:00.000Z",
        currentPeriodEnd: "2026-11-01T00:00:00.000Z",
        planSnapshot: { name: "Previous paid membership", benefits: [] },
      };
      renderPage(<CustomerMembershipPage />);

      expect(
        screen.getByRole("link", { name: "Browse memberships" }),
      ).toHaveAttribute("href", "/portal/membership/plans?location=vaclavska");
      expect(
        screen.getByRole("button", {
          name: en.Memberships.portal.billing.open,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", {
          name: en.Memberships.portal.billing.invoices,
        }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: en.Memberships.portal.scheduled.undo,
        }),
      ).not.toBeInTheDocument();
    },
  );

  it.each(["active", "pending", "paused", "past_due", "cancel_scheduled"])(
    "keeps comparison and billing available while a membership is %s",
    (status) => {
      mocks.membership = {
        id: "member-open",
        status,
        planSnapshot: { name: "Current membership", benefits: [] },
      };
      renderPage(<CustomerMembershipPage />);

      expect(
        screen.getByRole("link", { name: en.Memberships.planChange.browse }),
      ).toHaveAttribute("href", "/portal/membership/plans?location=vaclavska");
      expect(
        screen.getByRole("button", {
          name: en.Memberships.portal.billing.open,
        }),
      ).toBeInTheDocument();
      if (status === "cancel_scheduled") {
        expect(
          screen.getByRole("button", {
            name: en.Memberships.portal.scheduled.undo,
          }),
        ).toBeInTheDocument();
      }
    },
  );

  it.each(
    ["portal", "public"].flatMap((surface) =>
      ["active", "pending", "paused", "past_due", "cancel_scheduled"].map(
        (status) => [surface, status],
      ),
    ),
  )(
    "keeps all %s plans visible without a second checkout for %s members",
    async (surface, status) => {
      mocks.membership = activeMembership({
        status,
        canSchedulePlanChange: false,
      });
      mocks.query.currentData = catalog(
        plan("Monthly clay"),
        plan("More studio time"),
      );
      renderPage(catalogueSurface(surface));
      expect(screen.getAllByRole("article")).toHaveLength(2);
      expect(
        screen.getByRole("heading", { name: "Monthly clay" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "More studio time" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: en.Memberships.planChange.currentPlan,
        }),
      ).toBeDisabled();
      const alternative = screen.getByRole("button", {
        name: en.Memberships.planChange.choose,
      });
      expect(alternative).toBeDisabled();
      await userEvent.click(alternative);
      expect(
        screen.queryByRole("button", { name: "Choose this plan" }),
      ).not.toBeInTheDocument();
      expect(mocks.checkout).not.toHaveBeenCalled();
      expect(mocks.scheduleChange).not.toHaveBeenCalled();
    },
  );

  it.each(["portal", "public"])(
    "fails closed on a membership lookup error while keeping %s plans visible",
    async (surface) => {
      mocks.membershipQueryState = { isError: true };
      mocks.query.currentData = catalog(
        plan("Monthly clay"),
        plan("More studio time"),
      );
      renderPage(catalogueSurface(surface));
      expect(screen.getAllByRole("article")).toHaveLength(2);
      expect(screen.getByRole("alert")).toHaveTextContent(
        en.Memberships.planChange.loadError,
      );
      for (const button of screen.getAllByRole("button", {
        name: "Choose this plan",
      })) {
        expect(button).toBeDisabled();
        await userEvent.click(button);
      }
      expect(mocks.checkout).not.toHaveBeenCalled();
      expect(mocks.scheduleChange).not.toHaveBeenCalled();
      await userEvent.click(
        screen.getByRole("button", { name: en.Memberships.common.retry }),
      );
      expect(mocks.membershipRefetch).toHaveBeenCalledOnce();
    },
  );

  it.each(["portal", "public"])(
    "waits for the membership lookup before enabling %s purchases",
    async (surface) => {
      mocks.membershipQueryState = { isFetching: true };
      renderPage(catalogueSurface(surface));
      expect(
        screen.getByRole("heading", { name: "Monthly clay" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        en.Memberships.planChange.loading,
      );
      const choose = screen.getByRole("button", { name: "Choose this plan" });
      expect(choose).toBeDisabled();
      await userEvent.click(choose);
      expect(mocks.checkout).not.toHaveBeenCalled();
    },
  );

  it.each(["portal", "public"])(
    "reviews a %s plan change and only schedules after explicit confirmation",
    async (surface) => {
      mocks.membership = activeMembership();
      const alternative = plan("More studio time");
      alternative.publishedVersion.terms = "Rules for the new plan.";
      alternative.publishedVersion.prices[0].amountMinor = 200000;
      mocks.query.currentData = catalog(plan("Monthly clay"), alternative);
      renderPage(catalogueSurface(surface));
      const current = screen.getByRole("button", {
        name: en.Memberships.planChange.currentPlan,
      });
      expect(current).toBeDisabled();
      await userEvent.click(current);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      const choose = screen.getByRole("button", {
        name: en.Memberships.planChange.choose,
      });
      expect(choose).toBeDisabled();
      await userEvent.click(screen.getByRole("checkbox"));
      await userEvent.click(choose);
      let dialog = await screen.findByRole("dialog", {
        name: en.Memberships.planChange.title,
      });
      expect(dialog).toHaveTextContent(
        /price, hours and benefits stay unchanged until/,
      );
      expect(dialog).toHaveTextContent(/More studio time will renew at/);
      expect(dialog).toHaveTextContent(/Dec 1, 2026|1 Dec 2026/);
      expect(dialog).toHaveTextContent(/2,000/);
      expect(dialog).toHaveTextContent(
        en.Memberships.planChange.noImmediateCharge,
      );
      expect(mocks.checkout).not.toHaveBeenCalled();
      expect(mocks.scheduleChange).not.toHaveBeenCalled();
      await userEvent.click(
        within(dialog).getByRole("button", {
          name: en.Memberships.planChange.cancel,
        }),
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(mocks.scheduleChange).not.toHaveBeenCalled();
      await userEvent.click(choose);
      dialog = await screen.findByRole("dialog");
      await userEvent.click(
        within(dialog).getByRole("button", {
          name: en.Memberships.planChange.confirm,
        }),
      );
      await waitFor(() => expect(mocks.scheduleChange).toHaveBeenCalledOnce());
      expect(mocks.scheduleChange).toHaveBeenCalledWith({
        planId: alternative.id,
        planVersionId: alternative.publishedVersion.id,
        locationId: "location-a",
        termsAccepted: true,
        locale: "en",
        idempotencyKey: expect.stringContaining("membership-plan-change"),
      });
      expect(mocks.checkout).not.toHaveBeenCalled();
      expect(mocks.membershipRefetch).toHaveBeenCalledOnce();
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    },
  );

  it.each(["portal", "public"])(
    "closes an open %s plan-change review safely when authentication and membership are lost",
    async (surface) => {
      mocks.membership = activeMembership();
      mocks.query.currentData = catalog(
        plan("Monthly clay"),
        plan("More studio time"),
      );
      const view = renderPage(catalogueSurface(surface));
      await userEvent.click(
        screen.getByRole("button", { name: en.Memberships.planChange.choose }),
      );
      expect(
        await screen.findByRole("dialog", {
          name: en.Memberships.planChange.title,
        }),
      ).toBeInTheDocument();
      mocks.authenticated = false;
      mocks.membership = null;
      view.rerender(
        <NextIntlClientProvider locale="en" messages={en}>
          {catalogueSurface(surface)}
        </NextIntlClientProvider>,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "More studio time" }),
      ).toBeInTheDocument();
      expect(mocks.scheduleChange).not.toHaveBeenCalled();
      expect(mocks.checkout).not.toHaveBeenCalled();
    },
  );

  it.each(["portal", "public"])(
    "discards an open %s review when a different membership replaces its owner",
    async (surface) => {
      mocks.membership = activeMembership();
      mocks.query.currentData = catalog(
        plan("Monthly clay"),
        plan("More studio time"),
      );
      const view = renderPage(catalogueSurface(surface));
      await userEvent.click(
        screen.getByRole("button", { name: en.Memberships.planChange.choose }),
      );
      expect(
        await screen.findByRole("dialog", {
          name: en.Memberships.planChange.title,
        }),
      ).toBeInTheDocument();
      mocks.membership = activeMembership({ id: "replacement-membership" });
      view.rerender(
        <NextIntlClientProvider locale="en" messages={en}>
          {catalogueSurface(surface)}
        </NextIntlClientProvider>,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: en.Memberships.planChange.confirm,
        }),
      ).not.toBeInTheDocument();
      expect(mocks.scheduleChange).not.toHaveBeenCalled();
      expect(mocks.checkout).not.toHaveBeenCalled();
    },
  );

  it.each(["portal", "public"])(
    "quotes %s plan changes in the existing membership currency after the studio currency changes",
    async (surface) => {
      mocks.membership = activeMembership({
        currency: "EUR",
        amountMinor: 6000,
      });
      const current = plan("Monthly clay");
      current.publishedVersion.prices.push({
        currency: "EUR",
        amountMinor: 6000,
      });
      const alternative = plan("More studio time");
      alternative.publishedVersion.prices = [
        { currency: "CZK", amountMinor: 200000 },
        { currency: "EUR", amountMinor: 8000 },
      ];
      const unavailable = plan("CZK-only plan");
      mocks.query.currentData = catalog(current, alternative, unavailable);
      renderPage(catalogueSurface(surface));
      expect(screen.getByText("€80", { exact: true })).toBeInTheDocument();
      expect(screen.queryByText(/CZK/)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "CZK-only plan" }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        screen.getByRole("button", { name: en.Memberships.planChange.choose }),
      );
      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveTextContent("More studio time will renew at €80.");
      expect(dialog).not.toHaveTextContent(/CZK/);
      await userEvent.click(
        within(dialog).getByRole("button", {
          name: en.Memberships.planChange.confirm,
        }),
      );
      await waitFor(() => expect(mocks.scheduleChange).toHaveBeenCalledOnce());
      expect(mocks.scheduleChange.mock.calls[0][0]).toMatchObject({
        planId: alternative.id,
        planVersionId: alternative.publishedVersion.id,
      });
      expect(mocks.scheduleChange.mock.calls[0][0]).not.toHaveProperty(
        "currency",
      );
      expect(mocks.checkout).not.toHaveBeenCalled();
    },
  );

  it("reuses the same plan-change idempotency key after a failed confirmation", async () => {
    mocks.membership = activeMembership();
    mocks.query.currentData = catalog(
      plan("Monthly clay"),
      plan("More studio time"),
    );
    mocks.scheduleChange.mockReturnValueOnce({
      unwrap: async () => {
        throw new Error("Network unavailable");
      },
    });
    renderPage(<CustomerMembershipCatalog />);
    await userEvent.click(
      screen.getByRole("button", { name: en.Memberships.planChange.choose }),
    );
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", {
      name: en.Memberships.planChange.confirm,
    });
    await userEvent.click(confirm);
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      en.Memberships.planChange.error,
    );
    expect(mocks.membershipRefetch).not.toHaveBeenCalled();
    await userEvent.click(confirm);
    await waitFor(() => expect(mocks.scheduleChange).toHaveBeenCalledTimes(2));
    expect(mocks.scheduleChange.mock.calls[1][0]).toEqual(
      mocks.scheduleChange.mock.calls[0][0],
    );
    expect(mocks.membershipRefetch).toHaveBeenCalledOnce();
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it.each(["page", "portal", "public"])(
    "cancels only the pending change from the %s surface",
    async (surface) => {
      const alternative = plan("More studio time");
      mocks.query.currentData = catalog(plan("Monthly clay"), alternative);
      mocks.membership = activeMembership({
        canSchedulePlanChange: false,
        scheduledPlanChange: {
          planId: alternative.id,
          planVersionId: alternative.publishedVersion.id,
          planSnapshot: alternative.publishedVersion,
          effectiveAt: "2026-12-01T00:00:00.000Z",
          status: "scheduled",
        },
      });
      renderPage(
        surface === "page" ? (
          <CustomerMembershipPage />
        ) : (
          catalogueSurface(surface)
        ),
      );
      expect(
        screen.getByRole("heading", {
          name: en.Memberships.planChange.pendingTitle,
        }),
      ).toBeInTheDocument();
      if (surface === "page") {
        expect(
          screen.getByRole("button", {
            name: en.Memberships.portal.cancel.action,
          }),
        ).toBeDisabled();
        expect(
          screen.getByText(en.Memberships.planChange.cancelBeforeMembership),
        ).toBeInTheDocument();
      } else {
        expect(screen.getAllByRole("article")).toHaveLength(2);
        expect(
          screen.getByRole("button", {
            name: en.Memberships.planChange.scheduledPlan,
          }),
        ).toBeDisabled();
        expect(
          screen.getByRole("button", {
            name: en.Memberships.planChange.currentPlan,
          }),
        ).toBeDisabled();
      }
      await userEvent.click(
        screen.getByRole("button", {
          name: en.Memberships.planChange.cancelChange,
        }),
      );
      const dialog = await screen.findByRole("dialog", {
        name: en.Memberships.planChange.cancelTitle,
      });
      expect(dialog).toHaveTextContent(en.Memberships.planChange.cancelConfirm);
      expect(mocks.cancelChange).not.toHaveBeenCalled();
      await userEvent.click(
        within(dialog).getByRole("button", {
          name: en.Memberships.planChange.cancelConfirmAction,
        }),
      );
      await waitFor(() => expect(mocks.cancelChange).toHaveBeenCalledOnce());
      expect(mocks.cancelChange).toHaveBeenCalledWith();
      expect(mocks.membershipRefetch).toHaveBeenCalledOnce();
      expect(mocks.cancelMembership).not.toHaveBeenCalled();
      expect(mocks.checkout).not.toHaveBeenCalled();
      expect(mocks.scheduleChange).not.toHaveBeenCalled();
      expect(mocks.membership.status).toBe("active");
      expect(mocks.membership.planId).toBe("plan-Monthly clay");
    },
  );

  it("does not allow cancellation while a scheduled change is being processed", () => {
    mocks.membership = activeMembership({
      canSchedulePlanChange: false,
      scheduledPlanChange: {
        planId: "plan-More studio time",
        planVersionId: "version-More studio time",
        planSnapshot: { name: "More studio time" },
        effectiveAt: "2026-12-01T00:00:00.000Z",
        status: "processing",
      },
    });
    renderPage(<CustomerMembershipPage />);
    expect(screen.getByRole("status")).toHaveTextContent(
      en.Memberships.planChange.processing,
    );
    expect(
      screen.queryByRole("button", {
        name: en.Memberships.planChange.cancelChange,
      }),
    ).not.toBeInTheDocument();
  });

  it("loads published customer plans without depending on public website visibility", () => {
    renderPage(<CustomerMembershipCatalog />);
    expect(
      screen.getByRole("heading", { name: "Monthly clay" }),
    ).toBeInTheDocument();
    expect(mocks.customerQuery).toHaveBeenCalledWith(
      { tenantId: "tenant-a", locationId: "location-a" },
      { skip: false, refetchOnMountOrArgChange: true },
    );
    expect(mocks.publicQuery).toHaveBeenCalledWith(
      { tenantSlug: "klei-atelier" },
      { skip: true },
    );
    expect(
      screen.queryByRole("combobox", { name: "Location" }),
    ).not.toBeInTheDocument();
  });

  it("does not flash retained plans or checkout actions from a previous studio", () => {
    mocks.location = {
      activeLocationId: "location-b",
      activeLocationReference: "grohova",
    };
    mocks.query = {
      data: catalog(plan("Previous studio plan")),
      currentData: undefined,
      isFetching: true,
    };
    renderPage(<CustomerMembershipCatalog />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading memberships");
    expect(screen.queryByText("Previous studio plan")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Choose this plan" }),
    ).not.toBeInTheDocument();
  });

  it("resets the checkout location when the active studio changes", async () => {
    const view = renderPage(<CustomerMembershipCatalog />);
    mocks.location = {
      activeLocationId: "location-b",
      activeLocationReference: "grohova",
    };
    mocks.query.currentData = catalog(plan("Grohova membership", "location-b"));
    view.rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <CustomerMembershipCatalog />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByText("Monthly clay")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Choose this plan" }),
    );
    expect(mocks.checkout).toHaveBeenCalledWith(
      expect.objectContaining({ locationId: "location-b" }),
    );
  });

  it.each(["selected", "all", "shared_selected"])(
    "uses the active studio for %s-scope checkout without changing the purchase contract",
    async (scope) => {
      const selectedPlan = plan(
        "Monthly clay",
        scope === "all" ? null : "location-a",
      );
      if (scope === "shared_selected")
        selectedPlan.publishedVersion.locationScope = {
          type: "shared_selected",
          locationIds: ["location-a", "location-b"],
        };
      mocks.query.currentData = catalog(selectedPlan);
      mocks.search = "location=vaclavska&locationId=another-location";
      renderPage(<CustomerMembershipCatalog />);
      await userEvent.click(
        screen.getByRole("button", { name: "Choose this plan" }),
      );
      await waitFor(() => expect(mocks.checkout).toHaveBeenCalledOnce());
      const body = mocks.checkout.mock.calls[0][0];
      expect(body).toMatchObject({ planId: selectedPlan.id, currency: "CZK" });
      if (scope === "selected") expect(body.locationId).toBe("location-a");
      else expect(body).not.toHaveProperty("locationId");
    },
  );

  it("shows shared studio hours, personal discounts and the carryover expiry without generic credit reset copy", () => {
    const benefits = [
      {
        key: "hours",
        label: "Studio time",
        type: "allowance",
        unit: "minute",
        quantity: 480,
        usageScope: "open_studio",
        memberOnly: true,
        rolloverPercent: 25,
      },
      {
        key: "course",
        label: "Course saving",
        type: "percentage",
        percentageBps: 1000,
        appliesTo: "products",
        productScope: "courses",
        memberOnly: true,
      },
    ];
    mocks.membership = {
      id: "member-1",
      status: "active",
      planSnapshot: { name: "Shared hours", benefits },
      balances: [
        {
          benefitKey: "hours",
          available: 570,
          currentPeriodAvailable: 480,
          carryoverAvailable: 90,
          carryoverExpiresAt: "2027-01-01T00:00:00.000Z",
        },
      ],
    };
    renderPage(<CustomerMembershipPage />);
    expect(screen.getByText("9 hr 30 min available")).toBeInTheDocument();
    expect(screen.getByText("Current period remaining")).toBeInTheDocument();
    expect(screen.getByText("8 hr")).toBeInTheDocument();
    expect(screen.getByText("1 hr 30 min")).toBeInTheDocument();
    expect(screen.getByText("Carryover expires")).toBeInTheDocument();
    expect(screen.getByText(/1 Jan 2027|Jan 1, 2027/)).toBeInTheDocument();
    expect(
      screen.getByText(/Other participants pay full price/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/do not roll over/)).not.toBeInTheDocument();
  });

  it("renders a genuine empty catalog and a retryable error distinctly", () => {
    mocks.query.currentData = catalog();
    const view = renderPage(<CustomerMembershipCatalog />);
    expect(
      screen.getByRole("heading", { name: "No memberships are available yet" }),
    ).toBeInTheDocument();
    view.unmount();
    mocks.query = { isError: true, refetch: vi.fn() };
    renderPage(<CustomerMembershipCatalog />);
    expect(
      screen.getByText("Memberships could not be loaded."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("discloses recurring frequency from billing configuration and omits renewal for fixed terms", () => {
    const monthly = plan("Monthly member");
    const yearly = plan("Two-year member");
    yearly.publishedVersion.billing = {
      type: "recurring",
      interval: "year",
      intervalCount: 2,
    };
    const fixed = plan("Fixed member");
    fixed.publishedVersion.billing = { type: "fixed", durationDays: 30 };
    mocks.query.currentData = catalog(monthly, yearly, fixed);
    renderPage(<CustomerMembershipCatalog />);
    expect(
      screen.getByText(/Automatically renews at.*every month until you cancel/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Automatically renews at.*every 2 years until you cancel/,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Automatically renews/)).toHaveLength(2);
    expect(screen.getByText("Fixed term · 30 days")).toBeInTheDocument();
  });

  it("returns an expired checkout to the portal plans with its studio retained", () => {
    mocks.search = "session_id=expired&location=vaclavska";
    renderPage(<MembershipCheckoutSuccess />);
    expect(
      screen.getByRole("link", { name: en.Memberships.checkout.backToPlans }),
    ).toHaveAttribute("href", "/portal/membership/plans?location=vaclavska");
  });

  it("keeps legacy cancel-page recovery within the portal and clears the cancelled attempt", async () => {
    renderPage(
      await MembershipCheckoutCancelPage({
        searchParams: Promise.resolve({ location: "vaclavska" }),
      }),
    );
    expect(
      screen.getByRole("link", {
        name: en.Memberships.checkout.cancelled.back,
      }),
    ).toHaveAttribute(
      "href",
      "/portal/membership/plans?checkout=cancelled&location=vaclavska",
    );
  });
});
