import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/nl.json";

const event = {
  _id: "event-1",
  title: "Community evening",
  type: "school_group",
  status: "planned",
  date: "2026-12-16",
  startTime: "18:00",
  endTime: "19:00",
  customerName: "Jane",
  numberOfGuests: 5,
  priceEstimate: 125,
  currency: "EUR",
  checklist: [
    { _id: "check-1", title: "Confirm price", done: false },
    { _id: "check-2", title: "Jane’s custom preparation note", done: false },
  ],
};
vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => ({ settings: { currency: "EUR" } }),
}));
vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: () => "",
}));
vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({ data: [] }),
}));
vi.mock("@/lib/features/events/eventsApiSlice", () => ({
  useGetEventsQuery: () => ({ data: { events: [event] }, isLoading: false }),
  useCreateEventMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateEventMutation: () => [vi.fn()],
  useDeleteEventMutation: () => [vi.fn()],
}));
import EventsManagementPage from "@/components/views/events/EventsManagementPage";

const showEvents = () =>
  render(
    <NextIntlClientProvider
      locale="nl"
      messages={messages}
      timeZone="Europe/Prague"
    >
      <EventsManagementPage />
    </NextIntlClientProvider>,
  );

describe("event management localization", () => {
  it("localizes the list, enum labels and form without changing event data", () => {
    showEvents();
    expect(screen.getByRole("heading", { name: "Evenementen" })).toBeVisible();
    expect(screen.getByText("Community evening")).toBeVisible();
    expect(screen.getAllByText("Schoolgroep").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gepland").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Evenement aanmaken" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Titel")).toBeVisible();
    expect(within(dialog).getByLabelText("Naam van de klant")).toBeVisible();
    expect(
      within(dialog).getByLabelText("Geschatte prijs (EUR)"),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("option", { name: "Privéworkshop" }),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText("Create event")).not.toBeInTheDocument();
  });

  it("translates default checklist entries but preserves tenant-authored notes", () => {
    showEvents();
    fireEvent.click(
      screen.getByRole("button", { name: "Evenementdetails bekijken" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Prijs bevestigen")).toBeVisible();
    expect(
      within(dialog).getByText("Jane’s custom preparation note"),
    ).toBeVisible();
    expect(within(dialog).queryByText("Confirm price")).not.toBeInTheDocument();
  });
});
