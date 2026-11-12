"use client";

import {
  ArrowPathIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  LockClosedIcon,
  PaintBrushIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useSelector } from "react-redux";

import BrushStrokeSwash from "@/components/decorations/BrushStrokeSwash";
import SkabLogo from "@/components/brand/SkabLogo";
import { Link, usePathname } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectIsSessionReady,
  selectIsWorkspaceAuthenticated,
} from "@/lib/features/auth/authSlice";
import { useGetPublicSitePreviewQuery } from "@/lib/features/publicSite/publicSiteApiSlice";
import { buildPlatformUrl, normalizeTenantSlug } from "@/utils/tenantRouting";

const getRouteTenantSlug = (params) =>
  normalizeTenantSlug(
    Array.isArray(params?.tenantSlug)
      ? params.tenantSlug[0]
      : params?.tenantSlug,
  );

const PUBLIC_SITE_PATHS = ["/book", "/courses", "/memberships", "/help"];

const isPublicSitePath = (pathname) =>
  pathname === "/" ||
  PUBLIC_SITE_PATHS.some(
    (path) => pathname === path || pathname?.startsWith(`${path}/`),
  );

function EditorialTitle({ children }) {
  const title = String(children || "").trim();
  const finalSpace = title.lastIndexOf(" ");

  if (finalSpace < 0) return title;

  return (
    <>
      {title.slice(0, finalSpace)}{" "}
      <em className="font-serif font-normal text-skab-coral-600">
        {title.slice(finalSpace + 1)}
      </em>
    </>
  );
}

function PageFrame({ brandHref, brandLabel, children }) {
  return (
    <main
      className="relative -mt-[var(--header-height)] min-h-dvh overflow-x-clip bg-canvas px-3 py-3 text-ink sm:px-6 sm:py-5 lg:px-7 lg:py-6 2xl:px-10 2xl:py-8"
      data-public-tenant-not-found
    >
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-[1380px] flex-col sm:min-h-[calc(100dvh-2.5rem)] lg:min-h-[calc(100dvh-3rem)] 2xl:min-h-[calc(100dvh-4rem)]">
        <header
          className="flex min-h-12 items-center justify-between px-1 pb-3 sm:px-2 sm:pb-4"
          data-public-tenant-not-found-header
        >
          <a
            aria-label={`shario.io — ${brandLabel}`}
            className="group inline-flex min-h-11 items-center rounded-full px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35 focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
            href={brandHref}
          >
            <SkabLogo />
          </a>
          <p className="hidden text-[10px] font-bold uppercase tracking-[0.15em] text-[#676762] sm:block">
            {brandLabel}
          </p>
        </header>

        {children}
      </div>
    </main>
  );
}

function StatusLoader({ brandHref, t }) {
  return (
    <PageFrame brandHref={brandHref} brandLabel={t("brandLabel")}>
      <section className="surface-card flex flex-1 items-center justify-center overflow-hidden bg-white p-8 text-center">
        <div role="status" aria-live="polite">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cobalt-100 bg-cobalt-50 text-cobalt-600 shadow-[0_12px_30px_rgb(var(--skab-blue-rgb)/0.12)]">
            <ArrowPathIcon
              aria-hidden="true"
              className="h-6 w-6 animate-spin"
            />
          </span>
          <p className="mt-5 text-sm font-semibold text-[#4D4C47]">
            {t("checking")}
          </p>
        </div>
      </section>
    </PageFrame>
  );
}

