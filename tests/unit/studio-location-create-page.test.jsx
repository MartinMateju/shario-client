import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudioLocationCreatePage from "@/components/views/locations/StudioLocationCreatePage";
import messages from "@/messages/en.json";
const {
  activateLocation,
  createLocation,
  refreshAndContinue,
  replace,
  searchParams,
  unwrap,
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
  unwrap: vi.fn(),
  updateLocation: vi.fn(),
  locationDefaultsQuery: {
    value: {},
  },
  getLocations: vi.fn(),
}));
const translations = {
  "createPage.title": "Add a studio location",
  "createPage.fields.name": "Location name",
  "createPage.fields.addressLine1": "Street and building number",
  "createPage.fields.city": "City",
  "createPage.fields.postalCode": "Postal code",
  "createPage.fields.phone": "Contact phone",
  "createPage.fields.phoneCountry": "Calling code",
  "createPage.fields.activityCapacity": "Activity capacity",
  "createPage.hints.phone":
    "Enter the local number. We will save it with the calling code.",
  "createPage.tooltips.phone": "Phone formatting help",
  "createPage.activityRationale.title":
    "Why do I need to configure activities?",
  "createPage.activityRationale.description":
    "Activities protect limited resources such as pottery wheels.",
  "createPage.activityMode.label":
    "Should customers choose an activity when booking?",
  "createPage.activityMode.required": "Yes, the choice is required",
  "createPage.activityMode.requiredDescription":
    "Every customer must select one of the enabled activities.",
  "createPage.activityMode.optional": "Yes, but the choice is optional",
  "createPage.activityMode.optionalDescription":
    "Customers may continue without an activity.",
  "createPage.activityMode.hidden": "No, do not show activities",
  "createPage.activityMode.hiddenDescription":
    "Use only the overall location capacity.",
  "createPage.activities.workstation": "Pottery wheel",
  "createPage.activities.workstationDescription":
    "Limit the available pottery wheels.",
  "createPage.activities.sharedTable": "Modelling and glazing",
  "createPage.activities.sharedTableDescription":
    "Limit the available table places.",
  "createPage.activities.useOverall": "Use overall location capacity",
  "createPage.activities.customLimit": "Use a custom activity limit",
  "createPage.errors.activityRequired":
    "Enable at least one activity when the activity question is shown.",
  "createPage.actions.create": "Create location",
  "form.bookingEnabled": "Allow online bookings",
};
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key, values) => {
    const translated =
      translations[key] ||
      (key.startsWith("pricingMode.")
        ? messages.Locations.pricingMode[key.split(".")[1]]
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
const completeRequiredDetails = async (user) => {
  await user.type(screen.getByLabelText(/Location name/), "Klei Atelier");
  await user.type(
    screen.getByLabelText(/Street and building number/),
    "Václavská 237/6",
  );
  await user.type(screen.getByLabelText(/^City/), "Brno");
  await user.type(screen.getByLabelText(/Postal code/), "60300");
};
describe("StudioLocationCreatePage", () => {
  beforeEach(() => {
    getLocations.mockReset();
    locationDefaultsQuery.value = {
      currentData: {
        inheritedPricingMode: "time",
      },
    };
    createLocation.mockReset();
    activateLocation.mockReset();
    refreshAndContinue.mockReset();
    replace.mockReset();
    searchParams.value = new URLSearchParams();
    unwrap.mockReset();
    updateLocation.mockReset();
    createLocation.mockReturnValue({
      unwrap,
    });
  });
  it("renders as a full page and defaults customer activity selection to required", () => {
    render(<StudioLocationCreatePage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Add a studio location",
      }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-guided-form="location-create"]')).toBe(
      screen
        .getByRole("button", {
          name: "Create location",
        })
        .closest("form"),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Yes, the choice is required/,
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });
  it("requires an enabled activity while the default required mode is active", async () => {
    const user = userEvent.setup();
    render(<StudioLocationCreatePage />);
    await completeRequiredDetails(user);
    await user.click(
      screen.getByRole("button", {
        name: "Create location",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enable at least one activity when the activity question is shown.",
    );
    expect(createLocation).not.toHaveBeenCalled();
  });
  it("shows the postal code in the live address summary", async () => {
    const user = userEvent.setup();
    render(<StudioLocationCreatePage />);
    await completeRequiredDetails(user);
    expect(screen.getByText("Václavská 237/6, 60300 Brno")).toBeInTheDocument();
  });
  it("keeps calling code and phone controls aligned in one labelled group", () => {
    render(<StudioLocationCreatePage />);
    const phoneGroup = screen.getByRole("group", {
      name: "Contact phone",
    });
    expect(
      within(phoneGroup).getByRole("combobox", {
        name: "Calling code",
      }),
    ).toBeInTheDocument();
    expect(
      within(phoneGroup).getByRole("textbox", {
        name: "Contact phone",
      }),
    ).toBeInTheDocument();
  });
  it("explains why activity limits matter", async () => {
    const user = userEvent.setup();
    render(<StudioLocationCreatePage />);
    await user.click(
      screen.getByRole("button", {
        name: "Why do I need to configure activities?",
      }),
    );
    expect(
      screen.getByText(
        "Activities protect limited resources such as pottery wheels.",
      ),
    ).toBeVisible();
  });
  it("does not disable an activity while its custom capacity is being edited", async () => {
    const user = userEvent.setup();
    render(<StudioLocationCreatePage />);
    const activitySwitch = screen.getByRole("switch", {
      name: "Pottery wheel",
    });
    await user.click(activitySwitch);
    await user.click(
      screen.getByRole("button", {
        name: "Use a custom activity limit",
      }),
    );
    const capacityInput = screen.getByRole("spinbutton", {
      name: "Activity capacity",
    });
    await user.clear(capacityInput);
    expect(activitySwitch).toHaveAttribute("aria-checked", "true");
    expect(capacityInput).toBeVisible();
    expect(capacityInput).toHaveValue(null);
    await user.type(capacityInput, "1");
    expect(capacityInput).toHaveValue(1);
    await user.keyboard("{Control>}a{/Control}{Delete}");
    expect(activitySwitch).toHaveAttribute("aria-checked", "true");
    expect(capacityInput).toBeVisible();
    expect(capacityInput).toHaveValue(null);
  });
  it("keeps the switch thumb aligned inside its track in both states", async () => {
    const user = userEvent.setup();
    render(<StudioLocationCreatePage />);
    const activitySwitch = screen.getByRole("switch", {
      name: "Pottery wheel",
    });
    const thumb = activitySwitch.querySelector("[data-switch-thumb]");
    expect(activitySwitch).toHaveClass("p-1");
    expect(thumb).toHaveClass("translate-x-0");
    await user.click(activitySwitch);
    expect(thumb).toHaveClass("translate-x-5");
    expect(thumb).not.toHaveClass("translate-x-1");
  });
  it("normalizes the phone and posts a valid guided required-activity location", async () => {
    searchParams.value = new URLSearchParams("setupStep=location");
    unwrap.mockResolvedValue({
      location: {
        id: "location-1",
      },
    });
    const user = userEvent.setup();
    render(<StudioLocationCreatePage />);
    await completeRequiredDetails(user);
    await user.type(
      screen.getByRole("textbox", {
        name: "Contact phone",
      }),
      "605 989 401",
    );
    await user.click(
      screen.getByRole("switch", {
        name: "Pottery wheel",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Create location",
      }),
    );
    await waitFor(() => expect(createLocation).toHaveBeenCalledTimes(1));
    expect(createLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Klei Atelier",
        pricingMode: "time",
        address: expect.objectContaining({
          line1: "Václavská 237/6",
          city: "Brno",
          postalCode: "60300",
          country: "CZ",
        }),
        contact: expect.objectContaining({
          phone: "+420605989401",
        }),
        booking: expect.objectContaining({
          enabled: true,
          activitySelectionMode: "REQUIRED",
          activityCapacities: [
            {
              activity: "WORKSTATION",
              capacity: 1,
            },
          ],
        }),
      }),
    );
    await waitFor(() =>
      expect(refreshAndContinue).toHaveBeenCalledWith({
        metadata: {
          form: "studio_location",
          locationId: "location-1",
        },
      }),
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
