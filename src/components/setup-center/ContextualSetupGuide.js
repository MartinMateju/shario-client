"use client";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAiWorkspace } from "@/components/ai/AiWorkspaceProvider";
import {
  useGetSetupCenterQuery,
  useTrackSetupEventMutation,
} from "@/lib/features/setup-center/setupCenterApiSlice";

import {
  getPrimaryAction,
  getSetupActionHref,
  getStep,
  isStepApplicable,
  isStepDone,
} from "./setupCenter.utils";
import { buildLaunchEvent } from "./useGuidedSetupStep";
import {
  claimGuidedCompletion,
  holdGuidedCompletionClaim,
} from "./guidedCompletionOwnership";

export default function ContextualSetupGuide() {
  const t = useTranslations("SetupCenter");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const stepId = searchParams.get("setupStep") || "";
  const [dismissedStep, setDismissedStep] = useState("");
  const query = useGetSetupCenterQuery(undefined, {
    skip: !stepId,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });
  const aiWorkspace = useAiWorkspace();
  const [trackSetupEvent] = useTrackSetupEventMutation();
  const previousCompleteRef = useRef();
  const openedStepRef = useRef("");
  const step = getStep(query.data, stepId);
  const complete = isStepDone(step);

  useEffect(() => {
    previousCompleteRef.current = undefined;
    openedStepRef.current = "";
  }, [stepId]);

  useEffect(() => {
    if (!step || openedStepRef.current === stepId) return;

    openedStepRef.current = stepId;
    trackSetupEvent(
      buildLaunchEvent({
        event: "step_opened",
        stepId,
        source: "guided_form",
      }),
    )
      .unwrap()
      .catch(() => null);
  }, [step, stepId, trackSetupEvent]);

  useEffect(() => {
    if (!step) return;

    const previousComplete = previousCompleteRef.current;
    previousCompleteRef.current = complete;
    if (previousComplete !== false || !complete) return;

    const completionClaim = claimGuidedCompletion(stepId);
    if (!completionClaim) return;

    trackSetupEvent(
      buildLaunchEvent({
        event: "step_completed",
        stepId,
        source: "guided_form",
      }),
    )
      .unwrap()
      .catch(() => null);
    router.replace(`/app/setup?completedStep=${encodeURIComponent(stepId)}`, {
      scroll: false,
    });
    holdGuidedCompletionClaim(stepId, completionClaim);
  }, [complete, router, step, stepId, trackSetupEvent]);

  if (!stepId || dismissedStep === stepId || !query.data) return null;

  if (!isStepApplicable(step)) return null;
  const primary = getPrimaryAction(step);
  const primaryHref = getSetupActionHref(step, primary);
  const currentQuery = searchParams.toString();
  const currentRoute = currentQuery ? `${pathname}?${currentQuery}` : pathname;

  return (
    <aside
      aria-live="polite"
      data-guided-setup-surface={stepId}
      className={
        complete
          ? "mb-5 rounded-[18px] border border-success/25 bg-success-soft p-4 shadow-[0_10px_30px_rgba(34,139,94,0.08)] sm:p-5"
          : "mb-5 rounded-[18px] border border-cobalt-200 bg-cobalt-50/60 p-4 shadow-[0_10px_30px_rgb(var(--skab-blue-rgb)/0.07)] sm:p-5"
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={
            complete
              ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-success shadow-sm"
              : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-cobalt-600 shadow-sm"
          }
        >
          {complete ? (
            <CheckCircleIcon className="h-5 w-5 text-success" />
          ) : (
            <SparklesIcon className="h-4.5 w-4.5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={
              complete
                ? "text-[10px] font-semibold uppercase tracking-[0.15em] text-success"
                : "text-[10px] font-semibold uppercase tracking-[0.15em] text-cobalt-600"
            }
          >
            {complete
              ? t("contextual.completedEyebrow")
              : t("contextual.eyebrow")}
          </p>
          <h2 className="mt-1 text-[14px] font-semibold text-ink">
            {t(`steps.${step.id}.outcome`)}
          </h2>
          <p className="mt-1 max-w-3xl text-[10px] leading-5 text-ink-muted">
            {complete
              ? t("contextual.complete")
              : t(`steps.${step.id}.description`)}
          </p>
          {!complete ? (
            <p className="mt-2 text-[10px] font-medium text-cobalt-700">
              {t("guided.autoReturn")}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/app/setup?step=${step.id}${complete ? "&review=ready" : ""}`}
              className={
                complete
                  ? "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-success px-4 text-[10px] font-semibold text-white transition hover:brightness-95"
                  : "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-cobalt-200 bg-white px-4 text-[10px] font-semibold text-cobalt-700 transition hover:bg-cobalt-50"
              }
            >
              {complete
                ? t("contextual.returnToLaunchCenter")
                : t("contextual.viewStep")}
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
            {aiWorkspace.available !== false ? (
              <button
                type="button"
                onClick={() =>
                  aiWorkspace.openSetupAssistant({
                    context: {
                      surface: "setup_center",
                      setupStepId: step.id,
                      route: pathname,
                    },
                    starterPrompt: t("assistant.prompt", {
                      step: t(`steps.${step.id}.outcome`),
                    }),
                  })
                }
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-cobalt-200 bg-white px-4 text-[10px] font-semibold text-cobalt-700 transition hover:bg-cobalt-50"
              >
                <SparklesIcon className="h-3.5 w-3.5" />
                {t("assistant.action")}
              </button>
            ) : null}
            {!complete && primary?.enabled && primaryHref !== currentRoute ? (
              <Link
                href={primaryHref}
                className="inline-flex min-h-9 items-center rounded-full px-3 text-[10px] font-semibold text-ink-muted transition hover:bg-white hover:text-ink"
              >
                {t(`actions.${primary.key}`)}
              </Link>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissedStep(stepId)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-subtle transition hover:bg-white hover:text-ink"
          aria-label={t("contextual.dismiss")}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
