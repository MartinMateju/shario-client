"use client";

import { WorkspaceTable } from "@/components/dashboard/WorkspaceDataSurface";

import { useMemo, useState } from "react";
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import {
  useGetStudioOrdersQuery,
  useCreateStudioOrderMutation,
  useUpdateStudioOrderMutation,
  useDeleteStudioOrderMutation,
} from "@/lib/features/studioOrders/studioOrdersApiSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  getLocationId,
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

const statuses = [
  { value: "new", label: "Nová" },
  { value: "priced", label: "Naceněno" },
  { value: "approved", label: "Schváleno" },
  { value: "in_progress", label: "Ve výrobě" },
  { value: "ready", label: "Hotovo" },
  { value: "picked_up", label: "Předáno" },
  { value: "cancelled", label: "Zrušeno" },
];

const priorities = [
  { value: "low", label: "Nízká" },
  { value: "normal", label: "Normální" },
  { value: "high", label: "Vysoká" },
  { value: "urgent", label: "Urgentní" },
];

const getEmptyForm = (locationId = "") => ({
  title: "",
  locationId,
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  deadline: "",
  status: "new",
  priority: "normal",
  price: "",
  depositPaid: "",
  units: "1",
  unitLabel: "ks",
  publicNote: "",
  internalNote: "",
});

