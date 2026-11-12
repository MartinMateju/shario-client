"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useSelector } from "react-redux";

import { useAiAccess } from "@/components/auth/AiFeatureBoundary";
import {
  useGenerateAiBriefingMutation,
  useGetLatestAiBriefingQuery,
} from "@/lib/features/ai/aiApiSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";

import {
  dailyBriefingIdentity,
  dailyBriefingRequest,
  isDailyBriefingCurrent,
  isDailyBriefingStale,
  shouldGenerateDailyBriefing,
  tenantDateKey,
  unwrapDailyBriefing,
} from "./daily-studio-briefing.utils";

export default function useDailyStudioBriefing({ overview }) {
  const [clock, setClock] = useState(() => Date.now());
  const locale = useLocale();
  const locationId = useSelector(selectActiveStudioId);
  const access = useAiAccess({ feature: "dailyBriefing" });
  const timezone = overview?.metadata?.timezone || "UTC";
  const todayKey = tenantDateKey(new Date(clock), timezone);
  const overviewDate = overview?.metadata?.date || todayKey;
  const isToday = overviewDate === todayKey;
  const request = useMemo(
    () =>
      dailyBriefingRequest({
        locale,
        locationId,
        cacheScope: access.cacheScope,
      }),
    [access.cacheScope, locale, locationId],
  );
  const query = useGetLatestAiBriefingQuery(request, {
    skip: !access.canReadCached || !isToday,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: true,
  });
  const [generate, generation] = useGenerateAiBriefingMutation();
  const cachedBriefing = unwrapDailyBriefing(query.currentData);
  const briefing =
    access.canReadCached &&
    isDailyBriefingCurrent(cachedBriefing, { locale, dateKey: todayKey })
      ? cachedBriefing
      : null;
  const stale = isDailyBriefingStale(briefing, new Date(clock));
  const attempted = useRef({ identity: "", at: 0 });
  const generationIdentity = dailyBriefingIdentity({
    locale,
    locationId,
    dateKey: todayKey,
    snapshotHash: briefing?.provenance?.snapshotHash,
    stale,
  });

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      !shouldGenerateDailyBriefing({
        canGenerate: access.available,
        isToday,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        isError: query.isError,
        briefing,
        locale,
        dateKey: todayKey,
      }) ||
      (attempted.current.identity === generationIdentity &&
        clock - attempted.current.at < 5 * 60_000)
    ) {
      return;
    }
    attempted.current = { identity: generationIdentity, at: clock };
    generate({ ...request, force: false });
  }, [
    access.available,
    briefing,
    clock,
    generate,
    generationIdentity,
    isToday,
    locale,
    query.isError,
    query.isFetching,
    query.isLoading,
    request,
    todayKey,
  ]);

  useEffect(() => {
    if (briefing && !stale && generation.isError) generation.reset();
  }, [briefing, generation, stale]);

  const refresh = useCallback(async () => {
    if (!access.available || !isToday) return null;
    try {
      return await generate({ ...request, force: true }).unwrap();
    } catch {
      return null;
    }
  }, [access.available, generate, isToday, request]);

  return {
    access,
    briefing,
    canGenerate: access.available && isToday,
    generation,
    isToday,
    locale,
    locationId,
    query,
    refresh,
    stale,
    todayKey,
  };
}
