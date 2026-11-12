import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearGuestCheckoutAttempt,
  getConfirmedGuestCheckoutHref,
  getGuestCheckoutAccessKey,
  getGuestCheckoutAttempt,
  getGuestCourseReturnHref,
  readGuestCheckoutAccess,
  storeGuestCheckoutAccess,
} from "@/components/courses/guestCheckoutAccess";

const orderId = "507f1f77bcf86cd799439011";
const token = "a".repeat(43);
const selection = {
  productId: "wheel",
  quantity: 2,
  guestInfo: { email: "anna@example.test" },
};

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  sessionStorage.clear();
  history.replaceState(null, "", "/checkout/success");
});
afterEach(() => vi.unstubAllGlobals());

describe("guest checkout attempt and proof storage", () => {
  it("keeps a fully paid return on the tenant, preserves the course and never puts proof in query parameters", () => {
    const href = getConfirmedGuestCheckoutHref({
      orderId,
      accessToken: token,
      locale: "cs",
      productId: "wheel",
      courseSessionId: "course-a",
      location: "vaclavska",
      quantity: 2,
    });
    const target = new URL(href, "https://klei.example.test");
    expect(target.origin).toBe("https://klei.example.test");
    expect(target.pathname).toBe("/cs/checkout/success");
    expect(target.searchParams.get("access_token")).toBeNull();
    expect(target.hash).toBe(`#access_token=${token}`);
    expect(getGuestCourseReturnHref(target.searchParams)).toBe(
      "/courses/wheel?courseSessionId=course-a&quantity=2&location=vaclavska",
    );
    expect(
      getConfirmedGuestCheckoutHref({
        orderId,
        accessToken: "bad",
        locale: "en",
      }),
    ).toBe("");
    expect(
      getConfirmedGuestCheckoutHref({
        orderId,
        accessToken: token,
        locale: "//evil.test",
      }),
    ).toBe("");
    expect(
      getConfirmedGuestCheckoutHref({
        orderId: "bad",
        accessToken: token,
        locale: "en",
      }),
    ).toBe("");
  });
  it("keeps retry keys across remounts without storing customer contact, and resets only an expired attempt", async () => {
    const first = await getGuestCheckoutAttempt({
      tenantSlug: "klei",
      selection,
    });
    expect(
      await getGuestCheckoutAttempt({ tenantSlug: "klei", selection }),
    ).toEqual(first);
    expect(first.storageKey).not.toContain("anna");
    expect(sessionStorage.getItem(first.storageKey)).toBe(first.key);
    expect(first.key).toMatch(
      /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i,
    );
    expect(
      (await getGuestCheckoutAttempt({ tenantSlug: "other", selection })).key,
    ).not.toBe(first.key);
    expect(
      (
        await getGuestCheckoutAttempt({
          tenantSlug: "klei",
          selection: { ...selection, quantity: 1 },
        })
      ).key,
    ).not.toBe(first.key);
    clearGuestCheckoutAttempt(first);
    expect(
      (await getGuestCheckoutAttempt({ tenantSlug: "klei", selection })).key,
    ).not.toBe(first.key);
  });

  it("captures a return fragment, strips it from history and scopes proof by tenant and order", () => {
    history.replaceState(
      null,
      "",
      `/checkout/success?orderId=${orderId}#access_token=${token}&anchor=summary`,
    );
    expect(readGuestCheckoutAccess({ tenantSlug: "klei", orderId })).toEqual({
      token,
      invalid: false,
    });
    expect(location.hash).toBe("#anchor=summary");
    expect(location.search).toBe(`?orderId=${orderId}`);
    expect(readGuestCheckoutAccess({ tenantSlug: "klei", orderId })).toEqual({
      token,
      invalid: false,
    });
    expect(readGuestCheckoutAccess({ tenantSlug: "other", orderId })).toEqual({
      token: "",
      invalid: false,
    });
    expect(
      readGuestCheckoutAccess({
        tenantSlug: "klei",
        orderId: "507f1f77bcf86cd799439012",
      }),
    ).toEqual({ token: "", invalid: false });
  });

  it("does not fall back to stored proof or legacy status when an explicit proof is invalid", () => {
    storeGuestCheckoutAccess({
      tenantSlug: "klei",
      orderId,
      accessToken: token,
    });
    history.replaceState(null, "", "/checkout/success#access_token=invalid");
    expect(readGuestCheckoutAccess({ tenantSlug: "klei", orderId })).toEqual({
      token: "",
      invalid: true,
    });
    expect(location.hash).toBe("");
    expect(
      sessionStorage.getItem(getGuestCheckoutAccessKey("klei", orderId)),
    ).toBe(token);
  });

  it("retains the fragment proof in memory even if browser storage is blocked", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    history.replaceState(null, "", `/checkout/success#access_token=${token}`);
    expect(
      readGuestCheckoutAccess({ tenantSlug: "klei", orderId, storage }),
    ).toEqual({ token, invalid: false });
    expect(location.hash).toBe("");
  });

  it("never stores malformed order IDs or access proof", () => {
    expect(
      storeGuestCheckoutAccess({
        tenantSlug: "klei",
        orderId: "../order",
        accessToken: token,
      }),
    ).toBe(false);
    expect(
      storeGuestCheckoutAccess({
        tenantSlug: "klei",
        orderId,
        accessToken: "invalid",
      }),
    ).toBe(false);
    expect(sessionStorage.length).toBe(0);
  });
});

describe("guest course cancellation return context", () => {
  it("returns to the selected course, date, studio and attendee count without contact or proof", () => {
    const params = new URLSearchParams({
      productId: "wheel",
      courseSessionId: "date-a",
      location: "vaclavska",
      quantity: "2",
      email: "anna@example.test",
      orderId,
      access_token: token,
    });
    expect(getGuestCourseReturnHref(params)).toBe(
      "/courses/wheel?courseSessionId=date-a&quantity=2&location=vaclavska",
    );
  });

  it("rejects path traversal and invalid quantities without losing a valid studio", () => {
    expect(
      getGuestCourseReturnHref(
        new URLSearchParams({ productId: "../../login", location: "grohova" }),
      ),
    ).toBe("/courses?location=grohova");
    expect(
      getGuestCourseReturnHref(
        new URLSearchParams({
          productId: "wheel",
          courseSessionId: "date-a",
          quantity: "999",
        }),
      ),
    ).toBe("/courses/wheel?courseSessionId=date-a");
  });
});
