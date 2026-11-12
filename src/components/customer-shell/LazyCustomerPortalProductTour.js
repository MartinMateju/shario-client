"use client";

import dynamic from "next/dynamic";

/*
 * The tour is a client-only overlay that decides on its own whether to show,
 * so it loads after the portal is interactive instead of with the calendar.
 * The portal layout is a Server Component, which cannot opt out of SSR itself.
 */
const LazyCustomerPortalProductTour = dynamic(
  () => import("./CustomerPortalProductTour"),
  { ssr: false },
);

export default LazyCustomerPortalProductTour;
