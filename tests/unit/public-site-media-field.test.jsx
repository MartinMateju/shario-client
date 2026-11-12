import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import {
  CoursePageFields,
  LoginFields,
  MediaField,
} from "@/components/public-site-editor/PublicSiteEditorFields";
import messages from "@/messages/en.json";

const renderField = (overrides = {}) => {
  const props = {
    label: "Hero image",
    path: "branding.coverImageUrl",
    slot: "cover",
    value: "",
    onChange: vi.fn(),
    onUpload: vi.fn(() => true),
    onClearUpload: vi.fn(),
    uploadState: {
      busy: false,
      slot: null,
      errorSlot: null,
      errorMessage: null,
      failedUpload: null,
      resetToken: 0,
    },
    ...overrides,
  };
  const view = render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <MediaField {...props} />
    </NextIntlClientProvider>,
  );
  return { ...view, props };
};

describe("course hero upload identity", () => {
  const courseProps = () => ({
    draft: { customerPortal: { courses: { locations: [] } } },
    locations: [
      { id: "studio-a", name: "Grohova" },
      { id: "studio-b", name: "Václavská" },
    ],
    selectedLocationId: "studio-a",
    onLocationChange: vi.fn(),
    onChange: vi.fn(),
    onUpload: vi.fn(() => true),
    onClearUpload: vi.fn(),
    uploadState: { busy: false, resetToken: 0 },
  });
  const view = (props) => (
    <NextIntlClientProvider locale="en" messages={messages}>
      <CoursePageFields {...props} />
    </NextIntlClientProvider>
  );

  it("offers a disabled-by-default tenant-wide guest checkout setting without a studio override", () => {
    const props = { ...courseProps(), locations: [] };
    const { rerender } = render(view(props));
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(props.onChange).toHaveBeenCalledExactlyOnceWith(
      "customerPortal.courses.guestCheckoutEnabled",
      true,
    );
    rerender(
      view({
        ...props,
        draft: {
          customerPortal: {
            courses: { guestCheckoutEnabled: true, locations: [] },
          },
        },
      }),
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(props.onChange).toHaveBeenLastCalledWith(
      "customerPortal.courses.guestCheckoutEnabled",
      false,
    );
    rerender(view({ ...props, disabled: true }));
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("keeps failed upload feedback and retries with the original studio", () => {
    const failedUpload = {
      file: new File(["image"], "grohova.webp", { type: "image/webp" }),
      slot: "courseHero",
      path: "customerPortal.courses.locations.0.heroImageUrl",
      locationId: "studio-a",
    };
    const props = {
      ...courseProps(),
      uploadState: {
        busy: false,
        errorSlot: "courseHero",
        locationId: "studio-a",
        errorMessage: "Storage is unavailable.",
        failedUpload,
        fileName: "grohova.webp",
        fileSize: 5,
      },
    };
    const { rerender } = render(view(props));
    expect(screen.getByText("Storage is unavailable.")).toBeInTheDocument();

    rerender(view({ ...props, selectedLocationId: "studio-b" }));
    expect(
      screen.queryByText("Storage is unavailable."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("grohova.webp · 5 B")).not.toBeInTheDocument();

    rerender(view(props));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(props.onUpload).toHaveBeenCalledWith(failedUpload);
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it("does not create a draft studio entry before the image upload succeeds", () => {
    const props = { ...courseProps(), onUpload: vi.fn(() => false) };
    const { container } = render(view(props));
    const file = new File(["invalid"], "unsupported.svg", {
      type: "image/svg+xml",
    });

    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [file] },
    });

    expect(props.onUpload).toHaveBeenCalledWith({
      file,
      slot: "courseHero",
      path: "customerPortal.courses.locations.0.heroImageUrl",
      locationId: "studio-a",
    });
    expect(props.onChange).not.toHaveBeenCalled();
    expect(container.querySelector('img[src^="blob:"]')).toBeNull();
  });
});

describe("public-site media field", () => {
  it("selects an image and renders a local crop-aware preview", () => {
    const { container, props } = renderField();
    const input = container.querySelector('input[type="file"]');
    const file = new File(["image"], "studio.webp", {
      type: "image/webp",
    });

    fireEvent.change(input, { target: { files: [file] } });

    expect(props.onUpload).toHaveBeenCalledWith({
      file,
      slot: "cover",
      path: "branding.coverImageUrl",
    });
    expect(screen.getByAltText("Hero image").getAttribute("src")).toMatch(
      /^blob:/,
    );
  });

  it("previews studio logos in the same wide wordmark frame as login", () => {
    renderField({
      label: "Studio logo",
      path: "branding.logoUrl",
      slot: "logo",
      value: "https://media.example/logo.webp",
    });

    const image = screen.getByAltText("Studio logo");

    expect(image.parentElement).toHaveClass("aspect-[3/1]", "sm:w-32");
    expect(image).toHaveClass("object-contain");
  });

  it("labels the shared asset as the login form logo and warns against QR codes", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LoginFields
          draft={{
            branding: { logoUrl: "" },
            login: {
              headline: { cs: "", en: "" },
              supportingText: { cs: "", en: "" },
              helpText: { cs: "", en: "" },
              backgroundImageUrl: "",
            },
          }}
          onChange={vi.fn()}
          onUpload={vi.fn(() => true)}
          onClearUpload={vi.fn()}
          disabled={false}
          uploadState={{ busy: false, resetToken: 0 }}
        />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("group", { name: "Login form logo" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/not a QR\/payment code/i)).toBeInTheDocument();
  });

  it("accepts drag and drop and exposes a field-local retry", () => {
    const failedUpload = {
      file: new File(["image"], "studio.png", { type: "image/png" }),
      slot: "cover",
      path: "branding.coverImageUrl",
    };
    const { props } = renderField({
      uploadState: {
        busy: false,
        slot: null,
        errorSlot: "cover",
        errorMessage: "Storage is unavailable.",
        failedUpload,
        fileName: "studio.png",
        fileSize: 5,
      },
    });

    expect(screen.getByText("Storage is unavailable.")).toBeInTheDocument();
    expect(screen.getByText("studio.png · 5 B")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(props.onUpload).toHaveBeenCalledWith(failedUpload);

    const replacement = new File(["next"], "next.jpg", {
      type: "image/jpeg",
    });
    fireEvent.drop(screen.getByText("Drop an image here or choose a file"), {
      dataTransfer: { files: [replacement] },
    });
    expect(props.onUpload).toHaveBeenLastCalledWith({
      file: replacement,
      slot: "cover",
      path: "branding.coverImageUrl",
    });
  });

  it("locks every media control while another revision-sensitive upload runs", () => {
    const { container } = renderField({
      value: "https://media.example/hero.jpg",
      uploadState: {
        busy: true,
        slot: "logo",
        errorSlot: null,
        errorMessage: null,
        failedUpload: null,
        resetToken: 0,
      },
    });

    expect(container.querySelector('input[type="file"]')).toBeDisabled();
    expect(container.querySelector('input[type="url"]')).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();
  });

  it("does not preview a rejected drop and uses valid compound semantics", () => {
    const onUpload = vi.fn(() => false);
    renderField({ onUpload });
    const rejected = new File(["<svg />"], "unsafe.svg", {
      type: "image/svg+xml",
    });

    fireEvent.drop(screen.getByText("Drop an image here or choose a file"), {
      dataTransfer: { files: [rejected] },
    });

    expect(onUpload).toHaveBeenCalledOnce();
    expect(screen.queryByAltText("Hero image")).not.toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Hero image" }),
    ).toBeInTheDocument();
  });

  it("clears stale retry state and invalidates a reconciled local preview", () => {
    const failedUpload = {
      file: new File(["image"], "studio.png", { type: "image/png" }),
      slot: "cover",
      path: "branding.coverImageUrl",
    };
    const { container, props, rerender } = renderField({
      value: "https://media.example/old.webp",
      uploadState: {
        busy: false,
        slot: null,
        errorSlot: "cover",
        errorMessage: "Storage is unavailable.",
        failedUpload,
        fileName: "studio.png",
        fileSize: 2_048,
        resetToken: 0,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(props.onClearUpload).toHaveBeenCalledOnce();
    expect(props.onChange).toHaveBeenCalledWith("branding.coverImageUrl", "");

    const file = new File(["image"], "next.webp", { type: "image/webp" });
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [file] },
    });
    expect(screen.getByAltText("Hero image").getAttribute("src")).toMatch(
      /^blob:/,
    );

    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <MediaField
          {...props}
          value="https://media.example/next.webp"
          uploadState={{
            ...props.uploadState,
            errorSlot: null,
            errorMessage: null,
            failedUpload: null,
            resetToken: 1,
          }}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByAltText("Hero image")).toHaveAttribute(
      "src",
      "https://media.example/next.webp",
    );

    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <MediaField
          {...props}
          value=""
          uploadState={{
            ...props.uploadState,
            errorSlot: null,
            errorMessage: null,
            failedUpload: null,
            resetToken: 1,
          }}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByAltText("Hero image")).not.toBeInTheDocument();
  });
});
