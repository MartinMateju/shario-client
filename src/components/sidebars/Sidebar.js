"use client";

import { useLegacyLocale } from "@/i18n/useLegacyCopy";
import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useDispatch, useSelector } from "react-redux";

import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import { addToCart, openCart } from "@/lib/features/cart/cartSlice";
import {
  closeSidebar,
  selectIsSidebarOpen,
  selectPickedDate,
  selectSidebarLocationId,
  selectSidebarPrefill,
} from "@/lib/features/config/configSlice";
import {
  buildDurationOptions,
  buildStartTimeOptions,
  checkLocationAvailability,
  formatDuration,
  formatLocationAddress,
  formatWallDate,
  formatWallTime,
  getEntityId,
  getLocationTimeZone,
  zonedDateTimeToUtc,
} from "@/utils/locationBookingUtils";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import {
  getOpenStudioGuestLimit,
  getOpenStudioPrivateSurcharge,
  isCustomerChoiceOpenStudio,
  isProductAvailableAtLocation,
} from "@/lib/features/products/products.contract.mjs";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";

import {
  findClassProduct,
  findOpenStudioProduct,
  formatBookingDateLabel,
  formatBookingGuestCount,
  formatBookingPrice,
  formatBookingSummary,
  getBookingAvailabilityPresentation,
  getBookingPriceBreakdown,
  getBookingDrawerCartFields,
  getClassProducts,
  getLocalizedBookingProductName,
  getOpenStudioBookingFields,
  getOpenStudioProducts,
} from "./openStudioBooking.utils";

const cx = (...classes) => classes.filter(Boolean).join(" ");

// The drawer slides in under the finger that opened it. Taps that arrive
// while it opens, such as the second tap of a double-tap on the calendar's
// Continue button, must not add to the cart or dismiss the drawer.
const DRAWER_OPEN_GRACE_MS = 500;
const nowMs = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

const ACTIVITY_TRANSLATION_KEYS = {
  WORKSTATION: "activityWorkstation",
  SHARED_TABLE: "activitySharedTable",
};

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span
        className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--tenant-label-color)]"
        data-tenant-type="label"
      >
        {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
        {label}
      </span>
      {children}
    </label>
  );
}

const controlClass =
  "h-11 w-full rounded-[13px] border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_16%,transparent)] bg-[var(--tenant-surface)] px-3.5 text-[12px] text-[var(--tenant-text-on-surface)] outline-none transition hover:border-[var(--tenant-accent-on-surface)] focus:border-[var(--tenant-accent-on-surface)] focus:ring-4 focus:ring-[var(--tenant-accent-on-surface)]/10 disabled:cursor-not-allowed disabled:bg-[color-mix(in_srgb,var(--tenant-text-on-surface)_5%,var(--tenant-surface))] disabled:text-[var(--tenant-muted-on-surface)]";

