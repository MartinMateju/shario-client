"use client";
import MembershipHourBalance from "./MembershipHourBalance";

import { useMemo, useRef, useState } from "react";
import { Dialog } from "@headlessui/react";
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import {
  WorkspaceEmptyState,
  WorkspaceTableFrame,
  WorkspaceToolbar,
} from "@/components/dashboard/WorkspaceDataSurface";
import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogBody,
  WorkspaceDialogHeader,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";
import { useGetInvoiceCustomersQuery } from "@/lib/features/users/usersApiSlice";
import {
  useAdjustMembershipBenefitMutation,
  useAssignMembershipToUserMutation,
  useCancelManagedMembershipMutation,
  useGetUserMembershipByIdQuery,
  useGetUserMembershipsQuery,
} from "@/lib/features/memberships/membershipsApiSlice";
import {
  CANCELLATION_REASONS,
  createIdempotencyKey,
  formatDate,
  formatBenefitBalance,
  formatPlanPrice,
  getBalanceForBenefit,
  getCustomer,
  getCustomerName,
  getEntityId,
  getMembershipBenefits,
  getMembershipName,
  getLocalizedMembershipText,
  getPlanPrices,
  isAdjustableBenefit,
  normalizeMemberships,
  statusTone,
} from "./membership.utils";

const cx = (...classes) => classes.filter(Boolean).join(" ");
const inputClass =
  "min-h-11 w-full rounded-[13px] border border-line bg-white px-3.5 text-[12px] text-[#292925] outline-none focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-500/10";

const normalizeCustomers = (response) => {
  if (Array.isArray(response)) return response;
  for (const key of ["users", "customers", "items", "data"]) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  return [];
};

const customerName = (customer) =>
  customer?.name ||
  [
    customer?.firstName ?? customer?.firstname,
    customer?.lastName ?? customer?.lastname,
  ]
    .filter(Boolean)
    .join(" ") ||
  customer?.email ||
  getEntityId(customer);

