import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RevokeVoucherDialog from "@/components/vouchers/RevokeVoucherDialog";
import messages from "@/messages/en.json";

const { revoke } = vi.hoisted(() => ({ revoke: vi.fn() }));

vi.mock("@/lib/features/coupons/couponsApiSlice", () => ({
  useRevokePromoCodeMutation: () => [revoke],
}));

const mount = () => {
  const onClose = vi.fn();
  const onRevoked = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <RevokeVoucherDialog
        coupon={{ _id: "coupon-1", promoCode: "ABC-123-DEF" }}
        onClose={onClose}
        onRevoked={onRevoked}
      />
    </NextIntlClientProvider>,
  );
  return { onClose, onRevoked, user: userEvent.setup() };
};

describe("voucher revocation dialog", () => {
  beforeEach(() => revoke.mockReset());

  it("requires a reason and explicit confirmation, then preserves the form and idempotency key after a failed request", async () => {
    revoke.mockReturnValueOnce({
      unwrap: () => Promise.reject({ data: { message: "Please retry" } }),
    });
    revoke.mockReturnValueOnce({
      unwrap: () => Promise.resolve({ success: true }),
    });
    const { user, onClose, onRevoked } = mount();
    const submit = screen.getByRole("button", { name: "Revoke code" });
    expect(submit).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", { name: "Reason" }),
      "Customer request",
    );
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.VoucherFoundation.revoke.error,
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(onRevoked).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Reason" })).toHaveValue(
      "Customer request",
    );
    expect(revoke.mock.calls[0][0]).toMatchObject({
      couponId: "coupon-1",
      reason: "Customer request",
    });
    expect(revoke.mock.calls[0][0].operationId).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i,
    );
    await user.click(submit);
    await waitFor(() => expect(onRevoked).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(revoke.mock.calls[1][0].operationId).toBe(
      revoke.mock.calls[0][0].operationId,
    );
  });

  it("prevents duplicate submission while a revocation is pending", async () => {
    let resolve;
    const response = new Promise((done) => {
      resolve = done;
    });
    revoke.mockReturnValue({ unwrap: () => response });
    const { user, onClose } = mount();
    await user.type(
      screen.getByRole("textbox", { name: "Reason" }),
      "Duplicate voucher",
    );
    await user.click(screen.getByRole("checkbox"));
    const form = screen
      .getByRole("button", { name: "Revoke code" })
      .closest("form");
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Revoking…" })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
    resolve({ success: true });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
