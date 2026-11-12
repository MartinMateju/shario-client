import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import CourseProductGallery from "@/components/courses/CourseProductGallery";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) => {
      if (key === "openGallery") return `Open gallery for ${values.name}`;
      if (key === "closeGallery") return "Close gallery";
      if (key === "previousImage") return "Previous image";
      if (key === "nextImage") return "Next image";
      if (key === "imagePosition")
        return `Image ${values.current} of ${values.total}`;
      return key;
    },
}));

const images = [
  "/images/workshop-poster.jpg",
  "/images/workshop-studio.jpg",
  "/images/workshop-vase.jpg",
];
const courseName = "Ikebana workshop";
const product = {
  id: "ikebana",
  name: "Legacy title",
  courseContent: {
    name: { en: courseName },
    images,
  },
};
const openerName = `Open gallery for ${courseName}`;
const expectImage = (scope, index) => {
  expect(scope.getByRole("img", { name: courseName })).toHaveAttribute(
    "src",
    images[index],
  );
};
const touch = (clientX, clientY, identifier = 1) => ({
  identifier,
  clientX,
  clientY,
});
const swipe = (image, from, to) => {
  fireEvent.touchStart(image, { touches: [from], changedTouches: [from] });
  fireEvent.touchMove(image, { touches: [to], changedTouches: [to] });
  fireEvent.touchEnd(image, { touches: [], changedTouches: [to] });
};
const openGallery = async () => {
  const user = userEvent.setup();
  render(<CourseProductGallery product={product} />);
  await user.click(screen.getByRole("button", { name: openerName }));
  const dialog = within(
    await screen.findByRole("dialog", { name: courseName }),
  );
  return { dialog, image: dialog.getByRole("img", { name: courseName }) };
};

