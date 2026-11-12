"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowUturnLeftIcon,
  BanknotesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import {
  useRecordInvoicePaymentMutation,
  useReverseInvoicePaymentMutation,
} from "@/lib/features/invoices/invoicesApiSlice";
import {
  formatMinorCurrencyAmount,
  getMajorCurrencyInputStep,
  getStripeMinorUnitDigits,
  isValidMajorCurrencyPrecision,
  minorUnitsToMajor,
} from "@/utils/money";

import {
  cx,
  formatInvoiceDate,
  getInvoiceAmountDueMinor,
  getInvoiceAmountPaidMinor,
  getInvoiceCalendarToday,
  getInvoiceCurrency,
  getInvoiceError,
  getInvoiceId,
} from "./invoice.utils";

const MANUAL_PAYMENT_METHODS = new Set([
  "bank_transfer",
  "cash",
  "card",
  "manual",
]);

const PAYMENT_METHODS = [...MANUAL_PAYMENT_METHODS];

const getPaymentId = (payment) =>
  String(payment?.id ?? payment?._id ?? "").trim();

const getPaymentMethod = (payment) =>
  String(payment?.method ?? "manual")
    .trim()
    .toLowerCase();

const getPaymentReference = (payment) =>
  String(payment?.reference ?? "").trim();

const isPaymentActive = (payment) =>
  payment?.active !== false && !payment?.reversedAt;

const getPayments = (invoice) =>
  Array.isArray(invoice?.paymentAllocations) ? invoice.paymentAllocations : [];

const createIdempotencyKey = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
};

const IDEMPOTENCY_STORAGE_PREFIX = "shario:invoice-payment-request:v1";
const PENDING_REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PENDING_REQUESTS_PER_ACTION = 8;

const getRequestStorageKey = (invoice, operation) => {
  const tenantId = String(invoice?.tenantId ?? invoice?.tenant ?? "unknown");
  const invoiceId = getInvoiceId(invoice);

  return [
    IDEMPOTENCY_STORAGE_PREFIX,
    encodeURIComponent(tenantId),
    encodeURIComponent(invoiceId),
    encodeURIComponent(operation),
  ].join(":");
};

const isPendingRequest = (value) =>
  typeof value?.signature === "string" &&
  /^[a-f0-9]{64}$/.test(value.signature) &&
  typeof value?.key === "string" &&
  /^[A-Za-z0-9._:-]{8,200}$/.test(value.key);

const writePendingRequests = (storageKey, requests) => {
  try {
    if (requests.length === 0) {
      globalThis.sessionStorage?.removeItem(storageKey);
      return;
    }

    globalThis.sessionStorage?.setItem(
      storageKey,
      JSON.stringify({ version: 2, requests }),
    );
  } catch {
    // The in-memory request ref still protects retries while the dialog stays open.
  }
};

const readPendingRequests = (storageKey) => {
  try {
    const value = globalThis.sessionStorage?.getItem(storageKey);
    if (!value) return [];

    const parsed = JSON.parse(value);
    // Keep compatibility with the original single-request storage shape.
    const candidates = Array.isArray(parsed?.requests)
      ? parsed.requests
      : isPendingRequest(parsed)
        ? [{ ...parsed, createdAt: Date.now() }]
        : [];
    const oldestAllowed = Date.now() - PENDING_REQUEST_TTL_MS;
    const requests = candidates
      .filter(isPendingRequest)
      .map((request) => ({
        key: request.key,
        signature: request.signature,
        createdAt: Number(request.createdAt) || Date.now(),
      }))
      .filter((request) => request.createdAt >= oldestAllowed)
      .filter(
        (request, index, all) =>
          all.findLastIndex(
            (candidate) => candidate.signature === request.signature,
          ) === index,
      )
      .slice(-MAX_PENDING_REQUESTS_PER_ACTION);

    writePendingRequests(storageKey, requests);
    return requests;
  } catch {
    return [];
  }
};

const createRequestSignature = async (payload) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure browser hashing is unavailable.");
  }

  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);

  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
};

