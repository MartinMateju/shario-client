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
  CheckCircleIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { usePathname, useRouter } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { useAiWorkspace } from "@/components/ai/AiWorkspaceProvider";
import { useTrackSetupEventMutation } from "@/lib/features/setup-center/setupCenterApiSlice";
import { useUpdateWorkspacePreferencesMutation } from "@/lib/features/workspace-access/workspaceAccessApiSlice";
import useWorkspaceTourLayout from "@/components/tours/useWorkspaceTourLayout";
import { workspaceTourPanelMaxHeight } from "@/components/tours/workspaceTourGeometry";

import {
  CONTEXTUAL_GUIDE_BY_ID,
  CONTEXTUAL_GUIDE_ENTRY_POINT,
  CONTEXTUAL_GUIDE_PARAM,
  buildContextualGuideCtaHref,
  createContextualGuideEvent,
  createContextualGuideSessionId,
  getContextualGuideStepEvent,
  getContextualPromptGuideForRoute,
  isContextualGuideEligible,
} from "./contextualGuides.config";

const PROMPT_SESSION_PREFIX = "shario:contextual-guide-prompt:v1";

const getPromptSessionKey = (workspaceAccess) => {
  const memberKey =
    workspaceAccess?.membershipId ||
    workspaceAccess?.userId ||
    workspaceAccess?.roleKey ||
    "current";
  return `${PROMPT_SESSION_PREFIX}:${memberKey}`;
};

function SpotlightBackdrop({ rect }) {
  const paneClass =
    "fixed z-[110] bg-[#11110F]/55 backdrop-blur-[2px] motion-reduce:backdrop-blur-none";

  if (!rect) {
    return (
      <div
        aria-hidden="true"
        data-contextual-guide-backdrop
        className={`${paneClass} inset-0`}
      />
    );
  }

  return (
    <>
      <div
        aria-hidden="true"
        data-contextual-guide-backdrop
        className={`${paneClass} left-0 right-0 top-0`}
        style={{ height: rect.top }}
      />
      <div
        aria-hidden="true"
        data-contextual-guide-backdrop
        className={`${paneClass} left-0`}
        style={{ top: rect.top, width: rect.left, height: rect.height }}
      />
      <div
        aria-hidden="true"
        data-contextual-guide-backdrop
        className={`${paneClass} right-0`}
        style={{
          top: rect.top,
          left: rect.right,
          height: rect.height,
        }}
      />
      <div
        aria-hidden="true"
        data-contextual-guide-backdrop
        className={`${paneClass} bottom-0 left-0 right-0`}
        style={{ top: rect.bottom }}
      />
      <div
        aria-hidden="true"
        data-contextual-guide-spotlight
        className="pointer-events-none fixed z-[111] rounded-[18px] border-2 border-white/90 shadow-[0_0_0_3px_rgb(var(--skab-blue-rgb)/0.72),0_18px_50px_rgba(17,17,15,0.2)] transition-[left,top,width,height] duration-200 motion-reduce:transition-none"
        style={rect}
      />
    </>
  );
}

