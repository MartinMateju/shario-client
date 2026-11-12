"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useSelector, useStore } from "react-redux";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  IdentificationIcon,
  LockClosedIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import {
  CustomerPortalEmptyState,
  CustomerPortalLoadingState,
  CustomerPortalSurface,
  customerPortalPrimaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import {
  useGetAccountQuery,
  useUpdateAccountPasswordMutation,
  useUpdateAccountProfileMutation,
  useUpdateCustomerPreferencesMutation,
} from "@/lib/features/workspace-access/workspaceAccessApiSlice";
import {
  selectCurrentTenant,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import CustomerPortalAppearanceSettings from "./CustomerPortalAppearanceSettings";
import { getCustomerAccountQueryScope } from "@/components/customer-shell/useCustomerPortalAppearance";
import { AUTH_CONTEXTS } from "@/lib/features/auth/authContext";
import {
  createAuthRequestSnapshot,
  isAuthRequestBoundaryCurrent,
  isAuthRequestForSamePrincipal,
} from "@/lib/features/auth/authSession";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantLocaleCodes } from "@/components/public-tenant/publicTenant.config";
import { getLocaleDefinition, normalizeLocaleCode } from "@/i18n/locales";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  getCustomerCurrentLocale,
  persistCustomerCurrentLocale,
  persistCustomerDefaultLocale,
} from "@/i18n/customerLocalePreference";
import { formatMakerId } from "@/utils/memberIdentity";

const controlClass =
  "h-12 w-full min-w-0 rounded-[13px] border border-line bg-white px-4 text-[12px] text-[#292925] outline-none transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10 disabled:bg-[#F4F2ED] disabled:text-[#858580]";
const portalControlClass =
  "h-12 w-full min-w-0 rounded-[15px] border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_13%,transparent)] bg-[var(--tenant-surface)] px-4 text-[12px] text-[var(--tenant-text-on-surface)] outline-none transition-[border-color,box-shadow,background-color] focus:border-[var(--tenant-accent-on-surface)] focus:ring-4 focus:ring-[var(--tenant-accent-on-surface)]/10 disabled:bg-[var(--tenant-background)] disabled:text-[var(--tenant-muted-text)]";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.data?.error || error?.error || fallback;

function Notice({ notice }) {
  if (!notice) return null;
  return (
    <p
      role={notice.type === "error" ? "alert" : "status"}
      className={
        notice.type === "error"
          ? "rounded-[14px] border border-coral-200 bg-coral-50 px-4 py-3 text-xs text-terracotta-700"
          : "flex items-center gap-2 rounded-[14px] border border-[#CFE0CB] bg-[#F5FAF3] px-4 py-3 text-xs text-[#47613E]"
      }
    >
      {notice.type === "success" && (
        <CheckCircleIcon className="h-4 w-4 shrink-0" />
      )}
      {notice.message}
    </p>
  );
}

function AccountFormSurface({ portalMode, className, ...props }) {
  if (portalMode) {
    return <CustomerPortalSurface as="form" className={className} {...props} />;
  }

  return <form className={className} {...props} />;
}

