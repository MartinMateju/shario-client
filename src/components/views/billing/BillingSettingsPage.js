"use client";

import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Dialog as HeadlessDialog } from "@headlessui/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import WorkspaceSectionHeader from "@/components/dashboard/WorkspaceSectionHeader";
import { WorkspaceTable } from "@/components/dashboard/WorkspaceDataSurface";
import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogBody,
  WorkspaceDialogHeader,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";
import {
  PLATFORM_BILLING_CURRENCIES,
  getCurrencyOptions,
  isPlatformBillingCurrency,
  normalizeCurrency,
  resolvePlatformBillingCurrency,
} from "@/config/currencies";
import {
  useCancelTenantSubscriptionMutation,
  useChangeTenantPlanMutation,
  useGetCurrentTenantSubscriptionQuery,
  useGetTenantInvoicesQuery,
  useLazyGetTenantInvoicesQuery,
  useOpenTenantBillingPortalMutation,
  usePreviewTenantPlanChangeMutation,
  useResumeTenantSubscriptionMutation,
  useStartTenantSubscriptionCheckoutMutation,
} from "@/lib/features/billing/billingApiSlice";
import {
  getAnnualSavingsMonths,
  getNewSaleBillingCurrencies,
  getPlanFeatureDescriptors,
  getPlanPricePresentation,
  isCurrentPlanSelection,
  isTrialCheckoutSelectionBlocked,
  isPlanRecommended,
  resolveNewSaleBillingCurrency,
  resolveSafeExternalUrl,
  resolveTrustedBillingUrl,
  sortSubscriptionPlans,
} from "@/lib/features/billing/billingCatalog";
import { formatMinorCurrencyAmount } from "@/utils/money";

const classNames = (...classes) => classes.filter(Boolean).join(" ");

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.error || fallback;

const formatDate = (date, locale) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(date),
  );
};

const formatDateTime = (date, locale) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
};

const getBrowserOrigin = () =>
  typeof window === "undefined" ? "https://shario.io" : window.location.origin;

const formatPlanFeature = (feature, t) => {
  if (feature.kind === "advanced") {
    return t(`features.${feature.key}.advanced`);
  }
  if (feature.kind === "custom") {
    return t(`features.${feature.key}.custom`);
  }

  if (feature.kind === "unlimited") {
    return t(`features.${feature.key}.unlimited`);
  }

  return t(`features.${feature.key}.fixed`, { count: feature.value });
};

