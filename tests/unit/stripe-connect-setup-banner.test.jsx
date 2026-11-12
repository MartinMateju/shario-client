import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import styles from "@/components/dashboard/overview/overview.module.css";

const overviewCss = readFileSync(
  join(process.cwd(), "src/components/dashboard/overview/overview.module.css"),
  "utf8",
);

const mocks = vi.hoisted(() => ({
  connection: { status: "not_started" },
  isError: false,
  isLoading: false,
}));

vi.mock("@heroicons/react/24/outline", () => ({
  ArrowRightIcon: (props) => <svg {...props} />,
  CreditCardIcon: (props) => <svg {...props} />,
  ExclamationTriangleIcon: (props) => <svg {...props} />,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key) => {
    const labels = {
      "not_started.description": "Connect Stripe to accept customer payments.",
      "not_started.title": "Set up customer payments",
      "pending.description": "Stripe is reviewing your payment account.",
      "pending.title": "Payment setup is in progress",
      "restricted.description": "Review the requirements on your account.",
      "restricted.title": "Payments need attention",
      manageAction: "Set up payments",
      viewAction: "Review payment account",
    };

    return labels[key] || key;
  },
}));

vi.mock("react-redux", () => ({
  useSelector: () => ({ effectivePermissions: ["*"] }),
}));

vi.mock("@/config/permissions", () => ({
  PERMISSIONS: { PAYMENTS_CONNECT_MANAGE: "payments.connect.manage" },
  hasPermission: () => true,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentWorkspaceAccess: vi.fn(),
}));

vi.mock("@/lib/features/tenant-payments/tenantPaymentsApiSlice", () => ({
  useGetTenantPaymentConnectQuery: () => ({
    data: mocks.connection,
    isError: mocks.isError,
    isLoading: mocks.isLoading,
  }),
}));

vi.mock("@/lib/features/tenant-payments/tenantPayments.utils", () => ({
  CONNECT_DISPLAY_STATUSES: {
    ACTIVE: "active",
    NOT_STARTED: "not_started",
    PENDING: "pending",
    RESTRICTED: "restricted",
  },
  normalizeTenantPaymentConnect: (value) => value,
}));

import StripeConnectSetupBanner from "@/components/dashboard/StripeConnectSetupBanner";

describe("StripeConnectSetupBanner", () => {
  beforeEach(() => {
    mocks.connection = { status: "not_started" };
    mocks.isError = false;
    mocks.isLoading = false;
  });

  it("suppresses the ordinary setup reminder while Launch Center already presents it", () => {
    render(<StripeConnectSetupBanner suppressSetupReminder />);

    expect(
      screen.queryByRole("heading", { name: "Set up customer payments" }),
    ).not.toBeInTheDocument();
  });

  it("also suppresses a pending setup reminder while Launch Center owns payment setup", () => {
    mocks.connection = { status: "pending" };

    render(<StripeConnectSetupBanner suppressSetupReminder />);

    expect(
      screen.queryByRole("heading", { name: "Payment setup is in progress" }),
    ).not.toBeInTheDocument();
  });

  it("shows the ordinary setup reminder outside the guided Launch Center state", () => {
    render(<StripeConnectSetupBanner />);

    expect(
      screen.getByRole("heading", { name: "Set up customer payments" }),
    ).toBeInTheDocument();
    const action = screen.getByRole("link", { name: "Set up payments" });
    expect(action).toHaveAttribute("href", "/app/settings/payments");
    expect(action).toHaveClass(styles.action, styles.primary);
    expect(overviewCss).toMatch(/\.action\s*\{[^}]*min-height:\s*44px;/);
    expect(overviewCss).toMatch(
      /\.primary\s*\{[^}]*background:\s*var\(--studio-blue\);/,
    );
  });

  it("never suppresses a restricted account that needs immediate attention", () => {
    mocks.connection = { status: "restricted" };

    render(<StripeConnectSetupBanner suppressSetupReminder />);

    expect(
      screen.getByRole("heading", { name: "Payments need attention" }),
    ).toBeInTheDocument();
    const action = screen.getByRole("link", {
      name: "Review payment account",
    });
    expect(action).toHaveAttribute("href", "/app/settings/payments");
    expect(action).toHaveClass(styles.action, styles.primary);
  });

  it("stays hidden when the payment account is active", () => {
    mocks.connection = { status: "active" };

    render(<StripeConnectSetupBanner />);

    expect(document.querySelector("aside")).not.toBeInTheDocument();
  });
});