function ProfileForm({ account, portalMode }) {
  const t = useTranslations("AccountSettings");
  const [form, setForm] = useState({
    firstname: account.firstname || account.firstName || "",
    lastname: account.lastname || account.lastName || "",
    phone: account.phone || "",
  });
  const [notice, setNotice] = useState(null);
  const [updateProfile, { isLoading }] = useUpdateAccountProfileMutation();
  const activeControlClass = portalMode ? portalControlClass : controlClass;
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setNotice(null);
    try {
      await updateProfile({
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        phone: form.phone.trim(),
      }).unwrap();
      setNotice({ type: "success", message: t("messages.profileSaved") });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, t("messages.profileError")),
      });
    }
  };

  return (
    <AccountFormSurface
      onSubmit={submit}
      portalMode={portalMode}
      className={cx(
        portalMode
          ? ""
          : "overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_38px_rgba(17,17,15,0.04)]",
      )}
    >
      <div
        className={cx(
          "flex items-start gap-3 border-b px-5 py-4 sm:px-6 sm:py-5",
          portalMode
            ? "border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[var(--tenant-background)] text-[var(--tenant-text)]"
            : "border-line bg-surface-muted",
        )}
      >
        <span
          className={cx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            portalMode
              ? "bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)]"
              : "bg-cobalt-100 text-cobalt-700",
          )}
        >
          <UserCircleIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2
            className={cx(
              "text-sm font-semibold",
              portalMode ? "text-[var(--tenant-text)]" : "text-[#292925]",
            )}
          >
            {t("profile.title")}
          </h2>
          <p
            className={cx(
              "mt-1 text-xs leading-5",
              portalMode ? "text-[var(--tenant-muted-text)]" : "text-[#777773]",
            )}
          >
            {t("profile.description")}
          </p>
        </div>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <Notice notice={notice} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span
              className={cx(
                "mb-1.5 block text-xs font-semibold",
                portalMode
                  ? "text-[var(--tenant-text-on-surface)]"
                  : "text-[#292925]",
              )}
            >
              {t("fields.firstname")}
            </span>
            <input
              required
              maxLength={80}
              value={form.firstname}
              onChange={(event) => update("firstname", event.target.value)}
              className={activeControlClass}
            />
          </label>
          <label>
            <span
              className={cx(
                "mb-1.5 block text-xs font-semibold",
                portalMode
                  ? "text-[var(--tenant-text-on-surface)]"
                  : "text-[#292925]",
              )}
            >
              {t("fields.lastname")}
            </span>
            <input
              required
              maxLength={80}
              value={form.lastname}
              onChange={(event) => update("lastname", event.target.value)}
              className={activeControlClass}
            />
          </label>
          <label>
            <span
              className={cx(
                "mb-1.5 block text-xs font-semibold",
                portalMode
                  ? "text-[var(--tenant-text-on-surface)]"
                  : "text-[#292925]",
              )}
            >
              {t("fields.phone")}
            </span>
            <input
              type="tel"
              maxLength={40}
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              className={activeControlClass}
            />
          </label>
          <label>
            <span
              className={cx(
                "mb-1.5 block text-xs font-semibold",
                portalMode
                  ? "text-[var(--tenant-text-on-surface)]"
                  : "text-[#292925]",
              )}
            >
              {t("fields.email")}
            </span>
            <input
              value={account.email || ""}
              disabled
              className={activeControlClass}
            />
            <span
              className={cx(
                "mt-1.5 block text-[10px] leading-4",
                portalMode
                  ? "text-[var(--tenant-muted-on-surface)]"
                  : "text-[#858580]",
              )}
            >
              {t("emailNotice")}
            </span>
          </label>
        </div>
        <div
          className={cx(
            "flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between",
            portalMode
              ? "border-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)]"
              : "border-line",
          )}
        >
          <div
            className={cx(
              "flex min-w-0 items-center gap-2 text-[10px]",
              portalMode
                ? "text-[var(--tenant-muted-on-surface)]"
                : "text-[#858580]",
            )}
          >
            <IdentificationIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {t("accountId")}: {formatMakerId(account.memberNumber)}
            </span>
          </div>
          <button
            type="submit"
            disabled={
              isLoading || !form.firstname.trim() || !form.lastname.trim()
            }
            className={cx(
              portalMode
                ? customerPortalPrimaryActionClass
                : "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-cobalt-500 px-6 text-xs font-semibold text-white shadow-cobalt hover:bg-cobalt-600 disabled:opacity-50",
              "w-full sm:w-auto",
            )}
          >
            {isLoading && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
            {t("actions.saveProfile")}
          </button>
        </div>
      </div>
    </AccountFormSurface>
  );
}

function PasswordField({
  autoComplete,
  controlClassName = controlClass,
  label,
  onChange,
  portalMode = false,
  value,
}) {
  const t = useTranslations("AccountSettings");
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <span
        className={cx(
          "mb-1.5 block text-xs font-semibold",
          portalMode
            ? "text-[var(--tenant-text-on-surface)]"
            : "text-[#292925]",
        )}
      >
        {label}
      </span>
      <span className="relative block">
        <input
          required
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={`${controlClassName} pr-14`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className={cx(
            "absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2",
            portalMode
              ? "text-[var(--tenant-muted-on-surface)] hover:bg-[color-mix(in_srgb,var(--tenant-text-on-surface)_6%,transparent)] hover:text-[var(--tenant-text-on-surface)] focus-visible:ring-[var(--tenant-accent-on-surface)]/25"
              : "text-[#777773] hover:bg-[#F4F2ED] focus-visible:ring-cobalt-500/25",
          )}
          aria-label={
            visible ? t("actions.hidePassword") : t("actions.showPassword")
          }
        >
          {visible ? (
            <EyeSlashIcon className="h-4 w-4" />
          ) : (
            <EyeIcon className="h-4 w-4" />
          )}
        </button>
      </span>
    </label>
  );
}

