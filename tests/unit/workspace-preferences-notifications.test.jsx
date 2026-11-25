import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "@/messages/cs.json";

const mocks = vi.hoisted(() => ({
  preferences: {},
  updatePreferences: vi.fn(),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector({ auth: { workspaceAccess: null } }),
}));
vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useGetCurrentWorkspaceAccessQuery: () => ({
    data: {
      workspaceAccess: { membershipId: "me", preferences: mocks.preferences },
    },
    isLoading: false,
  }),
  useUpdateWorkspacePreferencesMutation: () => [
    mocks.updatePreferences,
    { isLoading: false },
  ],
}));

import WorkspacePreferencesPage from "@/components/views/settings/WorkspacePreferencesPage";

const renderPreferences = () =>
  render(
    <NextIntlClientProvider
      locale="cs"
      messages={messages}
      timeZone="Europe/Prague"
    >
      <WorkspacePreferencesPage showPageHeader={false} />
    </NextIntlClientProvider>,
  );

const bookingCreatedCheckbox = () =>
  screen.getByRole("checkbox", { name: /^Vytvořená rezervace/ });

describe("booking creation notification preferences", () => {
  beforeEach(() => {
    mocks.preferences = {};
    mocks.updatePreferences.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
  });

  it.each([
    undefined,
    {},
    { bookingAssigned: true },
    { bookingCreated: false },
  ])(
    "keeps creation notifications off by default for preferences %j",
    (notifications) => {
      mocks.preferences = { notifications };
      renderPreferences();

      expect(bookingCreatedCheckbox()).not.toBeChecked();
      expect(
        screen.getByRole("checkbox", { name: /^Přesunutá rezervace/ }),
      ).toBeChecked();
    },
  );

  it("saves opting in and opting out independently of reschedule notifications", async () => {
    const user = userEvent.setup();
    mocks.preferences = { notifications: { bookingAssigned: false } };
    renderPreferences();

    await user.click(bookingCreatedCheckbox());
    await user.click(
      screen.getByRole("button", { name: "Uložit moje předvolby" }),
    );
    expect(mocks.updatePreferences).toHaveBeenLastCalledWith(
      expect.objectContaining({
        notifications: expect.objectContaining({
          bookingCreated: true,
          bookingAssigned: false,
          bookingCancelled: true,
          inApp: true,
        }),
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Vaše předvolby byly uloženy.",
    );

    await user.click(bookingCreatedCheckbox());
    await user.click(
      screen.getByRole("button", { name: "Uložit moje předvolby" }),
    );
    expect(mocks.updatePreferences).toHaveBeenLastCalledWith(
      expect.objectContaining({
        notifications: expect.objectContaining({
          bookingCreated: false,
          bookingAssigned: false,
        }),
      }),
    );
  });

  it("restores the saved opt-in when the page loads", () => {
    mocks.preferences = { notifications: { bookingCreated: true } };
    renderPreferences();

    expect(bookingCreatedCheckbox()).toBeChecked();
  });
});
