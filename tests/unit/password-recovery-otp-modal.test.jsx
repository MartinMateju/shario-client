import React from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OTPModal from "@/components/modals/OTPModal";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  locale: "en",
  requestLoading: false,
  requestReset: vi.fn(),
  requestUnwrap: vi.fn(),
  router: {
    push: vi.fn(),
  },
  verifyLoading: false,
  verifyOtp: vi.fn(),
  verifyUnwrap: vi.fn(),
}));

vi.mock("next-intl", async (...args) => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs(
    await (() => ({
      useLocale: () => mocks.locale,
    }))(...args),
  );
});

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({
    tenant: {
      name: "Studio Alpha",
      slug: "studio-alpha",
    },
  }),
}));

vi.mock("@/components/public-tenant/publicTenant.config", () => ({
  getPublicTenantTheme: () => ({
    resolvedStylePresetId: "modern-minimal-v1",
    style: {
      "--tenant-accent": "#4056D6",
      "--tenant-accent-foreground": "#FFFFFF",
      "--tenant-accent-link": "#4056D6",
      "--tenant-auth-field-surface": "#F4F3F0",
      "--tenant-auth-field-text": "#1F1F1F",
      "--tenant-auth-form-error": "#B42318",
      "--tenant-auth-form-link": "#4056D6",
      "--tenant-auth-form-muted": "#666660",
      "--tenant-auth-form-surface": "#FFFFFF",
      "--tenant-auth-form-text": "#1F1F1F",
      "--tenant-page-label-color": "#4056D6",
    },
  }),
}));

vi.mock("@/lib/features/pass/passApiSlice", () => ({
  useRequestPassResetMutation: () => [
    mocks.requestReset,
    { isLoading: mocks.requestLoading },
  ],
  useVerifyOtpMutation: () => [
    mocks.verifyOtp,
    { isLoading: mocks.verifyLoading },
  ],
}));

const pasteCode = (code = "123456") => {
  fireEvent.paste(
    screen.getByRole("textbox", { name: "Verification code digit 1" }),
    {
      clipboardData: { getData: () => code },
    },
  );
};

beforeEach(() => {
  mocks.dispatch.mockReset();
  mocks.locale = "en";
  mocks.requestLoading = false;
  mocks.requestReset.mockReset();
  mocks.requestUnwrap.mockReset();
  mocks.requestReset.mockImplementation(() => ({
    unwrap: mocks.requestUnwrap,
  }));
  mocks.requestUnwrap.mockResolvedValue({ status: "PENDING" });
  mocks.router.push.mockReset();
  mocks.verifyLoading = false;
  mocks.verifyOtp.mockReset();
  mocks.verifyUnwrap.mockReset();
  mocks.verifyOtp.mockImplementation(() => ({
    unwrap: mocks.verifyUnwrap,
  }));
  mocks.verifyUnwrap.mockResolvedValue({
    resetToken: "f".repeat(64),
    status: "VERIFIED",
  });
});

describe("password recovery OTP dialog", () => {
  it("verifies six digits and preserves a platform recovery", async () => {
    render(
      <OTPModal
        email="maker@example.com"
        nextPath="/book?offer=wheel"
        source="platform"
        tenantSlug="studio-alpha"
      />,
    );

    pasteCode();
    const submit = screen.getByRole("button", { name: "Continue" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    await waitFor(() => {
      expect(mocks.verifyOtp).toHaveBeenCalledWith({
        email: "maker@example.com",
        otp: "123456",
        tenantSlug: "studio-alpha",
      });
      expect(mocks.router.push).toHaveBeenCalledWith(
        "/password/reset?source=platform",
      );
    });
    expect(mocks.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          email: "maker@example.com",
          nextPath: "/book?offer=wheel",
          resetToken: "f".repeat(64),
        },
        type: "pass/setTempCredentials",
      }),
    );
  });

  it.each([
    [401, "This code is invalid or has expired. Request a new one."],
    [429, "There have been too many attempts. Please try again later."],
  ])(
    "maps a %s verification response to recovery guidance",
    async (status, message) => {
      mocks.verifyUnwrap.mockRejectedValueOnce({ status });
      render(<OTPModal email="maker@example.com" tenantSlug="studio-alpha" />);

      pasteCode();
      const submit = screen.getByRole("button", { name: "Continue" });
      await waitFor(() => expect(submit).toBeEnabled());
      fireEvent.click(submit);

      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(mocks.router.push).not.toHaveBeenCalled();
    },
  );

  it("resends in the URL locale and clears every stale digit", async () => {
    render(
      <OTPModal
        email="maker@example.com"
        resendCooldownSeconds={0}
        tenantSlug="studio-alpha"
      />,
    );

    pasteCode();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));

    await waitFor(() => {
      expect(mocks.requestReset).toHaveBeenCalledWith({
        email: "maker@example.com",
        locale: "en",
        tenantSlug: "studio-alpha",
      });
      expect(screen.getByRole("status")).toHaveTextContent(
        "We sent a new code to your email address.",
      );
    });
    expect(
      screen
        .getAllByRole("textbox", { name: /Verification code digit/ })
        .map((input) => input.value),
    ).toEqual(["", "", "", "", "", ""]);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("blocks verify and resend actions while either request is busy", async () => {
    mocks.requestLoading = true;
    const view = render(
      <OTPModal
        email="maker@example.com"
        resendCooldownSeconds={0}
        tenantSlug="studio-alpha"
      />,
    );

    pasteCode();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    mocks.requestLoading = false;
    mocks.verifyLoading = true;
    view.rerender(
      <OTPModal
        email="maker@example.com"
        resendCooldownSeconds={0}
        tenantSlug="studio-alpha"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Send a new code" }),
    ).toBeDisabled();
  });
});
