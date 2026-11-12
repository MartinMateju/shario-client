import { describe, expect, it } from "vitest";

import cs from "../../src/messages/cs.json";
import en from "../../src/messages/en.json";

describe("canonical product naming translations", () => {
  it.each([
    ["English", en],
    ["Czech", cs],
  ])(
    "exposes exactly the five tenant catalog categories in %s",
    (_name, copy) => {
      expect(Object.keys(copy.Products.categories)).toEqual([
        "openStudio",
        "classes",
        "memberships",
        "vouchers",
        "privateStudio",
      ]);
      expect(copy.Products.title).toBe(
        copy === en ? "Products & Classes" : "Produkty a kurzy",
      );
    },
  );

  it("uses canonical English names even for legacy compatibility keys", () => {
    expect(en.Products.types).toMatchObject({
      openStudio: "Open Studio",
      class: "Class",
      course: "Class",
      workshop: "Open Studio",
      membership: "Membership",
      voucher: "Voucher",
      privateStudio: "Private Studio",
    });
    expect(en.SetupCenter.offer.types).toMatchObject({
      openStudio: "Open Studio",
      class: "Class",
      course: "Class",
      workshop: "Open Studio",
      membership: "Membership",
      voucher: "Voucher",
      privateStudio: "Private Studio",
      privateSession: "Private Studio",
    });
    expect(en.EmailAutomations.automationEditor.productTypes).toMatchObject({
      workshop: "Open Studio",
      course: "Class",
      "private-session": "Private Studio",
    });
    expect(en.Sales.productTypes).toMatchObject({
      workshop: "Open Studio",
      course: "Class",
      "gift-card": "Gift card",
      coupon: "Coupon",
    });
  });

  it("describes product media as an upload instead of an image URL", () => {
    expect(en.Products.form).toMatchObject({
      image: "Product image",
      imageUpload: "Upload image",
      imageReplace: "Replace image",
      imageRemove: "Remove image",
    });
    expect(cs.Products.form).toMatchObject({
      image: "Obrázek produktu",
      imageUpload: "Nahrát obrázek",
      imageReplace: "Nahradit obrázek",
      imageRemove: "Odebrat obrázek",
    });
    expect(en.Products.form).not.toHaveProperty("imagePlaceholder");
    expect(cs.Products.form).not.toHaveProperty("imagePlaceholder");
  });

  it("keeps public catalog navigation aligned with Open Studio and Classes", () => {
    expect(en.PublicTenant.nav).toMatchObject({
      book: "Open Studio",
      courses: "Classes",
      memberships: "Memberships",
    });
    expect(en.PublicTenant.book).toMatchObject({
      metadataTitle: "Book Open Studio",
      title: "Open Studio at {studio}",
    });
    expect(en.PublicTenant.courses).toMatchObject({
      metadataTitle: "Studio classes",
      title: "Classes at {studio}",
    });
    expect(cs.PublicTenant.nav.book).toBe("Open Studio");
    expect(cs.PublicTenant.book.title).toBe("Open Studio v {studio}");
  });
});