function TrialBanner({
  subscription,
  access,
  locale,
  canManage,
  portalLoading,
  onUpdatePayment,
  t,
}) {
  const paymentRecoveryUrl = resolveTrustedBillingUrl(
    subscription.paymentRecoveryUrl,
    getBrowserOrigin(),
  );

  if (subscription.status === "trialing" && access.remainingTrialDays > 0) {
    return (
      <div className="relative overflow-hidden rounded-[24px] bg-cobalt-500 px-5 py-5 text-white shadow-cobalt sm:px-7">
        <div
          className="pointer-events-none absolute -right-9 -top-16 h-44 w-44 rounded-full border-[28px] border-white/10"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <SparklesIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold tracking-[-0.02em]">
                {t("trial.title", { days: access.remainingTrialDays })}
              </p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/75">
                {t("trial.description", {
                  date: formatDate(subscription.trialEndsAt, locale),
                })}
              </p>
            </div>
          </div>
          <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-cobalt-600">
            {t("trial.noCard")}
          </span>
        </div>
      </div>
    );
  }

  if (subscription.lastPaymentFailedAt) {
    const isTerminal = ["marked_uncollectible", "voided"].includes(
      subscription.paymentFailureReason,
    );
    let description;

    if (subscription.paymentFailureReason === "action_required") {
      description = t("recovery.actionRequired");
    } else if (subscription.paymentFailureReason === "finalization_failed") {
      description = t("recovery.finalizationFailed");
    } else if (subscription.nextPaymentAttemptAt) {
      description = t("recovery.retryScheduled", {
        date: formatDateTime(subscription.nextPaymentAttemptAt, locale),
      });
    } else {
      description = t("recovery.noRetryScheduled");
    }

    return (
      <div className="rounded-[22px] border border-warning/20 bg-warning-soft px-5 py-4 text-warning">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {t(isTerminal ? "recovery.terminalTitle" : "recovery.title")}
            </p>
            <p className="mt-1 text-sm leading-6 text-warning/80">
              {description}
            </p>
            {subscription.paymentRetryCount > 0 && (
              <p className="mt-1 text-xs text-warning/70">
                {t("recovery.attemptCount", {
                  count: subscription.paymentRetryCount,
                })}
              </p>
            )}
            {access.mode === "grace" && subscription.graceEndsAt && (
              <p className="mt-1 text-xs font-medium text-warning/80">
                {t("recovery.accessUntil", {
                  date: formatDate(subscription.graceEndsAt, locale),
                })}
              </p>
            )}
            {canManage && (
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onUpdatePayment}
                  disabled={portalLoading}
                  className="text-xs font-semibold text-warning underline decoration-warning/30 underline-offset-4 disabled:opacity-50"
                >
                  {portalLoading ? t("openingPortal") : t("managePayment")}
                </button>
                {paymentRecoveryUrl && (
                  <a
                    href={paymentRecoveryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-warning underline decoration-warning/30 underline-offset-4"
                  >
                    {t("recovery.payInvoice")}
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (access.mode === "grace") {
    return (
      <div className="flex items-start gap-3 rounded-[22px] border border-warning/20 bg-warning-soft px-5 py-4 text-warning">
        <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{t("grace.title")}</p>
          <p className="mt-1 text-sm leading-6 text-warning/80">
            {t("grace.description", {
              date: formatDate(subscription.graceEndsAt, locale),
            })}
          </p>
        </div>
      </div>
    );
  }

  if (!access.canUseFeatures && access.mode !== "setup") {
    return (
      <div className="flex items-start gap-3 rounded-[22px] border border-danger/20 bg-danger-soft px-5 py-4 text-danger">
        <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{t("restricted.title")}</p>
          <p className="mt-1 text-sm leading-6 text-danger/80">
            {t("restricted.description")}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export function PlanCard({
  plan,
  interval,
  billingCurrency,
  locale,
  currentPaidPlan,
  currentPaidInterval,
  currentPaidVersion,
  trialPlan,
  pendingPlan,
  pendingInterval,
  pendingVersion,
  canManage,
  busy,
  actionLocked,
  checkoutBlocked,
  onChoose,
  t,
}) {
  const price = getPlanPricePresentation(plan, interval, billingCurrency);
  const formattedPrice =
    price.unitAmount == null
      ? null
      : formatMinorCurrencyAmount(price.unitAmount, price.currency, locale);
  const isCurrentPaid = isCurrentPlanSelection({
    plan,
    interval,
    currentPlan: currentPaidPlan,
    currentInterval: currentPaidInterval,
    currentVersion: currentPaidVersion,
  });
  const isNewVersion =
    currentPaidPlan === plan.id &&
    Number(currentPaidVersion ?? 1) < Number(plan.version ?? 1);
  const isTrialPlan = !currentPaidPlan && trialPlan === plan.id;
  const isPending = isCurrentPlanSelection({
    plan,
    interval,
    currentPlan: pendingPlan,
    currentInterval: pendingInterval,
    currentVersion: pendingVersion,
  });
  const recommended = isPlanRecommended(plan);
  const features = getPlanFeatureDescriptors(plan).map((feature) =>
    formatPlanFeature(feature, t),
  );
  const annualSavingsMonths = getAnnualSavingsMonths(plan);
  const selfServe =
    plan?.commercial?.saleMode === "sales_assisted"
      ? false
      : plan?.commercial?.saleMode === "self_serve"
        ? true
        : typeof plan.selfServe === "boolean"
          ? plan.selfServe
          : plan.id !== "enterprise";
  const unavailable = selfServe && !price.checkoutConfigured;
  const disabled =
    actionLocked ||
    checkoutBlocked ||
    isCurrentPaid ||
    isPending ||
    unavailable ||
    !canManage;
  const buttonLabel = isCurrentPaid
    ? t("actions.current")
    : isPending
      ? t("actions.scheduled")
      : !selfServe
        ? t("actions.contact")
        : checkoutBlocked
          ? t("actions.trialCheckoutLocked")
          : unavailable
            ? t("actions.unavailable")
            : isTrialPlan
              ? t("actions.keepPlan")
              : isNewVersion
                ? t("actions.updatePlan", { plan: t(`plans.${plan.id}`) })
                : t("actions.choose", { plan: t(`plans.${plan.id}`) });

  return (
    <article
      className={classNames(
        "relative flex min-h-[440px] flex-col rounded-[26px] border bg-white p-5 shadow-sm transition duration-300 sm:p-6",
        recommended
          ? "border-cobalt-300 shadow-card"
          : "border-line hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card",
      )}
    >
      {recommended && (
        <span className="absolute -top-3 left-5 rounded-full bg-cobalt-500 px-3 py-1 text-xs font-semibold text-white">
          {t("recommended")}
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.025em] text-ink">
            {t(`plans.${plan.id}`)}
          </h2>
          <p className="mt-2 min-h-12 text-sm leading-6 text-ink-muted">
            {t(`planDescriptions.${plan.id}`)}
          </p>
        </div>
        {(isCurrentPaid || isTrialPlan || isPending) && (
          <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">
            {isPending
              ? t("scheduledPlan")
              : isCurrentPaid
                ? t("paidPlan")
                : t("trialPlan")}
          </span>
        )}
      </div>

      <div className="mt-5 border-y border-line py-5">
        {price.custom ? (
          <p className="text-2xl font-semibold tracking-[-0.04em] text-ink">
            {t("customPrice")}
          </p>
        ) : formattedPrice ? (
          <div className="flex items-end gap-1.5">
            <p className="text-[31px] font-semibold leading-none tracking-[-0.05em] text-ink">
              {price.from ? `${t("from")} ` : ""}
              {formattedPrice}
            </p>
            <p className="pb-0.5 text-xs text-ink-muted">
              {interval === "monthly" ? t("perMonth") : t("perYear")}
            </p>
          </div>
        ) : (
          <p className="text-sm font-medium text-ink-muted">
            {t("priceComingSoon")}
          </p>
        )}
        {interval === "yearly" && !price.custom && annualSavingsMonths ? (
          <p className="mt-2 text-xs font-semibold text-success">
            {t("annualSavings", { months: annualSavingsMonths })}
          </p>
        ) : null}
      </div>

      <ul className="mt-5 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5 text-sm text-ink-soft">
            <CheckCircleIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-success" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {!selfServe ? (
        <a
          href="mailto:hello@shario.io?subject=shario.io%20Enterprise"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[14px] border border-line-strong px-4 text-sm font-semibold text-ink transition hover:bg-surface-muted"
        >
          {buttonLabel}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => onChoose(plan.id)}
          disabled={disabled}
          className={classNames(
            "mt-6 inline-flex min-h-11 items-center justify-center rounded-[14px] px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 disabled:cursor-not-allowed",
            recommended
              ? "bg-cobalt-500 text-white hover:bg-cobalt-600 disabled:bg-cobalt-200"
              : "border border-line-strong bg-white text-ink hover:bg-surface-muted disabled:text-ink-subtle",
          )}
        >
          {busy && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
          {buttonLabel}
        </button>
      )}
    </article>
  );
}

function Dialog({ title, children, closeLabel, onClose }) {
  return (
    <HeadlessDialog open onClose={onClose} className="relative z-[100]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="compact">
        <WorkspaceDialogPanel layout="compact" size="compact">
          <WorkspaceDialogHeader
            title={title}
            closeLabel={closeLabel}
            onClose={onClose}
          />
          <WorkspaceDialogBody>{children}</WorkspaceDialogBody>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </HeadlessDialog>
  );
}

export default function BillingSettingsPage({ showPageHeader = true }) {
  const t = useTranslations("Billing");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [selectedInterval, setSelectedInterval] = useState(null);
  const [selectedBillingCurrency, setSelectedBillingCurrency] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [changeDialog, setChangeDialog] = useState(null);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState("");
  const [cancelComment, setCancelComment] = useState("");
  const [notice, setNotice] = useState(null);
  const [additionalInvoices, setAdditionalInvoices] = useState([]);
  const [invoiceCursor, setInvoiceCursor] = useState(null);
  const [hasMoreInvoices, setHasMoreInvoices] = useState(null);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetCurrentTenantSubscriptionQuery();
  const invoiceQuery = useGetTenantInvoicesQuery(
    { limit: 20 },
    { skip: !data?.subscription?.hasPaymentProfile },
  );
  const [loadMoreInvoices, { isFetching: invoicesLoadingMore }] =
    useLazyGetTenantInvoicesQuery();
  const [startCheckout, { isLoading: checkoutLoading }] =
    useStartTenantSubscriptionCheckoutMutation();
  const [previewChange, { isLoading: previewLoading }] =
    usePreviewTenantPlanChangeMutation();
  const [applyChange, { isLoading: changeLoading }] =
    useChangeTenantPlanMutation();
  const [cancelSubscription, { isLoading: cancelLoading }] =
    useCancelTenantSubscriptionMutation();
  const [resumeSubscription, { isLoading: resumeLoading }] =
    useResumeTenantSubscriptionMutation();
  const [openPortal, { isLoading: portalLoading }] =
    useOpenTenantBillingPortalMutation();
  const interval =
    selectedInterval || data?.subscription?.billingInterval || "monthly";
  const newSaleBillingCurrencies = getNewSaleBillingCurrencies(
    data,
    data?.plans,
  );
  const storedBillingCurrency = normalizeCurrency(
    data?.subscription?.billingCurrency,
  );
  const tenantOperationalCurrency = normalizeCurrency(
    data?.tenant?.currency ?? data?.tenant?.settings?.currency,
  );
  const hasStripeSubscription = Boolean(
    data?.subscription?.hasStripeSubscription,
  );
  const currentCatalogPlan = data?.plans?.find(
    (plan) =>
      plan.id === (data?.subscription?.billingPlan || data?.tenant?.plan),
  );
  const legacyBillingCurrency = normalizeCurrency(
    currentCatalogPlan?.prices?.[data?.subscription?.billingInterval]?.currency,
  );
  const existingBillingCurrency = isPlatformBillingCurrency(
    storedBillingCurrency,
  )
    ? storedBillingCurrency
    : resolvePlatformBillingCurrency(legacyBillingCurrency);
  const billingCurrency = hasStripeSubscription
    ? existingBillingCurrency
    : resolveNewSaleBillingCurrency({
        selectedCurrency: selectedBillingCurrency,
        storedBillingCurrency,
        tenantCurrency: tenantOperationalCurrency,
      });
  const trialCheckoutBlocked = isTrialCheckoutSelectionBlocked(
    data?.subscription,
  );
  const planActionLocked =
    Boolean(selectedPlan) || checkoutLoading || previewLoading;

  const showError = (mutationError, fallback) => {
    setNotice({
      type: "error",
      message: getErrorMessage(mutationError, fallback),
    });
  };

  const handleChoose = async (plan) => {
    if (trialCheckoutBlocked || planActionLocked) return;

    setSelectedPlan(plan);
    setNotice(null);

    try {
      const terminal = ["canceled", "expired", "incomplete_expired"].includes(
        data.subscription.status,
      );

      if (!data.subscription.hasStripeSubscription || terminal) {
        const result = await startCheckout({
          plan,
          billingInterval: interval,
          billingCurrency,
          locale,
        }).unwrap();

        if (result.url) {
          const checkoutUrl = resolveTrustedBillingUrl(
            result.url,
            getBrowserOrigin(),
          );

          if (!checkoutUrl) {
            showError(null, t("messages.invalidRedirect"));
            return;
          }

          window.location.assign(checkoutUrl);
        }
        return;
      }

      const preview = await previewChange({
        plan,
        billingInterval: interval,
        billingCurrency,
      }).unwrap();

      setChangeDialog({
        plan,
        billingInterval: interval,
        billingCurrency,
        preview,
      });
    } catch (mutationError) {
      showError(mutationError, t("messages.checkoutError"));
    } finally {
      setSelectedPlan(null);
    }
  };

  const handleConfirmChange = async () => {
    if (!changeDialog) return;

    setNotice(null);
    try {
      const result = await applyChange({
        plan: changeDialog.plan,
        billingInterval: changeDialog.billingInterval,
        billingCurrency: changeDialog.billingCurrency,
      }).unwrap();

      if (result.paymentUrl) {
        const paymentUrl = resolveTrustedBillingUrl(
          result.paymentUrl,
          getBrowserOrigin(),
        );

        if (!paymentUrl) {
          showError(null, t("messages.invalidRedirect"));
          return;
        }

        window.location.assign(paymentUrl);
        return;
      }

      setNotice({
        type: "success",
        message:
          result.kind === "scheduled"
            ? t("messages.planScheduled")
            : t("messages.planUpdated"),
      });
      setChangeDialog(null);
      await refetch();
    } catch (mutationError) {
      showError(mutationError, t("messages.changeError"));
    }
  };

  const handleCancel = async () => {
    setNotice(null);
    try {
      await cancelSubscription({
        ...(cancelFeedback ? { feedback: cancelFeedback } : {}),
        ...(cancelComment.trim() ? { comment: cancelComment.trim() } : {}),
      }).unwrap();
      setCancelDialog(false);
      setCancelFeedback("");
      setCancelComment("");
      setNotice({ type: "success", message: t("messages.cancelled") });
      await refetch();
    } catch (mutationError) {
      showError(mutationError, t("messages.cancelError"));
    }
  };

  const handleResume = async () => {
    setNotice(null);
    try {
      await resumeSubscription().unwrap();
      setNotice({ type: "success", message: t("messages.resumed") });
      await refetch();
    } catch (mutationError) {
      showError(mutationError, t("messages.resumeError"));
    }
  };

  const handlePortal = async (flow = "home") => {
    setNotice(null);
    try {
      const result = await openPortal({ locale, flow }).unwrap();
      if (result.url) {
        const portalUrl = resolveTrustedBillingUrl(
          result.url,
          getBrowserOrigin(),
        );

        if (!portalUrl) {
          showError(null, t("messages.invalidRedirect"));
          return;
        }

        window.location.assign(portalUrl);
      }
    } catch (mutationError) {
      showError(mutationError, t("messages.portalError"));
    }
  };

  const handleLoadMoreInvoices = async () => {
    const cursor = invoiceCursor || invoiceQuery.data?.nextCursor;
    if (!cursor) return;

    try {
      const result = await loadMoreInvoices({
        limit: 20,
        startingAfter: cursor,
      }).unwrap();
      setAdditionalInvoices((current) => [
        ...current,
        ...result.invoices.filter(
          (invoice) => !current.some((row) => row.id === invoice.id),
        ),
      ]);
      setInvoiceCursor(result.nextCursor);
      setHasMoreInvoices(result.hasMore);
    } catch (mutationError) {
      showError(mutationError, t("messages.invoiceError"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-cobalt-500" />
        <span className="ml-3 text-sm text-ink-muted">{t("loading")}</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-xl rounded-[24px] border border-danger/20 bg-danger-soft p-6 text-center">
        <ExclamationTriangleIcon className="mx-auto h-7 w-7 text-danger" />
        <h2 className="mt-3 font-semibold text-ink">{t("loadErrorTitle")}</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {getErrorMessage(error, t("loadErrorDescription"))}
        </p>
        <button
          type="button"
          onClick={refetch}
          className="mt-5 rounded-[13px] bg-ink px-4 py-2.5 text-sm font-semibold text-white"
        >
          {t("tryAgain")}
        </button>
      </div>
    );
  }

  const { tenant, subscription, paymentMethod, access, permissions } = data;
  const plans = sortSubscriptionPlans(data.plans);
  const billingCurrencyLocked = Boolean(subscription.hasStripeSubscription);
  const billingCurrencyOptions = getCurrencyOptions(
    billingCurrencyLocked
      ? [billingCurrency]
      : [
          ...new Set([
            billingCurrency,
            ...PLATFORM_BILLING_CURRENCIES,
            ...newSaleBillingCurrencies,
          ]),
        ],
    locale,
  );
  const invoiceRows = [
    ...(invoiceQuery.data?.invoices || []),
    ...additionalInvoices.filter(
      (invoice) =>
        !(invoiceQuery.data?.invoices || []).some(
          (initialInvoice) => initialInvoice.id === invoice.id,
        ),
    ),
  ];
  const canCancel =
    permissions.canManageBilling &&
    (subscription.hasStripeSubscription ||
      subscription.status === "trialing") &&
    !subscription.cancelAtPeriodEnd &&
    ["trialing", "active", "past_due"].includes(subscription.status);
  const visibleNotice =
    notice ??
    (searchParams.get("portal") === "payment_method_updated"
      ? {
          type: "success",
          message: t("messages.paymentMethodUpdated"),
        }
      : null);

  return (
    <section className="mx-auto max-w-[1380px] pb-8">
      <WorkspaceSectionHeader
        showTitle={showPageHeader}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("subtitle")}
        actions={
          <button
            type="button"
            onClick={refetch}
            disabled={isFetching}
            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-[13px] border border-line bg-white px-3.5 text-xs font-semibold text-ink-soft shadow-xs transition hover:border-line-strong disabled:opacity-50"
          >
            <ArrowPathIcon
              className={classNames("h-4 w-4", isFetching && "animate-spin")}
            />
            {t("refresh")}
          </button>
        }
      />

      <div className="mt-7">
        <TrialBanner
          subscription={subscription}
          access={access}
          locale={locale}
          canManage={permissions.canManageBilling}
          portalLoading={portalLoading}
          onUpdatePayment={() => handlePortal("payment_method_update")}
          t={t}
        />
      </div>

      {visibleNotice && (
        <div
          className={classNames(
            "mt-5 rounded-[16px] border px-4 py-3 text-sm",
            visibleNotice.type === "success"
              ? "border-success/20 bg-success-soft text-success"
              : "border-danger/20 bg-danger-soft text-danger",
          )}
          role="status"
        >
          {visibleNotice.message}
        </div>
      )}

      {subscription.cancelAtPeriodEnd && (
        <div className="mt-5 flex flex-col gap-3 rounded-[18px] border border-warning/20 bg-warning-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-warning">
            {t("cancellation.scheduled", {
              date: formatDate(subscription.currentPeriodEnd, locale),
            })}
          </p>
          {permissions.canManageBilling && (
            <button
              type="button"
              onClick={handleResume}
              disabled={resumeLoading}
              className="text-sm font-semibold text-warning underline underline-offset-4"
            >
              {resumeLoading ? t("actions.working") : t("actions.resume")}
            </button>
          )}
        </div>
      )}

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[24px] border border-line bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-coral-100 text-terracotta-600">
              <CreditCardIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-ink-muted">
                    {t("currentPlanLabel")}
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-ink">
                    {t(`plans.${tenant.plan}`)}
                  </p>
                </div>
                <span className="rounded-full bg-success-soft px-3 py-1.5 text-xs font-semibold text-success">
                  {t(`statuses.${subscription.status}`)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 text-xs text-ink-muted">
                <span>
                  {t("billingIntervalLabel")}:{" "}
                  {subscription.billingInterval
                    ? t(`intervals.${subscription.billingInterval}`)
                    : t("notSelected")}
                </span>
                <span>
                  {t("billingCurrency.label")}: {billingCurrency}
                </span>
                <span>
                  {subscription.cancelAtPeriodEnd
                    ? t("endsLabel")
                    : t("renewsLabel")}
                  :{" "}
                  {formatDate(
                    subscription.currentPeriodEnd ||
                      (subscription.status === "trialing"
                        ? subscription.trialEndsAt
                        : null),
                    locale,
                  )}
                </span>
              </div>
              {subscription.pendingChange && (
                <p className="mt-4 rounded-[12px] bg-cobalt-50 px-3 py-2 text-xs text-cobalt-700">
                  {t("pendingChange", {
                    plan: t(`plans.${subscription.pendingChange.plan}`),
                    date: formatDate(
                      subscription.pendingChange.effectiveAt,
                      locale,
                    ),
                  })}
                </p>
              )}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setCancelDialog(true)}
                  className="mt-5 text-xs font-semibold text-danger underline decoration-danger/30 underline-offset-4"
                >
                  {t("actions.cancel")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-line bg-surface-muted p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <LockClosedIcon className="h-5 w-5 text-cobalt-500" />
            <p className="text-sm font-semibold text-ink">
              {t("secure.title")}
            </p>
          </div>
          <p className="mt-3 text-xs leading-5 text-ink-muted">
            {t("secure.description")}
          </p>
          <p className="mt-3 text-xs leading-5 text-ink-muted">
            {paymentMethod?.type === "card"
              ? t("paymentMethod.card", {
                  brand: paymentMethod.brand,
                  last4: paymentMethod.last4,
                  month: paymentMethod.expiresMonth,
                  year: paymentMethod.expiresYear,
                })
              : paymentMethod
                ? t("paymentMethod.saved")
                : t("paymentMethod.none")}
          </p>
          {subscription.hasPaymentProfile && permissions.canManageBilling && (
            <button
              type="button"
              onClick={() => handlePortal("payment_method_update")}
              disabled={portalLoading}
              className="mt-4 text-xs font-semibold text-cobalt-600 underline decoration-cobalt-200 underline-offset-4 hover:text-cobalt-700"
            >
              {portalLoading ? t("openingPortal") : t("managePayment")}
            </button>
          )}
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.035em] text-ink">
            {t("chooseTitle")}
          </h2>
          <p className="mt-2 text-sm text-ink-muted">{t("chooseSubtitle")}</p>
          {plans.some((plan) => plan?.commercial?.founding) ? (
            <p className="mt-2 text-xs font-semibold text-accent-text">
              {t("foundingOffer")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">
              {t("billingCurrency.label")}
            </span>
            <select
              value={billingCurrency}
              onChange={(event) =>
                setSelectedBillingCurrency(event.target.value)
              }
              disabled={billingCurrencyLocked || !permissions.canManageBilling}
              className="h-11 min-w-52 rounded-[13px] border border-line bg-white px-3 text-xs font-semibold text-ink shadow-xs disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted"
              aria-describedby={
                billingCurrencyLocked ? "billing-currency-help" : undefined
              }
            >
              {billingCurrencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="inline-flex h-11 w-fit rounded-[14px] border border-line bg-white p-1 shadow-xs">
            {["monthly", "yearly"].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedInterval(value)}
                className={classNames(
                  "rounded-[10px] px-4 py-2 text-xs font-semibold transition",
                  interval === value
                    ? "bg-ink text-white"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {t(`intervals.${value}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {billingCurrencyLocked && (
        <p
          id="billing-currency-help"
          className="mt-2 text-xs text-ink-muted xl:text-right"
        >
          {t("billingCurrency.locked")}
        </p>
      )}

      {!permissions.canManageBilling && (
        <p className="mt-4 rounded-[14px] bg-warning-soft px-4 py-3 text-sm text-warning">
          {t("ownerOnly")}
        </p>
      )}

      {trialCheckoutBlocked && permissions.canManageBilling && (
        <div
          className="mt-4 flex items-start gap-3 rounded-[16px] border border-warning/20 bg-warning-soft px-4 py-3 text-warning"
          role="status"
        >
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">
              {t("trial.checkoutLockedTitle")}
            </p>
            <p className="mt-1 text-xs leading-5 text-warning/80">
              {t("trial.checkoutLockedDescription", {
                date: formatDate(subscription.trialEndsAt, locale),
              })}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            interval={interval}
            billingCurrency={billingCurrency}
            locale={locale}
            currentPaidPlan={subscription.billingPlan}
            currentPaidInterval={subscription.billingInterval}
            currentPaidVersion={subscription.planVersion}
            trialPlan={
              subscription.status === "trialing" ? subscription.trialPlan : null
            }
            pendingPlan={subscription.pendingChange?.plan}
            pendingInterval={subscription.pendingChange?.billingInterval}
            pendingVersion={subscription.pendingChange?.planVersion}
            canManage={permissions.canManageBilling}
            busy={selectedPlan === plan.id}
            actionLocked={planActionLocked}
            checkoutBlocked={trialCheckoutBlocked}
            onChoose={handleChoose}
            t={t}
          />
        ))}
      </div>

      <div className="mt-10 rounded-[24px] border border-line bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-ink">
              {t("invoices.title")}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {t("invoices.description")}
            </p>
          </div>
          {subscription.hasPaymentProfile && permissions.canManageBilling && (
            <button
              type="button"
              onClick={() => handlePortal("home")}
              disabled={portalLoading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cobalt-600"
            >
              {portalLoading ? t("openingPortal") : t("invoices.openPortal")}
              {portalLoading ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {invoiceQuery.isLoading ? (
          <div className="flex items-center py-10 text-sm text-ink-muted">
            <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
            {t("invoices.loading")}
          </div>
        ) : invoiceRows.length ? (
          <div className="mt-5 overflow-x-auto">
            <WorkspaceTable className="min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-xs text-ink-muted">
                <tr>
                  <th className="py-3 pr-4 font-medium">
                    {t("invoices.number")}
                  </th>
                  <th className="py-3 pr-4 font-medium">
                    {t("invoices.date")}
                  </th>
                  <th className="py-3 pr-4 font-medium">
                    {t("invoices.status")}
                  </th>
                  <th className="py-3 pr-4 font-medium">
                    {t("invoices.amount")}
                  </th>
                  <th className="py-3 text-right font-medium">
                    {t("invoices.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoiceRows.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="py-4 pr-4 font-medium text-ink">
                      {invoice.number || invoice.id}
                    </td>
                    <td className="py-4 pr-4 text-ink-muted">
                      {formatDate(invoice.createdAt, locale)}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-soft">
                        {t(`invoiceStatuses.${invoice.status || "draft"}`)}
                      </span>
                    </td>
                    <td className="py-4 pr-4 font-medium text-ink">
                      {formatMinorCurrencyAmount(
                        invoice.amountDue,
                        invoice.currency,
                        locale,
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-3">
                        {resolveSafeExternalUrl(
                          invoice.hostedInvoiceUrl,
                          getBrowserOrigin(),
                        ) && (
                          <a
                            href={resolveSafeExternalUrl(
                              invoice.hostedInvoiceUrl,
                              getBrowserOrigin(),
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-cobalt-600"
                          >
                            {t("invoices.view")}
                          </a>
                        )}
                        {resolveSafeExternalUrl(
                          invoice.invoicePdf,
                          getBrowserOrigin(),
                        ) && (
                          <a
                            href={resolveSafeExternalUrl(
                              invoice.invoicePdf,
                              getBrowserOrigin(),
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-cobalt-600"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </WorkspaceTable>
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-center rounded-[18px] bg-surface-muted py-10 text-center">
            <DocumentTextIcon className="h-7 w-7 text-ink-subtle" />
            <p className="mt-3 text-sm font-medium text-ink">
              {t("invoices.empty")}
            </p>
          </div>
        )}

        {(hasMoreInvoices ?? invoiceQuery.data?.hasMore) && (
          <button
            type="button"
            onClick={handleLoadMoreInvoices}
            disabled={invoicesLoadingMore}
            className="mt-5 rounded-[12px] border border-line px-4 py-2 text-xs font-semibold text-ink"
          >
            {invoicesLoadingMore
              ? t("invoices.loading")
              : t("invoices.loadMore")}
          </button>
        )}
      </div>

      {changeDialog && (
        <Dialog
          title={t("changeDialog.title", {
            plan: t(`plans.${changeDialog.plan}`),
          })}
          closeLabel={t("closeDialog")}
          onClose={() => !changeLoading && setChangeDialog(null)}
        >
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            {t(`changeDialog.timings.${changeDialog.preview.timing}`, {
              date: formatDate(changeDialog.preview.effectiveAt, locale),
            })}
          </p>
          {changeDialog.preview.timing === "immediate" && (
            <div className="mt-5 rounded-[16px] bg-surface-muted p-4">
              <p className="text-xs text-ink-muted">
                {t("changeDialog.estimatedCharge")}
              </p>
              <p className="mt-1 text-2xl font-semibold text-ink">
                {formatMinorCurrencyAmount(
                  changeDialog.preview.amountDue,
                  changeDialog.preview.currency,
                  locale,
                )}
              </p>
              <p className="mt-2 text-xs leading-5 text-ink-muted">
                {t("changeDialog.estimateNotice")}
              </p>
            </div>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setChangeDialog(null)}
              disabled={changeLoading}
              className="rounded-[13px] border border-line px-4 py-2.5 text-sm font-semibold text-ink"
            >
              {t("actions.back")}
            </button>
            <button
              type="button"
              onClick={handleConfirmChange}
              disabled={changeLoading}
              className="rounded-[13px] bg-cobalt-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {changeLoading ? t("actions.working") : t("actions.confirm")}
            </button>
          </div>
        </Dialog>
      )}

      {cancelDialog && (
        <Dialog
          title={t("cancellation.title")}
          closeLabel={t("closeDialog")}
          onClose={() => !cancelLoading && setCancelDialog(false)}
        >
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            {subscription.hasStripeSubscription
              ? t("cancellation.description", {
                  date: formatDate(subscription.currentPeriodEnd, locale),
                })
              : t("cancellation.trialDescription")}
          </p>
          <label className="mt-5 block text-xs font-semibold text-ink">
            {t("cancellation.reason")}
            <select
              value={cancelFeedback}
              onChange={(event) => setCancelFeedback(event.target.value)}
              className="mt-2 block w-full rounded-[13px] border-line text-sm"
            >
              <option value="">{t("cancellation.selectReason")}</option>
              {[
                "too_expensive",
                "missing_features",
                "too_complex",
                "unused",
                "switched_service",
                "customer_service",
                "low_quality",
                "other",
              ].map((reason) => (
                <option key={reason} value={reason}>
                  {t(`cancellation.reasons.${reason}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-xs font-semibold text-ink">
            {t("cancellation.comment")}
            <textarea
              value={cancelComment}
              onChange={(event) => setCancelComment(event.target.value)}
              maxLength={500}
              rows={3}
              className="mt-2 block w-full rounded-[13px] border-line text-sm"
            />
          </label>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCancelDialog(false)}
              disabled={cancelLoading}
              className="rounded-[13px] border border-line px-4 py-2.5 text-sm font-semibold text-ink"
            >
              {t("actions.keepSubscription")}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelLoading}
              className="rounded-[13px] bg-danger px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {cancelLoading
                ? t("actions.working")
                : t("actions.confirmCancel")}
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
