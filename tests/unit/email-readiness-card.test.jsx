import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: {},
  updatePreferences: vi.fn(),
}));

vi.mock("react-redux", () => ({ useSelector: () => mocks.access }));
vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useUpdateWorkspacePreferencesMutation: () => [mocks.updatePreferences],
}));

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
      bannerPreferenceSaveError: "Could not save this preference. Try again.",
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
  beforeEach(() => {
    mocks.access = {
      tenantId: "tenant-one",
      userId: "user-one",
      membershipId: "membership-one",
      preferences: {},
    };
    mocks.updatePreferences.mockReset();
    mocks.updatePreferences.mockImplementation((preferences) => ({
      unwrap: async () => {
        mocks.access = {
          ...mocks.access,
          preferences: { ...mocks.access.preferences, ...preferences },
        };
        return { workspaceAccess: mocks.access };
      },
    }));
  });

  it("saves the ready dismissal and keeps it hidden after remounting", async () => {
    const { unmount } = render(<EmailReadinessCard setup={readySetup} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss email setup alert" }),
    );
    await waitFor(() =>
      expect(screen.queryByText("Email is ready")).not.toBeInTheDocument(),
    );
    expect(mocks.updatePreferences).toHaveBeenCalledWith({
      emailReadyBannerDismissed: true,
    });

    unmount();
    render(
      <EmailReadinessCard
        setup={{ ...readySetup, id: "replacement-sender" }}
      />,
    );
    expect(screen.queryByText("Email is ready")).not.toBeInTheDocument();
  });

  it("does not hide errors or another account's ready banner", () => {
    mocks.access.preferences.emailReadyBannerDismissed = true;
    const { rerender } = render(<EmailReadinessCard setup={readySetup} />);
    expect(screen.queryByText("Email is ready")).not.toBeInTheDocument();

    rerender(<EmailReadinessCard setup={failedSetup} />);
    expect(screen.getByText("Email setup needs attention")).toBeVisible();

    mocks.access = {
      tenantId: "tenant-two",
      userId: "user-two",
      membershipId: "membership-two",
      preferences: {},
    };
    rerender(<EmailReadinessCard setup={readySetup} />);
    expect(screen.getByText("Email is ready")).toBeVisible();
  });

  it("keeps the banner visible when saving fails and allows retry", async () => {
    mocks.updatePreferences.mockImplementationOnce(() => ({
      unwrap: () => Promise.reject(new Error("Offline")),
    }));
    render(<EmailReadinessCard setup={readySetup} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss email setup alert" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save this preference. Try again.",
    );
    expect(screen.getByText("Email is ready")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss email setup alert" }),
    );
    await waitFor(() =>
      expect(screen.queryByText("Email is ready")).not.toBeInTheDocument(),
    );
    expect(mocks.updatePreferences).toHaveBeenCalledTimes(2);
  });

  it("disables duplicate dismissal requests while the preference is saving", async () => {
    let resolveSave;
    mocks.updatePreferences.mockImplementationOnce(() => ({
      unwrap: () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    }));
    render(<EmailReadinessCard setup={readySetup} />);
    const close = screen.getByRole("button", {
      name: "Dismiss email setup alert",
    });

    fireEvent.click(close);
    expect(close).toBeDisabled();
    fireEvent.click(close);
    expect(mocks.updatePreferences).toHaveBeenCalledTimes(1);

    await act(async () => resolveSave({}));
    expect(screen.queryByText("Email is ready")).not.toBeInTheDocument();
  });

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
