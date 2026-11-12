"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  CreditCardIcon,
  IdentificationIcon,
} from "@heroicons/react/20/solid";

import { formatMakerId, normalizeMemberNumber } from "@/utils/memberIdentity";

const summarySurfaceStyle = {
  backgroundColor: "var(--tenant-surface)",
  borderColor: "color-mix(in srgb, var(--tenant-text) 12%, transparent)",
  color: "var(--tenant-text-on-surface)",
};

const mutedTextStyle = {
  color: "var(--tenant-muted-text)",
};

const mutedSurfaceTextStyle = {
  color: "var(--tenant-muted-on-surface)",
};

const writeClipboard = async (value) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
};

function UpcomingVisit({
  copy,
  upcoming,
  status,
  onChooseTime,
  onCancelBooking,
  onOpenBookings,
  canCancelUpcoming = false,
}) {
  const isEmpty = status === "ready" && !upcoming;
  const cancelUpcoming = Boolean(upcoming && canCancelUpcoming);
  const body = (() => {
    if (status === "loading") {
      return (
        <p className="text-[13px]" style={mutedSurfaceTextStyle}>
          {copy.upcomingLoading}
        </p>
      );
    }

    if (status === "error") {
      return (
        <p className="text-[13px]" style={mutedSurfaceTextStyle}>
          {copy.upcomingError}
        </p>
      );
    }

    if (!upcoming) {
      return (
        <div>
          <p className="text-[14px] font-semibold tracking-[-0.02em]">
            {copy.upcomingEmpty}
          </p>
          <p
            className="mt-1 text-[12px] leading-5"
            style={mutedSurfaceTextStyle}
          >
            {copy.upcomingEmptyDescription}
          </p>
        </div>
      );
    }

    return (
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold tracking-[-0.025em]">
          {upcoming.title}
        </p>
        <p className="mt-1 text-[12px] leading-5" style={mutedSurfaceTextStyle}>
          {[upcoming.date, upcoming.time, upcoming.locationName]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    );
  })();

  return (
    <section
      data-customer-portal-upcoming
      data-empty-state={isEmpty ? "true" : undefined}
      aria-labelledby="customer-portal-upcoming-title"
      className="min-w-0 py-0.5"
    >
      <div
        data-customer-portal-upcoming-layout
        className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--tenant-accent) 10%, transparent)",
            color: "var(--tenant-accent-on-surface)",
          }}
        >
          <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            id="customer-portal-upcoming-title"
            className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.22em]"
            data-tenant-type="label"
            style={mutedSurfaceTextStyle}
          >
            {copy.upcoming}
          </p>
          {body}
        </div>
        {status === "ready" ? (
          <button
            type="button"
            onClick={
              upcoming
                ? cancelUpcoming
                  ? onCancelBooking
                  : onOpenBookings
                : onChooseTime
            }
            data-customer-portal-action-priority="booking"
            data-customer-portal-choose-time={!upcoming || undefined}
            data-customer-portal-cancel-booking={cancelUpcoming || undefined}
            data-tenant-button={upcoming ? "text" : "primary"}
            data-tenant-hover="preserve"
            data-tenant-intent={cancelUpcoming ? "danger" : undefined}
            className={`group col-start-2 inline-flex min-h-11 min-w-0 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 text-[11px] font-semibold transition-[transform,filter,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-surface)] motion-reduce:transform-none sm:col-start-3 sm:row-start-1 sm:w-auto sm:shrink-0 ${
              !upcoming
                ? "shadow-[0_10px_24px_color-mix(in_srgb,var(--tenant-portal-button)_24%,transparent)] hover:brightness-[0.97] hover:shadow-[0_14px_30px_color-mix(in_srgb,var(--tenant-portal-button)_28%,transparent)]"
                : "hover:bg-[var(--tenant-background)]"
            }`}
            style={{
              color: !upcoming
                ? "var(--tenant-portal-button-foreground)"
                : cancelUpcoming
                  ? "#A34632"
                  : "var(--tenant-accent-on-surface)",
              borderColor: !upcoming
                ? "var(--tenant-portal-button)"
                : cancelUpcoming
                  ? "#E9BFB5"
                  : "color-mix(in srgb, var(--tenant-accent-on-surface) 24%, transparent)",
              backgroundColor: !upcoming
                ? "var(--tenant-portal-button)"
                : cancelUpcoming
                  ? "#FFF4F0"
                  : "transparent",
              "--tw-ring-color": cancelUpcoming
                ? "#A34632"
                : "var(--tenant-accent-on-surface)",
            }}
          >
            {upcoming
              ? cancelUpcoming
                ? copy.cancelBooking
                : copy.manageBooking
              : copy.chooseTime}
            {!upcoming ? (
              <ArrowRightIcon
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
                aria-hidden="true"
              />
            ) : null}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function AccountStat({
  icon: Icon,
  label,
  value,
  children,
  dataAttribute,
  secondary = false,
  className = "",
}) {
  return (
    <div
      data-customer-portal-account-stat
      data-visual-priority={secondary ? "secondary" : "primary"}
      className={`min-w-0 py-1.5 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-1 sm:gap-3">
        <span
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full sm:flex"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--tenant-secondary) 12%, transparent)",
            color: "var(--tenant-text-on-surface)",
          }}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            data-tenant-type="label"
            className="text-[8px] font-semibold uppercase tracking-[0.2em]"
            style={mutedSurfaceTextStyle}
          >
            {label}
          </p>
          <p
            data-customer-member-id={dataAttribute || undefined}
            className={`mt-0.5 whitespace-normal tabular-nums leading-4 tracking-[-0.02em] [overflow-wrap:anywhere] ${
              secondary
                ? "text-[11px] font-medium text-[var(--tenant-muted-on-surface)]"
                : "text-[13px] font-semibold"
            }`}
            title={String(value)}
            aria-label={String(value)}
          >
            {value}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function MenuHeader({
  name,
  memberNumber,
  creditValue,
  canSeeAdmin = false,
  isAdmin = false,
  copy,
  upcoming = null,
  upcomingStatus = "ready",
  onChooseTime,
  onCancelBooking,
  onOpenBookings,
  canCancelUpcoming = false,
  bookingAccountEnabled = true,
  showCredits = true,
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);
  const numericMemberId = useMemo(
    () => normalizeMemberNumber(memberNumber),
    [memberNumber],
  );
  const memberIdentifier = numericMemberId;
  const memberId = formatMakerId(numericMemberId);

  useEffect(
    () => () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  const copyMemberId = async () => {
    if (!memberIdentifier) return;

    try {
      await writeClipboard(memberIdentifier);
      setCopied(true);
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      data-customer-portal-overview
      aria-labelledby="customer-portal-greeting"
      className="relative z-20 isolate border-b px-4 pb-5 pt-6 sm:px-6 sm:py-6 lg:px-8 lg:py-6 [@media(min-width:1180px)_and_(max-height:800px)]:py-4"
      style={{
        backgroundColor: "var(--tenant-background)",
        borderColor: "color-mix(in srgb, var(--tenant-text) 10%, transparent)",
        color: "var(--tenant-text)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 7% 12%, color-mix(in srgb, var(--tenant-accent) 9%, transparent), transparent 36%), radial-gradient(circle at 91% 10%, color-mix(in srgb, var(--tenant-secondary) 11%, transparent), transparent 40%)",
        }}
      />

      <div className="relative pt-6 sm:pt-0 mx-auto grid max-w-[1480px] gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] md:items-center lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)] lg:gap-7">
        <div className="min-w-0">
          {canSeeAdmin ? (
            <span
              className="mb-2 inline-flex rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em]"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--tenant-text) 16%, transparent)",
              }}
            >
              {isAdmin ? copy.admin : copy.moderator}
            </span>
          ) : null}

          <h1
            id="customer-portal-greeting"
            data-customer-portal-greeting
            data-tenant-type="display"
            className="max-w-4xl text-[clamp(2rem,3.2vw,3rem)] leading-none tracking-[-0.045em] [@media(min-width:1180px)_and_(max-height:800px)]:text-[clamp(2rem,3vw,2.5rem)]"
            style={{
              color: "var(--tenant-heading-color)",
              fontFamily: "var(--tenant-font-display)",
            }}
          >
            {copy.greeting}
            {name ? (
              <>
                ,{" "}
                <span className="break-words [overflow-wrap:anywhere]">
                  {name}
                </span>
              </>
            ) : null}
          </h1>
          <p
            className="mt-2 max-w-2xl text-[13px] leading-5 sm:text-[14px]"
            style={mutedTextStyle}
          >
            {copy.intro}
          </p>
        </div>

        <aside
          data-customer-portal-summary
          data-customer-portal-account-summary
          data-tenant-surface="panel"
          className="min-w-0 rounded-[20px] border px-4 py-3.5 shadow-[0_14px_42px_color-mix(in_srgb,var(--tenant-text)_6%,transparent)] sm:px-5 sm:py-4"
          style={summarySurfaceStyle}
        >
          <div
            data-customer-portal-summary-layout
            className={bookingAccountEnabled ? "grid gap-3" : "grid"}
          >
            {bookingAccountEnabled ? (
              <UpcomingVisit
                copy={copy}
                upcoming={upcoming}
                status={upcomingStatus}
                onChooseTime={onChooseTime}
                onCancelBooking={onCancelBooking}
                onOpenBookings={onOpenBookings}
                canCancelUpcoming={canCancelUpcoming}
              />
            ) : null}

            {bookingAccountEnabled ? (
              <div
                aria-hidden="true"
                data-customer-portal-summary-divider
                className="h-px w-full"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--tenant-text-on-surface) 11%, transparent)",
                }}
              />
            ) : null}

            <div
              className={`grid ${showCredits ? "grid-cols-2 gap-0" : "grid-cols-1"}`}
            >
              <AccountStat
                icon={IdentificationIcon}
                label={copy.member}
                value={memberId}
                dataAttribute="true"
                className={showCredits ? "pr-2 sm:pr-3" : ""}
              >
                <button
                  type="button"
                  data-copy-member-id
                  disabled={!memberIdentifier}
                  onClick={copyMemberId}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--tenant-accent-on-surface)] transition-colors hover:bg-[color-mix(in_srgb,var(--tenant-accent)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    "--tw-ring-color": "var(--tenant-accent-on-surface)",
                  }}
                  aria-label={copied ? copy.copiedMemberId : copy.copyMemberId}
                >
                  {copied ? (
                    <CheckIcon className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ClipboardDocumentIcon
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </AccountStat>

              {showCredits ? (
                <AccountStat
                  icon={CreditCardIcon}
                  label={copy.credits}
                  value={creditValue}
                  className="border-l border-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)] pl-2 sm:pl-3"
                />
              ) : null}
            </div>
          </div>
          <p className="sr-only" aria-live="polite">
            {copied ? copy.copiedMemberId : ""}
          </p>
        </aside>
      </div>
    </section>
  );
}