describe("course product gallery", () => {
  it("renders nothing when there are no usable images", () => {
    const { container } = render(
      <CourseProductGallery
        product={{
          ...product,
          courseContent: {
            ...product.courseContent,
            images: ["", "javascript:alert(1)"],
          },
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("wraps the preview controls without opening the full gallery", async () => {
    const user = userEvent.setup();
    render(<CourseProductGallery product={product} />);

    expectImage(screen, 0);
    await user.click(screen.getByRole("button", { name: "Previous image" }));
    expectImage(screen, 2);
    expect(screen.getByText("Image 3 of 3")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Next image" }));
    expectImage(screen, 0);
    expect(screen.getByText("Image 1 of 3")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([false, true])(
    "opens the selected preview image with large=%s",
    async (large) => {
      const user = userEvent.setup();
      render(<CourseProductGallery product={product} large={large} />);
      await user.click(screen.getByRole("button", { name: "Next image" }));
      await user.click(screen.getByRole("button", { name: openerName }));

      const dialog = await screen.findByRole("dialog", { name: courseName });
      expectImage(within(dialog), 1);
      expect(within(dialog).getByText("Image 2 of 3")).toBeVisible();
    },
  );

  it("wraps full-gallery controls and keeps the selected image after closing", async () => {
    const user = userEvent.setup();
    render(<CourseProductGallery product={product} />);
    await user.click(screen.getByRole("button", { name: openerName }));
    const dialog = within(
      await screen.findByRole("dialog", { name: courseName }),
    );

    await user.click(dialog.getByRole("button", { name: "Previous image" }));
    expectImage(dialog, 2);
    expect(dialog.getByText("Image 3 of 3")).toBeVisible();
    await user.click(dialog.getByRole("button", { name: "Next image" }));
    expectImage(dialog, 0);
    await user.click(dialog.getByRole("button", { name: "Next image" }));
    expectImage(dialog, 1);

    await user.click(dialog.getByRole("button", { name: "Close gallery" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expectImage(screen, 1);
    expect(screen.getByText("Image 2 of 3")).toBeVisible();
  });

  it("supports keyboard navigation, Escape, and focus returning to the preview", async () => {
    const user = userEvent.setup();
    render(<CourseProductGallery product={product} />);
    const opener = screen.getByRole("button", { name: openerName });
    await user.tab();
    expect(opener).toHaveFocus();
    await user.keyboard("{Enter}");
    const dialogElement = await screen.findByRole("dialog", {
      name: courseName,
    });
    const dialog = within(dialogElement);
    await waitFor(() =>
      expect(dialogElement).toContainElement(document.activeElement),
    );

    await user.keyboard("{ArrowLeft}");
    expectImage(dialog, 2);
    await user.keyboard("{ArrowRight}");
    expectImage(dialog, 0);
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("navigates with horizontal swipes and wraps in both directions", async () => {
    const { dialog, image } = await openGallery();

    swipe(image, touch(200, 100), touch(100, 110));
    expectImage(dialog, 1);
    expect(dialog.getByText("Image 2 of 3")).toBeVisible();
    swipe(image, touch(100, 100), touch(200, 110));
    expectImage(dialog, 0);
    swipe(image, touch(100, 100), touch(200, 110));
    expectImage(dialog, 2);
    swipe(image, touch(200, 100), touch(100, 110));
    expectImage(dialog, 0);
  });

  it.each([
    ["a tap", 200, 100],
    ["a short horizontal movement", 151, 100],
    ["a mostly vertical movement", 140, 180],
    ["a diagonal movement without clear horizontal intent", 140, 150],
  ])("ignores %s", async (_description, endX, endY) => {
    const { dialog, image } = await openGallery();

    swipe(image, touch(200, 100), touch(endX, endY));

    expectImage(dialog, 0);
  });

  it.each([false, true])(
    "ignores a pinch and its remaining finger (starts with one finger: %s)",
    async (startsWithOneFinger) => {
      const { dialog, image } = await openGallery();
      const first = touch(200, 100);
      const second = touch(250, 100, 2);
      if (startsWithOneFinger) {
        fireEvent.touchStart(image, {
          touches: [first],
          changedTouches: [first],
        });
      }
      fireEvent.touchStart(image, {
        touches: [first, second],
        changedTouches: startsWithOneFinger ? [second] : [first, second],
      });
      fireEvent.touchMove(image, {
        touches: [touch(100, 100), touch(300, 100, 2)],
        changedTouches: [touch(100, 100), touch(300, 100, 2)],
      });
      fireEvent.touchEnd(image, {
        touches: [touch(100, 100)],
        changedTouches: [touch(300, 100, 2)],
      });
      fireEvent.touchEnd(image, {
        touches: [],
        changedTouches: [touch(50, 100)],
      });
      expectImage(dialog, 0);

      swipe(image, touch(200, 100), touch(100, 100));
      expectImage(dialog, 1);
    },
  );

  it("ignores cancelled swipes and any late touch end", async () => {
    const { dialog, image } = await openGallery();
    fireEvent.touchStart(image, {
      touches: [touch(200, 100)],
      changedTouches: [touch(200, 100)],
    });
    fireEvent.touchMove(image, {
      touches: [touch(100, 100)],
      changedTouches: [touch(100, 100)],
    });
    fireEvent.touchCancel(image, {
      touches: [],
      changedTouches: [touch(100, 100)],
    });
    fireEvent.touchEnd(image, {
      touches: [],
      changedTouches: [touch(50, 100)],
    });
    expectImage(dialog, 0);

    swipe(image, touch(200, 100), touch(100, 100));
    expectImage(dialog, 1);
  });

  it("opens a single image without unnecessary navigation controls", async () => {
    const user = userEvent.setup();
    render(
      <CourseProductGallery
        product={{
          ...product,
          courseContent: { ...product.courseContent, images: [images[0]] },
        }}
      />,
    );

    expect(screen.queryByRole("button", { name: "Previous image" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next image" })).toBeNull();
    await user.click(screen.getByRole("button", { name: openerName }));
    const dialog = within(
      await screen.findByRole("dialog", { name: courseName }),
    );
    expectImage(dialog, 0);
    expect(dialog.queryByRole("button", { name: "Previous image" })).toBeNull();
    expect(dialog.queryByRole("button", { name: "Next image" })).toBeNull();
    await user.keyboard("{ArrowRight}");
    expectImage(dialog, 0);
    const image = dialog.getByRole("img", { name: courseName });
    swipe(image, touch(200, 100), touch(100, 100));
    swipe(image, touch(100, 100), touch(200, 100));
    expectImage(dialog, 0);
    await user.click(dialog.getByRole("button", { name: "Close gallery" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
