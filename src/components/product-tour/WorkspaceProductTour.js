"use client";

import {
  Dialog,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  RocketLaunchIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { usePathname, useRouter } from "@/i18n/navigation";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";
import { useTrackSetupEventMutation } from "@/lib/features/setup-center/setupCenterApiSlice";
import { useUpdateWorkspacePreferencesMutation } from "@/lib/features/workspace-access/workspaceAccessApiSlice";
import useWorkspaceTourLayout from "@/components/tours/useWorkspaceTourLayout";
import { workspaceTourPanelMaxHeight } from "@/components/tours/workspaceTourGeometry";
import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogBody,
  WorkspaceDialogFooter,
  WorkspaceDialogHeader,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";

import {
  PRODUCT_TOUR_ENTRY_POINT,
  PRODUCT_TOUR_REPLAY_PARAM,
  PRODUCT_TOUR_REPLAY_VALUE,
  PRODUCT_TOUR_STEPS,
  PRODUCT_TOUR_TOTAL_STEPS,
  PRODUCT_TOUR_VERSION,
  buildProductTourEvent,
  createProductTourId,
} from "./productTour.config";

function SpotlightBackdrop({ rect }) {
  const paneClass =
    "fixed z-[110] bg-[#11110F]/55 backdrop-blur-[2px] motion-reduce:backdrop-blur-none";

  if (!rect) {
    return (
      <div
        aria-hidden="true"
        data-product-tour-backdrop
        className={`${paneClass} inset-0`}
      />
    );
  }

  return (
    <>
      <div
        aria-hidden="true"
        data-product-tour-backdrop
        className={`${paneClass} left-0 right-0 top-0`}
        style={{ height: rect.top }}
      />
      <div
        aria-hidden="true"
        data-product-tour-backdrop
        className={`${paneClass} left-0`}
        style={{
          top: rect.top,
          width: rect.left,
          height: rect.height,
        }}
      />
      <div
        aria-hidden="true"
        data-product-tour-backdrop
        className={`${paneClass} right-0`}
        style={{
          top: rect.top,
          left: rect.right,
          height: rect.height,
        }}
      />
      <div
        aria-hidden="true"
        data-product-tour-backdrop
        className={`${paneClass} bottom-0 left-0 right-0`}
        style={{ top: rect.bottom }}
      />
      <div
        aria-hidden="true"
        data-product-tour-spotlight
        className="pointer-events-none fixed z-[111] rounded-[18px] border-2 border-white/90 shadow-[0_0_0_3px_rgb(var(--skab-blue-rgb)/0.72),0_18px_50px_rgba(17,17,15,0.2)] transition-[left,top,width,height] duration-200 motion-reduce:transition-none"
        style={rect}
      />
    </>
  );
}

export default function WorkspaceProductTour({
  eligible = false,
  studioCount = 0,
}) {
  const t = useTranslations("Dashboard.productTour");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const [trackSetupEvent] = useTrackSetupEventMutation();
  const [updateWorkspacePreferences] = useUpdateWorkspacePreferencesMutation();
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [entryPoint, setEntryPoint] = useState(
    PRODUCT_TOUR_ENTRY_POINT.AUTOMATIC,
  );
  const [sessionId, setSessionId] = useState("");
  const automaticKeyRef = useRef("");
  const replayHandledRef = useRef("");
  const completionSessionRef = useRef("");
  const viewedStepsRef = useRef(new Set());
  const currentStep = PRODUCT_TOUR_STEPS[stepIndex];
  const showCompletion = stepIndex === PRODUCT_TOUR_STEPS.length;
  const completionSelectors = useMemo(() => [], []);
  const activeStep = showCompletion ? null : currentStep;
  const { panelRef, panelStyle, targetRect } = useWorkspaceTourLayout({
    active: open,
    selectors: completionSelectors,
    step: activeStep,
  });

  const emit = useCallback(
    ({ event, position, session, step, sourceEntryPoint }) => {
      if (!session) return Promise.resolve(null);

      return trackSetupEvent(
        buildProductTourEvent({
          entryPoint: sourceEntryPoint,
          event,
          position,
          sessionId: session,
          step,
          studioCount,
        }),
      )
        .unwrap()
        .catch(() => null);
    },
    [studioCount, trackSetupEvent],
  );

  const showWelcome = useCallback(() => {
    setWelcomeOpen(true);
  }, []);

  const beginTour = useCallback(
    (sourceEntryPoint) => {
      const nextSession = createProductTourId("tour");
      viewedStepsRef.current = new Set();
      setWelcomeOpen(false);
      setEntryPoint(sourceEntryPoint);
      setSessionId(nextSession);
      setStepIndex(0);
      setOpen(true);
      void emit({
        event: "product_tour_started",
        session: nextSession,
        sourceEntryPoint,
      });
    },
    [emit],
  );

  useEffect(() => {
    if (!eligible || !workspaceAccess) return;

    const preferences = workspaceAccess.preferences ?? {};
    const saved = preferences.productTour;
    const membershipKey =
      workspaceAccess.membershipId ||
      workspaceAccess.userId ||
      workspaceAccess.roleKey ||
      "current";
    const automaticKey = `${membershipKey}:${PRODUCT_TOUR_VERSION}`;
    const replayRequested =
      searchParams.get(PRODUCT_TOUR_REPLAY_PARAM) === PRODUCT_TOUR_REPLAY_VALUE;

    if (replayRequested) {
      const replayKey = `${pathname}?${searchParams.toString()}`;
      if (replayHandledRef.current !== replayKey) {
        replayHandledRef.current = replayKey;
        automaticKeyRef.current = automaticKey;
        beginTour(PRODUCT_TOUR_ENTRY_POINT.HELP_REPLAY);
        router.replace("/app", { scroll: false });
      }
      return;
    }

    replayHandledRef.current = "";

    const normalizedPathname =
      pathname?.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    if (normalizedPathname !== "/app") return;

    const acknowledged =
      Number(saved?.version) >= PRODUCT_TOUR_VERSION &&
      (saved?.status === "completed" || saved?.status === "skipped");

    if (acknowledged) return;

    if (automaticKeyRef.current !== automaticKey) {
      automaticKeyRef.current = automaticKey;
      showWelcome();
    }
  }, [
    beginTour,
    eligible,
    pathname,
    router,
    searchParams,
    showWelcome,
    workspaceAccess,
  ]);

  useEffect(() => {
    if (!open || !currentStep || !sessionId) return;

    const viewedKey = `${sessionId}:${currentStep.key}`;
    if (viewedStepsRef.current.has(viewedKey)) return;

    viewedStepsRef.current.add(viewedKey);
    void emit({
      event: currentStep.event,
      position: stepIndex + 1,
      session: sessionId,
      sourceEntryPoint: entryPoint,
      step: currentStep.key,
    });
  }, [currentStep, emit, entryPoint, open, sessionId, stepIndex]);

  const persistAcknowledgement = useCallback(
    (status, lastStep) =>
      updateWorkspacePreferences({
        productTour: {
          version: PRODUCT_TOUR_VERSION,
          status,
          lastStep,
        },
      })
        .unwrap()
        .catch(() => null),
    [updateWorkspacePreferences],
  );

  const dismissWelcome = useCallback(() => {
    if (!welcomeOpen) return;

    setWelcomeOpen(false);
    void persistAcknowledgement("skipped", PRODUCT_TOUR_STEPS[0].key);
  }, [persistAcknowledgement, welcomeOpen]);

  const startWelcomeTour = useCallback(() => {
    if (!welcomeOpen) return;

    setWelcomeOpen(false);
    beginTour(PRODUCT_TOUR_ENTRY_POINT.AUTOMATIC);
  }, [beginTour, welcomeOpen]);

  useEffect(() => {
    if (
      !open ||
      !showCompletion ||
      !sessionId ||
      completionSessionRef.current === sessionId
    ) {
      return;
    }

    completionSessionRef.current = sessionId;
    void emit({
      event: "product_tour_completed",
      position: PRODUCT_TOUR_TOTAL_STEPS,
      session: sessionId,
      sourceEntryPoint: entryPoint,
      step: PRODUCT_TOUR_STEPS.at(-1).key,
    });
    void persistAcknowledgement("completed", PRODUCT_TOUR_STEPS.at(-1).key);
  }, [
    emit,
    entryPoint,
    open,
    persistAcknowledgement,
    sessionId,
    showCompletion,
  ]);

  const skip = useCallback(() => {
    if (!open || !currentStep) return;

    setOpen(false);
    void emit({
      event: "product_tour_skipped",
      position: stepIndex + 1,
      session: sessionId,
      sourceEntryPoint: entryPoint,
      step: currentStep.key,
    });
    void persistAcknowledgement("skipped", currentStep.key);
  }, [
    currentStep,
    emit,
    entryPoint,
    open,
    persistAcknowledgement,
    sessionId,
    stepIndex,
  ]);

  const closeTour = useCallback(() => {
    if (showCompletion) {
      setOpen(false);
      return;
    }

    skip();
  }, [showCompletion, skip]);

  const openLaunchCenter = useCallback(() => {
    setOpen(false);
    void emit({
      event: "product_tour_launch_center_opened",
      session: sessionId,
      sourceEntryPoint: entryPoint,
      step: "launch_center",
    });
    router.push("/app/setup");
  }, [emit, entryPoint, router, sessionId]);

  const description = (() => {
    if (showCompletion) return t("final.description");

    const mobileMenuStep = currentStep?.mobileSelectors?.includes(
      "[data-mobile-navigation-trigger]",
    );
    if (
      mobileMenuStep &&
      typeof window !== "undefined" &&
      window.innerWidth < 1280
    ) {
      return t("mobileMenuDescription", {
        description:
          currentStep.key === "studio_switcher"
            ? t(
                `steps.studio_switcher.description.${
                  studioCount > 1
                    ? "multiple"
                    : studioCount === 1
                      ? "single"
                      : "none"
                }`,
              )
            : t(`steps.${currentStep.key}.description`),
      });
    }

    if (currentStep?.key !== "studio_switcher") {
      return currentStep ? t(`steps.${currentStep.key}.description`) : "";
    }

    const variant =
      studioCount > 1 ? "multiple" : studioCount === 1 ? "single" : "none";
    return t(`steps.studio_switcher.description.${variant}`);
  })();

  if (!currentStep && !showCompletion) return null;

  return (
    <>
      <Dialog
        open={welcomeOpen}
        onClose={dismissWelcome}
        className="relative z-[100]"
        data-product-tour-welcome
      >
        <WorkspaceDialogBackdrop data-product-tour-welcome-backdrop />
        <WorkspaceDialogViewport layout="compact">
          <WorkspaceDialogPanel
            layout="compact"
            size="compact"
            data-product-tour-welcome-panel
          >
            <WorkspaceDialogHeader
              eyebrow={t("welcome.eyebrow")}
              title={t("welcome.title")}
              description={t("welcome.description")}
              onClose={dismissWelcome}
              closeLabel={t("welcome.close")}
            />
            <WorkspaceDialogBody>
              <div className="flex items-center gap-3 rounded-[18px] border border-cobalt-100 bg-cobalt-50/70 px-4 py-3 text-cobalt-800">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-xs">
                  <RocketLaunchIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="text-[13px] font-semibold">
                  {t("welcome.duration")}
                </p>
              </div>
            </WorkspaceDialogBody>
            <WorkspaceDialogFooter>
              <button
                type="button"
                onClick={dismissWelcome}
                className="min-h-11 rounded-full border border-line px-5 text-[12px] font-semibold text-ink transition hover:border-line-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35"
              >
                {t("welcome.dismiss")}
              </button>
              <button
                type="button"
                data-autofocus
                onClick={startWelcomeTour}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-700 px-5 text-[12px] font-semibold text-white shadow-[0_10px_24px_rgb(var(--skab-blue-rgb)/0.22)] transition hover:bg-cobalt-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/40 focus-visible:ring-offset-2"
              >
                <RocketLaunchIcon className="h-4 w-4" aria-hidden="true" />
                {t("welcome.start")}
              </button>
            </WorkspaceDialogFooter>
          </WorkspaceDialogPanel>
        </WorkspaceDialogViewport>
      </Dialog>

      <Dialog
        key={sessionId || "product-tour"}
        open={open}
        onClose={closeTour}
        className="relative z-[110]"
        data-product-tour
        data-product-tour-step={showCompletion ? "complete" : currentStep.key}
      >
        <SpotlightBackdrop rect={showCompletion ? null : targetRect} />

        <DialogPanel
          ref={panelRef}
          data-product-tour-panel
          style={{
            ...panelStyle,
            maxHeight: workspaceTourPanelMaxHeight,
          }}
          className="fixed z-[112] overflow-y-auto overscroll-contain rounded-[22px] border border-white/80 bg-surface-raised p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_28px_90px_rgba(17,17,15,0.28)] focus:outline-none sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                aria-live="polite"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-700"
              >
                {t("progress", {
                  current: Math.min(stepIndex + 1, PRODUCT_TOUR_TOTAL_STEPS),
                  total: PRODUCT_TOUR_TOTAL_STEPS,
                })}
              </p>
              <DialogTitle className="mt-2 text-[21px] font-semibold tracking-[-0.03em] text-ink">
                {showCompletion
                  ? t("final.title")
                  : t(`steps.${currentStep.key}.title`)}
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={closeTour}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35"
              aria-label={showCompletion ? t("close") : t("skip")}
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <DialogDescription className="mt-3 text-[13px] leading-6 text-ink-muted">
            {description}
          </DialogDescription>

          <div
            className="mt-5 h-1.5 overflow-hidden rounded-full bg-cobalt-100"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-cobalt-600 transition-[width] duration-200 motion-reduce:transition-none"
              style={{
                width: `${
                  (Math.min(stepIndex + 1, PRODUCT_TOUR_TOTAL_STEPS) /
                    PRODUCT_TOUR_TOTAL_STEPS) *
                  100
                }%`,
              }}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {showCompletion ? (
              <span aria-hidden="true" />
            ) : (
              <button
                type="button"
                onClick={skip}
                className="min-h-11 px-1 text-[12px] font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35"
              >
                {t("skip")}
              </button>
            )}

            <div className="flex items-center gap-2">
              {!showCompletion && stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    setStepIndex((value) => Math.max(0, value - 1))
                  }
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-[12px] font-semibold text-ink transition hover:border-line-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35"
                >
                  <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                  {t("back")}
                </button>
              ) : null}

              {showCompletion ? (
                <button
                  type="button"
                  onClick={openLaunchCenter}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-cobalt-700 px-5 text-[12px] font-semibold text-white shadow-[0_10px_24px_rgb(var(--skab-blue-rgb)/0.22)] transition hover:bg-cobalt-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/40 focus-visible:ring-offset-2"
                >
                  <RocketLaunchIcon className="h-4 w-4" aria-hidden="true" />
                  {t("openLaunchCenter")}
                </button>
              ) : (
                <button
                  type="button"
                  data-autofocus
                  onClick={() =>
                    setStepIndex((value) =>
                      Math.min(PRODUCT_TOUR_STEPS.length, value + 1),
                    )
                  }
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-cobalt-700 px-5 text-[12px] font-semibold text-white shadow-[0_10px_24px_rgb(var(--skab-blue-rgb)/0.22)] transition hover:bg-cobalt-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/40 focus-visible:ring-offset-2"
                >
                  {t("next")}
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </>
  );
}
