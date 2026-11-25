import { normalizePublicTenantUrl } from "./publicTenantUrl";

// Calendar and booking-availability headers intentionally remain text-only.
export const PUBLIC_TENANT_PAGE_IMAGE_KEYS = Object.freeze([
  "courses",
  "memberships",
  "vouchers",
  "knowledge",
  "bookings",
  "waitingList",
  "credits",
  "account",
  "invoices",
  "notifications",
  "products",
]);

export const PUBLIC_TENANT_PAGE_IMAGE_MEDIA_SLOTS = Object.freeze(
  Object.fromEntries(
    PUBLIC_TENANT_PAGE_IMAGE_KEYS.map((key) => [key, `${key}Hero`]),
  ),
);

export const normalizeCustomerPortalPageImages = (value) =>
  Object.fromEntries(
    PUBLIC_TENANT_PAGE_IMAGE_KEYS.map((key) => [
      key,
      normalizePublicTenantUrl(
        typeof value?.[key] === "string" ? value[key] : "",
      ),
    ]),
  );

// There is no shared cover fallback: clearing one page must not show a different photo.
// Courses apply their legacy per-location and cover precedence at their own call site.
export const getCustomerPortalPageImage = (tenant, key) =>
  PUBLIC_TENANT_PAGE_IMAGE_KEYS.includes(key)
    ? normalizePublicTenantUrl(
        tenant?.publicSite?.customerPortal?.pageImages?.[key],
      )
    : "";

export const getCustomerPortalCourseImageSource = (tenant, locationId) => {
  const locations = tenant?.publicSite?.customerPortal?.courses?.locations;
  const overrideIndex = Array.isArray(locations)
    ? locations.findIndex(
        (entry) => String(entry?.locationId || "") === String(locationId || ""),
      )
    : -1;
  const override = normalizePublicTenantUrl(
    locations?.[overrideIndex]?.heroImageUrl,
  );
  if (override)
    return {
      imageUrl: override,
      mediaEditPath: `customerPortal.courses.locations.${overrideIndex}.heroImageUrl`,
    };
  const pageImage = getCustomerPortalPageImage(tenant, "courses");
  if (pageImage)
    return {
      imageUrl: pageImage,
      mediaEditPath: "customerPortal.pageImages.courses",
    };
  return {
    imageUrl: normalizePublicTenantUrl(
      tenant?.publicSite?.branding?.coverImageUrl,
    ),
    mediaEditPath: "branding.coverImageUrl",
  };
};

export const getCustomerPortalCourseImage = (tenant, locationId) =>
  getCustomerPortalCourseImageSource(tenant, locationId).imageUrl;
