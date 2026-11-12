"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useDispatch, useSelector } from "react-redux";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { StudioCalendar } from "@/components/calendar";
import { getCustomerCourseHref } from "@/components/courses/customerCourses.utils";
import CustomerShellStatus from "@/components/customer-shell/CustomerShellStatus";
import { useRouter } from "@/i18n/navigation";
import {
  normalizeBookingsForCalendar,
  normalizeLocationsForCalendar,
} from "@/components/calendar/calendar.adapters";
import {
  selectAuthSessionBoundaryEpoch,
  selectCurrentTenant,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import { openSidebar } from "@/lib/features/config/configSlice";
import { useGetMyCreditBalanceQuery } from "@/lib/features/credits/creditsApiSlice";
import {
  useGetAllUserBookingsQuery,
  useGetUserBookingsQuery,
} from "@/lib/features/bookings/bookingsApiSlice";
import { useOptionalCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { resolveCustomerPortalDashboardCustomization } from "@/components/customer-shell/customerPortalCustomization";
import {
  getCustomerPortalTabPageId,
  isCustomerPortalPageEnabled,
} from "@/components/customer-shell/customerPortalVisibility";
import { CustomerPortalPageUnavailable } from "@/components/customer-shell/CustomerPortalPageGate";
import { customerPortalCalendarThemeStyle } from "@/components/customer-shell/CustomerPortalPrimitives";
import {
  formatWallDate,
  getLocationTimeZone,
} from "@/utils/locationBookingUtils";
import {
  getPortalLocationReference,
  retainCustomerPortalLocation,
} from "@/utils/customerPortalLocation";
import {
  isAnyStudioModuleEnabled,
  isCustomerBookingCommerceEnabled,
} from "@/utils/studioFlow";
import MenuHeader from "./MenuHeader";
import StudioSwitcher from "./StudioSwitcher";
import { DEFAULT_TAB, STUDIO_CALENDAR_TAB, TABS } from "./menuConfig";
import { formatTabToUrl, formatUrlToTab } from "./menuUtils";
import { markCustomerCalendarOwnership } from "./menuCalendarOwnership";
import {
  focusCustomerPortalCalendar,
  formatUpcomingBooking,
  getNextUpcomingBooking,
  getPortalDashboardCopy,
  getPortalGreetingName,
} from "./menuDashboard.utils";
import {
  getUpcomingBookingsQueryArgs,
  isPortalBookingAccountEnabled,
  isPortalCreditsEnabled,
} from "./portalDashboardQueries";

/*
 * The studio calendar is the only tab on the first portal load. The other
 * tabs load when opened, and the overlays load once the portal is interactive,
 * so none of them delay the calendar.
 */
const TabLoading = () => <CustomerShellStatus />;
const MyBookingsTable = dynamic(() => import("../tables/MyBookingsTable"), {
  loading: TabLoading,
});
const ApplyVouchers = dynamic(() => import("../views/voucher/ApplyVouchers"), {
  loading: TabLoading,
});
const CustomerKnowledgeHub = dynamic(
  () => import("../knowledge/CustomerKnowledgeHub"),
  {
    loading: TabLoading,
  },
);
const CreditPurchaseModal = dynamic(
  () => import("../credits/CreditPurchaseModal"),
  {
    ssr: false,
  },
);
const Drawer = dynamic(() => import("../sidebars/Drawer"), {
  ssr: false,
});
export default function Menu({
  bookings = [],
  products = [],
  locations = [],
  activeLocationId = "",
  activeBookingLocationId = "",
  modules,
  initialBookingIntent = null,
  previewMode = false,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const dispatch = useDispatch();
  const customerPortalLocation = useOptionalCustomerPortalLocation();
  const publicTenant = useOptionalPublicTenant()?.tenant;
  const sessionUser = useSelector(selectCurrentUser) || {};
  const sessionTenant = useSelector(selectCurrentTenant);
  const sessionBoundaryEpoch = useSelector(selectAuthSessionBoundaryEpoch);
  // The builder renders a privacy-safe customer state. Reusing the workspace
  // owner's identity would expose their name and unlock staff-only portal tabs.
  const currentUser = previewMode ? {} : sessionUser;
  const { name, memberNumber, id, isAdmin, isModerator } = currentUser;
  const defaultCopy = useMemo(() => getPortalDashboardCopy(locale), [locale]);
  const { copy, labelColor: dashboardLabelColor } = useMemo(
    () =>
      resolveCustomerPortalDashboardCustomization({
        tenant: publicTenant,
        locale,
        fallbackCopy: defaultCopy,
      }),
    [defaultCopy, locale, publicTenant],
  );
  const greetingName = useMemo(
    () => getPortalGreetingName(name, locale),
    [locale, name],
  );
  const openedIntentKey = useRef("");
  const calendarSectionRef = useRef(null);
  const calendarHeadingRef = useRef(null);
  const [suggestSlotRequest, setSuggestSlotRequest] = useState(0);
  const [dashboardBooking, setDashboardBooking] = useState(null);
  const [dashboardBookingOpen, setDashboardBookingOpen] = useState(false);
  const [dashboardBookingRequest, setDashboardBookingRequest] = useState(0);
  const canSeeAdmin = Boolean(isAdmin || isModerator);
  const visibilityTenant = publicTenant || sessionTenant;
  const activeLocation = useMemo(
    () =>
      locations.find(
        (location) =>
          String(location?._id || location?.id || "") === activeLocationId,
      ) || null,
    [activeLocationId, locations],
  );
  const bookingCommerceEnabled =
    isCustomerBookingCommerceEnabled(modules) &&
    isCustomerPortalPageEnabled(visibilityTenant, "calendar");
  const bookingAccountEnabled = isPortalBookingAccountEnabled(modules);
  const bookingHistoryEnabled =
    bookingAccountEnabled &&
    isCustomerPortalPageEnabled(visibilityTenant, "bookings");
  const canBookActiveLocation =
    bookingCommerceEnabled && Boolean(activeBookingLocationId);
  const creditsEnabled =
    isPortalCreditsEnabled(modules) &&
    isCustomerPortalPageEnabled(visibilityTenant, "credits");
  const customerOwnershipEnabled =
    !previewMode &&
    Boolean(id) &&
    bookingAccountEnabled &&
    Boolean(activeLocationId);
  const customerOwnershipScope = JSON.stringify([
    sessionTenant?._id ||
      sessionTenant?.id ||
      sessionTenant?.slug ||
      publicTenant?._id ||
      publicTenant?.id ||
      publicTenant?.slug ||
      "",
    id,
    sessionBoundaryEpoch,
  ]);
  const { currentData: ownedBookingsData } = useGetAllUserBookingsQuery(
    {
      scope: "all",
      locationId: activeLocationId,
      customerScope: customerOwnershipScope,
    },
    {
      skip: !customerOwnershipEnabled,
      pollingInterval: 150_000,
      refetchOnMountOrArgChange: true,
    },
  );
  const allowedTabs = useMemo(
    () =>
      TABS.filter(
        (tab) =>
          (canSeeAdmin || !tab.adminOnly) &&
          isAnyStudioModuleEnabled(modules, tab.module) &&
          isCustomerPortalPageEnabled(
            visibilityTenant,
            getCustomerPortalTabPageId(tab.name),
            activeLocation,
          ) &&
          (tab.name !== STUDIO_CALENDAR_TAB || canBookActiveLocation),
      ),
    [
      activeLocation,
      canBookActiveLocation,
      canSeeAdmin,
      modules,
      visibilityTenant,
    ],
  );
  const fallbackTab = useMemo(() => {
    if (allowedTabs.some((tab) => tab.name === DEFAULT_TAB)) {
      return DEFAULT_TAB;
    }
    return allowedTabs[0]?.name || null;
  }, [allowedTabs]);
  const currentTab = useMemo(() => {
    const tabParam = searchParams.get("tab");
    if (!tabParam) return fallbackTab;
    const targetTab = formatUrlToTab(tabParam);
    return allowedTabs.some((tab) => tab.name === targetTab)
      ? targetTab
      : fallbackTab;
  }, [allowedTabs, fallbackTab, searchParams]);
  const {
    data: creditData,
    isLoading: isLoadingCredit,
    isFetching: isFetchingCredit,
    isError: isCreditError,
  } = useGetMyCreditBalanceQuery(undefined, {
    skip: previewMode || !creditsEnabled,
  });
  const creditValue = useMemo(() => {
    if (isLoadingCredit || isFetchingCredit) return copy.creditLoading;
    if (isCreditError) return copy.creditUnavailable;
    return new Intl.NumberFormat(locale === "cs" ? "cs-CZ" : "en-GB").format(
      Number(creditData?.balance ?? 0),
    );
  }, [
    copy.creditLoading,
    copy.creditUnavailable,
    creditData?.balance,
    isCreditError,
    isFetchingCredit,
    isLoadingCredit,
    locale,
  ]);
  const {
    data: upcomingData,
    isLoading: isLoadingUpcoming,
    isFetching: isFetchingUpcoming,
    isError: isUpcomingError,
  } = useGetUserBookingsQuery(getUpcomingBookingsQueryArgs(activeLocationId), {
    pollingInterval: 150_000,
    refetchOnMountOrArgChange: false,
    skip: previewMode || !id || !bookingHistoryEnabled || !activeLocationId,
  });
  const nextBooking = useMemo(
    () => getNextUpcomingBooking(upcomingData, new Date(), activeLocationId),
    [activeLocationId, upcomingData],
  );
  const upcoming = useMemo(
    () =>
      formatUpcomingBooking({
        booking: nextBooking,
        products,
        locations,
        locale,
        fallbackTitle: copy.bookingFallback,
        fallbackLocation: copy.locationFallback,
      }),
    [
      copy.bookingFallback,
      copy.locationFallback,
      locale,
      locations,
      nextBooking,
      products,
    ],
  );
  const upcomingStatus =
    isLoadingUpcoming || (isFetchingUpcoming && !upcomingData)
      ? "loading"
      : isUpcomingError
        ? "error"
        : "ready";
  const calendarLocations = useMemo(
    () =>
      normalizeLocationsForCalendar(
        locations.filter(
          (location) =>
            location?.isActive !== false &&
            location?.booking?.enabled !== false,
        ),
      ),
    [locations],
  );
  const productsById = useMemo(
    () =>
      new Map(
        (Array.isArray(products) ? products : []).map((product) => [
          String(product?._id || product?.id || ""),
          product,
        ]),
      ),
    [products],
  );
  const calendarBookings = useMemo(
    () =>
      normalizeBookingsForCalendar(
        markCustomerCalendarOwnership(
          bookings,
          customerOwnershipEnabled ? ownedBookingsData : undefined,
        ),
        {
          productsById,
          currentUserId: id,
          currentUserMemberNumber: memberNumber,
          locale,
        },
      ),
    [
      bookings,
      customerOwnershipEnabled,
      ownedBookingsData,
      id,
      memberNumber,
      locale,
      productsById,
    ],
  );
  const pushTabToUrl = useCallback(
    (tabName, method = "push") => {
      if (previewMode) return;
      const href = formatTabToUrl(tabName, activeLocation);
      router[method](href, {
        scroll: false,
      });
    },
    [activeLocation, previewMode, router],
  );
  const openBookingsPage = useCallback(() => {
    if (!bookingHistoryEnabled) return;
    router.push(
      retainCustomerPortalLocation(
        "/portal/bookings",
        getPortalLocationReference(activeLocation),
      ),
    );
  }, [activeLocation, bookingHistoryEnabled, router]);
  const openNextBookingCancellation = useCallback(() => {
    if (nextBooking?.canCancel !== true) {
      openBookingsPage();
      return;
    }
    setDashboardBooking(nextBooking);
    setDashboardBookingRequest((request) => request + 1);
    setDashboardBookingOpen(true);
  }, [nextBooking, openBookingsPage]);
  const chooseCalendarTime = useCallback(() => {
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setSuggestSlotRequest((request) => request + 1);
    focusCustomerPortalCalendar({
      heading: calendarHeadingRef.current,
      section: calendarSectionRef.current,
      reduceMotion,
    });
  }, []);
  useEffect(() => {
    if (previewMode || !currentTab) return;
    const tabParam = searchParams.get("tab");
    if (!tabParam) {
      // A portal URL without a tab already shows the default tab, and the
      // header treats it as the calendar. Rewriting it would cost a server
      // round trip on every portal visit.
      if (fallbackTab !== DEFAULT_TAB) pushTabToUrl(fallbackTab, "replace");
      return;
    }
    const targetTab = formatUrlToTab(tabParam);
    if (currentTab !== targetTab) {
      pushTabToUrl(currentTab, "replace");
    }
  }, [currentTab, fallbackTab, previewMode, pushTabToUrl, searchParams]);
  const openBookingDrawer = useCallback(
    (selection = {}) => {
      if (previewMode || !canBookActiveLocation) return;
      const selectedStudioId = String(
        selection.studio?._id || selection.studio?.id || "",
      );
      if (
        selectedStudioId &&
        selectedStudioId !== String(activeBookingLocationId)
      ) {
        return;
      }
      const location =
        locations.find(
          (item) =>
            String(item?._id || item?.id || "") === activeBookingLocationId,
        ) || null;
      if (selection.studio && selection.courseSessionId) {
        if (
          !selection.productId ||
          !isAnyStudioModuleEnabled(modules, "courses") ||
          !isCustomerPortalPageEnabled(visibilityTenant, "courses")
        ) {
          return;
        }
        router.push(
          getCustomerCourseHref({
            productId: selection.productId,
            locationReference: getPortalLocationReference(location),
            sessionId: selection.courseSessionId,
          }),
        );
        return;
      }
      const start = selection.start instanceof Date ? selection.start : null;
      const end = selection.end instanceof Date ? selection.end : null;
      dispatch(
        openSidebar({
          context: "studio",
          locationId: activeBookingLocationId,
          selectedDate: start
            ? formatWallDate(start, getLocationTimeZone(location))
            : undefined,
          prefill:
            start && end
              ? {
                  start: start.toISOString(),
                  end: end.toISOString(),
                  bookingType: "public",
                  activity: selection.activityId || "UNDEFINED",
                  productId: selection.productId || "",
                  courseSessionId: selection.courseSessionId || "",
                  quantity: selection.quantity || 1,
                  source: "calendar-selection",
                }
              : null,
        }),
      );
    },
    [
      activeBookingLocationId,
      canBookActiveLocation,
      dispatch,
      locations,
      modules,
      previewMode,
      router,
      visibilityTenant,
    ],
  );
  useEffect(() => {
    if (
      currentTab !== STUDIO_CALENDAR_TAB ||
      !initialBookingIntent ||
      initialBookingIntent.locationId !== activeBookingLocationId
    ) {
      return;
    }
    const productExists = products.some(
      (product) =>
        String(product?.id || product?._id || "") ===
        initialBookingIntent.productId,
    );
    if (!productExists) return;
    const key = [
      initialBookingIntent.productId,
      initialBookingIntent.locationId,
      initialBookingIntent.start,
      initialBookingIntent.end,
      initialBookingIntent.courseSessionId,
      initialBookingIntent.quantity,
    ].join(":");
    if (openedIntentKey.current === key) return;
    const start = new Date(initialBookingIntent.start);
    const end = new Date(initialBookingIntent.end);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return;
    }
    openedIntentKey.current = key;
    openBookingDrawer({
      start,
      end,
      productId: initialBookingIntent.productId,
      courseSessionId: initialBookingIntent.courseSessionId,
      quantity: initialBookingIntent.quantity,
    });
  }, [
    activeBookingLocationId,
    currentTab,
    initialBookingIntent,
    openBookingDrawer,
    products,
  ]);
  const content = useMemo(() => {
    if (currentTab === STUDIO_CALENDAR_TAB) {
      return (
        <section
          ref={calendarSectionRef}
          data-customer-portal-calendar
          data-customer-calendar-mobile-layout="weekly-grid"
          aria-labelledby="customer-portal-calendar-title"
          className="mx-auto max-w-[1480px] scroll-mt-20 px-3 pb-24 pt-4 min-[360px]:px-4 sm:px-6 sm:pb-20 sm:pt-7 lg:px-8"
          style={{
            color: "var(--tenant-text)",
          }}
        >
          <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
            <div className="min-w-0">
              <p
                className="text-[9px] font-semibold uppercase tracking-[0.24em]"
                data-tenant-type="eyebrow"
                style={{
                  color:
                    "var(--tenant-page-label-color, var(--tenant-label-color, var(--tenant-accent-link)))",
                }}
              >
                {copy.calendarEyebrow}
              </p>
              <h2
                ref={calendarHeadingRef}
                id="customer-portal-calendar-title"
                tabIndex={-1}
                className="mt-1 rounded-[6px] text-[24px] leading-tight tracking-[-0.035em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tenant-accent-link)] sm:text-[29px]"
                data-tenant-type="display"
                style={{
                  color: "var(--tenant-heading-color)",
                  fontFamily: "var(--tenant-font-display)",
                }}
              >
                {copy.calendarTitle}
              </h2>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 sm:items-end">
              <p
                className="text-[10px] font-medium leading-4"
                style={{
                  color: "var(--tenant-muted-text)",
                }}
              >
                {copy.calendarDescription}
              </p>
              <div
                data-customer-calendar-studio-selector
                className="w-full sm:w-[380px] sm:max-w-[420px]"
              >
                <StudioSwitcher
                  locations={locations}
                  activeLocationId={activeLocationId}
                  onChange={customerPortalLocation?.selectLocation}
                  locale={locale}
                  requireBookingEnabled
                  announceChanges
                  variant="calendar"
                />
              </div>
            </div>
          </div>

          <div
            data-customer-calendar-shell
            data-customer-portal-surface
            data-tenant-surface="panel"
            className="overflow-clip rounded-lg border bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] shadow-[0_10px_28px_color-mix(in_srgb,var(--tenant-text)_4%,transparent)]"
            style={{
              ...customerPortalCalendarThemeStyle,
              borderColor: "var(--tenant-border)",
              backgroundColor:
                "var(--tenant-portal-calendar-background, var(--tenant-surface))",
              borderRadius: "0.5rem",
            }}
            data-public-site-edit-path="customerPortal.appearance.calendarBackgroundColor"
          >
            <StudioCalendar
              studios={calendarLocations}
              selectedStudioId={activeBookingLocationId}
              bookings={calendarBookings}
              audience="customer"
              defaultView="week"
              pageScroll
              suggestSlotRequest={suggestSlotRequest}
              suggestionCopy={copy.calendarSuggestion}
              selectionCopy={copy.calendarSelection}
              onSlotSelect={
                canBookActiveLocation ? openBookingDrawer : undefined
              }
            />
          </div>
        </section>
      );
    }
    switch (currentTab) {
      case "MY_BOOKINGS":
        return (
          <MyBookingsTable
            activeLocationId={activeLocationId}
            headingLevel={1}
          />
        );
      case "VOUCHERS":
        return <ApplyVouchers />;
      case "TUTORIALS":
        return <CustomerKnowledgeHub embedded locationId={activeLocationId} />;
      default:
        return null;
    }
  }, [
    activeLocationId,
    activeBookingLocationId,
    canBookActiveLocation,
    calendarBookings,
    calendarLocations,
    copy.calendarDescription,
    copy.calendarEyebrow,
    copy.calendarSuggestion,
    copy.calendarSelection,
    copy.calendarTitle,
    customerPortalLocation?.selectLocation,
    currentTab,
    locale,
    locations,
    openBookingDrawer,
    suggestSlotRequest,
  ]);
  const dashboardBookingProduct = useMemo(() => {
    if (!dashboardBooking) return null;
    const embedded =
      dashboardBooking.product ||
      dashboardBooking.bookingProduct ||
      dashboardBooking.productSnapshot;
    if (embedded && typeof embedded === "object") return embedded;
    const productId = String(
      dashboardBooking.productId ||
        dashboardBooking.bookingProduct ||
        dashboardBooking.course ||
        "",
    );
    return productsById.get(productId) || null;
  }, [dashboardBooking, productsById]);
  if (!currentTab) return <CustomerPortalPageUnavailable />;
  const Root = currentTab === STUDIO_CALENDAR_TAB ? "main" : "div";
  return (
    <Root
      className="min-h-screen"
      style={{
        backgroundColor: "var(--tenant-background)",
        color: "var(--tenant-text)",
        ...(dashboardLabelColor
          ? {
              "--tenant-page-label-color": dashboardLabelColor,
            }
          : {}),
      }}
    >
      {currentTab === STUDIO_CALENDAR_TAB ? (
        <MenuHeader
          name={greetingName}
          memberNumber={memberNumber}
          creditValue={creditValue}
          canSeeAdmin={canSeeAdmin}
          isAdmin={isAdmin}
          copy={copy}
          upcoming={upcoming}
          upcomingStatus={upcomingStatus}
          canCancelUpcoming={nextBooking?.canCancel === true}
          onCancelBooking={openNextBookingCancellation}
          onOpenBookings={openBookingsPage}
          onChooseTime={chooseCalendarTime}
          bookingAccountEnabled={bookingHistoryEnabled}
          showCredits={creditsEnabled}
        />
      ) : null}

      {content}
      {previewMode || !creditsEnabled ? null : <CreditPurchaseModal />}
      {dashboardBooking ? (
        <Drawer
          key={`${dashboardBooking._id || dashboardBooking.id}:${dashboardBookingRequest}`}
          open={dashboardBookingOpen}
          setOpen={setDashboardBookingOpen}
          booking={dashboardBooking}
          product={dashboardBookingProduct}
          products={products}
          bookings={bookings}
          openCancelConfirmation
        />
      ) : null}
    </Root>
  );
}
