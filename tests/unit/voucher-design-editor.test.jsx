import { useCallback, useState } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import VoucherDesignEditor from "@/components/vouchers/editor/VoucherDesignEditor";
import {
  buildVoucherPreviewPayload,
  downloadVoucherPdf,
  isVoucherDesignValid,
} from "@/components/vouchers/editor/voucherDesign";
import {
  PUBLIC_TENANT_FONT_PRESET_ORDER,
  PUBLIC_TENANT_FONT_PRESET_REGISTRY,
} from "@/components/public-tenant/publicTenantStylePresets";

const api = vi.hoisted(() => ({
  defaults: vi.fn(),
  upload: vi.fn(),
  preview: vi.fn(),
  download: vi.fn(),
  changed: vi.fn(),
  busy: vi.fn(),
  valid: vi.fn(),
}));
vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetVoucherDesignDefaultsQuery: () => api.defaults(),
  useUploadVoucherDesignAssetMutation: () => [api.upload, { isLoading: false }],
  usePreviewVoucherDesignMutation: () => [api.preview, { isLoading: false }],
  useDownloadVoucherDesignPdfMutation: () => [
    api.download,
    { isLoading: false },
  ],
}));

const baseDesign = {
  version: 1,
  layout: "split",
  colors: { background: "#F5EEE6", text: "#242C28", accent: "#405747" },
  typography: { font: "sans", titleWeight: "bold" },
  content: {
    brandName: "Studio Klei",
    title: "Gift voucher",
    subtitle: "Time to create.",
    message: "Make something of your own.",
    footer: "atelierklei.cz",
  },
  assets: { logoKey: null, imageKey: null },
  imageFit: "cover",
};
const success = (result) => ({
  unwrap: () => Promise.resolve(result),
  abort: vi.fn(),
});
function Harness({ initial = structuredClone(baseDesign), price = "1500" }) {
  const [value, setValue] = useState(initial);
  const change = useCallback((next) => {
    api.changed(next);
    setValue(next);
  }, []);
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <VoucherDesignEditor
        value={value}
        onChange={change}
        onInitialize={setValue}
        onBusyChange={api.busy}
        onValidationChange={api.valid}
        productName="Pottery voucher"
        price={price}
        currency="CZK"
        validity={{ mode: "months", months: 12 }}
        locale="en"
      />
    </NextIntlClientProvider>
  );
}

