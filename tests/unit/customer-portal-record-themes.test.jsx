import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenant: {},
  membershipInvoices: vi.fn(),
  membershipDownload: vi.fn(),
  cancel: vi.fn(),
  invoiceDownload: vi.fn(),
  credits: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => key,
}));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => mocks.tenant,
  selectCurrentWorkspaceAccess: () => ({}),
}));
vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => "EN",
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => ({ tenant: mocks.tenant, surface: "portal" }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/features/memberships/membershipsApiSlice", () => ({
  useGetMyMembershipInvoicesQuery: (args) => mocks.membershipInvoices(args),
  useDownloadMyMembershipInvoiceMutation: () => [mocks.membershipDownload, {}],
  useGetMyMembershipQuery: () => ({
    data: {
      membership: {
        id: "membership-1",
        name: "Monthly clay",
        status: "active",
        amountMinor: 12000,
        currency: "CZK",
        currentPeriodStart: "2026-10-01",
        currentPeriodEnd: "2026-11-01",
      },
    },
  }),
  useGetMyMembershipLedgerQuery: () => ({
    data: {
      entries: [
        {
          id: "entry-1",
          type: "granted",
          amount: 10,
          reason: "Monthly allowance",
          createdAt: "2026-10-01",
        },
      ],
    },
  }),
  useCancelMyMembershipMutation: () => [mocks.cancel, {}],
  useCreateMembershipBillingPortalMutation: () => [vi.fn(), {}],
  useResumeMyMembershipMutation: () => [vi.fn(), {}],
  useScheduleMyMembershipPlanChangeMutation: () => [vi.fn(), {}],
  useCancelMyMembershipPlanChangeMutation: () => [vi.fn(), {}],
}));
vi.mock("@/lib/features/invoices/invoicesApiSlice", () => ({
  useGetInvoiceQuery: () => ({}),
  useGetMyInvoiceQuery: () => ({}),
  useDownloadInvoicePdfMutation: () => [vi.fn(), {}],
  useDownloadMyInvoicePdfMutation: () => [mocks.invoiceDownload, {}],
  useFinalizeInvoiceMutation: () => [vi.fn(), {}],
  useSendInvoiceMutation: () => [vi.fn(), {}],
}));
vi.mock("@/lib/features/credits/creditsApiSlice", () => ({
  useGetMyCreditTransactionsQuery: (args) => mocks.credits(args),
}));
vi.mock("@/components/invoices/CreditNoteDialog", () => ({
  default: () => null,
}));
vi.mock("@/components/invoices/InvoicePaymentsSection", () => ({
  default: () => null,
}));

import CreditTransactionHistory from "@/components/credits/CreditTransactionHistory";
import InvoiceDetailsDialog from "@/components/invoices/InvoiceDetailsDialog";
import KnowledgeResourceViewer from "@/components/knowledge/KnowledgeResourceViewer";
import CustomerMembershipPage from "@/components/memberships/CustomerMembershipPage";
import MembershipInvoiceHistoryPage from "@/components/memberships/MembershipInvoiceHistoryPage";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";
import { mergePortalAppearance } from "@/components/public-tenant/publicTenantPortalAppearance";

const studio = {
  name: "Clay studio",
  slug: "clay",
  settings: { currency: "CZK" },
  publicSite: {
    customerPortal: {
      appearance: {
        backgroundColor: "#FFFFFF",
        surfaceColor: "#EEEEEE",
        textColor: "#111111",
      },
    },
  },
};
const personal = {
  backgroundColor: "#FFFFFF",
  surfaceColor: "#000000",
  textColor: "#FFFFFF",
  headingColor: "#FFFFFF",
};
const invoice = {
  id: "invoice-1",
  number: "INV-001",
  status: "issued",
  currency: "CZK",
  totalAmountMinor: 2500,
  sellerSnapshot: { name: "Clay studio" },
  customerSnapshot: { name: "Customer" },
  lines: [
    {
      description: "Studio time",
      quantity: 1,
      unitAmountMinor: 2500,
      totalAmountMinor: 2500,
    },
  ],
};

function Appearance({ children }) {
  return (
    <div
      data-testid="appearance"
      style={getPublicTenantTheme(mocks.tenant, { surface: "portal" }).style}
    >
      {children}
    </div>
  );
}

