"use client";

import { useCallback, useContext, useSyncExternalStore } from "react";
import { ReactReduxContext } from "react-redux";
import {
  DEFAULT_PLATFORM_BILLING_CURRENCY,
  normalizeCurrency,
  resolvePlatformBillingCurrency,
} from "@/config/currencies";
import {
  CURRENCY_PREFERENCE_EVENT,
  getVisitorPreferences,
  persistCurrencyPreference,
} from "@/utils/visitorPreferences";

const subscribe = (notify) => {
  window.addEventListener(CURRENCY_PREFERENCE_EVENT, notify);
  window.addEventListener("focus", notify);
  return () => {
    window.removeEventListener(CURRENCY_PREFERENCE_EVENT, notify);
    window.removeEventListener("focus", notify);
  };
};
const getSnapshot = () => getVisitorPreferences().currency;
const getServerSnapshot = () => DEFAULT_PLATFORM_BILLING_CURRENCY;
const subscribeWithoutStore = () => () => {};
const getEmptyTenantCurrency = () => "";

const getAuthenticatedTenantCurrency = (store) => {
  const auth = store?.getState()?.auth;
  if (!auth?.token || !auth?.userInfo) return "";
  const tenant = auth.tenant;
  return (
    tenant?.subscription?.billingCurrency ||
    tenant?.billingCurrency ||
    tenant?.settings?.currency ||
    ""
  );
};

export function useCurrencyPreference({ tenantCurrency } = {}) {
  const context = useContext(ReactReduxContext);
  const store = context?.store;
  const getTenantSnapshot = useCallback(
    () => getAuthenticatedTenantCurrency(store),
    [store],
  );
  const savedCurrency = useSyncExternalStore(
    store?.subscribe || subscribeWithoutStore,
    getTenantSnapshot,
    getEmptyTenantCurrency,
  );
  const configuredCurrency = tenantCurrency ?? savedCurrency;
  const visitorCurrency = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const hasTenantCurrency = Boolean(normalizeCurrency(configuredCurrency));
  const setCurrency = useCallback(
    (currency) => {
      if (!hasTenantCurrency) persistCurrencyPreference(currency);
    },
    [hasTenantCurrency],
  );
  return {
    currency: hasTenantCurrency
      ? resolvePlatformBillingCurrency(configuredCurrency)
      : visitorCurrency,
    setCurrency,
    isTenantCurrency: hasTenantCurrency,
  };
}

export default useCurrencyPreference;
