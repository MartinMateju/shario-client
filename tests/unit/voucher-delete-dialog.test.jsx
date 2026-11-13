import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VoucherDeleteDialog, {
  PERPETUAL_VOUCHER_DELETE_CONFIRMATION,
} from "@/components/vouchers/VoucherDeleteDialog";

const api = vi.hoisted(() => ({
  policy: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key) => key }));
vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetProductDeletionPolicyQuery: (...args) => api.policy(...args),
  useDeleteProductMutation: () => [api.remove, { isLoading: false }],
  useUpdateProductMutation: () => [api.update, { isLoading: false }],
}));

function renderDialog(policy = {}, props = {}) {
  api.policy.mockReturnValue({
    data: { canDelete: false, requiresConfirmation: false, ...policy },
    refetch: api.refetch,
  });
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <VoucherDeleteDialog
      product={{
        id: "voucher-1",
        kind: "voucher",
        name: "Clay gift",
        isActive: true,
      }}
      locale="en"
      onClose={onClose}
      onSaved={onSaved}
      {...props}
    />,
  );
  return { onClose, onSaved };
}

describe("voucher offering deletion", () => {
  beforeEach(() => {
    api.remove.mockReset();
    api.update.mockReset();
    api.refetch.mockReset();
    api.remove.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    api.update.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it("requires the exact typed sentence before deleting an offering with perpetual codes", async () => {
    const user = userEvent.setup();
    const { onSaved } = renderDialog({
      reason: "confirmation_required",
      requiresConfirmation: true,
      perpetualCodeCount: 2,
      confirmationText: PERPETUAL_VOUCHER_DELETE_CONFIRMATION,
    });
    expect(api.policy).toHaveBeenCalledWith("voucher-1", {
      refetchOnMountOrArgChange: true,
    });
    const button = screen.getByRole("button", { name: "delete.confirm" });
    const input = screen.getByLabelText("delete.typeConfirmation");
    expect(button).toBeDisabled();
    await user.type(input, PERPETUAL_VOUCHER_DELETE_CONFIRMATION.toLowerCase());
    expect(button).toBeDisabled();
    await user.clear(input);
    await user.type(input, PERPETUAL_VOUCHER_DELETE_CONFIRMATION);
    await user.click(button);
    await waitFor(() =>
      expect(api.remove).toHaveBeenCalledWith({
        id: "voucher-1",
        deleteConfirmation: PERPETUAL_VOUCHER_DELETE_CONFIRMATION,
      }),
    );
    expect(onSaved).toHaveBeenCalledWith("delete.deleted");
  });

  it.each(["unexpired_codes", "pending_orders"])(
    "allows archive only when the policy reports %s",
    async (reason) => {
      const user = userEvent.setup();
      const { onSaved } = renderDialog({
        reason,
        requiresConfirmation: true,
        unexpiredCodeCount: 1,
        perpetualCodeCount: 1,
      });
      expect(
        screen.getByRole("button", { name: "delete.confirm" }),
      ).toBeDisabled();
      expect(
        screen.queryByLabelText("delete.typeConfirmation"),
      ).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "delete.archive" }));
      expect(api.remove).not.toHaveBeenCalled();
      expect(api.update).toHaveBeenCalledWith({
        id: "voucher-1",
        isActive: false,
      });
      await waitFor(() =>
        expect(onSaved).toHaveBeenCalledWith("delete.archived"),
      );
    },
  );

  it("allows deletion without typed confirmation when no blocking codes or orders exist", async () => {
    const user = userEvent.setup();
    renderDialog({ canDelete: true, reason: null });
    await user.click(screen.getByRole("button", { name: "delete.confirm" }));
    expect(api.remove).toHaveBeenCalledWith({ id: "voucher-1" });
  });

  it("keeps the modal open and refreshes the policy when a new order blocks deletion", async () => {
    const user = userEvent.setup();
    api.remove.mockReturnValue({
      unwrap: () =>
        Promise.reject({ data: { message: "An order is still pending" } }),
    });
    const { onClose, onSaved } = renderDialog({
      canDelete: true,
      reason: null,
    });
    await user.click(screen.getByRole("button", { name: "delete.confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("delete.error");
    expect(screen.getByRole("alert")).not.toHaveTextContent(
      "An order is still pending",
    );
    expect(api.refetch).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("disables deletion after policy loading fails and offers retry", async () => {
    const user = userEvent.setup();
    api.policy.mockReturnValue({ isError: true, refetch: api.refetch });
    render(
      <VoucherDeleteDialog
        product={{ id: "voucher-1", name: "Clay gift", isActive: false }}
        locale="en"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "delete.confirm" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("delete.loadError");
    await user.click(screen.getByRole("button", { name: "retry" }));
    expect(api.refetch).toHaveBeenCalled();
    expect(api.remove).not.toHaveBeenCalled();
  });
});
