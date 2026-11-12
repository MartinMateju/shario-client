"use client";

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
import translation from "@/translations/translation";
import {
  findPortalLocationByReference,
  getPortalLocationReferenceFromPath,
} from "@/utils/customerPortalLocation";
import {
  buildTenantAuthHref,
  getSafeTenantNextPath,
} from "@/utils/tenantAuthRouting";

export default function Login() {
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
  }, [language]);

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
    (language === "CZ" ? "Vaše studio" : "Your studio");
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

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (isLoading) return;

      if (!normalizedEmail || !password) {
        setErrMsg(t("ERROR_MISSING_CREDENTIALS", "Please fill in all fields."));
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
          setErrMsg(t("ERROR_NO_SERVER_RESPONSE", "Server is not responding."));
        } else if (error.status === 400) {
          setErrMsg(
            t("ERROR_MISSING_CREDENTIALS", "Please fill in all fields."),
          );
        } else if (error.status === 401) {
          setErrMsg(t("ERROR_UNAUTHORIZED", "Incorrect email or password."));
        } else {
          setErrMsg(
            error?.data?.message ||
              t("ERROR_NO_SERVER_RESPONSE", "Server is not responding."),
          );
        }

        window.requestAnimationFrame(() => {
          errRef.current?.focus?.();
        });
      } finally {
        dispatch(setLoaderRunning(false));
      }
    },
    [
      dispatch,
      isLoading,
      locale,
      login,
      normalizedEmail,
      password,
      router,
      safeNextPath,
      t,
      tenant.settings,
      tenantSlug,
    ],
  );

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
          ? isCzech
            ? `Přihlaste se zákaznickým účtem a otevřete studio ${requestedLocation.name}.`
            : `Sign in with your customer account to open ${requestedLocation.name}.`
          : isCzech
            ? "Použijte účet propojený s tímto studiem."
            : "Use the account connected with this studio."
      }
      formEyebrow={isCzech ? "Zákaznický účet" : "Customer access"}
      formTitle={isCzech ? "Přihlášení" : "Sign in"}
      helpText={configuredHelpText}
      intentText={
        requestedLocation?.name
          ? isCzech
            ? `Přihlaste se a pokračujte do studia ${requestedLocation.name}.`
            : `Sign in to continue to ${requestedLocation.name}.`
          : safeNextPath
            ? isCzech
              ? "Váš výběr rezervace je uložený. Po přihlášení můžete plynule pokračovat."
              : "Your booking selection is saved. Sign in to continue where you left off."
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
          label="E-mail"
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
          placeholder={t("LOGIN_EMAIL_PLACEHOLDER", "you@email.com")}
        />

        <CustomerAuthPasswordField
          id="password"
          label={isCzech ? "Heslo" : "Password"}
          name="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrMsg("");
          }}
          autoComplete="current-password"
          compact
          required
          placeholder={t("LOGIN_PASSWORD_PLACEHOLDER", "Password")}
          showPasswordLabel={isCzech ? "Zobrazit heslo" : "Show password"}
          hidePasswordLabel={isCzech ? "Skrýt heslo" : "Hide password"}
        />

        <div className="flex justify-end">
          <Link
            href={passwordHref}
            className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--tenant-auth-form-link)] transition hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:underline"
          >
            {t("FORGOT_PASSWORD", "Forgot password?")}
          </Link>
        </div>

        <CustomerAuthError ref={errRef}>{errMsg}</CustomerAuthError>

        <CustomerAuthSubmitButton type="submit" disabled={isLoading}>
          {isLoading
            ? isCzech
              ? "Přihlašujeme…"
              : "Signing in…"
            : isCzech
              ? "Přihlásit se"
              : "Sign in"}
        </CustomerAuthSubmitButton>

        <CustomerSocialAuthButtons
          tenantSlug={tenantSlug}
          locale={locale}
          nextPath={safeNextPath}
          variant="compact"
        />

        {tenant.publicCapabilities.registration ? (
          <p className="border-t border-[color-mix(in_srgb,var(--tenant-auth-form-text)_12%,transparent)] pt-3 text-center text-sm leading-6 text-[var(--tenant-auth-form-muted)]">
            {isCzech ? "Ještě nemáte účet? " : "New to this studio? "}
            <Link
              href={registerHref}
              className="font-semibold text-[var(--tenant-auth-form-link)] transition hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:underline"
            >
              {isCzech ? "Vytvořit účet" : "Create account"}
            </Link>
          </p>
        ) : null}
      </form>
    </CustomerAuthShell>
  );
}
