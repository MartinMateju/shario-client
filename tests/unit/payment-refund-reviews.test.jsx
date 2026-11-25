import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  access: null,
  query: vi.fn(),
  resolve: vi.fn(),
  unwrap: vi.fn(),
  refetch: vi.fn(),
  data: null,
}));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => en.RefundReviews[key],
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: { workspaceAccess: mocks.access, tenant: { id: "tenant-1" } },
    }),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentWorkspaceAccess: (state) => state.auth.workspaceAccess,
  selectCurrentTenant: (state) => state.auth.tenant,
}));
vi.mock("@/lib/features/tenant-payments/tenantPaymentsApiSlice", () => ({
  useGetPaymentRefundReviewsQuery: mocks.query,
  useResolvePaymentRefundReviewMutation: () => [
    mocks.resolve,
    { isLoading: false },
  ],
}));
import RefundReviewPanel from "@/components/views/payments/RefundReviewPanel";

const review = () => ({
  id: "a".repeat(64),
  orderId: "order-1",
  membershipId: "membership-1",
  customerName: "Jamie Example",
  membershipName: "Monthly studio pass",
  currency: "usd",
  paidAmountMinor: 5000,
  refund: {
    succeededAmountMinor: 1500,
    pendingAmountMinor: 500,
    failedAmountMinor: 200,
  },
  reviewRequired: true,
  reviewReason: "benefit_review_required",
  snapshotVersion: "b".repeat(64),
});
const openEditor = () =>
  fireEvent.click(screen.getByRole("button", { name: "Record review" }));
const completeEditor = () => {
  fireEvent.change(screen.getByLabelText(en.RefundReviews.note), {
    target: { value: " Retain the existing customer benefits. " },
  });
  fireEvent.change(screen.getByLabelText(en.RefundReviews.evidence), {
    target: { value: " Support case 123: customer agreement. " },
  });
  fireEvent.click(screen.getByRole("checkbox"));
};

describe("staff refund review panel", () => {
  beforeEach(() => {
    mocks.access = {
      status: "active",
      permissions: ["payments.view", "payments.refund"],
      locationAccess: { mode: "all" },
    };
    mocks.data = { reviews: [review()], nextCursor: null };
    mocks.query.mockReset().mockImplementation(() => ({
      currentData: mocks.data,
      isFetching: false,
      isError: false,
      refetch: mocks.refetch,
    }));
    mocks.refetch.mockReset().mockResolvedValue({ data: mocks.data });
    mocks.unwrap
      .mockReset()
      .mockResolvedValue({ review: { ...review(), reviewRequired: false } });
    mocks.resolve.mockReset().mockReturnValue({ unwrap: mocks.unwrap });
  });

  it.each([
    { permissions: [], locationAccess: { mode: "all" } },
    {
      permissions: ["payments.view"],
      locationAccess: { mode: "selected", locationIds: ["location-1"] },
    },
    { permissions: ["payments.view"] },
    {
      status: "suspended",
      permissions: ["*"],
      locationAccess: { mode: "all" },
    },
  ])(
    "does not fetch refund data without payment and all-location access: %j",
    (access) => {
      mocks.access = access;
      render(<RefundReviewPanel />);
      expect(mocks.query).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("button", { name: "Record review" }),
      ).not.toBeInTheDocument();
    },
  );

  it("allows payments.view without Connect manage, but hides acknowledgment without payments.refund", () => {
    mocks.access.permissions = ["payments.view"];
    render(<RefundReviewPanel />);
    expect(mocks.query).toHaveBeenCalledWith(null, {
      refetchOnMountOrArgChange: true,
    });
    expect(screen.getByText("$15")).toBeInTheDocument();
    expect(screen.getByText("$5")).toBeInTheDocument();
    expect(screen.getByText("$2")).toBeInTheDocument();
    expect(screen.getByText("order-1")).toBeInTheDocument();
    expect(screen.getByText("#SK-RDER-1")).toBeInTheDocument();
    expect(screen.getByText("Jamie Example")).toBeInTheDocument();
    expect(screen.getByText("Monthly studio pass")).toBeInTheDocument();
    expect(screen.getByText(en.RefundReviews.readOnly)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Record review" }),
    ).not.toBeInTheDocument();
  });

  it("requires an explicit benefit decision, notes and evidence and submits the observed snapshot", async () => {
    render(<RefundReviewPanel />);
    expect(
      screen.getByText(en.RefundReviews.benefitsNotice),
    ).toBeInTheDocument();
    openEditor();
    expect(
      screen.getByRole("button", { name: "Acknowledge review" }),
    ).toBeDisabled();
    completeEditor();
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge review" }));
    await waitFor(() =>
      expect(mocks.resolve).toHaveBeenCalledWith({
        id: "a".repeat(64),
        snapshotVersion: "b".repeat(64),
        note: "Retain the existing customer benefits.",
        evidence: "Support case 123: customer agreement.",
      }),
    );
    expect(await screen.findByText(en.RefundReviews.saved)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("keeps notes and shows an error when saving fails", async () => {
    mocks.unwrap.mockRejectedValue({ status: 500 });
    render(<RefundReviewPanel />);
    openEditor();
    completeEditor();
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge review" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      en.RefundReviews.saveError,
    );
    expect(screen.getByLabelText(en.RefundReviews.note)).toHaveValue(
      " Retain the existing customer benefits. ",
    );
    expect(screen.queryByText(en.RefundReviews.saved)).not.toBeInTheDocument();
  });

  it("discards the stale editor and refreshes after a snapshot conflict", async () => {
    mocks.unwrap.mockRejectedValue({
      status: 409,
      data: { code: "REFUND_REVIEW_CHANGED" },
    });
    render(<RefundReviewPanel />);
    openEditor();
    completeEditor();
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge review" }));
    expect(
      await screen.findByText(en.RefundReviews.changed),
    ).toBeInTheDocument();
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it.each([
    "payment_binding_missing",
    "payment_snapshot_mismatch",
    "provider_snapshot_incomplete",
    "reconciliation_incomplete",
  ])("blocks acknowledgment until %s is repaired", (reason) => {
    mocks.data.reviews[0].reviewReason = reason;
    render(<RefundReviewPanel />);
    expect(screen.getByText(en.RefundReviews.repairNotice)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Record review" }),
    ).not.toBeInTheDocument();
  });

  it("pages unresolved reviews using the server cursor and resets the editor", () => {
    mocks.data.nextCursor = "c".repeat(64);
    render(<RefundReviewPanel />);
    openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(mocks.query).toHaveBeenLastCalledWith("c".repeat(64), {
      refetchOnMountOrArgChange: true,
    });
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "First page" }));
    expect(mocks.query).toHaveBeenLastCalledWith(null, {
      refetchOnMountOrArgChange: true,
    });
  });

  it("renders a load failure rather than claiming the list is empty", () => {
    mocks.query.mockReturnValue({
      currentData: undefined,
      isFetching: false,
      isError: true,
      refetch: mocks.refetch,
    });
    render(<RefundReviewPanel />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      en.RefundReviews.loadError,
    );
    expect(screen.queryByText(en.RefundReviews.empty)).not.toBeInTheDocument();
  });

  it("does not submit duplicate acknowledgments while the first request is pending", async () => {
    let finish;
    mocks.unwrap.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<RefundReviewPanel />);
    openEditor();
    completeEditor();
    const button = screen.getByRole("button", { name: "Acknowledge review" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mocks.resolve).toHaveBeenCalledTimes(1);
    finish({ review: { ...review(), reviewRequired: false } });
    expect(await screen.findByText(en.RefundReviews.saved)).toBeInTheDocument();
  });
});
