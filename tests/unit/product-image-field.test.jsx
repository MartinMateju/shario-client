import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ProductImageField, {
  PRODUCT_IMAGE_MAX_BYTES,
} from "@/components/products/ProductImageField";

const labels = {
  "form.image": "Product image",
  "form.imageDropTitle": "Drop an image here or choose a file",
  "form.imageFormats": "JPEG, PNG or WebP · maximum 8 MB",
  "form.imageUpload": "Upload image",
  "form.imageReplace": "Replace image",
  "form.imageRemove": "Remove image",
  "form.imagePreviewAlt": "Product image preview",
  "form.imageInvalidType": "Choose a JPEG, PNG or WebP image.",
  "form.imageTooLarge": "Choose an image no larger than 8 MB.",
};

const t = (key) => labels[key] || key;

describe("ProductImageField", () => {
  it("accepts supported images and exposes no URL input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const image = new File(["valid-image"], "class.webp", {
      type: "image/webp",
    });

    render(<ProductImageField onChange={onChange} onRemove={vi.fn()} t={t} />);

    await user.upload(screen.getByLabelText("Product image"), image);

    expect(onChange).toHaveBeenCalledWith(image);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByPlaceholderText("https://…")).toBeNull();
  });

  it("rejects unsupported and oversized files before submission", () => {
    const onChange = vi.fn();
    render(<ProductImageField onChange={onChange} onRemove={vi.fn()} t={t} />);

    fireEvent.change(screen.getByLabelText("Product image"), {
      target: {
        files: [new File(["gif"], "animated.gif", { type: "image/gif" })],
      },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a JPEG, PNG or WebP image.",
    );
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Product image"), {
      target: {
        files: [
          new File(
            [new Uint8Array(PRODUCT_IMAGE_MAX_BYTES + 1)],
            "too-large.png",
            { type: "image/png" },
          ),
        ],
      },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose an image no larger than 8 MB.",
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("allows an existing product image to be removed", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(
      <ProductImageField
        currentImageSrc="https://cdn.example.test/class.jpg"
        onChange={vi.fn()}
        onRemove={onRemove}
        t={t}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove image" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
