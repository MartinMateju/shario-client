import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const messages = {
      "readiness.ready.title": "Email is ready",
      "readiness.ready.description": "Managed delivery is verified.",
      "readiness.error.title": "Email setup needs attention",
      "readiness.error.description": "Retry the managed sender setup.",
      "identity.fromSummary": "Studio Olivka <studio@notify.shario.io>",
      "identity.defaultName": "Your studio",
      "actions.retrySetup": "Retry setup",
      "actions.retryingSetup": "Retrying",
      "actions.refreshStatus": "Refresh status",
      "actions.refreshingStatus": "Refreshing",
      "actions.dismissSetupAlert": "Dismiss email setup alert",
      "diagnostics.reference": "Setup reference: {code}",
      "diagnostics.lastAttempt": "Last setup attempt",
    };
    return (key, values = {}) =>
      (messages[key] || key).replace(/\{(\w+)\}/g, (_, name) =>
        String(values[name] ?? `{${name}}`),
      );
  },
}));

import EmailReadinessCard from "@/components/communications/email/EmailReadinessCard";

const readySetup = {
  id: "sender-ready",
  mode: "managed",
  readiness: "ready",
  senderName: "Studio Olivka",
  fromAddress: "studio@notify.shario.io",
  replyToEmail: "active@example.com",
  replyToVerifiedAt: "2026-08-01T10:00:00.000Z",
};

const failedSetup = {
  ...readySetup,
  id: "sender-error",
  readiness: "error",
  providerProvisioningStatus: "error",
  providerProvisioningErrorCode: "POSTMARK_1364",
  providerProvisioningAttemptedAt: "2026-08-30T08:30:00.000Z",
  lastError: "X-Postmark-Server-Token=secret",
};

describe("managed email readiness card", () => {
  it("preserves cached ready state when a background refresh fails", () => {
    render(<EmailReadinessCard setup={readySetup} isError />);

    expect(screen.getByText("Email is ready")).toBeInTheDocument();
    expect(
      screen.queryByText("Email setup needs attention"),
    ).not.toBeInTheDocument();
  });

  it("offers only a read-only refresh for a transport error without setup data", () => {
    render(
      <EmailReadinessCard isError onRefresh={vi.fn()} onRetry={vi.fn()} />,
    );

    expect(screen.getByText("Email setup needs attention")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Refresh status" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Retry setup" }),
    ).not.toBeInTheDocument();
  });

  it("shows safe diagnostics and retry for a persisted provisioning error", () => {
    render(
      <EmailReadinessCard
        setup={failedSetup}
        onRefresh={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/POSTMARK_1364/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry setup" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Refresh status" }),
    ).toBeEnabled();
    expect(document.body).not.toHaveTextContent("X-Postmark-Server-Token");
  });

  it("dismisses only the current provisioning error", () => {
    const { rerender } = render(<EmailReadinessCard setup={failedSetup} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss email setup alert" }),
    );
    expect(
      screen.queryByText("Email setup needs attention"),
    ).not.toBeInTheDocument();

    rerender(
      <EmailReadinessCard
        setup={{
          ...failedSetup,
          providerProvisioningAttemptedAt: "2026-08-30T09:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Email setup needs attention")).toBeInTheDocument();
  });

  it("shows the same incident again after a healthy transition", () => {
    const { rerender } = render(<EmailReadinessCard setup={failedSetup} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss email setup alert" }),
    );
    rerender(<EmailReadinessCard setup={readySetup} />);
    expect(screen.getByText("Email is ready")).toBeInTheDocument();

    rerender(<EmailReadinessCard setup={failedSetup} />);
    expect(screen.getByText("Email setup needs attention")).toBeInTheDocument();
  });

  it("shows a transport error again after a successful fetch", () => {
    const { rerender } = render(<EmailReadinessCard isError />);

    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss email setup alert" }),
    );
    rerender(<EmailReadinessCard setup={readySetup} />);
    expect(screen.getByText("Email is ready")).toBeInTheDocument();

    rerender(<EmailReadinessCard isError />);
    expect(screen.getByText("Email setup needs attention")).toBeInTheDocument();
  });
});
