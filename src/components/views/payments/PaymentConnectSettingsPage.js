"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";

import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  IdentificationIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { resolveIntlLocale } from "@/i18n/formatting";
import { resolveRolloutEligibleLocaleCode } from "@/i18n/locales";
import {
  useGetTenantPaymentConnectQuery,
  useOpenTenantPaymentConnectDashboardMutation,
  useStartTenantPaymentConnectOnboardingMutation,
} from "@/lib/features/tenant-payments/tenantPaymentsApiSlice";
import { TENANT_PAYMENT_SETUP_STEP } from "@/lib/features/tenant-payments/tenantPaymentOnboarding";
import {
  CONNECT_DISPLAY_STATUSES,
  normalizeTenantPaymentConnect,
} from "@/lib/features/tenant-payments/tenantPayments.utils";
import BrushStrokeEdge from "@/components/decorations/BrushStrokeEdge";
import useGuidedSetupStep from "@/components/setup-center/useGuidedSetupStep";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const getErrorMessage = (error, fallback) =>
  getLocalizedApiErrorMessage(error, fallback);

const statusStyles = {
  [CONNECT_DISPLAY_STATUSES.NOT_STARTED]: {
    icon: CreditCardIcon,
    badge: "border-[#DDD9D1] bg-[#F7F5F1] text-[#66635E]",
    iconWrap: "bg-[#F0EDE7] text-[#66635E]",
  },
  [CONNECT_DISPLAY_STATUSES.PENDING]: {
    icon: ClockIcon,
    badge: "border-sand-200 bg-sand-50 text-sand-800",
    iconWrap: "bg-sand-100 text-sand-800",
  },
  [CONNECT_DISPLAY_STATUSES.RESTRICTED]: {
    icon: ExclamationTriangleIcon,
    badge: "border-coral-200 bg-coral-50 text-terracotta-700",
    iconWrap: "bg-coral-100 text-terracotta-700",
  },
  [CONNECT_DISPLAY_STATUSES.ACTIVE]: {
    icon: CheckCircleIcon,
    badge: "border-[#CFE0CB] bg-[#F5FAF3] text-[#47613E]",
    iconWrap: "bg-[#E8F3E5] text-[#47613E]",
  },
};

const getRedirectUrl = (payload) => {
  const value = payload?.url ?? payload?.data?.url;

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value);
    const isStripeHost =
      url.hostname === "stripe.com" || url.hostname.endsWith(".stripe.com");

    return url.protocol === "https:" && isStripeHost ? url.toString() : null;
  } catch {
    return null;
  }
};

const formatTimestamp = (value, locale) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

function CapabilityCard({ enabled, icon: Icon, label, description, t }) {
  return (
    <article className="rounded-[16px] border border-line bg-surface-muted p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-cobalt-600 shadow-[0_5px_18px_rgba(31,31,31,0.06)]">
          <Icon className="h-[19px] w-[19px]" aria-hidden="true" />
        </span>
        <span
          className={cx(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
            enabled
              ? "border-[#CFE0CB] bg-[#F5FAF3] text-[#47613E]"
              : "border-[#DDD9D1] bg-white text-[#77736D]",
          )}
        >
          <span
            className={cx(
              "h-1.5 w-1.5 rounded-full",
              enabled ? "bg-[#5B8A4E]" : "bg-[#A6A19A]",
            )}
            aria-hidden="true"
          />
          {enabled ? t("capabilities.enabled") : t("capabilities.notEnabled")}
        </span>
      </div>
      <h3 className="mt-4 text-[13px] font-semibold text-[#292925]">{label}</h3>
      <p className="mt-1.5 text-[11px] leading-[1.65] text-[#777773]">
        {description}
      </p>
    </article>
  );
}

