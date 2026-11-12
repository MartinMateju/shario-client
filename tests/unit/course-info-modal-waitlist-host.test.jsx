import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rosterProps: null,
  state: {
    auth: {
      tenant: { modules: { courses: true, payments: true } },
      workspaceAccess: {
        role: "staff",
        status: "active",
        effectivePermissions: [
          "bookings.view",
          "bookings.update",
          "bookings.cancel",
          "bookings.refund",
        ],
      },
    },
    language: "EN",
  },
}));

vi.mock("@headlessui/react", () => ({
  Dialog: ({ children, ...props }) => (
    <div role="dialog" {...props}>
      {children}
    </div>
  ),
  DialogPanel: ({ children, className }) => (
    <div className={className}>{children}</div>
  ),
  DialogTitle: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
  Transition: ({ children, show }) => (show ? <>{children}</> : null),
  TransitionChild: ({ children }) => <>{children}</>,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.auth.tenant,
  selectCurrentWorkspaceAccess: (state) => state.auth.workspaceAccess,
}));

vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: (state) => state.language,
}));

vi.mock("@/translations/translation", () => ({
  default: {
    CANCEL: { EN: "Close", CZ: "Zavřít" },
    DATE: { EN: "Date", CZ: "Datum" },
    LECTURER: { EN: "Lecturer", CZ: "Lektor" },
    PARTICIPANTS: { EN: "Participants", CZ: "Účastníci" },
    PRICE: { EN: "Price", CZ: "Cena" },
    TIME: { EN: "Time", CZ: "Čas" },
  },
}));

vi.mock("@/utils/sidebarUtils", () => ({
  getNumberOfParticipantsAsString: () => "1/8",
}));

vi.mock("@/utils/utilityFunctions", () => ({
  getDateAsString: () => "07.08.2026",
  getProductByBooking: (products) => products[0],
  getTimeRangeAsString: () => "10:00-12:00",
}));

vi.mock("@/components/waitlists/CourseSessionRoster", () => ({
  default: (props) => {
    mocks.rosterProps = props;
    return (
      <div
        data-testid="mounted-course-session-roster"
        data-session-id={props.sessionId}
        data-can-view={String(props.canView)}
        data-can-promote={String(props.canPromote)}
        data-can-cancel={String(props.canCancel)}
        data-can-refund-participants={String(props.canRefundParticipants)}
        data-can-configure={String(props.canConfigure)}
        data-booked-name={props.bookedEntries[0]?.customer?.name || ""}
      />
    );
  },
}));

import CourseInfoModal, {
  getCourseParticipants,
} from "@/components/modals/admin/CourseInfoModal";

const booking = {
  _id: "session-1",
  bookingProduct: "product-1",
  start: "2026-08-07T08:00:00.000Z",
  end: "2026-08-07T10:00:00.000Z",
  lecturer: "Studio Teacher",
  participants: [{ user: "customer-1", order: "order-1" }],
};

const users = [
  {
    _id: "customer-1",
    firstname: "Ada",
    lastname: "Lovelace",
    email: "ADA@EXAMPLE.TEST",
  },
];