function PasswordSettings({ portalMode }) {
  const t = useTranslations("AccountSettings");
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notice, setNotice] = useState(null);
  const [updatePassword, { isLoading }] = useUpdateAccountPasswordMutation();
  const activeControlClass = portalMode ? portalControlClass : controlClass;
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setNotice(null);
    if (form.newPassword !== form.confirmPassword) {
      setNotice({ type: "error", message: t("messages.passwordMismatch") });
      return;
    }
    try {
      await updatePassword(form).unwrap();
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice({ type: "success", message: t("messages.passwordSaved") });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, t("messages.passwordError")),
      });
    }
  };

  return (
    <AccountFormSurface
      onSubmit={submit}
      portalMode={portalMode}
      className={
        portalMode
          ? ""
          : "overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_38px_rgba(17,17,15,0.04)]"
      }
    >
      <div
        className={cx(
          "flex items-start gap-3 border-b px-5 py-4 sm:px-6 sm:py-5",
          portalMode
            ? "border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[var(--tenant-background)] text-[var(--tenant-text)]"
            : "border-line bg-surface-muted",
        )}
      >
        <span
          className={cx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            portalMode
              ? "bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)]"
              : "bg-coral-100 text-terracotta-700",
          )}
        >
          <LockClosedIcon className="h-5 w-5" />
        </span>
        <div>
          <h2
            className={cx(
              "text-sm font-semibold",
              portalMode ? "text-[var(--tenant-text)]" : "text-[#292925]",
            )}
          >
            {t("security.title")}
          </h2>
          <p
            className={cx(
              "mt-1 text-xs leading-5",
              portalMode ? "text-[var(--tenant-muted-text)]" : "text-[#777773]",
            )}
          >
            {t("security.description")}
          </p>
        </div>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <Notice notice={notice} />
        <div className="grid gap-4">
          <PasswordField
            label={t("fields.currentPassword")}
            value={form.currentPassword}
            onChange={(event) => update("currentPassword", event.target.value)}
            autoComplete="current-password"
            controlClassName={activeControlClass}
            portalMode={portalMode}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField
              label={t("fields.newPassword")}
              value={form.newPassword}
              onChange={(event) => update("newPassword", event.target.value)}
              autoComplete="new-password"
              controlClassName={activeControlClass}
              portalMode={portalMode}
            />
            <PasswordField
              label={t("fields.confirmPassword")}
              value={form.confirmPassword}
              onChange={(event) =>
                update("confirmPassword", event.target.value)
              }
              autoComplete="new-password"
              controlClassName={activeControlClass}
              portalMode={portalMode}
            />
          </div>
        </div>
        <div
          className={cx(
            "flex justify-end border-t pt-5",
            portalMode
              ? "border-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)]"
              : "border-line",
          )}
        >
          <button
            type="submit"
            disabled={
              isLoading ||
              !form.currentPassword ||
              form.newPassword.length < 8 ||
              !form.confirmPassword
            }
            className={cx(
              portalMode
                ? customerPortalPrimaryActionClass
                : "inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-6 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50",
              "w-full sm:w-auto",
            )}
          >
            {isLoading && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
            {t("actions.changePassword")}
          </button>
        </div>
      </div>
    </AccountFormSurface>
  );
}

