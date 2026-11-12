"use client";

import { useEffect, useState } from "react";
import { fetchPublicSubscriptionCatalog } from "@/lib/publicSubscriptionCatalog";

export default function usePublicSubscriptionCatalog() {
  const [state, setState] = useState({
    catalog: null,
    isLoading: true,
    isError: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicSubscriptionCatalog({ signal: controller.signal })
      .then((catalog) => {
        if (!controller.signal.aborted) {
          setState({ catalog, isLoading: false, isError: false });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ catalog: null, isLoading: false, isError: true });
        }
      });
    return () => controller.abort();
  }, []);

  return state;
}