export default function WorkspaceContextualGuides({
  productTourEligible = false,
}) {
  const t = useTranslations("Dashboard.guides");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const { available: aiAvailable } = useAiWorkspace();
  const [trackSetupEvent] = useTrackSetupEventMutation();
  const [updateWorkspacePreferences] = useUpdateWorkspacePreferencesMutation();
  const [open, setOpen] = useState(false);
  const [activeGuide, setActiveGuide] = useState(null);
  const [promptGuide, setPromptGuide] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [entryPoint, setEntryPoint] = useState(
    CONTEXTUAL_GUIDE_ENTRY_POINT.HELP_REPLAY,
  );
  const [sessionId, setSessionId] = useState("");
  const replayHandledRef = useRef("");
  const completionSessionRef = useRef("");
  const viewedStepsRef = useRef(new Set());
  const currentStep = activeGuide?.steps?.[stepIndex] ?? null;
  const showCompletion =
    Boolean(activeGuide) && stepIndex === activeGuide.steps.length;
  const completionSelectors = useMemo(() => [], []);
  const activeStep = showCompletion ? null : currentStep;
  const { panelRef, panelStyle, targetRect } = useWorkspaceTourLayout({
    active: open,
    selectors: completionSelectors,
    step: activeStep,
  });

  const emit = useCallback(
    ({ event, guide, position, session, sourceEntryPoint, step }) => {
      if (!guide || !session) return Promise.resolve(null);

      return trackSetupEvent(
        createContextualGuideEvent({
          entryPoint: sourceEntryPoint,
          event,
          guide,
          position,
          sessionId: session,
          step,
        }),
      )
        .unwrap()
        .catch(() => null);
    },
    [trackSetupEvent],
  );

  const persist = useCallback(
    (guide, status, lastStep) =>
      updateWorkspacePreferences({
        contextualGuides: {
          [guide.id]: {
            version: guide.version,
            status,
            lastStep,
          },
        },
      })
        .unwrap()
        .catch(() => null),
    [updateWorkspacePreferences],
  );

  const beginGuide = useCallback(
    (guide, sourceEntryPoint) => {
      const nextSession = createContextualGuideSessionId();
      try {
        window.sessionStorage.setItem(
          getPromptSessionKey(workspaceAccess),
          guide.id,
        );
      } catch {
        // Session storage only limits repetition; the guide remains functional.
      }
      viewedStepsRef.current = new Set();
      setPromptGuide(null);
      setActiveGuide(guide);
      setEntryPoint(sourceEntryPoint);
      setSessionId(nextSession);
      setStepIndex(0);
      setOpen(true);
      void emit({
        event: "contextual_guide_started",
        guide,
        session: nextSession,
        sourceEntryPoint,
      });
    },
    [emit, workspaceAccess],
  );

  useEffect(() => {
    if (!workspaceAccess) return;

    const requestedId = searchParams.get(CONTEXTUAL_GUIDE_PARAM);
    const requestedGuide = CONTEXTUAL_GUIDE_BY_ID[requestedId];

    if (
      requestedGuide &&
      !searchParams.has("setupStep") &&
      isContextualGuideEligible(requestedGuide, {
        aiAvailable,
        tenant,
        workspaceAccess,
      })
    ) {
      const replayKey = `${pathname}?${searchParams.toString()}`;
      if (replayHandledRef.current !== replayKey) {
        replayHandledRef.current = replayKey;
        beginGuide(requestedGuide, CONTEXTUAL_GUIDE_ENTRY_POINT.HELP_REPLAY);

        const next = new URLSearchParams(searchParams.toString());
        next.delete(CONTEXTUAL_GUIDE_PARAM);
        const suffix = next.toString();
        router.replace(`${pathname}${suffix ? `?${suffix}` : ""}`, {
          scroll: false,
        });
      }
      return;
    }

    replayHandledRef.current = "";
  }, [
    aiAvailable,
    beginGuide,
    pathname,
    router,
    searchParams,
    tenant,
    workspaceAccess,
  ]);

  useEffect(() => {
    if (
      !workspaceAccess ||
      open ||
      promptGuide ||
      searchParams.has(CONTEXTUAL_GUIDE_PARAM) ||
      searchParams.has("setupStep")
    ) {
      return;
    }

    const productTour = workspaceAccess.preferences?.productTour;
    const productTourAcknowledged =
      !productTourEligible ||
      (Number(productTour?.version) >= 1 &&
        (productTour?.status === "completed" ||
          productTour?.status === "skipped"));
    if (!productTourAcknowledged) return;

    const guide = getContextualPromptGuideForRoute(
      pathname,
      {
        aiAvailable,
        tenant,
        workspaceAccess,
      },
      workspaceAccess.preferences?.contextualGuides,
    );
    if (!guide) return;

    if (
      typeof document !== "undefined" &&
      document.querySelector('[role="dialog"]')
    ) {
      return;
    }

    const promptKey = getPromptSessionKey(workspaceAccess);

    try {
      if (window.sessionStorage.getItem(promptKey)) return;
    } catch {
      // Session storage only limits repetition; the guide remains functional.
    }

    const schedulePrompt =
      window.requestAnimationFrame?.bind(window) ??
      window.setTimeout.bind(window);
    const cancelPrompt =
      window.cancelAnimationFrame?.bind(window) ??
      window.clearTimeout.bind(window);
    const promptFrame = schedulePrompt(() => {
      try {
        window.sessionStorage.setItem(promptKey, guide.id);
      } catch {
        // Session storage only limits repetition; the guide remains functional.
      }
      setPromptGuide(guide);
    });

    return () => cancelPrompt(promptFrame);
  }, [
    aiAvailable,
    open,
    pathname,
    productTourEligible,
    promptGuide,
    searchParams,
    tenant,
    workspaceAccess,
  ]);

  useEffect(() => {
    if (!open || !currentStep || !activeGuide || !sessionId) return;

    const viewedKey = `${sessionId}:${currentStep.key}`;
    if (viewedStepsRef.current.has(viewedKey)) return;

    viewedStepsRef.current.add(viewedKey);
    void emit({
      event: getContextualGuideStepEvent(activeGuide, currentStep),
      guide: activeGuide,
      position: stepIndex + 1,
      session: sessionId,
      sourceEntryPoint: entryPoint,
      step: currentStep,
    });
  }, [activeGuide, currentStep, emit, entryPoint, open, sessionId, stepIndex]);

  useEffect(() => {
    if (
      !open ||
      !showCompletion ||
      !activeGuide ||
      !sessionId ||
      completionSessionRef.current === sessionId
    ) {
      return;
    }

    completionSessionRef.current = sessionId;
    const terminalStep = activeGuide.steps.at(-1);
    void emit({
      event: "contextual_guide_completed",
      guide: activeGuide,
      position: activeGuide.steps.length,
      session: sessionId,
      sourceEntryPoint: entryPoint,
      step: terminalStep,
    });
    void persist(activeGuide, "completed", terminalStep.key);
  }, [activeGuide, emit, entryPoint, open, persist, sessionId, showCompletion]);

  const skip = useCallback(() => {
    if (!open || !activeGuide || !currentStep) return;

    setOpen(false);
    void emit({
      event: "contextual_guide_skipped",
      guide: activeGuide,
      position: stepIndex + 1,
      session: sessionId,
      sourceEntryPoint: entryPoint,
      step: currentStep,
    });
    void persist(activeGuide, "skipped", currentStep.key);
  }, [
    activeGuide,
    currentStep,
    emit,
    entryPoint,
    open,
    persist,
    sessionId,
    stepIndex,
  ]);

  const closeGuide = useCallback(() => {
    if (showCompletion) {
      setOpen(false);
      return;
    }
    skip();
  }, [showCompletion, skip]);

  const finish = useCallback(() => {
    if (!activeGuide) return;

    setOpen(false);
    const terminalStep = activeGuide.steps.at(-1);
    void emit({
      event: "contextual_guide_cta_opened",
      guide: activeGuide,
      session: sessionId,
      sourceEntryPoint: entryPoint,
      step: terminalStep,
    });
    router.push(
      buildContextualGuideCtaHref(activeGuide, {
        pathname,
        search: searchParams.toString(),
      }),
    );
  }, [
    activeGuide,
    emit,
    entryPoint,
    pathname,
    router,
    searchParams,
    sessionId,
  ]);

  const dismissPrompt = useCallback(() => {
    if (!promptGuide) return;

    const dismissedGuide = promptGuide;
    const firstStep = dismissedGuide.steps[0];
    const dismissedSession = createContextualGuideSessionId();
    setPromptGuide(null);
    void emit({
      event: "contextual_guide_skipped",
      guide: dismissedGuide,
      position: 1,
      session: dismissedSession,
      sourceEntryPoint: CONTEXTUAL_GUIDE_ENTRY_POINT.CONTEXTUAL_PROMPT,
      step: firstStep,
    });
  }, [emit, promptGuide]);

  const stepTitle = useMemo(
    () =>
      activeGuide && currentStep
        ? t(`items.${activeGuide.id}.steps.${currentStep.key}.title`)
        : "",
    [activeGuide, currentStep, t],
  );
  const description = useMemo(() => {
    if (!activeGuide) return "";
    if (showCompletion) {
      return t("finishedDescription", {
        guide: t(`items.${activeGuide.id}.title`),
      });
    }
    return currentStep
      ? t(`items.${activeGuide.id}.steps.${currentStep.key}.description`)
      : "";
  }, [activeGuide, currentStep, showCompletion, t]);

  return (
    <>
      {promptGuide ? (
        <aside
          role="region"
          aria-labelledby="contextual-guide-prompt-title"
          data-contextual-guide-prompt={promptGuide.id}
          className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] right-4 z-[95] w-[min(360px,calc(100vw-32px))] rounded-[20px] border border-cobalt-200 bg-surface-raised p-5 shadow-[0_22px_70px_rgba(17,17,15,0.2)]"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cobalt-50 text-cobalt-700">
              <SparklesIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cobalt-700">
                {t("promptEyebrow")}
              </p>
              <p
                id="contextual-guide-prompt-title"
                role="status"
                aria-live="polite"
                className="mt-1 text-[15px] font-semibold text-ink"
              >
                {t("promptTitle", {
                  guide: t(`items.${promptGuide.id}.title`),
                })}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-ink-muted">
                {t(`items.${promptGuide.id}.description`)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={dismissPrompt}
              className="min-h-11 rounded-full px-4 text-[12px] font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35"
            >
              {t("notNow")}
            </button>
            <button
              type="button"
              onClick={() =>
                beginGuide(
                  promptGuide,
                  CONTEXTUAL_GUIDE_ENTRY_POINT.CONTEXTUAL_PROMPT,
                )
              }
              className="min-h-11 rounded-full bg-cobalt-700 px-5 text-[12px] font-semibold text-white shadow-cobalt hover:bg-cobalt-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/40 focus-visible:ring-offset-2"
            >
              {t("start")}
            </button>
          </div>
        </aside>
      ) : null}

      <Dialog
        key={sessionId || "contextual-guide"}
        open={open}
        onClose={closeGuide}
        className="relative z-[110]"
        data-contextual-guide={activeGuide?.id}
        data-contextual-guide-step={
          showCompletion ? "complete" : currentStep?.key
        }
      >
        <SpotlightBackdrop rect={showCompletion ? null : targetRect} />

        <DialogPanel
          ref={panelRef}
          data-contextual-guide-panel
          style={{ ...panelStyle, maxHeight: workspaceTourPanelMaxHeight }}
          className="fixed z-[112] overflow-y-auto overscroll-contain rounded-[22px] border border-white/80 bg-surface-raised p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_28px_90px_rgba(17,17,15,0.28)] focus:outline-none sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                aria-live="polite"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-700"
              >
                {activeGuide
                  ? t("progress", {
                      current: Math.min(
                        stepIndex + 1,
                        activeGuide.steps.length,
                      ),
                      total: activeGuide.steps.length,
                    })
                  : ""}
              </p>
              <DialogTitle className="mt-2 text-[21px] font-semibold tracking-[-0.03em] text-ink">
                {showCompletion ? t("finishedTitle") : stepTitle}
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={closeGuide}
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
                width: activeGuide
                  ? `${
                      (Math.min(stepIndex + 1, activeGuide.steps.length) /
                        activeGuide.steps.length) *
                      100
                    }%`
                  : "0%",
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
                  onClick={finish}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-cobalt-700 px-5 text-[12px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/40 focus-visible:ring-offset-2"
                >
                  <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
                  {activeGuide?.ctaLabelKey
                    ? t(activeGuide.ctaLabelKey)
                    : t("finish")}
                </button>
              ) : (
                <button
                  type="button"
                  data-autofocus
                  onClick={() =>
                    setStepIndex((value) =>
                      Math.min(activeGuide.steps.length, value + 1),
                    )
                  }
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-cobalt-700 px-5 text-[12px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/40 focus-visible:ring-offset-2"
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
