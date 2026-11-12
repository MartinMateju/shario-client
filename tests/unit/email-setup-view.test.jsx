import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  requestVerification: vi.fn(),
  confirmVerification: vi.fn(),
  retry: vi.fn(),
  testSetup: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const messages = {
      "readiness.ready.title": "Email is ready",
      "readiness.ready.description": "Managed delivery is verified.",
      "readiness.error.title": "Email setup needs attention",
      "readiness.error.description": "Retry the managed sender setup.",
      "readiness.provisioning.title": "Preparing managed sender",
      "readiness.provisioning.description": "Status refreshes automatically.",
      "identity.fromSummary": "Studio Olivka <studio@notify.shario.io>",
      "identity.defaultName": "Your studio",
      "setup.title": "Managed email identity",
      "setup.description": "Managed through Postmark.",
      "fields.senderName": "Sender name",
      "fields.senderNamePlaceholder": "Studio Olivka",
      "fields.fromAddress": "Sent from",
      "fields.fromAddressPending": "Assigned after saving",
      "fields.fromAddressHint": "Managed and read-only.",
      "fields.replyTo": "Reply-To email",
      "fields.replyToHint": "Replies arrive externally.",
      "verification.active": "Verified Reply-To: {email}",
      "verification.currentRemainsActive":
        "Current active@example.com remains active.",
      "verification.pending": "Enter the code sent to new@example.com.",
      "verification.code": "Six-digit verification code",
      "verification.codePlaceholder": "000000",
      "actions.confirmCode": "Verify code",
      "actions.confirming": "Verifying",
      "actions.resendCode": "Resend code",
      "actions.sendTest": "Send test email",
      "actions.testing": "Testing",
      "actions.saveSetup": "Save setup",
      "actions.saving": "Saving",
      "actions.retrySetup": "Retry setup",
      "actions.retryingSetup": "Retrying",
      "actions.refreshStatus": "Refresh status",
      "actions.refreshingStatus": "Refreshing",
      "diagnostics.reference": "Setup reference: {code}",
      "diagnostics.lastAttempt": "Last setup attempt",
      "feedback.refreshed": "Email setup status was refreshed.",
      "feedback.retryStarted": "Email setup retry started.",
      "feedback.retryCompleted": "Email setup was recovered.",
      "errors.refresh": "Email setup status could not be refreshed.",
      "errors.retry": "Email setup could not be retried.",
    };
    return (key, values = {}) =>
      (messages[key] || key).replace(/\{(\w+)\}/g, (_, name) =>
        String(values[name] ?? `{${name}}`),
      );
  },
}));

