"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import { useLegacyCopy, useLegacyText } from "@/i18n/useLegacyCopy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";

import CustomerAuthField, {
  CustomerAuthError,
  CustomerAuthPasswordField,
  CustomerAuthSubmitButton,
} from "@/components/auth/CustomerAuthField";
import CustomerAuthShell from "@/components/auth/CustomerAuthShell";
import CustomerSocialAuthButtons from "@/components/auth/CustomerSocialAuthButtons";
import { resolveCustomerAuthLocale } from "@/components/auth/customerAuthLocale";
import { getCustomerAuthCustomizationDefaults } from "@/components/customer-shell/customerFacingCustomizationDefaults";
import { usePublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import {
  getLocalizedPublicTenantText,
  getPublicTenantTheme,
} from "@/components/public-tenant/publicTenant.config";
import { Link, useRouter } from "@/i18n/navigation";
import { useCustomerLoginMutation } from "@/lib/features/auth/authApiSlice";
import { setLoaderRunning } from "@/lib/features/config/configSlice";
import { useGetPublicBookingLocationsQuery } from "@/lib/features/publicBooking/publicBookingApiSlice";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";
import {
  findPortalLocationByReference,
  getPortalLocationReferenceFromPath,
} from "@/utils/customerPortalLocation";
import {
  buildTenantAuthHref,
  getSafeTenantNextPath,
} from "@/utils/tenantAuthRouting";

export default function Login() {
  const customerDefaults = useLegacyCopy("customerDefaults");
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
  const userRef = useRef(null);
  const errRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const dispatch = useDispatch();
  const { tenant, degraded } = usePublicTenant();

  // The locale segment is the source of truth on public customer routes.
  // Redux can briefly retain the previous language while navigating between
  // localized tenant pages, which must not change the copy rendered by /en or
  // /cs.
  const language = locale === "cs" ? "CZ" : "EN";
  const [login, { isLoading }] = useCustomerLoginMutation();

  const t = useMemo(() => {
    return (key, fallback = "") => translation?.[key]?.[language] ?? fallback;
  }, [language, translation]);

  const normalizedEmail = useMemo(() => {
    return email.toLowerCase().replace(/\s+/g, "");
  }, [email]);

  const tenantSlugParam = params?.tenantSlug;
  const tenantSlug = String(
    Array.isArray(tenantSlugParam) ? tenantSlugParam[0] : tenantSlugParam || "",
  )
    .trim()
    .toLowerCase();
  const tenantName =
    tenant.publicSite.branding.displayName ||
    tenant.name ||
    legacyText("Login_Your_studio_1b32c");
  const safeNextPath = getSafeTenantNextPath(searchParams.get("next"));
  const requestedLocationReference =
    getPortalLocationReferenceFromPath(safeNextPath);
  const { data: publicBookingLocations = [] } =
    useGetPublicBookingLocationsQuery(
      { tenantSlug },
      {
        skip: !tenantSlug || !requestedLocationReference || degraded === true,
      },
    );
  const requestedLocation = findPortalLocationByReference(
    publicBookingLocations,
    requestedLocationReference,
  );
  const registerHref = buildTenantAuthHref("/register", safeNextPath);
  const passwordHref = buildTenantAuthHref("/password", safeNextPath);
  const tenantTheme = getPublicTenantTheme(tenant);
  const { accentColor, accentLinkColor, secondaryColor } = tenantTheme;
  const configuredEyebrow = getLocalizedPublicTenantText(
    tenant.publicSite.login.eyebrow,
    locale,
  );
  const configuredHeadline = getLocalizedPublicTenantText(
    tenant.publicSite.login.headline,
    locale,
  );
  const configuredSupportingText = getLocalizedPublicTenantText(
    tenant.publicSite.login.supportingText,
    locale,
  );
  const configuredHelpText = getLocalizedPublicTenantText(
    tenant.publicSite.login.helpText,
    locale,
  );
  const backgroundImageUrl = tenant.publicSite.login.backgroundImageUrl;
  const logoUrl = tenant.publicSite.branding.logoUrl;
  const labelColor =
    tenant.publicSite.login.labelColor ||
    tenant.publicSite.branding.labelColor ||
    tenantTheme.labelColor ||
    accentLinkColor;
  const isCzech = language === "CZ";
  const customizationDefaults = getCustomerAuthCustomizationDefaults(
    "login",
    locale,
    customerDefaults,
  );

  useEffect(() => {
    const userField = userRef.current;
    if (!userField) return;

    const bounds = userField.getBoundingClientRect();
    const fieldIsAlreadyVisible =
      bounds.top >= 0 &&
      bounds.left >= 0 &&
      bounds.bottom <= window.innerHeight &&
      bounds.right <= window.innerWidth;

    if (fieldIsAlreadyVisible) userField.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    return () => {
      dispatch(setLoaderRunning(false));
    };
  }, [dispatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isLoading) return;

    if (!normalizedEmail || !password) {
      setErrMsg(t("ERROR_MISSING_CREDENTIALS"));
      window.requestAnimationFrame(() => {
        errRef.current?.focus?.();
      });
      return;
    }

    try {
      dispatch(setLoaderRunning(true));

      const result = await login({
        email: normalizedEmail,
        password,
        tenantSlug,
      }).unwrap();

      setEmail("");
      setPassword("");
      setErrMsg("");

      // The tenant login endpoint always issues a customer-scoped session.
      // An owner or staff member may use the same credentials here without
      // gaining access to workspace routes.
      router.replace(safeNextPath || "/portal", {
        locale: resolveCustomerAuthLocale({
          locale,
          settings: result?.tenant?.settings || tenant.settings,
          tenantSlug,
          user: result?.user,
        }),
      });
    } catch (error) {
      const errorCode = String(error?.data?.code || "").toUpperCase();
      if (errorCode === "EMAIL_VERIFICATION_REQUIRED") {
        router.push(
          `/verify-email?email=${encodeURIComponent(
            normalizedEmail,
          )}&next=${encodeURIComponent(safeNextPath)}`,
        );
        return;
      }

      if (!error?.status) {
        setErrMsg(t("ERROR_NO_SERVER_RESPONSE"));
      } else if (error.status === 400) {
        setErrMsg(t("ERROR_MISSING_CREDENTIALS"));
      } else if (error.status === 401) {
        setErrMsg(t("ERROR_UNAUTHORIZED"));
      } else {
        setErrMsg(
          getLocalizedApiErrorMessage(error, t("ERROR_NO_SERVER_RESPONSE")),
        );
      }

      window.requestAnimationFrame(() => {
        errRef.current?.focus?.();
      });
    } finally {
      dispatch(setLoaderRunning(false));
    }
  };

  return (
    <CustomerAuthShell
      accentColor={accentColor}
      backgroundImageUrl={backgroundImageUrl}
      description={
        configuredSupportingText || customizationDefaults.description
      }
      eyebrow={configuredEyebrow || customizationDefaults.eyebrow}
      formDescription={
        requestedLocation?.name
          ? legacyText(
              "Login_Sign_in_with_your_customer_account_to_open_value1_31cf2",
              { value1: requestedLocation.name },
            )
          : legacyText("Login_Use_the_account_connected_with_this_studio_a1282")
      }
      formEyebrow={legacyText("Login_Customer_access_aaae3")}
      formTitle={legacyText("Login_Sign_in_ada2e")}
      helpText={configuredHelpText}
      intentText={
        requestedLocation?.name
          ? legacyText("Login_Sign_in_to_continue_to_value1_9a18a", {
              value1: requestedLocation.name,
            })
          : safeNextPath
            ? legacyText(
                "Login_Your_booking_selection_is_saved_Sign_in_to_continue_whe_41b95",
              )
            : ""
      }
      labelColor={labelColor}
      logoUrl={logoUrl}
      branding={tenant.publicSite.branding}
      mode="login"
      secondaryColor={secondaryColor}
      tenantName={tenantName}
      themeStyle={tenantTheme.style}
      title={configuredHeadline || customizationDefaults.headline}
    >
      <form
        className="space-y-3"
        onSubmit={handleSubmit}
        aria-busy={isLoading}
        aria-labelledby="customer-auth-form-title"
        noValidate
      >
        <CustomerAuthField
          ref={userRef}
          id="email"
          label={legacyText("Login_Email_84add")}
          name="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setErrMsg("");
          }}
          autoComplete="email"
          inputMode="email"
          compact
          required
          placeholder={t("LOGIN_EMAIL_PLACEHOLDER")}
        />

        <CustomerAuthPasswordField
          id="password"
          label={legacyText("Login_Password_8be3c")}
          name="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrMsg("");
          }}
          autoComplete="current-password"
          compact
          required
          placeholder={t("LOGIN_PASSWORD_PLACEHOLDER")}
          showPasswordLabel={legacyText("Login_Show_password_044b8")}
          hidePasswordLabel={legacyText("Login_Hide_password_e4012")}
        />

        <div className="flex justify-end">
          <Link
            href={passwordHref}
            className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--tenant-auth-form-link)] transition hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:underline"
          >
            {t("FORGOT_PASSWORD")}
          </Link>
        </div>

        <CustomerAuthError ref={errRef}>{errMsg}</CustomerAuthError>

        <CustomerAuthSubmitButton type="submit" disabled={isLoading}>
          {isLoading
            ? legacyText("Login_Signing_in_c66b2")
            : legacyText("Login_Sign_in_ada2e")}
        </CustomerAuthSubmitButton>

        <CustomerSocialAuthButtons
          tenantSlug={tenantSlug}
          locale={locale}
          nextPath={safeNextPath}
          variant="compact"
        />

        {tenant.publicCapabilities.registration ? (
          <p className="border-t border-[color-mix(in_srgb,var(--tenant-auth-form-text)_12%,transparent)] pt-3 text-center text-sm leading-6 text-[var(--tenant-auth-form-muted)]">
            {legacyText("Login_New_to_this_studio_938fe")}
            <Link
              href={registerHref}
              className="font-semibold text-[var(--tenant-auth-form-link)] transition hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:underline"
            >
              {legacyText("Login_Create_account_aaf37")}
            </Link>
          </p>
        ) : null}
      </form>
    </CustomerAuthShell>
  );
}