function OwnerPreview({ t }) {
  const steps = [
    {
      key: "draft",
      icon: CheckCircleIcon,
      complete: true,
    },
    {
      key: "review",
      icon: EyeIcon,
      complete: false,
    },
    {
      key: "publish",
      icon: RocketLaunchIcon,
      complete: false,
    },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="relative rounded-[26px] border border-white/85 bg-white/90 p-5 shadow-[0_26px_70px_rgba(54,45,35,0.14)] backdrop-blur-xl sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-[#E7E4DE] pb-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-[15px] bg-brand-primary text-white shadow-[0_10px_24px_rgb(var(--skab-blue-rgb)/0.22)]">
            <PaintBrushIcon aria-hidden="true" className="size-5" />
          </span>
          <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-[#E7E4DE] bg-brand-offset px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-[#62625D]">
            <LockClosedIcon aria-hidden="true" className="h-3 w-3" />
            {t("owner.previewBadge")}
          </span>
        </div>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#676762]">
          {t("owner.previewLabel")}
        </p>
        <ol className="mt-3">
          {steps.map(({ key, icon: Icon, complete }) => (
            <li
              key={key}
              className="flex items-start gap-3 border-b border-[#E7E4DE] py-3 first:pt-1 last:border-b-0 last:pb-0"
            >
              <span
                className={
                  complete
                    ? "grid size-9 shrink-0 place-items-center rounded-full bg-[#E5EBDB] text-[#44543A]"
                    : "grid size-9 shrink-0 place-items-center rounded-full bg-skab-cobalt-50 text-primary-text"
                }
              >
                <Icon aria-hidden="true" className="size-[18px]" />
              </span>
              <span className="min-w-0 pt-0.5">
                <strong className="block text-xs text-[#2D2D29]">
                  {t(`owner.steps.${key}.title`)}
                </strong>
                <small className="mt-0.5 block text-[11px] leading-4 text-[#62625D]">
                  {t(`owner.steps.${key}.description`)}
                </small>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function VisitorPreview({ t }) {
  return (
    <div className="relative mx-auto w-full max-w-[410px]" aria-hidden="true">
      <div className="relative overflow-hidden rounded-[28px] border border-white/85 bg-white/90 p-7 shadow-[0_26px_70px_rgba(54,45,35,0.14)] backdrop-blur-xl sm:p-9">
        <div className="flex items-center justify-between">
          <span className="grid size-11 place-items-center rounded-[15px] bg-skab-cobalt-50 text-primary-text">
            <GlobeAltIcon className="size-5" />
          </span>
          <span className="inline-flex min-h-7 items-center rounded-full border border-[#E7E4DE] bg-brand-offset px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-[#62625D]">
            {t("visitor.badge")}
          </span>
        </div>
        <p className="mt-8 text-[clamp(6.5rem,13vw,9rem)] font-semibold leading-[0.76] tracking-[-0.09em] text-primary-text">
          404
          <span className="font-serif font-normal text-skab-coral-600">.</span>
        </p>
        <div className="mt-7 flex items-center gap-3 border-t border-[#E7E4DE] pt-5">
          <span className="grid size-9 place-items-center rounded-full bg-surface-muted text-[#62625D]">
            <LockClosedIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="h-2 w-3/4 rounded-full bg-[#D9D5CC]" />
            <div className="mt-2 h-2 w-1/2 rounded-full bg-[#E5E1D9]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicTenantNotFound() {
  const t = useTranslations("PublicSiteNotFound");
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const currentTenant = useSelector(selectCurrentTenant);
  const isWorkspaceAuthenticated = useSelector(selectIsWorkspaceAuthenticated);
  const sessionReady = useSelector(selectIsSessionReady);
  const platformHref = buildPlatformUrl({ locale, pathname: "/" });
  const routeTenantSlug = getRouteTenantSlug(params);
  const currentTenantSlug = normalizeTenantSlug(currentTenant?.slug);
  const canVerifyWorkspace = Boolean(
    sessionReady &&
    isWorkspaceAuthenticated &&
    isPublicSitePath(pathname) &&
    routeTenantSlug &&
    currentTenantSlug === routeTenantSlug,
  );
  const previewQuery = useGetPublicSitePreviewQuery(undefined, {
    skip: !canVerifyWorkspace,
  });
  const checkingStatus =
    !sessionReady ||
    (canVerifyWorkspace &&
      !previewQuery.data &&
      (previewQuery.isLoading ||
        previewQuery.isFetching ||
        previewQuery.isUninitialized));
  const publication = previewQuery.data?.editor;
  const isConfirmedUnpublished = Boolean(
    canVerifyWorkspace &&
    publication?.publiclyAvailable === false &&
    publication?.publicationStatus !== "live",
  );
  const pageTitle = isConfirmedUnpublished
    ? t("owner.title")
    : t("visitor.title");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${pageTitle} | shario.io`;

    return () => {
      document.title = previousTitle;
    };
  }, [pageTitle]);

  if (checkingStatus) {
    return <StatusLoader brandHref={platformHref} t={t} />;
  }

  return (
    <PageFrame brandHref={platformHref} brandLabel={t("brandLabel")}>
      <section
        aria-labelledby="public-site-not-found-title"
        className="grain-surface relative isolate flex flex-1 overflow-hidden rounded-[24px] border border-[#E7E4DE] bg-white shadow-[0_26px_90px_rgba(31,31,31,0.08)] sm:rounded-[30px] 2xl:rounded-[34px]"
      >
        <div
          data-testid="public-site-not-found-layout"
          className="relative z-[2] grid w-full xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.88fr)]"
        >
          <div
            className="flex min-w-0 flex-col justify-center p-5 sm:p-8 lg:p-10 xl:p-11 2xl:p-16"
            data-public-tenant-not-found-content
          >
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">
                {isConfirmedUnpublished
                  ? t("owner.eyebrow")
                  : t("visitor.eyebrow")}
              </p>
              <span
                className={
                  isConfirmedUnpublished
                    ? "inline-flex min-h-7 items-center gap-1.5 rounded-full border border-coral-200 bg-coral-50 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-terracotta-700"
                    : "inline-flex min-h-7 items-center gap-1.5 rounded-full border border-[#E4E2DC] bg-[#F8F7F3] px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#62625D]"
                }
              >
                {isConfirmedUnpublished ? (
                  <EyeSlashIcon aria-hidden="true" className="h-3.5 w-3.5" />
                ) : (
                  <LockClosedIcon aria-hidden="true" className="h-3.5 w-3.5" />
                )}
                {isConfirmedUnpublished ? t("owner.badge") : t("visitor.badge")}
              </span>
            </div>

            <h1
              id="public-site-not-found-title"
              className="mt-6 max-w-[760px] text-[clamp(2.25rem,4.6vw,4.25rem)] font-semibold leading-[0.96] tracking-[-0.06em] text-[#171714] sm:mt-7 2xl:text-[4.75rem]"
            >
              <EditorialTitle>
                {isConfirmedUnpublished ? t("owner.title") : t("visitor.title")}
              </EditorialTitle>
            </h1>
            <p className="mt-5 max-w-[610px] text-[14px] leading-6 text-[#686762] sm:mt-6 sm:text-[15px] sm:leading-7">
              {isConfirmedUnpublished
                ? t("owner.description")
                : t("visitor.description")}
            </p>

            {isConfirmedUnpublished ? (
              <>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href="/app/setup?step=publish"
                    className="button-primary w-full shadow-cobalt sm:w-auto"
                  >
                    <RocketLaunchIcon
                      aria-hidden="true"
                      className="h-[18px] w-[18px]"
                    />
                    {t("owner.primaryAction")}
                    <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/app/settings/public-site"
                    className="button-secondary w-full sm:w-auto"
                  >
                    <PaintBrushIcon
                      aria-hidden="true"
                      className="h-[18px] w-[18px]"
                    />
                    {t("owner.secondaryAction")}
                  </Link>
                </div>
                <div className="mt-7 flex max-w-[610px] items-start gap-3 rounded-2xl border border-[#E6E4DE] bg-[#FAF9F6] px-4 py-3.5 text-[11px] leading-5 text-[#686762]">
                  <LockClosedIcon
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#76756F]"
                  />
                  <p>{t("owner.reassurance")}</p>
                </div>
              </>
            ) : (
              <>
                <div className="mt-8">
                  <a
                    href={platformHref}
                    className="button-primary w-full shadow-cobalt sm:w-auto"
                  >
                    <GlobeAltIcon
                      aria-hidden="true"
                      className="h-[18px] w-[18px]"
                    />
                    {t("visitor.primaryAction")}
                    <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
                  </a>
                </div>
                <p className="mt-6 max-w-[590px] text-[11px] leading-5 text-[#676762]">
                  {t("visitor.hint")}
                </p>
              </>
            )}
          </div>

          <div
            data-public-tenant-not-found-visual
            data-testid="public-site-not-found-preview"
            className="relative hidden min-h-[330px] items-center overflow-hidden border-t border-line bg-surface p-6 md:flex md:min-h-[360px] md:p-8 xl:min-h-0 xl:border-l xl:border-t-0 xl:p-8 2xl:p-12"
          >
            <div className="absolute inset-0 grain-surface opacity-35" />
            <BrushStrokeSwash
              className="-right-[22rem] top-[8%] w-[56rem] rotate-[-8deg] opacity-55 xl:-right-[25rem] xl:w-[62rem] 2xl:-right-[20rem] 2xl:w-[70rem]"
              texture="loaded"
              tone="cobalt"
            />
            <BrushStrokeSwash
              className="-bottom-7 -left-[18rem] w-[52rem] rotate-[7deg] opacity-55 xl:-left-[25rem] xl:w-[58rem] 2xl:-left-[20rem] 2xl:w-[66rem]"
              side="left"
              texture="rake"
              tone="coral"
            />
            <div className="relative z-[2] w-full">
              {isConfirmedUnpublished ? (
                <OwnerPreview t={t} />
              ) : (
                <VisitorPreview t={t} />
              )}
            </div>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}
