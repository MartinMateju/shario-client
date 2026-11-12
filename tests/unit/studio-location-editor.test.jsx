import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudioLocationCreatePage from "@/components/views/locations/StudioLocationCreatePage";
import messages from "@/messages/en.json";
const LOCATION_ID = "64b000000000000000000001";
const {
  activateLocation,
  createLocation,
  refreshAndContinue,
  replace,
  searchParams,
  updateLocation,
  locationDefaultsQuery,
  getLocations,
} = vi.hoisted(() => ({
  activateLocation: vi.fn(),
  createLocation: vi.fn(),
  refreshAndContinue: vi.fn(),
  replace: vi.fn(),
  searchParams: {
    value: new URLSearchParams(),
  },
  updateLocation: vi.fn(),
  locationDefaultsQuery: {
    value: {},
  },
  getLocations: vi.fn(),
}));
const translations = {
  "form.editTitle": "Edit studio location",
  "form.editDescription": "Update the location details and booking settings.",
  "form.bookingEnabled": "Allow bookings at this location",
  "form.bookingRequiredForLaunch": "Online booking is required for launch.",
  "form.save": "Save changes",
  "form.saveAndContinue": "Save and continue",
  "form.saving": "Saving…",
  "form.requestError": "We could not save this studio location.",
  "form.activityGeneral": "General studio activity",
  "form.activityHelp": "Legacy general studio capacity.",
  "form.overlapSection": "Overlapping bookings",
  "form.allowPublicOverlap": "Allow customers to make overlapping bookings",
  "form.overlapLimit": "Maximum simultaneous bookings (not people)",
  "form.monday": "Monday",
  "form.tuesday": "Tuesday",
  "form.openTime": "Opening time",
  "form.closeTime": "Closing time",
  "form.openingHoursInvalid": "Use a valid 24-hour time.",
  "createPage.fields.name": "Location name",
  "createPage.fields.addressLine1": "Street and building number",
  "createPage.fields.city": "City",
  "createPage.fields.postalCode": "Postal code",
  "createPage.fields.country": "Country",
  "createPage.fields.timezone": "Timezone",
  "createPage.fields.slotStep": "Booking start times every",
  "createPage.fields.minDuration": "Shortest booking",
  "createPage.fields.maxDuration": "Longest booking",
  "createPage.fields.phone": "Contact phone",
  "createPage.fields.phoneCountry": "Calling code",
  "createPage.fields.activityCapacity": "Activity capacity",
  "createPage.hints.phone": "Phone hint",
  "createPage.tooltips.phone": "Phone formatting help",
  "createPage.activityMode.label":
    "Should customers choose an activity when booking?",
  "createPage.activityMode.required": "Yes, the choice is required",
  "createPage.activityMode.requiredDescription": "Required description",
  "createPage.activityMode.optional": "Yes, but the choice is optional",
  "createPage.activityMode.optionalDescription": "Optional description",
  "createPage.activityMode.hidden": "No, do not show activities",
  "createPage.activityMode.hiddenDescription": "Hidden description",
  "createPage.activities.workstation": "Pottery wheel",
  "createPage.activities.workstationDescription": "Wheel description",
  "createPage.activities.sharedTable": "Modelling and glazing",
  "createPage.activities.sharedTableDescription": "Table description",
  "createPage.activities.useOverall": "Use overall location capacity",
  "createPage.activities.customLimit": "Use a custom activity limit",
  "createPage.actions.cancel": "Cancel",
};
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key, values) => {
    const translated =
      translations[key] ||
      (key.startsWith("pricingMode.") || key.startsWith("firingSettings.")
        ? messages.Locations[key.split(".")[0]][key.split(".")[1]]
        : key);
    return Object.entries(values || {}).reduce(
      (message, [name, value]) =>
        message.replaceAll(`{${name}}`, String(value)),
      translated,
    );
  },
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams.value,
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        userInfo: {
          tenantId: "64b000000000000000000099",
        },
      },
    }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    replace,
  }),
}));
vi.mock("@/components/setup-center/useGuidedSetupStep", () => ({
  default: () => ({
    refreshAndContinue,
  }),
}));
vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: (...args) => {
    getLocations(...args);
    return locationDefaultsQuery.value;
  },
  useActivateLocationMutation: () => [activateLocation],
  useCreateLocationMutation: () => [
    createLocation,
    {
      isLoading: false,
    },
  ],
  useUpdateLocationMutation: () => [
    updateLocation,
    {
      isLoading: false,
    },
  ],
}));
const location = {
  id: LOCATION_ID,
  name: "Klei Atelier – Václavská",
  isActive: true,
  address: {
    line1: "Václavská 237/6",
    line2: "Entrance from the car park",
    city: "Brno",
    postalCode: "603 00",
    country: "Czech Republic",
  },
  contact: {
    email: "vaclavska@atelierklei.com",
    phone: "+420605989401",
  },
  booking: {
    enabled: true,
    timezone: "Europe/Prague",
    slotStepMinutes: 30,
    minBookingMinutes: 60,
    maxBookingMinutes: 360,
    allowPublicSoloOverlap: false,
    maxPublicSoloOverlaps: 1,
    globalCapacity: 8,
    privateSessionBlocksAll: true,
    groupBookingBlocksAll: true,
    activitySelectionMode: "OPTIONAL",
    activityCapacities: [
      {
        activity: "WORKSTATION",
        capacity: 4,
      },
      {
        activity: "SHARED_TABLE",
        capacity: 8,
      },
    ],
    confirmationMode: "manual",
    doorCodeMinutesBefore: 15,
  },
  openingHours: {
    monday: {
      isOpen: true,
      openTime: "06:00",
      closeTime: "24:00",
    },
  },
};
const deferred = () => {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return {
    promise,
    resolve,
  };
};
describe("full-page studio location editor", () => {
  beforeEach(() => {
    getLocations.mockReset();
    locationDefaultsQuery.value = {};
    activateLocation.mockReset();
    createLocation.mockReset();
    refreshAndContinue.mockReset();
    replace.mockReset();
    searchParams.value = new URLSearchParams();
    updateLocation.mockReset();
    updateLocation.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(location),
    });
  });
  it("hydrates the create-page design with existing studio data", () => {
    render(<StudioLocationCreatePage location={location} />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Edit studio location",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Location name/)).toHaveValue(
      "Klei Atelier – Václavská",
    );
    expect(screen.getByLabelText(/Postal code/)).toHaveValue("603 00");
    expect(
      within(
        screen.getByRole("group", {
          name: "Contact phone",
        }),
      ).getByRole("textbox"),
    ).toHaveValue("605989401");
    expect(
      screen.getByRole("button", {
        name: /^Yes, but the choice is optional/,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("switch", {
        name: "Pottery wheel",
      }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen
        .getAllByRole("button", {
          name: "Use a custom activity limit",
        })
        .some((button) => button.getAttribute("aria-pressed") === "true"),
    ).toBe(true);
  });
  it("represents existing server-valid timing values outside the create presets", () => {
    const legacyTimingLocation = {
      ...location,
      booking: {
        ...location.booking,
        slotStepMinutes: 20,
        minBookingMinutes: 15,
        maxBookingMinutes: 75,
      },
    };
    render(<StudioLocationCreatePage location={legacyTimingLocation} />);
    expect(screen.getByLabelText("Booking start times every")).toHaveValue(
      "20",
    );
    expect(screen.getByLabelText("Shortest booking")).toHaveValue("15");
    expect(screen.getByLabelText("Longest booking")).toHaveValue("75");
  });
  it("exposes shared overlap controls and saves a booking-count limit separately from people capacity", async () => {
    const user = userEvent.setup();
    render(
      <StudioLocationCreatePage
        location={{
          ...location,
          booking: {
            ...location.booking,
            globalCapacity: 14,
          },
        }}
      />,
    );
    const section = screen.getByRole("region", {
      name: "Overlapping bookings",
    });
    const toggle = within(section).getByRole("switch", {
      name: "Allow customers to make overlapping bookings",
    });
    expect(toggle).toBeVisible();
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(within(section).queryByRole("spinbutton")).not.toBeInTheDocument();
    await user.click(toggle);
    const limit = within(section).getByRole("spinbutton", {
      name: "Maximum simultaneous bookings (not people)",
    });
    expect(limit).toHaveValue(1);
    await user.clear(limit);
    await user.type(limit, "10");
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(updateLocation).toHaveBeenCalledOnce());
    expect(updateLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        booking: expect.objectContaining({
          globalCapacity: 14,
          allowPublicSoloOverlap: true,
          maxPublicSoloOverlaps: 10,
        }),
      }),
    );
  });
  it("preserves an out-of-catalog country, timezone, and phone prefix", async () => {
    const internationalLocation = {
      ...location,
      address: {
        ...location.address,
        country: "JP",
      },
      contact: {
        ...location.contact,
        phone: "+819012345678",
      },
      booking: {
        ...location.booking,
        timezone: "Asia/Tokyo",
        activitySelectionMode: "HIDDEN",
        activityCapacities: [],
      },
    };
    const user = userEvent.setup();
    render(<StudioLocationCreatePage location={internationalLocation} />);
    expect(screen.getByLabelText(/Country/)).toHaveValue("JP");
    expect(screen.getByLabelText(/Timezone/)).toHaveValue("Asia/Tokyo");
    expect(
      within(
        screen.getByRole("group", {
          name: "Contact phone",
        }),
      ).getByRole("textbox"),
    ).toHaveValue("+819012345678");
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(updateLocation).toHaveBeenCalledOnce());
    expect(updateLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        address: expect.objectContaining({
          country: "JP",
        }),
        contact: expect.objectContaining({
          phone: "+819012345678",
        }),
        booking: expect.objectContaining({
          timezone: "Asia/Tokyo",
        }),
      }),
    );
  });
  it("keeps legacy general studio capacity editable and saveable", async () => {
    const generalLocation = {
      ...location,
      booking: {
        ...location.booking,
        activitySelectionMode: "OPTIONAL",
        activityCapacities: [
          {
            activity: "GENERAL",
            capacity: 5,
          },
        ],
      },
    };
    const user = userEvent.setup();
    render(<StudioLocationCreatePage location={generalLocation} />);
    expect(
      screen.getByRole("switch", {
        name: "General studio activity",
      }),
    ).toHaveAttribute("aria-checked", "true");
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(updateLocation).toHaveBeenCalledOnce());
    expect(updateLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        booking: expect.objectContaining({
          activityCapacities: expect.arrayContaining([
            {
              activity: "GENERAL",
              capacity: 5,
            },
          ]),
        }),
      }),
    );
  });
  it("cancels to the list without reopening guided edit context", () => {
    searchParams.value = new URLSearchParams(
      "locationId=legacy&setupStep=location&source=launch-center",
    );
    render(<StudioLocationCreatePage location={location} />);
    expect(
      screen.getByRole("link", {
        name: "Cancel",
      }),
    ).toHaveAttribute("href", "/app/settings/locations?source=launch-center");
  });
  it("patches the location, preserves hidden booking fields, and returns to the list", async () => {
    const user = userEvent.setup();
    render(<StudioLocationCreatePage location={location} />);
    await user.clear(screen.getByLabelText(/Location name/));
    await user.type(
      screen.getByLabelText(/Location name/),
      "Klei Atelier Brno",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(updateLocation).toHaveBeenCalledTimes(1));
    expect(updateLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: LOCATION_ID,
        name: "Klei Atelier Brno",
        contact: expect.objectContaining({
          phone: "+420605989401",
        }),
        booking: expect.objectContaining({
          confirmationMode: "manual",
          doorCodeMinutesBefore: 15,
          activitySelectionMode: "OPTIONAL",
          activityCapacities: expect.arrayContaining([
            {
              activity: "WORKSTATION",
              capacity: 4,
            },
            {
              activity: "SHARED_TABLE",
              capacity: 8,
            },
          ]),
        }),
        openingHours: expect.objectContaining({
          monday: {
            isOpen: true,
            openTime: "06:00",
            closeTime: "24:00",
          },
        }),
      }),
    );
    expect(createLocation).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/app/settings/locations"),
    );
  });
  it("applies opening-hour constraints and blocks an invalid closing time", async () => {
    const user = userEvent.setup();
    render(<StudioLocationCreatePage location={location} />);
    const openingTime = screen.getByLabelText("Monday – Opening time");
    const closingTime = screen.getByLabelText("Monday – Closing time");
    expect(openingTime).toHaveAttribute(
      "pattern",
      "^([01]\\d|2[0-3]):[0-5]\\d$",
    );
    expect(closingTime).toHaveAttribute(
      "pattern",
      "^(?:([01]\\d|2[0-3]):[0-5]\\d|24:00)$",
    );
    expect(closingTime).toHaveValue("24:00");
    await user.clear(closingTime);
    await user.type(closingTime, "24:01");
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    expect(updateLocation).not.toHaveBeenCalled();
    expect(closingTime).toHaveAttribute("aria-invalid", "true");
  });
  it("disables opening-time inputs for a closed day", () => {
    const closedTuesdayLocation = {
      ...location,
      openingHours: {
        ...location.openingHours,
        tuesday: {
          isOpen: false,
          openTime: "09:00",
          closeTime: "17:00",
        },
      },
    };
    render(<StudioLocationCreatePage location={closedTuesdayLocation} />);
    expect(screen.getByLabelText("Tuesday – Opening time")).toBeDisabled();
    expect(screen.getByLabelText("Tuesday – Closing time")).toBeDisabled();
  });
  it("keeps the page open and reports a failed update", async () => {
    updateLocation.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        data: {
          message: "The studio could not be updated.",
        },
      }),
    });
    const user = userEvent.setup();
    render(<StudioLocationCreatePage location={location} />);
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The studio could not be updated.",
    );
    expect(replace).not.toHaveBeenCalled();
  });
  it("retries the edited guided draft after a failed save and only then continues", async () => {
    searchParams.value = new URLSearchParams("setupStep=location");
    updateLocation.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue({
        status: 503,
        data: {
          message: "Temporary save failure.",
        },
      }),
    });
    refreshAndContinue.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<StudioLocationCreatePage location={location} />);
    const nameInput = screen.getByRole("textbox", {
      name: /Location name/,
    });
    await user.clear(nameInput);
    await user.type(nameInput, "Updated studio name");
    await user.click(
      screen.getByRole("button", {
        name: "Save and continue",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Temporary save failure.",
    );
    expect(nameInput).toHaveValue("Updated studio name");
    expect(refreshAndContinue).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", {
        name: "Save and continue",
      }),
    );
    await waitFor(() => expect(refreshAndContinue).toHaveBeenCalledOnce());
    expect(updateLocation).toHaveBeenCalledTimes(2);
    expect(updateLocation.mock.calls[0][0]).toMatchObject({
      id: LOCATION_ID,
      name: "Updated studio name",
    });
    expect(updateLocation.mock.calls[1][0]).toEqual(
      updateLocation.mock.calls[0][0],
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("forces booking on, activates an inactive guided location, and continues", async () => {
    const inactiveLocation = {
      ...location,
      isActive: false,
    };
    searchParams.value = new URLSearchParams(
      "setupStep=location&source=launch-center",
    );
    updateLocation.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(inactiveLocation),
    });
    activateLocation.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        ...inactiveLocation,
        isActive: true,
      }),
    });
    refreshAndContinue.mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <StudioLocationCreatePage
        location={inactiveLocation}
        requireBookingEnabled
      />,
    );
    expect(
      screen.getByRole("switch", {
        name: "Allow bookings at this location",
      }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", {
        name: "Save and continue",
      }),
    );
    await waitFor(() =>
      expect(activateLocation).toHaveBeenCalledWith(LOCATION_ID),
    );
    expect(updateLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: LOCATION_ID,
        booking: expect.objectContaining({
          enabled: true,
        }),
      }),
    );
    expect(updateLocation.mock.invocationCallOrder[0]).toBeLessThan(
      activateLocation.mock.invocationCallOrder[0],
    );
    await waitFor(() =>
      expect(refreshAndContinue).toHaveBeenCalledWith({
        metadata: {
          form: "studio_location",
          locationId: LOCATION_ID,
        },
      }),
    );
    expect(replace).not.toHaveBeenCalled();
  });
  it("keeps every save control disabled through guided activation and continuation", async () => {
    const inactiveLocation = {
      ...location,
      isActive: false,
    };
    const activation = deferred();
    const continuation = deferred();
    searchParams.value = new URLSearchParams("setupStep=location");
    updateLocation.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(inactiveLocation),
    });
    activateLocation.mockReturnValue({
      unwrap: () => activation.promise,
    });
    refreshAndContinue.mockReturnValue(continuation.promise);
    const user = userEvent.setup();
    render(<StudioLocationCreatePage location={inactiveLocation} />);
    await user.click(
      screen.getByRole("button", {
        name: "Save and continue",
      }),
    );
    const savingButton = await screen.findByRole("button", {
      name: "Saving…",
    });
    expect(savingButton).toBeDisabled();
    expect(
      screen.getByRole("link", {
        name: "Cancel",
      }),
    ).toHaveAttribute("aria-disabled", "true");
    await act(async () => {
      activation.resolve({
        ...inactiveLocation,
        isActive: true,
      });
    });
    await waitFor(() => expect(refreshAndContinue).toHaveBeenCalledOnce());
    expect(
      screen.getByRole("button", {
        name: "Saving…",
      }),
    ).toBeDisabled();
    await act(async () => {
      continuation.resolve(true);
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Save and continue",
        }),
      ).toBeEnabled(),
    );
  });
  it("stays on the edit page when guided activation fails", async () => {
    const inactiveLocation = {
      ...location,
      isActive: false,
    };
    searchParams.value = new URLSearchParams("setupStep=location");
    updateLocation.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(inactiveLocation),
    });
    activateLocation.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        data: {
          message: "The location could not be activated.",
        },
      }),
    });
    const user = userEvent.setup();
    render(<StudioLocationCreatePage location={inactiveLocation} />);
    await user.click(
      screen.getByRole("button", {
        name: "Save and continue",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The location could not be activated.",
    );
    expect(refreshAndContinue).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
