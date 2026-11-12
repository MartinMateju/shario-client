"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { Link, usePathname } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { useAiWorkspace } from "@/components/ai/AiWorkspaceProvider";
import {
  PRODUCT_TOUR_REPLAY_PARAM,
  PRODUCT_TOUR_REPLAY_VALUE,
  PRODUCT_TOUR_VERSION,
} from "@/components/product-tour/productTour.config";
import {
  buildContextualGuideHref,
  getEligibleContextualGuides,
} from "@/components/guides/contextualGuides.config";
import UtilityTooltip from "@/components/tooltips/UtilityTooltip";

const EMPTY_GUIDE_STATE = Object.freeze({});

const GuideCardContent = ({
  actionLabel,
  completed = false,
  completedLabel,
  description,
  duration,
  title,
}) => (
  <span className="min-w-0 flex-1">
    <span className="flex items-start gap-2">
      <span className="min-w-0 flex-1 text-[13px] font-semibold leading-5 text-ink">
        {title}
      </span>
      {completed ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
          <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {completedLabel}
        </span>
      ) : null}
    </span>
    <span className="mt-0.5 line-clamp-2 block text-[11px] font-normal leading-4 text-ink-muted">
      {description}
    </span>
    <span className="mt-1.5 flex items-center justify-between gap-3">
      <span className="text-[10px] font-medium text-ink-subtle">
        {duration}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-cobalt-700">
        {actionLabel}
        <ArrowRightIcon
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
          aria-hidden="true"
        />
      </span>
    </span>
  </span>
);

const EmptyGuides = ({ description }) => (
  <div className="flex min-h-40 flex-col items-center justify-center rounded-[15px] border border-dashed border-line bg-surface-raised px-6 text-center">
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sand-100 text-terracotta-700">
      <BookOpenIcon className="h-5 w-5" aria-hidden="true" />
    </span>
    <p className="mt-3 text-[12px] font-semibold text-ink">{description}</p>
  </div>
);

