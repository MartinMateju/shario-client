import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PublicVoucherCatalogPage from "@/components/public-tenant/PublicVoucherCatalogPage";
import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  createOrder: vi.fn(),
  locale: "en",
  products: [],
  query: vi.fn(),
  tenant: null,
  unwrap: vi.fn(),
}));

const translations = {
  "catalog.empty": "Nothing available",
  "catalog.error": "Could not load",
  "catalog.loading": "Loading",
  "catalog.retry": "Retry",
  "vouchers.checkout.continue": "Continue to payment",
  "vouchers.checkout.description": "Continue securely.",
  "vouchers.checkout.email": "Email address",
  "vouchers.checkout.giftMessage": "Gift message (optional)",
  "vouchers.checkout.giftMessageHelp":
    "Printed on every PDF and included in your email.",
  "vouchers.checkout.giftMessageLegacyHelp":
    "Included in the email; this fixed PDF cannot show the message.",
  "vouchers.checkout.giftMessageError":
    "Shorten your gift message or remove unsupported symbols.",
  "vouchers.checkout.error": "Checkout could not be started.",
  "vouchers.checkout.eyebrow": "Secure checkout",
  "vouchers.checkout.missing": "Choose a voucher and enter an email.",
  "vouchers.checkout.quantity": "Quantity",
  "vouchers.checkout.secure": "Verified securely.",
  "vouchers.checkout.starting": "Preparing checkout",
  "vouchers.checkout.title": "Choose your voucher",
  "vouchers.description": "Choose a published voucher.",
  "vouchers.title": "A thoughtful studio gift",
};

vi.mock("next-intl", async (...args) => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs(
    await (() => ({
      useLocale: () => mocks.locale,
      useTranslations:
        (namespace) =>
        (key, values = {}) => {
          const text =
            namespace === "PublicTenant.vouchers.postal"
              ? messages.PublicTenant.vouchers.postal[key]
              : translations[key] || key;
          return Object.entries(values).reduce(
            (value, [name, replacement]) =>
              value.replaceAll(`{${name}}`, replacement),
            text,
          );
        },
    }))(...args),
  );
});

vi.mock("next/navigation", () => ({
  useParams: () => ({ tenantSlug: "studio-olivie" }),
}));

vi.mock("@/components/products/products.utils", () => ({
  formatProductPrice: (product) => `CZK ${product.price}`,
  getProductDescription: (product) => product.description,
  getProductId: (product) => product._id,
  getProductName: (product) => product.name,
}));

vi.mock("@/lib/features/coupons/couponsApiSlice", () => ({
  useCreateCouponOrderMutation: () => [
    (payload) => {
      mocks.createOrder(payload);
      return { unwrap: mocks.unwrap };
    },
    { isLoading: false },
  ],
  useGetCouponsQuery: (...args) => {
    mocks.query(...args);
    return {
      data: mocks.products,
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    };
  },
}));

vi.mock("@/utils/checkoutUrl", () => ({
  getSafeCheckoutUrl: (url) =>
    String(url).startsWith("https://checkout.stripe.com/") ? url : "",
}));

vi.mock("@/utils/tenantRouting", () => ({
  getValidatedTenantSlugParam: () => "studio-olivie",
}));

vi.mock("@/components/public-tenant/PublicCapabilityGate", () => ({
  default: ({ capability, children }) =>
    mocks.tenant.publicCapabilities[capability] === true ? (
      children
    ) : (
      <div data-public-capability-unavailable={capability} />
    ),
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({ tenant: mocks.tenant }),
}));

const tenant = (vouchers = true) => ({
  slug: "studio-olivie",
  name: "Studio Olivie",
  publicCapabilities: { vouchers },
  publicSite: {
    branding: {
      displayName: "Studio Olivie",
      accentColor: "#1F36D4",
      secondaryColor: "#E56F51",
      backgroundColor: "#FCFBF8",
      textColor: "#1F1F1F",
    },
    pages: {
      vouchers: {
        title: { en: "A thoughtful studio gift", cs: "" },
        description: { en: "Choose a published voucher.", cs: "" },
      },
    },
  },
});