const getStableIdempotencyKey = (requestRef, signature, storageKey) => {
  if (requestRef.current?.signature === signature) {
    return requestRef.current.key;
  }

  const pendingRequests = readPendingRequests(storageKey);
  const persisted = pendingRequests.find(
    (request) => request.signature === signature,
  );
  if (persisted) {
    requestRef.current = persisted;
    return persisted.key;
  }

  const key = createIdempotencyKey();
  requestRef.current = { key, signature, createdAt: Date.now() };
  writePendingRequests(
    storageKey,
    [...pendingRequests, requestRef.current].slice(
      -MAX_PENDING_REQUESTS_PER_ACTION,
    ),
  );
  return key;
};

const resolveSuccessfulRequest = (requestRef, storageKey, signature) => {
  requestRef.current = null;
  writePendingRequests(
    storageKey,
    readPendingRequests(storageKey).filter(
      (request) => request.signature !== signature,
    ),
  );
};

const getLatestInvoice = (invoice, mutationInvoice) => {
  if (
    !mutationInvoice ||
    getInvoiceId(mutationInvoice) !== getInvoiceId(invoice)
  ) {
    return invoice;
  }

  const invoiceUpdatedAt = new Date(invoice?.updatedAt || 0).getTime();
  const mutationUpdatedAt = new Date(mutationInvoice?.updatedAt || 0).getTime();

  return mutationUpdatedAt >= invoiceUpdatedAt ? mutationInvoice : invoice;
};

