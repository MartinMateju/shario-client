"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogTitle } from "@headlessui/react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLocale } from "next-intl";
import { useSelector } from "react-redux";

import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";
import {
  WorkspaceFormActions,
  WorkspaceFormSection,
  workspaceInputClass,
  workspaceLabelClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
  workspaceTextareaClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  useAssignMembershipToUserMutation,
  useCancelManagedMembershipMutation,
  useGetAllMembershipPlansQuery,
} from "@/lib/features/memberships/membershipsApiSlice";
import {
  useAdminGrantCreditsMutation,
  useGetCreditBalanceQuery,
} from "@/lib/features/credits/creditsApiSlice";
import { useAddNewUserMutation } from "@/lib/features/users/usersApiSlice";
import { useMobileDialogViewport } from "@/hooks/useMobileDialogViewport";

import {
  buildCreateCustomerPayload,
  buildCreditGrantPayload,
  buildMembershipAssignmentPayload,
  createIdempotencyKey,
  formatCustomerCurrency,
  getApiErrorMessage,
  getCustomerName,
  getEntityId,
  getPlanLocationIds,
  getPlanName,
  getPlanPrices,
  getPublishedPlanVersion,
  normalizeLocations,
  normalizePlans,
} from "./customers.utils";

const EMPTY_CUSTOMER = Object.freeze({
  firstname: "",
  lastname: "",
  email: "",
  phone: "",
  password: "",
});

const EMPTY_MEMBERSHIP = Object.freeze({
  planId: "",
  currency: "",
  locationId: "",
  reason: "paid_offline",
  note: "",
});

const membershipReasons = [
  "paid_offline",
  "complimentary",
  "migration",
  "manual_correction",
];

const cancellationReasons = [
  "too_expensive",
  "not_using",
  "missing_features",
  "moving",
  "temporary",
  "other",
];