describe("populated customer portal records under personal colors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenant = mergePortalAppearance(studio, personal);
    mocks.membershipInvoices.mockImplementation(({ page }) => ({
      data: {
        invoices: [
          { ...invoice, number: `INV-${page}`, issuedAt: "2026-10-01" },
        ],
        pages: 2,
      },
    }));
    mocks.membershipDownload.mockReturnValue({
      unwrap: () => Promise.reject(new Error("Offline")),
    });
    mocks.invoiceDownload.mockReturnValue({
      unwrap: () => Promise.reject(new Error("Offline")),
    });
    mocks.cancel.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mocks.credits.mockImplementation(({ page }) => ({
      data: {
        transactions: [
          {
            id: "credit-1",
            type: "used",
            amount: 25,
            reason: "Pottery piece",
            createdAt: "2026-10-01",
          },
        ],
        pagination: { page, totalCount: 25, totalPages: 2, limit: 15 },
      },
    }));
  });

  it("keeps invoice history pagination and download feedback while resetting to the studio palette", async () => {
    const { rerender } = render(
      <Appearance>
        <MembershipInvoiceHistoryPage />
      </Appearance>,
    );
    expect(
      screen
        .getByTestId("appearance")
        .style.getPropertyValue("--tenant-surface"),
    ).toBe("#000000");
    expect(screen.getByText("INV-1")).toHaveClass(
      "text-[var(--tenant-text-on-surface)]",
    );
    fireEvent.click(screen.getByRole("button", { name: "next" }));
    expect(screen.getByText("INV-2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "download" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("downloadError");
    expect(mocks.membershipDownload).toHaveBeenCalledWith({
      id: "invoice-1",
      url: undefined,
    });

    mocks.tenant = mergePortalAppearance(studio, {});
    rerender(
      <Appearance>
        <MembershipInvoiceHistoryPage />
      </Appearance>,
    );
    expect(
      screen
        .getByTestId("appearance")
        .style.getPropertyValue("--tenant-surface"),
    ).toBe("#EEEEEE");
    expect(screen.getByText("INV-2")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass(
      "bg-[var(--tenant-background)]",
    );
  });

  it("retains the personal palette in a portalized cancellation form and submits the chosen details", async () => {
    render(
      <Appearance>
        <CustomerMembershipPage />
      </Appearance>,
    );
    expect(screen.getByText("Monthly allowance")).toHaveClass(
      "text-[var(--tenant-muted-on-surface)]",
    );
    fireEvent.click(screen.getByRole("button", { name: "cancel.action" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.style.getPropertyValue("--tenant-surface")).toBe("#000000");
    expect(within(dialog).getByRole("combobox")).toHaveClass(
      "bg-[var(--tenant-surface)]",
      "text-[var(--tenant-text-on-surface)]",
    );
    for (const field of [
      within(dialog).getByRole("combobox"),
      within(dialog).getByRole("textbox"),
    ]) {
      expect(field.closest("form")).toHaveAttribute("data-ui-unstyled", "true");
      expect(
        field.matches(
          '[role="dialog"] form:not([data-ui-unstyled="true"]) :is(input, select, textarea)',
        ),
      ).toBe(false);
    }
    fireEvent.change(within(dialog).getByRole("combobox"), {
      target: { value: "moving" },
    });
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: " Moving away " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "confirm" }));
    await waitFor(() =>
      expect(mocks.cancel).toHaveBeenCalledWith({
        reason: "moving",
        comment: "Moving away",
      }),
    );
  });

  it("themes the customer invoice drawer and updates an already-open drawer when personal overrides are cleared", async () => {
    const { rerender } = render(
      <InvoiceDetailsDialog invoice={invoice} customerMode onClose={vi.fn()} />,
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog.style.getPropertyValue("--tenant-surface")).toBe("#000000");
    expect(dialog.style.getPropertyValue("--customer-invoice-text")).toBe(
      "var(--tenant-text-on-surface)",
    );
    expect(within(dialog).getByText("Studio time")).toHaveClass(
      "text-[var(--customer-invoice-text,#353533)]",
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "actions.download" }),
    );
    await waitFor(() =>
      expect(mocks.invoiceDownload).toHaveBeenCalledWith("invoice-1"),
    );
    mocks.tenant = studio;
    rerender(
      <InvoiceDetailsDialog invoice={invoice} customerMode onClose={vi.fn()} />,
    );
    expect(
      screen.getByRole("dialog").style.getPropertyValue("--tenant-surface"),
    ).toBe("#EEEEEE");
  });

  it("does not apply customer overrides to the staff invoice drawer", async () => {
    render(<InvoiceDetailsDialog invoice={invoice} onClose={vi.fn()} />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.style.getPropertyValue("--tenant-surface")).toBe("");
    expect(dialog.style.getPropertyValue("--customer-invoice-text")).toBe("");
  });

  it("keeps credit movement signs readable on custom cards and preserves pagination", () => {
    render(
      <Appearance>
        <CreditTransactionHistory />
      </Appearance>,
    );
    expect(screen.getByText("Pottery piece")).toHaveClass(
      "text-[var(--tenant-muted-on-surface)]",
    );
    expect(screen.getByText(/−CZK/)).toHaveClass(
      "text-[var(--tenant-text-on-surface)]",
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(mocks.credits).toHaveBeenLastCalledWith({ page: 2, limit: 15 });
  });

  it("carries portal colors into guide dialogs and preserves guide expansion and close behavior", async () => {
    const onClose = vi.fn();
    render(
      <KnowledgeResourceViewer
        open
        onClose={onClose}
        resource={{
          title: "Glazing guide",
          summary: "Studio instructions",
          content: "Use clean tools",
          customQuestions: [
            {
              question: "Can I dip glaze?",
              answer: "Yes, at the glazing station.",
            },
          ],
        }}
      />,
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog.style.getPropertyValue("--tenant-surface")).toBe("#000000");
    expect(
      within(dialog).getByRole("heading", { name: "Glazing guide" }),
    ).toHaveClass("text-[var(--tenant-heading-on-surface)]");
    fireEvent.click(within(dialog).getByText("Can I dip glaze?"));
    expect(
      within(dialog).getByText("Can I dip glaze?").closest("details"),
    ).toHaveAttribute("open");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "actions.close" }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