describe("voucher design editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.defaults.mockReturnValue({
      data: { design: baseDesign },
      isLoading: false,
      refetch: vi.fn(),
    });
    api.preview.mockImplementation(() =>
      success({
        svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>Sample</text></svg>',
      }),
    );
    api.upload.mockImplementation(() =>
      success({
        key: "tenants/one/voucher-design/photo.png",
        url: "https://assets.test/photo.png",
      }),
    );
    api.download.mockImplementation(() =>
      success({ base64: btoa("sample pdf") }),
    );
  });

  it("edits colors, typography and text and sends automatic metadata to the isolated preview", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.clear(screen.getByLabelText("Voucher title"));
    await user.type(screen.getByLabelText("Voucher title"), "A day with clay");
    fireEvent.change(screen.getByLabelText("Background hex color"), {
      target: { value: "#FFCCAA" },
    });
    await user.selectOptions(
      screen.getByLabelText("Font style"),
      "editorial-serif-v1",
    );
    await user.selectOptions(screen.getByLabelText("Title weight"), "regular");
    expect(api.changed.mock.lastCall[0]).toMatchObject({
      colors: { background: "#FFCCAA" },
      typography: { font: "editorial-serif-v1", titleWeight: "regular" },
      content: { title: "A day with clay" },
    });
    await waitFor(() => expect(api.preview).toHaveBeenCalled(), {
      timeout: 1800,
    });
    expect(api.preview.mock.lastCall[0]).toMatchObject({
      amountMinor: 150000,
      currency: "CZK",
      validity: { mode: "months", months: 12 },
      design: { content: { title: "A day with clay" } },
    });
    const preview = await screen.findByRole("img", {
      name: "Voucher design preview",
    });
    expect(preview.src).toMatch(/^data:image\/svg\+xml/);
    expect(container.querySelector("text")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /code|value|expiry/i }),
    ).not.toBeInTheDocument();
  });

  it("uploads a photo with its purpose, preserves it on failed replacement, and removes it explicitly", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const file = new File(["photo"], "photo.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Right-side photo"), file);
    await waitFor(() => expect(api.changed).toHaveBeenCalled());
    const uploaded = api.upload.mock.calls[0][0];
    expect(uploaded.get("file")).toBe(file);
    expect(uploaded.get("purpose")).toBe("image");
    expect(api.changed.mock.lastCall[0].assets.imageKey).toBe(
      "tenants/one/voucher-design/photo.png",
    );
    await user.selectOptions(screen.getByLabelText("Photo fit"), "contain");
    api.upload.mockImplementationOnce(() => ({
      unwrap: () => Promise.reject({ data: { message: "Upload failed" } }),
    }));
    await user.upload(screen.getByLabelText("Right-side photo"), file);
    expect(await screen.findByRole("alert")).toHaveTextContent("Upload failed");
    expect(api.changed.mock.lastCall[0]).toMatchObject({
      assets: { imageKey: "tenants/one/voucher-design/photo.png" },
      imageFit: "contain",
    });
    await user.click(
      screen.getByRole("button", { name: "Remove Right-side photo" }),
    );
    expect(api.changed.mock.lastCall[0].assets.imageKey).toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("makes the right-panel photo the first design control and replaces it without changing the logo or saved fit", async () => {
    const user = userEvent.setup();
    const initial = {
      ...baseDesign,
      assets: {
        logoKey: "tenants/one/logo.png",
        imageKey: "tenants/one/old-photo.png",
      },
      imageFit: "contain",
    };
    const { container } = render(<Harness initial={initial} />);
    const input = screen.getByLabelText("Right-side photo");
    expect(container.querySelector("input")).toBe(input);
    expect(input).toHaveAccessibleDescription(/right half from top to bottom/);
    expect(screen.getByText("Change photo")).toBeVisible();
    expect(screen.getByText(/The amount is not printed/)).toBeVisible();
    await user.upload(
      input,
      new File(["replacement"], "new-photo.webp", { type: "image/webp" }),
    );
    await waitFor(() => expect(api.changed).toHaveBeenCalled());
    expect(api.changed.mock.lastCall[0]).toEqual({
      ...initial,
      assets: {
        ...initial.assets,
        imageKey: "tenants/one/voucher-design/photo.png",
      },
    });
    await waitFor(() =>
      expect(api.preview.mock.lastCall[0].design.assets).toEqual({
        logoKey: "tenants/one/logo.png",
        imageKey: "tenants/one/voucher-design/photo.png",
      }),
    );
    expect(screen.getByLabelText("Photo fit")).toHaveValue("contain");
  });

  it("inherits the text color for legacy designs without adding a title override", async () => {
    render(<Harness />);
    expect(screen.getByLabelText("Main title hex color")).toHaveValue(
      baseDesign.colors.text,
    );
    expect(
      screen.queryByRole("button", { name: "Use text color" }),
    ).not.toBeInTheDocument();
    expect(api.changed).not.toHaveBeenCalled();
    await waitFor(() => expect(api.preview).toHaveBeenCalled());
    expect(api.preview.mock.lastCall[0].design.colors).not.toHaveProperty(
      "title",
    );

    fireEvent.change(screen.getByLabelText("Text hex color"), {
      target: { value: "#123456" },
    });
    expect(screen.getByLabelText("Main title hex color")).toHaveValue(
      "#123456",
    );
    await waitFor(() =>
      expect(api.preview.mock.lastCall[0].design.colors).toEqual({
        ...baseDesign.colors,
        text: "#123456",
      }),
    );
  });

  it("previews and downloads an independent title color without changing other colors", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Main title"), {
      target: { value: "#3264AB" },
    });
    await waitFor(() =>
      expect(api.preview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          design: {
            ...baseDesign,
            colors: { ...baseDesign.colors, title: "#3264ab" },
          },
        }),
      ),
    );
    fireEvent.change(screen.getByLabelText("Text hex color"), {
      target: { value: "#654321" },
    });
    expect(screen.getByLabelText("Main title hex color")).toHaveValue(
      "#3264ab",
    );
    api.download.mockReturnValueOnce({ unwrap: () => new Promise(() => {}) });
    await user.click(
      screen.getByRole("button", { name: "Download sample PDF" }),
    );
    expect(api.download).toHaveBeenCalledWith(
      expect.objectContaining({
        design: {
          ...baseDesign,
          colors: {
            ...baseDesign.colors,
            text: "#654321",
            title: "#3264ab",
          },
        },
      }),
    );
  });

  it("blocks invalid title colors and resets the override to the current text color", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={{
          ...baseDesign,
          colors: { ...baseDesign.colors, title: "#123456" },
        }}
      />,
    );
    await screen.findByRole("img", { name: "Voucher design preview" });
    fireEvent.change(screen.getByLabelText("Main title hex color"), {
      target: { value: "#BAD" },
    });
    expect(screen.getByLabelText("Main title hex color")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    const download = screen.getByRole("button", {
      name: "Download sample PDF",
    });
    expect(download).toBeDisabled();
    expect(api.valid).toHaveBeenLastCalledWith(false);
    await user.click(download);
    expect(api.download).not.toHaveBeenCalled();
    expect(
      screen.getByRole("img", { name: "Voucher design preview" }),
    ).toBeVisible();

    fireEvent.change(screen.getByLabelText("Text hex color"), {
      target: { value: "#654321" },
    });
    await user.click(screen.getByRole("button", { name: "Use text color" }));
    expect(api.changed.mock.lastCall[0].colors).not.toHaveProperty("title");
    expect(screen.getByLabelText("Main title hex color")).toHaveValue(
      "#654321",
    );
    expect(
      screen.queryByRole("button", { name: "Use text color" }),
    ).not.toBeInTheDocument();
    expect(download).toBeEnabled();
    await waitFor(() =>
      expect(api.preview.mock.lastCall[0].design.colors).toEqual({
        ...baseDesign.colors,
        text: "#654321",
      }),
    );
  });

  it.each(
    [
      null,
      undefined,
      "",
      "#ABC",
      "#12345G",
      "red",
      123456,
      ["#123456"],
      { title: "#123456" },
    ].map((title) => ({ title })),
  )("rejects an explicitly invalid title color: $title", ({ title }) => {
    expect(
      isVoucherDesignValid({
        ...baseDesign,
        colors: { ...baseDesign.colors, title },
      }),
    ).toBe(false);
  });

  it("offers the website builder fonts and preserves an existing legacy font", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const fontSelect = screen.getByLabelText("Font style");
    expect(Array.from(fontSelect.options, (option) => option.value)).toEqual([
      ...PUBLIC_TENANT_FONT_PRESET_ORDER,
      "sans",
    ]);
    expect(
      Array.from(fontSelect.options, (option) => option.textContent),
    ).toEqual(["Manrope", "Editorial Serif", "Warm Serif", "Modern sans"]);
    expect(fontSelect).toHaveValue("sans");
    await user.selectOptions(fontSelect, "warm-serif-v1");
    await waitFor(() =>
      expect(api.preview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          design: expect.objectContaining({
            typography: { font: "warm-serif-v1", titleWeight: "bold" },
          }),
        }),
      ),
    );
  });

  it("accepts every website font and saved legacy designs but rejects unknown fonts", () => {
    for (const font of [
      ...Object.keys(PUBLIC_TENANT_FONT_PRESET_REGISTRY),
      "sans",
      "serif",
      "mono",
    ]) {
      expect(
        isVoucherDesignValid({
          ...baseDesign,
          typography: { ...baseDesign.typography, font },
        }),
      ).toBe(true);
    }
    expect(
      isVoucherDesignValid({
        ...baseDesign,
        typography: { ...baseDesign.typography, font: "unknown" },
      }),
    ).toBe(false);
  });

  it("waits for an entered price instead of requesting a zero-value preview", async () => {
    const { rerender } = render(<Harness price="" />);
    expect(
      screen.getByRole("button", { name: "Download sample PDF" }),
    ).toBeDisabled();
    expect(api.preview).not.toHaveBeenCalled();
    rerender(<Harness price="1700" />);
    await waitFor(() =>
      expect(api.preview).toHaveBeenLastCalledWith(
        expect.objectContaining({ amountMinor: 170000 }),
      ),
    );
    expect(
      screen.getByRole("button", { name: "Download sample PDF" }),
    ).toBeEnabled();
  });

  it("blocks invalid uploads and communicates an in-flight upload to the product form", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<Harness />);
    await user.upload(
      screen.getByLabelText("Logo"),
      new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("JPEG, PNG or WebP");
    expect(api.upload).not.toHaveBeenCalled();
    let resolveUpload;
    api.upload.mockImplementationOnce(() => ({
      unwrap: () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
      abort: vi.fn(),
    }));
    await user.upload(
      screen.getByLabelText("Logo"),
      new File(["png"], "logo.png", { type: "image/png" }),
    );
    await waitFor(() => expect(api.busy).toHaveBeenLastCalledWith(true));
    expect(screen.getByLabelText("Voucher title")).toBeDisabled();
    await act(async () =>
      resolveUpload({ key: "tenants/one/voucher-design/logo.png" }),
    );
    await waitFor(() => expect(api.busy).toHaveBeenLastCalledWith(false));
  });

  it("restores tenant defaults only after confirmation and can keep edits", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.clear(screen.getByLabelText("Voucher title"));
    await user.type(screen.getByLabelText("Voucher title"), "Custom gift");
    await user.click(
      screen.getByRole("button", { name: "Restore studio defaults" }),
    );
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText("Voucher title")).toHaveValue("Custom gift");
    await user.click(
      screen.getByRole("button", { name: "Restore studio defaults" }),
    );
    await user.click(screen.getByRole("button", { name: "Restore defaults" }));
    expect(screen.getByLabelText("Voucher title")).toHaveValue("Gift voucher");
  });

  it("disables PDF generation for invalid colors and resumes without losing valid preview", async () => {
    render(<Harness />);
    await screen.findByRole("img", { name: "Voucher design preview" });
    fireEvent.change(screen.getByLabelText("Text hex color"), {
      target: { value: "#BAD" },
    });
    expect(
      screen.getByRole("button", { name: "Download sample PDF" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("img", { name: "Voucher design preview" }),
    ).toBeVisible();
    expect(api.valid).toHaveBeenLastCalledWith(false);
    fireEvent.change(screen.getByLabelText("Text hex color"), {
      target: { value: "#333333" },
    });
    expect(
      screen.getByRole("button", { name: "Download sample PDF" }),
    ).toBeEnabled();
  });

  it("loads tenant defaults without treating initialization as an edit", async () => {
    render(<Harness initial={null} />);
    expect(await screen.findByLabelText("Voucher title")).toHaveValue(
      "Gift voucher",
    );
    expect(api.changed).not.toHaveBeenCalled();
  });

  it("downloads binary PDF content and releases the browser URL", async () => {
    vi.useFakeTimers();
    const create = vi.fn(() => "blob:voucher");
    const revoke = vi.fn();
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = create;
        static revokeObjectURL = revoke;
      },
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    try {
      downloadVoucherPdf(btoa("%PDF-1.7\nfixture"));
      expect(create.mock.calls[0][0]).toBeInstanceOf(Blob);
      expect(create.mock.calls[0][0].type).toBe("application/pdf");
      expect(click).toHaveBeenCalledOnce();
      expect(revoke).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(revoke).toHaveBeenCalledWith("blob:voucher");
      expect(
        document.querySelector('a[download="voucher-sample.pdf"]'),
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it("uses currency-aware minor units and rejects invalid or unsafe amounts", () => {
    const props = {
      design: baseDesign,
      productName: "Gift",
      price: "1200",
      currency: "JPY",
      validity: { mode: "none" },
      locale: "en",
    };
    expect(buildVoucherPreviewPayload(props).amountMinor).toBe(1200);
    expect(
      buildVoucherPreviewPayload({ ...props, currency: "CZK", price: "12.50" })
        .amountMinor,
    ).toBe(1250);
    expect(buildVoucherPreviewPayload({ ...props, price: "-1" })).toBeNull();
    expect(buildVoucherPreviewPayload({ ...props, price: "1e100" })).toBeNull();
    for (const price of ["", "  ", null, undefined, false]) {
      expect(buildVoucherPreviewPayload({ ...props, price })).toBeNull();
    }
    expect(
      buildVoucherPreviewPayload({ ...props, price: "0" }).amountMinor,
    ).toBe(0);
  });
});