vi.mock(
  "@/lib/features/communicationEmailSetup/communicationEmailSetupApiSlice",
  () => ({
    useGetCommunicationEmailSetupQuery: () => ({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useCreateCommunicationEmailSetupMutation: () => [
      mocks.create,
      { isLoading: false },
    ],
    useUpdateCommunicationEmailSetupMutation: () => [
      mocks.update,
      { isLoading: false },
    ],
    useRequestCommunicationReplyToVerificationMutation: () => [
      mocks.requestVerification,
      { isLoading: false },
    ],
    useRetryCommunicationEmailSetupMutation: () => [
      mocks.retry,
      { isLoading: false },
    ],
    useConfirmCommunicationReplyToVerificationMutation: () => [
      mocks.confirmVerification,
      { isLoading: false },
    ],
    useTestCommunicationEmailSetupMutation: () => [
      mocks.testSetup,
      { isLoading: false },
    ],
  }),
);

import EmailSetupView from "@/components/communications/email/EmailSetupView";

const failedSetup = {
  id: "sender-error",
  mode: "managed",
  readiness: "error",
  senderName: "Studio Olivka",
  fromAddress: "studio@notify.shario.io",
  replyToEmail: "active@example.com",
  replyToVerifiedAt: "2026-08-01T10:00:00.000Z",
  providerProvisioningStatus: "error",
  providerProvisioningErrorCode: "POSTMARK_1364",
  providerProvisioningAttemptedAt: "2026-08-30T08:30:00.000Z",
  lastError: "X-Postmark-Server-Token=secret",
};

const replacementPending = {
  id: "sender-1",
  mode: "managed",
  readiness: "ready",
  senderName: "Studio Olivka",
  fromAddress: "studio@notify.shario.io",
  replyToEmail: "active@example.com",
  pendingReplyToEmail: "new@example.com",
  replyToVerifiedAt: "2026-08-01T10:00:00.000Z",
};

describe("managed Email setup view", () => {
  beforeEach(() => {
    for (const mutation of Object.values(mocks)) {
      mutation.mockReset();
      mutation.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    }
  });

  it("shows the pending replacement flow without a managed From input", () => {
    render(<EmailSetupView setup={replacementPending} canManage />);

    expect(screen.queryByLabelText("Sent from")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Reply-To email")).toHaveValue(
      "new@example.com",
    );
    expect(
      screen.getByText(/active@example.com remains active/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Six-digit verification code")).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Send test email" }),
    ).toBeEnabled();

    const text = document.body.textContent;
    expect(text).not.toMatch(/SMTP|password|port|provider/i);
  });

  it.each([undefined, null, ""])(
    "shows the saved Reply-To when the pending address is %s",
    (pendingReplyToEmail) => {
      render(
        <EmailSetupView
          setup={{ ...replacementPending, pendingReplyToEmail }}
          canManage
        />,
      );

      expect(screen.getByLabelText("Reply-To email")).toHaveValue(
        "active@example.com",
      );
      expect(
        screen.getByText("Verified Reply-To: active@example.com"),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save setup" })).toBeEnabled();
    },
  );

  it("keeps the verified address in the input after the status refresh", async () => {
    const user = userEvent.setup();
    const verifiedSetup = {
      ...replacementPending,
      replyToEmail: "new@example.com",
      pendingReplyToEmail: "",
    };
    const onChanged = vi.fn(async () => {
      rerender(
        <EmailSetupView
          setup={verifiedSetup}
          canManage
          onChanged={onChanged}
        />,
      );
    });
    const { rerender } = render(
      <EmailSetupView
        setup={replacementPending}
        canManage
        onChanged={onChanged}
      />,
    );

    await user.type(
      screen.getByLabelText("Six-digit verification code"),
      "123456",
    );
    await user.click(screen.getByRole("button", { name: "Verify code" }));

    await screen.findByText("Verified Reply-To: new@example.com");
    expect(mocks.confirmVerification).toHaveBeenCalledWith({
      id: "sender-1",
      code: "123456",
    });
    expect(onChanged).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Reply-To email")).toHaveValue(
      "new@example.com",
    );
    expect(
      screen.queryByLabelText("Six-digit verification code"),
    ).not.toBeInTheDocument();
  });

  it("preserves an explicitly cleared Reply-To draft when setup refreshes", async () => {
    const user = userEvent.setup();
    const savedSetup = { ...replacementPending, pendingReplyToEmail: "" };
    const { rerender } = render(
      <EmailSetupView setup={savedSetup} canManage />,
    );

    await user.clear(screen.getByLabelText("Reply-To email"));
    rerender(<EmailSetupView setup={{ ...savedSetup }} canManage />);

    expect(screen.getByLabelText("Reply-To email")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Save setup" })).toBeDisabled();
  });

  it("disables every mutating setup action for read-only users", () => {
    render(<EmailSetupView setup={replacementPending} canManage={false} />);

    expect(screen.getByLabelText("Sender name")).toBeDisabled();
    expect(screen.getByLabelText("Reply-To email")).toBeDisabled();
    expect(screen.getByLabelText("Six-digit verification code")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Verify code" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Resend code" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Send test email" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save setup" })).toBeDisabled();
  });

  it("retries provisioning without mutating the identity or unsaved draft", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn().mockResolvedValue();
    mocks.retry.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          ...failedSetup,
          readiness: "provisioning",
          providerProvisioningStatus: "pending",
          providerProvisioningErrorCode: "",
        }),
    });

    render(
      <EmailSetupView setup={failedSetup} canManage onChanged={onChanged} />,
    );

    expect(screen.getByText(/POSTMARK_1364/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("X-Postmark-Server-Token");

    const senderName = screen.getByLabelText("Sender name");
    await user.type(senderName, " draft");
    await user.click(screen.getByRole("button", { name: "Retry setup" }));
    await screen.findByText("Email setup retry started.");

    expect(mocks.retry).toHaveBeenCalledWith("sender-error");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.requestVerification).not.toHaveBeenCalled();
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(senderName).toHaveValue("Studio Olivka draft");
  });

  it("refetches after a failed retry without exposing the backend error", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn().mockResolvedValue();
    mocks.retry.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: { message: "X-Postmark-Server-Token=secret" },
        }),
    });

    render(
      <EmailSetupView setup={failedSetup} canManage onChanged={onChanged} />,
    );

    await user.click(screen.getByRole("button", { name: "Retry setup" }));

    const alert = await screen.findByRole("alert");
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(alert).toHaveTextContent("Email setup could not be retried.");
    expect(document.body).not.toHaveTextContent("X-Postmark-Server-Token");
  });

  it("refreshes status without retrying provisioning", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn().mockResolvedValue();

    render(
      <EmailSetupView setup={failedSetup} canManage onChanged={onChanged} />,
    );

    await user.click(screen.getByRole("button", { name: "Refresh status" }));
    await screen.findByText("Email setup status was refreshed.");

    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(mocks.retry).not.toHaveBeenCalled();
  });

  it("does not request a new code when reverting to the verified Reply-To", async () => {
    const user = userEvent.setup();
    mocks.update.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          ...replacementPending,
          pendingReplyToEmail: null,
        }),
    });

    render(<EmailSetupView setup={replacementPending} canManage />);

    const replyTo = screen.getByLabelText("Reply-To email");
    await user.clear(replyTo);
    await user.type(replyTo, "active@example.com");
    await user.click(screen.getByRole("button", { name: "Save setup" }));

    expect(mocks.update).toHaveBeenCalledWith({
      id: "sender-1",
      senderName: "Studio Olivka",
      replyToEmail: "active@example.com",
    });
    expect(mocks.requestVerification).not.toHaveBeenCalled();
  });
});
