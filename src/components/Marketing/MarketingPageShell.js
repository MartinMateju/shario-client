"use client";

import SkabLogo from "@/components/brand/SkabLogo";
import { useCurrentYear } from "@/hooks/useCurrentYear";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import "@/styles/publicStudioTheme.css";
import "./publicMarketing.css";

const ICON_PATHS = {
  calendar: (
    <>
      <rect height="16" rx="2" width="18" x="3" y="5" />
      <path d="M7 3v4M17 3v4M3 10h18M7 14h3M14 14h3M7 17h3" />
    </>
  ),
  flow: (
    <>
      <rect height="5" rx="1.5" width="6" x="3" y="4" />
      <rect height="5" rx="1.5" width="6" x="15" y="15" />
      <path d="M9 6.5h3.5a3 3 0 0 1 3 3V15M12 18h3" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3.5c.7 4.8 3.7 7.8 8.5 8.5-4.8.7-7.8 3.7-8.5 8.5-.7-4.8-3.7-7.8-8.5-8.5 4.8-.7 7.8-3.7 8.5-8.5Z" />
      <path d="M18.5 3.5v4M20.5 5.5h-4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.8 18.8c.7-3.5 2.4-5.3 5.2-5.3s4.5 1.8 5.2 5.3M15 6.3a2.7 2.7 0 0 1 0 5.2M16.3 14c2.2.5 3.5 2.1 4 4.8" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 19 6v5.4c0 4.4-2.8 7.6-7 9.1-4.2-1.5-7-4.7-7-9.1V6l7-2.5Z" />
      <path d="m8.8 12 2.1 2.1 4.5-4.6" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
      <path d="m4 12 8 4.5 8-4.5M4 16.5l8 4.5 8-4.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
};

export function MarketingIcon({ className = "h-6 w-6", type = "spark" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.55"
      viewBox="0 0 24 24"
    >
      {ICON_PATHS[type] || ICON_PATHS.spark}
    </svg>
  );
}

export function ArrowIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M4 10h11M11 6l4 4-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 18 18"
    >
      <path
        d="m4 9.2 3.1 3.1L14 5.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function MarketingPageShell({ children }) {
  return (
    <main className="studio-marketing isolate" data-skab-public-surface>
      {children}
      <MarketingFooter />
    </main>
  );
}

export function MarketingHero({
  aside,
  description,
  eyebrow,
  secondaryHref,
  secondaryLabel,
  title,
}) {
  const t = useTranslations("MarketingPages");

  return (
    <section className="studio-marketing-hero relative isolate mx-auto max-w-[1440px] px-5 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-10 lg:px-10 lg:pb-24 lg:pt-12 xl:px-12">
      <Link
        className="studio-marketing-back relative z-10 inline-flex items-center gap-2 text-xs font-medium text-[var(--studio-muted)] transition hover:text-[var(--studio-blue)]"
        href="/"
      >
        <ArrowIcon className="h-3.5 w-3.5 rotate-180" />
        {t("common.backHome")}
      </Link>

      <div className="relative z-10 mt-8 grid items-center gap-12 lg:grid-cols-[minmax(0,.9fr)_minmax(420px,1.1fr)] lg:gap-14">
        <div className="studio-marketing-hero-copy max-w-[670px]">
          <p className="studio-marketing-eyebrow">{eyebrow}</p>
          <h1 className="studio-marketing-title">{title}</h1>
          <p className="mt-6 max-w-[620px] text-base leading-8 text-[var(--studio-muted)] sm:text-lg sm:leading-8">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              data-studio-action="primary"
              className="studio-marketing-primary group inline-flex min-h-13 items-center gap-3 bg-[var(--studio-blue)] px-7 py-4 text-sm font-medium text-white transition hover:bg-[var(--studio-blue-hover)]"
              href="/register"
            >
              {t("common.startTrial")}
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            {secondaryHref && secondaryLabel ? (
              <Link
                data-studio-action="secondary"
                className="studio-marketing-secondary group inline-flex min-h-13 items-center gap-2 border border-[var(--studio-rule)] bg-[var(--studio-white)] px-6 py-4 text-sm font-medium transition hover:border-[var(--studio-blue)] hover:text-[var(--studio-blue)]"
                href={secondaryHref}
              >
                {secondaryLabel}
                <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : null}
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-[var(--studio-muted)] sm:text-[13px]">
            <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-xl bg-[var(--studio-soft)] text-[var(--studio-ink)]">
              <CheckIcon className="h-3 w-3" />
            </span>
            {t("common.noCreditCard")}
          </p>
        </div>

        <div className="min-w-0">{aside}</div>
      </div>
    </section>
  );
}

export function SectionHeading({
  align = "left",
  description,
  eyebrow,
  title,
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : ""}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--studio-clay)]">
        {eyebrow}
      </p>
      <h2 className="studio-marketing-section-title">{title}</h2>
      <p
        className={`mt-6 max-w-2xl text-base leading-8 text-[var(--studio-muted)] ${
          align === "center" ? "mx-auto" : ""
        }`}
      >
        {description}
      </p>
    </div>
  );
}

