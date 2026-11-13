"use client";

import { useLocale, useTranslations } from "next-intl";
import { resolveIntlLocale } from "@/i18n/formatting";

import { WorkspaceTable } from "@/components/dashboard/WorkspaceDataSurface";

import { Dialog } from "@headlessui/react";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDaysIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import {
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
} from "@/lib/features/events/eventsApiSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  getPrimaryLocation,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { useSelector } from "react-redux";
import {
  formatMajorCurrencyAmount,
  getMajorCurrencyInputStep,
} from "@/utils/money";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogBody,
  WorkspaceDialogHeader,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";

const eventTypes = [
  { value: "team_building", label: "Team building" },
  { value: "party", label: "Party" },
  { value: "private_workshop", label: "Private workshop" },
  { value: "school_group", label: "School group" },
  { value: "corporate", label: "Corporate" },
  { value: "popup", label: "Pop-up" },
  { value: "other", label: "Other" },
];

const statuses = [
  { value: "inquiry", label: "Inquiry" },
  { value: "planned", label: "Planned" },
  { value: "confirmed", label: "Confirmed" },
  { value: "deposit_paid", label: "Deposit paid" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// The API stores checklist titles as strings. Recognize its unchanged system
// defaults in the UI while leaving custom, tenant-authored titles intact.
const DEFAULT_CHECKLIST_MESSAGE_KEYS = Object.freeze({
  "Confirm number of guests": "guests",
  "Confirm price": "price",
  "Collect deposit": "deposit",
  "Assign instructor": "instructor",
  "Prepare materials": "materials",
  "Send arrival instructions": "arrival",
});

const createEmptyForm = (locationId = "") => ({
  title: "",
  type: "team_building",
  status: "inquiry",
  locationId,
  externalLocationName: "",
  date: "",
  startTime: "",
  endTime: "",
  customerName: "",
  contactPerson: "",
  email: "",
  phone: "",
  numberOfGuests: "",
  priceEstimate: "",
  finalPrice: "",
  depositPaid: "",
  order: "",
  notes: "",
  internalNotes: "",
});

const getLocationName = (
  location,
  locationsById,
  externalLocationName = "",
  fallback = "",
) => {
  if (location && typeof location === "object") {
    return location.name || externalLocationName || fallback;
  }

  const locationId = String(location || "");

  return (
    locationsById.get(locationId)?.name || externalLocationName || fallback
  );
};

export default function EventsManagementPage() {
  const t = useTranslations("Operations.events");
  const locale = useLocale();
  const activeStudioId = useSelector(selectActiveStudioId);
  const currentTenant = useSelector(selectCurrentTenant);
  const currency =
    currentTenant?.settings?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY;
  const { data: locationsData } = useGetLocationsQuery({ isActive: true });
  const locations = useMemo(
    () => normalizeLocationsResponse(locationsData),
    [locationsData],
  );
  const defaultLocationId = locations.some(
    (location) => location.id === activeStudioId,
  )
    ? activeStudioId
    : getPrimaryLocation(locations)?.id || "";
  const locationsById = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations],
  );

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    type: "",
    locationId: "",
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState(() => createEmptyForm());

  useEffect(() => {
    if (!defaultLocationId) return;

    setFilters((current) => ({
      ...current,
      locationId: defaultLocationId,
    }));
    setForm((current) => ({
      ...current,
      locationId: current.locationId || defaultLocationId,
    }));
  }, [defaultLocationId]);

  const { data, isLoading } = useGetEventsQuery(filters);
  const [createEvent, { isLoading: isCreating }] = useCreateEventMutation();
  const [updateEvent] = useUpdateEventMutation();
  const [deleteEvent] = useDeleteEventMutation();

  const events = useMemo(() => data?.events || [], [data?.events]);

  const metrics = useMemo(() => {
    const upcoming = events.filter((event) => {
      if (!event.date) return false;
      return new Date(event.date) >= new Date();
    });

    const confirmed = events.filter((event) =>
      ["confirmed", "deposit_paid"].includes(event.status),
    );

    const totalValue = events.reduce(
      (sum, event) =>
        sum + Number(event.finalPrice || event.priceEstimate || 0),
      0,
    );

    return {
      upcoming: upcoming.length,
      confirmed: confirmed.length,
      totalValue,
    };
  }, [events]);

  const handleCreate = async (event) => {
    event.preventDefault();

    await createEvent({
      ...form,
      numberOfGuests: Number(form.numberOfGuests || 0),
      priceEstimate: Number(form.priceEstimate || 0),
      finalPrice: Number(form.finalPrice || 0),
      depositPaid: Number(form.depositPaid || 0),
      order: form.order || null,
      checklist: [
        { title: "Confirm number of guests", done: false },
        { title: "Confirm price", done: false },
        { title: "Collect deposit", done: false },
        { title: "Assign instructor", done: false },
        { title: "Prepare materials", done: false },
        { title: "Send arrival instructions", done: false },
      ],
    }).unwrap();

    setForm(createEmptyForm(defaultLocationId));
    setIsCreateOpen(false);
  };

  const handleChecklistToggle = async (eventItem, checklistItem) => {
    const nextChecklist = eventItem.checklist.map((item) =>
      item._id === checklistItem._id ? { ...item, done: !item.done } : item,
    );

    await updateEvent({
      id: eventItem._id,
      checklist: nextChecklist,
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-stone-500" />
              <h2 className="text-lg font-semibold text-stone-900">
                {t("title")}
              </h2>
            </div>
            <p className="mt-1 text-sm text-stone-500">{t("description")}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setForm(createEmptyForm(defaultLocationId));
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            <PlusIcon className="h-4 w-4" />
            {t("create")}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MetricCard label={t("upcoming")} value={metrics.upcoming} />
          <MetricCard label={t("confirmed")} value={metrics.confirmed} />
          <MetricCard
            label={t("estimatedValue")}
            value={formatMajorCurrencyAmount(
              metrics.totalValue,
              currency,
              resolveIntlLocale(locale),
            )}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            placeholder={t("search")}
            className="rounded-2xl border border-stone-200 px-4 py-2 text-sm outline-none focus:border-stone-400"
          />

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            className="rounded-2xl border border-stone-200 px-4 py-2 text-sm outline-none focus:border-stone-400"
          >
            <option value="">{t("allStatuses")}</option>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {t(`statuses.${status.value}`)}
              </option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, type: e.target.value }))
            }
            className="rounded-2xl border border-stone-200 px-4 py-2 text-sm outline-none focus:border-stone-400"
          >
            <option value="">{t("allTypes")}</option>
            {eventTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {t(`types.${type.value}`)}
              </option>
            ))}
          </select>

          <select
            value={filters.locationId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, locationId: e.target.value }))
            }
            className="rounded-2xl border border-stone-200 px-4 py-2 text-sm outline-none focus:border-stone-400"
          >
            <option value="">{t("allLocations")}</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <WorkspaceTable className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-[0.16em] text-stone-500">
              <tr>
                <th className="px-4 py-3">{t("event")}</th>
                <th className="px-4 py-3">{t("date")}</th>
                <th className="px-4 py-3">{t("customer")}</th>
                <th className="px-4 py-3">{t("guests")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("price")}</th>
                <th className="px-4 py-3 text-right">{t("actions")}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-8 text-center text-stone-500"
                  >
                    {t("loading")}
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-8 text-center text-stone-500"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event._id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-medium text-stone-900">
                        {event.title}
                      </div>
                      <div className="text-xs text-stone-500">
                        {formatType(event.type, t)} ·{" "}
                        {getLocationName(
                          event.locationId || event.location,
                          locationsById,
                          event.externalLocationName,
                          t("externalVenue"),
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div>{formatDate(event.date, locale)}</div>
                      <div className="text-xs text-stone-500">
                        {event.startTime}–{event.endTime}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div>{event.customerName || "—"}</div>
                      <div className="text-xs text-stone-500">
                        {event.email || event.phone || ""}
                      </div>
                    </td>

                    <td className="px-4 py-4">{event.numberOfGuests || "—"}</td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                        {formatStatus(event.status, t)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {formatMajorCurrencyAmount(
                        event.finalPrice || event.priceEstimate || 0,
                        event.currency || currency,
                        resolveIntlLocale(locale),
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          aria-label={t("viewDetails")}
                          onClick={() => setSelectedEvent(event)}
                          className="rounded-full border border-stone-200 p-2 text-stone-600 hover:bg-stone-50"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          aria-label={t("delete")}
                          onClick={() => deleteEvent(event._id)}
                          className="rounded-full border border-red-100 p-2 text-red-500 hover:bg-red-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </WorkspaceTable>
        </div>
      </div>

      {isCreateOpen && (
        <EventFormModal
          form={form}
          setForm={setForm}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreate}
          isSubmitting={isCreating}
          locations={locations}
          currency={currency}
        />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onChecklistToggle={handleChecklistToggle}
          locationsById={locationsById}
          currency={currency}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-stone-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-stone-900">{value}</div>
    </div>
  );
}

function EventFormModal({
  form,
  setForm,
  onClose,
  onSubmit,
  isSubmitting,
  locations,
  currency,
}) {
  const t = useTranslations("Operations.events");
  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open onClose={onClose} className="relative z-[100]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="form">
        <WorkspaceDialogPanel layout="form" size="medium">
          <WorkspaceDialogHeader
            title={t("create")}
            description={t("formDescription")}
            closeLabel={t("closeForm")}
            onClose={onClose}
          />
          <WorkspaceDialogBody>
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
              <Input
                label={t("eventTitle")}
                value={form.title}
                onChange={(v) => update("title", v)}
                required
              />

              <Select
                label={t("type")}
                value={form.type}
                onChange={(v) => update("type", v)}
                options={eventTypes.map((item) => ({
                  ...item,
                  label: t(`types.${item.value}`),
                }))}
              />

              <Select
                label={t("status")}
                value={form.status}
                onChange={(v) => update("status", v)}
                options={statuses.map((item) => ({
                  ...item,
                  label: t(`statuses.${item.value}`),
                }))}
              />

              <Select
                label={t("location")}
                value={form.locationId}
                onChange={(v) => update("locationId", v)}
                options={[
                  { value: "", label: t("externalOption") },
                  ...locations.map((location) => ({
                    value: location.id,
                    label: location.name,
                  })),
                ]}
              />

              {!form.locationId && (
                <Input
                  label={t("externalVenue")}
                  value={form.externalLocationName}
                  onChange={(v) => update("externalLocationName", v)}
                  placeholder={t("venuePlaceholder")}
                />
              )}

              <Input
                label={t("date")}
                type="date"
                value={form.date}
                onChange={(v) => update("date", v)}
                required
              />
              <Input
                label={t("startTime")}
                type="time"
                value={form.startTime}
                onChange={(v) => update("startTime", v)}
              />
              <Input
                label={t("endTime")}
                type="time"
                value={form.endTime}
                onChange={(v) => update("endTime", v)}
              />
              <Input
                label={t("guests")}
                type="number"
                value={form.numberOfGuests}
                onChange={(v) => update("numberOfGuests", v)}
              />

              <Input
                label={t("customerName")}
                value={form.customerName}
                onChange={(v) => update("customerName", v)}
              />
              <Input
                label={t("contactPerson")}
                value={form.contactPerson}
                onChange={(v) => update("contactPerson", v)}
              />
              <Input
                label={t("email")}
                value={form.email}
                onChange={(v) => update("email", v)}
              />
              <Input
                label={t("phone")}
                value={form.phone}
                onChange={(v) => update("phone", v)}
              />

              <Input
                label={t("estimatedPrice", { currency })}
                type="number"
                min="0"
                step={getMajorCurrencyInputStep(currency)}
                value={form.priceEstimate}
                onChange={(v) => update("priceEstimate", v)}
              />
              <Input
                label={t("finalPrice", { currency })}
                type="number"
                min="0"
                step={getMajorCurrencyInputStep(currency)}
                value={form.finalPrice}
                onChange={(v) => update("finalPrice", v)}
              />
              <Input
                label={t("depositPaid", { currency })}
                type="number"
                min="0"
                step={getMajorCurrencyInputStep(currency)}
                value={form.depositPaid}
                onChange={(v) => update("depositPaid", v)}
              />

              <Input
                label={t("linkedOrderId")}
                value={form.order}
                onChange={(v) => update("order", v)}
                placeholder={t("orderPlaceholder")}
              />

              <Textarea
                label={t("notes")}
                value={form.notes}
                onChange={(v) => update("notes", v)}
              />
              <Textarea
                label={t("internalNotes")}
                value={form.internalNotes}
                onChange={(v) => update("internalNotes", v)}
              />

              <div className="flex justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-stone-200 px-5 py-2 text-sm"
                >
                  {t("cancel")}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isSubmitting ? t("creating") : t("create")}
                </button>
              </div>
            </form>
          </WorkspaceDialogBody>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}

function EventDetailModal({
  event,
  onClose,
  onChecklistToggle,
  locationsById,
  currency,
}) {
  const t = useTranslations("Operations.events");
  const locale = useLocale();
  return (
    <Dialog open onClose={onClose} className="relative z-[100]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="modal">
        <WorkspaceDialogPanel layout="modal" size="small">
          <WorkspaceDialogHeader
            title={event.title}
            description={`${formatType(event.type, t)} · ${formatDate(event.date, locale)}`}
            closeLabel={t("closeDetails")}
            onClose={onClose}
          />
          <WorkspaceDialogBody>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Detail
                label={t("status")}
                value={formatStatus(event.status, t)}
              />
              <Detail
                label={t("location")}
                value={getLocationName(
                  event.locationId || event.location,
                  locationsById,
                  event.externalLocationName,
                  t("externalVenue"),
                )}
              />
              <Detail
                label={t("time")}
                value={`${event.startTime || "—"}–${event.endTime || "—"}`}
              />
              <Detail label={t("guests")} value={event.numberOfGuests || "—"} />
              <Detail label={t("customer")} value={event.customerName || "—"} />
              <Detail label={t("contact")} value={event.contactPerson || "—"} />
              <Detail label={t("email")} value={event.email || "—"} />
              <Detail label={t("phone")} value={event.phone || "—"} />
              <Detail
                label={t("price")}
                value={formatMajorCurrencyAmount(
                  event.finalPrice || event.priceEstimate || 0,
                  event.currency || currency,
                  resolveIntlLocale(locale),
                )}
              />
              <Detail
                label={t("linkedOrder")}
                value={event.order?._id || event.order || "—"}
              />
            </div>

            <div className="mt-5">
              <h4 className="text-sm font-semibold text-stone-900">
                {t("checklist")}
              </h4>

              <div className="mt-2 space-y-2">
                {(event.checklist || []).map((item) => (
                  <label
                    key={item._id}
                    className="flex items-center gap-3 rounded-2xl bg-stone-50 px-4 py-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => onChecklistToggle(event, item)}
                    />
                    <span
                      className={item.done ? "text-stone-400 line-through" : ""}
                    >
                      {DEFAULT_CHECKLIST_MESSAGE_KEYS[item.title]
                        ? t(
                            `checklistItems.${DEFAULT_CHECKLIST_MESSAGE_KEYS[item.title]}`,
                          )
                        : item.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {event.notes && (
              <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm text-stone-700">
                <div className="mb-1 font-medium text-stone-900">
                  {t("notes")}
                </div>
                {event.notes}
              </div>
            )}

            {event.internalNotes && (
              <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                <div className="mb-1 font-medium">{t("internalNotes")}</div>
                {event.internalNotes}
              </div>
            )}
          </WorkspaceDialogBody>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  ...props
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
        {label}
      </span>
      <input
        {...props}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-stone-200 px-4 py-2 text-sm outline-none focus:border-stone-400"
      />
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label className="block md:col-span-2">
      <span className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
        {label}
      </span>
      <textarea
        value={value}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-stone-200 px-4 py-2 text-sm outline-none focus:border-stone-400"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-stone-200 px-4 py-2 text-sm outline-none focus:border-stone-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-3">
      <div className="text-xs uppercase tracking-[0.14em] text-stone-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-stone-900">{value}</div>
    </div>
  );
}

function formatDate(date, locale) {
  const value = new Date(date);
  if (!date || Number.isNaN(value.getTime())) return "—";
  return value.toLocaleDateString(resolveIntlLocale(locale));
}

function formatType(type, t) {
  return eventTypes.some((item) => item.value === type)
    ? t(`types.${type}`)
    : t("types.other");
}

function formatStatus(status, t) {
  return statuses.some((item) => item.value === status)
    ? t(`statuses.${status}`)
    : t("unknownStatus");
}
