"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// All report controls share the latest intended URL, even while Next is still
// committing an earlier navigation. Reading useSearchParams in each control
// independently lets a quick tab change resurrect filters that were just reset.
export default function useReportSearchParams() {
  const router = useRouter();
  const committedQuery = useSearchParams().toString();
  const [query, setQuery] = useState(committedQuery);
  const latestQuery = useRef(committedQuery);
  const lastCommittedQuery = useRef(committedQuery);
  const pendingQueries = useRef([]);

  useEffect(() => {
    if (lastCommittedQuery.current === committedQuery) return;
    lastCommittedQuery.current = committedQuery;
    const pendingIndex = pendingQueries.current.indexOf(committedQuery);
    if (pendingIndex !== -1) {
      pendingQueries.current.splice(0, pendingIndex + 1);
      if (pendingQueries.current.length > 0) return;
    } else {
      // A link or browser navigation outside this workspace supersedes drafts.
      pendingQueries.current = [];
    }
    latestQuery.current = committedQuery;
    setQuery(committedQuery);
  }, [committedQuery]);

  useEffect(() => {
    const restoreHistory = () => {
      const restored = new URLSearchParams(window.location.search).toString();
      pendingQueries.current = [];
      latestQuery.current = restored;
      setQuery(restored);
    };
    window.addEventListener("popstate", restoreHistory);
    return () => window.removeEventListener("popstate", restoreHistory);
  }, []);

  const updateSearchParams = useCallback(
    (update) => {
      const next = new URLSearchParams(latestQuery.current);
      update(next);
      const nextQuery = next.toString();
      if (nextQuery === latestQuery.current) return;
      latestQuery.current = nextQuery;
      pendingQueries.current.push(nextQuery);
      setQuery(nextQuery);
      router.replace(`?${nextQuery}`, { scroll: false });
    },
    [router],
  );

  const searchParams = useMemo(() => new URLSearchParams(query), [query]);
  return { searchParams, updateSearchParams };
}