describe("public voucher catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.locale = "en";
    mocks.tenant = tenant(true);
    mocks.products = [
      {
        _id: "507f1f77bcf86cd799439012",
        name: "Creative day",
        description: "A day at the studio.",
        type: "coupon",
        voucherTemplate: "templates/creative-day.pdf",
        price: 500,
        currency: "CZK",
        isActive: true,
      },
    ];
    mocks.unwrap.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/session-test",
    });
  });

  const enablePostage = (currency = "CZK", postageFeeMinor = 7500) => {
    mocks.products[0] = {
      ...mocks.products[0],
      currency,
      voucherSettings: { physicalDelivery: { enabled: true, postageFeeMinor } },
    };
  };
  const enterPostalAddress = () => {
    const fields = {
      "First name": " Ada ",
      "Last name": " Nováková ",
      "Street and house number": " Clay street 7 ",
      City: " Brno ",
      "Postal code": "602 00",
      Country: "CZ",
    };
    for (const [label, value] of Object.entries(fields)) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "buyer@example.test" },
    });
  };
  it("defaults an enabled offering to digital and requires a full address only for postal delivery", async () => {
    enablePostage();
    const { container } = render(
      <PublicVoucherCatalogPage onCheckoutRedirect={vi.fn()} />,
    );
    expect(
      screen.getByRole("radio", { name: /Digital voucher/ }),
    ).toBeChecked();
    expect(screen.queryByLabelText("Country")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("radio", { name: /Printed voucher by post/ }),
    );
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "buyer@example.test" },
    });
    expect(screen.getByLabelText("Country")).toBeRequired();
    fireEvent.submit(container.querySelector("form"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "vouchers.postal.addressError",
    );
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(screen.getByLabelText("First name")).toHaveAttribute(
      "maxLength",
      "80",
    );
  });
  it.each([
    ["CZK", 7500, "CZK 1575"],
    ["JPY", 750, "CZK 2250"],
  ])(
    "adds postage only once for a multi-voucher %s order and sends no client-calculated fee",
    async (currency, fee, total) => {
      enablePostage(currency, fee);
      render(<PublicVoucherCatalogPage onCheckoutRedirect={vi.fn()} />);
      fireEvent.click(
        screen.getByRole("radio", { name: /Printed voucher by post/ }),
      );
      enterPostalAddress();
      fireEvent.change(screen.getByLabelText("Quantity"), {
        target: { value: "3" },
      });
      expect(screen.getByText(total)).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: "Continue to payment" }),
      );
      await waitFor(() => expect(mocks.createOrder).toHaveBeenCalledOnce());
      expect(mocks.createOrder.mock.calls[0][0]).toEqual({
        tenantSlug: "studio-olivie",
        productId: mocks.products[0]._id,
        quantity: 3,
        email: "buyer@example.test",
        firstname: "Ada",
        lastname: "Nováková",
        street: "Clay street 7",
        city: "Brno",
        postalCode: "602 00",
        countryCode: "CZ",
        sendPost: true,
        note: "",
        locale: "en",
      });
    },
  );
  it("resets to digital when the offering changes and does not submit the saved postal address", async () => {
    enablePostage();
    mocks.products.push({
      ...mocks.products[0],
      _id: "digital-2",
      name: "Digital gift",
      voucherSettings: undefined,
    });
    render(<PublicVoucherCatalogPage onCheckoutRedirect={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("radio", { name: /Printed voucher by post/ }),
    );
    enterPostalAddress();
    fireEvent.click(screen.getByRole("button", { name: /Digital gift/ }));
    expect(
      screen.queryByRole("radio", { name: /Printed voucher by post/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to payment" }),
    );
    await waitFor(() => expect(mocks.createOrder).toHaveBeenCalledOnce());
    expect(mocks.createOrder.mock.calls[0][0]).toMatchObject({
      productId: "digital-2",
      sendPost: false,
      firstname: "",
      street: "",
    });
    expect(mocks.createOrder.mock.calls[0][0]).not.toHaveProperty(
      "countryCode",
    );
  });
  it("locks the displayed purchase while checkout is pending and prevents duplicate submits", async () => {
    enablePostage();
    let complete;
    mocks.unwrap.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    const { container } = render(
      <PublicVoucherCatalogPage onCheckoutRedirect={vi.fn()} />,
    );
    fireEvent.click(
      screen.getByRole("radio", { name: /Printed voucher by post/ }),
    );
    enterPostalAddress();
    fireEvent.submit(container.querySelector("form"));
    expect(screen.getByRole("button", { name: /Creative day/ })).toBeDisabled();
    expect(screen.getByLabelText("Quantity")).toBeDisabled();
    expect(screen.getByLabelText("Country")).toBeDisabled();
    expect(screen.getByLabelText("Email address")).toBeDisabled();
    expect(screen.getByLabelText("Gift message (optional)")).toBeDisabled();
    fireEvent.submit(container.querySelector("form"));
    expect(mocks.createOrder).toHaveBeenCalledOnce();
    complete({ url: "https://checkout.stripe.com/c/pay/session-test" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Continue to payment" }),
      ).toBeEnabled(),
    );
  });
  it("explains when the server disables postal delivery before checkout", async () => {
    enablePostage();
    mocks.unwrap.mockRejectedValue({
      data: { code: "VOUCHER_PHYSICAL_DELIVERY_UNAVAILABLE" },
    });
    render(<PublicVoucherCatalogPage onCheckoutRedirect={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("radio", { name: /Printed voucher by post/ }),
    );
    enterPostalAddress();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to payment" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "vouchers.postal.unavailable",
    );
    expect(
      screen.getByRole("radio", { name: /Digital voucher/ }),
    ).toBeEnabled();
  });

  it("submits the strict guest payload and redirects only to a safe checkout", async () => {
    const redirect = vi.fn();
    mocks.locale = "pt_PT";
    render(<PublicVoucherCatalogPage onCheckoutRedirect={redirect} />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "guest@example.test" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to payment" }),
    );

    await waitFor(() =>
      expect(mocks.createOrder).toHaveBeenCalledWith({
        tenantSlug: "studio-olivie",
        productId: "507f1f77bcf86cd799439012",
        quantity: 1,
        firstname: "",
        lastname: "",
        email: "guest@example.test",
        street: "",
        city: "",
        postalCode: "",
        sendPost: false,
        note: "",
        locale: "pt-PT",
      }),
    );
    await waitFor(() =>
      expect(redirect).toHaveBeenCalledWith(
        "https://checkout.stripe.com/c/pay/session-test",
      ),
    );
  });

  it("skips the public request when the published capability is disabled", () => {
    mocks.tenant = tenant(false);
    const { container } = render(
      <PublicVoucherCatalogPage onCheckoutRedirect={vi.fn()} />,
    );

    expect(mocks.query).toHaveBeenCalledWith(
      { tenantSlug: "studio-olivie" },
      { skip: true },
    );
    expect(container.querySelector("[data-public-voucher-catalog]")).toBeNull();
    expect(
      container.querySelector(
        '[data-public-capability-unavailable="vouchers"]',
      ),
    ).toBeTruthy();
  });

  it("allows checkout for an editor design without a PDF template and excludes offerings without either", async () => {
    const redirect = vi.fn();
    const base = mocks.products[0];
    mocks.products = [
      {
        ...base,
        _id: "507f1f77bcf86cd799439013",
        name: "Designed clay gift",
        voucherTemplate: undefined,
        hasVoucherDesign: true,
      },
      {
        ...base,
        _id: "507f1f77bcf86cd799439014",
        name: "Missing artwork",
        voucherTemplate: undefined,
        hasVoucherDesign: false,
      },
      {
        ...base,
        _id: "507f1f77bcf86cd799439015",
        name: "Invalid design flag",
        voucherTemplate: " ",
        hasVoucherDesign: "true",
      },
    ];
    render(<PublicVoucherCatalogPage onCheckoutRedirect={redirect} />);

    expect(
      screen.getByRole("button", { name: /Designed clay gift/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Missing artwork")).not.toBeInTheDocument();
    expect(screen.queryByText("Invalid design flag")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "gift@example.test" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to payment" }),
    );

    await waitFor(() =>
      expect(mocks.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: "507f1f77bcf86cd799439013",
          email: "gift@example.test",
          tenantSlug: "studio-olivie",
          quantity: 1,
          sendPost: false,
        }),
      ),
    );
    await waitFor(() =>
      expect(redirect).toHaveBeenCalledWith(
        "https://checkout.stripe.com/c/pay/session-test",
      ),
    );
  });

  it("shows an empty catalog when no offering has a valid design or PDF template", () => {
    mocks.products = [
      {
        ...mocks.products[0],
        voucherTemplate: "",
        hasVoucherDesign: false,
      },
    ];
    render(<PublicVoucherCatalogPage onCheckoutRedirect={vi.fn()} />);

    expect(screen.getByText("Nothing available")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Continue to payment" }),
    ).not.toBeInTheDocument();
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("keeps visitors on the page when checkout returns an unsafe URL", async () => {
    const redirect = vi.fn();
    mocks.unwrap.mockResolvedValue({ url: "javascript:alert(1)" });
    render(<PublicVoucherCatalogPage onCheckoutRedirect={redirect} />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "guest@example.test" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to payment" }),
    );

    expect(
      await screen.findByRole("alert", {
        name: "",
      }),
    ).toHaveTextContent("Checkout could not be started.");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends an optional gift message for every voucher and shows the quantity-adjusted total", async () => {
    mocks.products[0].hasVoucherDesign = true;
    render(<PublicVoucherCatalogPage onCheckoutRedirect={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "buyer@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Quantity"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Gift message (optional)"), {
      target: { value: "  Všechno nejlepší, Emi!  " },
    });
    expect(screen.getByLabelText("Gift message (optional)")).toHaveAttribute(
      "maxlength",
      "240",
    );
    expect(
      screen.getByText("Printed on every PDF and included in your email."),
    ).toBeInTheDocument();
    expect(screen.getByText("CZK 1500")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to payment" }),
    );
    await waitFor(() =>
      expect(mocks.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 3,
          giftMessage: "Všechno nejlepší, Emi!",
          email: "buyer@example.test",
        }),
      ),
    );
  });

  it("explains that gift messages are email-only for an uploaded PDF", () => {
    render(<PublicVoucherCatalogPage />);
    expect(
      screen.getByText(
        "Included in the email; this fixed PDF cannot show the message.",
      ),
    ).toBeInTheDocument();
  });

  it("gives an actionable error when the message cannot render on the voucher", async () => {
    mocks.unwrap.mockRejectedValue({
      data: { code: "VOUCHER_DESIGN_UNSUPPORTED_CHARACTER" },
    });
    const redirect = vi.fn();
    render(<PublicVoucherCatalogPage onCheckoutRedirect={redirect} />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "buyer@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Gift message (optional)"), {
      target: { value: "A gift 🎉" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to payment" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Shorten your gift message or remove unsupported symbols.",
    );
    expect(screen.getByLabelText("Gift message (optional)")).toHaveValue(
      "A gift 🎉",
    );
    expect(redirect).not.toHaveBeenCalled();
  });
});
