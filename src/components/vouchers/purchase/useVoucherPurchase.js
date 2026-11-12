"use client";

import { useEffect, useRef, useState } from "react";
import { requestVoucherPurchase } from "@/lib/features/coupons/voucherPurchaseApi";
import {
  clearVoucherPurchaseAccess,
  readVoucherPurchaseAccess,
  savePurchasedVoucherPdf,
} from "./voucherPurchaseAccess";

const KNOWN_STATES = new Set([
  "pending_payment",
  "processing",
  "ready",
  "expired",
  "refunded",
  "review_required",
  "revoked",
]);
const INVALID_ACCESS = new Set([400, 401, 403, 404]);
const shouldPoll = (data) =>
  !data ||
  ["pending_payment", "processing"].includes(data.status) ||
  (data.status === "ready" &&
    (["pending", "sending"].includes(data.deliveryStatus) ||
      Boolean(data.deliveryNextAttemptAt)));

export function useVoucherPurchase({ tenantSlug, orderId }) {
  const scope = `${tenantSlug}:${orderId}`;
  const [access, setAccess] = useState(null);
  const [query, setQuery] = useState({});
  const [refreshCount, setRefreshCount] = useState(0);
  const [polling, setPolling] = useState(true);
  const [actionState, setActionState] = useState({});
  const currentAccess = useRef(access);
  const capturedAccess = useRef(null);
  const actionController = useRef(null);
  useEffect(() => {
    currentAccess.current = access?.scope === scope ? access : null;
    return () => {
      currentAccess.current = null;
      actionController.current?.abort();
      actionController.current = null;
    };
  }, [access, scope]);
  const canRequest = Boolean(
    tenantSlug && orderId && access?.scope === scope && access.token,
  );
  const data = canRequest && query.source === access ? query.data : undefined;
  const error = query.source === access ? query.error : null;
  const busy = actionState.source === access && Boolean(actionState.busy);

  useEffect(() => {
    let cancelled = false;
    // Preserve the first read when StrictMode replays effects and storage is disabled.
    const token =
      capturedAccess.current?.scope === scope
        ? capturedAccess.current.token
        : readVoucherPurchaseAccess({ tenantSlug, orderId });
    capturedAccess.current = { scope, token };
    queueMicrotask(() => {
      if (cancelled) return;
      setAccess({ scope, token });
      setActionState({});
    });
    return () => {
      cancelled = true;
    };
  }, [tenantSlug, orderId, scope]);

  useEffect(() => {
    if (!canRequest) return;
    let cancelled = false;
    let timer;
    let suspended = false;
    const controller = new AbortController();
    const deadline = Date.now() + 120_000;
    const fetchStatus = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setPolling(true);
      setQuery((previous) => ({
        source: access,
        data: previous.source === access ? previous.data : undefined,
        isFetching: true,
      }));
      let result;
      let failure;
      try {
        result = await requestVoucherPurchase({
          tenantSlug,
          orderId,
          accessToken: access.token,
          signal: controller.signal,
        });
        if (!cancelled)
          setQuery({ source: access, data: result, isFetching: false });
      } catch (caught) {
        if (cancelled) return;
        failure = caught;
        if (INVALID_ACCESS.has(caught.status))
          clearVoucherPurchaseAccess(tenantSlug, orderId);
        setQuery({ source: access, error: caught, isFetching: false });
      }
      if (cancelled) return;
      if (
        !INVALID_ACCESS.has(failure?.status) &&
        shouldPoll(result) &&
        Date.now() < deadline
      ) {
        timer = window.setTimeout(
          () => {
            if (document.hidden) {
              suspended = true;
              setPolling(false);
              return;
            }
            fetchStatus();
          },
          failure?.status === 429 ? 30_000 : 3_000,
        );
      } else setPolling(false);
    };
    const resume = () => {
      if (
        !document.hidden &&
        suspended &&
        !cancelled &&
        Date.now() < deadline
      ) {
        suspended = false;
        fetchStatus();
      }
    };
    document.addEventListener("visibilitychange", resume);
    fetchStatus();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [access, canRequest, orderId, tenantSlug, refreshCount]);

  const invalidAccess = INVALID_ACCESS.has(error?.status);
  const status =
    (access?.scope === scope && !canRequest) || invalidAccess
      ? "accessUnavailable"
      : error
        ? "unavailable"
        : data && KNOWN_STATES.has(data.status)
          ? data.status
          : "loading";
  const ready = status === "ready" && data?.paymentStatus === "paid";
  const refresh = () => {
    setActionState({});
    setRefreshCount((value) => value + 1);
  };
  const performAction = async (action, index) => {
    if (!canRequest || busy || !ready || actionController.current) return;
    const source = access;
    const controller = new AbortController();
    actionController.current = controller;
    setActionState({ source, busy: action });
    try {
      const result = await requestVoucherPurchase({
        tenantSlug,
        orderId,
        accessToken: access.token,
        action,
        index,
        signal: controller.signal,
      });
      if (currentAccess.current !== source) return;
      if (action === "download") savePurchasedVoucherPdf(result, index);
      setActionState({ source, resendQueued: action === "resend" });
      if (action === "resend") setRefreshCount((value) => value + 1);
    } catch (caught) {
      if (currentAccess.current !== source) return;
      if (INVALID_ACCESS.has(caught.status))
        clearVoucherPurchaseAccess(tenantSlug, orderId);
      setActionState({
        source,
        error:
          caught.status === 429
            ? action === "resend"
              ? "rateLimited"
              : "downloadRateLimited"
            : action === "download"
              ? "downloadError"
              : "resendError",
      });
      setRefreshCount((value) => value + 1);
    } finally {
      if (actionController.current === controller)
        actionController.current = null;
    }
  };
  const resendQueued =
    actionState.source === access && actionState.resendQueued === true;
  return {
    data,
    status,
    ready,
    polling,
    busy,
    resendQueued,
    actionError: actionState.source === access ? actionState.error : "",
    pending: ["loading", "pending_payment", "processing"].includes(status),
    canRefresh: canRequest && !invalidAccess,
    canResend: ready && data.canResend === true && !resendQueued,
    documents: ready && Array.isArray(data.documents) ? data.documents : [],
    refreshing: query.source === access && query.isFetching,
    resending: busy && actionState.busy === "resend",
    refresh,
    downloadDocument: (index) => performAction("download", index),
    resendEmail: () => performAction("resend"),
  };
}
