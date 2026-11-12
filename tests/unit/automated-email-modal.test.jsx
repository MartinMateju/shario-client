import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AutomatedEmailModal from "@/components/modals/email_notifications/AutomatedEmailModal";
import messages from "@/messages/en.json";

const { updateAutomation, createAutomation } = vi.hoisted(() => ({
  updateAutomation: vi.fn(),
  createAutomation: vi.fn(),
}));

vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentWorkspaceAccess: () => ({ role: "owner" }),
}));
vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: () => "",
}));
vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({ data: [] }),
}));
vi.mock(
  "@/lib/features/communicationAutomations/communicationAutomationsApiSlice",
  () => ({
    useCreateCommunicationAutomationMutation: () => [createAutomation, {}],
    useUpdateCommunicationAutomationMutation: () => [updateAutomation, {}],
    useLazyLookupCommunicationRecipientQuery: () => [vi.fn(), {}],
  }),
);

const emailSetup = {
  id: "sender-1",
  mode: "managed",
  readiness: "ready",
  senderName: "Test studio",
  fromAddress: "studio@notify.example.test",
  replyToEmail: "hello@example.test",
};
const template = {
  _id: "template-1",
  name: "Booking confirmation",
  defaultLocale: "en",
  subject: "Booking confirmed",
  body: "Thank you for booking with us.",
  format: "plain",
};
const automation = {
  _id: "automation-1",
  name: "Confirmation",
  scheduleType: "afterBooking",
  connectedProductType: "all",
  minutesOffset: 1440,
  senderEmail: "sender-1",
  appliesToAllLocations: true,
  isActive: true,
  templateId: "template-1",
};
function show(props = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AutomatedEmailModal
        automation={automation}
        emailSetup={emailSetup}
        emailTemplates={[template]}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  updateAutomation.mockReturnValue({
    unwrap: () => Promise.resolve({ _id: "automation-1" }),
  });
  createAutomation.mockReturnValue({
    unwrap: () => Promise.resolve({ _id: "automation-2" }),
  });
});

describe("automation editor", () => {
  it("loads inherited template content and saves changed timing without overwriting the reference", async () => {
    const onClose = vi.fn();
    show({ onClose });
    const timing = screen.getByRole("combobox", { name: /Send timing/ });
    expect(timing).toHaveValue("1440");
    expect(screen.getByRole("textbox", { name: "Subject" })).toHaveValue(
      "Booking confirmed",
    );
    expect(screen.getByRole("textbox", { name: "Email content" })).toHaveValue(
      "Thank you for booking with us.",
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Trigger" }), {
      target: { value: "afterBookingCreated" },
    });
    fireEvent.change(timing, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(updateAutomation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "automation-1",
        scheduleType: "afterBookingCreated",
        minutesOffset: 2,
        templateId: "template-1",
        isActive: true,
        contentVariants: {},
      }),
    );
  });

  it("keeps an edited inherited body as an automation override", async () => {
    show();
    fireEvent.change(screen.getByRole("combobox", { name: /Send timing/ }), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Email content" }), {
      target: { value: "Custom confirmation." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updateAutomation).toHaveBeenCalledOnce());
    expect(updateAutomation.mock.calls[0][0].minutesOffset).toBe(0);
    expect(updateAutomation.mock.calls[0][0].contentVariants.en).toMatchObject({
      subject: "Booking confirmed",
      body: "Custom confirmation.",
    });
  });

  it("removes Open Studio from new selections while preserving an existing filter", () => {
    const view = show();
    expect(
      within(
        screen.getByRole("combobox", { name: "Product type" }),
      ).queryByRole("option", { name: "Open Studio" }),
    ).toBeNull();
    view.unmount();
    show({ automation: { ...automation, connectedProductType: "workshop" } });
    expect(screen.getByRole("combobox", { name: "Product type" })).toHaveValue(
      "workshop",
    );
  });

  it("explains a missing sender instead of silently disabling save", () => {
    show({
      automation: { ...automation, senderEmail: null },
      emailSetup: null,
    });
    expect(
      screen.getByText(/The email sender could not be loaded/),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
});
