import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import SentEmailLogsTable from "../../src/components/tables/email_notifications/SentEmailLogsTable";
import { useGetCommunicationEmailLogsQuery } from "../../src/lib/features/communicationEmailLogs/communicationEmailLogsApiSlice";
import cs from "../../src/messages/cs.json";
import en from "../../src/messages/en.json";
import nl from "../../src/messages/nl.json";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
const resendState = vi.hoisted(() => ({ access: null, retry: vi.fn() }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentWorkspaceAccess: () => resendState.access,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.params,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock(
  "../../src/lib/features/communicationEmailLogs/communicationEmailLogsApiSlice",
  () => ({
    useGetCommunicationEmailLogsQuery: vi.fn(),
    useRetryCommunicationEmailLogMutation: () => [resendState.retry],
  }),
);

beforeEach(() => {
  resendState.access = null;
  resendState.retry.mockReset();
});

const catalogs = { cs, en, nl };

function renderHistory({ locale = "en", emailType, status = "delivered" }) {
  const data = {
    logs: [
      {
        _id: "booking-lifecycle-log",
        automation: null,
        recipientEmail: "ceramics@example.test",
        recipientName: "Alex Potter",
        subject: "Your studio booking has changed",
        emailType,
        status,
        sentAt: status === "delivered" ? "2026-10-22T10:00:00Z" : null,
        scheduledFor: "2026-10-22T10:00:00Z",
      },
    ],
    totalCount: 1,
  };
  vi.mocked(useGetCommunicationEmailLogsQuery).mockReturnValue({
    data,
    currentData: data,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={catalogs[locale]}
      timeZone="Europe/Prague"
    >
      <SentEmailLogsTable />
    </NextIntlClientProvider>,
  );
  return [
    within(screen.getByRole("table")),
    within(screen.getByRole("article")),
  ];
}
describe("booking lifecycle email history", () => {
  beforeEach(() => {
    navigation.params = new URLSearchParams();
  });
  it.each([
    ["en", "bookingCancelled", "Booking cancellation"],
    ["en", "bookingRescheduled", "Booking rescheduled"],
    ["cs", "bookingCancelled", "Zrušení rezervace"],
    ["cs", "bookingRescheduled", "Přesun rezervace"],
    ["nl", "bookingCancelled", "Annulering van boeking"],
    ["nl", "bookingRescheduled", "Boeking verplaatst"],
  ])(
    "labels %s %s in the real desktop and mobile history",
    (locale, emailType, label) => {
      const views = renderHistory({
        locale,
        emailType,
      });
      const messages = catalogs[locale].EmailAutomations.history;
      for (const view of views) {
        expect(view.getByText(label)).toBeInTheDocument();
        expect(view.queryByText(emailType)).not.toBeInTheDocument();
        expect(view.getByText("ceramics@example.test")).toBeInTheDocument();
        expect(view.getByText(messages.statuses.delivered)).toBeInTheDocument();
        expect(
          view.queryByText(messages.statuses.canceled),
        ).not.toBeInTheDocument();
      }
      expect(views[0].getByText(messages.systemEmail)).toBeInTheDocument();
    },
  );
  it.each([
    ["failed", "Failed"],
    ["ambiguous", "Status unclear"],
  ])(
    "keeps cancellation separate from the %s delivery status",
    (status, label) => {
      const views = renderHistory({
        emailType: "bookingCancelled",
        status,
      });
      for (const view of views) {
        expect(view.getByText("Booking cancellation")).toBeInTheDocument();
        expect(view.getByText(label)).toBeInTheDocument();
        expect(view.queryByText("Delivered")).not.toBeInTheDocument();
        expect(view.queryByText("Canceled")).not.toBeInTheDocument();
      }
    },
  );
});
const historyLogs = Array.from(
  {
    length: 45,
  },
  (_, index) => {
    const number = 45 - index;
    return {
      _id: `log-${number}`,
      recipientEmail: `member-${String(number).padStart(3, "0")}@example.test`,
      recipientName: `Member ${number}`,
      subject: `Booking message ${number}`,
      emailType: "bookingCancelled",
      status: number % 2 === 0 ? "failed" : "delivered",
      sentAt: new Date(Date.UTC(2026, 9, 22, 10, number)).toISOString(),
      scheduledFor: new Date(Date.UTC(2026, 9, 22, 9, number)).toISOString(),
    };
  },
);
const pageResponse = (
  { page = 1, limit = 20, search = "", status = "all" },
  logs = historyLogs,
) => {
  const matching = logs.filter(
    (log) =>
      (status === "all" || log.status === status) &&
      (!search || log.recipientEmail.includes(search)),
  );
  return {
    logs: matching.slice((page - 1) * limit, page * limit),
    totalCount: matching.length,
    totalPages: Math.ceil(matching.length / limit),
    currentPage: page,
    pageSize: limit,
  };
};
function historyElement(locale = "en") {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={catalogs[locale]}
      timeZone="Europe/Prague"
    >
      <SentEmailLogsTable />
    </NextIntlClientProvider>
  );
}
function mockPaginatedHistory(getResult = () => ({})) {
  const refetch = vi.fn();
  vi.mocked(useGetCommunicationEmailLogsQuery).mockImplementation((query) => {
    const data = pageResponse(query);
    return {
      data,
      currentData: data,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch,
      ...getResult(query),
    };
  });
  return refetch;
}
const nextButtons = () =>
  screen.getAllByRole("button", {
    name: en.EmailAutomations.history.pagination.next,
  });
const previousButtons = () =>
  screen.getAllByRole("button", {
    name: en.EmailAutomations.history.pagination.previous,
  });
const desktopRows = () =>
  within(screen.getByRole("table")).getAllByRole("row").slice(1);
describe("email delivery history pagination", () => {
  const originalScrollIntoView = Object.getOwnPropertyDescriptor(
    Element.prototype,
    "scrollIntoView",
  );
  beforeAll(() => {
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });
  afterAll(() => {
    if (originalScrollIntoView) {
      Object.defineProperty(
        Element.prototype,
        "scrollIntoView",
        originalScrollIntoView,
      );
    } else {
      delete Element.prototype.scrollIntoView;
    }
  });
  beforeEach(() => {
    navigation.params = new URLSearchParams();
    vi.mocked(useGetCommunicationEmailLogsQuery).mockReset();
  });
  it("requests the newest twenty deliveries and navigates all 45 records without losing the last page", () => {
    mockPaginatedHistory();
    render(historyElement());
    expect(useGetCommunicationEmailLogsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
      }),
      expect.any(Object),
    );
    expect(desktopRows()).toHaveLength(20);
    expect(
      screen.getByText("Showing 1–20 of 45 email deliveries", {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(20);
    expect(
      within(desktopRows()[0]).getByText("member-045@example.test"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("member-025@example.test"),
    ).not.toBeInTheDocument();
    expect(previousButtons()).toHaveLength(2);
    previousButtons().forEach((button) => expect(button).toBeDisabled());
    expect(nextButtons()).toHaveLength(2);
    fireEvent.click(nextButtons()[0]);
    expect(useGetCommunicationEmailLogsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 20,
      }),
      expect.any(Object),
    );
    expect(desktopRows()).toHaveLength(20);
    expect(
      screen.getByText("Showing 21–40 of 45 email deliveries", {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      within(desktopRows()[0]).getByText("member-025@example.test"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("member-045@example.test"),
    ).not.toBeInTheDocument();
    previousButtons().forEach((button) => expect(button).toBeEnabled());
    fireEvent.click(nextButtons()[1]);
    expect(desktopRows()).toHaveLength(5);
    expect(
      screen.getByText("Showing 41–45 of 45 email deliveries", {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(5);
    expect(
      within(desktopRows()[4]).getByText("member-001@example.test"),
    ).toBeInTheDocument();
    nextButtons().forEach((button) => expect(button).toBeDisabled());
    fireEvent.click(previousButtons()[1]);
    expect(desktopRows()).toHaveLength(20);
    expect(
      within(desktopRows()[0]).getByText("member-025@example.test"),
    ).toBeInTheDocument();
  });
  it("starts new status and search filters on page one and paginates only matching deliveries", () => {
    mockPaginatedHistory();
    render(historyElement());
    fireEvent.click(nextButtons()[0]);
    fireEvent.change(
      screen.getByRole("combobox", {
        name: en.EmailAutomations.history.statusLabel,
      }),
      {
        target: {
          value: "failed",
        },
      },
    );
    expect(useGetCommunicationEmailLogsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
        status: "failed",
      }),
      expect.any(Object),
    );
    expect(desktopRows()).toHaveLength(20);
    fireEvent.click(nextButtons()[0]);
    expect(desktopRows()).toHaveLength(2);
    nextButtons().forEach((button) => expect(button).toBeDisabled());
    fireEvent.change(
      screen.getByRole("textbox", {
        name: en.EmailAutomations.history.searchLabel,
      }),
      {
        target: {
          value: "member-04",
        },
      },
    );
    expect(useGetCommunicationEmailLogsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
        status: "failed",
        search: "member-04",
      }),
      expect.any(Object),
    );
    expect(desktopRows()).toHaveLength(3);
    expect(
      screen.queryByText("member-002@example.test"),
    ).not.toBeInTheDocument();
    previousButtons().forEach((button) => expect(button).toBeDisabled());
    nextButtons().forEach((button) => expect(button).toBeDisabled());
  });
  it("does not display the previous page as the next page while its request is pending", () => {
    let pending = true;
    mockPaginatedHistory((query) =>
      query.page === 2 && pending
        ? {
            data: pageResponse({
              page: 1,
              limit: 20,
            }),
            currentData: undefined,
            isFetching: true,
          }
        : {},
    );
    const view = render(historyElement());
    fireEvent.click(nextButtons()[0]);
    expect(screen.getByRole("status")).toHaveTextContent(
      en.EmailAutomations.history.loading,
    );
    expect(
      screen.queryByText("member-045@example.test"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    nextButtons().forEach((button) => expect(button).toBeDisabled());
    previousButtons().forEach((button) => expect(button).toBeDisabled());
    pending = false;
    view.rerender(historyElement());
    expect(
      within(desktopRows()[0]).getByText("member-025@example.test"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(en.EmailAutomations.history.loading),
    ).not.toBeInTheDocument();
  });
  it("retains a retry action when a later page fails without showing stale deliveries", () => {
    let failed = true;
    const refetch = mockPaginatedHistory((query) =>
      query.page === 2 && failed
        ? {
            data: pageResponse({
              page: 1,
              limit: 20,
            }),
            currentData: undefined,
            isError: true,
          }
        : {},
    );
    const view = render(historyElement());
    fireEvent.click(nextButtons()[0]);
    expect(screen.getByRole("alert")).toHaveTextContent(
      en.EmailAutomations.history.error,
    );
    expect(
      screen.queryByText("member-045@example.test"),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: en.EmailAutomations.history.retry,
      }),
    );
    expect(refetch).toHaveBeenCalledOnce();
    failed = false;
    view.rerender(historyElement());
    expect(
      within(desktopRows()[0]).getByText("member-025@example.test"),
    ).toBeInTheDocument();
  });
  it("returns to the last available page when refreshed totals shrink", async () => {
    let retainedLogs = historyLogs;
    mockPaginatedHistory((query) => {
      const data = pageResponse(query, retainedLogs);
      return {
        data,
        currentData: data,
      };
    });
    const view = render(historyElement());
    fireEvent.click(nextButtons()[0]);
    fireEvent.click(nextButtons()[0]);
    expect(desktopRows()).toHaveLength(5);
    retainedLogs = historyLogs.slice(0, 21);
    view.rerender(historyElement());
    await waitFor(() =>
      expect(useGetCommunicationEmailLogsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 20,
        }),
        expect.any(Object),
      ),
    );
    expect(desktopRows()).toHaveLength(1);
    expect(
      within(desktopRows()[0]).getByText("member-025@example.test"),
    ).toBeInTheDocument();
    nextButtons().forEach((button) => expect(button).toBeDisabled());
  });
});

const retryableLog = {
  _id: "retry-log",
  recipientEmail: "member@example.test",
  recipientName: "Alex Parker",
  subject: "Your booking has been rescheduled",
  emailType: "bookingRescheduled",
  status: "suppressed",
  sentAt: null,
  scheduledFor: "2026-11-16T10:00:00Z",
  canRetry: true,
  manualRetryCount: 2,
  reasonCode: "not_sent",
  retryBlockedReason: null,
};

function renderResendHistory({
  log = retryableLog,
  locale = "en",
  permissions = ["communications.send"],
} = {}) {
  resendState.access = { permissions };
  const data = { logs: [log], totalCount: 1 };
  vi.mocked(useGetCommunicationEmailLogsQuery).mockReturnValue({
    data,
    currentData: data,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
  return render(historyElement(locale));
}

async function openResendDialog(user, { mobile = false, locale = "en" } = {}) {
  const copy = catalogs[locale].EmailAutomations.history.resend;
  const view = within(screen.getByRole(mobile ? "article" : "table"));
  await user.click(
    view.getByRole("button", { name: new RegExp(copy.actionMenu) }),
  );
  await user.click(await screen.findByRole("menuitem", { name: copy.action }));
  return within(await screen.findByRole("dialog", { name: copy.title }));
}

describe("manual retry from email history", () => {
  beforeEach(() => {
    navigation.params = new URLSearchParams();
  });

  it.each(["en", "cs", "nl"])(
    "shows the localized unsent reason in both %s layouts",
    (locale) => {
      renderResendHistory({ locale });
      const copy = catalogs[locale].EmailAutomations.history;
      for (const role of ["table", "article"]) {
        const view = within(screen.getByRole(role));
        expect(view.getByText(copy.statuses.suppressed)).toBeInTheDocument();
        expect(
          view.getByText(copy.reasons.not_sent, { exact: false }),
        ).toBeInTheDocument();
        expect(
          view.getByRole("button", {
            name: new RegExp(copy.resend.actionMenu),
          }),
        ).toBeEnabled();
      }
    },
  );

  it.each([
    ["failed", "delivery_failed", "consent_revoked", "consent_revoked"],
    [
      "canceled",
      "source_changed",
      "recipient_ineligible",
      "recipient_ineligible",
    ],
    ["suppressed", "hard_bounce", "recipient_suppressed", "hard_bounce"],
    ["suppressed", "spam_complaint", "recipient_suppressed", "spam_complaint"],
    ["delivered", null, "already_sent", null],
  ])(
    "shows the current retry block for %s without obscuring specific suppression",
    (status, reasonCode, retryBlockedReason, expectedReason) => {
      renderResendHistory({
        log: {
          ...retryableLog,
          canRetry: false,
          status,
          reasonCode,
          retryBlockedReason,
        },
      });
      const copy = en.EmailAutomations.history;
      for (const role of ["table", "article"]) {
        const view = within(screen.getByRole(role));
        if (expectedReason) {
          expect(
            view.getByText(copy.reasons[expectedReason], { exact: false }),
          ).toBeInTheDocument();
        } else {
          expect(
            view.queryByText(copy.reasons.already_sent, { exact: false }),
          ).not.toBeInTheDocument();
        }
        if (reasonCode && reasonCode !== expectedReason) {
          expect(
            view.queryByText(copy.reasons[reasonCode], { exact: false }),
          ).not.toBeInTheDocument();
        }
      }
    },
  );

  it.each([
    ["missing eligibility", { canRetry: undefined }],
    [
      "already delivered",
      { canRetry: false, status: "delivered", reasonCode: null },
    ],
    ["in flight", { canRetry: false, status: "queued", reasonCode: null }],
    [
      "unclear outcome",
      {
        canRetry: false,
        status: "ambiguous",
        reasonCode: "delivery_outcome_unknown",
      },
    ],
    ["blocked recipient", { canRetry: false, reasonCode: "hard_bounce" }],
    ["expired content", { canRetry: false, reasonCode: "content_unavailable" }],
  ])("does not offer resend for %s", (_label, overrides) => {
    renderResendHistory({ log: { ...retryableLog, ...overrides } });
    expect(
      screen.queryByRole("button", {
        name: new RegExp(en.EmailAutomations.history.resend.actionMenu),
      }),
    ).not.toBeInTheDocument();
    expect(resendState.retry).not.toHaveBeenCalled();
  });

  it("keeps view-only members from sending, even when the log is eligible", () => {
    renderResendHistory({ permissions: ["communications.view"] });
    expect(
      screen.queryByRole("button", {
        name: new RegExp(en.EmailAutomations.history.resend.actionMenu),
      }),
    ).not.toBeInTheDocument();
  });

  it("allows communications managers to open the confirmation", async () => {
    const user = userEvent.setup();
    renderResendHistory({ permissions: ["communications.manage"] });
    const dialog = await openResendDialog(user);
    expect(dialog.getByText(retryableLog.recipientEmail)).toBeVisible();
    expect(dialog.getByText(retryableLog.subject)).toBeVisible();
    expect(resendState.retry).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "cancels without sending from the mobile=%s action menu",
    async (mobile) => {
      const user = userEvent.setup();
      renderResendHistory();
      const dialog = await openResendDialog(user, { mobile });
      const cancel = dialog
        .getAllByRole("button", {
          name: en.EmailAutomations.history.resend.cancel,
        })
        .at(-1);
      await user.click(cancel);
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(resendState.retry).not.toHaveBeenCalled();
    },
  );

  it.each([true, false])(
    "confirms the reviewed log and reports queued=%s accurately",
    async (queued) => {
      const user = userEvent.setup();
      resendState.retry.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            log: { ...retryableLog, canRetry: false },
            queued,
          }),
      });
      renderResendHistory();
      const dialog = await openResendDialog(user);
      await user.click(
        dialog.getByRole("button", {
          name: en.EmailAutomations.history.resend.confirm,
        }),
      );
      expect(resendState.retry).toHaveBeenCalledExactlyOnceWith({
        id: "retry-log",
        expectedManualRetryCount: 2,
      });
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        en.EmailAutomations.history.resend[queued ? "queued" : "scheduled"],
      );
    },
  );

  it("uses one submission lock and retains the reviewed snapshot while polling", async () => {
    const user = userEvent.setup();
    let resolveRetry;
    resendState.retry.mockReturnValue({
      unwrap: () =>
        new Promise((resolve) => {
          resolveRetry = resolve;
        }),
    });
    const rendered = renderResendHistory();
    const dialog = await openResendDialog(user);
    const updatedData = {
      logs: [
        { ...retryableLog, manualRetryCount: 3, subject: "Updated subject" },
      ],
      totalCount: 1,
    };
    vi.mocked(useGetCommunicationEmailLogsQuery).mockReturnValue({
      data: updatedData,
      currentData: updatedData,
    });
    rendered.rerender(historyElement());
    expect(dialog.getByText(retryableLog.subject)).toBeInTheDocument();
    const confirm = dialog.getByRole("button", {
      name: en.EmailAutomations.history.resend.confirm,
    });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(resendState.retry).toHaveBeenCalledExactlyOnceWith({
      id: "retry-log",
      expectedManualRetryCount: 2,
    });
    expect(
      dialog.getByRole("button", {
        name: en.EmailAutomations.history.resend.submitting,
      }),
    ).toBeDisabled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await act(async () =>
      resolveRetry({ log: updatedData.logs[0], queued: true }),
    );
  });

  it.each([
    ["COMMUNICATION_EMAIL_RETRY_STALE", undefined, "stale"],
    ["COMMUNICATION_EMAIL_RETRY_BLOCKED", "recipient_suppressed", "blocked"],
    ["COMMUNICATION_EMAIL_RETRY_BLOCKED", "unknown_internal_reason", "blocked"],
  ])(
    "refreshes the review after %s without showing internal errors",
    async (code, reason, key) => {
      const user = userEvent.setup();
      resendState.retry.mockReturnValue({
        unwrap: () =>
          Promise.reject({
            data: {
              code,
              details: { reason },
              message: "INTERNAL provider secret",
            },
          }),
      });
      renderResendHistory();
      const dialog = await openResendDialog(user);
      await user.click(
        dialog.getByRole("button", {
          name: en.EmailAutomations.history.resend.confirm,
        }),
      );
      const alert = await dialog.findByRole("alert");
      expect(alert).toHaveTextContent(en.EmailAutomations.history.resend[key]);
      if (reason === "recipient_suppressed")
        expect(alert).toHaveTextContent(
          en.EmailAutomations.history.reasons.recipient_suppressed,
        );
      expect(
        screen.queryByText(/INTERNAL provider secret|unknown_internal_reason/),
      ).not.toBeInTheDocument();
      expect(
        dialog.getByRole("button", {
          name: en.EmailAutomations.history.resend.confirm,
        }),
      ).toBeDisabled();
    },
  );

  it("keeps generic request failures localized and allows another confirmed attempt", async () => {
    const user = userEvent.setup();
    resendState.retry.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 500,
          data: { message: "Internal mail service failure" },
        }),
    });
    renderResendHistory();
    const dialog = await openResendDialog(user);
    await user.click(
      dialog.getByRole("button", {
        name: en.EmailAutomations.history.resend.confirm,
      }),
    );
    expect(await dialog.findByRole("alert")).toHaveTextContent(
      en.EmailAutomations.history.resend.error,
    );
    expect(
      screen.queryByText("Internal mail service failure"),
    ).not.toBeInTheDocument();
    expect(
      dialog.getByRole("button", {
        name: en.EmailAutomations.history.resend.confirm,
      }),
    ).toBeEnabled();
  });

  it("preserves the current filter, search and page after requesting a resend", async () => {
    const user = userEvent.setup();
    resendState.access = { permissions: ["communications.send"] };
    const logs = historyLogs.map((log) => ({
      ...log,
      canRetry: true,
      status: "failed",
      sentAt: null,
      manualRetryCount: 0,
    }));
    vi.mocked(useGetCommunicationEmailLogsQuery).mockImplementation((query) => {
      const data = pageResponse(query, logs);
      return { data, currentData: data, refetch: vi.fn() };
    });
    resendState.retry.mockReturnValue({
      unwrap: () => Promise.resolve({ queued: true }),
    });
    render(historyElement());
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "failed" },
    });
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "member-" },
    });
    fireEvent.click(nextButtons()[0]);
    const firstRow = within(desktopRows()[0]);
    await user.click(
      firstRow.getByRole("button", {
        name: new RegExp(en.EmailAutomations.history.resend.actionMenu),
      }),
    );
    await user.click(
      await screen.findByRole("menuitem", {
        name: en.EmailAutomations.history.resend.action,
      }),
    );
    const dialog = within(await screen.findByRole("dialog"));
    await user.click(
      dialog.getByRole("button", {
        name: en.EmailAutomations.history.resend.confirm,
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(useGetCommunicationEmailLogsQuery).toHaveBeenLastCalledWith(
      { status: "failed", search: "member-", page: 2, limit: 20 },
      expect.any(Object),
    );
    expect(screen.getByRole("combobox")).toHaveValue("failed");
    expect(screen.getByRole("textbox")).toHaveValue("member-");
  });
});
