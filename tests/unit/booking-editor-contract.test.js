import { describe, expect, it, vi } from "vitest";
import {
  buildBookingEditorPayload,
  createBookingEditorDraft,
  isCustomerAlreadyAttending,
} from "@/components/bookings/bookingEditor.utils";
const captured = vi.hoisted(() => ({ endpoints: {} }));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => {
      captured.endpoints = endpoints({
        query: (definition) => definition,
        mutation: (definition) => definition,
      });
      return {};
    },
  },
}));
import "@/lib/features/bookings/bookingsApiSlice";

describe("booking editor request boundary", () => {
  it("uses dedicated scoped endpoints and a revision-bearing PUT", () => {
    expect(captured.endpoints.getBookingEditor.query("booking/a")).toBe(
      "/bookings/booking%2Fa/editor",
    );
    expect(
      captured.endpoints.getBookingEditorCustomer.query({
        id: "booking-1",
        identifier: "#0012",
      }),
    ).toEqual({
      url: "/bookings/booking-1/editor/customer",
      params: { identifier: "#0012" },
    });
    expect(
      captured.endpoints.saveBookingEditor.query({
        id: "booking-1",
        revision: "rev",
        participants: [{ id: "old-seat" }, { customerId: "new-customer" }],
      }),
    ).toEqual({
      url: "/bookings/booking-1/editor",
      method: "PUT",
      body: {
        revision: "rev",
        participants: [{ id: "old-seat" }, { customerId: "new-customer" }],
      },
    });
    expect(
      captured.endpoints.saveBookingEditor.invalidatesTags(
        null,
        { status: 409 },
        { id: "booking-1" },
      ),
    ).toEqual([]);
    expect(
      captured.endpoints.saveBookingEditor.invalidatesTags({}, undefined, {
        id: "booking-1",
      }),
    ).toContainEqual({ type: "Booking", id: "MINE-AVAILABILITY" });
  });

  it("preserves an unchanged ambiguous DST instant and unnamed legacy occupied place", () => {
    const editor = {
      revision: "rev",
      location: { timeZone: "Europe/Prague" },
      booking: {
        start: "2026-10-25T01:15:37.000Z",
        end: "2026-10-25T02:15:37.000Z",
        note: "old",
      },
      participants: [{ id: "legacy-0", unnamed: true }],
      capabilities: { canReschedule: true, canEditParticipants: true },
    };
    const draft = createBookingEditorDraft(editor);
    expect(draft.start).toBe("2026-10-25T02:15");
    expect(
      buildBookingEditorPayload(editor, { ...draft, note: "new" }),
    ).toEqual({ revision: "rev", lecturer: "", note: "new" });
  });

  it("rejects nonexistent local times and inverted ranges", () => {
    const editor = {
      revision: "rev",
      location: { timeZone: "Europe/Prague" },
      booking: { start: "2027-03-28T00:00:00Z", end: "2027-03-28T01:00:00Z" },
      participants: [],
      capabilities: { canReschedule: true },
    };
    const draft = createBookingEditorDraft(editor);
    expect(
      buildBookingEditorPayload(editor, {
        ...draft,
        start: "2027-03-28T02:30",
      }),
    ).toBeNull();
    expect(
      buildBookingEditorPayload(editor, { ...draft, end: "2027-03-28T00:30" }),
    ).toBeNull();
  });

  it("moves a paid booking across a DST change using studio dates and preserving its duration", () => {
    const editor = {
      revision: "rev",
      location: { timeZone: "Europe/Prague" },
      booking: {
        start: "2026-10-24T08:00:00.000Z",
        end: "2026-10-24T09:00:00.000Z",
        paymentStatus: "CONFIRMED",
        totalPrice: 250,
      },
      participants: [{ id: "existing-seat" }],
      capabilities: {
        canReschedule: true,
        canEditParticipants: true,
        preserveDuration: true,
      },
    };
    const draft = createBookingEditorDraft(editor);
    expect(draft.start).toBe("2026-10-24T10:00");
    const payload = buildBookingEditorPayload(editor, {
      ...draft,
      start: "2026-10-26T10:00",
      end: "2026-10-26T11:00",
    });
    expect(payload).toEqual({
      revision: "rev",
      lecturer: "",
      note: "",
      start: "2026-10-26T09:00:00.000Z",
      end: "2026-10-26T10:00:00.000Z",
    });
    expect(Date.parse(payload.end) - Date.parse(payload.start)).toBe(
      Date.parse(editor.booking.end) - Date.parse(editor.booking.start),
    );
  });

  it("omits attempted schedule changes when the server has locked rescheduling", () => {
    const editor = {
      revision: "rev",
      location: { timeZone: "Europe/Prague" },
      booking: {
        start: "2030-01-20T10:00:00.000Z",
        end: "2030-01-20T11:00:00.000Z",
      },
      participants: [],
      capabilities: { canEdit: true, canReschedule: false },
    };
    expect(
      buildBookingEditorPayload(editor, {
        ...createBookingEditorDraft(editor),
        start: "2030-01-21T12:00",
        end: "2030-01-21T13:00",
        note: "Metadata is still editable",
      }),
    ).toEqual({
      revision: "rev",
      lecturer: "",
      note: "Metadata is still editable",
    });
  });

  it("detects current member identities while not confusing reassigned old custom IDs", () => {
    const customer = { id: "new-owner", memberNumber: 9, customId: "9" };
    expect(isCustomerAlreadyAttending([{ memberNumber: 9 }], customer)).toBe(
      true,
    );
    expect(
      isCustomerAlreadyAttending([{ customerId: "new-owner" }], customer),
    ).toBe(true);
    expect(isCustomerAlreadyAttending([{ customId: "9" }], customer)).toBe(
      true,
    );
    expect(
      isCustomerAlreadyAttending(
        [{ memberNumber: 10, customId: "9" }],
        customer,
      ),
    ).toBe(false);
  });
});
