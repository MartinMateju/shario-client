"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";

import { useRouter } from "@/i18n/navigation";
import {
  setupCenterApiSlice,
  useTrackSetupEventMutation,
} from "@/lib/features/setup-center/setupCenterApiSlice";

import { getStep, isStepDone } from "./setupCenter.utils";
import {
  claimGuidedCompletion,
  holdGuidedCompletionClaim,
  releaseGuidedCompletion,
} from "./guidedCompletionOwnership";

const createUuid = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (digit) =>
    (Number(digit) ^ ((Math.random() * 16) >> (Number(digit) / 4))).toString(
      16,
    ),
  );
};

const getSessionId = () => {
  if (typeof window === "undefined") return undefined;

  const storageKey = "skab.launch-session";
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return existing;

    const sessionId = `launch_${createUuid().replaceAll("-", "")}`;
    window.sessionStorage.setItem(storageKey, sessionId);
    return sessionId;
  } catch {
    return `launch_${createUuid().replaceAll("-", "")}`;
  }
};

const STEP_EVENTS = new Set(["step_opened", "step_completed"]);

export const buildLaunchEvent = ({ event, stepId, source, metadata }) => {
  const sessionId = getSessionId();

  return {
    event,
    ...(stepId && STEP_EVENTS.has(event) ? { stepId } : {}),
    ...(source ? { source } : {}),
    ...(metadata && Object.keys(metadata).length ? { metadata } : {}),
    eventId: createUuid(),
    ...(sessionId ? { sessionId } : {}),
  };
};

export default function useGuidedSetupStep(expectedStepId) {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trackSetupEvent] = useTrackSetupEventMutation();
  const routeStepId = searchParams.get("setupStep") || "";
  const stepId = expectedStepId || routeStepId;
  const guided = Boolean(stepId && (!expectedStepId || routeStepId === stepId));

  const track = useCallback(
    (event, { source = "guided_form", metadata } = {}) => {
      if (!guided) return Promise.resolve(null);
      return trackSetupEvent(
        buildLaunchEvent({ event, stepId, source, metadata }),
      )
        .unwrap()
        .catch(() => null);
    },
    [guided, stepId, trackSetupEvent],
  );

  const refreshAndContinue = useCallback(
    async ({ metadata } = {}) => {
      if (!guided) return false;

      const completionClaim = claimGuidedCompletion(stepId);

      const request = dispatch(
        setupCenterApiSlice.endpoints.getSetupCenter.initiate(undefined, {
          forceRefetch: true,
          subscribe: false,
        }),
      );

      try {
        const snapshot = await request.unwrap();
        const complete = isStepDone(getStep(snapshot, stepId));

        if (complete) {
          if (completionClaim) {
            await track("step_completed", { metadata });
            router.replace(
              `/app/setup?completedStep=${encodeURIComponent(stepId)}`,
              { scroll: false },
            );
            holdGuidedCompletionClaim(stepId, completionClaim);
          }
          return true;
        }

        releaseGuidedCompletion(stepId, completionClaim);
        router.replace(
          `/app/setup?step=${encodeURIComponent(stepId)}&saved=1`,
          { scroll: false },
        );
        return true;
      } catch {
        releaseGuidedCompletion(stepId, completionClaim);
        router.replace(
          `/app/setup?step=${encodeURIComponent(stepId)}&saved=1`,
          { scroll: false },
        );
        return true;
      } finally {
        request.unsubscribe?.();
      }
    },
    [dispatch, guided, router, stepId, track],
  );

  return useMemo(
    () => ({ guided, stepId, refreshAndContinue, track }),
    [guided, refreshAndContinue, stepId, track],
  );
}
