"use client";

import { useCallback, useEffect, useState } from "react";
import { usePreviewVoucherDesignMutation } from "@/lib/features/products/productsApiSlice";

function serializePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return null;
  }
}

export default function useVoucherDesignPreview({
  payload,
  enabled = true,
  delay = 500,
}) {
  const [preview] = usePreviewVoucherDesignMutation();
  const [retrySequence, setRetrySequence] = useState(0);
  const [result, setResult] = useState({
    svg: null,
    key: null,
    retrySequence: -1,
    isUpdating: false,
    error: null,
  });
  const key = serializePayload(payload);
  const canPreview = enabled && key !== null;
  const retry = useCallback(() => setRetrySequence((value) => value + 1), []);

  useEffect(() => {
    if (!canPreview) return;

    // Aborting saves work; this separate guard also protects against requests
    // which settle after cancellation or a server which already sent a reply.
    let cancelled = false;
    let request;
    const timeout = setTimeout(async () => {
      setResult((previous) => ({
        ...previous,
        key,
        retrySequence,
        isUpdating: true,
        error: null,
      }));
      try {
        request = preview(JSON.parse(key));
        const response = await request.unwrap();
        if (cancelled) return;
        if (typeof response?.svg !== "string" || !response.svg.trim()) {
          throw new Error("Voucher preview did not include an SVG image.");
        }
        setResult({
          svg: response.svg,
          key,
          retrySequence,
          isUpdating: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setResult((previous) => ({
          ...previous,
          key,
          retrySequence,
          isUpdating: false,
          error,
        }));
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      request?.abort?.();
    };
  }, [canPreview, key, retrySequence, delay, preview]);

  const isCurrent =
    result.key === key && result.retrySequence === retrySequence;

  return {
    svg: result.svg,
    isUpdating: canPreview && (!isCurrent || result.isUpdating),
    error: canPreview && isCurrent ? result.error : null,
    retry,
  };
}