function ActionDialog({
  open,
  title,
  description,
  closeLabel,
  busy = false,
  size = "medium",
  onClose,
  children,
}) {
  const viewport = useMobileDialogViewport(open);
  const close = () => {
    if (!busy) onClose();
  };

  return (
    <Dialog open={open} onClose={close} className="relative z-[110]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport
        scrollportStyle={
          viewport
            ? { top: viewport.top, height: viewport.height, bottom: "auto" }
            : undefined
        }
      >
        <WorkspaceDialogPanel
          size={size}
          style={
            viewport
              ? {
                  height: viewport.height,
                  minHeight: viewport.height,
                  maxHeight: viewport.height,
                }
              : undefined
          }
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-white px-4 py-4 sm:px-7 sm:py-5">
            <div className="min-w-0">
              <DialogTitle className="text-[19px] font-semibold tracking-[-0.03em] text-ink sm:text-[22px]">
                {title}
              </DialogTitle>
              {description ? (
                <p className="mt-1 max-w-2xl text-[12px] leading-5 text-ink-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={close}
              disabled={busy}
              aria-label={closeLabel}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-muted transition hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 disabled:opacity-45"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>
          {children}
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}

function RequestError({ message }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-[14px] border border-danger/20 bg-danger-soft px-4 py-3 text-[12px] leading-5 text-danger"
    >
      {message}
    </p>
  );
}

function SavingLabel({ saving, idle, pending }) {
  return (
    <>
      {saving ? (
        <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {saving ? pending : idle}
    </>
  );
}

function FormField({ label, children, hint }) {
  return (
    <label className={workspaceLabelClass}>
      {label}
      {children}
      {hint ? (
        <span className="mt-1.5 block text-[11px] font-normal leading-5 text-ink-muted">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function CreateCustomerDialog({ open, onClose, onCreated, t }) {
  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const [error, setError] = useState("");
  const [createCustomer, createState] = useAddNewUserMutation();

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const payload = buildCreateCustomerPayload(form);
    if (
      !payload.firstname ||
      !payload.lastname ||
      !payload.email ||
      payload.password.length < 8
    ) {
      setError(t("create.validation"));
      return;
    }

    try {
      const result = await createCustomer(payload).unwrap();
      onCreated(result);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          requestError?.status === 409
            ? t("create.duplicate")
            : t("create.error"),
        ),
      );
    }
  };

  return (
    <ActionDialog
      open={open}
      title={t("create.title")}
      description={t("create.description")}
      closeLabel={t("dialog.close")}
      busy={createState.isLoading}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
          <WorkspaceFormSection
            title={t("create.contactTitle")}
            description={t("create.contactDescription")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t("create.firstname")}>
                <input
                  autoFocus
                  required
                  autoComplete="given-name"
                  value={form.firstname}
                  onChange={update("firstname")}
                  className={workspaceInputClass}
                />
              </FormField>
              <FormField label={t("create.lastname")}>
                <input
                  required
                  autoComplete="family-name"
                  value={form.lastname}
                  onChange={update("lastname")}
                  className={workspaceInputClass}
                />
              </FormField>
              <FormField label={t("create.email")}>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={update("email")}
                  className={workspaceInputClass}
                />
              </FormField>
              <FormField label={t("create.phone")}>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={update("phone")}
                  className={workspaceInputClass}
                />
              </FormField>
            </div>
          </WorkspaceFormSection>

          <WorkspaceFormSection
            className="mt-4"
            title={t("create.accessTitle")}
            description={t("create.accessDescription")}
          >
            <div className="grid gap-4">
              <FormField
                label={t("create.password")}
                hint={t("create.passwordHint")}
              >
                <input
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={update("password")}
                  className={workspaceInputClass}
                />
              </FormField>
            </div>
          </WorkspaceFormSection>
          <div className="mt-4">
            <RequestError message={error} />
          </div>
        </div>
        <WorkspaceFormActions>
          <button
            type="button"
            onClick={onClose}
            disabled={createState.isLoading}
            className={workspaceSecondaryButtonClass}
          >
            {t("dialog.cancel")}
          </button>
          <button
            type="submit"
            disabled={createState.isLoading}
            className={workspacePrimaryButtonClass}
          >
            <SavingLabel
              saving={createState.isLoading}
              idle={t("create.submit")}
              pending={t("create.saving")}
            />
          </button>
        </WorkspaceFormActions>
      </form>
    </ActionDialog>
  );
}

export function GrantCreditsDialog({ open, customer, onClose, onGranted, t }) {
  const locale = useLocale();
  const tenant = useSelector(selectCurrentTenant);
  const customerId = getEntityId(customer);
  const balanceQuery = useGetCreditBalanceQuery(customerId, {
    skip: !open || !customerId,
  });
  const [form, setForm] = useState({ amount: "", reason: "" });
  const [error, setError] = useState("");
  const [idempotencyKey] = useState(() => createIdempotencyKey("credit-grant"));
  const [grantCredits, grantState] = useAdminGrantCreditsMutation();
  const currency =
    balanceQuery.data?.currency ||
    tenant?.settings?.currency ||
    DEFAULT_STUDIO_COMMERCE_CURRENCY;
  const currentBalance = Number(
    balanceQuery.data?.balance ??
      customer?.moneyCredits ??
      customer?.creditBalance ??
      0,
  );
  const amount = Number(form.amount || 0);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (
      !customerId ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !form.reason.trim()
    ) {
      setError(t("creditsDialog.validation"));
      return;
    }

    try {
      const result = await grantCredits(
        buildCreditGrantPayload({
          customer,
          amount,
          reason: form.reason,
          idempotencyKey,
        }),
      ).unwrap();
      onGranted(result);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("creditsDialog.error")));
    }
  };

  return (
    <ActionDialog
      open={open}
      title={t("creditsDialog.title")}
      description={t("creditsDialog.description", {
        name: getCustomerName(customer),
      })}
      closeLabel={t("dialog.close")}
      busy={grantState.isLoading}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
          <WorkspaceFormSection>
            <div className="grid gap-3 rounded-[16px] bg-sand-50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {t("creditsDialog.currentBalance")}
                </p>
                <p className="mt-1 text-[18px] font-semibold text-ink">
                  {balanceQuery.isLoading
                    ? t("profile.loading")
                    : formatCustomerCurrency(currentBalance, currency, locale)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  {t("creditsDialog.newBalance")}
                </p>
                <p className="mt-1 text-[18px] font-semibold text-cobalt-700">
                  {formatCustomerCurrency(
                    currentBalance + (Number.isFinite(amount) ? amount : 0),
                    currency,
                    locale,
                  )}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              <FormField label={t("creditsDialog.amount")}>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  className={workspaceInputClass}
                />
              </FormField>
              <FormField
                label={t("creditsDialog.reason")}
                hint={t("creditsDialog.reasonHint")}
              >
                <textarea
                  required
                  maxLength={500}
                  value={form.reason}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  className={workspaceTextareaClass}
                />
              </FormField>
            </div>
          </WorkspaceFormSection>
          <div className="mt-4">
            <RequestError message={error} />
          </div>
        </div>
        <WorkspaceFormActions className="shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={grantState.isLoading}
            className={workspaceSecondaryButtonClass}
          >
            {t("dialog.cancel")}
          </button>
          <button
            type="submit"
            disabled={grantState.isLoading || balanceQuery.isLoading}
            className={workspacePrimaryButtonClass}
          >
            <SavingLabel
              saving={grantState.isLoading}
              idle={t("creditsDialog.submit")}
              pending={t("creditsDialog.saving")}
            />
          </button>
        </WorkspaceFormActions>
      </form>
    </ActionDialog>
  );
}

export function AssignMembershipDialog({
  open,
  customer,
  onClose,
  onAssigned,
  t,
}) {
  const locale = useLocale();
  const [form, setForm] = useState(EMPTY_MEMBERSHIP);
  const [error, setError] = useState("");
  const plansQuery = useGetAllMembershipPlansQuery(
    { includeInactive: false },
    { skip: !open },
  );
  const locationsQuery = useGetLocationsQuery({ limit: 100 }, { skip: !open });
  const [assignMembership, assignState] = useAssignMembershipToUserMutation();
  const plans = useMemo(
    () =>
      normalizePlans(plansQuery.data).filter(
        (plan) => plan?.status !== "archived" && getPublishedPlanVersion(plan),
      ),
    [plansQuery.data],
  );
  const locations = useMemo(
    () => normalizeLocations(locationsQuery.data),
    [locationsQuery.data],
  );
  const selectedPlan = plans.find((plan) => getEntityId(plan) === form.planId);
  const prices = getPlanPrices(selectedPlan);
  const locationIds = getPlanLocationIds(selectedPlan);
  const scopedLocations = locationIds.length
    ? locations.filter((location) =>
        locationIds.includes(getEntityId(location)),
      )
    : locations;

  const selectPlan = (planId) => {
    const plan = plans.find((item) => getEntityId(item) === planId);
    const firstPrice = getPlanPrices(plan)[0];
    setForm((current) => ({
      ...current,
      planId,
      currency: firstPrice?.currency || "",
      locationId: "",
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (
      !getEntityId(customer) ||
      !selectedPlan ||
      !form.currency ||
      (locationIds.length > 0 && !form.locationId)
    ) {
      setError(t("membershipDialog.validation"));
      return;
    }

    try {
      const result = await assignMembership(
        buildMembershipAssignmentPayload({
          customer,
          plan: selectedPlan,
          ...form,
        }),
      ).unwrap();
      onAssigned(result);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("membershipDialog.error")));
    }
  };

  return (
    <ActionDialog
      open={open}
      title={t("membershipDialog.title")}
      description={t("membershipDialog.description", {
        name: getCustomerName(customer),
      })}
      closeLabel={t("dialog.close")}
      busy={assignState.isLoading}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
          <WorkspaceFormSection>
            {plansQuery.isLoading ? (
              <p
                className="flex items-center gap-2 text-[12px] text-ink-muted"
                role="status"
              >
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                {t("membershipDialog.loading")}
              </p>
            ) : plansQuery.isError ? (
              <RequestError message={t("membershipDialog.loadError")} />
            ) : plans.length === 0 ? (
              <p className="text-[12px] leading-5 text-ink-muted">
                {t("membershipDialog.noPlans")}
              </p>
            ) : (
              <div className="space-y-4">
                <FormField label={t("membershipDialog.plan")}>
                  <select
                    required
                    autoFocus
                    value={form.planId}
                    onChange={(event) => selectPlan(event.target.value)}
                    className={workspaceInputClass}
                  >
                    <option value="">{t("membershipDialog.choosePlan")}</option>
                    {plans.map((plan) => (
                      <option key={getEntityId(plan)} value={getEntityId(plan)}>
                        {getPlanName(plan)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t("membershipDialog.price")}>
                  <select
                    required
                    disabled={!selectedPlan}
                    value={form.currency}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        currency: event.target.value,
                      }))
                    }
                    className={workspaceInputClass}
                  >
                    <option value="">
                      {t("membershipDialog.choosePrice")}
                    </option>
                    {prices.map((price) => (
                      <option key={price.currency} value={price.currency}>
                        {formatCustomerCurrency(
                          price.amountMinor !== undefined
                            ? Number(price.amountMinor) / 100
                            : Number(price.amount || 0),
                          price.currency,
                          locale,
                        )}
                      </option>
                    ))}
                  </select>
                </FormField>
                {locationIds.length ? (
                  <FormField label={t("membershipDialog.location")}>
                    <select
                      required
                      value={form.locationId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          locationId: event.target.value,
                        }))
                      }
                      className={workspaceInputClass}
                    >
                      <option value="">
                        {t("membershipDialog.chooseLocation")}
                      </option>
                      {scopedLocations.map((location) => (
                        <option
                          key={getEntityId(location)}
                          value={getEntityId(location)}
                        >
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                ) : null}
                <FormField label={t("membershipDialog.reason")}>
                  <select
                    value={form.reason}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    className={workspaceInputClass}
                  >
                    {membershipReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {t(`membershipDialog.reasons.${reason}`)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t("membershipDialog.note")}>
                  <textarea
                    maxLength={1000}
                    value={form.note}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    className={workspaceTextareaClass}
                  />
                </FormField>
              </div>
            )}
          </WorkspaceFormSection>
          <div className="mt-4">
            <RequestError message={error} />
          </div>
        </div>
        <WorkspaceFormActions>
          <button
            type="button"
            onClick={onClose}
            disabled={assignState.isLoading}
            className={workspaceSecondaryButtonClass}
          >
            {t("dialog.cancel")}
          </button>
          <button
            type="submit"
            disabled={assignState.isLoading || plans.length === 0}
            className={workspacePrimaryButtonClass}
          >
            <SavingLabel
              saving={assignState.isLoading}
              idle={t("membershipDialog.submit")}
              pending={t("membershipDialog.saving")}
            />
          </button>
        </WorkspaceFormActions>
      </form>
    </ActionDialog>
  );
}

export function CancelMembershipDialog({
  open,
  membership,
  onClose,
  onCancelled,
  t,
}) {
  const [form, setForm] = useState({
    effective: "period_end",
    reason: "other",
    comment: "",
  });
  const [error, setError] = useState("");
  const [cancelMembership, cancelState] = useCancelManagedMembershipMutation();

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const id = getEntityId(membership);
    if (!id) {
      setError(t("membershipCancel.error"));
      return;
    }

    try {
      const result = await cancelMembership({
        id,
        effective: form.effective,
        reason: form.reason,
        comment: form.comment.trim() || undefined,
      }).unwrap();
      onCancelled(result);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("membershipCancel.error")));
    }
  };

  return (
    <ActionDialog
      open={open}
      title={t("membershipCancel.title")}
      description={t("membershipCancel.description")}
      closeLabel={t("dialog.close")}
      busy={cancelState.isLoading}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
          <WorkspaceFormSection>
            <div className="space-y-4">
              <FormField label={t("membershipCancel.effective")}>
                <select
                  value={form.effective}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      effective: event.target.value,
                    }))
                  }
                  className={workspaceInputClass}
                >
                  <option value="period_end">
                    {t("membershipCancel.periodEnd")}
                  </option>
                  <option value="immediate">
                    {t("membershipCancel.immediate")}
                  </option>
                </select>
              </FormField>
              <FormField label={t("membershipCancel.reason")}>
                <select
                  value={form.reason}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  className={workspaceInputClass}
                >
                  {cancellationReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {t(`membershipCancel.reasons.${reason}`)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={t("membershipCancel.comment")}>
                <textarea
                  maxLength={1000}
                  value={form.comment}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      comment: event.target.value,
                    }))
                  }
                  className={workspaceTextareaClass}
                />
              </FormField>
            </div>
          </WorkspaceFormSection>
          <div className="mt-4">
            <RequestError message={error} />
          </div>
        </div>
        <WorkspaceFormActions>
          <button
            type="button"
            onClick={onClose}
            disabled={cancelState.isLoading}
            className={workspaceSecondaryButtonClass}
          >
            {t("dialog.cancel")}
          </button>
          <button
            type="submit"
            disabled={cancelState.isLoading}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-danger px-6 text-[13px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60 sm:min-h-11 sm:w-auto sm:text-[12px]"
          >
            <SavingLabel
              saving={cancelState.isLoading}
              idle={t("membershipCancel.submit")}
              pending={t("membershipCancel.saving")}
            />
          </button>
        </WorkspaceFormActions>
      </form>
    </ActionDialog>
  );
}

export function SuccessMark({ label }) {
  return (
    <span className="inline-flex items-center gap-2 text-success">
      <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
      {label}
    </span>
  );
}