export default function StudioOrdersManagementPage() {
  const activeLocationId = useSelector(selectActiveStudioId) || "";
  const currentTenant = useSelector(selectCurrentTenant);
  const currency =
    currentTenant?.settings?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [form, setForm] = useState(() => getEmptyForm(activeLocationId));

  const { data: locationsData } = useGetLocationsQuery({
    isActive: true,
    limit: 100,
  });
  const locations = useMemo(
    () => normalizeLocationsResponse(locationsData),
    [locationsData],
  );

  const { data, isLoading } = useGetStudioOrdersQuery({
    search,
    status,
    locationId: activeLocationId || undefined,
    limit: 100,
  });

  const [createStudioOrder, { isLoading: isCreating }] =
    useCreateStudioOrderMutation();

  const [updateStudioOrder, { isLoading: isUpdating }] =
    useUpdateStudioOrderMutation();

  const [deleteStudioOrder] = useDeleteStudioOrderMutation();

  const orders = useMemo(() => data?.orders || [], [data?.orders]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      active: orders.filter(
        (order) => !["picked_up", "cancelled"].includes(order.status),
      ).length,
      overdue: orders.filter((order) => {
        if (!order.deadline) return false;
        return (
          new Date(order.deadline) < new Date() &&
          !["picked_up", "cancelled"].includes(order.status)
        );
      }).length,
      revenue: orders.reduce((sum, order) => sum + Number(order.price || 0), 0),
    };
  }, [orders]);

  const openCreateModal = () => {
    setEditingOrder(null);
    setForm(getEmptyForm(activeLocationId));
    setIsModalOpen(true);
  };

  const openEditModal = (order) => {
    setEditingOrder(order);
    setForm({
      title: order.title || "",
      locationId:
        getLocationId(order.location) ||
        (typeof order.location === "string" ? order.location : ""),
      customerName: order.customerName || "",
      customerEmail: order.customerEmail || "",
      customerPhone: order.customerPhone || "",
      deadline: order.deadline ? order.deadline.slice(0, 10) : "",
      status: order.status || "new",
      priority: order.priority || "normal",
      price: String(order.price ?? ""),
      depositPaid: String(order.depositPaid ?? ""),
      units: String(order.units ?? "1"),
      unitLabel: order.unitLabel || "ks",
      publicNote: order.publicNote || "",
      internalNote: order.internalNote || "",
    });
    setIsModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...form,
      price: Number(form.price || 0),
      depositPaid: Number(form.depositPaid || 0),
      units: Number(form.units || 1),
      deadline: form.deadline || null,
    };

    if (editingOrder?._id) {
      await updateStudioOrder({
        id: editingOrder._id,
        ...payload,
      }).unwrap();
    } else {
      await createStudioOrder(payload).unwrap();
    }

    setIsModalOpen(false);
    setEditingOrder(null);
    setForm(getEmptyForm(activeLocationId));
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Opravdu chcete odstranit tuto zakázku?");
    if (!confirmed) return;

    await deleteStudioOrder(id).unwrap();
  };

  const getStatusLabel = (value) =>
    statuses.find((item) => item.value === value)?.label || value;

  const getPriorityLabel = (value) =>
    priorities.find((item) => item.value === value)?.label || value;

  return (
    <div className="space-y-6 bg-[#F7F5F2] p-4 sm:p-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
              <ClipboardDocumentListIcon className="h-5 w-5" />
            </span>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-black/40">
                Management
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-black">
                Zakázky
              </h1>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm text-black/50">
            Evidence individuálních zakázek, firemních objednávek, výrobků na
            míru a interních úkolů navázaných na zákazníka.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-black/80"
        >
          <PlusIcon className="h-4 w-4" />
          Nová zakázka
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Celkem zakázek" value={stats.total} />
        <MetricCard label="Aktivní" value={stats.active} />
        <MetricCard label="Po termínu" value={stats.overdue} />
        <MetricCard
          label="Hodnota"
          value={formatMajorCurrencyAmount(stats.revenue, currency, "cs-CZ")}
        />
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Hledat podle názvu, zákazníka, e-mailu..."
            className="min-h-[44px] flex-1 rounded-2xl border border-black/10 px-4 text-sm outline-none focus:border-black/30"
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="min-h-[44px] rounded-2xl border border-black/10 px-4 text-sm outline-none focus:border-black/30"
          >
            <option value="all">Všechny stavy</option>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <WorkspaceTable className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs uppercase tracking-[0.16em] text-black/40">
                <th className="px-3 py-3">Zakázka</th>
                <th className="px-3 py-3">Zákazník</th>
                <th className="px-3 py-3">Pobočka</th>
                <th className="px-3 py-3">Deadline</th>
                <th className="px-3 py-3">Stav</th>
                <th className="px-3 py-3">Priorita</th>
                <th className="px-3 py-3">Cena</th>
                <th className="px-3 py-3 text-right">Akce</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-3 py-8 text-center text-black/40"
                  >
                    Načítám zakázky...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-3 py-8 text-center text-black/40"
                  >
                    Zatím zde nejsou žádné zakázky.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="border-b border-black/5">
                    <td className="px-3 py-4">
                      <p className="font-medium text-black">{order.title}</p>
                      <p className="text-xs text-black/40">
                        {order.units} {order.unitLabel}
                      </p>
                    </td>

                    <td className="px-3 py-4">
                      <p className="text-black">{order.customerName}</p>
                      <p className="text-xs text-black/40">
                        {order.customerEmail || order.customerPhone || "—"}
                      </p>
                    </td>

                    <td className="px-3 py-4 text-black/60">
                      {order.location?.name || "—"}
                    </td>

                    <td className="px-3 py-4 text-black/60">
                      {order.deadline
                        ? new Date(order.deadline).toLocaleDateString("cs-CZ")
                        : "—"}
                    </td>

                    <td className="px-3 py-4">
                      <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/70">
                        {getStatusLabel(order.status)}
                      </span>
                    </td>

                    <td className="px-3 py-4">
                      <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/70">
                        {getPriorityLabel(order.priority)}
                      </span>
                    </td>

                    <td className="px-3 py-4 font-medium text-black">
                      {formatMajorCurrencyAmount(
                        order.price || 0,
                        order.currency || currency,
                        "cs-CZ",
                      )}
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(order)}
                          className="rounded-full border border-black/10 p-2 hover:bg-black hover:text-white"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(order._id)}
                          className="rounded-full border border-black/10 p-2 hover:bg-red-600 hover:text-white"
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Zakázky
                </p>
                <h2 className="text-xl font-semibold">
                  {editingOrder ? "Upravit zakázku" : "Nová zakázka"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full bg-black/5 px-3 py-1 text-sm"
              >
                Zavřít
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Název zakázky"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
              />
              <Input
                label="Zákazník"
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                required
              />
              <Select
                label="Pobočka"
                name="locationId"
                value={form.locationId}
                onChange={handleChange}
                options={[
                  { value: "", label: "Bez konkrétní pobočky" },
                  ...locations.map((location) => ({
                    value: getLocationId(location),
                    label: location.name,
                  })),
                ]}
              />
              <Input
                label="E-mail"
                name="customerEmail"
                value={form.customerEmail}
                onChange={handleChange}
              />
              <Input
                label="Telefon"
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleChange}
              />
              <Input
                label="Deadline"
                name="deadline"
                type="date"
                value={form.deadline}
                onChange={handleChange}
              />

              <Select
                label="Stav"
                name="status"
                value={form.status}
                onChange={handleChange}
                options={statuses}
              />
              <Select
                label="Priorita"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                options={priorities}
              />

              <Input
                label={`Cena (${currency})`}
                name="price"
                type="number"
                min="0"
                step={getMajorCurrencyInputStep(currency)}
                value={form.price}
                onChange={handleChange}
              />
              <Input
                label={`Zaplacená záloha (${currency})`}
                name="depositPaid"
                type="number"
                min="0"
                step={getMajorCurrencyInputStep(currency)}
                value={form.depositPaid}
                onChange={handleChange}
              />
              <Input
                label="Počet jednotek"
                name="units"
                type="number"
                min="1"
                step="1"
                value={form.units}
                onChange={handleChange}
              />
              <Input
                label="Jednotka"
                name="unitLabel"
                value={form.unitLabel}
                onChange={handleChange}
              />

              <Textarea
                label="Poznámka pro zákazníka"
                name="publicNote"
                value={form.publicNote}
                onChange={handleChange}
              />
              <Textarea
                label="Interní poznámka"
                name="internalNote"
                value={form.internalNote}
                onChange={handleChange}
              />

              <div className="sm:col-span-2 flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-black/10 px-5 py-3 text-sm"
                >
                  Zrušit
                </button>

                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="rounded-full bg-black px-5 py-3 text-sm text-white disabled:opacity-50"
                >
                  {editingOrder ? "Uložit změny" : "Vytvořit zakázku"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-black/40">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-black">{value}</p>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-xs uppercase tracking-[0.14em] text-black/40">
        {label}
      </span>
      <input
        {...props}
        className="min-h-[44px] w-full rounded-2xl border border-black/10 px-4 text-sm outline-none focus:border-black/30"
      />
    </label>
  );
}

function Select({ label, options, ...props }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-xs uppercase tracking-[0.14em] text-black/40">
        {label}
      </span>
      <select
        {...props}
        className="min-h-[44px] w-full rounded-2xl border border-black/10 px-4 text-sm outline-none focus:border-black/30"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ label, ...props }) {
  return (
    <label className="space-y-1 text-sm sm:col-span-2">
      <span className="text-xs uppercase tracking-[0.14em] text-black/40">
        {label}
      </span>
      <textarea
        {...props}
        rows={4}
        className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
      />
    </label>
  );
}
