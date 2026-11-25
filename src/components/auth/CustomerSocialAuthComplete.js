"use client";

import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useStore } from "react-redux";

import { resolveCustomerAuthLocale } from "@/components/auth/customerAuthLocale";
import { Link, useRouter } from "@/i18n/navigation";
import {
  useCustomerRefreshMutation,
  useExchangeCustomerSessionHandoffMutation,
  useSendCustomerLogoutMutation,
} from "@/lib/features/auth/authApiSlice";
import {
  AUTH_CONTEXTS,
  isAuthResponseForContext,
} from "@/lib/features/auth/authContext";
import { beginAuthContextTransition } from "@/lib/features/auth/authSlice";
import {
  AUTH_REQUEST_RESULTS,
  completeAuthRequest,
  createAuthRequestSnapshot,
  invalidateAuthRequestIfCurrent,
  unwrapWithoutCaching,
} from "@/lib/features/auth/authSession";
import { getSafeTenantNextPath } from "@/utils/tenantAuthRouting";
import { getValidatedTenantSlugParam } from "@/utils/tenantRouting";
import { consumeCustomerSessionHandoff } from "@/lib/features/auth/customerSessionHandoff";

const SOCIAL_ERROR_KEYS = Object.freeze({
  access_denied: "accessDenied",
  account_conflict: "accountConflict",
  authentication_failed: "authenticationFailed",
  provider_unavailable: "providerUnavailable",
});

export default function CustomerSocialAuthComplete() {
  const t = useTranslations("CustomerAuth.complete");
  const locale = useLocale();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const store = useStore();
  const tenantSlug = getValidatedTenantSlugParam(params);
  const nextPath = getSafeTenantNextPath(searchParams.get("next"), "/portal");
  const providerErrorCode = String(
    searchParams.get("socialError") || searchParams.get("error") || "",
  )
    .trim()
    .toLowerCase();
  const providerError = providerErrorCode
    ? SOCIAL_ERROR_KEYS[providerErrorCode] || "providerError"
    : "";
  const [refresh] = useCustomerRefreshMutation();
  const [exchangeHandoff] = useExchangeCustomerSessionHandoffMutation();
  const [sendLogout] = useSendCustomerLogoutMutation();
  const [attempt, setAttempt] = useState(0);
  const [errorKey, setErrorKey] = useState(providerError);
  const currentAttempt = useRef(null);
  const handoff = useRef(null);

  useEffect(() => {
    if (handoff.current === null) {
      handoff.current = consumeCustomerSessionHandoff();
    }
    if (!tenantSlug || providerError) {
      return;
    }

    let active = true;
    // Strict Mode and rerenders can re-subscribe while the one-time exchange
    // is pending. Share the request for this attempt rather than redeeming
    // the bearer twice or leaving the replacement effect without a result.
    if (currentAttempt.current?.attempt !== attempt) {
      dispatch(beginAuthContextTransition(AUTH_CONTEXTS.CUSTOMER));
      const snapshot = createAuthRequestSnapshot(
        store.getState(),
        AUTH_CONTEXTS.CUSTOMER,
      );
      const pendingHandoff = handoff.current;
      handoff.current = { present: false, value: "" };
      const result =
        pendingHandoff.present && !pendingHandoff.value
          ? Promise.reject(new Error("Invalid authentication handoff"))
          : unwrapWithoutCaching(
              pendingHandoff.present
                ? exchangeHandoff(pendingHandoff.value)
                : refresh(),
            );
      currentAttempt.current = { attempt, snapshot, result };
    }
    const requestAttempt = currentAttempt.current;
    const snapshot = requestAttempt.snapshot;

    const complete = async () => {
      setErrorKey("");

      try {
        const result = await requestAttempt.result;
        if (!active) return;

        const responseTenantSlug = String(result?.tenant?.slug || "")
          .trim()
          .toLowerCase();
        if (
          responseTenantSlug !== tenantSlug ||
          !isAuthResponseForContext(result, AUTH_CONTEXTS.CUSTOMER)
        ) {
          invalidateAuthRequestIfCurrent({
            authContext: AUTH_CONTEXTS.CUSTOMER,
            dispatch,
            getState: store.getState,
            snapshot,
          });
          await sendLogout()
            .unwrap()
            .catch(() => null);
          if (active) setErrorKey("customerOnly");
          return;
        }

        const completion = completeAuthRequest({
          authContext: AUTH_CONTEXTS.CUSTOMER,
          data: result,
          dispatch,
          getState: store.getState,
          snapshot,
        });

        if (completion === AUTH_REQUEST_RESULTS.ACCEPTED) {
          router.replace(nextPath, {
            locale: resolveCustomerAuthLocale({
              locale,
              settings: result.tenant.settings,
              tenantSlug,
              user: result.user,
            }),
          });
        } else if (active) {
          setErrorKey("sessionError");
        }
      } catch {
        invalidateAuthRequestIfCurrent({
          authContext: AUTH_CONTEXTS.CUSTOMER,
          dispatch,
          getState: store.getState,
          snapshot,
        });
        if (active) setErrorKey("sessionError");
      }
    };

    complete();

    return () => {
      active = false;
    };
  }, [
    attempt,
    dispatch,
    exchangeHandoff,
    locale,
    nextPath,
    providerError,
    refresh,
    router,
    sendLogout,
    store,
    tenantSlug,
  ]);

  const retry = () => {
    setAttempt((value) => value + 1);
  };

  return (
    <main className="flex min-h-[72vh] items-center justify-center bg-brand-offset px-5 py-20">
      <section className="w-full max-w-lg rounded-[26px] border border-[#E1DDD5] bg-white p-8 text-center shadow-[0_20px_65px_rgba(17,17,15,0.08)]">
        {errorKey ? (
          <>
            <ExclamationTriangleIcon className="mx-auto h-10 w-10 text-[#B4492F]" />
            <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">
              {t("errorTitle")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#686762]">
              {t(errorKey)}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {!providerError ? (
                <button
                  type="button"
                  onClick={retry}
                  className="min-h-11 rounded-full bg-[#171717] px-5 text-xs font-semibold text-white"
                >
                  {t("retry")}
                </button>
              ) : null}
              <Link
                href={
                  nextPath === "/portal"
                    ? "/login"
                    : `/login?next=${encodeURIComponent(nextPath)}`
                }
                className="inline-flex min-h-11 items-center rounded-full border border-[#D8D3CA] px-5 text-xs font-semibold"
              >
                {t("backToLogin")}
              </Link>
            </div>
          </>
        ) : (
          <>
            <ArrowPathIcon className="mx-auto h-10 w-10 animate-spin text-primary-text" />
            <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">
              {t("title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#686762]">
              {t("description")}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
