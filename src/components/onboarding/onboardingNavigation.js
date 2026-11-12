export const buildLaunchCenterUrl = ({ locale, origin }) => {
  const baseOrigin = origin || window.location.origin;
  const url = new URL(`/${locale}/app/setup`, baseOrigin);

  return url.toString();
};

export const navigateToLaunchCenter = ({ locale }) => {
  // Crossing from the standalone onboarding layout into the workspace route
  // group needs a document navigation. A soft App Router transition can keep
  // the onboarding segment tree and resolve the otherwise valid setup route
  // as a 404 in development.
  window.location.replace(buildLaunchCenterUrl({ locale }));
};
