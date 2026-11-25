import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  save: vi.fn(),
  reset: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock("@/lib/features/emailTemplates/emailTemplatesApiSlice", () => ({
  useGetDoorAccessEmailTemplatesQuery: mocks.query,
  useUpdateDoorAccessEmailTemplateMutation: () => [
    mocks.save,
    { isLoading: false },
  ],
  useResetDoorAccessEmailTemplateMutation: () => [
    mocks.reset,
    { isLoading: false },
  ],
}));
import DoorAccessEmailSettings from "@/components/views/access-codes/DoorAccessEmailSettings";

const template = {
  defaultLocale: "en",
  contentVariants: {
    en: {
      subject: "Welcome to {{studioName}}",
      format: "plain",
      body: "Your code: {{entryCode}}",
    },
    cs: {
      subject: "Vítejte v {{studioName}}",
      format: "plain",
      body: "Váš kód: {{entryCode}}",
    },
  },
};
const locations = [
  {
    locationId: "location-a",
    locationName: "Grohova",
    isCustomized: false,
    template,
  },
  {
    locationId: "location-b",
    locationName: "Lidicka",
    isCustomized: true,
    template,
  },
];
function settingsView(props = {}) {
  const settings = {
    locationId: "location-a",
    canView: true,
    canManage: true,
    ...props,
  };
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <DoorAccessEmailSettings key={settings.locationId} {...settings} />
    </NextIntlClientProvider>
  );
}
const show = (props) => render(settingsView(props));
const body = () => screen.getByRole("textbox", { name: "Email content" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockReturnValue({ data: { locations }, refetch: mocks.refetch });
  mocks.save.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  mocks.reset.mockReturnValue({ unwrap: () => Promise.resolve({}) });
});

describe("door-code email settings", () => {
  it("creates a location override through the same template update used by Messages", async () => {
    show();
    expect(screen.getByText("Default message")).toBeVisible();
    expect(screen.queryByText("Lidicka")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Create door-code template for Grohova",
      }),
    );
    expect(screen.getByRole("dialog", { name: "Grohova" })).toBeVisible();
    fireEvent.change(body(), {
      target: { value: "Use the side entrance: {{entryCode}}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save template" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.save).toHaveBeenCalledWith({
      locationId: "location-a",
      defaultLocale: "en",
      contentVariants: {
        en: expect.objectContaining({
          body: "Use the side entrance: {{entryCode}}",
        }),
        cs: expect.objectContaining({ body: "Váš kód: {{entryCode}}" }),
      },
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "saved for Grohova",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("edits the existing selected location template without offering another template", () => {
    show({ locationId: "location-b" });
    expect(screen.getByText("Customized message")).toBeVisible();
    expect(screen.queryByText("Grohova")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Create/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Edit door-code template for Lidicka",
      }),
    );
    expect(screen.getByRole("dialog", { name: "Lidicka" })).toBeVisible();
  });

  it("allows a preview without access to saving or resetting", () => {
    show({ canManage: false });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Preview door-code template for Grohova",
      }),
    );
    expect(body()).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Save template" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Restore default message" }),
    ).not.toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
  });

  it.each([{ canView: false }, { locationId: "" }])(
    "skips loading inaccessible settings: %j",
    (props) => {
      show(props);
      expect(mocks.query).toHaveBeenCalledWith(undefined, { skip: true });
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    },
  );

  it("does not substitute another returned location when the selected location is absent", () => {
    show({ locationId: "not-returned" });
    expect(
      screen.getByText(
        "No door-code email template is available for this location.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Grohova")).not.toBeInTheDocument();
    expect(screen.queryByText("Lidicka")).not.toBeInTheDocument();
  });

  it("hides cached content when loading fails and offers a retry", () => {
    mocks.query.mockReturnValue({
      data: { locations },
      isError: true,
      refetch: mocks.refetch,
    });
    show();
    expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
    expect(
      screen.queryByRole("button", { name: /Create door-code/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Grohova")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("waits for the location template to load before offering an editor", () => {
    mocks.query.mockReturnValue({ isLoading: true });
    show();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("clears the old location editor when the settings selection changes", () => {
    const view = show();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Create door-code template for Grohova",
      }),
    );
    fireEvent.change(body(), {
      target: { value: "Grohova only {{entryCode}}" },
    });
    view.rerender(settingsView({ locationId: "location-b" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Edit door-code template for Lidicka",
      }),
    );
    expect(body()).toHaveValue("Your code: {{entryCode}}");
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
