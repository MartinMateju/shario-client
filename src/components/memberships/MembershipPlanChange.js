"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useLocale, useTranslations } from "next-intl";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";
import {
  customerPortalPrimaryActionClass,
  customerPortalSecondaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import {
  useScheduleMyMembershipPlanChangeMutation,
  useCancelMyMembershipPlanChangeMutation,
} from "@/lib/features/memberships/membershipsApiSlice";
import {
  createIdempotencyKey,
  formatDate,
  formatPlanPrice,
  getEntityId,
  getLocalizedMembershipText,
  getPlanVersion,
} from "./membership.utils";

function ChangeDialog({ open, onClose, title, children, portal }) {
  const context = useOptionalPublicTenant();
  const theme = getPublicTenantTheme(
    context?.tenant || {},
    portal ? { surface: "portal" } : undefined,
  );
  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="relative z-[95]"
      style={theme.style}
      data-tenant-style={theme.stylePresetId}
    >
      <DialogBackdrop className="fixed inset-0 bg-[#171717]/40 backdrop-blur-[2px]" />
      <div className="fixed inset-0 overflow-y-auto p-4">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel className="w-full max-w-lg rounded-[24px] bg-[var(--tenant-surface)] p-6 text-[var(--tenant-text-on-surface)] shadow-floating">
            <DialogTitle className="text-xl font-semibold text-[var(--tenant-heading-on-surface)]">
              {title}
            </DialogTitle>
            {children}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export function MembershipPlanChangeDialog({
  intent,
  membership,
  portal,
  onClose,
  onSuccess,
}) {
  const t = useTranslations("Memberships.planChange");
  const locale = useLocale();
  const [schedule, state] = useScheduleMyMembershipPlanChangeMutation();
  const [error, setError] = useState(false);
  const submitting = useRef(false);
  const version = getPlanVersion(intent.plan);
  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setError(false);
    try {
      await schedule({
        planId: getEntityId(intent.plan),
        planVersionId: getEntityId(version),
        ...(intent.locationId ? { locationId: intent.locationId } : {}),
        termsAccepted: true,
        locale,
        idempotencyKey: intent.idempotencyKey,
      }).unwrap();
      onSuccess();
    } catch {
      setError(true);
    } finally {
      submitting.current = false;
    }
  };
  return (
    <ChangeDialog
      open
      onClose={() => !submitting.current && onClose()}
      title={t("title")}
      portal={portal}
    >
      <p className="mt-4 text-sm leading-6">
        {t("description", {
          date: formatDate(membership.currentPeriodEnd, locale),
        })}
      </p>
      <p className="mt-4 rounded-2xl border border-[var(--tenant-border)] bg-[var(--tenant-background)] p-4 text-sm font-semibold text-[var(--tenant-text)]">
        {t("renewal", {
          date: formatDate(membership.currentPeriodEnd, locale),
          plan: getLocalizedMembershipText(version, "name", locale),
          price: formatPlanPrice(intent.price, locale),
        })}
      </p>
      <p className="mt-3 text-xs leading-5 text-[var(--tenant-muted-on-surface)]">
        {t("noImmediateCharge")}
      </p>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger"
        >
          {t("error")}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={state.isLoading}
          onClick={onClose}
          className={customerPortalSecondaryActionClass}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          disabled={state.isLoading}
          onClick={submit}
          className={customerPortalPrimaryActionClass}
        >
          {t("confirm")}
        </button>
      </div>
    </ChangeDialog>
  );
}

export function ScheduledMembershipPlanChange({
  membership,
  portal = true,
  onChanged,
}) {
  const t = useTranslations("Memberships.planChange");
  const commonT = useTranslations("Memberships.common");
  const locale = useLocale();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [error, setError] = useState(false);
  const [cancel, state] = useCancelMyMembershipPlanChangeMutation();
  const submitting = useRef(false);
  const change = membership?.scheduledPlanChange;
  useEffect(() => {
    if (!["preparing", "cancelling"].includes(change?.status) || !onChanged)
      return;
    const timer = window.setInterval(onChanged, 5000);
    return () => window.clearInterval(timer);
  }, [change?.status, onChanged]);
  if (!change) return null;
  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setError(false);
    try {
      await cancel().unwrap();
      setCancelOpen(false);
      onChanged?.();
    } catch {
      setError(true);
    } finally {
      submitting.current = false;
    }
  };
  return (
    <section
      className="mt-6 rounded-[20px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-5 text-[var(--tenant-text-on-surface)]"
      aria-label={t(
        change.status === "scheduled" ? "pendingTitle" : "processing",
      )}
    >
      <h2 className="text-sm font-semibold">
        {t(change.status === "scheduled" ? "pendingTitle" : "processing")}
      </h2>
      {change.status === "scheduled" ? (
        <p className="mt-2 text-sm leading-6">
          {t("pendingDescription", {
            plan: getLocalizedMembershipText(
              change.planSnapshot,
              "name",
              locale,
            ),
            date: formatDate(change.effectiveAt, locale),
          })}
        </p>
      ) : null}
      {change.status === "scheduled" ? (
        <button
          type="button"
          onClick={() => {
            setError(false);
            setCancelOpen(true);
          }}
          className={`${customerPortalSecondaryActionClass} mt-4`}
        >
          {t("cancelChange")}
        </button>
      ) : (
        <p role="status" className="mt-3 text-sm">
          {t("processing")}
        </p>
      )}
      <ChangeDialog
        open={cancelOpen}
        onClose={() => !submitting.current && setCancelOpen(false)}
        title={t("cancelTitle")}
        portal={portal}
      >
        <p className="mt-4 text-sm leading-6">{t("cancelConfirm")}</p>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {t("error")}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={state.isLoading}
            onClick={() => setCancelOpen(false)}
            className={customerPortalSecondaryActionClass}
          >
            {commonT("close")}
          </button>
          <button
            type="button"
            disabled={state.isLoading}
            onClick={submit}
            className={customerPortalPrimaryActionClass}
          >
            {t("cancelConfirmAction")}
          </button>
        </div>
      </ChangeDialog>
    </section>
  );
}

export const createPlanChangeIntent = (plan, price, locationId) => ({
  plan,
  price,
  locationId,
  idempotencyKey: createIdempotencyKey("membership-plan-change"),
});
