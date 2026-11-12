import { CalendarDaysIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

import BrushStrokeSwash from "@/components/decorations/BrushStrokeSwash";
import TenantLogoLink from "@/components/brand/TenantLogoLink";
import { resolvePublicTenantLabelColor } from "@/components/public-tenant/publicTenant.config";
import { SKAB_BRAND_COLORS } from "@/config/brandPalette";

const cx = (...classes) => classes.filter(Boolean).join(" ");

function StudioFormBrand({ logoUrl, tenantName, branding }) {
  const studioInitial = String(tenantName || "")
    .trim()
    .charAt(0);

  return (
    <TenantLogoLink
      branding={branding}
      aria-label={tenantName}
      className="flex min-w-0 flex-col items-center text-center"
      data-auth-form-brand
    >
      {logoUrl ? (
        // Tenant media can be hosted outside the Next image allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="max-h-11 w-auto max-w-[160px] object-contain sm:max-h-11 sm:max-w-[180px]"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid h-11 w-11 place-items-center rounded-[14px] text-base font-semibold uppercase shadow-sm ring-1 ring-black/[0.06]"
          style={{
            backgroundColor: "var(--tenant-accent)",
            color: "var(--tenant-accent-foreground)",
          }}
        >
          {studioInitial || "S"}
        </span>
      )}

      {logoUrl ? (
        <span className="sr-only">{tenantName}</span>
      ) : (
        <p
          className="mt-2 max-w-full truncate text-sm font-semibold tracking-[-0.025em]"
          style={{ color: "var(--tenant-auth-form-text, #1F1F1F)" }}
        >
          {tenantName}
        </p>
      )}
    </TenantLogoLink>
  );
}

function AuthVisual({
  accentColor,
  backgroundImageUrl,
  description,
  eyebrow,
  helpText,
  highlights,
  labelColor,
  secondaryColor,
  title,
}) {
  return (
    <div
      className="relative isolate min-h-[200px] overflow-hidden !rounded-none !shadow-none bg-[#34312B] sm:min-h-[260px] lg:sticky lg:top-0 lg:h-dvh lg:min-h-0 lg:self-start"
      data-auth-visual
      data-tenant-surface="media"
    >
      {backgroundImageUrl ? (
        // The hero is decorative because the adjacent copy carries its meaning.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundImageUrl}
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          data-auth-hero-image
          data-tenant-image
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="absolute inset-0 -z-20 overflow-hidden"
          data-auth-visual-fallback
          style={{
            background:
              "linear-gradient(145deg, color-mix(in srgb, " +
              accentColor +
              " 42%, #292720) 0%, color-mix(in srgb, " +
              secondaryColor +
              " 30%, #443B32) 56%, #292720 100%)",
          }}
        >
          <BrushStrokeSwash
            className="-right-40 top-3 w-[38rem] rotate-[7deg] opacity-35 sm:-right-36 sm:w-[48rem] lg:-right-56 lg:top-20 lg:w-[66rem]"
            color={accentColor}
            texture="loaded"
          />
          <BrushStrokeSwash
            className="-bottom-8 -left-44 w-[36rem] -rotate-[8deg] opacity-30 sm:-left-36 sm:w-[44rem] lg:-bottom-16 lg:-left-52 lg:w-[62rem]"
            color={secondaryColor}
            side="left"
            texture="rake"
          />
        </div>
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-black/10 lg:bg-gradient-to-tr lg:from-black/75 lg:via-black/25 lg:to-black/5"
      />

      <div
        aria-labelledby="customer-auth-story-title"
        className="relative z-10 flex min-h-[200px] flex-col p-5 pt-20 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 sm:min-h-[260px] sm:p-8 sm:pt-20 lg:h-full lg:min-h-0 lg:overscroll-contain lg:overflow-y-auto lg:p-10 lg:pt-10 xl:p-12 xl:pt-12"
        data-auth-visual-content
        role="region"
        tabIndex={0}
      >
        <div className="mt-auto" data-auth-visual-copy>
          <p
            className="inline-flex rounded-full border border-white/45 bg-[#11110F] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-md sm:text-[10px]"
            data-tenant-type="eyebrow"
            style={labelColor ? { color: labelColor } : undefined}
          >
            {eyebrow}
          </p>
          <h1
            id="customer-auth-story-title"
            className="mt-3 max-w-[760px] whitespace-pre-line text-white/90 break-words font-serif text-[clamp(2rem,4vw,4.6rem)] leading-[0.94] tracking-[-0.055em] text-balance sm:mt-4"
            data-tenant-type="display"
          >
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 sm:mt-4 sm:text-base sm:leading-7">
            {description}
          </p>
          {highlights.length ? (
            <ul
              className="mt-4 grid max-w-xl gap-2 sm:grid-cols-2"
              data-auth-story-highlights
            >
              {highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="flex items-start gap-2 text-xs leading-5 text-white/80 sm:text-sm sm:leading-6"
                >
                  <CheckCircleIcon
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-white/85"
                  />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {helpText ? (
            <p className="mt-3 max-w-xl border-t border-white/20 pt-3 text-xs leading-5 text-white/70 sm:mt-4 sm:pt-3 sm:text-sm sm:leading-6">
              {helpText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function CustomerAuthShell({
  accentColor,
  backgroundImageUrl = "",
  children,
  description,
  eyebrow,
  formDescription,
  formEyebrow,
  formTitle,
  helpText = "",
  highlights = [],
  intentText = "",
  labelColor = "",
  logoUrl = "",
  branding,
  mode = "login",
  secondaryColor,
  tenantName,
  themeStyle,
  title,
}) {
  const isRegister = mode === "register";
  const authFormSurface =
    themeStyle?.["--tenant-auth-form-surface"] ||
    themeStyle?.["--tenant-surface"] ||
    "#FFFFFF";
  const formLabelColor = resolvePublicTenantLabelColor(
    labelColor,
    authFormSurface,
    themeStyle?.["--tenant-auth-form-label"] ||
      themeStyle?.["--tenant-label-color"] ||
      themeStyle?.["--tenant-accent-link"] ||
      SKAB_BRAND_COLORS.primary,
  );
  const visualLabelColor = resolvePublicTenantLabelColor(
    labelColor,
    "#292720",
    "#FFFFFF",
  );

  return (
    <main
      className="relative min-h-dvh bg-[var(--tenant-background)] text-[var(--tenant-text)]"
      data-auth-surface={mode}
      style={{
        ...themeStyle,
        "--tenant-page-label-color": formLabelColor,
      }}
    >
      <section
        className={cx(
          "grid w-full overflow-clip !rounded-none !shadow-none bg-white",
          isRegister
            ? "lg:grid-cols-[minmax(320px,0.82fr)_minmax(560px,1.18fr)]"
            : "lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]",
          "lg:min-h-dvh lg:items-stretch",
        )}
        data-auth-layout
        data-tenant-surface="panel"
      >
        <div className="min-w-0 bg-[#34312B]" data-auth-visual-column>
          <AuthVisual
            accentColor={accentColor}
            backgroundImageUrl={backgroundImageUrl}
            description={description}
            eyebrow={eyebrow}
            helpText={helpText}
            highlights={highlights}
            labelColor={visualLabelColor}
            secondaryColor={secondaryColor}
            title={title}
          />
        </div>

        <div
          className={cx(
            "flex min-w-0 justify-center px-5 py-6 sm:px-8 sm:py-8 lg:px-10 xl:px-12",
            isRegister
              ? "items-start lg:py-10 2xl:py-12"
              : "items-center lg:py-3 2xl:py-4",
          )}
          data-auth-form-panel
          data-tenant-layout="panel"
          style={{
            backgroundColor:
              "var(--tenant-auth-form-surface, var(--tenant-surface, #FFFFFF))",
            color:
              "var(--tenant-auth-form-text, var(--tenant-text-on-surface, #1F1F1F))",
          }}
        >
          <div
            className={cx(
              "w-full pb-[max(0.25rem,env(safe-area-inset-bottom))]",
              isRegister ? "max-w-[620px]" : "max-w-[480px]",
            )}
            data-auth-card
          >
            <StudioFormBrand
              logoUrl={logoUrl}
              tenantName={tenantName}
              branding={branding}
            />

            <div className="mt-4 text-center">
              <p
                className="text-[9px] font-semibold uppercase tracking-[0.2em]"
                data-tenant-type="eyebrow"
                style={{
                  color:
                    "var(--tenant-page-label-color, var(--tenant-label-color, var(--tenant-accent-link)))",
                }}
              >
                {formEyebrow}
              </p>
              <h2
                id="customer-auth-form-title"
                className="mt-1.5 text-[30px] font-semibold leading-[1.02] tracking-[-0.055em] sm:text-[34px]"
                data-tenant-type="display"
                style={{
                  color:
                    "var(--tenant-auth-form-text, var(--tenant-text-on-surface, #1F1F1F))",
                }}
              >
                {formTitle}
              </h2>
              {formDescription ? (
                <p
                  className="mx-auto mt-2 max-w-md text-sm leading-5"
                  style={{
                    color:
                      "var(--tenant-auth-form-muted, var(--tenant-muted-on-surface, #777771))",
                  }}
                >
                  {formDescription}
                </p>
              ) : null}
            </div>

            {intentText ? (
              <div
                className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--tenant-accent)]/15 bg-[var(--tenant-accent)]/[0.055] px-3 py-2"
                data-booking-intent-reassurance
              >
                <CalendarDaysIcon
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tenant-accent-link)]"
                />
                <p
                  className="text-[11px] leading-4"
                  style={{
                    color:
                      "var(--tenant-auth-form-text, var(--tenant-text-on-surface, #292925))",
                  }}
                >
                  {intentText}
                </p>
              </div>
            ) : null}

            <div className={isRegister ? "mt-5" : "mt-4"}>{children}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
