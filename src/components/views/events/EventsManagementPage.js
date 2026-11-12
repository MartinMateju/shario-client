"use client";

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
) => {
  if (location && typeof location === "object") {
    return location.name || externalLocationName || "External venue";
  }

  const locationId = String(location || "");

  return (
    locationsById.get(locationId)?.name ||
    externalLocationName ||
    "External venue"
  );
};

export default function EventsManagementPage() {
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
              <h2 className="text-lg font-semibold text-stone-900">Events</h2>
            </div>
            <p className="mt-1 text-sm text-stone-500">
              Track team buildings, private parties, corporate events and
              special studio activities.
            </p>
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
            Create event
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MetricCard label="Upcoming events" value={metrics.upcoming} />
          <MetricCard label="Confirmed" value={metrics.confirmed} />
          <MetricCard
            label="Estimated value"
            value={formatMajorCurrencyAmount(
              metrics.totalValue,
              currency,
              "cs-CZ",
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
            placeholder="Search event, customer, email..."
            className="rounded-2xl border border-stone-200 px-4 py-2 text-sm outline-none focus:border-stone-400"
          />

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            className="rounded-2xl border border-stone-200 px-4 py-2 text-sm outline-none focus:border-stone-400"
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
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
            <option value="">All types</option>
            {eventTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
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
            <option value="">All locations</option>
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
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Guests</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-8 text-center text-stone-500"
                  >
                    Loading events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-8 text-center text-stone-500"
                  >
                    No events found.
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
                        {formatType(event.type)} ·{" "}
                        {getLocationName(
                          event.locationId || event.location,
                          locationsById,
                          event.externalLocationName,
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div>{formatDate(event.date)}</div>
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
                        {formatStatus(event.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {formatMajorCurrencyAmount(
                        event.finalPrice || event.priceEstimate || 0,
                        event.currency || currency,
                        "cs-CZ",
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(event)}
                          className="rounded-full border border-stone-200 p-2 text-stone-600 hover:bg-stone-50"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
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
  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open onClose={onClose} className="relative z-[100]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="form">
        <WorkspaceDialogPanel layout="form" size="medium">
          <WorkspaceDialogHeader
            title="Create event"
            description="Register a team building, party or private studio event."
            closeLabel="Close event form"
            onClose={onClose}
          />
          <WorkspaceDialogBody>
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
              <Input
                label="Title"
                value={form.title}
                onChange={(v) => update("title", v)}
                required
              />

              <Select
                label="Type"
                value={form.type}
                onChange={(v) => update("type", v)}
                options={eventTypes}
              />

              <Select
                label="Status"
                value={form.status}
                onChange={(v) => update("status", v)}
                options={statuses}
              />

              <Select
                label="Location"
                value={form.locationId}
                onChange={(v) => update("locationId", v)}
                options={[
                  { value: "", label: "External venue / no studio" },
                  ...locations.map((location) => ({
                    value: location.id,
                    label: location.name,
                  })),
                ]}
              />

              {!form.locationId && (
                <Input
                  label="External venue"
                  value={form.externalLocationName}
                  onChange={(v) => update("externalLocationName", v)}
                  placeholder="Venue name or address"
                />
              )}

              <Input
                label="Date"
                type="date"
                value={form.date}
                onChange={(v) => update("date", v)}
                required
              />
              <Input
                label="Start time"
                type="time"
                value={form.startTime}
                onChange={(v) => update("startTime", v)}
              />
              <Input
                label="End time"
                type="time"
                value={form.endTime}
                onChange={(v) => update("endTime", v)}
              />
              <Input
                label="Guests"
                type="number"
                value={form.numberOfGuests}
                onChange={(v) => update("numberOfGuests", v)}
              />

              <Input
                label="Customer name"
                value={form.customerName}
                onChange={(v) => update("customerName", v)}
              />
              <Input
                label="Contact person"
                value={form.contactPerson}
                onChange={(v) => update("contactPerson", v)}
              />
              <Input
                label="Email"
                value={form.email}
                onChange={(v) => update("email", v)}
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(v) => update("phone", v)}
              />

              <Input
                label={`Estimated price (${currency})`}
                type="number"
                min="0"
                step={getMajorCurrencyInputStep(currency)}
                value={form.priceEstimate}
                onChange={(v) => update("priceEstimate", v)}
              />
              <Input
                label={`Final price (${currency})`}
                type="number"
                min="0"
                step={getMajorCurrencyInputStep(currency)}
                value={form.finalPrice}
                onChange={(v) => update("finalPrice", v)}
              />
              <Input
                label={`Deposit paid (${currency})`}
                type="number"
                min="0"
                step={getMajorCurrencyInputStep(currency)}
                value={form.depositPaid}
                onChange={(v) => update("depositPaid", v)}
              />

              <Input
                label="Linked order ID"
                value={form.order}
                onChange={(v) => update("order", v)}
                placeholder="Optional MongoDB order ID"
              />

              <Textarea
                label="Notes"
                value={form.notes}
                onChange={(v) => update("notes", v)}
              />
              <Textarea
                label="Internal notes"
                value={form.internalNotes}
                onChange={(v) => update("internalNotes", v)}
              />

              <div className="flex justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-stone-200 px-5 py-2 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isSubmitting ? "Creating..." : "Create event"}
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
  return (
    <Dialog open onClose={onClose} className="relative z-[100]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="modal">
        <WorkspaceDialogPanel layout="modal" size="small">
          <WorkspaceDialogHeader
            title={event.title}
            description={`${formatType(event.type)} · ${formatDate(event.date)}`}
            closeLabel="Close event details"
            onClose={onClose}
          />
          <WorkspaceDialogBody>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Detail label="Status" value={formatStatus(event.status)} />
              <Detail
                label="Location"
                value={getLocationName(
                  event.locationId || event.location,
                  locationsById,
                  event.externalLocationName,
                )}
              />
              <Detail
                label="Time"
                value={`${event.startTime || "—"}–${event.endTime || "—"}`}
              />
              <Detail label="Guests" value={event.numberOfGuests || "—"} />
              <Detail label="Customer" value={event.customerName || "—"} />
              <Detail label="Contact" value={event.contactPerson || "—"} />
              <Detail label="Email" value={event.email || "—"} />
              <Detail label="Phone" value={event.phone || "—"} />
              <Detail
                label="Price"
                value={formatMajorCurrencyAmount(
                  event.finalPrice || event.priceEstimate || 0,
                  event.currency || currency,
                  "cs-CZ",
                )}
              />
              <Detail
                label="Linked order"
                value={event.order?._id || event.order || "—"}
              />
            </div>

            <div className="mt-5">
              <h4 className="text-sm font-semibold text-stone-900">
                Checklist
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
                      {item.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {event.notes && (
              <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm text-stone-700">
                <div className="mb-1 font-medium text-stone-900">Notes</div>
                {event.notes}
              </div>
            )}

            {event.internalNotes && (
              <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                <div className="mb-1 font-medium">Internal notes</div>
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

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("cs-CZ");
}

function formatType(type) {
  return eventTypes.find((item) => item.value === type)?.label || type;
}

function formatStatus(status) {
  return statuses.find((item) => item.value === status)?.label || status;
}
