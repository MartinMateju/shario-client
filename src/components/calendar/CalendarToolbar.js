"use client";

import { useEffect, useRef } from "react";
import {
  AdjustmentsHorizontalIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

import { cx } from "./calendar.utils";

export const CALENDAR_VIEWS = ["month", "week", "day"];

// The two-row command bar stays pinned on phones and tablets, but not on
// short landscape screens, where it would leave almost no room for the grid.
const STICKY_COMMAND_BAR_QUERY = "(max-width: 1023px) and (min-height: 501px)";

export function normalizeCalendarViews(availableViews = CALENDAR_VIEWS) {
  if (!Array.isArray(availableViews)) return CALENDAR_VIEWS;

  const normalizedViews = CALENDAR_VIEWS.filter((view) =>
    availableViews.includes(view),
  );

  return normalizedViews.length > 0 ? normalizedViews : CALENDAR_VIEWS;
}

export function resolveCalendarView(
  view,
  availableViews = CALENDAR_VIEWS,
  fallbackView = "week",
) {
  const normalizedViews = normalizeCalendarViews(availableViews);

  if (normalizedViews.includes(view)) return view;
  if (normalizedViews.includes(fallbackView)) return fallbackView;
  return normalizedViews[0];
}

function IconButton({
  label,
  onClick,
  children,
  customerThemed = false,
  grouped = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-tenant-hover={customerThemed ? "preserve" : undefined}
      className={cx(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calendar-accent)]/30",
        grouped
          ? customerThemed
            ? "border-transparent bg-transparent text-[var(--tenant-text-on-surface)] hover:bg-[var(--tenant-surface)]"
            : "border-transparent bg-transparent text-[#252524] hover:bg-white"
          : customerThemed
            ? "border-transparent bg-[color-mix(in_srgb,var(--tenant-surface)_78%,transparent)] text-[var(--tenant-text-on-surface)] hover:bg-[var(--tenant-surface)]"
            : "border-[#E2DFD9] bg-white text-[#252524] hover:border-[#C8C4BC] hover:bg-[#F7F6F2]",
      )}
    >
      {children}
    </button>
  );
}