function CustomerLanguageSettings({ account }) {
  const t = useTranslations("AccountSettings.language");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionTenant = useSelector(selectCurrentTenant);
  const store = useStore();
  const tenant = useOptionalPublicTenant()?.tenant || sessionTenant;
  const lifecycleRef = useRef(null);
  const accountId = account.id || account._id;
  const tenantSlug = tenant?.slug;
  useEffect(() => {
    const lifecycle = { active: true };
    lifecycleRef.current = lifecycle;
    return () => {
      lifecycle.active = false;
    };
  }, [accountId, tenantSlug]);
  const localeCodes = getPublicTenantLocaleCodes(
    tenant?.settings,
    routing.locales,
  );
  const studioDefault = localeCodes[0] || locale;
  const languageName = (code) => getLocaleDefinition(code)?.nativeName || code;
  const initialDefault =
    normalizeLocaleCode(account.customerDefaultLanguage) || "";
  const [savedDefault, setSavedDefault] = useState(initialDefault);
  const [selectedDefault, setSelectedDefault] = useState(initialDefault);
  const [observedDefault, setObservedDefault] = useState(initialDefault);
  const [notice, setNotice] = useState(null);
  const [isChangingLocale, startLocaleTransition] = useTransition();
  const [updatePreferences, { isLoading: isSaving }] =
    useUpdateCustomerPreferencesMutation();
  const id = useId();
  const savedDefaultUnavailable = Boolean(
    savedDefault && !localeCodes.includes(savedDefault),
  );
  const effectiveDefault = localeCodes.includes(savedDefault)
    ? savedDefault
    : studioDefault;
  const canSave =
    selectedDefault !== savedDefault &&
    (!selectedDefault || localeCodes.includes(selectedDefault));

  if (observedDefault !== initialDefault) {
    setObservedDefault(initialDefault);
    setSavedDefault(initialDefault);
    setSelectedDefault((current) =>
      current === savedDefault ? initialDefault : current,
    );
  }

  const changeCurrentLanguage = (nextLocale) => {
    if (nextLocale === locale || !localeCodes.includes(nextLocale)) return;
    persistCustomerCurrentLocale(nextLocale, tenant?.slug);
    const query = searchParams?.toString();
    const href = `${pathname || "/portal/account"}${query ? `?${query}` : ""}${window.location.hash}`;
    startLocaleTransition(() =>
      router.replace(href, { locale: nextLocale, scroll: false }),
    );
  };

  const saveDefaultLanguage = async (event) => {
    event.preventDefault();
    if (isSaving || !canSave) return;
    const lifecycle = lifecycleRef.current;
    const snapshot = createAuthRequestSnapshot(
      store.getState(),
      AUTH_CONTEXTS.CUSTOMER,
    );
    const isCurrentRequest = () => {
      const state = store.getState();
      return (
        lifecycle?.active &&
        isAuthRequestBoundaryCurrent(state, snapshot) &&
        isAuthRequestForSamePrincipal(state, snapshot)
      );
    };
    setNotice(null);
    try {
      const result = await updatePreferences({
        defaultLanguage: selectedDefault || null,
      }).unwrap();
      if (!isCurrentRequest()) return;
      const saved =
        normalizeLocaleCode(result.account?.customerDefaultLanguage) || "";
      setSavedDefault(saved);
      setSelectedDefault(saved);
      const currentChoice = getCustomerCurrentLocale(tenant?.slug);
      persistCustomerCurrentLocale(
        localeCodes.includes(currentChoice) ? currentChoice : locale,
        tenant?.slug,
      );
      persistCustomerDefaultLocale(saved || null, tenant?.slug);
      setNotice({ type: "success", message: t("saved") });
    } catch (error) {
      if (!isCurrentRequest()) return;
      setNotice({
        type: "error",
        message: getErrorMessage(error, t("saveError")),
      });
    }
  };

  return (
    <AccountFormSurface
      portalMode
      onSubmit={saveDefaultLanguage}
      aria-labelledby={`${id}-title`}
    >
      <div className="flex items-start gap-3 border-b border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[var(--tenant-background)] px-5 py-4 text-[var(--tenant-text)] sm:px-6 sm:py-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)]">
          <GlobeAltIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-sm font-semibold">
            {t("title")}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--tenant-muted-text)]">
            {t("description")}
          </p>
        </div>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <Notice notice={notice} />
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${id}-current`}
              className="mb-1.5 block text-xs font-semibold text-[var(--tenant-text-on-surface)]"
            >
              {t("currentLabel")}
            </label>
            <select
              id={`${id}-current`}
              value={locale}
              disabled={
                isChangingLocale ||
                (localeCodes.length <= 1 && localeCodes.includes(locale))
              }
              onChange={(event) => changeCurrentLanguage(event.target.value)}
              aria-describedby={`${id}-current-hint`}
              className={portalControlClass}
            >
              {!localeCodes.includes(locale) && (
                <option value={locale} disabled>
                  {languageName(locale)}
                </option>
              )}
              {localeCodes.map((code) => (
                <option key={code} value={code}>
                  {languageName(code)}
                </option>
              ))}
            </select>
            <p
              id={`${id}-current-hint`}
              className="mt-1.5 text-[10px] leading-4 text-[var(--tenant-muted-on-surface)]"
            >
              {t("currentHint")}
            </p>
          </div>
          <div>
            <label
              htmlFor={`${id}-default`}
              className="mb-1.5 block text-xs font-semibold text-[var(--tenant-text-on-surface)]"
            >
              {t("defaultLabel")}
            </label>
            <select
              id={`${id}-default`}
              value={selectedDefault}
              disabled={isSaving}
              onChange={(event) => {
                setSelectedDefault(event.target.value);
                setNotice(null);
              }}
              aria-describedby={`${id}-default-hint${savedDefaultUnavailable ? ` ${id}-unavailable` : ""}`}
              className={portalControlClass}
            >
              <option value="">
                {t("studioDefault", { language: languageName(studioDefault) })}
              </option>
              {savedDefaultUnavailable && (
                <option value={savedDefault} disabled>
                  {t("unavailableOption", {
                    language: languageName(savedDefault),
                  })}
                </option>
              )}
              {localeCodes.map((code) => (
                <option key={code} value={code}>
                  {languageName(code)}
                </option>
              ))}
            </select>
            <p
              id={`${id}-default-hint`}
              className="mt-1.5 text-[10px] leading-4 text-[var(--tenant-muted-on-surface)]"
            >
              {t("defaultHint")}
            </p>
            {savedDefaultUnavailable && (
              <p
                id={`${id}-unavailable`}
                className="mt-2 text-xs leading-5 text-[var(--tenant-muted-on-surface)]"
              >
                {t("unavailableHint", {
                  language: languageName(savedDefault),
                  fallback: languageName(studioDefault),
                })}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t border-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-[var(--tenant-muted-on-surface)]">
            {t("effectiveDefault", {
              language: languageName(effectiveDefault),
            })}
          </p>
          <button
            type="submit"
            disabled={isSaving || !canSave}
            className={customerPortalPrimaryActionClass}
          >
            {isSaving && (
              <ArrowPathIcon
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
            {t("save")}
          </button>
        </div>
      </div>
    </AccountFormSurface>
  );
}

export default function AccountSettingsPage({
  portalMode = false,
  showPageHeader = true,
}) {
  const t = useTranslations("AccountSettings");
  const customerInvoicesT = useTranslations("CustomerInvoices");
  const customer = useSelector(selectCurrentUser);
  const tenant = useSelector(selectCurrentTenant);
  const { data, currentData, isLoading, isFetching, isError, error, refetch } =
    useGetAccountQuery(
      portalMode ? getCustomerAccountQueryScope(customer, tenant) : undefined,
    );
  const result = portalMode ? currentData : data;
  const candidate = result?.account || result?.user || result;
  const customerId = String(customer?.id || customer?._id || "");
  const account =
    !portalMode ||
    (customerId && String(candidate?.id || candidate?._id || "") === customerId)
      ? candidate
      : null;

  if (isLoading || (portalMode && !currentData && isFetching)) {
    if (portalMode) {
      return <CustomerPortalLoadingState label={t("loading")} />;
    }

    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-cobalt-500" />
        <span className="ml-3 text-[12px] text-[#777773]">{t("loading")}</span>
      </div>
    );
  }

  if ((isError || !account) && portalMode) {
    return (
      <CustomerPortalSurface className="p-3">
        <CustomerPortalEmptyState
          icon={ExclamationTriangleIcon}
          title={getErrorMessage(error, t("messages.loadError"))}
          action={
            <button
              type="button"
              onClick={refetch}
              className={customerPortalPrimaryActionClass}
            >
              {customerInvoicesT("retry")}
            </button>
          }
        />
      </CustomerPortalSurface>
    );
  }

  return (
    <section className="space-y-5">
      {showPageHeader ? (
        <header>
          <p
            className={cx(
              "text-[10px] font-semibold uppercase tracking-[0.16em]",
              portalMode
                ? "text-[var(--tenant-label-color)]"
                : "text-cobalt-600",
            )}
          >
            {t("eyebrow")}
          </p>
          <h1
            className={cx(
              "mt-2 text-[28px] font-semibold tracking-[-0.05em] sm:text-[34px]",
              portalMode ? "text-[var(--tenant-text)]" : "text-[#111111]",
            )}
          >
            {t("title")}
          </h1>
          <p
            className={cx(
              "mt-1 max-w-2xl text-[12px] leading-5",
              portalMode ? "text-[var(--tenant-muted-text)]" : "text-[#777773]",
            )}
          >
            {t("description")}
          </p>
        </header>
      ) : null}
      {isError || !account ? (
        <p
          role="alert"
          className="rounded-[14px] border border-coral-200 bg-coral-50 px-4 py-3 text-xs text-terracotta-700"
        >
          {getErrorMessage(error, t("messages.loadError"))}
        </p>
      ) : (
        <>
          <ProfileForm
            key={account.updatedAt || account.id || "account"}
            account={account}
            portalMode={portalMode}
          />
          {portalMode && (
            <>
              <CustomerLanguageSettings
                key={account.id || account._id || "account-language"}
                account={account}
              />
              <CustomerPortalAppearanceSettings
                key={`${tenant?.id || tenant?.slug || "studio"}:${account.id || account._id || "account"}`}
                account={account}
              />
            </>
          )}
          <PasswordSettings portalMode={portalMode} />
        </>
      )}
    </section>
  );
}