export default function Sidebar({
  bookings = [],
  products = [],
  locations = [],
  activeLocationId,
  isAvailabilityLoading = false,
  isCatalogLoading = false,
}) {
  const activeLocale = useLegacyLocale();
  const dispatch = useDispatch();
  const open = useSelector(selectIsSidebarOpen);
  const requestedLocationId = useSelector(selectSidebarLocationId);
  const selectedDate = useSelector(selectPickedDate);
  const prefill = useSelector(selectSidebarPrefill);
  const currentUser = useSelector(selectCurrentUser) || {};
  const locale = useLocale();
  const t = useTranslations("PublicTenant.details");
  const language = locale === "cs" ? "CZ" : "EN";
  const availabilityCopy = useLegacyCopy("bookingAvailability");
  const text = {
    ...useLegacyCopy("bookingSidebar"),
    bookingType: t("customerChoice.mode"),
    public: t("customerChoice.public"),
    private: t("customerChoice.private"),
    privateSurcharge: t("customerChoice.surcharge"),
    activity: t("activity"),
    activityNotSpecified: t("activityNotSpecified"),
    activityUnavailable: t("activityUnavailable"),
  };
  const publicTenantContext = useOptionalPublicTenant();
  const tenantTheme = useMemo(
    () =>
      getPublicTenantTheme(publicTenantContext?.tenant || {}, {
        surface: publicTenantContext?.surface,
      }),
    [publicTenantContext?.tenant, publicTenantContext?.surface],
  );

  // The portal location (derived from the current URL/provider) is the
  // canonical booking scope. A drawer request can outlive a location change,
  // so only use its retained location when no active portal location exists.
  // Otherwise the previous studio's activity policy could block the current
  // studio or attach the cart item to the wrong location.
  const locationId = activeLocationId || requestedLocationId || "";
  const location = useMemo(
    () => locations.find((item) => getEntityId(item) === locationId) || null,
    [locationId, locations],
  );
  const timezone = getLocationTimeZone(location);
  const isClassFlow = Boolean(String(prefill?.courseSessionId || "").trim());
  const openStudioProducts = useMemo(
    () =>
      getOpenStudioProducts(products).filter((product) =>
        isProductAvailableAtLocation(product, locationId),
      ),
    [locationId, products],
  );
  const classProducts = useMemo(() => getClassProducts(products), [products]);
  const availableProducts = isClassFlow ? classProducts : openStudioProducts;
  const showProductSelection = isClassFlow || availableProducts.length !== 1;

  const [productId, setProductId] = useState("");
  const [dateValue, setDateValue] = useState(selectedDate || "");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [guests, setGuests] = useState(1);
  const [selectedBookingMode, setSelectedBookingMode] = useState("public");
  const [activity, setActivity] = useState("UNDEFINED");
  const [addedToCart, setAddedToCart] = useState(false);
  const confirmationTimerRef = useRef(null);
  const openedAtRef = useRef(Number.NEGATIVE_INFINITY);
  const backdropPressRef = useRef(false);
  const bookingDataLoading = Boolean(isAvailabilityLoading || isCatalogLoading);

  useEffect(() => {
    if (open) openedAtRef.current = nowMs();
  }, [open]);

  const isOpening = () => nowMs() - openedAtRef.current < DRAWER_OPEN_GRACE_MS;

  const activities = useMemo(
    () =>
      (location?.booking?.activityCapacities || []).filter((item) =>
        ["WORKSTATION", "SHARED_TABLE"].includes(item?.activity),
      ),
    [location?.booking?.activityCapacities],
  );
  const activitySelectionMode =
    location?.booking?.activitySelectionMode || "OPTIONAL";
  const startOptions = useMemo(
    () => buildStartTimeOptions(location, dateValue),
    [dateValue, location],
  );
  const durationOptions = useMemo(
    () => buildDurationOptions(location, dateValue, startTime),
    [dateValue, location, startTime],
  );
  const product = availableProducts.find(
    (item) => getEntityId(item) === productId,
  );
  const getProductDisplayName = (item, index = 0) => {
    const itemMode = isClassFlow
      ? null
      : getOpenStudioBookingFields(item).bookingMode;
    const baseFallback = isClassFlow
      ? text.classLabel
      : itemMode === "private"
        ? text.private
        : text.public;
    const sameModeCount = isClassFlow
      ? availableProducts.length
      : availableProducts.filter(
          (candidate) =>
            getOpenStudioBookingFields(candidate).bookingMode === itemMode,
        ).length;
    const fallback =
      sameModeCount > 1 ? `${baseFallback} ${index + 1}` : baseFallback;

    return getLocalizedBookingProductName(item, locale, { fallback });
  };
  const bookingMode = useMemo(
    () =>
      isClassFlow
        ? null
        : getOpenStudioBookingFields(product, selectedBookingMode).bookingMode,
    [isClassFlow, product, selectedBookingMode],
  );
  const customerChoice = !isClassFlow && isCustomerChoiceOpenStudio(product);
  const maxGuests = getOpenStudioGuestLimit({
    product,
    location,
    bookingMode,
    activity,
  });

  useEffect(() => {
    if (isClassFlow || guests <= maxGuests) return;
    // Keep the controlled guest count within the selected activity limit.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuests(maxGuests);
  }, [guests, isClassFlow, maxGuests]);

  useEffect(() => {
    if (!open) return;

    const prefillStart = prefill?.start ? new Date(prefill.start) : null;
    const prefillEnd = prefill?.end ? new Date(prefill.end) : null;
    const requestedBookingMode =
      prefill?.bookingMode || prefill?.bookingType || "public";
    const matchingProduct = isClassFlow
      ? findClassProduct(classProducts, { productId: prefill?.productId })
      : findOpenStudioProduct(openStudioProducts, {
          productId: prefill?.productId,
          bookingMode: requestedBookingMode,
        });

    // The drawer is reset from the external calendar/preserved-intent event.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProductId(getEntityId(matchingProduct));
    setSelectedBookingMode(
      requestedBookingMode === "private" ? "private" : "public",
    );
    setDateValue(
      prefillStart && !Number.isNaN(prefillStart.getTime())
        ? formatWallDate(prefillStart, timezone)
        : selectedDate,
    );
    setStartTime(
      prefillStart && !Number.isNaN(prefillStart.getTime())
        ? formatWallTime(prefillStart, timezone)
        : "",
    );
    setDurationMinutes(
      prefillStart &&
        prefillEnd &&
        !Number.isNaN(prefillStart.getTime()) &&
        !Number.isNaN(prefillEnd.getTime())
        ? Math.max(15, Math.round((prefillEnd - prefillStart) / 60_000))
        : Number(location?.booking?.minBookingMinutes) || 60,
    );
    setGuests(
      Number.isSafeInteger(Number(prefill?.quantity)) &&
        Number(prefill?.quantity) > 0
        ? Math.min(Number(prefill.quantity), 50)
        : 1,
    );
    const requestedActivity = prefill?.activity;
    const activityExists = activities.some(
      (item) => item?.activity === requestedActivity,
    );
    setActivity(
      activitySelectionMode === "HIDDEN"
        ? "UNDEFINED"
        : activityExists
          ? requestedActivity
          : "UNDEFINED",
    );
    setAddedToCart(false);
  }, [
    activities,
    activitySelectionMode,
    location?.booking?.minBookingMinutes,
    open,
    prefill,
    selectedDate,
    timezone,
    openStudioProducts,
    classProducts,
    isClassFlow,
  ]);

  useEffect(() => {
    if (isClassFlow) return;
    if (!startOptions.length) {
      // Keep the controlled select synchronized with current opening hours.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStartTime("");
      return;
    }

    if (!startOptions.includes(startTime)) setStartTime(startOptions[0]);
  }, [isClassFlow, startOptions, startTime]);

  useEffect(() => {
    if (isClassFlow) return;
    if (!durationOptions.length) return;
    if (!durationOptions.includes(durationMinutes)) {
      // Keep the controlled duration on an option valid for this start time.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDurationMinutes(durationOptions[0]);
    }
  }, [durationMinutes, durationOptions, isClassFlow]);

  useEffect(
    () => () => {
      if (confirmationTimerRef.current) {
        window.clearTimeout(confirmationTimerRef.current);
      }
    },
    [],
  );

  const start = useMemo(
    () => zonedDateTimeToUtc(dateValue, startTime, timezone),
    [dateValue, startTime, timezone],
  );
  const end = useMemo(
    () => (start ? new Date(start.getTime() + durationMinutes * 60_000) : null),
    [durationMinutes, start],
  );

  const availability = useMemo(() => {
    if (!location || !start || !end || !product)
      return { available: false, reason: "INCOMPLETE" };

    if (isClassFlow) {
      return {
        available: Boolean(prefill?.courseSessionId),
        reason: prefill?.courseSessionId ? null : "INCOMPLETE",
      };
    }

    return checkLocationAvailability({
      location,
      bookings,
      start,
      end,
      guests,
      bookingMode,
      bookingType: bookingMode,
      product,
      activity,
    });
  }, [
    activity,
    bookingMode,
    bookings,
    end,
    guests,
    isClassFlow,
    location,
    prefill?.courseSessionId,
    product,
    start,
  ]);
  const availabilityPresentation = getBookingAvailabilityPresentation({
    copy: availabilityCopy,
    available: availability.available,
    isLoading: bookingDataLoading,
    language,
    reason: availability.reason,
  });

  const unitPrice = Math.max(0, Number(product?.price) || 0);
  const extraCharge =
    !isClassFlow && !customerChoice && bookingMode === "private" && guests === 1
      ? Math.max(0, Number(product?.extraCharge) || 0)
      : 0;
  const priceBreakdown = getBookingPriceBreakdown({
    unitPrice,
    extraCharge,
    privateBookingSurcharge: getOpenStudioPrivateSurcharge(
      product,
      bookingMode,
    ),
    durationMinutes,
    guests,
    isClassFlow,
  });
  const cartQuantity = isClassFlow ? guests : priceBreakdown.durationQuantity;
  const total = priceBreakdown.total;
  const dateLabel = formatBookingDateLabel(dateValue, locale);
  const summaryDateLabel = formatBookingDateLabel(dateValue, locale, {
    includeWeekday: false,
  });
  const summaryLabel =
    start && end
      ? formatBookingSummary({
          copy: availabilityCopy,
          durationMinutes,
          startTime: formatWallTime(start, timezone),
          endTime: formatWallTime(end, timezone),
          guests,
          language: locale,
        })
      : "—";
  const submitEnabled = Boolean(
    location &&
    product &&
    start &&
    end &&
    (activitySelectionMode !== "REQUIRED" || activity !== "UNDEFINED") &&
    availability.available &&
    !bookingDataLoading &&
    !addedToCart,
  );

  const close = () => {
    if (confirmationTimerRef.current) {
      window.clearTimeout(confirmationTimerRef.current);
      confirmationTimerRef.current = null;
    }
    setAddedToCart(false);
    dispatch(closeSidebar());
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!submitEnabled) return;

    const formatter = new Intl.DateTimeFormat(activeLocale, {
      timeZone: timezone,
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    dispatch(
      addToCart({
        cartItem: {
          title: getProductDisplayName(
            product,
            Math.max(0, availableProducts.indexOf(product)),
          ),
          product,
          start: start.toISOString(),
          end: end.toISOString(),
          quantity: cartQuantity,
          numberOfGuests: guests,
          ...getBookingDrawerCartFields({
            flow: isClassFlow ? "class" : "open-studio",
            courseSessionId: prefill?.courseSessionId,
            bookingMode,
            plannedActivity:
              activitySelectionMode === "HIDDEN" ? "UNDEFINED" : activity,
          }),
          locationId: getEntityId(location),
          locationName: location.name,
          cartDate: formatter.format(start),
          cartTime: `${formatWallTime(start, timezone)}–${formatWallTime(
            end,
            timezone,
          )}`,
          isCartItem: true,
          author: {
            name: currentUser.firstname || currentUser.name || "",
            customId: currentUser.customId || "",
            email: currentUser.email || "",
          },
          createdBy: currentUser.id || currentUser._id || null,
        },
      }),
    );
    setAddedToCart(true);
    confirmationTimerRef.current = window.setTimeout(() => {
      confirmationTimerRef.current = null;
      dispatch(closeSidebar());
      dispatch(openCart());
    }, 520);
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        // A tap that lands beside the drawer while it slides in under the
        // finger that opened it is not a decision to dismiss it. Mouse
        // clicks and Escape always close it.
        const cause = typeof window === "undefined" ? undefined : window.event;
        const byTouch =
          cause?.type?.startsWith("touch") || cause?.pointerType === "touch";
        if (byTouch && isOpening()) return;
        close();
      }}
      className="relative z-[100]"
      data-tenant-style={tenantTheme.stylePresetId}
      style={tenantTheme.style}
    >
      <div className="fixed inset-0 bg-[#1F1F1F]/30 backdrop-blur-[2px]" />

      <div className="fixed inset-0 overflow-hidden">
        {/* Headless UI treats an iPad as a phone and dismisses only on
            touchend, so a trackpad or mouse click beside the drawer never
            closed it. Close on a click that also started beside the drawer;
            finger taps are dismissed by Headless UI and produce no click. */}
        <div
          className="absolute inset-0 flex justify-end"
          onPointerDown={(event) => {
            backdropPressRef.current =
              event.target === event.currentTarget &&
              event.pointerType !== "touch";
          }}
          onClick={(event) => {
            const pressedBackdrop = backdropPressRef.current;
            backdropPressRef.current = false;
            if (pressedBackdrop && event.target === event.currentTarget) {
              close();
            }
          }}
        >
          <DialogPanel
            data-dialog-layout="drawer"
            data-customer-booking-drawer
            data-tenant-surface="panel"
            transition
            className="flex h-full w-full max-w-[520px] transform flex-col border-l border-[color-mix(in_srgb,var(--tenant-text)_12%,transparent)] bg-[var(--tenant-background)] text-[var(--tenant-text)] shadow-[-24px_0_70px_rgba(31,31,31,0.13)] transition duration-300 ease-out data-closed:translate-x-full"
          >
            <div className="flex items-start justify-between border-b border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] px-5 py-5 sm:px-7 [@media(max-height:740px)]:py-3.5">
              <div className="min-w-0">
                <DialogTitle
                  className="text-[24px] font-medium tracking-[-0.045em] text-[var(--tenant-accent-on-surface)]"
                  data-tenant-type="display"
                >
                  {isClassFlow ? text.classTitle : text.title}
                </DialogTitle>
                <p className="mt-1 text-[11px] leading-5 text-[var(--tenant-muted-text)]">
                  {isClassFlow ? text.classSubtitle : text.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                data-tenant-hover="preserve"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_14%,transparent)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] transition hover:border-[var(--tenant-accent-on-surface)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/25"
                aria-label={text.cancel}
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div
                className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] [scrollbar-gutter:stable] sm:px-7"
                data-booking-scroll-region
                aria-busy={bookingDataLoading}
              >
                {!location ? (
                  <div className="rounded-[16px] border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-5 text-[12px] text-[var(--tenant-muted-on-surface)]">
                    {text.missingLocation}
                  </div>
                ) : (
                  <div className="flex min-h-14 items-center gap-3 rounded-[16px] border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_12%,transparent)] bg-[var(--tenant-surface)] px-3.5 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[color-mix(in_srgb,var(--tenant-accent)_10%,transparent)] text-[var(--tenant-accent-on-surface)]">
                      <MapPinIcon
                        className="h-[18px] w-[18px]"
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-[12px] font-semibold text-[var(--tenant-text-on-surface)]"
                        title={location.name}
                      >
                        {location.name}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] leading-4 text-[var(--tenant-muted-on-surface)]">
                        {formatLocationAddress(location)}
                      </p>
                    </div>
                    <p className="hidden shrink-0 text-[8px] uppercase tracking-[0.12em] text-[var(--tenant-muted-on-surface)] sm:block">
                      {timezone}
                    </p>
                  </div>
                )}

                {showProductSelection && (
                  <Field
                    label={isClassFlow ? text.classProduct : text.product}
                    icon={ShoppingBagIcon}
                  >
                    <select
                      className={controlClass}
                      data-tenant-surface="field"
                      value={productId}
                      onChange={(event) => setProductId(event.target.value)}
                      disabled={isClassFlow || !availableProducts.length}
                    >
                      {!availableProducts.length && (
                        <option value="">
                          {isClassFlow
                            ? text.classMissing
                            : text.missingProduct}
                        </option>
                      )}
                      {availableProducts.map((item, index) => (
                        <option
                          key={getEntityId(item)}
                          value={getEntityId(item)}
                        >
                          {getProductDisplayName(item, index)}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={text.date} icon={CalendarDaysIcon}>
                    <div
                      className={`${controlClass} relative flex items-center pr-10 font-medium focus-within:border-[var(--tenant-accent-on-surface)] focus-within:ring-4 focus-within:ring-[var(--tenant-accent-on-surface)]/10`}
                      data-tenant-surface="field"
                    >
                      <span className="truncate" data-booking-date-label>
                        {dateLabel || text.select}
                      </span>
                      <CalendarDaysIcon
                        className="pointer-events-none absolute right-3.5 h-4 w-4 text-[var(--tenant-muted-on-surface)]"
                        aria-hidden="true"
                      />
                      <input
                        type="date"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                        value={dateValue}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(event) => setDateValue(event.target.value)}
                        disabled={isClassFlow}
                        aria-label={text.date}
                        title={dateLabel}
                      />
                    </div>
                  </Field>
                  <Field label={text.start} icon={ClockIcon}>
                    <select
                      className={controlClass}
                      data-tenant-surface="field"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      disabled={isClassFlow || !startOptions.length}
                    >
                      {!startOptions.length && (
                        <option value="">{text.closed}</option>
                      )}
                      {startOptions.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label={text.duration} icon={ClockIcon}>
                  <div className="grid grid-cols-3 gap-2">
                    {(isClassFlow ? [durationMinutes] : durationOptions).map(
                      (value) => (
                        <button
                          key={value}
                          type="button"
                          data-tenant-surface="field"
                          data-tenant-hover="preserve"
                          aria-pressed={durationMinutes === value}
                          onClick={() => setDurationMinutes(value)}
                          disabled={isClassFlow}
                          data-booking-duration-selected={
                            durationMinutes === value ? "true" : undefined
                          }
                          className={cx(
                            "min-h-11 rounded-[12px] border px-2 text-[11px] font-medium transition",
                            durationMinutes === value
                              ? ""
                              : "border-[color-mix(in_srgb,var(--tenant-text-on-surface)_16%,transparent)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] hover:border-[var(--tenant-accent-on-surface)]",
                          )}
                          style={
                            durationMinutes === value
                              ? {
                                  backgroundColor: "var(--tenant-accent)",
                                  borderColor: "var(--tenant-accent)",
                                  boxShadow:
                                    "0 8px 20px color-mix(in srgb, var(--tenant-accent) 24%, transparent)",
                                  color: "var(--tenant-accent-foreground)",
                                }
                              : undefined
                          }
                        >
                          {formatDuration(value, locale)}
                        </button>
                      ),
                    )}
                  </div>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={text.guests} icon={UserGroupIcon}>
                    <select
                      className={controlClass}
                      data-tenant-surface="field"
                      value={guests}
                      onChange={(event) =>
                        setGuests(Number(event.target.value))
                      }
                    >
                      {Array.from(
                        { length: maxGuests },
                        (_, index) => index + 1,
                      ).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label={isClassFlow ? text.classType : text.bookingType}
                    icon={UserGroupIcon}
                  >
                    {customerChoice ? (
                      <select
                        className={controlClass}
                        data-tenant-surface="field"
                        value={bookingMode}
                        onChange={(event) =>
                          setSelectedBookingMode(event.target.value)
                        }
                      >
                        <option value="public">{text.public}</option>
                        <option value="private">{text.private}</option>
                      </select>
                    ) : (
                      <div
                        className={`${controlClass} flex items-center bg-[color-mix(in_srgb,var(--tenant-text-on-surface)_5%,var(--tenant-surface))] font-medium`}
                        data-tenant-surface="field"
                        {...(!isClassFlow
                          ? { "data-booking-mode": bookingMode }
                          : { "data-product-kind": "class" })}
                      >
                        {isClassFlow
                          ? text.classLabel
                          : bookingMode === "private"
                            ? text.private
                            : text.public}
                      </div>
                    )}
                  </Field>
                </div>
                {customerChoice && (
                  <p className="text-xs leading-5 text-[var(--tenant-muted-on-surface)]">
                    {bookingMode === "private"
                      ? t("customerChoice.privateHelp", {
                          amount: formatBookingPrice(
                            getOpenStudioPrivateSurcharge(product, bookingMode),
                            product?.currency,
                            locale,
                          ),
                        })
                      : t("customerChoice.publicFixedHelp", {
                          count: maxGuests,
                        })}
                  </p>
                )}

                {!isClassFlow &&
                  activitySelectionMode !== "HIDDEN" &&
                  activities.length > 0 && (
                    <Field label={text.activity} icon={CheckCircleIcon}>
                      <select
                        className={controlClass}
                        data-tenant-surface="field"
                        value={activity}
                        onChange={(event) => setActivity(event.target.value)}
                      >
                        {activitySelectionMode === "REQUIRED" ? (
                          <option value="UNDEFINED" disabled>
                            {t("activityChoose")}
                          </option>
                        ) : (
                          <option value="UNDEFINED">
                            {text.activityNotSpecified}
                          </option>
                        )}
                        {activities.map((item) => (
                          <option key={item.activity} value={item.activity}>
                            {t(ACTIVITY_TRANSLATION_KEYS[item.activity])} ·{" "}
                            {item.capacity}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                {!isClassFlow &&
                activitySelectionMode === "REQUIRED" &&
                activities.length === 0 ? (
                  <p
                    className="rounded-[12px] border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
                    role="alert"
                  >
                    {text.activityUnavailable}
                  </p>
                ) : null}

                {priceBreakdown.hasDetails ? (
                  <div
                    className="space-y-1.5 rounded-[12px] border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)] bg-[var(--tenant-surface)] px-3 py-2.5 text-[10px] text-[var(--tenant-muted-on-surface)]"
                    data-booking-price-breakdown
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span>
                        {isClassFlow ? text.classPrice : text.sessionPrice}
                        {priceBreakdown.guestCount > 1
                          ? ` · ${formatBookingGuestCount(
                              priceBreakdown.guestCount,
                              locale,
                              availabilityCopy,
                            )}`
                          : ""}
                      </span>
                      <span className="font-semibold text-[var(--tenant-text-on-surface)]">
                        {formatBookingPrice(
                          priceBreakdown.baseTotal,
                          product?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY,
                          activeLocale,
                        )}
                      </span>
                    </div>
                    {priceBreakdown.surchargeTotal > 0 ? (
                      <div className="flex items-center justify-between gap-4">
                        <span>{text.privateSurcharge}</span>
                        <span className="font-semibold text-[var(--tenant-text-on-surface)]">
                          {formatBookingPrice(
                            priceBreakdown.surchargeTotal,
                            product?.currency ||
                              DEFAULT_STUDIO_COMMERCE_CURRENCY,
                            activeLocale,
                          )}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div
                  className={cx(
                    "rounded-[14px] border px-4 py-3 text-[11px] leading-5",
                    availabilityPresentation.tone === "available"
                      ? "border-[#CDDEC8] bg-[#F2F7F0] text-[#47613E]"
                      : availabilityPresentation.tone === "unavailable"
                        ? "border-[#F1CFC5] bg-[#FFF5F1] text-[#A34632]"
                        : "border-[color-mix(in_srgb,var(--tenant-text-on-surface)_12%,transparent)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)]",
                  )}
                  data-booking-availability-state={
                    availabilityPresentation.tone
                  }
                  aria-busy={bookingDataLoading}
                  aria-live="polite"
                >
                  {bookingDataLoading ? (
                    <div className="space-y-2" data-booking-loading-skeleton>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--tenant-accent)] motion-reduce:animate-none" />
                        <span className="font-semibold">
                          {availabilityPresentation.title}
                        </span>
                      </div>
                      <span className="block h-2.5 w-4/5 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)] motion-reduce:animate-none" />
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold">
                        {availabilityPresentation.title}
                      </p>
                      <p className="mt-0.5 opacity-80">
                        {availabilityPresentation.description}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div
                className="shrink-0 border-t border-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)] bg-[var(--tenant-surface)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(23,23,21,0.045)] sm:px-7 [@media(max-height:740px)]:py-3 [@media(max-height:740px)]:pb-[max(.75rem,env(safe-area-inset-bottom))]"
                data-booking-summary-footer
              >
                <div className="mb-4 flex items-center justify-between gap-4 [@media(max-height:740px)]:mb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--tenant-muted-on-surface)]">
                      {text.summary}
                      {summaryDateLabel ? ` · ${summaryDateLabel}` : ""}
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-[var(--tenant-text-on-surface)]">
                      {summaryLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-[var(--tenant-muted-on-surface)]">
                      {text.total}
                    </p>
                    <p
                      className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-[var(--tenant-text-on-surface)]"
                      data-booking-price-total
                    >
                      {formatBookingPrice(
                        total,
                        product?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY,
                        activeLocale,
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={!submitEnabled}
                    onClick={(event) => {
                      if (isOpening()) event.preventDefault();
                    }}
                    data-tenant-button="primary"
                    data-tenant-hover="preserve"
                    className={cx(
                      "min-h-11 w-full rounded-full bg-[#C8C3BC] px-5 text-[11px] font-semibold text-white transition-[transform,filter,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:brightness-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-surface)] disabled:cursor-not-allowed disabled:shadow-none motion-reduce:transform-none motion-reduce:transition-none",
                      addedToCart && "scale-[0.99]",
                    )}
                    data-booking-submit
                    data-booking-submit-state={
                      addedToCart
                        ? "added"
                        : bookingDataLoading
                          ? "checking"
                          : "idle"
                    }
                    style={
                      submitEnabled || addedToCart
                        ? {
                            backgroundColor: "var(--tenant-accent)",
                            boxShadow:
                              "0 10px 24px color-mix(in srgb, var(--tenant-accent) 24%, transparent)",
                            color: "var(--tenant-accent-foreground)",
                          }
                        : undefined
                    }
                  >
                    <span
                      className="inline-flex items-center justify-center gap-2"
                      aria-live="polite"
                    >
                      {addedToCart ? (
                        <CheckCircleIcon
                          className="h-4 w-4 animate-[pulse_420ms_ease-out_1] motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                      ) : null}
                      {addedToCart
                        ? text.added
                        : bookingDataLoading
                          ? text.checking
                          : text.add}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
