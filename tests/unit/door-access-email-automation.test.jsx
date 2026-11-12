import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
const mocks = vi.hoisted(() => ({ query: vi.fn(), update: vi.fn() }));
vi.mock(
  "@/lib/features/communicationAutomations/communicationAutomationsApiSlice",
  () => ({
    useGetDoorAccessAutomationQuery: mocks.query,
    useUpdateDoorAccessAutomationMutation: () => [
      mocks.update,
      { isLoading: false },
    ],
  }),
);
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
import DoorAccessEmailAutomation from "@/components/communications/email/DoorAccessEmailAutomation";
const location = {
  id: "location-1",
  name: "Grohova",
  availableCodes: 11,
  enabled: false,
  minutesBefore: 15,
  blockedReason: null,
};
const show = (canManage = true) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <DoorAccessEmailAutomation canManage={canManage} />
    </NextIntlClientProvider>,
  );
beforeEach(() => {
  mocks.query.mockReturnValue({
    data: { locations: [location], deliveries: [] },
  });
  mocks.update.mockReturnValue({ unwrap: () => Promise.resolve() });
});
describe("door access email automation", () => {
  it("shows the timing and blocks activation until the plan is eligible", () => {
    mocks.query.mockReturnValue({
      data: {
        locations: [{ ...location, blockedReason: "plan" }],
        deliveries: [],
      },
    });
    show();
    expect(screen.getByText("15 minutes before booking")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("link", { name: "Review setup" })).toHaveAttribute(
      "href",
      "/app/settings/billing",
    );
    expect(
      screen.getByText("No door-code emails have been submitted yet."),
    ).toBeInTheDocument();
  });
  it("saves only the selected location and requires manage permission", async () => {
    const view = show(false);
    expect(screen.getByRole("checkbox")).toBeDisabled();
    view.unmount();
    show();
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({
        locationId: "location-1",
        enabled: true,
      }),
    );
  });
  it("does not confuse provider acceptance with delivery or hide bounces", () => {
    mocks.query.mockReturnValue({
      data: {
        locations: [location],
        deliveries: [
          { id: "accepted", locationId: location.id, status: "sent" },
          {
            id: "bounce",
            locationId: location.id,
            status: "sent",
            providerDeliveryStatus: "bounced",
          },
        ],
      },
    });
    show();
    expect(screen.getByText(/Submitted to email provider/)).toBeInTheDocument();
    expect(screen.getByText(/Bounced — needs attention/)).toBeInTheDocument();
  });
});
