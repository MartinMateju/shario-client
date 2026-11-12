import { describe, expect, it } from "vitest";
import {
  getCourseContentError,
  getCourseContentForm,
  isCourseGalleryUrl,
} from "@/components/products/courseContentForm";

describe("optional course product content", () => {
  it("keeps an empty content override valid for canonical product fallbacks", () => {
    expect(getCourseContentError(getCourseContentForm())).toBe("");
  });

  it("checks every language even when a different language is being edited", () => {
    const value = getCourseContentForm({
      name: { en: "Class", cs: "A".repeat(181) },
    });
    expect(getCourseContentError(value)).toBe("form.courseContent.invalidText");
    value.name.cs = "A".repeat(180);
    value.details.de = "First paragraph\n\nSecond paragraph";
    expect(getCourseContentError(value)).toBe("");
    value.details.de = "<strong>Details</strong>";
    expect(getCourseContentError(value)).toBe("form.courseContent.invalidText");
  });

  it("caps the gallery at twelve safe HTTPS or site-relative URLs", () => {
    const value = getCourseContentForm({
      images: Array.from({ length: 12 }, (_, i) => `/courses/${i}.webp`),
    });
    expect(getCourseContentError(value)).toBe("");
    value.images.push("/courses/extra.webp");
    expect(getCourseContentError(value)).toBe(
      "form.courseContent.galleryLimit",
    );
    for (const unsafe of [
      "",
      "http://cdn.example.com/photo.jpg",
      "//cdn.example.com/photo.jpg",
      "/\\example.com/photo.jpg",
      "https://user:password@cdn.example.com/photo.jpg",
      "https://cdn.example.com:8443/photo.jpg",
      "data:image/svg+xml,<svg/>",
      `/courses/${"a".repeat(2000)}`,
    ])
      expect(isCourseGalleryUrl(unsafe), unsafe).toBe(false);
    expect(isCourseGalleryUrl("https://cdn.example.com/photo.jpg")).toBe(true);
  });
});
