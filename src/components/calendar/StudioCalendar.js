"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDaysIcon, XMarkIcon } from "@heroicons/react/24/outline";

import CalendarLegend from "./CalendarLegend";
import CalendarToolbar, {
  CALENDAR_VIEWS,
  normalizeCalendarViews,
  resolveCalendarView,
} from "./CalendarToolbar";
import DayCalendar from "./DayCalendar";
import MonthCalendar from "./MonthCalendar";
import WeekCalendar from "./WeekCalendar";
import {
  getEntityId,
  normalizeBookingsForCalendar,
  normalizeLocationToCalendarStudio,
  normalizeLocationsForCalendar,
} from "./calendar.adapters";
import {
  addDays,
  addMonths,
  buildCustomerEvents,
  dateKey,
  formatRange,
  getCalendarEventCapacity,
  pickSuggestedCalendarSlot,
} from "./calendar.utils";
import { getCalendarTitle } from "./calendar.title";
import { localizeCalendarResource } from "./calendar.resources";
import { getCustomerCalendarBookingPreview } from "./calendar.bookingSelection";
import {
  CALENDAR_CANVAS_STYLE,
  CUSTOMER_CALENDAR_CANVAS_STYLE,
} from "./calendar.presentation";

const DEFAULT_SUGGESTION_COPY = Object.freeze({
  eyebrow: "Try the calendar",
  title: "Here is an available time to start with",
  description:
    "This is only a suggestion. Select it to continue, or choose any other time in the calendar.",
  action: "Select this time",
  dismiss: "Dismiss suggested time",
  unavailable:
    "No open time could be suggested right now. Browse another day or contact the studio.",
});

const DEFAULT_SELECTION_COPY = Object.freeze({
  summary: "Selected time",
  continue: "Continue",
  clear: "Clear selected time",
});

const CUSTOMER_CALENDAR_THEME_STYLE = Object.freeze({
  "--tenant-background": "var(--tenant-portal-calendar-background)",
  "--tenant-surface": "var(--tenant-portal-calendar-surface)",
  "--tenant-text": "var(--tenant-portal-calendar-text)",
  "--tenant-text-on-surface": "var(--tenant-portal-calendar-text-on-surface)",
  "--tenant-muted-text": "var(--tenant-portal-calendar-muted)",
  "--tenant-muted-on-surface": "var(--tenant-portal-calendar-muted)",
  "--tenant-border": "var(--tenant-portal-calendar-border)",
  "--tenant-label-color": "var(--tenant-portal-calendar-label)",
  "--tenant-heading-color": "var(--tenant-portal-calendar-heading)",
  "--tenant-accent": "var(--tenant-portal-button)",
  "--tenant-accent-foreground": "var(--tenant-portal-button-foreground)",
  "--tenant-accent-on-surface": "var(--tenant-portal-calendar-accent)",
  "--tenant-secondary": "var(--tenant-portal-calendar-secondary)",
  "--tenant-secondary-on-surface":
    "var(--tenant-portal-calendar-secondary-on-surface)",
  backgroundColor: "var(--tenant-background)",
  boxShadow:
    "inset 0 0 0 1px color-mix(in srgb, var(--tenant-text-on-surface) 9%, transparent)",
});

// Below 640px the filter panel is a fixed bottom sheet that the selection
// summary bar would overlap. From 640px it sits inline above the grid.
const FILTER_SHEET_QUERY = "(max-width: 639px)";

const subscribeToFilterSheetLayout = (onChange) => {
  const query = window.matchMedia?.(FILTER_SHEET_QUERY);
  query?.addEventListener?.("change", onChange);
  return () => query?.removeEventListener?.("change", onChange);
};

const getFilterSheetLayout = () =>
  Boolean(window.matchMedia?.(FILTER_SHEET_QUERY)?.matches);

const getServerFilterSheetLayout = () => false;

function useControllableState(controlledValue, defaultValue, onChange) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;
  const setValue = (next) => {
    if (controlledValue === undefined) setInternalValue(next);
    onChange?.(next);
  };
  return [value, setValue, setInternalValue];
}

