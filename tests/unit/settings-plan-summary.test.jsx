import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SettingsPlanSummary from "@/components/settings/SettingsPlanSummary";
import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  tenant: { id: "studio-a", plan: "professional" },
  access: { role: "owner", status: "active" },
  query: {},
  subscriptionQuery: vi.fn(),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({ auth: { tenant: mocks.tenant, workspaceAccess: mocks.access } }),
}));
vi.mock("@/lib/features/billing/billingApiSlice", () => ({
  useGetCurrentTenantSubscriptionQuery: (...args) => {
    mocks.subscriptionQuery(...args);
    return mocks.query;
  },
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function renderSummary() {
  return render(
    <NextIntlClientProvider
      locale="en"
      messages={messages}
      timeZone="Europe/Prague"
    >
      <SettingsPlanSummary />
    </NextIntlClientProvider>,
  );
}

function billingResponse(plan = "professional", status = "active") {
  return {
    tenant: { id: "studio-a", plan },
    subscription: { status },
    paymentMethod: { brand: "visa", last4: "1234" },
  };
}

describe("settings current-plan summary", () => {
  beforeEach(() => {
    mocks.tenant = { id: "studio-a", plan: "professional" };
    mocks.access = { role: "owner", status: "active" };
    mocks.query = {};
    mocks.subscriptionQuery.mockClear();
  });

  it("shows the known workspace plan immediately while billing loads", () => {
    mocks.query = { isLoading: true, isFetching: true };
    renderSummary();
    expect(screen.getByText("Professional")).toBeVisible();
    expect(screen.queryByText("Loading plan…")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plan details" })).toHaveAttribute(
      "href",
      "/app/settings/billing",
    );
    expect(mocks.subscriptionQuery).toHaveBeenCalledWith(undefined, {
      skip: false,
      refetchOnMountOrArgChange: true,
    });
  });

  it("uses the current tenant's authoritative plan and status without payment information", () => {
    mocks.query = { currentData: billingResponse("starter") };
    renderSummary();
    expect(screen.getByText("Starter")).toBeVisible();
    expect(screen.getByText("Active")).toBeVisible();
    expect(screen.queryByText("Professional")).not.toBeInTheDocument();
    expect(screen.queryByText(/visa|1234/i)).not.toBeInTheDocument();
  });

  it("distinguishes a trial from a paid active subscription", () => {
    mocks.query = { currentData: billingResponse("professional", "trialing") };
    renderSummary();
    expect(screen.getByText("Professional")).toBeVisible();
    expect(screen.getByText("Free trial")).toBeVisible();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("shows only the safe tenant plan for a member without billing permission", () => {
    mocks.access = {
      role: "staff",
      status: "active",
      effectivePermissions: [],
    };
    mocks.tenant = { id: "studio-a", plan: "starter" };
    mocks.query = {
      currentData: billingResponse("enterprise", "past_due"),
      isError: true,
    };
    const { container } = renderSummary();
    expect(screen.getByText("Starter")).toBeVisible();
    expect(screen.queryByText("Enterprise")).not.toBeInTheDocument();
    expect(screen.queryByText("Payment due")).not.toBeInTheDocument();
    expect(container.querySelector("[data-settings-plan-status]")).toBeNull();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(mocks.subscriptionQuery).toHaveBeenCalledWith(undefined, {
      skip: true,
      refetchOnMountOrArgChange: true,
    });
  });

  it("allows a custom role with subscription view permission to open plan details", () => {
    mocks.access = {
      role: "staff",
      status: "active",
      effectivePermissions: ["subscription.view"],
    };
    mocks.query = { currentData: billingResponse() };
    renderSummary();
    expect(screen.getByRole("link", { name: "Plan details" })).toBeVisible();
    expect(screen.getByText("Active")).toBeVisible();
    expect(mocks.subscriptionQuery.mock.calls[0][1].skip).toBe(false);
  });

  it.each([null, { role: "owner", status: "suspended" }])(
    "does not render or query billing for inactive or missing membership (%j)",
    (access) => {
      mocks.access = access;
      const { container } = renderSummary();
      expect(container).toBeEmptyDOMElement();
      expect(mocks.subscriptionQuery.mock.calls[0][1].skip).toBe(true);
    },
  );

  it("does not use another tenant's cached subscription after switching studios", () => {
    mocks.tenant = { id: "studio-b", plan: "studio_plus" };
    mocks.query = { currentData: billingResponse("starter", "past_due") };
    renderSummary();
    expect(screen.getByText("Space Plus")).toBeVisible();
    expect(screen.queryByText("Starter")).not.toBeInTheDocument();
    expect(screen.queryByText("Payment due")).not.toBeInTheDocument();
  });

  it("ignores response data without a matching tenant identity and legacy stale data", () => {
    mocks.query = {
      data: billingResponse("starter", "past_due"),
      currentData: {
        tenant: { plan: "enterprise" },
        subscription: { status: "trialing" },
      },
    };
    renderSummary();
    expect(screen.getByText("Professional")).toBeVisible();
    expect(screen.queryByText("Enterprise")).not.toBeInTheDocument();
    expect(screen.queryByText("Starter")).not.toBeInTheDocument();
    expect(screen.queryByText("Free trial")).not.toBeInTheDocument();
  });

  it("shows an honest loading state when no plan is known yet", () => {
    mocks.tenant = { id: "studio-a" };
    mocks.query = { isLoading: true };
    renderSummary();
    expect(screen.getByText("Loading plan…")).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Current plan" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Starter")).not.toBeInTheDocument();
  });

  it("does not invent a default for an unknown plan or unsupported status", () => {
    mocks.query = {
      currentData: billingResponse("new_unknown_tier", "new_status"),
    };
    const { container } = renderSummary();
    expect(screen.getByText("Plan unavailable")).toBeVisible();
    expect(screen.queryByText("Professional")).not.toBeInTheDocument();
    expect(container.querySelector("[data-settings-plan-status]")).toBeNull();
  });

  it("keeps the known plan visible and explains a failed billing refresh", () => {
    mocks.query = { isError: true };
    renderSummary();
    expect(screen.getByText("Professional")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Plan details are temporarily unavailable.",
    );
  });

  it("does not query before a tenant identity is available", () => {
    mocks.tenant = { plan: "starter" };
    mocks.query = { currentData: billingResponse("professional", "trialing") };
    renderSummary();
    expect(screen.getByText("Starter")).toBeVisible();
    expect(screen.queryByText("Professional")).not.toBeInTheDocument();
    expect(screen.queryByText("Free trial")).not.toBeInTheDocument();
    expect(mocks.subscriptionQuery.mock.calls[0][1].skip).toBe(true);
  });
});