describe("CourseInfoModal waitlist host", () => {
  it("keeps removed paid attendance refundable until its order is financially cancelled", () => {
    const removed = {
      firstname: "Removed",
      lastname: "Customer",
      order: "paid-order",
      attendanceStatus: "removed",
    };
    const manual = {
      firstname: "Manual",
      lastname: "Guest",
      attendanceStatus: "active",
    };
    const managed = {
      attendanceManaged: true,
      orders: ["paid-order"],
      participants: [
        removed,
        manual,
        { firstname: "Removed guest", attendanceStatus: "removed" },
      ],
    };
    expect(getCourseParticipants(managed, [])).toEqual([
      expect.objectContaining({
        orderId: "paid-order",
        attendanceStatus: "removed",
      }),
      expect.objectContaining({
        customer: { name: "Manual Guest", email: "" },
      }),
    ]);
    expect(getCourseParticipants({ ...managed, orders: [] }, [])).toEqual([
      expect.objectContaining({
        customer: { name: "Manual Guest", email: "" },
      }),
    ]);
  });
  beforeEach(() => {
    mocks.rosterProps = null;
    mocks.state.auth.tenant = {
      modules: { courses: true, payments: true },
    };
    mocks.state.auth.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: [
        "bookings.view",
        "bookings.update",
        "bookings.cancel",
        "bookings.refund",
      ],
    };
  });

  it("mounts the roster in the staff session detail with real participants, modules and permissions", () => {
    render(
      <CourseInfoModal
        open
        setOpen={vi.fn()}
        booking={booking}
        products={[{ _id: "product-1", name: "Wheel course", price: 1200 }]}
        users={users}
      />,
    );

    const roster = screen.getByTestId("mounted-course-session-roster");
    expect(
      screen.getByRole("dialog", { name: "Wheel course" }),
    ).toBeInTheDocument();
    expect(roster).toHaveAttribute("data-session-id", "session-1");
    expect(roster).toHaveAttribute("data-can-view", "true");
    expect(roster).toHaveAttribute("data-can-promote", "true");
    expect(roster).toHaveAttribute("data-can-cancel", "true");
    expect(roster).toHaveAttribute("data-can-refund-participants", "true");
    expect(roster).toHaveAttribute("data-can-configure", "true");
    expect(roster).toHaveAttribute("data-booked-name", "Ada Lovelace");
    expect(mocks.rosterProps.modules).toEqual({
      courses: true,
      payments: true,
    });
    expect(mocks.rosterProps.bookedEntries).toEqual([
      {
        id: "customer-1",
        orderId: "order-1",
        customer: {
          name: "Ada Lovelace",
          email: "ada@example.test",
        },
      },
    ]);
  });

  it("does not mount the admin roster without bookings.view", () => {
    mocks.state.auth.workspaceAccess.effectivePermissions = ["bookings.update"];

    render(
      <CourseInfoModal
        open
        setOpen={vi.fn()}
        booking={booking}
        products={[{ _id: "product-1", name: "Wheel course", price: 1200 }]}
        users={users}
      />,
    );

    expect(screen.queryByTestId("mounted-course-session-roster")).toBeNull();
  });

  it("does not grant remove permission from bookings.update", () => {
    mocks.state.auth.workspaceAccess.effectivePermissions = [
      "bookings.view",
      "bookings.update",
    ];

    render(
      <CourseInfoModal
        open
        setOpen={vi.fn()}
        booking={booking}
        products={[{ _id: "product-1", name: "Wheel course", price: 1200 }]}
        users={users}
      />,
    );

    const roster = screen.getByTestId("mounted-course-session-roster");
    expect(roster).toHaveAttribute("data-can-view", "true");
    expect(roster).toHaveAttribute("data-can-promote", "true");
    expect(roster).toHaveAttribute("data-can-configure", "true");
    expect(roster).toHaveAttribute("data-can-cancel", "false");
    expect(roster).toHaveAttribute("data-can-refund-participants", "false");
  });

  it("requires both bookings.cancel and bookings.refund for paid participant removal", () => {
    mocks.state.auth.workspaceAccess.effectivePermissions = [
      "bookings.view",
      "bookings.cancel",
    ];

    render(
      <CourseInfoModal
        open
        setOpen={vi.fn()}
        booking={booking}
        products={[{ _id: "product-1", name: "Wheel course", price: 1200 }]}
        users={users}
      />,
    );

    const roster = screen.getByTestId("mounted-course-session-roster");
    expect(roster).toHaveAttribute("data-can-cancel", "true");
    expect(roster).toHaveAttribute("data-can-refund-participants", "false");
  });

  it("normalizes embedded booked identities without reading unrelated users", () => {
    expect(
      getCourseParticipants(
        {
          bookedEntries: [
            {
              customer: {
                id: "customer-2",
                firstName: "Grace",
                lastName: "Hopper",
                email: "GRACE@EXAMPLE.TEST",
              },
              order: "order-2",
            },
          ],
        },
        [],
      ),
    ).toEqual([
      {
        id: "customer-2",
        orderId: "order-2",
        customer: {
          name: "Grace Hopper",
          email: "grace@example.test",
        },
      },
    ]);
  });
});
