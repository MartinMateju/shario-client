"use client";

import { useState } from "react";
import { KeyIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { WorkspaceCard } from "@/components/dashboard/WorkspaceDataSurface";
import {
  useGetDoorAccessAutomationQuery,
  useUpdateDoorAccessAutomationMutation,
} from "@/lib/features/communicationAutomations/communicationAutomationsApiSlice";

export default function DoorAccessEmailAutomation({ canManage }) {
  const t = useTranslations("EmailAutomations.doorAccess");
  const locale = useLocale();
  const query = useGetDoorAccessAutomationQuery(undefined, {
    pollingInterval: 60000,
  });
  const [update, { isLoading: saving }] =
    useUpdateDoorAccessAutomationMutation();
  const [error, setError] = useState("");
  const locations = query.data?.locations || [];
  async function toggle(location, enabled) {
    setError("");
    try {
      await update({ locationId: location.id, enabled }).unwrap();
    } catch (error) {
      setError(error?.data?.message || t("saveError"));
    }
  }
  function date(value, timezone) {
    return value
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: timezone || "UTC",
        }).format(new Date(value))
      : "—";
  }
  return (
    <WorkspaceCard
      as="section"
      className="p-5 sm:p-6"
      aria-labelledby="door-access-email-title"
    >
      <div className="flex flex-wrap items-start gap-4">
        <span className="rounded-2xl bg-primary/10 p-3 text-primary">
          <KeyIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="door-access-email-title" className="text-lg font-semibold">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">{t("description")}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
          {t("timing")}
        </span>
      </div>
      <p className="mt-4 text-sm text-text-secondary">{t("details")}</p>
      {query.isLoading ? (
        <p className="mt-4" role="status">
          {t("loading")}
        </p>
      ) : query.isError ? (
        <div className="mt-4" role="alert">
          {t("loadError")}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => query.refetch()}
          >
            {t("refresh")}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 divide-y divide-border rounded-2xl border border-border">
            {locations.length === 0 ? (
              <p className="p-4">{t("noLocations")}</p>
            ) : (
              locations.map((location) => (
                <div
                  key={location.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{location.name}</h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {t("codes", { count: location.availableCodes })}
                    </p>
                    <p
                      className={`mt-1 text-sm ${location.blockedReason ? "text-warning" : "text-text-secondary"}`}
                    >
                      {location.blockedReason
                        ? t(`blocked.${location.blockedReason}`)
                        : location.enabled
                          ? t("enabled", { minutes: location.minutesBefore })
                          : t("disabled")}
                    </p>
                    <Link
                      className="mt-2 inline-block text-sm text-primary underline"
                      href={
                        location.blockedReason === "plan" ||
                        location.blockedReason === "subscription"
                          ? "/app/settings/billing"
                          : location.blockedReason === "module"
                            ? "/app/settings/modules"
                            : `/app/settings/access-codes?location=${location.id}`
                      }
                    >
                      {t("setup")}
                    </Link>
                  </div>
                  <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-border text-primary"
                      aria-label={t("toggle", { location: location.name })}
                      checked={location.enabled}
                      disabled={
                        !canManage ||
                        saving ||
                        (!location.enabled && Boolean(location.blockedReason))
                      }
                      onChange={(event) =>
                        toggle(location, event.target.checked)
                      }
                    />
                    {t("automatic")}
                  </label>
                </div>
              ))
            )}
          </div>
          <details className="mt-5">
            <summary className="cursor-pointer font-semibold">
              {t("history")}
            </summary>
            <p className="mt-2 text-sm text-text-secondary">
              {t("deliveryNote")}
            </p>
            <ul className="mt-3 divide-y divide-border">
              {(query.data?.deliveries || []).map((delivery) => {
                const location = locations.find(
                  (item) => item.id === delivery.locationId,
                );
                const status =
                  delivery.providerDeliveryStatus || delivery.status;
                return (
                  <li key={delivery.id} className="py-3 text-sm">
                    <strong>{location?.name}</strong> ·{" "}
                    {t("bookingAt", {
                      date: date(delivery.bookingStart, location?.timezone),
                    })}
                    <br />
                    {t(
                      `statuses.${["delivered", "bounced", "complained", "sent", "failed", "delivery_unknown", "cancelled", "pending", "processing"].includes(status) ? status : "pending"}`,
                    )}
                    {delivery.providerStatusAt || delivery.sentAt
                      ? ` · ${date(delivery.providerStatusAt || delivery.sentAt, location?.timezone)}`
                      : ""}
                  </li>
                );
              })}
            </ul>
            {!query.data?.deliveries?.length ? (
              <p className="mt-3 text-sm">{t("emptyHistory")}</p>
            ) : null}
          </details>
        </>
      )}
      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </WorkspaceCard>
  );
}
