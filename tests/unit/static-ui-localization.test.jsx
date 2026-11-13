import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/nl.json";
import Loader from "@/components/loaders/Loader";
import CourseImageGallery from "@/components/galleries/CourseImageGallery";
import BulkAccessCodesDialog from "@/components/views/access-codes/BulkAccessCodesDialog";
import { createTranslator } from "use-intl/core";

vi.mock("next/image", () => ({
  default: ({
    fill,
    priority,
    quality,
    blurDataURL,
    placeholder,
    alt,
    ...props
  }) => (
    // Test double preserves the accessibility label without Next image loading.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

const localized = (children) => (
  <NextIntlClientProvider
    locale="nl"
    messages={messages}
    timeZone="Europe/Prague"
  >
    {children}
  </NextIntlClientProvider>
);

describe("loading and gallery localization", () => {
  it.each(["ACCESS_CODE_DUPLICATE", "UNKNOWN_IMPORT_ERROR"])(
    "keeps a partial access-code import failure localized (%s)",
    async (code) => {
      const t = createTranslator({
        locale: "nl",
        messages,
        namespace: "AccessCodes",
      });
      const onSave = vi.fn().mockResolvedValue({
        created: 0,
        failed: 1,
        results: [
          {
            index: 0,
            status: "failed",
            error: { code, message: "English server diagnostic" },
          },
        ],
      });
      render(
        localized(
          <BulkAccessCodesDialog
            poolId="pool-1"
            onSave={onSave}
            onClose={() => {}}
          />,
        ),
      );
      fireEvent.change(
        screen.getByRole("textbox", { name: t("bulk.pasteLabel") }),
        {
          target: { value: "001527" },
        },
      );
      fireEvent.click(
        screen.getByRole("button", { name: t("bulk.import", { count: 1 }) }),
      );
      const status = await screen.findByRole("status");
      expect(status).toHaveTextContent(
        code === "ACCESS_CODE_DUPLICATE"
          ? t("bulk.errors.rows", { count: 1 })
          : t("errors.saveCode"),
      );
      expect(status).not.toHaveTextContent("English server diagnostic");
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          poolId: "pool-1",
          codes: [expect.objectContaining({ code: "001527" })],
        }),
      );
    },
  );

  it("announces loading in the selected product language", () => {
    render(localized(<Loader fullscreen={false} />));
    expect(screen.getByRole("status", { name: "Laden" })).toBeVisible();
    expect(screen.getByText("Je ruimte wordt voorbereid")).toBeVisible();
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
  });

  it("localizes gallery controls, alt text and image counts while preserving the course name", () => {
    render(
      localized(
        <CourseImageGallery
          courseName="Evening Session"
          images={["/first.jpg", "/second.jpg"]}
        />,
      ),
    );
    expect(screen.getByAltText("Evening Session — afbeelding 1")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Volgende afbeelding" }),
    );
    expect(screen.getByAltText("Evening Session — afbeelding 2")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Afbeelding 2 van 2 bekijken" }),
    ).toHaveAttribute("aria-current", "true");
    fireEvent.click(screen.getByRole("button", { name: "Vorige afbeelding" }));
    expect(screen.getByAltText("Evening Session — afbeelding 1")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Next image" }),
    ).not.toBeInTheDocument();
  });
});
