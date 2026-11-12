import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import cs from "@/messages/cs.json";
import BookingEditorPage, {
  BookingEditorForm,
} from "@/components/bookings/BookingEditorPage";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  find: vi.fn(),
  query: {},
  getQuery: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/features/bookings/bookingsApiSlice", () => ({
  useGetBookingEditorQuery: (...args) => {
    mocks.getQuery(...args);
    return mocks.query;
  },
  useSaveBookingEditorMutation: () => [mocks.save, { isLoading: false }],
  useLazyGetBookingEditorCustomerQuery: () => [
    mocks.find,
    { isFetching: false },
  ],
}));

const editor = () => ({
  revision: "2030-01-01T08:00:00.000Z",
  booking: {
    id: "booking-1",
    start: "2030-01-20T10:00:00.000Z",
    end: "2030-01-20T11:00:00.000Z",
    lecturer: "Pat",
    note: "Existing note",
    status: "processed",
    paymentStatus: "CONFIRMED",
    currency: "CZK",
    totalPrice: 250,
    numberOfGuests: 2,
    tag: "course",
    product: { id: "course-1", name: "Wheel course", kind: "class" },
  },
  location: { id: "studio-1", name: "Václavská", timeZone: "Europe/Prague" },
  capabilities: {
    canEdit: true,
    canReschedule: true,
    canEditParticipants: true,
    scheduleNotification: "none",
  },
  participants: [
    {
      id: "alice-seat",
      customerId: "alice-id",
      name: "Alice Maker",
      memberNumber: 7,
    },
    { id: "legacy-1", name: "", unnamed: true },
  ],
});
const mount = (value = editor(), { locale = "en", onReload = vi.fn() } = {}) =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "cs" ? cs : en}
      timeZone="Europe/Prague"
    >
      <BookingEditorForm initialEditor={value} onReload={onReload} />
    </NextIntlClientProvider>,
  );
const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