export function FeatureCard({
  children,
  description,
  icon = "spark",
  index = 0,
  label,
  title,
}) {
  const tone = [
    "bg-[var(--studio-soft)] text-[var(--studio-clay)]",
    "bg-[var(--studio-soft)] text-[var(--studio-blue)]",
    "bg-[var(--studio-soft)] text-[var(--studio-muted)]",
  ][index % 3];

  return (
    <article className="studio-marketing-feature relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--studio-rule)] bg-[var(--studio-white)] p-6 shadow-[0_5px_18px_rgb(32_40_36/0.05)] sm:p-7">
      <div className={`grid h-12 w-12 place-items-center rounded-xl ${tone}`}>
        <MarketingIcon type={icon} />
      </div>
      {label ? (
        <p className="mt-7 text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--studio-muted)]">
          {label}
        </p>
      ) : null}
      <h3
        className={`${label ? "mt-3" : "mt-7"} text-2xl font-medium leading-[1.04] tracking-[-0.05em]`}
      >
        {title}
      </h3>
      {description ? (
        <p className="mt-4 text-sm leading-7 text-[var(--studio-muted)]">
          {description}
        </p>
      ) : null}
      {children}
    </article>
  );
}

export function FeatureList({ items }) {
  return (
    <ul className="mt-7 space-y-3 border-t border-[var(--studio-rule)] pt-6">
      {items.map((item) => (
        <li
          className="flex items-center gap-3 text-sm text-[var(--studio-ink)]"
          key={item}
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-xl bg-[var(--studio-soft)] text-[var(--studio-blue)]">
            <CheckIcon className="h-3.5 w-3.5" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function NumberedRail({ ariaLabel, items }) {
  return (
    <ol
      aria-label={ariaLabel}
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
    >
      {items.map((item, index) => (
        <li
          className="relative flex min-h-24 items-center gap-3 rounded-xl border border-[var(--studio-rule)] bg-[var(--studio-white)] px-4 py-4 shadow-[0_5px_18px_rgb(32_40_36/0.05)]"
          key={item.label}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--studio-soft)] text-[11px] font-medium text-[var(--studio-blue)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-xs font-medium leading-5 tracking-[-0.02em] text-[var(--studio-ink)]">
            {item.label}
          </span>
          {index < items.length - 1 ? (
            <span className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 place-items-center rounded-xl border border-[var(--studio-rule)] bg-[var(--studio-paper)] text-[var(--studio-blue)] lg:grid">
              <ArrowIcon className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function SignalPanel({ eyebrow, items, title, tone = "light" }) {
  const dark = tone === "dark";

  return (
    <div
      className={`studio-marketing-signal relative overflow-hidden rounded-xl border p-5 shadow-[0_5px_18px_rgb(32_40_36/0.05)] sm:p-7 ${
        dark
          ? "border-white/10 bg-[var(--studio-ink)] text-white"
          : "border-[var(--studio-rule)] bg-[var(--studio-white)] text-[var(--studio-ink)]"
      }`}
    >
      <div
        className={`flex items-center justify-between border-b pb-5 ${dark ? "border-white/10" : "border-[var(--studio-rule)]"}`}
      >
        <div>
          <p
            className={`text-[11px] font-medium uppercase tracking-[0.15em] ${dark ? "text-white/80" : "text-[var(--studio-clay)]"}`}
          >
            {eyebrow}
          </p>
          <h2
            className={`mt-2 text-xl font-medium tracking-[-0.04em] ${
              dark ? "text-white" : "text-[var(--studio-ink)]"
            }`}
          >
            {title}
          </h2>
        </div>
        <span aria-hidden="true" className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-xl bg-[var(--studio-clay)] opacity-35 motion-reduce:animate-none" />
          <span className="relative inline-flex h-3 w-3 rounded-xl bg-[var(--studio-clay)]" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <div
            className={`rounded-xl border p-4 ${
              dark
                ? index === 0
                  ? "border-[var(--studio-blue)] bg-[var(--studio-blue)]"
                  : "border-white/10 bg-white/5"
                : index === 0
                  ? "border-[var(--studio-blue)]/20 bg-[var(--studio-soft)]"
                  : "border-[var(--studio-rule)] bg-white/55"
            }`}
            key={item.title}
          >
            <MarketingIcon
              className={`h-5 w-5 ${dark ? "text-white" : "text-[var(--studio-blue)]"}`}
              type={item.icon}
            />
            <p className="mt-4 text-sm font-medium tracking-[-0.025em]">
              {item.title}
            </p>
            {item.description ? (
              <p
                className={`mt-2 text-xs leading-5 ${dark ? "text-white/80" : "text-[var(--studio-muted)]"}`}
              >
                {item.description}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinalCta({
  description,
  secondaryHref,
  secondaryLabel,
  title,
}) {
  const t = useTranslations("MarketingPages");

  return (
    <section className="mx-auto max-w-[1380px] px-5 pb-24 pt-8 sm:px-8 lg:pb-32 lg:pt-12">
      <div className="studio-marketing-closing relative isolate overflow-hidden rounded-xl bg-[var(--studio-blue)] px-7 py-14 text-white sm:px-12 lg:px-16 lg:py-20">
        <div className="relative z-10 grid items-end gap-10 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <h2 className="studio-marketing-closing-title max-w-3xl text-5xl font-medium leading-[0.96] tracking-[-0.065em] sm:text-6xl">
              {title}
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white">
              {description}
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <Link
              data-studio-action="primary"
              className="studio-marketing-closing-trial group inline-flex min-h-13 items-center justify-center gap-3 bg-white px-7 py-4 text-sm font-medium text-[var(--studio-blue)] transition hover:bg-[var(--studio-soft)]"
              href="/register"
            >
              {t("common.startTrial")}
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            {secondaryHref && secondaryLabel ? (
              secondaryHref.startsWith("mailto:") ? (
                <a
                  className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-white underline-offset-4 transition hover:underline"
                  href={secondaryHref}
                >
                  {secondaryLabel}
                </a>
              ) : (
                <Link
                  className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-white underline-offset-4 transition hover:underline"
                  href={secondaryHref}
                >
                  {secondaryLabel}
                </Link>
              )
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function MarketingFooter() {
  const commonT = useTranslations("Common");
  const t = useTranslations("SharioMarketing");
  const { year, yearKey } = useCurrentYear();
  const columns = [
    {
      title: t("footer.product"),
      links: [
        [t("footer.overview"), "/product"],
        [t("footer.ai"), "/studio-ai"],
        [t("footer.pricing"), "/pricing"],
      ],
    },
    {
      title: t("footer.spaces"),
      links: [
        "coworking",
        "creative",
        "rehearsal",
        "community",
        "workshops",
      ].map((key) => [t(`spaces.${key}.title`), `/for-studios#${key}`]),
    },
    {
      title: t("footer.company"),
      links: [
        [t("footer.about"), "/product"],
        [t("footer.login"), "/login"],
        [t("footer.register"), "/register"],
      ],
    },
  ];
  return (
    <footer className="studio-marketing-footer border-t border-[var(--studio-rule)] px-5 py-12 sm:px-8">
      <div className="mx-auto grid max-w-[1320px] gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Link
            aria-label={commonT("sharioHome")}
            className="inline-flex"
            href="/"
          >
            <SkabLogo size="sm" />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--studio-muted)]">
            {t("footer.tagline")}
          </p>
        </div>
        {columns.map((column) => (
          <nav aria-label={column.title} key={column.title}>
            <h2 className="text-sm font-semibold">{column.title}</h2>
            <div className="mt-5 space-y-2">
              {column.links.map(([label, href]) => (
                <Link
                  className="block text-sm text-[var(--studio-muted)] transition hover:text-[var(--studio-blue)]"
                  href={href}
                  key={label}
                >
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        ))}
      </div>
      <div className="mx-auto mt-12 max-w-[1320px] border-t border-[var(--studio-rule)] pt-6 text-xs text-[var(--studio-muted)]">
        <span key={yearKey} suppressHydrationWarning>
          {t("footer.copyright", { year })}
        </span>
      </div>
    </footer>
  );
}
