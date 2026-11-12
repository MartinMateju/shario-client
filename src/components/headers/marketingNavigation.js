export const PLATFORM_MARKETING_PATHS = Object.freeze([
  "/",
  "/product",
  "/studio-ai",
  "/for-studios",
  "/pricing",
]);
export const MARKETING_ANCHORS = Object.freeze({
  top: "/#top",
  product: "/product",
  selfService: "/product#self-service",
  operate: "/product#bookings-payments",
  coordinate: "/product#operations-production",
  decide: "/product#analytics-decisions",
  ai: "/studio-ai",
  solutions: "/for-studios",
  pricing: "/pricing",
  faq: "/#faq",
});
export function isPlatformMarketingPath(pathname) {
  const normalizedPathname =
    String(pathname || "/")
      .split(/[?#]/)[0]
      .replace(/\/+$/, "") || "/";
  return PLATFORM_MARKETING_PATHS.includes(normalizedPathname);
}
export const PUBLIC_NAV_ITEMS = Object.freeze([
  {
    key: "product",
    type: "menu",
    href: "/product",
    labelKey: "Header.product.label",
    descriptionKey: "SharioMarketing.product.description",
    items: [
      {
        key: "bookings",
        href: MARKETING_ANCHORS.operate,
        labelKey: "SharioMarketing.features.bookings.title",
        descriptionKey: "SharioMarketing.features.bookings.description",
      },
      {
        key: "memberships",
        href: "/product#features",
        labelKey: "SharioMarketing.features.memberships.title",
        descriptionKey: "SharioMarketing.features.memberships.description",
      },
      {
        key: "website",
        href: "/product#your-website",
        labelKey: "SharioMarketing.features.website.title",
        descriptionKey: "SharioMarketing.features.website.description",
      },
      {
        key: "selfService",
        href: MARKETING_ANCHORS.selfService,
        labelKey: "SharioMarketing.access.eyebrow",
        descriptionKey: "SharioMarketing.access.title",
      },
    ],
    overviewLabelKey: "SharioMarketing.hero.secondary",
  },
  {
    key: "ai",
    type: "link",
    href: "/studio-ai",
    labelKey: "SharioMarketing.footer.ai",
  },
  {
    key: "spaces",
    type: "menu",
    href: "/for-studios",
    labelKey: "SharioMarketing.footer.spaces",
    descriptionKey: "SharioMarketing.spaces.description",
    items: ["coworking", "creative", "rehearsal", "community", "workshops"].map(
      (key) => ({
        key,
        href: `/for-studios#${key}`,
        labelKey: `SharioMarketing.spaces.${key}.title`,
        descriptionKey: `SharioMarketing.spaces.${key}.description`,
      }),
    ),
    overviewLabelKey: "SharioMarketing.spaces.title",
  },
  {
    key: "pricing",
    type: "link",
    href: "/pricing",
    labelKey: "Header.pricing",
  },
]);
