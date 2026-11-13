import { useLegacyCopy, useLegacyText } from "@/i18n/useLegacyCopy";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

import BrushStrokeSwash from "@/components/decorations/BrushStrokeSwash";
import TenantLogoLink from "@/components/brand/TenantLogoLink";
import { getCustomerAuthCustomizationDefaults } from "@/components/customer-shell/customerFacingCustomizationDefaults";
import {
  getLocalizedPublicTenantText,
  getPublicTenantTheme,
  resolvePublicTenantLabelColor,
} from "@/components/public-tenant/publicTenant.config";

const cx = (...classes) => classes.filter(Boolean).join(" ");

function PreviewLogo({ branding, theme }) {
  return (
    <TenantLogoLink
      branding={branding}
      aria-label={branding.displayName}
      className="flex flex-col items-center text-center"
      data-auth-form-brand
    >
      {branding.logoUrl ? (
        // Draft media can be served by tenant-managed HTTPS hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.logoUrl}
          alt=""
          className="max-h-10 w-auto max-w-[120px] object-contain"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          className="grid h-8 w-8 place-items-center rounded-[10px] text-[9px] font-semibold uppercase"
          style={{
            backgroundColor: branding.accentColor,
            color: theme.accentForeground,
          }}
        >
          {branding.displayName.charAt(0) || "S"}
        </span>
      )}
      {branding.logoUrl ? (
        <span className="sr-only">{branding.displayName}</span>
      ) : (
        <p className="mt-2 max-w-full truncate text-[8px] font-semibold">
          {branding.displayName}
        </p>
      )}
    </TenantLogoLink>
  );
}

