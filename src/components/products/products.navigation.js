export const BOOKABLE_OFFER_SETUP_STEP = "bookable_offer";
export const MEMBERSHIP_SETUP_STEP = "membership";

export const isGuidedProductSetupStep = (setupStep) =>
  setupStep === BOOKABLE_OFFER_SETUP_STEP ||
  setupStep === MEMBERSHIP_SETUP_STEP;

export const getProductFormCloseHref = (setupStep, category) => {
  if (setupStep === BOOKABLE_OFFER_SETUP_STEP) {
    return `/app/setup?step=${BOOKABLE_OFFER_SETUP_STEP}`;
  }

  if (setupStep === MEMBERSHIP_SETUP_STEP) {
    // A new membership starts as a draft. Keep the Launch Center guide active
    // on the real membership page until the owner publishes the plan.
    return `/app/memberships?setupStep=${MEMBERSHIP_SETUP_STEP}`;
  }

  return `/app/products${category ? `?category=${category}` : ""}`;
};

const PRODUCT_CREATE_QUERY_KEYS = [
  "productKind",
  "productType",
  "setupTemplate",
  "setupStep",
];

export const getProductCreateHref = ({ category, searchParams }) => {
  const query = new URLSearchParams();
  if (category) query.set("category", category);

  PRODUCT_CREATE_QUERY_KEYS.forEach((key) => {
    const value = searchParams?.get?.(key);
    if (value) query.set(key, value);
  });

  const suffix = query.toString();
  return `/app/products/new${suffix ? `?${suffix}` : ""}`;
};

export const getProductEditHref = ({ productId, category, searchParams }) => {
  const id = String(productId || "").trim();
  if (!id)
    return getProductFormCloseHref(searchParams?.get?.("setupStep"), category);

  const query = new URLSearchParams();
  if (category) query.set("category", category);

  const setupStep = searchParams?.get?.("setupStep");
  if (setupStep) query.set("setupStep", setupStep);

  const suffix = query.toString();
  return `/app/products/${encodeURIComponent(id)}/edit${suffix ? `?${suffix}` : ""}`;
};

const withProductNotice = (href, notice) =>
  `${href}${href.includes("?") ? "&" : "?"}${notice}=1`;

export const withProductCreatedNotice = (href) =>
  withProductNotice(href, "created");

export const withProductUpdatedNotice = (href) =>
  withProductNotice(href, "updated");