export default function MembershipCustomersPanel({
  plans,
  locations,
  canManage,
}) {
  const t = useTranslations("Memberships.owner.customers");
  const commonT = useTranslations("Memberships.common");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const query = useGetUserMembershipsQuery({
    search: search || undefined,
    status: status || undefined,
    page,
    limit: 30,
  });
  const memberships = normalizeMemberships(query.data);
  const totalPages = Number(query.data?.pages ?? query.data?.totalPages ?? 1);

  return (
    <div className="mt-5">
      <WorkspaceToolbar className="flex flex-col gap-3 [&>*+*]:!mt-0 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t("searchLabel")}</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#969691]" />
          <input
            className={`${inputClass} pl-10`}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t("searchPlaceholder")}
          />
        </label>
        <select
          className={`${inputClass} sm:w-44`}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label={t("statusLabel")}
        >
          <option value="">{t("allStatuses")}</option>
          {[
            "pending",
            "active",
            "past_due",
            "paused",
            "cancel_scheduled",
            "cancelled",
            "expired",
          ].map((value) => (
            <option key={value} value={value}>
              {commonT(`statuses.${value}`)}
            </option>
          ))}
        </select>
        {canManage ? (
          <button
            type="button"
            onClick={() => setAssignmentOpen(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#171717] px-5 text-[12px] font-semibold text-white"
          >
            <PlusIcon className="h-4 w-4" /> {t("assign")}
          </button>
        ) : null}
      </WorkspaceToolbar>

      {query.isLoading ? (
        <div
          className="mt-4 flex min-h-64 items-center justify-center rounded-[20px] border border-line bg-white text-[12px] text-[#777773]"
          role="status"
        >
          <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" /> {t("loading")}
        </div>
      ) : query.isError ? (
        <div className="mt-4 flex min-h-64 flex-col items-center justify-center rounded-[20px] border border-danger/20 bg-danger-soft text-center">
          <p className="text-[13px] font-semibold text-danger">
            {t("loadError")}
          </p>
          <button
            type="button"
            onClick={query.refetch}
            className="mt-3 min-h-10 rounded-full bg-[#171717] px-4 py-2 text-[12px] font-semibold text-white"
          >
            {commonT("retry")}
          </button>
        </div>
      ) : memberships.length ? (
        <WorkspaceTableFrame className="mt-4 overflow-hidden">
          <div className="divide-y divide-line">
            {memberships.map((membership) => {
              const id = getEntityId(membership);
              const customer = getCustomer(membership);
              const statusValue = membership.status || "pending";
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedId(id)}
                  className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-[#FAF9F6] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_140px_110px] sm:items-center sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-[#292925]">
                      {getCustomerName(membership) || t("customerFallback")}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-[#777773]">
                      {typeof customer === "object"
                        ? customer?.email
                        : getEntityId(customer)}
                    </p>
                  </div>
                  <p className="truncate text-[12px] font-medium text-[#555553]">
                    {getMembershipName(membership, locale) || t("planFallback")}
                  </p>
                  <span
                    className={cx(
                      "w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold",
                      statusTone(statusValue),
                    )}
                  >
                    {commonT(`statuses.${statusValue}`)}
                  </span>
                  <p className="text-[11px] text-[#777773] sm:text-right">
                    {formatDate(membership.currentPeriodEnd, locale)}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-line bg-[#FAF9F6] px-4 py-3">
            <p className="text-[12px] text-[#777773]">
              {t("pagination", { page, pages: Math.max(totalPages, 1) })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="min-h-10 rounded-full border border-line bg-white px-3 text-[12px] font-semibold disabled:opacity-30"
              >
                {commonT("previous")}
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                className="min-h-10 rounded-full border border-line bg-white px-3 text-[12px] font-semibold disabled:opacity-30"
              >
                {commonT("next")}
              </button>
            </div>
          </div>
        </WorkspaceTableFrame>
      ) : (
        <WorkspaceEmptyState
          className="mt-4 min-h-64"
          icon={PlusIcon}
          title={t("empty.title")}
          description={t("empty.description")}
        />
      )}

      <MembershipDetailDialog
        id={selectedId}
        canManage={canManage}
        onClose={() => setSelectedId("")}
      />
      {assignmentOpen ? (
        <AssignmentDialog
          open
          plans={plans}
          locations={locations}
          onClose={() => setAssignmentOpen(false)}
        />
      ) : null}
    </div>
  );
}

function MembershipDetailDialog({ id, canManage, onClose }) {
  const t = useTranslations("Memberships.owner.customers.detail");
  const benefitT = useTranslations("Memberships.benefits");
  const commonT = useTranslations("Memberships.common");
  const locale = useLocale();
  const query = useGetUserMembershipByIdQuery(id, { skip: !id });
  const membership = query.data?.membership ?? query.data ?? null;
  const benefits = getMembershipBenefits(membership);
  const [adjusting, setAdjusting] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  return (
    <Dialog open={Boolean(id)} onClose={onClose} className="relative z-[95]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="modal">
        <WorkspaceDialogPanel layout="modal" size="small">
          <WorkspaceDialogHeader
            eyebrow={t("eyebrow")}
            title={
              membership
                ? getCustomerName(membership) || t("customerFallback")
                : t("loading")
            }
            closeLabel={commonT("close")}
            onClose={onClose}
          />
          <WorkspaceDialogBody>
            {query.isLoading ? (
              <p className="py-20 text-center text-[12px] text-[#777773]">
                {t("loading")}
              </p>
            ) : query.isError || !membership ? (
              <p className="my-6 rounded-[14px] bg-danger-soft p-4 text-[12px] text-danger">
                {t("loadError")}
              </p>
            ) : (
              <>
                <div className="mt-5 grid gap-3 rounded-[17px] border border-line bg-white p-4 sm:grid-cols-3">
                  <Detail
                    label={t("plan")}
                    value={getMembershipName(membership, locale)}
                  />
                  <Detail
                    label={t("status")}
                    value={commonT(
                      `statuses.${membership.status || "pending"}`,
                    )}
                  />
                  <Detail
                    label={t("renews")}
                    value={formatDate(membership.currentPeriodEnd, locale)}
                  />
                </div>
                <h3 className="mt-6 text-[12px] font-semibold">
                  {t("balances")}
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-[#777773]">
                  {benefits.some(
                    (benefit) =>
                      benefit.unit === "minute" && benefit.memberOnly,
                  )
                    ? benefitT("timeTrackingNotice")
                    : t("trackingNotice")}
                </p>
                <div className="mt-3 space-y-2">
                  {benefits.map((benefit) => {
                    const balance = getBalanceForBenefit(
                      membership,
                      benefit.key,
                    );
                    return (
                      <article
                        key={benefit.key}
                        className="flex flex-col gap-3 rounded-[15px] border border-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-[12px] font-semibold text-[#292925]">
                            {getLocalizedMembershipText(
                              benefit,
                              "label",
                              locale,
                              membership?.planSnapshot?.sourceLanguage ??
                                membership?.planVersion?.sourceLanguage,
                            )}
                          </p>
                          <p className="mt-1 text-[11px] text-[#777773]">
                            {t("available", {
                              value: formatBenefitBalance(
                                benefit,
                                balance?.available ?? benefit.quantity ?? 0,
                                locale,
                              ),
                            })}
                          </p>
                          <MembershipHourBalance
                            benefit={benefit}
                            balance={balance}
                          />
                        </div>
                        {canManage && isAdjustableBenefit(benefit) ? (
                          <button
                            type="button"
                            onClick={() => setAdjusting(benefit)}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-line px-3 text-[12px] font-semibold"
                          >
                            <AdjustmentsHorizontalIcon className="h-4 w-4" />{" "}
                            {t("adjust")}
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                  {!benefits.length ? (
                    <p className="rounded-[15px] border border-dashed border-line bg-white p-5 text-center text-[12px] text-[#777773]">
                      {t("noBenefits")}
                    </p>
                  ) : null}
                </div>
                {canManage &&
                !["cancelled", "expired"].includes(membership.status) ? (
                  <button
                    type="button"
                    onClick={() => setCancelOpen(true)}
                    className="mt-6 min-h-10 rounded-full border border-danger/30 px-4 text-[12px] font-semibold text-danger"
                  >
                    {t("cancel")}
                  </button>
                ) : null}
                {adjusting ? (
                  <AdjustDialog
                    membership={membership}
                    benefit={adjusting}
                    onClose={() => setAdjusting(null)}
                  />
                ) : null}
                {cancelOpen ? (
                  <ManagedCancelDialog
                    membership={membership}
                    open
                    onClose={() => setCancelOpen(false)}
                    onDone={onClose}
                  />
                ) : null}
              </>
            )}
          </WorkspaceDialogBody>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}

function AssignmentDialog({ open, plans, locations, onClose }) {
  const t = useTranslations("Memberships.owner.customers.assignment");
  const locale = useLocale();
  const publishedPlans = plans.filter(
    (plan) =>
      plan.status !== "archived" &&
      (plan.publishedVersion || plan.currentPublishedVersion),
  );
  const [search, setSearch] = useState("");
  const assignmentReasons = [
    "paid_offline",
    "complimentary",
    "migration",
    "manual_correction",
  ];
  const [form, setForm] = useState({
    userId: "",
    planId: "",
    currency: "",
    locationId: "",
    reason: "paid_offline",
    note: "",
  });
  const [error, setError] = useState(false);
  const customersQuery = useGetInvoiceCustomersQuery(
    { search, limit: 30 },
    { skip: !open },
  );
  const customers = normalizeCustomers(customersQuery.data);
  const selectedPlan = publishedPlans.find(
    (plan) => getEntityId(plan) === form.planId,
  );
  const selectedVersion =
    selectedPlan?.publishedVersion || selectedPlan?.currentPublishedVersion;
  const prices = getPlanPrices(selectedVersion);
  const selectedScope = selectedVersion?.locationScope || { type: "all" };
  const allowedLocationIds =
    selectedScope.type === "selected" ? selectedScope.locationIds || [] : [];
  const assignmentLocations =
    selectedScope.type === "selected"
      ? locations.filter((location) =>
          allowedLocationIds.map(String).includes(getEntityId(location)),
        )
      : locations;
  const [assign, assignState] = useAssignMembershipToUserMutation();

  const submit = async (event) => {
    event.preventDefault();
    setError(false);
    try {
      await assign({
        userId: form.userId,
        planId: form.planId,
        planVersionId: getEntityId(selectedVersion),
        currency: form.currency,
        ...(form.locationId ? { locationId: form.locationId } : {}),
        reason: form.reason.trim(),
        note: form.note.trim() || undefined,
        autoRenew: false,
      }).unwrap();
      onClose();
    } catch {
      setError(true);
    }
  };

  return (
    <SimpleDialog
      open={open}
      title={t("title")}
      eyebrow={t("eyebrow")}
      closeLabel={t("close")}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-[10px] font-semibold">
          {t("customer")}
          <input
            className={`${inputClass} mt-1.5`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("customerSearch")}
          />
          <select
            className={`${inputClass} mt-2`}
            required
            value={form.userId}
            onChange={(event) =>
              setForm((current) => ({ ...current, userId: event.target.value }))
            }
          >
            <option value="">{t("chooseCustomer")}</option>
            {customers.map((customer) => (
              <option key={getEntityId(customer)} value={getEntityId(customer)}>
                {customerName(customer)}
                {customer.email ? ` — ${customer.email}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] font-semibold">
          {t("plan")}
          <select
            className={`${inputClass} mt-1.5`}
            required
            value={form.planId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                planId: event.target.value,
                currency: "",
                locationId: "",
              }))
            }
          >
            <option value="">{t("choosePlan")}</option>
            {publishedPlans.map((plan) => (
              <option key={getEntityId(plan)} value={getEntityId(plan)}>
                {(plan.publishedVersion || plan.currentPublishedVersion)?.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] font-semibold">
          {t("price")}
          <select
            className={`${inputClass} mt-1.5`}
            required
            value={form.currency}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                currency: event.target.value,
              }))
            }
            disabled={!selectedPlan}
          >
            <option value="">{t("choosePrice")}</option>
            {prices.map((price) => (
              <option key={price.currency} value={price.currency}>
                {formatPlanPrice(price, locale)}
              </option>
            ))}
          </select>
        </label>
        {selectedScope.type === "selected" ? (
          <label className="block text-[10px] font-semibold">
            {t("location")}
            <select
              className={`${inputClass} mt-1.5`}
              required
              value={form.locationId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  locationId: event.target.value,
                }))
              }
            >
              <option value="">{t("chooseLocation")}</option>
              {assignmentLocations.map((location) => (
                <option
                  key={getEntityId(location)}
                  value={getEntityId(location)}
                >
                  {location.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="rounded-[13px] border border-line bg-white px-3.5 py-3 text-[10px] text-[#686762]">
            {t("allLocations")}
          </p>
        )}
        <label className="block text-[10px] font-semibold">
          {t("reason")}
          <select
            className={`${inputClass} mt-1.5`}
            value={form.reason}
            onChange={(event) =>
              setForm((current) => ({ ...current, reason: event.target.value }))
            }
          >
            {assignmentReasons.map((reason) => (
              <option key={reason} value={reason}>
                {t(`reasons.${reason}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] font-semibold">
          {t("note")}
          <textarea
            className={`${inputClass} mt-1.5 min-h-20 py-3`}
            maxLength={500}
            value={form.note}
            onChange={(event) =>
              setForm((current) => ({ ...current, note: event.target.value }))
            }
          />
        </label>
        {error ? (
          <p
            className="rounded-[13px] bg-danger-soft p-3 text-[12px] text-danger"
            role="alert"
          >
            {t("error")}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={assignState.isLoading}
          className="min-h-11 w-full rounded-full bg-[#171717] px-5 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          {assignState.isLoading ? t("assigning") : t("submit")}
        </button>
      </form>
    </SimpleDialog>
  );
}

function AdjustDialog({ membership, benefit, onClose }) {
  const t = useTranslations("Memberships.owner.customers.adjustment");
  const benefitT = useTranslations("Memberships.benefits");
  const adjustmentReasons = [
    "manual_correction",
    "service_recovery",
    "promotion",
    "migration",
  ];
  const [form, setForm] = useState({
    delta: "",
    reason: "manual_correction",
    note: "",
  });
  const [error, setError] = useState(false);
  const adjustmentIntent = useRef({ signature: "", key: "" });
  const [adjust, state] = useAdjustMembershipBenefitMutation();
  const submit = async (event) => {
    event.preventDefault();
    setError(false);
    const input = {
      id: getEntityId(membership),
      benefitKey: benefit.key,
      delta: Number(form.delta),
      reason: form.reason.trim(),
      note: form.note.trim() || undefined,
    };
    const signature = JSON.stringify(input);

    if (adjustmentIntent.current.signature !== signature) {
      adjustmentIntent.current = {
        signature,
        key: createIdempotencyKey("benefit-adjustment"),
      };
    }

    try {
      await adjust({
        ...input,
        idempotencyKey: adjustmentIntent.current.key,
      }).unwrap();
      adjustmentIntent.current = { signature: "", key: "" };
      onClose();
    } catch {
      setError(true);
    }
  };
  return (
    <SimpleDialog
      open={Boolean(benefit)}
      title={t("title", { benefit: benefit?.label || "" })}
      eyebrow={t("eyebrow")}
      closeLabel={t("close")}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-[12px] leading-5 text-[#777773]">
          {t("description")}
        </p>
        <label className="block text-[10px] font-semibold">
          {benefit.unit === "minute" ? benefitT("adjustMinutes") : t("delta")}
          <input
            className={`${inputClass} mt-1.5`}
            required
            type="number"
            step="1"
            value={form.delta}
            onChange={(event) =>
              setForm((current) => ({ ...current, delta: event.target.value }))
            }
          />
        </label>
        <label className="block text-[10px] font-semibold">
          {t("reason")}
          <select
            className={`${inputClass} mt-1.5`}
            value={form.reason}
            onChange={(event) =>
              setForm((current) => ({ ...current, reason: event.target.value }))
            }
          >
            {adjustmentReasons.map((reason) => (
              <option key={reason} value={reason}>
                {t(`reasons.${reason}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] font-semibold">
          {t("note")}
          <textarea
            className={`${inputClass} mt-1.5 min-h-20 py-3`}
            maxLength={500}
            value={form.note}
            onChange={(event) =>
              setForm((current) => ({ ...current, note: event.target.value }))
            }
          />
        </label>
        {error ? (
          <p className="rounded-[13px] bg-danger-soft p-3 text-[12px] text-danger">
            {t("error")}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={state.isLoading}
          className="min-h-11 w-full rounded-full bg-[#171717] text-[12px] font-semibold text-white disabled:opacity-50"
        >
          {state.isLoading ? t("saving") : t("submit")}
        </button>
      </form>
    </SimpleDialog>
  );
}

function ManagedCancelDialog({ membership, open, onClose, onDone }) {
  const t = useTranslations("Memberships.owner.customers.cancellation");
  const [form, setForm] = useState({
    effective: "period_end",
    reason: "other",
    comment: "",
  });
  const [error, setError] = useState(false);
  const [cancelMembership, state] = useCancelManagedMembershipMutation();
  const submit = async (event) => {
    event.preventDefault();
    setError(false);
    try {
      await cancelMembership({
        id: getEntityId(membership),
        effective: form.effective,
        reason: form.reason,
        comment: form.comment.trim() || undefined,
      }).unwrap();
      onClose();
      onDone();
    } catch {
      setError(true);
    }
  };
  return (
    <SimpleDialog
      open={open}
      title={t("title")}
      eyebrow={t("eyebrow")}
      closeLabel={t("close")}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-[10px] font-semibold">
          {t("effective")}
          <select
            className={`${inputClass} mt-1.5`}
            value={form.effective}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                effective: event.target.value,
              }))
            }
          >
            <option value="period_end">{t("periodEnd")}</option>
            <option value="immediate">{t("immediate")}</option>
          </select>
        </label>
        <label className="block text-[10px] font-semibold">
          {t("reason")}
          <select
            className={`${inputClass} mt-1.5`}
            value={form.reason}
            onChange={(event) =>
              setForm((current) => ({ ...current, reason: event.target.value }))
            }
          >
            {CANCELLATION_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {t(`reasons.${reason}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] font-semibold">
          {t("comment")}
          <textarea
            className={`${inputClass} mt-1.5 min-h-20 py-3`}
            maxLength={1000}
            value={form.comment}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                comment: event.target.value,
              }))
            }
          />
        </label>
        {error ? (
          <p className="rounded-[13px] bg-danger-soft p-3 text-[12px] text-danger">
            {t("error")}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={state.isLoading}
          className="min-h-11 w-full rounded-full bg-danger px-5 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          {state.isLoading ? t("cancelling") : t("submit")}
        </button>
      </form>
    </SimpleDialog>
  );
}

function SimpleDialog({ open, title, eyebrow, closeLabel, onClose, children }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-[100]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="compact">
        <WorkspaceDialogPanel layout="compact" size="compact">
          <WorkspaceDialogHeader
            eyebrow={eyebrow}
            title={title}
            closeLabel={closeLabel}
            onClose={onClose}
          />
          <WorkspaceDialogBody>{children}</WorkspaceDialogBody>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}
function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#969691]">
        {label}
      </p>
      <p className="mt-1.5 text-[12px] font-semibold text-[#292925]">
        {value || "—"}
      </p>
    </div>
  );
}
