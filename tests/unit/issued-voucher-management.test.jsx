import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PromoCodesTable from "@/components/tables/PromoCodesTable";
import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  products: vi.fn(),
  create: vi.fn(),
  archive: vi.fn(),
  restore: vi.fn(),
  revoke: vi.fn(),
  listError: false,
  totalPages: 1,
  access: null,
  coupons: [],
  offerings: [
    {
      _id: "archived-1",
      kind: "voucher",
      name: "Archived voucher",
      isActive: false,
      price: 500,
      currency: "CZK",
    },
    {
      _id: "value-1",
      kind: "voucher",
      name: "Value voucher",
      price: 500,
      currency: "CZK",
    },
    {
      _id: "experience-1",
      kind: "voucher",
      name: "Experience voucher",
      price: 600,
      currency: "CZK",
      voucherSettings: { type: "experience" },
    },
  ],
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        workspaceAccess: mocks.access,
        userInfo: { email: "owner@example.com" },
      },
      language: { language: "EN" },
    }),
}));

vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetAllProductsQuery: (...args) => {
    mocks.products(...args);
    return { data: mocks.offerings, isLoading: false };
  },
}));

vi.mock("@/lib/features/coupons/couponsApiSlice", () => ({
  useGetPromoCodesWithFiltersMutation: () => [
    mocks.list,
    {
      data: {
        coupons: mocks.coupons,
        totalCount: mocks.coupons.length,
        totalPages: mocks.totalPages,
      },
      isError: mocks.listError,
    },
  ],
  useCreateManualPromoCodeMutation: () => [mocks.create, { isLoading: false }],
  useRevokePromoCodeMutation: () => [mocks.revoke],
  useArchivePromoCodeMutation: () => [mocks.archive],
  useRestorePromoCodeMutation: () => [mocks.restore],
}));

vi.mock("@/components/modals/ConformationModal", () => ({
  default: ({ title, message, onClose, onConfirm, confirmText }) => (
    <section role="dialog" aria-label={title}>
      {message}
      <button onClick={onClose}>Close</button>
      <button onClick={onConfirm}>{confirmText || "OK"}</button>
    </section>
  ),
}));

const mount = (props = {}) => {
  const result = render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <PromoCodesTable {...props} />
    </NextIntlClientProvider>,
  );
  return Object.assign(userEvent.setup(), {
    rerenderView: (nextProps) =>
      result.rerender(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
          <PromoCodesTable {...nextProps} />
        </NextIntlClientProvider>,
      ),
  });
};