function RecordPaymentDialog({
  invoice,
  locale,
  timezone,
  requestStorageKey,
  onClose,
  onRecorded,
}) {
  const t = useTranslations("Invoices");
  const currency = getInvoiceCurrency(invoice);
  const amountDueMinor = getInvoiceAmountDueMinor(invoice);
  const today = getInvoiceCalendarToday(timezone);
  const [amount, setAmount] = useState(() =>
    String(minorUnitsToMajor(amountDueMinor, currency) ?? ""),
  );
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(today);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestRef = useRef(null);
  const submissionLockRef = useRef(false);
  const [recordPayment, { isLoading }] = useRecordInvoicePaymentMutation();
  const isBusy = isLoading || isSubmitting;
  const [hasPendingRetry] = useState(
    () => readPendingRequests(requestStorageKey).length > 0,
  );
  const amountHelpId = `payment-amount-help-${getInvoiceId(invoice)}`;
  const descriptionId = `payment-description-${getInvoiceId(invoice)}`;

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const numericAmount = Number(amount);
    const factor = 10 ** getStripeMinorUnitDigits(currency);
    const amountMinor = Math.round(numericAmount * factor);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      !Number.isSafeInteger(amountMinor) ||
      !isValidMajorCurrencyPrecision(numericAmount, currency)
    ) {
      setError(t("paymentDialog.errors.precision", { currency }));
      return;
    }

    if (amountMinor > amountDueMinor) {
      setError(t("paymentDialog.errors.tooHigh"));
      return;
    }

    if (!paidAt || paidAt > today) {
      setError(t("paymentDialog.errors.date"));
      return;
    }

    if (submissionLockRef.current) return;
    submissionLockRef.current = true;
    setIsSubmitting(true);

    const payload = {
      amountMinor,
      method,
      reference: reference.trim(),
      paidAt,
    };

    try {
      const signature = await createRequestSignature({
        invoiceId: getInvoiceId(invoice),
        ...payload,
      });
      const idempotencyKey = getStableIdempotencyKey(
        requestRef,
        signature,
        requestStorageKey,
      );
      const result = await recordPayment({
        id: getInvoiceId(invoice),
        ...payload,
        idempotencyKey,
      }).unwrap();

      resolveSuccessfulRequest(requestRef, requestStorageKey, signature);
      onRecorded(result.invoice ?? invoice);
    } catch (mutationError) {
      setError(
        getInvoiceError(mutationError, t("paymentDialog.errors.request")),
      );
    } finally {
      submissionLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={isBusy ? () => {} : onClose}
      className="relative z-[130]"
    >
      <DialogBackdrop
        data-dialog-backdrop
        className="fixed inset-0 bg-[#11110F]/30 backdrop-blur-[2px]"
      />
      <div className="fixed inset-0 overflow-y-auto p-4 sm:p-8">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel
            data-dialog-layout="compact"
            aria-describedby={descriptionId}
            className="w-full max-w-lg rounded-[24px] border border-line bg-white p-5 shadow-floating sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
                  {t("payments.title")}
                </p>
                <DialogTitle className="mt-2 text-[23px] font-semibold tracking-[-0.04em] text-[#111111]">
                  {t("paymentDialog.title")}
                </DialogTitle>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="rounded-full p-2 text-[#777773] hover:bg-[#F4F2ED] disabled:opacity-50"
                aria-label={t("paymentDialog.close")}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <p
              id={descriptionId}
              className="mt-3 text-[11px] leading-5 text-[#777773]"
            >
              {t("paymentDialog.description")}
            </p>
            {hasPendingRetry && (
              <p className="mt-3 rounded-[12px] bg-amber-50 px-4 py-3 text-[10px] leading-5 text-amber-900">
                {t("paymentDialog.pendingRetry")}
              </p>
            )}

            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold text-[#393936]">
                  {t("paymentDialog.amount")}
                </span>
                <input
                  type="number"
                  required
                  min={getMajorCurrencyInputStep(currency)}
                  max={minorUnitsToMajor(amountDueMinor, currency)}
                  step={getMajorCurrencyInputStep(currency)}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  aria-describedby={amountHelpId}
                  className="h-11 w-full rounded-[12px] border border-line px-3.5 text-[11px] outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                />
                <span
                  id={amountHelpId}
                  className="mt-1.5 block text-[10px] text-[#777773]"
                >
                  {t("paymentDialog.outstanding", {
                    amount: formatMinorCurrencyAmount(
                      amountDueMinor,
                      currency,
                      locale,
                    ),
                  })}
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold text-[#393936]">
                  {t("paymentDialog.method")}
                </span>
                <select
                  required
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                  className="h-11 w-full rounded-[12px] border border-line bg-white px-3.5 text-[11px] outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                >
                  {PAYMENT_METHODS.map((value) => (
                    <option key={value} value={value}>
                      {t(`payments.methods.${value}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold text-[#393936]">
                  {t("paymentDialog.paidAt")}
                </span>
                <input
                  type="date"
                  required
                  max={today}
                  value={paidAt}
                  onChange={(event) => setPaidAt(event.target.value)}
                  className="h-11 w-full rounded-[12px] border border-line px-3.5 text-[11px] outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold text-[#393936]">
                  {t("paymentDialog.reference")}
                </span>
                <input
                  type="text"
                  maxLength={200}
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder={t("paymentDialog.referencePlaceholder")}
                  className="h-11 w-full rounded-[12px] border border-line px-3.5 text-[11px] outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                />
              </label>

              {error && (
                <p
                  className="rounded-[12px] bg-danger-soft px-4 py-3 text-[11px] text-danger"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isBusy}
                  className="min-h-11 rounded-[13px] border border-line px-5 text-[11px] font-semibold text-[#555553] disabled:opacity-50"
                >
                  {t("paymentDialog.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="min-h-11 rounded-[13px] bg-cobalt-600 px-5 text-[11px] font-semibold text-white disabled:opacity-50"
                >
                  {isBusy
                    ? t("paymentDialog.submitting")
                    : t("paymentDialog.submit")}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

function ReversePaymentDialog({
  invoice,
  payment,
  locale,
  requestStorageKey,
  onClose,
  onReversed,
}) {
  const t = useTranslations("Invoices");
  const currency = getInvoiceCurrency(invoice);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestRef = useRef(null);
  const submissionLockRef = useRef(false);
  const [reversePayment, { isLoading }] = useReverseInvoicePaymentMutation();
  const isBusy = isLoading || isSubmitting;
  const [hasPendingRetry] = useState(
    () => readPendingRequests(requestStorageKey).length > 0,
  );
  const paymentId = getPaymentId(payment);
  const descriptionId = `payment-reversal-description-${paymentId}`;

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setError(t("paymentReversal.errors.reason"));
      return;
    }
    if (!confirmed) {
      setError(t("paymentReversal.errors.confirmation"));
      return;
    }

    if (submissionLockRef.current) return;
    submissionLockRef.current = true;
    setIsSubmitting(true);

    try {
      const signature = await createRequestSignature({
        invoiceId: getInvoiceId(invoice),
        paymentId,
        reason: normalizedReason,
      });
      const idempotencyKey = getStableIdempotencyKey(
        requestRef,
        signature,
        requestStorageKey,
      );
      const result = await reversePayment({
        id: getInvoiceId(invoice),
        paymentId,
        reason: normalizedReason,
        idempotencyKey,
      }).unwrap();

      resolveSuccessfulRequest(requestRef, requestStorageKey, signature);
      onReversed(result.invoice ?? invoice);
    } catch (mutationError) {
      setError(
        getInvoiceError(mutationError, t("paymentReversal.errors.request")),
      );
    } finally {
      submissionLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={isBusy ? () => {} : onClose}
      className="relative z-[130]"
    >
      <DialogBackdrop
        data-dialog-backdrop
        className="fixed inset-0 bg-[#11110F]/30 backdrop-blur-[2px]"
      />
      <div className="fixed inset-0 overflow-y-auto p-4 sm:p-8">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel
            data-dialog-layout="compact"
            aria-describedby={descriptionId}
            className="w-full max-w-lg rounded-[24px] border border-line bg-white p-5 shadow-floating sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-terracotta-600">
                  {t("payments.title")}
                </p>
                <DialogTitle className="mt-2 text-[23px] font-semibold tracking-[-0.04em] text-[#111111]">
                  {t("paymentReversal.title")}
                </DialogTitle>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="rounded-full p-2 text-[#777773] hover:bg-[#F4F2ED] disabled:opacity-50"
                aria-label={t("paymentReversal.close")}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <p
              id={descriptionId}
              className="mt-3 text-[11px] leading-5 text-[#777773]"
            >
              {t("paymentReversal.description")}
            </p>
            {hasPendingRetry && (
              <p className="mt-3 rounded-[12px] bg-amber-50 px-4 py-3 text-[10px] leading-5 text-amber-900">
                {t("paymentReversal.pendingRetry")}
              </p>
            )}
            <p className="mt-3 rounded-[12px] bg-[#F7F5F1] px-4 py-3 text-[11px] font-semibold text-[#353533]">
              {t("paymentReversal.payment", {
                amount: formatMinorCurrencyAmount(
                  payment?.amountMinor,
                  currency,
                  locale,
                ),
              })}
            </p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold text-[#393936]">
                  {t("paymentReversal.reason")}
                </span>
                <textarea
                  required
                  maxLength={1000}
                  rows={4}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={t("paymentReversal.reasonPlaceholder")}
                  className="w-full rounded-[13px] border border-line px-3.5 py-3 text-[11px] outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                />
              </label>

              <label className="flex items-start gap-3 rounded-[13px] bg-danger-soft p-3.5 text-[10px] leading-5 text-[#555553]">
                <input
                  type="checkbox"
                  required
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-0.5 rounded border-line text-danger"
                />
                <span>{t("paymentReversal.confirmation")}</span>
              </label>

              {error && (
                <p
                  className="rounded-[12px] bg-danger-soft px-4 py-3 text-[11px] text-danger"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isBusy}
                  className="min-h-11 rounded-[13px] border border-line px-5 text-[11px] font-semibold text-[#555553] disabled:opacity-50"
                >
                  {t("paymentReversal.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isBusy || !reason.trim() || !confirmed}
                  className="min-h-11 rounded-[13px] bg-danger px-5 text-[11px] font-semibold text-white disabled:opacity-50"
                >
                  {isBusy
                    ? t("paymentReversal.submitting")
                    : t("paymentReversal.submit")}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export default function InvoicePaymentsSection({
  invoice,
  locale,
  timezone,
  canManage,
  onRefresh,
}) {
  const t = useTranslations("Invoices");
  const [mutationInvoice, setMutationInvoice] = useState(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [paymentToReverse, setPaymentToReverse] = useState(null);
  const [notice, setNotice] = useState(null);
  const [preparingAction, setPreparingAction] = useState("");
  const resolvedInvoice = getLatestInvoice(invoice, mutationInvoice);
  const currency = getInvoiceCurrency(resolvedInvoice);
  const amountDueMinor = getInvoiceAmountDueMinor(resolvedInvoice);
  const payments = getPayments(resolvedInvoice);
  const canRecord = canManage && amountDueMinor > 0;
  const recordRequestStorageKey = getRequestStorageKey(
    resolvedInvoice,
    "record",
  );

  const prepareAction = async (storageKey, openDialog) => {
    setNotice(null);

    if (readPendingRequests(storageKey).length === 0) {
      openDialog();
      return;
    }

    setPreparingAction(storageKey);
    try {
      if (!onRefresh) throw new Error("Invoice refresh is unavailable.");

      const refreshResult = await onRefresh();
      if (refreshResult?.error) throw refreshResult.error;

      openDialog();
    } catch (refreshError) {
      setNotice({
        type: "error",
        message: getInvoiceError(
          refreshError,
          t("messages.paymentRefreshError"),
        ),
      });
    } finally {
      setPreparingAction("");
    }
  };

  const paymentMethodLabel = (method) => {
    const key = `payments.methods.${method}`;
    return t.has(key) ? t(key) : String(method || "—").replaceAll("_", " ");
  };

  return (
    <>
      <section
        className="rounded-[17px] border border-line bg-white p-4"
        aria-labelledby="invoice-payment-history-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3
              id="invoice-payment-history-title"
              className="text-[11px] font-semibold text-[#252524]"
            >
              {t("payments.title")}
            </h3>
            <p className="mt-1 text-[10px] text-[#777773]">
              {t("payments.summary", {
                paid: formatMinorCurrencyAmount(
                  getInvoiceAmountPaidMinor(resolvedInvoice),
                  currency,
                  locale,
                ),
                due: formatMinorCurrencyAmount(
                  amountDueMinor,
                  currency,
                  locale,
                ),
              })}
            </p>
          </div>
          {canRecord && (
            <button
              type="button"
              onClick={() => {
                void prepareAction(recordRequestStorageKey, () =>
                  setRecordOpen(true),
                );
              }}
              disabled={Boolean(preparingAction)}
              aria-haspopup="dialog"
              className="inline-flex min-h-10 items-center gap-2 rounded-[12px] bg-cobalt-600 px-3.5 text-[10px] font-semibold text-white"
            >
              <BanknotesIcon className="h-4 w-4" />
              {t("actions.recordPayment")}
            </button>
          )}
        </div>

        {notice && (
          <p
            className={cx(
              "mt-3 rounded-[12px] px-4 py-3 text-[11px]",
              notice.type === "success"
                ? "bg-success-soft text-success"
                : "bg-danger-soft text-danger",
            )}
            role={notice.type === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {notice.message}
          </p>
        )}

        {payments.length === 0 ? (
          <p className="mt-4 rounded-[12px] bg-[#FAF9F6] px-4 py-4 text-[10px] text-[#777773]">
            {t("payments.empty")}
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {payments.map((payment, index) => {
              const paymentId = getPaymentId(payment);
              const method = getPaymentMethod(payment);
              const active = isPaymentActive(payment);
              const isManual = MANUAL_PAYMENT_METHODS.has(method);
              const amount = formatMinorCurrencyAmount(
                payment?.amountMinor,
                currency,
                locale,
              );
              const paidDate = formatInvoiceDate(
                payment?.paidAt,
                locale,
                timezone,
              );
              const canReverse =
                canManage && active && isManual && Boolean(paymentId);

              return (
                <li
                  key={paymentId || `${method}-${index}`}
                  className="rounded-[14px] border border-line bg-surface-muted p-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-[#292925]">
                        {amount}
                      </p>
                      <p className="mt-1 text-[10px] text-[#777773]">
                        {paymentMethodLabel(method)}
                      </p>
                    </div>
                    <span
                      className={cx(
                        "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                        active
                          ? "bg-success-soft text-success"
                          : "bg-danger-soft text-danger",
                      )}
                    >
                      {active ? t("payments.active") : t("payments.reversed")}
                    </span>
                  </div>

                  <dl className="mt-3 grid gap-2 text-[10px] text-[#777773] sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-[#555553]">
                        {t("payments.paidAt")}
                      </dt>
                      <dd className="mt-0.5">{paidDate}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#555553]">
                        {t("payments.reference")}
                      </dt>
                      <dd className="mt-0.5 break-words">
                        {getPaymentReference(payment) ||
                          t("payments.noReference")}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#555553]">
                        {t("payments.recordedAt")}
                      </dt>
                      <dd className="mt-0.5">
                        {formatInvoiceDate(
                          payment?.recordedAt,
                          locale,
                          timezone,
                          true,
                        )}
                      </dd>
                    </div>
                    {payment?.recordedBy && (
                      <div>
                        <dt className="font-semibold text-[#555553]">
                          {t("payments.recordedBy")}
                        </dt>
                        <dd className="mt-0.5 break-all font-mono">
                          {payment.recordedBy}
                        </dd>
                      </div>
                    )}
                    {!active && (
                      <>
                        <div>
                          <dt className="font-semibold text-danger">
                            {t("payments.reversedAt")}
                          </dt>
                          <dd className="mt-0.5">
                            {formatInvoiceDate(
                              payment?.reversedAt,
                              locale,
                              timezone,
                              true,
                            )}
                          </dd>
                        </div>
                        {payment?.reversedBy && (
                          <div>
                            <dt className="font-semibold text-danger">
                              {t("payments.reversedBy")}
                            </dt>
                            <dd className="mt-0.5 break-all font-mono">
                              {payment.reversedBy}
                            </dd>
                          </div>
                        )}
                        <div className="sm:col-span-2">
                          <dt className="font-semibold text-danger">
                            {t("payments.reversalReason")}
                          </dt>
                          <dd className="mt-0.5 whitespace-pre-wrap break-words">
                            {payment?.reversalReason || "—"}
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>

                  {active && !isManual && (
                    <p className="mt-3 text-[10px] leading-4 text-[#777773]">
                      {t("payments.providerManaged")}
                    </p>
                  )}

                  {canReverse && (
                    <button
                      type="button"
                      onClick={() => {
                        const storageKey = getRequestStorageKey(
                          resolvedInvoice,
                          `reverse:${paymentId}`,
                        );
                        void prepareAction(storageKey, () =>
                          setPaymentToReverse(payment),
                        );
                      }}
                      disabled={Boolean(preparingAction)}
                      aria-haspopup="dialog"
                      aria-label={t("payments.reverseAria", {
                        amount,
                        date: paidDate,
                      })}
                      className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-[11px] border border-danger/20 bg-white px-3 text-[10px] font-semibold text-danger"
                    >
                      <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                      {t("actions.reversePayment")}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {recordOpen && (
        <RecordPaymentDialog
          invoice={resolvedInvoice}
          locale={locale}
          timezone={timezone}
          requestStorageKey={recordRequestStorageKey}
          onClose={() => setRecordOpen(false)}
          onRecorded={(updatedInvoice) => {
            setMutationInvoice(updatedInvoice);
            setRecordOpen(false);
            setNotice({
              type: "success",
              message: t("messages.paymentRecorded"),
            });
          }}
        />
      )}

      {paymentToReverse && (
        <ReversePaymentDialog
          invoice={resolvedInvoice}
          payment={paymentToReverse}
          locale={locale}
          requestStorageKey={getRequestStorageKey(
            resolvedInvoice,
            `reverse:${getPaymentId(paymentToReverse)}`,
          )}
          onClose={() => setPaymentToReverse(null)}
          onReversed={(updatedInvoice) => {
            setMutationInvoice(updatedInvoice);
            setPaymentToReverse(null);
            setNotice({
              type: "success",
              message: t("messages.paymentReversed"),
            });
          }}
        />
      )}
    </>
  );
}