export default function StudioCalendar({
  studios = [],
  location,
  bookings = [],
  teamMembers = [],
  audience = "tenant",
  selectedStudioId,
  selectedLocationId,
  view: controlledView,
  onViewChange,
  date: controlledDate,
  onDateChange,
  defaultView = "week",
  onBookingClick,
  onSlotSelect,
  onCreateBooking,
  pageScroll = false,
  availableViews = CALENDAR_VIEWS,
  readOnly = false,
  suggestSlotRequest = 0,
  suggestionCopy = DEFAULT_SUGGESTION_COPY,
  selectionCopy = DEFAULT_SELECTION_COPY,
}) {
  const locale = useLocale();
  const t = useTranslations("Calendar");
  const customerThemed = ["customer", "public"].includes(audience);
  const canvasStyle =
    audience === "customer"
      ? CUSTOMER_CALENDAR_CANVAS_STYLE
      : CALENDAR_CANVAS_STYLE;
  const normalizedAvailableViews = useMemo(
    () => normalizeCalendarViews(availableViews),
    [availableViews],
  );
  const fallbackView = resolveCalendarView(
    defaultView,
    normalizedAvailableViews,
    normalizedAvailableViews[0],
  );
  const [requestedView, setView, setInternalView] = useControllableState(
    controlledView,
    fallbackView,
    onViewChange,
  );
  const view = resolveCalendarView(
    requestedView,
    normalizedAvailableViews,
    fallbackView,
  );
  const [date, setDate] = useControllableState(
    controlledDate,
    new Date(),
    onDateChange,
  );
  const [activityFilter, setActivityFilter] = useState({
    studioId: "",
    value: "all",
  });
  const [teamMemberFilter, setTeamMemberFilter] = useState({
    studioId: "",
    value: "all",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersAreSheet = useSyncExternalStore(
    subscribeToFilterSheetLayout,
    getFilterSheetLayout,
    getServerFilterSheetLayout,
  );
  const filtersId = useId();
  const filterTriggerRef = useRef(null);
  const calendarViewportRef = useRef(null);
  const focusDateDrilldownRef = useRef(false);
  const responsiveDefaultApplied = useRef(false);
  const mobileFilterDefaultApplied = useRef(false);
  const handledSuggestionRequest = useRef(0);
  const suggestionRef = useRef(null);
  const [suggestion, setSuggestion] = useState(null);
  const [bookingPreviewRequest, setBookingPreviewRequest] = useState(null);
  const bookingPreviewId = useRef(0);

  useEffect(() => {
    if (controlledView === undefined && requestedView !== view) {
      setInternalView(view);
    }
  }, [controlledView, requestedView, setInternalView, view]);

  useEffect(() => {
    if (
      responsiveDefaultApplied.current ||
      controlledView !== undefined ||
      typeof window === "undefined"
    ) {
      return;
    }

    responsiveDefaultApplied.current = true;
    if (
      !["customer", "public"].includes(audience) &&
      window.matchMedia("(max-width: 639px)").matches &&
      defaultView === "week" &&
      normalizedAvailableViews.includes("day")
    ) {
      setView("day");
    }
  }, [
    controlledView,
    audience,
    defaultView,
    normalizedAvailableViews,
    setView,
  ]);

  useEffect(() => {
    if (
      mobileFilterDefaultApplied.current ||
      audience !== "customer" ||
      readOnly ||
      typeof window === "undefined"
    ) {
      return;
    }

    mobileFilterDefaultApplied.current = true;
    setFiltersOpen(!window.matchMedia("(max-width: 639px)").matches);
  }, [audience, readOnly]);

  useEffect(() => {
    if (!filtersOpen) return undefined;

    const handleKeyDown = (event) => {
      // Escape the calendar already used, e.g. to clear a selection, is not
      // for the filters: closing them would also jump to the filter button.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // The inline panel only closes from inside it or from its trigger.
      const target = event.target instanceof Node ? event.target : null;
      if (
        !filtersAreSheet &&
        !(
          target &&
          (document.getElementById(filtersId)?.contains(target) ||
            filterTriggerRef.current?.contains(target))
        )
      ) {
        return;
      }
      setFiltersOpen(false);
      filterTriggerRef.current?.focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filtersAreSheet, filtersId, filtersOpen]);

  const normalizedStudios = useMemo(() => {
    if (location) {
      const normalizedLocation = normalizeLocationToCalendarStudio(location);
      return normalizedLocation ? [normalizedLocation] : [];
    }

    return normalizeLocationsForCalendar(studios);
  }, [location, studios]);

  const controlledLocationId = String(
    selectedLocationId || selectedStudioId || getEntityId(location) || "",
  );

  const studio =
    normalizedStudios.find((item) => item.id === controlledLocationId) ||
    normalizedStudios[0] ||
    null;

  const activityId = readOnly
    ? "all"
    : activityFilter.studioId === studio?.id
      ? activityFilter.value
      : "all";
  const teamMemberId = readOnly
    ? "all"
    : teamMemberFilter.studioId === studio?.id
      ? teamMemberFilter.value
      : "all";

  const normalizedBookings = useMemo(
    () => normalizeBookingsForCalendar(bookings, { locale }),
    [bookings, locale],
  );

  const availabilityBookings = useMemo(
    () =>
      normalizedBookings
        .filter((booking) =>
          Boolean(studio && booking.locationId === studio.id),
        )
        .map((booking) => {
          if (audience !== "public") return booking;

          // Public availability must count every occupied unit and blocker,
          // even when its event details are not safe to render. Pass only the
          // structural fields the availability engine needs downstream.
          return {
            id: booking.id,
            locationId: booking.locationId,
            start: booking.start,
            end: booking.end,
            activityId: booking.activityId,
            capacityUsed: booking.capacityUsed,
            guests: booking.guests,
            kind: booking.kind,
            tag: booking.tag,
            bookingMode: booking.bookingMode,
            bookingType: booking.bookingType,
            publicCapacityLimit: booking.publicCapacityLimit,
            isExclusive: booking.isExclusive,
            status: booking.status,
            privacySafe: true,
          };
        }),
    [audience, normalizedBookings, studio],
  );

  const filteredBookings = useMemo(() => {
    const scoped = normalizedBookings.filter((booking) => {
      // Public calendars must only consume the deliberately anonymous event
      // DTO. Audience-specific rendering is not a privacy boundary by itself.
      if (audience === "public" && booking.privacySafe !== true) return false;
      if (!studio || booking.locationId !== studio.id) return false;
      if (activityId !== "all" && booking.activityId !== activityId)
        return false;
      if (
        audience === "tenant" &&
        teamMemberId !== "all" &&
        booking.teamMemberId !== teamMemberId
      ) {
        return false;
      }
      return true;
    });
    return audience === "customer"
      ? buildCustomerEvents(scoped, studio, t, availabilityBookings)
      : audience === "tenant"
        ? scoped.map((booking) => ({
            ...booking,
            ...getCalendarEventCapacity(booking, availabilityBookings, studio),
          }))
        : scoped;
  }, [
    activityId,
    audience,
    availabilityBookings,
    normalizedBookings,
    studio,
    t,
    teamMemberId,
  ]);

  const suggestionContextIsCurrent =
    !suggestion ||
    (suggestion.studioId === (studio?.id || "") &&
      suggestion.activityId === activityId &&
      suggestion.bookingSnapshot === normalizedBookings);
  const currentSuggestion = suggestionContextIsCurrent ? suggestion : null;
  if (suggestion && !suggestionContextIsCurrent) {
    setSuggestion(null);
  }
  const bookingSelectionScope = `${studio?.id || ""}:${view}:${date.getTime()}:${activityId}`;
  if (
    bookingPreviewRequest &&
    bookingPreviewRequest.scope !== bookingSelectionScope
  ) {
    setBookingPreviewRequest(null);
  }

  useEffect(() => {
    const requestId = Number(suggestSlotRequest) || 0;
    if (!requestId || handledSuggestionRequest.current === requestId) return;

    handledSuggestionRequest.current = requestId;
    const slot = pickSuggestedCalendarSlot({
      studio,
      bookings: normalizedBookings,
      selectedActivityId: activityId === "all" ? "" : activityId,
    });
    setSuggestion({
      requestId,
      slot,
      studioId: studio?.id || "",
      activityId,
      bookingSnapshot: normalizedBookings,
    });

    if (slot) {
      setDate(slot.day);
      if (view === "month") {
        setView(
          normalizedAvailableViews.includes("day") ? "day" : fallbackView,
        );
      }
    }
  }, [
    activityId,
    fallbackView,
    normalizedAvailableViews,
    normalizedBookings,
    setDate,
    setView,
    studio,
    suggestSlotRequest,
    view,
  ]);

  useEffect(() => {
    if (!currentSuggestion || typeof window === "undefined") return undefined;

    const frame = window.requestAnimationFrame(() => {
      suggestionRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentSuggestion]);

  useEffect(() => {
    if (
      !customerThemed ||
      view !== "day" ||
      !focusDateDrilldownRef.current ||
      typeof window === "undefined"
    ) {
      return undefined;
    }

    focusDateDrilldownRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      calendarViewportRef.current
        ?.querySelector?.(
          '[data-calendar-mobile-day-grid="true"] [data-calendar-day-column]',
        )
        ?.focus?.({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [customerThemed, date, view]);

  if (!studio) {
    return (
      <div
        data-calendar-read-only={readOnly ? "true" : "false"}
        style={canvasStyle}
        className={`m-4 flex flex-1 items-center justify-center rounded-[20px] border border-dashed p-10 text-center sm:m-6 ${customerThemed ? "border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)]" : "border-[#D8D5CE] bg-white"}`}
      >
        <div>
          <p
            className={`text-[15px] font-medium ${
              customerThemed
                ? "text-[var(--tenant-text-on-surface)]"
                : "text-[#252524]"
            }`}
          >
            {t("empty.noStudios")}
          </p>
          <p
            className={`mt-1 text-[11px] ${
              customerThemed
                ? "text-[var(--tenant-muted-on-surface)]"
                : "text-[#777773]"
            }`}
          >
            {t("empty.noStudiosHelp")}
          </p>
        </div>
      </div>
    );
  }

  const navigate = (direction) => {
    if (view === "month") setDate(addMonths(date, direction));
    else if (view === "week") setDate(addDays(date, direction * 7));
    else setDate(addDays(date, direction));
  };

  const handleDateSelect = (nextDate) => {
    focusDateDrilldownRef.current = true;
    setDate(nextDate);
    setView(normalizedAvailableViews.includes("day") ? "day" : fallbackView);
  };

  const clearFilters = () => {
    setActivityFilter({ studioId: studio.id, value: "all" });
    setTeamMemberFilter({ studioId: studio.id, value: "all" });
  };
  const closeFilters = () => {
    setFiltersOpen(false);
    filterTriggerRef.current?.focus();
  };
  const goToToday = () => {
    const todayKey = dateKey(new Date(), studio?.timeZone);
    const [year, month, day] = todayKey.split("-").map(Number);

    if ([year, month, day].every(Number.isFinite)) {
      setDate(new Date(year, month - 1, day, 12));
      return;
    }

    setDate(new Date());
  };

  const activities = studio.resources || [];
  const activeFilterCount =
    Number(activityId !== "all") + Number(teamMemberId !== "all");
  const title = getCalendarTitle(view, date, locale);
  const suggestedSlot =
    currentSuggestion?.studioId === studio.id ? currentSuggestion.slot : null;
  const selectSuggestedSlot = () => {
    if (!suggestedSlot) return;

    setSuggestion(null);
    onSlotSelect?.({
      studio,
      activityId: suggestedSlot.activityId,
      start: suggestedSlot.start,
      end: suggestedSlot.end,
    });
  };
  const renderedBookings = suggestedSlot
    ? [
        ...filteredBookings,
        {
          id: `suggested-slot:${currentSuggestion.requestId}`,
          locationId: studio.id,
          activityId: suggestedSlot.activityId,
          start: suggestedSlot.start,
          end: suggestedSlot.end,
          title: suggestionCopy.title,
          subtitle: suggestionCopy.action,
          kind: "suggestion",
          isSuggested: true,
          privacySafe: true,
        },
      ]
    : filteredBookings;
  const selectCustomerBooking = (event, clickEvent) => {
    const column = clickEvent?.currentTarget?.closest?.(
      "[data-calendar-day-column], [data-calendar-week-day-column]",
    );
    const bounds = column?.getBoundingClientRect?.();
    const pixelsPerMinute = Number(column?.dataset.calendarPixelsPerMinute);
    const calendarStart = Number(column?.dataset.calendarStartMinute);
    const pointerMinute =
      clickEvent?.detail &&
      bounds &&
      pixelsPerMinute > 0 &&
      Number.isFinite(calendarStart) &&
      Number.isFinite(clickEvent.clientY)
        ? calendarStart + (clickEvent.clientY - bounds.top) / pixelsPerMinute
        : undefined;
    const preview = getCustomerCalendarBookingPreview({
      event,
      studio,
      selectedActivityId: activityId === "all" ? "" : activityId,
      pointerMinute,
    });
    if (!preview) return;
    const targetView =
      view === "month"
        ? normalizedAvailableViews.includes("day")
          ? "day"
          : "week"
        : view;
    if (!normalizedAvailableViews.includes(targetView)) return;
    const targetDate = view === "month" ? preview.day : date;
    if (view === "month") {
      setDate(targetDate);
      setView(targetView);
    }
    setSuggestion(null);
    setBookingPreviewRequest({
      ...preview,
      id: ++bookingPreviewId.current,
      trigger:
        clickEvent?.currentTarget ||
        (typeof document === "undefined" ? null : document.activeElement),
      scope: `${studio.id}:${targetView}:${targetDate.getTime()}:${activityId}`,
    });
  };
  const sharedProps = {
    date,
    bookingPreviewRequest: readOnly ? null : bookingPreviewRequest,
    bookings: renderedBookings,
    // Rendering follows the activity/team filters, but capacity and global
    // blockers must always see every booking in the studio. Otherwise a
    // selected activity could appear bookable while another activity has
    // already consumed the shared capacity.
    availabilityBookings,
    studio,
    locale,
    audience,
    selectedActivityId: activityId === "all" ? "" : activityId,
    onBookingClick:
      readOnly ||
      (audience === "customer"
        ? !onSlotSelect
        : !suggestedSlot && !onBookingClick)
        ? undefined
        : (booking, clickEvent) => {
            setBookingPreviewRequest(null);
            if (booking?.isSuggested) {
              selectSuggestedSlot();
              return;
            }
            // The customer calendar is a booking entry point, including when
            // a shared time already contains someone else's (or their own)
            // booking. Existing reservations are managed in My bookings.
            if (audience === "customer") {
              selectCustomerBooking(booking, clickEvent);
              return;
            }
            onBookingClick?.(booking);
          },
    onSlotSelect:
      readOnly || !onSlotSelect
        ? undefined
        : (selection) => {
            setBookingPreviewRequest(null);
            onSlotSelect(selection);
          },
    selectionCopy,
    mobileOverlayBlocked: filtersOpen && filtersAreSheet,
    pageScroll,
    t,
  };

  return (
    <section
      data-calendar-shell="true"
      data-calendar-page-scroll={pageScroll ? "true" : "false"}
      data-calendar-read-only={readOnly ? "true" : "false"}
      className={`flex min-h-0 min-w-0 flex-col ${customerThemed ? "text-[var(--tenant-text-on-surface)]" : "bg-white"} ${pageScroll ? "h-auto overflow-visible" : "h-full overflow-hidden"}`}
      style={customerThemed ? CUSTOMER_CALENDAR_THEME_STYLE : undefined}
    >
      <CalendarToolbar
        view={view}
        onViewChange={setView}
        title={title}
        onPrevious={() => navigate(-1)}
        onNext={() => navigate(1)}
        onToday={goToToday}
        onCreateBooking={readOnly ? undefined : onCreateBooking}
        audience={audience}
        availableViews={normalizedAvailableViews}
        readOnly={readOnly}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((open) => !open)}
        activeFilterCount={activeFilterCount}
        filtersId={filtersId}
        filterTriggerRef={filterTriggerRef}
        pageScroll={pageScroll}
        t={t}
      />

      {!readOnly && filtersOpen && (
        <div
          id={filtersId}
          data-calendar-filter-panel="true"
          data-calendar-mobile-sheet="true"
          style={canvasStyle}
          className={`fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[60] max-h-[min(72dvh,560px)] overflow-y-auto rounded-[18px] border px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_22px_60px_color-mix(in_srgb,var(--tenant-text)_18%,transparent)] sm:static sm:z-auto sm:max-h-none sm:overflow-visible sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b sm:px-4 sm:py-3 sm:shadow-none ${
            customerThemed
              ? "border-[var(--tenant-border)] bg-[var(--tenant-background)]"
              : "border-[#E7E4DE] bg-[#F8F6F1]"
          }`}
        >
          <button
            type="button"
            aria-label={t("filters.closeLegend")}
            data-tenant-hover={customerThemed ? "preserve" : undefined}
            onClick={closeFilters}
            className={`absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-[11px] transition focus-visible:outline-none focus-visible:ring-2 sm:hidden ${
              customerThemed
                ? "text-[var(--tenant-muted-on-surface)] hover:bg-[var(--tenant-surface)] hover:text-[var(--tenant-text-on-surface)] focus-visible:ring-[var(--tenant-accent-on-surface)]/30"
                : "text-[#666663] hover:bg-white focus-visible:ring-brand-primary/25"
            }`}
          >
            <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex flex-col gap-3 pr-12 sm:pr-0 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {activities.length > 0 && (
                <select
                  value={activityId}
                  onChange={(event) =>
                    setActivityFilter({
                      studioId: studio.id,
                      value: event.target.value,
                    })
                  }
                  className={`h-11 min-w-0 rounded-[12px] border px-3.5 text-[12px] outline-none focus:ring-2 ${
                    customerThemed
                      ? "border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] focus:border-[var(--tenant-accent-on-surface)] focus:ring-[var(--tenant-accent-on-surface)]/15"
                      : "border-[#E2DFD9] bg-white text-[#4B4B49] focus:border-brand-primary focus:ring-brand-primary/15"
                  }`}
                  aria-label={t("filters.activity")}
                >
                  <option value="all">{t("filters.allActivities")}</option>
                  {activities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {localizeCalendarResource(activity, t).name}
                    </option>
                  ))}
                </select>
              )}

              {audience === "tenant" && teamMembers.length > 0 && (
                <select
                  value={teamMemberId}
                  onChange={(event) =>
                    setTeamMemberFilter({
                      studioId: studio.id,
                      value: event.target.value,
                    })
                  }
                  className="h-11 min-w-0 rounded-[12px] border border-[#E2DFD9] bg-white px-3.5 text-[12px] text-[#4B4B49] outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
                  aria-label={t("filters.teamMember")}
                >
                  <option value="all">{t("filters.allTeamMembers")}</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              )}

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  data-tenant-hover={customerThemed ? "preserve" : undefined}
                  onClick={clearFilters}
                  aria-label={`${t("filters.allActivities")} / ${t(
                    "filters.allTeamMembers",
                  )}`}
                  className={`min-h-11 rounded-[12px] border px-3 text-[11px] font-medium transition ${
                    customerThemed
                      ? "border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-muted-on-surface)] hover:border-[var(--tenant-accent-on-surface)] hover:text-[var(--tenant-accent-on-surface)]"
                      : "border-[#D8D5CE] bg-white text-[#666663] hover:bg-surface-muted"
                  }`}
                >
                  {t("filters.allActivities")}
                </button>
              )}
            </div>

            <CalendarLegend
              audience={audience}
              studio={studio}
              bookings={filteredBookings}
              t={t}
            />
          </div>
        </div>
      )}

      {!readOnly &&
        currentSuggestion &&
        currentSuggestion.studioId === studio.id && (
          <div
            ref={suggestionRef}
            tabIndex={-1}
            role="status"
            aria-live="polite"
            data-calendar-suggested-slot
            data-calendar-suggestion-available={
              currentSuggestion.slot ? "true" : "false"
            }
            className="relative m-3 overflow-hidden rounded-[16px] border px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30 sm:m-4"
            style={{
              borderColor:
                "color-mix(in srgb, var(--tenant-accent-on-surface) 34%, var(--tenant-border))",
              backgroundColor:
                "color-mix(in srgb, var(--tenant-accent) 8%, var(--tenant-surface))",
              color: "var(--tenant-text-on-surface)",
              boxShadow:
                "0 12px 30px color-mix(in srgb, var(--tenant-accent) 12%, transparent)",
            }}
          >
            <div className="flex items-start gap-3 pr-10">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)] shadow-[0_7px_18px_color-mix(in_srgb,var(--tenant-accent)_20%,transparent)]">
                <CalendarDaysIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-accent-on-surface)]">
                  {suggestionCopy.eyebrow}
                </p>
                {currentSuggestion.slot ? (
                  <>
                    <p className="mt-0.5 text-[14px] font-semibold tracking-[-0.02em]">
                      {suggestionCopy.title}
                    </p>
                    <p className="mt-1 text-[12px] font-semibold capitalize tabular-nums text-[var(--tenant-accent-on-surface)]">
                      {new Intl.DateTimeFormat(locale, {
                        timeZone: studio.timeZone,
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      }).format(currentSuggestion.slot.start)}{" "}
                      ·{" "}
                      {formatRange(
                        currentSuggestion.slot.start,
                        currentSuggestion.slot.end,
                        locale,
                        studio.timeZone,
                      )}
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-[var(--tenant-muted-on-surface)]">
                      {suggestionCopy.description}
                    </p>
                    <button
                      type="button"
                      data-calendar-suggested-slot-action
                      data-tenant-hover="preserve"
                      onClick={selectSuggestedSlot}
                      className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--tenant-accent)] px-5 text-[11px] font-semibold text-[var(--tenant-accent-foreground)] shadow-[0_9px_22px_color-mix(in_srgb,var(--tenant-accent)_22%,transparent)] transition hover:-translate-y-0.5 hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-surface)] motion-reduce:transform-none"
                    >
                      {suggestionCopy.action}
                    </button>
                  </>
                ) : (
                  <p className="mt-1 text-[11px] leading-5 text-[var(--tenant-muted-on-surface)]">
                    {suggestionCopy.unavailable}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-label={suggestionCopy.dismiss}
              data-tenant-hover="preserve"
              onClick={() => setSuggestion(null)}
              className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-[var(--tenant-muted-on-surface)] transition hover:bg-[var(--tenant-surface)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

      <div
        ref={calendarViewportRef}
        data-calendar-viewport="true"
        data-calendar-scroll-region="true"
        style={canvasStyle}
        className={`flex min-h-0 flex-col [&>div:last-child]:min-h-0 ${pageScroll ? "overflow-visible" : "flex-1 overflow-hidden [&>div:last-child]:flex-1"}`}
      >
        {view === "month" && (
          <MonthCalendar {...sharedProps} onDateSelect={handleDateSelect} />
        )}
        {view === "week" && (
          <WeekCalendar {...sharedProps} onDateChange={setDate} />
        )}
        {view === "day" && <DayCalendar {...sharedProps} />}
      </div>
    </section>
  );
}