function SetupChecklist({ connection, t }) {
  const steps = [
    {
      key: "account",
      complete: connection.connected,
    },
    {
      key: "verification",
      complete: connection.detailsSubmitted,
    },
    {
      key: "payments",
      complete: connection.status === CONNECT_DISPLAY_STATUSES.ACTIVE,
    },
  ];

  return (
    <section
      data-contextual-guide-target="payments-checklist"
      className="rounded-[20px] border border-line bg-white p-5 shadow-[0_14px_38px_rgba(17,17,15,0.04)] sm:p-6"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cobalt-600">
        {t("checklist.eyebrow")}
      </p>
      <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.035em] text-[#292925]">
        {t("checklist.title")}
      </h2>
      <ol className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-[15px] border border-line bg-surface-muted p-3.5"
          >
            <span
              className={cx(
                "flex h-[34px] w-[34px] items-center justify-center rounded-full text-[11px] font-semibold",
                step.complete
                  ? "bg-[#E8F3E5] text-[#47613E]"
                  : "bg-[#EEEAE4] text-[#77736D]",
              )}
              aria-hidden="true"
            >
              {step.complete ? (
                <CheckCircleIcon className="h-[18px] w-[18px]" />
              ) : (
                index + 1
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-[#292925]">
                {t(`checklist.steps.${step.key}.title`)}
              </span>
              <span className="mt-1 block text-[10px] leading-4 text-[#777773]">
                {t(`checklist.steps.${step.key}.description`)}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function PaymentConnectSettingsPage({ showPageHeader = true }) {
  const t = useTranslations("PaymentConnect");
  const locale = useLocale();
  const connectLocale = resolveRolloutEligibleLocaleCode(locale);
  const searchParams = useSearchParams();
  const connectReturn =
    searchParams.get("connect") ?? searchParams.get("stripe_connect");
  const guidedSetupStep =
    searchParams.get("setupStep") === TENANT_PAYMENT_SETUP_STEP
      ? TENANT_PAYMENT_SETUP_STEP
      : undefined;
  const guidedSetup = useGuidedSetupStep(TENANT_PAYMENT_SETUP_STEP);
  const guidedCompletionHandled = useRef(false);
  const refreshHandled = useRef(false);
  const actionInFlight = useRef(false);
  const [actionError, setActionError] = useState("");
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetTenantPaymentConnectQuery(undefined, {
      refetchOnMountOrArgChange: true,
    });
  const [startOnboarding, onboardingState] =
    useStartTenantPaymentConnectOnboardingMutation();
  const [openDashboard, dashboardState] =
    useOpenTenantPaymentConnectDashboardMutation();
  const connection = normalizeTenantPaymentConnect(data);
  const styles = statusStyles[connection.status];
  const StatusIcon = styles.icon;
  const isActionLoading = onboardingState.isLoading || dashboardState.isLoading;

  const redirectToStripe = useCallback(
    async (action) => {
      if (actionInFlight.current) {
        return;
      }

      actionInFlight.current = true;
      setActionError("");

      try {
        const result = await action().unwrap();
        const url = getRedirectUrl(result);

        if (!url) {
          actionInFlight.current = false;
          setActionError(t("messages.invalidRedirect"));
          return;
        }

        window.location.assign(url);
      } catch (requestError) {
        actionInFlight.current = false;
        setActionError(
          getErrorMessage(requestError, t("messages.actionError")),
        );
      }
    },
    [t],
  );

  const startStripeOnboarding = () =>
    redirectToStripe(() =>
      startOnboarding({
        locale: connectLocale,
        ...(guidedSetupStep ? { setupStep: guidedSetupStep } : {}),
      }),
    );
  const openStripeDashboard = () => redirectToStripe(openDashboard);

  const formattedLastSync = formatTimestamp(connection.lastSyncedAt, locale);

  useEffect(() => {
    if (
      connectReturn !== "refresh" ||
      !connection.canManage ||
      refreshHandled.current
    ) {
      return;
    }

    refreshHandled.current = true;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("connect");
    nextUrl.searchParams.delete("stripe_connect");
    window.history.replaceState(
      window.history.state,
      "",
      `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
    );
    redirectToStripe(() =>
      startOnboarding({
        locale: connectLocale,
        ...(guidedSetupStep ? { setupStep: guidedSetupStep } : {}),
      }),
    );
  }, [
    connectReturn,
    connection.canManage,
    connectLocale,
    guidedSetupStep,
    redirectToStripe,
    startOnboarding,
  ]);

  useEffect(() => {
    if (
      !guidedSetup.guided ||
      connection.status !== CONNECT_DISPLAY_STATUSES.ACTIVE ||
      guidedCompletionHandled.current
    ) {
      return;
    }

    guidedCompletionHandled.current = true;
    guidedSetup.refreshAndContinue({
      metadata: { form: "stripe_connect" },
    });
  }, [connection.status, guidedSetup]);

  if (isLoading) {
    return (
      <div
        className="flex min-h-[360px] items-center justify-center"
        role="status"
      >
        <ArrowPathIcon className="h-6 w-6 animate-spin text-cobalt-500" />
        <span className="ml-3 text-[12px] text-[#777773]">{t("loading")}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <section className="space-y-5">
        {showPageHeader ? (
          <header>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
              {t("eyebrow")}
            </p>
            <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-[#111111] sm:text-[34px]">
              {t("title")}
            </h1>
          </header>
        ) : null}
        <div className="rounded-[18px] border border-coral-200 bg-coral-50 p-5">
          <p className="text-xs text-terracotta-700" role="alert">
            {getErrorMessage(error, t("messages.loadError"))}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-3 text-[11px] font-semibold text-terracotta-700 underline underline-offset-2"
          >
            {t("actions.retry")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="space-y-5"
      data-guided-form={guidedSetup.guided ? "payments" : undefined}
    >
      {showPageHeader ? (
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-[#111111] sm:text-[34px]">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-5 text-[#777773]">
            {t("description")}
          </p>
        </header>
      ) : null}

      {actionError && (
        <div
          className="flex gap-3 rounded-[14px] border border-coral-200 bg-coral-50 px-4 py-3 text-xs text-terracotta-700"
          role="alert"
        >
          <ExclamationTriangleIcon
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          {actionError}
        </div>
      )}

      {connectReturn === "return" && !actionError && (
        <div
          className="flex gap-3 rounded-[14px] border border-[#CFE0CB] bg-[#F5FAF3] px-4 py-3 text-xs text-[#47613E]"
          role="status"
        >
          <CheckCircleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("messages.returned")}
        </div>
      )}

      {connectReturn === "refresh" && !connection.canManage && (
        <div
          className="flex gap-3 rounded-[14px] border border-sand-200 bg-sand-50 px-4 py-3 text-xs text-sand-800"
          role="status"
        >
          <LockClosedIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("permissions.refreshReadOnly")}
        </div>
      )}

      <section
        data-contextual-guide-target="payments-status"
        className="relative overflow-hidden rounded-[22px] border border-skab-blue-200 bg-[linear-gradient(135deg,#FFFFFF_0%,var(--color-skab-blue-50)_58%,var(--color-skab-offset-50)_100%)] p-5 shadow-[0_18px_45px_rgb(var(--skab-blue-rgb)/0.07)] sm:p-7"
      >
        <BrushStrokeEdge className="-right-2 -top-12 hidden h-[calc(100%+96px)] w-[clamp(72px,9vw,108px)] opacity-[0.14] sm:block" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cx(
                  "flex h-11 w-11 items-center justify-center rounded-full",
                  styles.iconWrap,
                )}
              >
                <StatusIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span
                className={cx(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                  styles.badge,
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                {t(`statuses.${connection.status}.label`)}
              </span>
              {isFetching && (
                <span className="inline-flex items-center gap-1.5 text-[10px] text-[#777773]">
                  <ArrowPathIcon
                    className="h-3 w-3 animate-spin"
                    aria-hidden="true"
                  />
                  {t("refreshing")}
                </span>
              )}
            </div>
            <h2 className="mt-4 text-[22px] font-semibold tracking-[-0.045em] text-[#181817] sm:text-[26px]">
              {t(`statuses.${connection.status}.title`)}
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-[1.75] text-[#66635E]">
              {t(`statuses.${connection.status}.description`)}
            </p>

            {connection.connected && (
              <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-[#777773]">
                {connection.country && (
                  <div className="flex items-center gap-1.5">
                    <dt>{t("details.country")}</dt>
                    <dd className="font-semibold uppercase text-[#3F3F3B]">
                      {connection.country}
                    </dd>
                  </div>
                )}
                {connection.defaultCurrency && (
                  <div className="flex items-center gap-1.5">
                    <dt>{t("details.currency")}</dt>
                    <dd className="font-semibold uppercase text-[#3F3F3B]">
                      {connection.defaultCurrency}
                    </dd>
                  </div>
                )}
                {formattedLastSync && (
                  <div className="flex items-center gap-1.5">
                    <dt>{t("details.lastChecked")}</dt>
                    <dd className="font-semibold text-[#3F3F3B]">
                      {formattedLastSync}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          {connection.canManage ? (
            <div
              data-contextual-guide-target="payments-onboarding"
              className="flex flex-col items-stretch gap-2 sm:flex-row lg:min-w-[218px] lg:flex-col"
            >
              {connection.status === CONNECT_DISPLAY_STATUSES.NOT_STARTED && (
                <button
                  type="button"
                  onClick={startStripeOnboarding}
                  disabled={isActionLoading}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white shadow-cobalt transition hover:-translate-y-0.5 hover:bg-cobalt-600 disabled:pointer-events-none disabled:opacity-55"
                >
                  {onboardingState.isLoading ? (
                    <ArrowPathIcon
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <CreditCardIcon className="h-4 w-4" aria-hidden="true" />
                  )}
                  {onboardingState.isLoading
                    ? t("actions.redirecting")
                    : t("actions.connect")}
                </button>
              )}

              {[
                CONNECT_DISPLAY_STATUSES.PENDING,
                CONNECT_DISPLAY_STATUSES.RESTRICTED,
              ].includes(connection.status) && (
                <button
                  type="button"
                  onClick={startStripeOnboarding}
                  disabled={isActionLoading}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white shadow-cobalt transition hover:-translate-y-0.5 hover:bg-cobalt-600 disabled:pointer-events-none disabled:opacity-55"
                >
                  {onboardingState.isLoading ? (
                    <ArrowPathIcon
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowTopRightOnSquareIcon
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  )}
                  {onboardingState.isLoading
                    ? t("actions.redirecting")
                    : t("actions.continue")}
                </button>
              )}

              {!guidedSetup.guided &&
                connection.status === CONNECT_DISPLAY_STATUSES.ACTIVE && (
                  <button
                    type="button"
                    onClick={openStripeDashboard}
                    disabled={isActionLoading}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-primary px-5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-55"
                  >
                    {dashboardState.isLoading ? (
                      <ArrowPathIcon
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <ArrowTopRightOnSquareIcon
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    )}
                    {dashboardState.isLoading
                      ? t("actions.opening")
                      : t("actions.openStripe")}
                  </button>
                )}

              {!guidedSetup.guided &&
                connection.status !== CONNECT_DISPLAY_STATUSES.ACTIVE &&
                ["full", "express"].includes(connection.dashboardType) && (
                  <button
                    type="button"
                    onClick={openStripeDashboard}
                    disabled={isActionLoading}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#C9C7C1] bg-white px-5 text-xs font-semibold text-[#292925] transition hover:-translate-y-0.5 hover:border-[#A8A49D] disabled:pointer-events-none disabled:opacity-55"
                  >
                    <ArrowTopRightOnSquareIcon
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                    {t("actions.openStripe")}
                  </button>
                )}
            </div>
          ) : (
            <div className="max-w-[260px] rounded-[15px] border border-[#DDD9D1] bg-white/80 p-4 text-[11px] leading-5 text-[#66635E]">
              <LockClosedIcon
                className="mb-2 h-4 w-4 text-[#77736D]"
                aria-hidden="true"
              />
              {t("permissions.readOnly")}
            </div>
          )}
        </div>
      </section>

      {!guidedSetup.guided ? (
        <section
          data-contextual-guide-target="payments-capabilities"
          className="overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_38px_rgba(17,17,15,0.04)]"
        >
          <div className="border-b border-line bg-surface-muted px-5 py-4 sm:px-6">
            <h2 className="text-[13px] font-semibold text-[#292925]">
              {t("capabilities.title")}
            </h2>
            <p className="mt-1 text-[11px] leading-4 text-[#777773]">
              {t("capabilities.description")}
            </p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
            <CapabilityCard
              enabled={connection.chargesEnabled}
              icon={CreditCardIcon}
              label={t("capabilities.charges.title")}
              description={t("capabilities.charges.description")}
              t={t}
            />
            <CapabilityCard
              enabled={connection.payoutsEnabled}
              icon={BanknotesIcon}
              label={t("capabilities.payouts.title")}
              description={t("capabilities.payouts.description")}
              t={t}
            />
          </div>
        </section>
      ) : null}

      <div
        className={
          guidedSetup.guided ? "space-y-5" : "grid gap-5 lg:grid-cols-2"
        }
      >
        {!guidedSetup.guided ? (
          <SetupChecklist connection={connection} t={t} />
        ) : null}

        <section className="rounded-[20px] border border-skab-blue-200 bg-skab-blue-50 p-5 shadow-[0_14px_38px_rgba(17,17,15,0.035)] sm:p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cobalt-100 text-cobalt-700">
            <ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-[17px] font-semibold tracking-[-0.035em] text-[#292925]">
            {t("security.title")}
          </h2>
          <p className="mt-2 text-[11px] leading-[1.7] text-[#66635E]">
            {t("security.description")}
          </p>
          {!guidedSetup.guided ? (
            <ul className="mt-4 space-y-3">
              {[
                [IdentificationIcon, "identity"],
                [LockClosedIcon, "storage"],
                [GlobeAltIcon, "global"],
              ].map(([Icon, key]) => (
                <li
                  key={key}
                  className="flex gap-3 text-[11px] leading-[1.6] text-[#55524E]"
                >
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-cobalt-600"
                    aria-hidden="true"
                  />
                  <span>{t(`security.items.${key}`)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-5 rounded-[14px] border border-skab-blue-200 bg-white/75 p-4 text-[10px] leading-4 text-[#77736D]">
            {t("security.note")}
          </div>
        </section>
      </div>
    </section>
  );
}
