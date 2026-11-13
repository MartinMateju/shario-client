import React from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PasswordResetRequest from "@/app/[locale]/tenants/[tenantSlug]/(tenant-auth)/password/page";
import PasswordResetForm from "@/app/[locale]/tenants/[tenantSlug]/(tenant-auth)/password/reset/page";
import PasswordResetSuccess from "@/app/[locale]/tenants/[tenantSlug]/(tenant-auth)/password/success/page";
import InputOTP from "@/components/otp/InputOtp";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  isLoading: false,
  locale: "en",
  passReset: vi.fn(),
  passResetUnwrap: vi.fn(),
  query: new Map(),
  requestReset: vi.fn(),
  requestResetUnwrap: vi.fn(),
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  state: {
    pass: {
      nextPath: "/book?offer=wheel",
      resetToken: "f".repeat(64),
    },
  },
}));

vi.mock("next-intl", async (...args) => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs(
    await (() => ({
      useLocale: () => mocks.locale,
    }))(...args),
  );
});

vi.mock("next/navigation", () => ({
  useParams: () => ({ tenantSlug: "Studio-Alpha" }),
  useSearchParams: () => ({
    get: (key) => mocks.query.get(key) ?? null,
  }),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock("@/i18n/navigation", async () => {
  const { createElement } = await import("react");

  return {
    Link: ({ children, href, ...props }) =>
      createElement("a", { ...props, href }, children),
    useRouter: () => mocks.router,
  };
});

vi.mock("@/components/auth/CustomerPasswordRecoveryShell", async () => {
  const { createElement } = await import("react");

  return {
    default: ({ children, formDescription, formTitle, mode = "recovery" }) =>
      createElement(
        "main",
        { "data-auth-surface": mode },
        createElement("h2", { id: "customer-auth-form-title" }, formTitle),
        createElement("p", null, formDescription),
        children,
      ),
  };
});

vi.mock("@/components/modals/OTPModal", async () => {
  const { createElement } = await import("react");

  return {
    default: ({ email, source }) =>
      createElement(
        "div",
        {
          "data-email": email,
          "data-source": source,
          "data-testid": "otp-modal",
        },
        "OTP ready",
      ),
  };
});

vi.mock("@/hoc/isOptAuth", () => ({
  default: (Component) => Component,
}));

vi.mock("@/lib/features/pass/passApiSlice", () => ({
  usePassResetMutation: () => [mocks.passReset, { isLoading: mocks.isLoading }],
  useRequestPassResetMutation: () => [
    mocks.requestReset,
    { isLoading: mocks.isLoading },
  ],
  useVerifyOtpMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@/utils/tenantRouting", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    buildPlatformUrl: ({ locale }) => `https://shario.io/${locale}/login`,
    getValidatedTenantSlugParam: () => "studio-alpha",
  };
});

beforeEach(() => {
  mocks.dispatch.mockReset();
  mocks.isLoading = false;
  mocks.locale = "en";
  mocks.passReset.mockReset();
  mocks.passResetUnwrap.mockReset();
  mocks.query = new Map();
  mocks.requestReset.mockReset();
  mocks.requestResetUnwrap.mockReset();
  mocks.router.push.mockReset();
  mocks.router.replace.mockReset();
  mocks.state.pass.nextPath = "/book?offer=wheel";
  mocks.state.pass.resetToken = "f".repeat(64);

  mocks.passReset.mockImplementation(() => ({
    unwrap: mocks.passResetUnwrap,
  }));
  mocks.passResetUnwrap.mockResolvedValue({ status: "SUCCESS" });
  mocks.requestReset.mockImplementation(() => ({
    unwrap: mocks.requestResetUnwrap,
  }));
  mocks.requestResetUnwrap.mockResolvedValue({ status: "PENDING" });

  vi.stubGlobal("requestAnimationFrame", (callback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  );
});

describe("customer password recovery", () => {
  it("requests a tenant-scoped code and preserves the platform caller", async () => {
    const user = userEvent.setup();
    mocks.query.set("source", "platform");

    render(<PasswordResetRequest />);

    const email = screen.getByRole("textbox", { name: "E-mail" });
    fireEvent.change(email, { target: { value: " Maker @Example.COM " } });
    await user.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );

    await waitFor(() => {
      expect(mocks.requestReset).toHaveBeenCalledWith({
        email: "maker@example.com",
        locale: "en",
        tenantSlug: "studio-alpha",
      });
    });
    expect(mocks.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "pass/clearTempCredentials",
      }),
    );
    expect(screen.getByTestId("otp-modal")).toHaveAttribute(
      "data-email",
      "maker@example.com",
    );
    expect(screen.getByTestId("otp-modal")).toHaveAttribute(
      "data-source",
      "platform",
    );
    expect(
      screen.getByRole("link", { name: "Back to sign in" }),
    ).toHaveAttribute("href", "https://shario.io/en/login");
  });

  it("announces and focuses invalid request details", async () => {
    const user = userEvent.setup();
    render(<PasswordResetRequest />);

    await user.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );

    const alert = screen.getByRole("alert");
    const email = screen.getByRole("textbox", { name: "E-mail" });
    expect(alert).toHaveTextContent("Enter a valid email address.");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("maxlength", "254");
    expect(mocks.requestReset).not.toHaveBeenCalled();
  });

  it("resets every OTP box when a new code is sent", async () => {
    const onChange = vi.fn();
    const view = render(
      <InputOTP
        key="otp-0"
        autoFocus={false}
        callback={onChange}
        digitLabel={(position) => `Code digit ${position}`}
        length={6}
      />,
    );
    const firstDigit = screen.getByRole("textbox", { name: "Code digit 1" });

    fireEvent.paste(firstDigit, {
      clipboardData: { getData: () => "123456" },
    });

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("123456"));
    expect(
      screen
        .getAllByRole("textbox", { name: /Code digit/ })
        .map((input) => input.value),
    ).toEqual(["1", "2", "3", "4", "5", "6"]);

    view.rerender(
      <InputOTP
        key="otp-1"
        autoFocus={false}
        callback={onChange}
        digitLabel={(position) => `Code digit ${position}`}
        length={6}
      />,
    );

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(""));
    expect(
      screen
        .getAllByRole("textbox", { name: /Code digit/ })
        .map((input) => input.value),
    ).toEqual(["", "", "", "", "", ""]);
  });

  it("updates the password and returns workspace users to platform sign in", async () => {
    const user = userEvent.setup();
    mocks.query.set("source", "platform");
    render(<PasswordResetForm />);

    await user.type(screen.getByLabelText(/^New password/), "StudioPass123");
    await user.type(
      screen.getByLabelText(/^Confirm new password/),
      "StudioPass123",
    );
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    await waitFor(() => {
      expect(mocks.passReset).toHaveBeenCalledWith({
        password: "StudioPass123",
        resetToken: "f".repeat(64),
        tenantSlug: "studio-alpha",
      });
      expect(mocks.router.replace).toHaveBeenCalledWith(
        "/password/success?source=platform",
      );
    });
    expect(screen.getByLabelText(/^New password/)).toHaveAttribute(
      "maxlength",
      "128",
    );
    expect(screen.getByLabelText(/^New password/)).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });

  it("links the platform success state to the central login", () => {
    mocks.query.set("source", "platform");
    render(<PasswordResetSuccess />);

    expect(
      screen.getByRole("heading", { name: "Password updated" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue to sign in" }),
    ).toHaveAttribute("href", "https://shario.io/en/login");
    expect(mocks.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "pass/clearTempCredentials",
      }),
    );
  });
});