const ProgressBar = ({ completed, label, total }) => {
  const maximum = Math.max(total, 1);
  const percentage = total
    ? Math.min(100, Math.round((completed / total) * 100))
    : 0;

  return (
    <div className="border-b border-line bg-surface-raised px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-medium text-ink-subtle">{label}</p>
        <span className="text-[10px] font-semibold tabular-nums text-cobalt-700">
          {percentage}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={maximum}
        aria-valuenow={completed}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/70"
        data-workspace-guide-progress
      >
        <span
          className="block h-full rounded-full bg-cobalt-600 transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const HelpHeaderIcon = () => (
  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-terracotta-100 bg-sand-100 text-terracotta-700 shadow-xs">
    <QuestionMarkCircleIcon className="h-5 w-5" aria-hidden="true" />
  </span>
);

export default function WorkspaceHelpMenu({ canReplayProductTour = false }) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const {
    assistantOpen,
    available: aiAvailable,
    closeAssistant,
  } = useAiWorkspace();
  const [open, setOpen] = useState(false);
  const [dialogSession, setDialogSession] = useState(0);
  const dialogId = `workspace-help-${useId().replaceAll(":", "")}`;
  const guides = useMemo(
    () =>
      searchParams.has("setupStep")
        ? []
        : getEligibleContextualGuides({
            aiAvailable,
            tenant,
            workspaceAccess,
          }),
    [aiAvailable, searchParams, tenant, workspaceAccess],
  );
  const savedGuides =
    workspaceAccess?.preferences?.contextualGuides ?? EMPTY_GUIDE_STATE;
  const savedProductTour = workspaceAccess?.preferences?.productTour;
  const productTourCompleted =
    Number(savedProductTour?.version) >= PRODUCT_TOUR_VERSION &&
    savedProductTour?.status === "completed";

  const guideRows = useMemo(
    () =>
      guides.map((guide) => {
        const saved = savedGuides[guide.id];

        const completed =
          Number(saved?.version) >= guide.version &&
          saved?.status === "completed";

        return {
          completed,
          description: t(`guides.items.${guide.id}.description`),
          guide,
          href: buildContextualGuideHref(guide, {
            pathname,
            search: searchParams.toString(),
          }),
          title: t(`guides.items.${guide.id}.title`),
        };
      }),
    [guides, pathname, savedGuides, searchParams, t],
  );
  const availableRows = guideRows.filter((row) => !row.completed);
  const completedRows = guideRows.filter((row) => row.completed);
  const totalGuides = guideRows.length + (canReplayProductTour ? 1 : 0);
  const completedGuides =
    guideRows.filter((row) => row.completed).length +
    (canReplayProductTour && productTourCompleted ? 1 : 0);
  const hasHelpContent = canReplayProductTour || guideRows.length > 0;

  const closeHelp = useCallback(() => {
    setOpen(false);
  }, []);

  const closeHelpForNavigation = useCallback(() => {
    setOpen(false);
    // A guide can open its own dialog while this drawer is still entering.
    // Discard that transition immediately so it cannot retain an old focus trap.
    setDialogSession((session) => session + 1);
  }, []);

  const openHelp = () => {
    closeAssistant?.();
    setOpen(true);
  };

  useEffect(() => {
    if (!assistantOpen) return undefined;

    const closeTimer = window.setTimeout(closeHelp, 0);
    return () => window.clearTimeout(closeTimer);
  }, [assistantOpen, closeHelp]);

  const renderGuideRow = ({ completed, description, guide, href, title }) => (
    <Link
      key={guide.id}
      href={href}
      onClick={closeHelpForNavigation}
      data-contextual-guide-replay={guide.id}
      className="group flex min-h-[72px] items-center gap-3 rounded-[15px] border border-line bg-surface-raised px-3.5 py-2.5 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-cobalt-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 motion-reduce:transform-none"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-sand-50 text-terracotta-700 transition group-hover:bg-sand-100">
        <BookOpenIcon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <GuideCardContent
        actionLabel={
          completed ? t("guides.replayGuide") : t("guides.startGuide")
        }
        completed={completed}
        completedLabel={t("guides.completed")}
        description={description}
        duration={t("guides.duration")}
        title={title}
      />
    </Link>
  );

  return (
    <>
      <button
        type="button"
        aria-controls={dialogId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("help.open")}
        data-workspace-help-trigger
        onClick={openHelp}
        className="group/topbar-action relative inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-[13px] border border-line bg-coral-100 text-ink-soft shadow-xs transition active:scale-[0.97] active:border-cobalt-200 active:bg-cobalt-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel motion-reduce:transform-none md:rounded-full md:hover:-translate-y-0.5 md:hover:border-cobalt-200 md:hover:bg-cobalt-50 md:hover:text-cobalt-700"
      >
        <UtilityTooltip>{t("help.open")}</UtilityTooltip>
        <QuestionMarkCircleIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      <Dialog
        key={dialogSession}
        open={open}
        onClose={closeHelp}
        className="relative z-[90]"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-ink/25 backdrop-blur-[2px] transition duration-300 data-closed:opacity-0 motion-reduce:transition-none"
        />
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 flex justify-end">
            <DialogPanel
              id={dialogId}
              data-dialog-layout="drawer"
              data-workspace-guide-center
              transition
              className="flex h-full w-full max-w-[470px] transform flex-col border-l border-line bg-canvas shadow-floating transition duration-300 ease-out data-closed:translate-x-full motion-reduce:transform-none motion-reduce:transition-none"
            >
              <header className="flex min-h-[76px] items-center gap-3 border-b border-line bg-white px-5">
                <HelpHeaderIcon />
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-sm font-semibold text-ink">
                    {t("help.title")}
                  </DialogTitle>
                  <p className="mt-0.5 text-[11px] leading-4 text-ink-muted">
                    {t("guides.centerDescription")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeHelp}
                  aria-label={t("help.close")}
                  className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35"
                >
                  <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </header>

              <ProgressBar
                completed={completedGuides}
                label={t("guides.summary", {
                  completed: completedGuides,
                  total: totalGuides,
                })}
                total={totalGuides}
              />

              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-color:rgba(112,107,100,0.28)_transparent] [scrollbar-width:thin]"
                data-workspace-guide-scroll
              >
                {canReplayProductTour ? (
                  <section aria-labelledby={`${dialogId}-product-tour`}>
                    <h2
                      id={`${dialogId}-product-tour`}
                      className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle"
                    >
                      {t("help.productTourSection")}
                    </h2>
                    <Link
                      href={`/app?${PRODUCT_TOUR_REPLAY_PARAM}=${PRODUCT_TOUR_REPLAY_VALUE}`}
                      onClick={closeHelpForNavigation}
                      data-product-tour-replay
                      className="group flex min-h-[76px] items-center gap-3 rounded-[15px] border border-cobalt-100 bg-cobalt-50/70 px-3.5 py-2.5 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-cobalt-200 hover:bg-cobalt-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 motion-reduce:transform-none"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white text-cobalt-700 shadow-xs">
                        <PlayCircleIcon
                          className="h-4.5 w-4.5"
                          aria-hidden="true"
                        />
                      </span>
                      <GuideCardContent
                        actionLabel={
                          productTourCompleted
                            ? t("help.replayProductTour")
                            : t("help.startProductTour")
                        }
                        completed={productTourCompleted}
                        completedLabel={t("guides.completed")}
                        description={t("help.productTourDescription")}
                        duration={t("guides.duration")}
                        title={t("help.productTour")}
                      />
                    </Link>
                  </section>
                ) : null}

                {availableRows.length ? (
                  <section
                    aria-labelledby={`${dialogId}-available`}
                    className={canReplayProductTour ? "mt-5" : ""}
                  >
                    <h2
                      id={`${dialogId}-available`}
                      className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle"
                    >
                      {t("guides.availableTitle")}
                    </h2>
                    <div className="space-y-1.5">
                      {availableRows.map(renderGuideRow)}
                    </div>
                  </section>
                ) : null}

                {completedRows.length ? (
                  <section
                    aria-labelledby={`${dialogId}-completed`}
                    className={
                      canReplayProductTour || availableRows.length ? "mt-5" : ""
                    }
                  >
                    <h2
                      id={`${dialogId}-completed`}
                      className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle"
                    >
                      {t("guides.completedTitle")}
                    </h2>
                    <div className="space-y-1.5">
                      {completedRows.map(renderGuideRow)}
                    </div>
                  </section>
                ) : null}

                {!hasHelpContent ? (
                  <EmptyGuides description={t("guides.noneAvailable")} />
                ) : null}
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
