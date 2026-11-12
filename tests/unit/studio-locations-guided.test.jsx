import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import StudioLocationEditPage from "@/components/views/locations/StudioLocationEditPage";

const LOCATION_ID = "64b000000000000000000001";

const { childProps, locationQuery, searchParams, tenantQuery } = vi.hoisted(
  () => ({
    childProps: { value: null },
    locationQuery: { value: null },
    searchParams: { value: new URLSearchParams() },
    tenantQuery: { value: null },
  }),
);

vi.mock("next-intl", () => ({
  useTranslations: () => (key) =>
    ({
      loading: "Loading studio locations…",
      loadError: "We could not load this studio location.",
      retry: "Try again",
      "createPage.back": "Back to studio locations",
    })[key] || key,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams.value,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationByIdQuery: (...args) => {
    locationQuery.args = args;
    return locationQuery.value;
  },
}));

vi.mock("@/lib/features/tenants/tenantApiSlice", () => ({
  useGetCurrentTenantOnboardingQuery: (...args) => {
    tenantQuery.args = args;
    return tenantQuery.value;
  },
}));

vi.mock("@/components/views/locations/StudioLocationCreatePage", () => ({
  default: function MockStudioLocationForm(props) {
    childProps.value = props;
    const [saveError, setSaveError] = useState(false);
    return (
      <div>
        <span>Full studio location form</span>
        <span data-testid="loaded-location">{props.location.name}</span>
        <input aria-label="Location name" defaultValue={props.location.name} />
        <button onClick={() => setSaveError(true)}>Reject save</button>
        {saveError ? <p role="alert">Temporary save failure.</p> : null}
      </div>
    );
  },
}));

describe("StudioLocationEditPage", () => {
  beforeEach(() => {
    childProps.value = null;
    searchParams.value = new URLSearchParams();
    locationQuery.value = {
      currentData: { id: LOCATION_ID, name: "Klei Atelier" },
      data: { id: LOCATION_ID, name: "Klei Atelier" },
      isFetching: false,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    tenantQuery.value = {
      data: undefined,
      isLoading: false,
      isFetching: false,
    };
  });

  it("loads the requested location and mounts the shared full-page form", () => {
    render(<StudioLocationEditPage locationId={LOCATION_ID} />);

    expect(screen.getByText("Full studio location form")).toBeInTheDocument();
    expect(locationQuery.args).toEqual([LOCATION_ID, { skip: false }]);
    expect(childProps.value).toMatchObject({
      location: { id: LOCATION_ID, name: "Klei Atelier" },
      requireBookingEnabled: false,
    });
    expect(tenantQuery.args[1]).toEqual({ skip: true });
  });

  it("waits for guided tenant configuration and requires booking when courses are enabled", () => {
    searchParams.value = new URLSearchParams("setupStep=location");
    tenantQuery.value = {
      data: {
        tenant: {
          modules: { bookings: false, courses: true },
        },
      },
      isLoading: false,
      isFetching: false,
    };

    render(<StudioLocationEditPage locationId={LOCATION_ID} />);

    expect(childProps.value.requireBookingEnabled).toBe(true);
    expect(tenantQuery.args[1]).toEqual({ skip: false });
  });

  it("keeps the form hidden while guided tenant configuration is loading", () => {
    searchParams.value = new URLSearchParams("setupStep=location");
    tenantQuery.value = {
      data: undefined,
      isLoading: false,
      isFetching: true,
    };

    render(<StudioLocationEditPage locationId={LOCATION_ID} />);

    expect(screen.getByLabelText("Loading studio locations…")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(
      screen.queryByText("Full studio location form"),
    ).not.toBeInTheDocument();
  });

  it("shows the full-page loading state without flashing an empty form", () => {
    locationQuery.value = {
      currentData: undefined,
      data: undefined,
      isFetching: true,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    };

    render(<StudioLocationEditPage locationId={LOCATION_ID} />);

    expect(screen.getByLabelText("Loading studio locations…")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(
      screen.queryByText("Full studio location form"),
    ).not.toBeInTheDocument();
  });

  it("does not hydrate a new route from the previous query argument", () => {
    const nextLocationId = "64b000000000000000000002";
    const { rerender } = render(
      <StudioLocationEditPage locationId={LOCATION_ID} />,
    );

    expect(screen.getByTestId("loaded-location")).toHaveTextContent(
      "Klei Atelier",
    );

    locationQuery.value = {
      currentData: undefined,
      data: { id: LOCATION_ID, name: "Klei Atelier" },
      isFetching: true,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    rerender(<StudioLocationEditPage locationId={nextLocationId} />);

    expect(screen.getByLabelText("Loading studio locations…")).toBeVisible();
    expect(screen.queryByTestId("loaded-location")).not.toBeInTheDocument();

    locationQuery.value = {
      currentData: { id: nextLocationId, name: "Second studio" },
      data: { id: nextLocationId, name: "Second studio" },
      isFetching: false,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    rerender(<StudioLocationEditPage locationId={nextLocationId} />);

    expect(screen.getByTestId("loaded-location")).toHaveTextContent(
      "Second studio",
    );
  });

  it.each([false, true])(
    "preserves the draft and save error during background refresh (refresh error: %s)",
    async (isError) => {
      const user = userEvent.setup();
      const { rerender } = render(
        <StudioLocationEditPage locationId={LOCATION_ID} />,
      );
      const nameInput = screen.getByRole("textbox", { name: "Location name" });
      await user.clear(nameInput);
      await user.type(nameInput, "Unsaved studio name");
      await user.click(screen.getByRole("button", { name: "Reject save" }));

      locationQuery.value = { ...locationQuery.value, isFetching: true };
      rerender(<StudioLocationEditPage locationId={LOCATION_ID} />);

      expect(screen.getByRole("textbox", { name: "Location name" })).toBe(
        nameInput,
      );
      expect(nameInput).toHaveValue("Unsaved studio name");
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Temporary save failure.",
      );

      locationQuery.value = {
        ...locationQuery.value,
        isFetching: false,
        isError,
      };
      rerender(<StudioLocationEditPage locationId={LOCATION_ID} />);

      expect(screen.getByRole("textbox", { name: "Location name" })).toBe(
        nameInput,
      );
      expect(nameInput).toHaveValue("Unsaved studio name");
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Temporary save failure.",
      );
    },
  );

  it("does not query malformed location ids", () => {
    locationQuery.value = {
      currentData: undefined,
      data: undefined,
      isFetching: false,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };

    render(<StudioLocationEditPage locationId="not-a-location" />);

    expect(locationQuery.args).toEqual(["not-a-location", { skip: true }]);
    expect(
      screen.getByRole("heading", {
        name: "We could not load this studio location.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
  });

  it("offers an in-place retry after a load failure", async () => {
    const refetch = vi.fn();
    locationQuery.value = {
      currentData: undefined,
      data: undefined,
      isFetching: false,
      isLoading: false,
      isError: true,
      refetch,
    };
    const user = userEvent.setup();

    render(<StudioLocationEditPage locationId={LOCATION_ID} />);
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(refetch).toHaveBeenCalledOnce();
  });
});