describe("dedicated tenant booking editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.save.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({ ...editor(), revision: "2030-01-01T09:00:00.000Z" }),
    }));
    mocks.find.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({
          customer: {
            id: "bob-id",
            name: "Bob Maker",
            memberNumber: 8,
            email: "bob@example.test",
          },
        }),
    }));
  });

  it("displays a read-only roster total, original payment and studio-local times", () => {
    mount();
    expect(screen.getByLabelText("People attending")).toHaveAttribute(
      "readonly",
    );
    expect(screen.getByLabelText("People attending")).toHaveValue("2");
    expect(screen.getByLabelText("Start")).toHaveValue("2030-01-20T11:00");
    expect(screen.getByText("Unnamed existing participant 2")).toBeVisible();
    expect(screen.getByText("Paid")).toBeVisible();
    expect(screen.getByText(en.BookingEditor.financialNotice)).toBeVisible();
    expect(
      screen.getByText(en.BookingEditor.courseScheduleNotice),
    ).toBeVisible();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("clears metadata without resending schedule, occupancy or payment fields", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Staff note"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Lecturer"), {
      target: { value: "" },
    });
    save();
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith({
        id: "booking-1",
        revision: editor().revision,
        lecturer: "",
        note: "",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Booking saved.",
    );
  });

  it("requires guest name, accepts optional contacts and derives occupancy from additions/removals", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Guest", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Add guest" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      en.BookingEditor.errors.name,
    );
    expect(screen.getByRole("alert")).toHaveFocus();
    expect(screen.getByLabelText("Guest name *")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Guest name *")).toHaveAccessibleDescription(
      en.BookingEditor.errors.name,
    );
    fireEvent.change(screen.getByLabelText("Guest name *"), {
      target: { value: "  Guest Potter  " },
    });
    fireEvent.change(screen.getByLabelText("Email (optional)"), {
      target: { value: "guest@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Phone (optional)"), {
      target: { value: "+420123456789" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add guest" }));
    expect(screen.getByLabelText("People attending")).toHaveValue("3");
    fireEvent.click(screen.getByRole("button", { name: "Remove Alice Maker" }));
    expect(screen.getByLabelText("People attending")).toHaveValue("2");
    save();
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0][0]).toEqual({
      id: "booking-1",
      revision: editor().revision,
      lecturer: "Pat",
      note: "Existing note",
      participants: [
        { id: "legacy-1" },
        {
          name: "Guest Potter",
          email: "guest@example.test",
          phone: "+420123456789",
        },
      ],
    });
  });

  it("links an invalid guest email to the visible validation message", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Guest", exact: true }));
    fireEvent.change(screen.getByLabelText("Guest name *"), {
      target: { value: "Guest Potter" },
    });
    fireEvent.change(screen.getByLabelText("Email (optional)"), {
      target: { value: "invalid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add guest" }));
    expect(screen.getByRole("alert")).toHaveFocus();
    expect(screen.getByLabelText("Email (optional)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByLabelText("Email (optional)"),
    ).toHaveAccessibleDescription(en.BookingEditor.errors.email);
    expect(screen.getByLabelText("People attending")).toHaveValue("2");
  });

  it("resolves a registered customer by ID and prevents duplicate members", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Customer ID"), {
      target: { value: "#0008" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find customer" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Add customer" }),
    );
    expect(mocks.find).toHaveBeenCalledWith({
      id: "booking-1",
      identifier: "#0008",
    });
    expect(screen.getByLabelText("People attending")).toHaveValue("3");
    fireEvent.change(screen.getByLabelText("Customer ID"), {
      target: { value: "8" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find customer" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Add customer" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      en.BookingEditor.errors.duplicate,
    );
    expect(screen.getByLabelText("People attending")).toHaveValue("3");
    save();
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0][0].participants).toEqual([
      { id: "alice-seat" },
      { id: "legacy-1" },
      { customerId: "bob-id" },
    ]);
  });

  it("does not display a stale customer lookup after the identifier changes", async () => {
    let resolveLookup;
    mocks.find.mockImplementation(() => ({
      unwrap: () =>
        new Promise((resolve) => {
          resolveLookup = resolve;
        }),
    }));
    mount();
    fireEvent.change(screen.getByLabelText("Customer ID"), {
      target: { value: "7" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find customer" }));
    fireEvent.change(screen.getByLabelText("Customer ID"), {
      target: { value: "8" },
    });
    resolveLookup({ customer: { id: "old", name: "Wrong result" } });
    await waitFor(() =>
      expect(screen.queryByText("Wrong result")).not.toBeInTheDocument(),
    );
  });

  it("converts changed schedule from studio timezone and never sends financial fields", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Start"), {
      target: { value: "2030-01-20T12:00" },
    });
    fireEvent.change(screen.getByLabelText("End"), {
      target: { value: "2030-01-20T13:00" },
    });
    save();
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    const payload = mocks.save.mock.calls[0][0];
    expect(payload).toMatchObject({
      start: "2030-01-20T11:00:00.000Z",
      end: "2030-01-20T12:00:00.000Z",
    });
    for (const key of [
      "numberOfGuests",
      "paymentStatus",
      "status",
      "totalPrice",
      "isPaid",
      "userId",
      "orders",
    ])
      expect(payload).not.toHaveProperty(key);
  });

  it.each(["en", "cs"])(
    "lets staff move a paid customer booking when the server permits it in %s",
    async (locale) => {
      const value = editor();
      value.booking.tag = "open-studio";
      value.booking.product.kind = "open-studio";
      value.capabilities.preserveDuration = true;
      value.capabilities.scheduleNotification = "customer_email";
      const saved = {
        ...value,
        revision: "2030-01-01T09:00:00.000Z",
        booking: {
          ...value.booking,
          start: "2030-01-21T11:00:00.000Z",
          end: "2030-01-21T12:00:00.000Z",
        },
      };
      let resolveSave;
      mocks.save.mockImplementationOnce(() => ({
        unwrap: () =>
          new Promise((resolve) => {
            resolveSave = resolve;
          }),
      }));
      mount(value, { locale });
      const copy = (locale === "cs" ? cs : en).BookingEditor;
      expect(screen.getByLabelText(copy.start)).toBeEnabled();
      expect(screen.getByLabelText(copy.end)).toBeEnabled();
      expect(screen.getByText(copy.preserveDuration)).toBeVisible();
      expect(
        screen.queryByText(copy.lockReasons.BOOKING_EDIT_ACCESS_DETAILS_ISSUED),
      ).not.toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(copy.start), {
        target: { value: "2030-01-21T12:00" },
      });
      fireEvent.change(screen.getByLabelText(copy.end), {
        target: { value: "2030-01-21T13:00" },
      });
      fireEvent.click(screen.getByRole("button", { name: copy.save }));
      expect(mocks.save).toHaveBeenCalledExactlyOnceWith({
        id: value.booking.id,
        revision: value.revision,
        lecturer: "Pat",
        note: "Existing note",
        start: saved.booking.start,
        end: saved.booking.end,
      });
      expect(screen.queryByText(copy.saved)).not.toBeInTheDocument();

      resolveSave(saved);
      expect(await screen.findByRole("status")).toHaveTextContent(copy.saved);
      await waitFor(() => expect(screen.getByRole("status")).toHaveFocus());
      expect(screen.getByLabelText(copy.start)).toHaveValue("2030-01-21T12:00");
      expect(screen.getByLabelText(copy.end)).toHaveValue("2030-01-21T13:00");
      expect(screen.getByLabelText(copy.count)).toHaveValue("2");

      fireEvent.change(screen.getByLabelText(copy.note), {
        target: { value: "Moved by staff" },
      });
      expect(screen.queryByText(copy.saved)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: copy.save }));
      await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2));
      expect(mocks.save.mock.calls[1][0]).toEqual({
        id: value.booking.id,
        revision: saved.revision,
        lecturer: "Pat",
        note: "Moved by staff",
      });
    },
  );

  it.each([
    ["BOOKING_EDIT_CAPACITY_EXCEEDED", "errors", "capacity"],
    ["BOOKING_EDIT_DURATION_REQUIRES_PAYMENT_WORKFLOW", "errors", "duration"],
    ["BOOKING_EDIT_PAYMENT_IN_PROGRESS", "errors", "payment"],
    [
      "BOOKING_EDIT_ACCESS_DELIVERY_IN_PROGRESS",
      "lockReasons",
      "BOOKING_EDIT_ACCESS_DELIVERY_IN_PROGRESS",
    ],
  ])(
    "retains edited dates and notes after a %s save failure",
    async (code, section, key) => {
      mocks.save.mockImplementation(() => ({
        unwrap: () => Promise.reject({ data: { code } }),
      }));
      mount();
      fireEvent.change(screen.getByLabelText("Start"), {
        target: { value: "2030-01-21T12:00" },
      });
      fireEvent.change(screen.getByLabelText("End"), {
        target: { value: "2030-01-21T13:00" },
      });
      fireEvent.change(screen.getByLabelText("Staff note"), {
        target: { value: "Keep this draft" },
      });
      save();
      expect(await screen.findByRole("alert")).toHaveTextContent(
        en.BookingEditor[section][key],
      );
      await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
      expect(screen.getByLabelText("Start")).toHaveValue("2030-01-21T12:00");
      expect(screen.getByLabelText("End")).toHaveValue("2030-01-21T13:00");
      expect(screen.getByLabelText("Staff note")).toHaveValue(
        "Keep this draft",
      );
      expect(screen.queryByText("Booking saved.")).not.toBeInTheDocument();
    },
  );

  it("explains inconsistent imported attendance and omits unknown paid amounts", () => {
    const value = editor();
    delete value.booking.totalPrice;
    value.capabilities.canEditParticipants = false;
    value.capabilities.participantsReason =
      "BOOKING_EDIT_ATTENDANCE_REVIEW_REQUIRED";
    mount(value);
    expect(
      screen.getByText(en.BookingEditor.errors.attendanceReview),
    ).toBeVisible();
    expect(screen.queryByText(en.Bookings.edit.total)).not.toBeInTheDocument();
    expect(screen.getByText(en.BookingEditor.financialNotice)).toBeVisible();
  });

  it("allows removing people while additions wait for a checkout hold to settle", () => {
    const value = editor();
    value.capabilities.canAddParticipants = false;
    value.capabilities.addParticipantsReason =
      "BOOKING_EDIT_PAYMENT_IN_PROGRESS";
    mount(value);
    expect(
      screen.getByText(
        en.BookingEditor.lockReasons.BOOKING_EDIT_PAYMENT_IN_PROGRESS,
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Guest", exact: true }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Alice Maker" }));
    expect(screen.getByLabelText("People attending")).toHaveValue("1");
  });

  it("blocks stale dates until an explicit reload replaces them with the latest booking", async () => {
    mocks.save.mockImplementation(() => ({
      unwrap: () => Promise.reject({ data: { code: "BOOKING_EDIT_STALE" } }),
    }));
    const latest = editor();
    latest.revision = "2030-01-01T09:00:00.000Z";
    latest.booking.start = "2030-01-22T11:00:00.000Z";
    latest.booking.end = "2030-01-22T12:00:00.000Z";
    const refetch = vi.fn(async () => {
      mocks.query = { ...mocks.query, data: latest };
      return { data: latest };
    });
    mocks.query = { data: editor(), isLoading: false, refetch };
    render(
      <NextIntlClientProvider
        locale="en"
        messages={en}
        timeZone="Europe/Prague"
      >
        <BookingEditorPage bookingId="booking-1" />
      </NextIntlClientProvider>,
    );
    fireEvent.change(screen.getByLabelText("Start"), {
      target: { value: "2030-01-21T12:00" },
    });
    fireEvent.change(screen.getByLabelText("End"), {
      target: { value: "2030-01-21T13:00" },
    });
    save();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      en.BookingEditor.errors.stale,
    );
    expect(screen.getByLabelText("Start")).toHaveValue("2030-01-21T12:00");
    expect(screen.getByLabelText("Start")).toBeDisabled();
    expect(screen.getByLabelText("End")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Reload latest booking" }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Start")).toHaveValue("2030-01-22T12:00"),
    );
    expect(refetch).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("End")).toHaveValue("2030-01-22T13:00");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it.each(
    ["en", "cs"].flatMap((locale) =>
      [
        "BOOKING_EDIT_NOT_ALLOWED",
        "BOOKING_EDIT_PAYMENT_IN_PROGRESS",
        "BOOKING_EDIT_ACCESS_DELIVERY_IN_PROGRESS",
      ].map((reason) => [locale, reason]),
    ),
  )(
    "explains a %s schedule lock for %s while allowing attendance editing",
    (locale, reason) => {
      const value = editor();
      value.capabilities.canReschedule = false;
      value.capabilities.scheduleReason = reason;
      mount(value, { locale });
      const copy = (locale === "cs" ? cs : en).BookingEditor;
      expect(screen.getByLabelText(copy.start)).toBeDisabled();
      expect(screen.getByLabelText(copy.end)).toBeDisabled();
      expect(screen.getByText(copy.lockReasons[reason])).toBeVisible();
      expect(
        screen.queryByRole("button", { name: copy.addGuest }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: copy.guest, exact: true }),
      ).toBeEnabled();
    },
  );

  it("loads an editor by its own ID without relying on current table contents", () => {
    mocks.query = {
      data: editor(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <BookingEditorPage bookingId="booking-1" />
      </NextIntlClientProvider>,
    );
    expect(mocks.getQuery).toHaveBeenCalledWith("booking-1", { skip: false });
    expect(screen.getByRole("heading", { name: "Edit booking" })).toBeVisible();
  });

  it("keeps unsaved changes when a background refetch fails", () => {
    mocks.query = {
      data: editor(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    const component = () => (
      <NextIntlClientProvider locale="en" messages={en}>
        <BookingEditorPage bookingId="booking-1" />
      </NextIntlClientProvider>
    );
    const view = render(component());
    fireEvent.change(screen.getByLabelText("Staff note"), {
      target: { value: "Preserve my draft" },
    });
    mocks.query = { ...mocks.query, isError: true };
    view.rerender(component());
    expect(screen.getByLabelText("Staff note")).toHaveValue(
      "Preserve my draft",
    );
    expect(
      screen.queryByText(en.BookingEditor.loadError),
    ).not.toBeInTheDocument();
  });
});
