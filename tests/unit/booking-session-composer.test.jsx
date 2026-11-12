import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  defaultSearch:
    "productId=course-1&locationId=location-1&start=2099-08-03T07%3A00%3A00.000Z&end=2099-08-03T09%3A00%3A00.000Z&isRoot=1&setupStep=practice_booking",
  search:
    "productId=course-1&locationId=location-1&start=2099-08-03T07%3A00%3A00.000Z&end=2099-08-03T09%3A00%3A00.000Z&isRoot=1&setupStep=practice_booking",
  replace: vi.fn(),
  create: vi.fn(),
  products: [
    {
      id: "course-1",
      _id: "course-1",
      name: "Wheel foundations",
      type: "course",
      isActive: true,
    },
    {
      id: "workshop-1",
      _id: "workshop-1",
      name: "Open studio",
      type: "workshop",
      locationId: "location-1",
      isActive: true,
    },
    {
      id: "blocker-1",
      _id: "blocker-1",
      name: "Maintenance",
      type: "blocker",
      locationId: "location-1",
      isActive: true,
    },
  ],
  locations: [
    {
      id: "location-1",
      _id: "location-1",
      name: "Grohova",
      isActive: true,
      booking: {
        enabled: true,
        timezone: "Europe/Prague",
        slotStepMinutes: 30,
        minBookingMinutes: 60,
        maxBookingMinutes: 120,
      },
      openingHours: {
        monday: {
          isOpen: true,
          openTime: "08:00",
          closeTime: "18:00",
        },
      },
    },
  ],
}));

const messages = {
  "actions.create": "Create session",
  "actions.creating": "Creating…",
  "actions.continue": "Continue setup",
  "actions.viewBookings": "View bookings",
  "actions.createAnother": "Create another",
  "actions.backToBookings": "Back to bookings",
  "actions.back": "Back",
  "actions.cancel": "Cancel",
  "actions.addDate": "Add date",
  "fields.product": "Course or block type",
  "fields.chooseProduct": "Choose a product",
  "fields.location": "Studio location",
  "fields.chooseLocation": "Choose a location",
  "fields.date": "First date",
  "fields.start": "Start time",
  "fields.duration": "Duration",
  "fields.additionalDate": "Additional session date",
  "fields.language": "Session language",
  "fields.lecturer": "Lecturer",
  "fields.description": "Description",
  "fields.note": "Internal note",
  "fields.root": "Mark as the first session in a course series",
  "success.title": "Session created",
  "errors.request": "Request failed",
  "errors.prefillProduct": "Requested product unavailable",
  "errors.prefillLocation": "Requested location unavailable",
  "errors.prefillSchedule": "Requested schedule unavailable",
  "errors.prefillDuration": "Requested duration unavailable",
};

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) => {
      let message = messages[key] || key;
      Object.entries(values).forEach(([name, value]) => {
        message = message.replace(`{${name}}`, String(value));
      });
      return message;
    },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("react-redux", () => ({
  useSelector: () => "location-1",
}));

vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: () => "location-1",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));

vi.mock("@/components/setup-center/useGuidedSetupStep", () => ({
  default: () => ({
    guided: false,
    refreshAndContinue: vi.fn(),
    stepId: "bookable_offer",
    track: vi.fn(),
  }),
}));

vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetProductsQuery: () => ({
    data: mocks.products,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({
    data: { locations: mocks.locations },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/lib/features/bookings/bookingsApiSlice", () => ({
  useAddNewBookingMutation: () => [
    mocks.create,
    { isLoading: false, isError: false },
  ],
}));

import BookingSessionComposer from "@/components/bookings/BookingSessionComposer";

describe("BookingSessionComposer", () => {
  beforeEach(() => {
    mocks.search = mocks.defaultSearch;
    mocks.replace.mockReset();
    mocks.create.mockReset();
    mocks.create.mockReturnValue({
      unwrap: () => Promise.resolve({ ids: ["booking-1"] }),
    });
  });

  it("submits a timezone-aware course session and returns to guided setup", async () => {
    render(<BookingSessionComposer />);

    expect(
      screen.getByRole("option", { name: "Wheel foundations" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Open studio" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("First date")).toHaveValue("2099-08-03");
    expect(screen.getByLabelText("Start time")).toHaveValue("09:00");
    expect(
      screen.getByRole("checkbox", {
        name: /Mark as the first session in a course series/,
      }),
    ).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Create session" }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dates: ["2099-08-03"],
        startTime: "09:00",
        endTime: "11:00",
        bookingProduct: "course-1",
        locationId: "location-1",
        language: "en",
        isRoot: true,
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "Session created" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue setup" }));
    expect(mocks.replace).toHaveBeenCalledWith(
      "/app/setup?step=practice_booking",
    );
  });

  it("fails closed when an explicit product is unavailable and allows correction", () => {
    mocks.search =
      "productId=missing-product&locationId=location-1&start=2099-08-03T07%3A00%3A00.000Z&end=2099-08-03T09%3A00%3A00.000Z";

    render(<BookingSessionComposer />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Requested product unavailable",
    );
    expect(screen.getByLabelText("Course or block type")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Create session" }),
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Course or block type"), {
      target: { value: "course-1" },
    });

    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Create session" }),
    ).toBeEnabled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects an explicit start earlier today", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2099-08-03T08:30:00.000Z"));
      mocks.search =
        "productId=course-1&locationId=location-1&start=2099-08-03T07%3A00%3A00.000Z&end=2099-08-03T09%3A00%3A00.000Z";

      render(<BookingSessionComposer />);

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Requested schedule unavailable",
      );
      expect(
        screen.getByRole("button", { name: "Create session" }),
      ).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not replace an unavailable explicit schedule with defaults", () => {
    mocks.search =
      "productId=course-1&locationId=location-1&start=2020-08-03T07%3A00%3A00.000Z&end=2020-08-03T09%3A00%3A00.000Z";

    render(<BookingSessionComposer />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Requested schedule unavailable",
    );
    expect(screen.getByLabelText("First date")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Create session" }),
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText("First date"), {
      target: { value: "2099-08-03" },
    });

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByLabelText("Start time")).toHaveValue("08:00");
    expect(
      screen.getByRole("button", { name: "Create session" }),
    ).toBeEnabled();
  });

  it("requires correction when the explicit duration cannot be honored", () => {
    mocks.search =
      "productId=course-1&locationId=location-1&start=2099-08-03T07%3A00%3A00.000Z&end=2099-08-03T10%3A00%3A00.000Z";

    render(<BookingSessionComposer />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Requested duration unavailable",
    );
    expect(
      screen.getByRole("button", { name: "Create session" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "1 h" }));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Create session" }),
    ).toBeEnabled();
  });

  it("uses a safe returnTo for both Back and Cancel without creating", () => {
    mocks.search =
      "productId=course-1&locationId=location-1&start=2099-08-03T07%3A00%3A00.000Z&end=2099-08-03T09%3A00%3A00.000Z&returnTo=%2Fapp%2Fai";

    render(<BookingSessionComposer />);

    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/app/ai",
    );
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/app/ai",
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("keeps the composer open and shows the server rejection inline", async () => {
    mocks.create.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: { message: "This location is not available." },
        }),
    });

    render(<BookingSessionComposer />);
    fireEvent.click(screen.getByRole("button", { name: "Create session" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This location is not available.",
    );
    expect(
      screen.getByRole("button", { name: "Create session" }),
    ).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
