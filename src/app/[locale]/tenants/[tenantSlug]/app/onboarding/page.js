"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightIcon, CheckIcon } from "@heroicons/react/20/solid";
import { useLocale, useTranslations } from "next-intl";
import { useDispatch, useSelector } from "react-redux";

import { useRouter } from "@/i18n/navigation";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingSidebar } from "@/components/onboarding/OnboardingSidebar";
import { StepHeading } from "@/components/onboarding/StepHeading";
import { navigateToLaunchCenter } from "@/components/onboarding/onboardingNavigation";
import { INITIAL_ONBOARDING_FORM } from "@/components/onboarding/onboarding.constants";
import { BusinessStep } from "@/components/onboarding/steps/BusinessStep";
import { StudioStep } from "@/components/onboarding/steps/StudioStep";
import { Button } from "@/components/ui/buttons/Button";
import { PLATFORM_AUTH_VIEWPORT_HEIGHT } from "@/components/auth/platformAuthLayout";
import authLayoutStyles from "@/components/auth/platformAuthLayout.module.css";
import styles from "@/components/onboarding/onboarding.module.css";
import "@/styles/publicStudioTheme.css";
import { InlineNotice } from "@/components/ui/form/InlineNotice";
import {
  markTenantOnboardingComplete,
  selectIsAuthenticated,
} from "@/lib/features/auth/authSlice";
import { setActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import {
  useCompleteCurrentTenantOnboardingMutation,
  useGetCurrentTenantOnboardingQuery,
  useSaveCurrentTenantOnboardingMutation,
} from "@/lib/features/tenants/tenantApiSlice";

const getApiErrorMessage = (error, fallback) =>
  getLocalizedApiErrorMessage(error, fallback);

export default function TenantOnboardingPage() {
  const locale = useLocale();
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const {
    data,
    error: loadError,
    isLoading,
    isFetching,
    refetch,
  } = useGetCurrentTenantOnboardingQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: true,
  });
  const [saveStep, { isLoading: isSaving }] =
    useSaveCurrentTenantOnboardingMutation();
  const [complete, { isLoading: isCompleting }] =
    useCompleteCurrentTenantOnboardingMutation();

  const [form, setForm] = useState(INITIAL_ONBOARDING_FORM);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef(null);
  const launchCenterNavigationStartedRef = useRef(false);
  const navigateToLaunchCenterOnce = useCallback(() => {
    if (launchCenterNavigationStartedRef.current) return;

    navigateToLaunchCenter({ locale });
    launchCenterNavigationStartedRef.current = true;
  }, [locale]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!data) return;

    const onboarding = data.onboarding ?? {};

    if (onboarding.completed) {
      navigateToLaunchCenterOnce();
      return;
    }

    // The API remains the source of truth for tenants that started the older
    // multi-step flow, while the new launch form only asks for essentials.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((current) => ({
      ...current,
      studioName: data.tenant?.name || "",
      currency: data.tenant?.settings?.currency || current.currency,
      timezone: data.tenant?.settings?.timezone || current.timezone,
      businessType: onboarding.businessType || current.businessType,
      country: onboarding.businessDetails?.country || current.country,
    }));
  }, [data, navigateToLaunchCenterOnce]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const fieldErrors = useMemo(() => {
    const validationErrors = {};

    if (!form.studioName.trim()) {
      validationErrors.studioName = t("validation.studioName");
    }
    if (!form.businessType) {
      validationErrors.businessType = t("validation.businessType");
    }
    if (!form.country.trim()) {
      validationErrors.country = t("validation.country");
    }
    if (!form.timezone) {
      validationErrors.timezone = t("validation.timezone");
    }
    if (!form.currency) {
      validationErrors.currency = t("validation.currency");
    }

    return validationErrors;
  }, [form, t]);

  const focusError = () => {
    window.requestAnimationFrame(() => errorRef.current?.focus());
  };

  const submit = async (event) => {
    event.preventDefault();
    setAttemptedSubmit(true);

    if (Object.keys(fieldErrors).length > 0) {
      setError(t("validation.completeRequired"));
      focusError();
      return;
    }

    try {
      setError("");

      await saveStep({
        step: 1,
        tenantName: form.studioName.trim(),
        businessType: form.businessType,
      }).unwrap();

      await saveStep({
        step: 2,
        businessDetails: {
          country: form.country.trim(),
        },
        settings: {
          currency: form.currency,
          timezone: form.timezone,
        },
      }).unwrap();

      const response = await complete().unwrap();
      const primaryLocationId =
        response?.primaryLocation?._id || response?.primaryLocation?.id;
      const tenantId = response?.tenant?.id || data?.tenant?.id;

      if (primaryLocationId && tenantId) {
        dispatch(
          setActiveStudioId({
            tenantId: String(tenantId),
            studioId: String(primaryLocationId),
          }),
        );
      }

      dispatch(markTenantOnboardingComplete());
      navigateToLaunchCenterOnce();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("errors.save")));
      focusError();
    }
  };

  if (!isAuthenticated || isLoading) {
    return (
      <PageState onExit={() => router.push("/")} status>
        {t("status.preparing")}
      </PageState>
    );
  }

  if (loadError) {
    return (
      <PageState onExit={() => router.push("/")}>
        <InlineNotice className={styles.error} variant="error">
          {getApiErrorMessage(loadError, t("errors.load"))}
        </InlineNotice>
        <Button
          variant="secondary"
          size="md"
          onClick={refetch}
          className={`${styles.retry} mt-4`}
        >
          {t("actions.retry")}
        </Button>
      </PageState>
    );
  }

  const isSubmitting = isSaving || isCompleting;
  const visibleFieldErrors = attemptedSubmit ? fieldErrors : {};

  return (
    <OnboardingShell onExit={() => router.push("/")}>
      <form
        aria-busy={isSubmitting || isFetching}
        aria-labelledby="onboarding-title"
        className={`${styles.card} mx-auto my-auto w-full min-w-0 max-w-[620px] p-6 sm:p-8 [@media(max-height:800px)]:p-5`}
        data-onboarding-card
        noValidate
        onSubmit={submit}
      >
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <StepHeading />

        <div
          className={`${styles.rule} my-5 border-t [@media(max-height:800px)]:my-3`}
        />

        <StudioStep
          errors={visibleFieldErrors}
          form={form}
          setField={setField}
        />
        <div
          className={`${styles.rule} my-5 border-t [@media(max-height:800px)]:my-3`}
        />
        <BusinessStep
          errors={visibleFieldErrors}
          form={form}
          setField={setField}
        />

        {error ? (
          <p
            aria-live="assertive"
            className={`${styles.error} mt-5 px-4 py-3 text-sm leading-6 [@media(max-height:800px)]:mt-3 [@media(max-height:800px)]:py-2`}
            ref={errorRef}
            role="alert"
            tabIndex={-1}
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          fullWidth
          loading={isSubmitting}
          disabled={isFetching}
          className={`${styles.submit} mt-5 [@media(max-height:800px)]:mt-3`}
          data-onboarding-submit
          trailingIcon={
            !isSubmitting ? <ArrowRightIcon className="size-4" /> : null
          }
        >
          {t("actions.openLaunchCenter")}
        </Button>

        <p
          className={`${styles.muted} mt-4 flex items-center justify-center gap-2 text-center text-xs leading-5 [@media(max-height:800px)]:mt-3 [@media(max-height:650px)]:hidden`}
        >
          <span
            className={`${styles.successIcon} grid size-5 shrink-0 place-items-center`}
          >
            <CheckIcon aria-hidden="true" className="size-3" />
          </span>
          {t("actions.sensibleDefaults")}
        </p>
      </form>
    </OnboardingShell>
  );
}

function OnboardingShell({ children, onExit }) {
  return (
    <main
      className={`${authLayoutStyles.viewport} ${styles.surface} relative isolate -mt-[var(--header-height)] overflow-x-clip`}
      data-onboarding-page
      data-skab-public-surface
      style={{ minHeight: PLATFORM_AUTH_VIEWPORT_HEIGHT }}
    >
      <OnboardingHeader onExit={onExit} />

      <div
        className={`${authLayoutStyles.viewport} grid grid-cols-[minmax(0,1fr)] items-start xl:grid-cols-2`}
        data-onboarding-grid
        style={{ minHeight: PLATFORM_AUTH_VIEWPORT_HEIGHT }}
      >
        <section
          className={`${authLayoutStyles.viewport} relative z-10 flex min-w-0 flex-col px-4 pb-5 pt-[calc(var(--platform-auth-header-height)+1rem)] sm:px-8 sm:pb-7 sm:pt-[calc(var(--platform-auth-header-height)+1.25rem)] lg:px-10 xl:px-12 xl:pb-8 xl:pt-[calc(var(--platform-auth-header-height)+1.5rem)] 2xl:px-14 [@media(max-height:800px)]:pb-3 [@media(max-height:800px)]:pt-[calc(var(--platform-auth-header-height)+0.75rem)]`}
          data-onboarding-left
        >
          {children}
        </section>

        <OnboardingSidebar />
      </div>
    </main>
  );
}

function PageState({ children, onExit, status = false }) {
  return (
    <OnboardingShell onExit={onExit}>
      <div
        className={`${styles.stateCard} mx-auto my-auto w-full max-w-[520px] p-6 text-center sm:p-8`}
        data-onboarding-state
      >
        {status ? (
          <p aria-live="polite" role="status">
            {children}
          </p>
        ) : (
          children
        )}
      </div>
    </OnboardingShell>
  );
}
