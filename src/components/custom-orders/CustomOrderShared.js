"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { orderStatus } from "./customOrders.utils";

export const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10 disabled:bg-surface-muted disabled:text-ink-muted";
export const primaryClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cobalt-600 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-2 text-sm font-medium text-ink transition hover:border-cobalt-300 disabled:cursor-not-allowed disabled:opacity-50";
export const cardClass =
  "min-w-0 rounded-[24px] border border-line bg-white p-5 shadow-card sm:p-7";

export function OrderField({ label, error, required, children, hint }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-terracotta-600">
            *
          </span>
        ) : null}
      </label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error || hint ? `${id}-help` : undefined,
        "aria-required": required || undefined,
      })}
      {error || hint ? (
        <p
          id={`${id}-help`}
          className={`mt-1.5 text-xs leading-5 ${error ? "text-red-700" : "text-ink-muted"}`}
        >
          {error || hint}
        </p>
      ) : null}
    </div>
  );
}

export function OrderStatus({ item }) {
  const t = useTranslations("CustomOrders");
  const status = orderStatus(item);
  const classes = {
    active: "bg-cobalt-50 text-cobalt-700",
    overdue: "bg-red-50 text-red-700",
    closed: "bg-emerald-50 text-emerald-800",
  };
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes[status]}`}
    >
      {t(`statuses.${status}`)}
    </span>
  );
}

export function OrderFeedback({ error, success }) {
  if (!error && !success) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-2xl border p-4 text-sm leading-6 ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
    >
      {error || success}
    </p>
  );
}

export function OrderLoading({ error, retry }) {
  const t = useTranslations("CustomOrders");
  return (
    <div className={cardClass}>
      <p role={error ? "alert" : "status"} className="text-sm text-ink-muted">
        {t(error ? "errors.load" : "loading")}
      </p>
      {error && retry ? (
        <button
          type="button"
          onClick={retry}
          className={`${secondaryClass} mt-4`}
        >
          {t("retry")}
        </button>
      ) : null}
    </div>
  );
}
