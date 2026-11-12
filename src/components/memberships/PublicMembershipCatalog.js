"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import { Link, useRouter } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectIsAuthenticated,
} from "@/lib/features/auth/authSlice";
import {
  useCreateMembershipCheckoutMutation,
  useGetPublicMembershipCatalogQuery,
  useGetMyMembershipQuery,
} from "@/lib/features/memberships/membershipsApiSlice";
import {
  createIdempotencyKey,
  formatBenefitValue,
  formatPlanPrice,
  getEntityId,
  getLocalizedMembershipText,
  getPlanBenefits,
  getPlanLocations,
  getPlanPrices,
  getPlanVersion,
  normalizePlans,
  planAppliesToLocation,
} from "./membership.utils";
import { usePublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import {
  getLocalizedPublicTenantText,
  getPublicTenantTheme,
} from "@/components/public-tenant/publicTenant.config";
import { getPublicWebsitePageCustomizationDefaults } from "@/components/customer-shell/customerFacingCustomizationDefaults";
import { getSafeCheckoutUrl } from "@/utils/checkoutUrl";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import { retainCustomerPortalLocation } from "@/utils/customerPortalLocation";
import {
  createPlanChangeIntent,
  MembershipPlanChangeDialog,
  ScheduledMembershipPlanChange,
} from "./MembershipPlanChange";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function PublicMembershipCatalog({
  previewData,
  customerContext,
}) {
  const t = useTranslations("Memberships.catalog");
  const commonT = useTranslations("Memberships.common");
  const benefitT = useTranslations("Memberships.benefits");
  const changeT = useTranslations("Memberships.planChange");
  const locale = useLocale();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { tenant: publicTenant } = usePublicTenant();
  const tenantSlug = String(params?.tenantSlug || "").trim();
  const previewMode = previewData && typeof previewData === "object";
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentTenant = useSelector(selectCurrentTenant);
  const checkMembership =
    !previewMode &&
    isAuthenticated &&
    String(currentTenant?.slug || "").trim() === tenantSlug;
  const membershipQuery = useGetMyMembershipQuery(undefined, {
    skip: !checkMembership,
    refetchOnMountOrArgChange: true,
  });
  const membership = checkMembership
    ? (membershipQuery.data?.membership ?? membershipQuery.data?.data ?? null)
    : null;
  const hasOpenMembership = Boolean(
    membership && !["cancelled", "expired"].includes(membership.status),
  );
  const membershipPending =
    checkMembership &&
    (membershipQuery.isLoading ||
      membershipQuery.isFetching ||
      membershipQuery.isUninitialized);
  const membershipUnavailable =
    checkMembership && Boolean(membershipQuery.isError);
  const canChangePlan =
    hasOpenMembership && membership.canSchedulePlanChange === true;
  const [changeIntent, setChangeIntent] = useState(null);
  const membershipIdentity =
    checkMembership && membership
      ? `${getEntityId(currentTenant)}:${getEntityId(membership)}`
      : "";
  // An authorization refresh must never retarget an already accepted intent.
  const currentChangeIntent =
    changeIntent?.membershipIdentity === membershipIdentity && canChangePlan
      ? changeIntent
      : null;
  const fetchedQuery = useGetPublicMembershipCatalogQuery(
    { tenantSlug },
    { skip: previewMode || Boolean(customerContext) || !tenantSlug },
  );
  const query = previewMode
    ? {
        data: previewData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: () => undefined,
      }
    : customerContext?.query || fetchedQuery;
  const [createCheckout, checkoutState] = useCreateMembershipCheckoutMutation();
  const plans = normalizePlans(query.data);
  const tenant = query.data?.tenant || {};
  const page = publicTenant.publicSite.pages.memberships;
  const theme = getPublicTenantTheme(
    publicTenant,
    customerContext ? { surface: "portal" } : undefined,
  );
  const customizationDefaults = getPublicWebsitePageCustomizationDefaults({
    page: "memberships",
    locale,
    studio: publicTenant.publicSite.branding.displayName || tenant.name || "",
  });
  const pageTitle = getLocalizedPublicTenantText(
    page.title,
    locale,
    customizationDefaults.title,
  );
  const pageDescription = getLocalizedPublicTenantText(
    page.description,
    locale,
    customizationDefaults.description,
  );
  const responseLocations = query.data?.locations;
  const locations = useMemo(
    () => (Array.isArray(responseLocations) ? responseLocations : []),
    [responseLocations],
  );

  // New purchases use the studio's primary currency. Existing subscriptions
  // retain their contracted currency, matching the server's renewal quote.
  // A URL parameter must never select a different currency.
  const selectedCurrency = String(
    (hasOpenMembership && membership.currency) ||
      tenant.currency ||
      publicTenant.settings?.currency ||
      DEFAULT_STUDIO_COMMERCE_CURRENCY,
  ).toUpperCase();
  const pricedPlans = useMemo(
    () =>
      plans.filter((plan) =>
        getPlanPrices(plan).some(
          (price) => price.currency === selectedCurrency,
        ),
      ),
    [plans, selectedCurrency],
  );
  const locationOptions = useMemo(() => {
    const locationsById = new Map(
      locations.map((location) => [getEntityId(location), location]),
    );
    return [...new Set(pricedPlans.flatMap(getPlanLocations))].map(
      (id, index) => ({
        id,
        name:
          locationsById.get(id)?.name ||
          t("locationFallback", { number: index + 1 }),
      }),
    );
  }, [locations, pricedPlans, t]);
  // Shared/all-location memberships need no purchase location. Only show a
  // selector when it changes the available plans or is required to choose the
  // one location of a location-specific membership.
  const showLocationSelector =
    !customerContext &&
    locationOptions.length > 1 &&
    (pricedPlans.some(
      (plan) =>
        getPlanVersion(plan)?.locationScope?.type === "selected" &&
        getPlanLocations(plan).length > 1,
    ) ||
      locationOptions.some((location) =>
        pricedPlans.some((plan) => !planAppliesToLocation(plan, location.id)),
      ));
  const [locationId, setLocationId] = useState(() =>
    customerContext
      ? customerContext.locationId
      : searchParams.get("locationId") || "",
  );
  const [checkoutError, setCheckoutError] = useState("");
  const checkoutKeys = useRef(new Map());
  const selectedPlanId = String(searchParams.get("planId") || "").trim();
  const selectedPlanVersionId = String(
    searchParams.get("planVersionId") || "",
  ).trim();

  useEffect(() => {
    if (searchParams.get("checkout") !== "cancelled" || !tenantSlug) return;

    checkoutKeys.current.clear();

    try {
      const prefix = `shario:membership-checkout:${tenantSlug}:`;

      for (
        let index = window.sessionStorage.length - 1;
        index >= 0;
        index -= 1
      ) {
        const key = window.sessionStorage.key(index);

        if (key?.startsWith(prefix)) {
          window.sessionStorage.removeItem(key);
        }
      }
    } catch {
      // Session storage can be unavailable in strict privacy modes.
    }
  }, [searchParams, tenantSlug]);

  const effectiveLocationId = customerContext
    ? customerContext.locationId
    : showLocationSelector
      ? locationId
      : "";

  const visiblePlans = useMemo(() => {
    const filtered = pricedPlans.filter((plan) =>
      planAppliesToLocation(plan, effectiveLocationId),
    );

    return [...filtered].sort((left, right) => {
      const leftSelected =
        getEntityId(left) === selectedPlanId &&
        (!selectedPlanVersionId ||
          getEntityId(getPlanVersion(left)) === selectedPlanVersionId);
      const rightSelected =
        getEntityId(right) === selectedPlanId &&
        (!selectedPlanVersionId ||
          getEntityId(getPlanVersion(right)) === selectedPlanVersionId);

      return Number(rightSelected) - Number(leftSelected);
    });
  }, [effectiveLocationId, pricedPlans, selectedPlanId, selectedPlanVersionId]);

  const beginCheckout = async (plan, termsAccepted) => {
    if (previewMode) return;
    setCheckoutError("");
    const authenticatedTenantSlug = String(currentTenant?.slug || "").trim();
    if (!isAuthenticated || authenticatedTenantSlug !== tenantSlug) {
      const nextSearch = new URLSearchParams({ currency: selectedCurrency });
      if (customerContext?.locationReference) {
        nextSearch.set("location", customerContext.locationReference);
      } else if (effectiveLocationId) {
        nextSearch.set("locationId", effectiveLocationId);
      }
      nextSearch.set("planId", getEntityId(plan));
      nextSearch.set("planVersionId", getEntityId(getPlanVersion(plan)));
      router.push(
        `/login?next=${encodeURIComponent(`${customerContext ? "/portal/membership/plans" : "/memberships"}?${nextSearch.toString()}`)}`,
      );
      return;
    }

    const planLocations =
      getPlanVersion(plan)?.locationScope?.type === "selected"
        ? getPlanLocations(plan)
        : [];
    const selectedLocation = planLocations.length
      ? effectiveLocationId ||
        (planLocations.length === 1 ? planLocations[0] : "")
      : "";
    if (planLocations.length > 1 && !selectedLocation) {
      setCheckoutError(t("chooseLocationError"));
      return;
    }

    // Browsing never creates another subscription for an existing member.
    // The server authorizes a separate, next-renewal change operation.
    if (membershipPending || membershipUnavailable) return;
    if (hasOpenMembership) {
      if (
        !canChangePlan ||
        getEntityId(membership.planId || membership.plan) === getEntityId(plan)
      )
        return;
      const billing = getPlanVersion(plan)?.billing;
      if (
        billing?.type !== "recurring" ||
        billing.interval !== "month" ||
        Number(billing.intervalCount || 1) !== 1
      )
        return;
      if (!termsAccepted) {
        setCheckoutError(changeT("termsRequired"));
        return;
      }
      setChangeIntent({
        ...createPlanChangeIntent(
          plan,
          getPlanPrices(plan).find(
            (price) => price.currency === selectedCurrency,
          ),
          selectedLocation,
        ),
        membershipIdentity,
      });
      return;
    }

    try {
      const checkoutIntent = [
        getEntityId(plan),
        getEntityId(getPlanVersion(plan)),
        selectedCurrency,
        selectedLocation,
      ].join(":");
      let idempotencyKey = checkoutKeys.current.get(checkoutIntent);
      const storageKey = `shario:membership-checkout:${tenantSlug}:${checkoutIntent}`;
      if (!idempotencyKey) {
        try {
          idempotencyKey = window.sessionStorage.getItem(storageKey) || "";
        } catch {
          // Session storage is optional; the in-memory key still prevents
          // duplicate requests during this catalog visit.
        }
      }
      if (!idempotencyKey) {
        idempotencyKey = createIdempotencyKey("membership-checkout");
        checkoutKeys.current.set(checkoutIntent, idempotencyKey);
        try {
          window.sessionStorage.setItem(storageKey, idempotencyKey);
        } catch {
          // Some privacy modes disable session storage.
        }
      }
      const response = await createCheckout({
        planId: getEntityId(plan),
        planVersionId: getEntityId(getPlanVersion(plan)),
        currency: selectedCurrency,
        ...(selectedLocation ? { locationId: selectedLocation } : {}),
        locale,
        origin: window.location.origin,
        termsAccepted,
        idempotencyKey,
      }).unwrap();
      const checkout = response?.checkout || response;
      const checkoutUrl = getSafeCheckoutUrl(checkout?.url);
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }
      if (checkout?.sessionId) {
        router.push(
          `/memberships/checkout/success?session_id=${encodeURIComponent(checkout.sessionId)}`,
        );
        return;
      }
      setCheckoutError(t("checkoutError"));
    } catch {
      setCheckoutError(t("checkoutError"));
    }
  };

  return (
    <main
      className="min-h-dvh px-4 pb-20 pt-12 sm:px-6 lg:px-8"
      data-tenant-layout="section"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textForeground,
      }}
    >
      <section className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[var(--tenant-label-color)]"
            data-tenant-type="eyebrow"
          >
            {t("eyebrow")}
          </p>
          <h1
            className="mt-3 text-4xl font-semibold tracking-[-0.055em] text-[var(--tenant-text)] sm:text-6xl"
            data-tenant-type="display"
            data-public-site-edit-path={`pages.memberships.title.${locale}`}
          >
            {pageTitle}
          </h1>
          <p
            className="mt-4 max-w-2xl text-[12px] leading-6 text-[var(--tenant-muted-text)] sm:text-sm"
            data-public-site-edit-path={`pages.memberships.description.${locale}`}
          >
            {pageDescription}
          </p>
        </header>

        {hasOpenMembership ? (
          <div className="mt-6 text-sm text-[var(--tenant-muted-text)]">
            {!canChangePlan && !membership.scheduledPlanChange ? (
              <p>{changeT("unavailable")}</p>
            ) : null}
            <Link
              href={retainCustomerPortalLocation(
                "/portal/membership",
                customerContext?.locationReference ||
                  searchParams.get("location"),
              )}
              className="mt-3 inline-flex font-semibold text-[var(--tenant-accent-link)] underline underline-offset-4"
            >
              {changeT("manage")}
            </Link>
          </div>
        ) : null}
        <ScheduledMembershipPlanChange
          membership={membership}
          portal={Boolean(customerContext)}
          onChanged={membershipQuery.refetch}
        />
        {membershipPending ? (
          <p role="status" className="mt-5 text-sm">
            {changeT("loading")}
          </p>
        ) : null}
        {membershipUnavailable ? (
          <div
            role="alert"
            className="mt-5 rounded-xl bg-danger-soft p-4 text-sm text-danger"
          >
            <p>{changeT("loadError")}</p>
            <button
              type="button"
              className="mt-2 font-semibold underline"
              onClick={membershipQuery.refetch}
            >
              {commonT("retry")}
            </button>
          </div>
        ) : null}

        {query.isLoading ? (
          <div
            className="mt-8 flex min-h-80 items-center justify-center rounded-[25px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[11px] text-[var(--tenant-muted-on-surface)]"
            data-tenant-surface="card"
            role="status"
          >
            <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
            {t("loading")}
          </div>
        ) : query.isError ? (
          <div
            className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-[25px] border border-danger/20 bg-danger-soft px-6 text-center"
            data-tenant-surface="card"
          >
            <p className="text-[11px] font-semibold text-danger">
              {t("loadError")}
            </p>
            <button
              type="button"
              onClick={query.refetch}
              data-tenant-button="primary"
              className="mt-4 rounded-full bg-[var(--tenant-accent)] px-5 py-2.5 text-[10px] font-semibold text-[var(--tenant-accent-foreground)]"
            >
              {commonT("retry")}
            </button>
          </div>
        ) : plans.length ? (
          <>
            {showLocationSelector ? (
              <div
                className="mt-8 flex flex-col gap-3 rounded-[19px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-3 text-[var(--tenant-text-on-surface)] sm:flex-row sm:items-center"
                data-tenant-surface="panel"
              >
                <label className="flex-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--tenant-accent-on-surface)]">
                  {t("location")}
                  <select
                    value={locationId}
                    onChange={(event) => setLocationId(event.target.value)}
                    data-tenant-surface="field"
                    className="mt-1.5 min-h-11 w-full rounded-[13px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-3.5 text-[11px] normal-case tracking-normal text-[var(--tenant-text)] outline-none focus:border-[var(--tenant-accent-link)] focus:ring-2 focus:ring-[var(--tenant-accent-link)]/20"
                  >
                    <option value="">{t("allLocations")}</option>
                    {locationOptions.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
            {checkoutError ? (
              <p
                className="mt-4 rounded-[14px] border border-danger/20 bg-danger-soft px-4 py-3 text-[10px] text-danger"
                role="alert"
              >
                {checkoutError}
              </p>
            ) : null}
            {visiblePlans.length ? (
              <div
                className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3"
                data-tenant-content
              >
                {visiblePlans.map((plan) => (
                  <CatalogCard
                    key={`${getEntityId(plan)}:${getEntityId(getPlanVersion(plan))}:${locale}:${getLocalizedMembershipText(getPlanVersion(plan), "terms", locale)}`}
                    plan={plan}
                    currency={selectedCurrency}
                    locations={locations}
                    locale={locale}
                    t={t}
                    benefitT={benefitT}
                    changeT={changeT}
                    current={
                      hasOpenMembership &&
                      getEntityId(membership.planId || membership.plan) ===
                        getEntityId(plan)
                    }
                    scheduled={
                      hasOpenMembership &&
                      membership.scheduledPlanChange?.planId ===
                        getEntityId(plan)
                    }
                    changeMode={hasOpenMembership}
                    actionDisabled={
                      membershipPending ||
                      membershipUnavailable ||
                      (hasOpenMembership &&
                        (!canChangePlan ||
                          getPlanVersion(plan)?.billing?.type !== "recurring" ||
                          getPlanVersion(plan)?.billing?.interval !== "month" ||
                          Number(
                            getPlanVersion(plan)?.billing?.intervalCount || 1,
                          ) !== 1))
                    }
                    busy={checkoutState.isLoading}
                    selected={
                      getEntityId(plan) === selectedPlanId &&
                      (!selectedPlanVersionId ||
                        getEntityId(getPlanVersion(plan)) ===
                          selectedPlanVersionId)
                    }
                    onChoose={(termsAccepted) =>
                      beginCheckout(plan, termsAccepted)
                    }
                  />
                ))}
              </div>
            ) : (
              <div
                className="mt-5 flex min-h-64 items-center justify-center rounded-[22px] border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-6 text-center text-[11px] text-[var(--tenant-muted-on-surface)]"
                data-tenant-surface="card"
              >
                {t("noMatch")}
              </div>
            )}
          </>
        ) : (
          <div
            className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-[25px] border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-6 text-center text-[var(--tenant-text-on-surface)]"
            data-tenant-surface="card"
          >
            <IdentificationIcon className="h-10 w-10 text-[var(--tenant-accent-on-surface)]" />
            <h2
              className="mt-4 text-[16px] font-semibold"
              data-tenant-type="display"
            >
              {t("empty.title")}
            </h2>
            <p className="mt-2 max-w-md text-[10px] leading-5 text-[var(--tenant-muted-on-surface)]">
              {t("empty.description")}
            </p>
          </div>
        )}
      </section>
      {currentChangeIntent ? (
        <MembershipPlanChangeDialog
          intent={currentChangeIntent}
          membership={membership}
          portal={Boolean(customerContext)}
          onClose={() => setChangeIntent(null)}
          onSuccess={() => {
            setChangeIntent(null);
            membershipQuery.refetch();
          }}
        />
      ) : null}
    </main>
  );
}

function CatalogCard({
  plan,
  locations,
  currency,
  locale,
  t,
  benefitT,
  busy,
  selected,
  onChoose,
  changeT,
  current,
  scheduled,
  changeMode,
  actionDisabled,
}) {
  const version = getPlanVersion(plan);
  const price = getPlanPrices(plan).find(
    (value) => value.currency === currency,
  );
  const benefits = getPlanBenefits(plan);
  const name = getLocalizedMembershipText(version, "name", locale);
  const description = getLocalizedMembershipText(
    version,
    "description",
    locale,
  );
  const terms = getLocalizedMembershipText(version, "terms", locale);
  const billing = version?.billing || {};
  const [termsAccepted, setTermsAccepted] = useState(false);
  return (
    <article
      className={cx(
        "flex flex-col rounded-[24px] border bg-[var(--tenant-surface)] p-6 text-[var(--tenant-text-on-surface)] shadow-[0_14px_42px_rgba(17,17,15,0.04)]",
        selected
          ? "border-[var(--tenant-accent-on-surface)] ring-2 ring-[var(--tenant-accent-on-surface)]/15"
          : "border-[var(--tenant-border)]",
      )}
      data-tenant-layout="card"
      data-tenant-surface="card"
    >
      {current || scheduled ? (
        <p className="mb-3 rounded-full bg-[var(--tenant-background)] px-3 py-2 text-center text-xs font-semibold text-[var(--tenant-accent-link)]">
          {changeT(current ? "currentPlan" : "scheduledPlan")}
        </p>
      ) : null}
      {selected ? (
        <p className="mb-3 rounded-full bg-[color-mix(in_srgb,var(--tenant-accent)_9%,transparent)] px-3 py-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--tenant-accent-on-surface)]">
          {t("selectionRestored")}
        </p>
      ) : null}
      <p
        className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--tenant-accent-on-surface)]"
        data-tenant-type="eyebrow"
      >
        {billing.type === "fixed"
          ? t("fixedDuration", { days: billing.durationDays || 0 })
          : t(billing.interval === "year" ? "yearly" : "monthly")}
      </p>
      <h2
        className="mt-2 text-2xl font-semibold tracking-[-0.04em]"
        data-tenant-type="display"
      >
        {name}
      </h2>
      {description ? (
        <p className="mt-3 text-[10px] leading-5 text-[var(--tenant-muted-on-surface)]">
          {description}
        </p>
      ) : null}
      <p className="mt-5 text-3xl font-semibold tracking-[-0.045em] text-[var(--tenant-text-on-surface)]">
        {formatPlanPrice(price, locale)}
      </p>
      {billing.type === "recurring" && price ? (
        <p className="mt-2 text-xs leading-5 text-[var(--tenant-muted-on-surface)]">
          {t(
            billing.interval === "year"
              ? "recurringYearDisclosure"
              : "recurringMonthDisclosure",
            {
              amount: formatPlanPrice(price, locale),
              count: Number(billing.intervalCount || 1),
            },
          )}
        </p>
      ) : null}
      {version?.locationScope?.type === "shared_selected" ? (
        <p className="mt-3 text-[10px] leading-5 text-[var(--tenant-muted-on-surface)]">
          {benefitT("sharedLocations", {
            locations: getPlanLocations(plan)
              .map(
                (id) =>
                  locations.find((location) => getEntityId(location) === id)
                    ?.name || id,
              )
              .join(", "),
          })}
        </p>
      ) : null}
      <div className="mt-5 flex-1 space-y-3 border-t border-[var(--tenant-border)] pt-5">
        {benefits.map((benefit) => (
          <div
            key={benefit.key}
            className="flex items-start gap-2.5 text-[10px] leading-5 text-[var(--tenant-muted-on-surface)]"
          >
            <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tenant-accent-on-surface)]" />
            <span>
              <strong className="font-semibold text-[var(--tenant-text-on-surface)]">
                {getLocalizedMembershipText(
                  benefit,
                  "label",
                  locale,
                  version.sourceLanguage,
                )}
              </strong>
              <br />
              {formatBenefitValue(benefit, benefitT, locale)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-5 rounded-[14px] bg-[var(--tenant-background)] px-3.5 py-3 text-[9px] leading-4 text-[var(--tenant-muted-text)]">
        {benefits.some(
          (benefit) => benefit.unit === "minute" && benefit.memberOnly,
        )
          ? benefitT("timeTrackingNotice")
          : t("trackingNotice")}
      </p>
      {terms ? (
        <>
          <details className="mt-3 text-[9px] leading-4 text-[var(--tenant-muted-on-surface)]">
            <summary className="cursor-pointer font-semibold text-[var(--tenant-text-on-surface)]">
              {t("terms")}
            </summary>
            <p className="mt-2 whitespace-pre-wrap">{terms}</p>
          </details>
          {!current && !scheduled && !actionDisabled ? (
            <label className="mt-3 flex items-start gap-2.5 rounded-[13px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-3 py-3 text-[9px] leading-4 text-[var(--tenant-text)]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
              />
              <span>{t("acceptTerms")}</span>
            </label>
          ) : null}
        </>
      ) : null}
      <button
        type="button"
        onClick={() => onChoose(!terms || termsAccepted)}
        disabled={
          busy ||
          actionDisabled ||
          current ||
          scheduled ||
          !price ||
          Boolean(terms && !termsAccepted)
        }
        data-tenant-button="primary"
        className={cx(
          "mt-5 min-h-12 rounded-full bg-[var(--tenant-accent)] px-5 text-[11px] font-semibold text-[var(--tenant-accent-foreground)] transition hover:brightness-[0.97] disabled:opacity-50",
        )}
      >
        {current
          ? changeT("currentPlan")
          : scheduled
            ? changeT("scheduledPlan")
            : busy
              ? t("startingCheckout")
              : changeMode
                ? changeT("choose")
                : t("choosePlan")}
      </button>
    </article>
  );
}