export default function CalendarToolbar({
  view,
  onViewChange,
  title,
  onPrevious,
  onNext,
  onToday,
  onCreateBooking,
  audience,
  filtersOpen,
  onToggleFilters,
  activeFilterCount = 0,
  filtersId,
  filterTriggerRef,
  t,
  availableViews = CALENDAR_VIEWS,
  readOnly = false,
  pageScroll = false,
}) {
  const customerThemed = ["customer", "public"].includes(audience);
  const stickyCommandBar = customerThemed && pageScroll;
  const commandBarRef = useRef(null);
  const Title = customerThemed ? "h3" : "h1";
  const views = normalizeCalendarViews(availableViews);
  const viewGridClass =
    views.length === 1
      ? "grid-cols-1"
      : views.length === 2
        ? "grid-cols-2"
        : "grid-cols-3";
  const filterDisclosureLabel =
    audience === "customer"
      ? t(filtersOpen ? "filters.closeLegend" : "filters.openLegend")
      : t("filters.filterActivities");

  useEffect(() => {
    const commandBar = commandBarRef.current;
    const calendarShell = commandBar?.closest?.('[data-calendar-shell="true"]');
    if (!commandBar || !calendarShell) return undefined;

    if (!stickyCommandBar) {
      calendarShell.style.removeProperty(
        "--calendar-command-toolbar-sticky-height",
      );
      calendarShell.style.removeProperty(
        "--calendar-command-toolbar-sticky-top",
      );
      return undefined;
    }

    const fixedTenantHeader =
      document.querySelector(
        '[data-customer-portal-header="true"], [data-customer-portal-header]',
      ) || document.querySelector('header[data-tenant-surface="header"]');
    const stickyLayout = window.matchMedia(STICKY_COMMAND_BAR_QUERY);
    const updateStickyMetrics = () => {
      const commandBarHeight = stickyLayout.matches
        ? Math.max(0, Math.round(commandBar.getBoundingClientRect().height))
        : 0;
      const fixedTenantHeaderHeight = Math.max(
        0,
        Math.round(fixedTenantHeader?.getBoundingClientRect?.().height || 0),
      );

      calendarShell.style.setProperty(
        "--calendar-command-toolbar-sticky-height",
        `${commandBarHeight}px`,
      );
      calendarShell.style.setProperty(
        "--calendar-command-toolbar-sticky-top",
        `${fixedTenantHeaderHeight}px`,
      );
    };

    updateStickyMetrics();
    const resizeObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(updateStickyMetrics)
        : null;
    resizeObserver?.observe(commandBar);
    if (fixedTenantHeader) resizeObserver?.observe(fixedTenantHeader);
    window.addEventListener("resize", updateStickyMetrics, { passive: true });
    stickyLayout.addEventListener?.("change", updateStickyMetrics);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateStickyMetrics);
      stickyLayout.removeEventListener?.("change", updateStickyMetrics);
      calendarShell.style.removeProperty(
        "--calendar-command-toolbar-sticky-height",
      );
      calendarShell.style.removeProperty(
        "--calendar-command-toolbar-sticky-top",
      );
    };
  }, [stickyCommandBar]);

  return (
    <div
      ref={commandBarRef}
      data-calendar-command-bar="true"
      role="toolbar"
      aria-label={t("toolbar.viewLabel")}
      className={cx(
        "shrink-0 border-b px-3 py-1.5 backdrop-blur-xl sm:px-4",
        stickyCommandBar &&
          "sticky z-[45] lg:static [@media(max-height:500px)]:static",
        customerThemed
          ? "border-[var(--tenant-border)] bg-[var(--tenant-surface)]"
          : "border-line bg-surface/95",
      )}
      data-calendar-audience={audience}
      style={{
        "--calendar-accent": customerThemed
          ? "var(--tenant-accent-on-surface)"
          : "var(--color-brand-primary)",
        ...(stickyCommandBar
          ? {
              top: "var(--calendar-command-toolbar-sticky-top, var(--header-height, 4.875rem))",
            }
          : {}),
      }}
    >
      <div
        data-calendar-toolbar-layout="responsive"
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 lg:flex lg:flex-nowrap lg:gap-2"
      >
        <div className="order-1 flex min-w-0 flex-[1_1_100px] items-center gap-2 sm:flex-[1_1_180px] lg:order-2 lg:justify-center">
          <CalendarDaysIcon
            className={cx(
              "hidden h-4 w-4 shrink-0 sm:block",
              customerThemed
                ? "text-[var(--tenant-muted-on-surface)]"
                : "text-[#777773]",
            )}
            aria-hidden="true"
          />
          <Title
            aria-live="polite"
            aria-atomic="true"
            className={cx(
              // Phones wrap a long date onto a second line inside the
              // control row; truncating it dropped the day number first.
              "text-[13px] font-semibold tracking-[-0.035em] max-sm:line-clamp-2 max-sm:leading-tight sm:truncate sm:text-[19px]",
              customerThemed
                ? "text-[var(--tenant-text-on-surface)]"
                : "text-[#1F1F1F]",
            )}
          >
            {title}
          </Title>
        </div>

        <div
          data-calendar-period-navigation="true"
          className={cx(
            "order-2 flex shrink-0 items-center gap-0.5 rounded-[12px] border p-0.5 lg:order-1",
            customerThemed
              ? "border-[var(--tenant-border)] bg-transparent"
              : "border-[#DEDBD5] bg-surface-muted",
          )}
        >
          <button
            type="button"
            onClick={onToday}
            data-tenant-hover={customerThemed ? "preserve" : undefined}
            className={cx(
              "min-h-11 min-w-11 shrink-0 rounded-[10px] border border-transparent bg-transparent px-3 text-[12px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calendar-accent)]/30",
              customerThemed
                ? "text-[var(--tenant-text-on-surface)] hover:bg-[var(--tenant-surface)]"
                : "text-[#272726] hover:bg-white",
            )}
          >
            {t("toolbar.today")}
          </button>

          <IconButton
            label={t("toolbar.previous")}
            onClick={onPrevious}
            customerThemed={customerThemed}
            grouped
          >
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          </IconButton>

          <IconButton
            label={t("toolbar.next")}
            onClick={onNext}
            customerThemed={customerThemed}
            grouped
          >
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>

        <div className="order-3 col-span-2 flex min-w-0 flex-[1_1_100%] items-center justify-between gap-2 sm:flex-[0_1_auto] sm:justify-end lg:col-auto lg:ml-auto">
          <div
            role="group"
            aria-label={t("toolbar.viewLabel")}
            data-calendar-mobile-view-control="true"
            className={cx(
              "grid min-w-0 flex-1 rounded-[11px] border p-0.5 sm:flex-none",
              viewGridClass,
              customerThemed
                ? "border-transparent bg-[color-mix(in_srgb,var(--tenant-text-on-surface)_7%,transparent)]"
                : "border-[#DEDBD5] bg-surface-muted",
            )}
          >
            {views.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onViewChange(item)}
                aria-pressed={view === item}
                data-tenant-hover={customerThemed ? "preserve" : undefined}
                className={cx(
                  "min-h-11 min-w-11 rounded-[10px] px-2 text-[11px] font-medium transition sm:min-w-[66px] sm:px-2.5 sm:text-[12px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calendar-accent)]/30",
                  view === item
                    ? customerThemed
                      ? "bg-[var(--tenant-surface)] shadow-[0_3px_10px_rgba(31,31,31,0.07)]"
                      : "bg-white shadow-[0_3px_10px_rgba(31,31,31,0.08)]"
                    : customerThemed
                      ? "text-[var(--tenant-text-on-surface)] hover:bg-[color-mix(in_srgb,var(--tenant-surface)_72%,transparent)]"
                      : "text-[#666663] hover:bg-white/65 hover:text-[#252524]",
                )}
                style={
                  view === item && customerThemed
                    ? { color: "var(--tenant-accent-on-surface)" }
                    : undefined
                }
              >
                {t(`views.${item}`)}
              </button>
            ))}
          </div>

          {!readOnly ? (
            <button
              ref={filterTriggerRef}
              data-calendar-filter-trigger="true"
              type="button"
              onClick={onToggleFilters}
              aria-expanded={filtersOpen}
              aria-controls={filtersId}
              aria-label={filterDisclosureLabel}
              title={filterDisclosureLabel}
              data-tenant-hover={customerThemed ? "preserve" : undefined}
              className={cx(
                "relative flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-[12px] border px-3 text-[12px] font-medium transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calendar-accent)]/30",
                filtersOpen || activeFilterCount > 0
                  ? customerThemed
                    ? "border-transparent bg-[color-mix(in_srgb,var(--tenant-accent)_11%,var(--tenant-surface))]"
                    : "border-skab-cobalt-200 bg-skab-cobalt-50"
                  : customerThemed
                    ? "border-transparent bg-[color-mix(in_srgb,var(--tenant-surface)_78%,transparent)] text-[var(--tenant-muted-on-surface)] hover:bg-[var(--tenant-surface)]"
                    : "border-[#E2DFD9] bg-white text-[#555553] hover:bg-[#F7F6F2]",
              )}
              style={
                customerThemed && (filtersOpen || activeFilterCount > 0)
                  ? { color: "var(--tenant-accent-on-surface)" }
                  : undefined
              }
            >
              <AdjustmentsHorizontalIcon
                className="h-4 w-4"
                aria-hidden="true"
              />
              <span className="hidden xl:inline">{filterDisclosureLabel}</span>
              {activeFilterCount > 0 ? (
                <span
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                  style={
                    audience === "customer"
                      ? {
                          backgroundColor: "var(--tenant-accent)",
                          color: "var(--tenant-accent-foreground)",
                        }
                      : {
                          backgroundColor: "var(--color-brand-primary)",
                          color: "#FFFFFF",
                        }
                  }
                >
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          ) : null}

          {!readOnly && audience === "tenant" && onCreateBooking ? (
            <button
              type="button"
              aria-label={t("toolbar.newBooking")}
              title={t("toolbar.newBooking")}
              data-contextual-guide-target="first-booking-create"
              onClick={onCreateBooking}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-brand-primary px-3 text-[12px] font-semibold text-white shadow-[0_8px_18px_rgb(var(--skab-blue-rgb)/0.18)] transition hover:-translate-y-px hover:bg-skab-cobalt-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 sm:px-4"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">
                {t("toolbar.newBooking")}
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
