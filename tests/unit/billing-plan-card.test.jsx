import { fireEvent, render, screen } from "@testing-library/react";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import BillingSettingsPage, {
  PlanCard,
} from "@/components/views/billing/BillingSettingsPage";
import messages from "@/messages/en.json";

const api = vi.hoisted(() => ({ data: null }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/features/billing/billingApiSlice", () => {
  const mutation = () => [vi.fn(), { isLoading: false }];
  return {
    useGetCurrentTenantSubscriptionQuery: () => ({
      data: api.data,
      refetch: vi.fn(),
    }),
    useGetTenantInvoicesQuery: () => ({ data: { invoices: [] } }),
    useLazyGetTenantInvoicesQuery: mutation,
    useStartTenantSubscriptionCheckoutMutation: mutation,
    usePreviewTenantPlanChangeMutation: mutation,
    useChangeTenantPlanMutation: mutation,
    useCancelTenantSubscriptionMutation: mutation,
    useResumeTenantSubscriptionMutation: mutation,
    useOpenTenantBillingPortalMutation: mutation,
  };
});

const plan = {
  id: "professional",
  version: 3,
  selfServe: true,
  prices: {
    monthly: {
      currencyOptions: {
        EUR: { configured: true, currency: "EUR", unitAmount: 7900 },
      },
    },
  },
  capabilities: { communications: { customAutomations: { kind: "advanced" } } },
};
const props = {
  plan,
  interval: "monthly",
  billingCurrency: "EUR",
  locale: "en",
  currentPaidPlan: "professional",
  currentPaidInterval: "monthly",
  canManage: true,
  t: createTranslator({ locale: "en", messages: messages.Billing }),
};

describe("versioned billing plan cards", () => {
  it.each([false, true])(
    "shows renewal and cancellation only for an actual active Stripe subscription (%s)",
    (hasStripeSubscription) => {
      api.data = {
        tenant: { plan: "professional", planVersion: 3, currency: "EUR" },
        subscription: {
          status: "active",
          hasStripeSubscription,
          hasPaymentProfile: hasStripeSubscription,
          trialEndsAt: "2028-09-27T12:00:00Z",
          currentPeriodEnd: hasStripeSubscription
            ? "2026-11-21T12:00:00Z"
            : null,
          billingCurrency: "EUR",
        },
        access: { canUseFeatures: true, mode: "active", remainingTrialDays: 0 },
        permissions: { canManageBilling: true },
        plans: [plan],
      };
      render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <BillingSettingsPage />
        </NextIntlClientProvider>,
      );
      expect(screen.queryByText(/Sep 27, 2028/)).toBeNull();
      if (hasStripeSubscription) {
        expect(
          screen.getByRole("button", { name: messages.Billing.actions.cancel }),
        ).toBeVisible();
        expect(screen.getByText(/Nov 21, 2026/)).toBeVisible();
      } else {
        expect(
          screen.queryByRole("button", {
            name: messages.Billing.actions.cancel,
          }),
        ).toBeNull();
        expect(
          screen.getByText(`${messages.Billing.renewsLabel}: —`),
        ).toBeVisible();
      }
      expect(
        screen.getByRole("button", {
          name: messages.Billing.actions.choose.replace(
            "{plan}",
            "Professional",
          ),
        }),
      ).toBeEnabled();
    },
  );
  it("lets an owner review a same-tier migration from V2 to V3 and displays advanced automations", () => {
    const choose = vi.fn();
    render(<PlanCard {...props} currentPaidVersion={2} onChoose={choose} />);
    expect(screen.getByText("Advanced automations")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Switch to current Professional plan",
      }),
    );
    expect(choose).toHaveBeenCalledExactlyOnceWith("professional");
  });

  it("keeps the same V3 plan disabled as current", () => {
    render(<PlanCard {...props} currentPaidVersion={3} onChoose={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: messages.Billing.actions.current }),
    ).toBeDisabled();
  });

  it("does not allow a plan migration without billing management permission", () => {
    render(
      <PlanCard
        {...props}
        currentPaidVersion={2}
        canManage={false}
        onChoose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "Switch to current Professional plan",
      }),
    ).toBeDisabled();
  });
});