describe("issued voucher management", () => {
  beforeEach(() => {
    mocks.list
      .mockReset()
      .mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mocks.products.mockClear();
    mocks.create.mockReset();
    mocks.archive.mockReset();
    mocks.restore.mockReset();
    mocks.revoke.mockReset();
    mocks.listError = false;
    mocks.totalPages = 1;
    mocks.coupons = [];
    mocks.access = { role: "owner", status: "active", permissions: ["*"] };
  });

  it("shows refund review on both layouts and offers no revoke action for blocked codes", () => {
    mocks.coupons = [
      {
        _id: "coupon-review",
        promoCode: "ABC-123-DEF",
        isActive: true,
        refundReviewRequired: true,
        expiresAt: null,
        productNameSnapshot: "Gift voucher",
        valueMinorSnapshot: 50000,
        currencySnapshot: "CZK",
      },
    ];
    mount();
    expect(screen.getAllByText("Needs review")).toHaveLength(3);
    expect(
      screen.queryByRole("button", { name: "Revoke code" }),
    ).not.toBeInTheDocument();
  });

  it("requires an explicit recipient, keeps failed manual issuance reviewable, and retries with the same operation ID", async () => {
    mocks.create.mockReturnValue({
      unwrap: () =>
        Promise.reject({ data: { message: "Delivery address rejected" } }),
    });
    const user = mount();
    expect(mocks.products).toHaveBeenCalledWith(
      { kind: "voucher" },
      { skip: false },
    );
    await user.click(screen.getByRole("button", { name: "Create code" }));
    const dialog = within(screen.getByRole("dialog"));
    const recipient = dialog.getByRole("textbox", { name: "Recipient email" });
    expect(recipient).toHaveValue("");
    expect(
      dialog.queryByRole("option", { name: /Experience voucher/ }),
    ).not.toBeInTheDocument();
    expect(
      dialog.queryByRole("option", { name: /Archived voucher/ }),
    ).not.toBeInTheDocument();
    await user.click(
      dialog.getByRole("button", { name: "Create", exact: true }),
    );
    expect(mocks.create).not.toHaveBeenCalled();
    await user.selectOptions(dialog.getByRole("combobox"), "value-1");
    await user.type(recipient, "recipient@example.com");
    await user.click(
      dialog.getByRole("button", { name: "Create", exact: true }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The voucher could not be issued. Please try again.",
    );
    expect(recipient).toHaveValue("recipient@example.com");
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      productId: "value-1",
      email: "recipient@example.com",
    });
    await user.click(
      dialog.getByRole("button", { name: "Create", exact: true }),
    );
    expect(mocks.create.mock.calls[1][0].operationId).toBe(
      mocks.create.mock.calls[0][0].operationId,
    );
  });

  it("does not reset the search while typing or expose issuance to a viewer", async () => {
    mocks.access = {
      role: "viewer",
      status: "active",
      permissions: ["vouchers.view"],
    };
    const user = mount();
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(1));
    expect(mocks.list.mock.calls[0][0].isActive).toBe("all");
    expect(mocks.products).toHaveBeenCalledWith(
      { kind: "voucher" },
      { skip: true },
    );
    expect(
      screen.queryByRole("button", { name: "Create code" }),
    ).not.toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Search codes" }),
      "ABC-123-DEF",
    );
    expect(mocks.list).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByRole("button", { name: "Search", exact: true }),
    );
    expect(mocks.list.mock.calls[1][0].search).toBe("ABC-123-DEF");
  });

  it("keeps exact offering scope through search, clearing and manual issuance", async () => {
    mocks.create.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          promoCode: "NEW-123-ABC",
          email: "recipient@example.com",
          valueMinorSnapshot: 50000,
          currencySnapshot: "CZK",
        }),
    });
    const user = mount({
      productId: "value-1",
      productName: "Wheel course voucher",
    });
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("heading", { name: "Codes · Wheel course voucher" }),
    ).toBeVisible();
    expect(mocks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        productId: "value-1",
        isActive: "all",
        archiveState: "unarchived",
      }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Search codes" }), {
      target: { value: "CUSTOMER" },
    });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Archive" }),
      "all",
    );
    await user.click(
      screen.getByRole("button", { name: "Search", exact: true }),
    );
    expect(mocks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        productId: "value-1",
        search: "CUSTOMER",
        archiveState: "all",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(mocks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        productId: "value-1",
        search: "",
        archiveState: "unarchived",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Create code" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(
      dialog.getByRole("combobox", { name: "Voucher offering" }),
    ).toHaveValue("value-1");
    expect(
      dialog.getByRole("combobox", { name: "Voucher offering" }),
    ).toBeDisabled();
    fireEvent.change(dialog.getByRole("textbox", { name: "Recipient email" }), {
      target: { value: "recipient@example.com" },
    });
    await user.click(
      dialog.getByRole("button", { name: "Create", exact: true }),
    );
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "value-1" }),
    );
    expect(mocks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ productId: "value-1" }),
    );
    expect(screen.getByText("NEW-123-ABC")).toBeVisible();
  });

  it("shows purchased and manual codes with original and remaining value, and archives independently from revocation", async () => {
    mocks.coupons = [
      {
        _id: "purchased",
        promoCode: "BUY-123-ABC",
        productNameSnapshot: "Wheel course",
        order: { email: "buyer@example.com" },
        originalValueMinor: 150000,
        remainingValueMinor: 40000,
        currency: "CZK",
        status: "partially_redeemed",
        canArchive: true,
        canRevoke: false,
      },
      {
        _id: "manual",
        promoCode: "MAN-123-ABC",
        productNameSnapshot: "Wheel course",
        order: { email: "gift@example.com" },
        originalValueMinor: 150000,
        remainingValueMinor: 150000,
        currency: "CZK",
        status: "active",
        canArchive: true,
        canRevoke: true,
      },
    ];
    mocks.archive.mockReturnValueOnce({
      unwrap: () => Promise.reject({ data: { message: "Retry archive" } }),
    });
    mocks.archive.mockReturnValueOnce({
      unwrap: () => Promise.resolve({ voucher: {} }),
    });
    const user = mount();
    const table = within(screen.getByRole("table"));
    expect(table.getByText("BUY-123-ABC")).toBeVisible();
    expect(table.getByText("MAN-123-ABC")).toBeVisible();
    expect(table.getByText("CZK 400")).toBeVisible();
    expect(
      within(table.getByText("BUY-123-ABC").closest("tr")).queryByRole(
        "button",
        { name: "Revoke code" },
      ),
    ).not.toBeInTheDocument();
    expect(
      within(table.getByText("MAN-123-ABC").closest("tr")).getByRole("button", {
        name: "Revoke code",
      }),
    ).toBeVisible();
    expect(table.getByText("buyer@example.com")).toBeVisible();
    await user.click(table.getAllByRole("button", { name: "Archive code" })[0]);
    const dialog = within(
      screen.getByRole("dialog", { name: "Archive voucher code?" }),
    );
    expect(dialog.getByText(/holder can still redeem it/)).toBeVisible();
    await user.click(dialog.getByRole("button", { name: "Archive code" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The code could not be updated. Please try again.",
    );
    await user.click(dialog.getByRole("button", { name: "Archive code" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(mocks.archive.mock.calls[1][0]).toEqual(
      mocks.archive.mock.calls[0][0],
    );
    expect(mocks.archive.mock.calls[0][0]).toMatchObject({
      couponId: "purchased",
      operationId: expect.any(String),
    });
    expect(mocks.revoke).not.toHaveBeenCalled();
    expect(mocks.list).toHaveBeenCalledTimes(2);
  });

  it("restores an archived active code without changing its lifecycle", async () => {
    mocks.coupons = [
      {
        _id: "archived",
        promoCode: "OLD-123-ABC",
        status: "active",
        archivedAt: "2026-10-01T12:00:00Z",
        canRestore: true,
        originalValueMinor: 50000,
        remainingValueMinor: 50000,
        currency: "CZK",
      },
    ];
    mocks.restore.mockReturnValue({
      unwrap: () => Promise.resolve({ voucher: {} }),
    });
    const user = mount();
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Active")).toBeVisible();
    expect(table.getByText("Archived")).toBeVisible();
    await user.click(table.getByRole("button", { name: "Restore code" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Restore code",
      }),
    );
    await waitFor(() => expect(mocks.restore).toHaveBeenCalledOnce());
    expect(mocks.archive).not.toHaveBeenCalled();
    expect(mocks.revoke).not.toHaveBeenCalled();
  });

  it("returns to page one after archiving the last code on a later page", async () => {
    mocks.totalPages = 2;
    mocks.coupons = [
      {
        _id: "last",
        promoCode: "END-123-ABC",
        status: "reserved",
        canArchive: true,
        canRevoke: false,
      },
    ];
    mocks.archive.mockReturnValue({
      unwrap: () => Promise.resolve({ voucher: {} }),
    });
    const user = mount({ productId: "value-1" });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(mocks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    expect(
      screen.queryByRole("button", { name: "Revoke code" }),
    ).not.toBeInTheDocument();
    await user.click(
      within(screen.getByRole("table")).getByRole("button", {
        name: "Archive code",
      }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Archive code",
      }),
    );
    await waitFor(() =>
      expect(mocks.list).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          productId: "value-1",
          archiveState: "unarchived",
        }),
      ),
    );
  });

  it("uses applied filters for pagination and removes product scope in All codes", async () => {
    mocks.totalPages = 2;
    const user = mount({ productId: "value-1" });
    await waitFor(() => expect(mocks.list).toHaveBeenCalledOnce());
    await user.type(
      screen.getByRole("textbox", { name: "Search codes" }),
      "draft only",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(mocks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, search: "", productId: "value-1" }),
    );
    user.rerenderView({});
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(3));
    expect(mocks.list.mock.calls[2][0]).not.toHaveProperty("productId");
    expect(screen.getByRole("textbox", { name: "Search codes" })).toHaveValue(
      "",
    );
  });

  it("keeps scoped retry usable after a failed list and denies users without voucher access", async () => {
    mocks.listError = true;
    const user = mount({ productId: "value-1" });
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ productId: "value-1" }),
    );
    expect(screen.getByRole("textbox", { name: "Search codes" })).toBeEnabled();
    mocks.access = {
      role: "custom",
      status: "active",
      permissions: ["products.view", "products.manage"],
    };
    mocks.list.mockClear();
    user.rerenderView({ productId: "another-offering" });
    expect(
      screen.getByText("You do not have permission to view voucher codes."),
    ).toBeVisible();
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