export default function PublicSiteLoginPreview({
  tenant,
  locale,
  mobile,
  device,
  t,
  mode = "login",
}) {
  const customerDefaults = useLegacyCopy("customerDefaults");
  const isRegister = mode === "register";
  const previewDevice = device || (mobile ? "mobile" : "desktop");
  const registerDesktop = isRegister && previewDevice === "desktop";
  const registerStacked = isRegister && !registerDesktop;
  const visualCompact = mobile || registerStacked;
  const authSettings = tenant.publicSite[mode];
  const branding = tenant.publicSite.branding;
  const theme = getPublicTenantTheme(tenant);
  const customizationDefaults = getCustomerAuthCustomizationDefaults(
    mode,
    locale,
    customerDefaults,
  );
  const eyebrow = getLocalizedPublicTenantText(
    authSettings.eyebrow,
    locale,
    customizationDefaults.eyebrow,
  );
  const headline = getLocalizedPublicTenantText(
    authSettings.headline,
    locale,
    customizationDefaults.headline,
  );
  const supportingText = getLocalizedPublicTenantText(
    authSettings.supportingText,
    locale,
    customizationDefaults.description,
  );
  const helpText = getLocalizedPublicTenantText(
    authSettings.helpText,
    locale,
    "",
  );
  const backgroundImageUrl =
    mode === "register"
      ? authSettings.backgroundImageUrl ||
        tenant.publicSite.login.backgroundImageUrl
      : authSettings.backgroundImageUrl;
  const visualLabelColor = resolvePublicTenantLabelColor(
    authSettings.labelColor,
    "#292720",
    branding.labelColor,
  );
  const formLabelColor = resolvePublicTenantLabelColor(
    authSettings.labelColor,
    theme.style["--tenant-auth-form-surface"],
    theme.style["--tenant-auth-form-label"] || branding.labelColor,
  );
  const legacyText = useLegacyText();
  const registerHighlights = [
    legacyText(
      "Registration_Book_visits_and_courses_without_re_entering_details_6952f",
    ),
    legacyText(
      "Registration_Keep_pieces_credits_and_history_within_reach_2267f",
    ),
  ];

  return (
    <div
      className={cx(
        "grid overflow-hidden",
        isRegister ? "min-h-[460px]" : "min-h-[360px]",
        registerStacked || mobile
          ? "grid-cols-1"
          : registerDesktop
            ? "grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]"
            : "grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]",
      )}
      data-preview-auth
      data-preview-auth-mode={mode}
      data-preview-auth-device={previewDevice}
      data-preview-auth-layout={
        isRegister
          ? registerDesktop
            ? "register-split"
            : "register-stacked"
          : mobile
            ? "login-stacked"
            : "login-split"
      }
      data-auth-layout
      style={{
        backgroundColor: "var(--tenant-auth-form-surface)",
        color: "var(--tenant-auth-form-text)",
      }}
    >
      <div
        className={cx(
          "relative isolate overflow-hidden bg-[#262624]",
          visualCompact
            ? mobile
              ? "min-h-[200px]"
              : "min-h-[260px]"
            : isRegister
              ? "min-h-[460px]"
              : "min-h-[360px]",
        )}
        data-preview-auth-visual-column
        data-preview-auth-visual-size={visualCompact ? "compact" : "full"}
        data-preview-auth-visual
        data-auth-visual
        data-tenant-surface="media"
      >
        {backgroundImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundImageUrl}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover"
            data-preview-auth-image
            data-auth-hero-image
            data-tenant-image
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="absolute inset-0 -z-20 overflow-hidden"
            data-preview-auth-fallback
            data-auth-visual-fallback
            style={{
              background: `linear-gradient(145deg, color-mix(in srgb, ${theme.accentColor} 42%, #292720) 0%, color-mix(in srgb, ${theme.secondaryColor} 30%, #443B32) 56%, #292720 100%)`,
            }}
          >
            <BrushStrokeSwash
              className="-right-40 top-3 w-[28rem] rotate-[7deg] opacity-35"
              color={theme.accentColor}
              texture="loaded"
            />
            <BrushStrokeSwash
              className="-bottom-4 -left-40 w-[26rem] -rotate-[8deg] opacity-30"
              color={theme.secondaryColor}
              side="left"
              texture="rake"
            />
          </div>
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div
          className={cx(
            "relative z-10 flex flex-col text-white",
            visualCompact
              ? mobile
                ? "min-h-[200px] p-5"
                : "min-h-[260px] p-6"
              : isRegister
                ? "min-h-[460px] p-8"
                : "min-h-[360px] p-8",
          )}
          data-preview-auth-visual-content
          data-auth-visual-content
        >
          <div
            className="mt-auto"
            data-preview-auth-visual-copy
            data-auth-visual-copy
          >
            <p
              className="mb-3 inline-flex rounded-full border border-white/20 bg-black/20 px-2.5 py-1 text-[6px] font-semibold uppercase tracking-[0.14em] backdrop-blur-sm"
              data-tenant-type="eyebrow"
              data-preview-auth-visual-label
              style={{ color: visualLabelColor }}
            >
              {eyebrow}
            </p>
            <h2
              className={cx(
                "max-w-[330px] whitespace-pre-line break-words font-serif leading-[0.94] tracking-[-0.055em]",
                mobile ? "text-[24px]" : "text-[34px]",
              )}
              data-tenant-type="display"
            >
              {headline}
            </h2>
            <p className="mt-3 max-w-[300px] text-[8px] leading-4 text-white/80">
              {supportingText}
            </p>
            {isRegister ? (
              <ul
                className="mt-3 grid max-w-[340px] gap-1.5 sm:grid-cols-2"
                data-auth-story-highlights
                data-preview-auth-highlights
              >
                {registerHighlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="flex items-start gap-1.5 text-[7px] leading-3 text-white/80"
                    data-preview-auth-highlight
                  >
                    <CheckCircleIcon
                      className="mt-0.5 h-3 w-3 shrink-0 text-white/85"
                      aria-hidden="true"
                    />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {helpText ? (
              <p className="mt-3 max-w-[300px] border-t border-white/20 pt-2 text-[7px] leading-3 text-white/70">
                {helpText}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={cx(
          "flex justify-center",
          isRegister ? "items-start px-6 py-7 sm:px-8 sm:py-8" : "items-center",
          !isRegister && (mobile ? "px-6 py-7" : "px-8 py-9"),
        )}
        data-preview-auth-form-panel
        data-preview-auth-form-alignment={isRegister ? "top" : "center"}
        data-auth-form-panel
        data-tenant-layout="panel"
        data-tenant-surface="panel"
        style={{
          backgroundColor: "var(--tenant-auth-form-surface)",
          color: "var(--tenant-auth-form-text)",
        }}
      >
        <div
          className={cx(
            "w-full",
            isRegister ? "max-w-[440px]" : "max-w-[250px]",
          )}
          data-preview-auth-card
          data-preview-auth-form-width={isRegister ? "wide" : "standard"}
          data-auth-card
        >
          <PreviewLogo branding={branding} theme={theme} />
          <p
            className="mt-5 text-center text-[7px] font-semibold uppercase tracking-[0.16em]"
            data-tenant-type="eyebrow"
            data-preview-auth-label
            style={{ color: formLabelColor }}
          >
            {t(isRegister ? "registerFormEyebrow" : "loginFormEyebrow")}
          </p>
          <p
            className="mt-1 text-center text-[18px] font-semibold tracking-[-0.05em]"
            data-tenant-type="display"
          >
            {t(`${mode}Card`)}
          </p>
          {isRegister ? (
            <div className="mt-5" data-preview-auth-register-form>
              <div
                className={cx(
                  "grid gap-2.5",
                  mobile ? "grid-cols-1" : "grid-cols-2",
                )}
                data-preview-auth-field-columns={mobile ? "single" : "double"}
                data-preview-auth-field-group="details"
              >
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-9 rounded-xl border"
                    data-preview-auth-field
                    data-tenant-surface="field"
                    style={{
                      backgroundColor: "var(--tenant-auth-field-surface)",
                      borderColor:
                        "color-mix(in srgb, var(--tenant-auth-field-text) 16%, transparent)",
                    }}
                  />
                ))}
              </div>
              <div
                className="my-4 border-t"
                data-preview-auth-divider
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--tenant-auth-form-text) 12%, transparent)",
                }}
              />
              <div
                className={cx(
                  "grid gap-2.5",
                  mobile ? "grid-cols-1" : "grid-cols-2",
                )}
                data-preview-auth-field-columns={mobile ? "single" : "double"}
                data-preview-auth-field-group="security"
              >
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-9 rounded-xl border"
                    data-preview-auth-field
                    data-tenant-surface="field"
                    style={{
                      backgroundColor: "var(--tenant-auth-field-surface)",
                      borderColor:
                        "color-mix(in srgb, var(--tenant-auth-field-text) 16%, transparent)",
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-2.5">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="h-9 rounded-xl border"
                  data-preview-auth-field
                  data-tenant-surface="field"
                  style={{
                    backgroundColor: "var(--tenant-auth-field-surface)",
                    borderColor:
                      "color-mix(in srgb, var(--tenant-auth-field-text) 16%, transparent)",
                  }}
                />
              ))}
            </div>
          )}
          <div
            className="mt-4 h-9 rounded-full shadow-sm"
            data-tenant-button="primary"
            style={{
              backgroundColor: theme.accentColor,
              color: theme.accentForeground,
            }}
          />
        </div>
      </div>
    </div>
  );
}
