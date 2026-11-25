import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  save: vi.fn(),
  reset: vi.fn(),
  replace: vi.fn(),
  params: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => mocks.params }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
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
import DoorAccessEmailTemplates from "@/components/communications/email/DoorAccessEmailTemplates";

const template = {
  defaultLocale: "en",
  contentVariants: {
    en: {
      subject: "Welcome to {{studioName}}",
      format: "plain",
      body: "Your code: {{entryCode}}\nBooking: {{bookingTime}}",
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
function templateView(canManage = true) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <DoorAccessEmailTemplates canManage={canManage} />
    </NextIntlClientProvider>
  );
}
const show = (canManage = true) => render(templateView(canManage));
const edit = (location = "Grohova") =>
  fireEvent.click(
    screen.getByRole("button", {
      name: `Edit door-code template for ${location}`,
    }),
  );
const body = () => screen.getByRole("textbox", { name: "Email content" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.params = new URLSearchParams();
  mocks.query.mockReturnValue({ data: { locations } });
  mocks.save.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  mocks.reset.mockReturnValue({ unwrap: () => Promise.resolve({}) });
});

describe("location door-code email templates", () => {
  it("edits only the chosen location and persists localized content without changing delivery settings", async () => {
    show();
    expect(screen.getByText("Default message")).toBeVisible();
    expect(screen.getByText("Customized message")).toBeVisible();
    edit("Lidicka");
    expect(screen.getByRole("dialog", { name: "Lidicka" })).toBeVisible();
    fireEvent.change(body(), {
      target: { value: "Lidicka side entrance: {{entryCode}}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save template" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.save.mock.calls[0][0]).toEqual({
      locationId: "location-b",
      defaultLocale: "en",
      contentVariants: {
        en: expect.objectContaining({
          subject: "Welcome to {{studioName}}",
          body: "Lidicka side entrance: {{entryCode}}",
        }),
        cs: expect.objectContaining({ body: "Váš kód: {{entryCode}}" }),
      },
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "saved for Lidicka",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens only an authorized location from a deep link", () => {
    mocks.params = new URLSearchParams("doorLocation=not-returned");
    const view = show();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    view.unmount();
    mocks.params = new URLSearchParams("doorLocation=location-a");
    show();
    expect(screen.getByRole("dialog", { name: "Grohova" })).toBeVisible();
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("allows a read-only preview without mutation controls", () => {
    show(false);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Preview door-code template for Lidicka",
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

  it("clears a closed deep link and still opens a later explicit link to the same location", () => {
    const deepLink =
      "section=templates&doorLocation=location-a&source=settings&location=grohova";
    mocks.params = new URLSearchParams(deepLink);
    const view = show();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.replace).toHaveBeenLastCalledWith(
      "/app/communications?section=templates&source=settings&location=grohova",
      { scroll: false },
    );

    mocks.params = new URLSearchParams(
      "section=templates&source=settings&location=grohova",
    );
    view.rerender(templateView());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    mocks.params = new URLSearchParams(deepLink);
    view.rerender(templateView());
    expect(screen.getByRole("dialog", { name: "Grohova" })).toBeVisible();
  });

  it.each(["save", "reset"])(
    "clears the editor deep link after %s succeeds",
    async (action) => {
      mocks.params = new URLSearchParams(
        "section=templates&doorLocation=location-b&source=automation",
      );
      show();
      if (action === "save") {
        fireEvent.click(screen.getByRole("button", { name: "Save template" }));
      } else {
        fireEvent.click(
          screen.getByRole("button", { name: "Restore default message" }),
        );
        fireEvent.click(
          screen.getByRole("button", { name: "Restore default", exact: true }),
        );
      }
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(mocks.replace).toHaveBeenLastCalledWith(
        "/app/communications?section=templates&source=automation",
        { scroll: false },
      );
    },
  );

  it("keeps the deep link while editing and removes it only after confirming discard", () => {
    mocks.params = new URLSearchParams(
      "section=templates&doorLocation=location-a",
    );
    show();
    fireEvent.change(body(), { target: { value: "Unsaved {{entryCode}}" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mocks.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(mocks.replace).toHaveBeenCalledWith(
      "/app/communications?section=templates",
      { scroll: false },
    );
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("prevents saving when the door-code placeholder is removed", () => {
    show();
    edit();
    fireEvent.change(body(), {
      target: { value: "Hello, welcome to our studio." },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Include the door-code placeholder",
    );
    expect(
      screen.getByRole("button", { name: "Save template" }),
    ).toBeDisabled();
  });

  it("uses example values in the preview and offers only supported door-email variables", () => {
    show();
    edit();
    const frame = screen.getByTitle("English email preview");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame.getAttribute("srcdoc")).toContain("123456");
    expect(frame.getAttribute("srcdoc")).toContain("Grohova");
    fireEvent.click(screen.getByText("Shared variables"));
    expect(
      screen.queryByRole("button", { name: "{{firstName}}" }),
    ).not.toBeInTheDocument();
    fireEvent.focus(screen.getByRole("textbox", { name: "Subject" }));
    expect(
      screen.getByRole("button", { name: "{{entryCode}}" }),
    ).toBeDisabled();
  });

  it("keeps unsaved changes until the user explicitly discards them", () => {
    show();
    edit();
    fireEvent.change(body(), {
      target: { value: "New instructions {{entryCode}}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("alert")).toHaveTextContent("unsaved changes");
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(body()).toHaveValue("New instructions {{entryCode}}");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("resets only the selected location after explicit confirmation", async () => {
    show();
    edit("Lidicka");
    fireEvent.change(body(), { target: { value: "Unsaved {{entryCode}}" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Restore default message" }),
    );
    expect(mocks.reset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(body()).toHaveValue("Unsaved {{entryCode}}");
    fireEvent.click(
      screen.getByRole("button", { name: "Restore default message" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Restore default", exact: true }),
    );
    await waitFor(() => expect(mocks.reset).toHaveBeenCalledWith("location-b"));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "restored for Lidicka",
    );
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("keeps the edited message when saving fails", async () => {
    mocks.save.mockReturnValue({
      unwrap: () => Promise.reject({ data: { message: "Save unavailable" } }),
    });
    show();
    edit();
    fireEvent.change(body(), {
      target: { value: "New entrance {{entryCode}}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save template" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Save unavailable",
    );
    expect(body()).toHaveValue("New entrance {{entryCode}}");
  });
});
