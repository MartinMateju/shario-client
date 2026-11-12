"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import { useCreateCreditNoteMutation } from "@/lib/features/invoices/invoicesApiSlice";
import {
  formatMinorCurrencyAmount,
  getStripeMinorUnitDigits,
  isValidMajorCurrencyPrecision,
  minorUnitsToMajor,
} from "@/utils/money";

import {
  getInvoiceCurrency,
  getInvoiceError,
  getInvoiceId,
  getInvoiceLines,
  getInvoiceNumber,
} from "./invoice.utils";

const getLineId = (line) => String(line?.id ?? line?._id ?? "");

const getLineRemainingMinor = (line) =>
  Math.max(
    0,
    Number(
      line?.remainingGrossAmountMinor ??
        line?.remainingCreditAmountMinor ??
        line?.creditableAmountMinor ??
        Number(line?.grossAmountMinor || 0) -
          Number(line?.creditedAmountMinor || 0),
    ),
  );

const toMinor = (value, currency) =>
  Math.round(Number(value) * 10 ** getStripeMinorUnitDigits(currency));

const createIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ??
  `invoice-credit-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function CreditNoteDialog({
  invoice,
  open,
  onClose,
  onCreated,
}) {
  const t = useTranslations("Invoices.creditNote");
  const locale = useLocale();
  const [reason, setReason] = useState("");
  const [send, setSend] = useState(false);
  const [mode, setMode] = useState("full");
  const [amounts, setAmounts] = useState({});
  const [idempotencyKey] = useState(createIdempotencyKey);
  const [error, setError] = useState("");
  const [createCreditNote, { isLoading }] = useCreateCreditNoteMutation();
  const currency = getInvoiceCurrency(invoice);
  const lines = getInvoiceLines(invoice).filter(
    (line) => getLineId(line) && getLineRemainingMinor(line) > 0,
  );

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    let creditLines;

    if (mode === "partial") {
      creditLines = [];

      for (const line of lines) {
        const id = getLineId(line);
        const rawAmount = amounts[id];
        if (rawAmount === undefined || rawAmount === "") continue;

        const number = Number(rawAmount);
        const remaining = getLineRemainingMinor(line);

        if (
          !Number.isFinite(number) ||
          number <= 0 ||
          !isValidMajorCurrencyPrecision(number, currency)
        ) {
          setError(t("errors.amountPrecision", { currency }));
          return;
        }

        const grossAmountMinor = toMinor(number, currency);
        if (grossAmountMinor > remaining) {
          setError(t("errors.amountTooHigh"));
          return;
        }

        creditLines.push({ lineItemId: id, grossAmountMinor });
      }

      if (!creditLines.length) {
        setError(t("errors.lines"));
        return;
      }
    }

    try {
      const result = await createCreditNote({
        id: getInvoiceId(invoice),
        reason: reason.trim(),
        ...(creditLines ? { lines: creditLines } : {}),
        send,
        idempotencyKey,
      }).unwrap();

      onCreated?.(result.invoice ?? result, result.delivery);
      onClose();
    } catch (mutationError) {
      setError(getInvoiceError(mutationError, t("errors.request")));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isLoading ? () => {} : onClose}
      className="relative z-[130]"
    >
      <DialogBackdrop
        data-dialog-backdrop
        className="fixed inset-0 bg-[#11110F]/30 backdrop-blur-[2px]"
      />
      <div className="fixed inset-0 overflow-y-auto p-0 sm:p-6">
        <div className="flex min-h-full items-stretch justify-center sm:items-center">
          <DialogPanel
            data-dialog-layout="form"
            className="h-dvh max-h-dvh w-full max-w-lg overflow-y-auto rounded-none border-0 bg-white p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] shadow-floating sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:rounded-[24px] sm:border sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-terracotta-600">
                  {getInvoiceNumber(invoice)}
                </p>
                <DialogTitle className="mt-2 text-[23px] font-semibold tracking-[-0.04em] text-[#111111]">
                  {t("title")}
                </DialogTitle>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="rounded-full p-2 text-[#777773] hover:bg-[#F4F2ED]"
                aria-label={t("close")}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-[11px] leading-5 text-[#777773]">
              {t("description")}
            </p>

            <form onSubmit={submit} className="mt-5">
              <fieldset>
                <legend className="text-[10px] font-semibold text-[#393936]">
                  {t("amountMode")}
                </legend>
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-[13px] bg-[#F7F5F1] p-1.5">
                  {["full", "partial"].map((value) => (
                    <label
                      key={value}
                      className={
                        mode === value
                          ? "flex min-h-10 cursor-pointer items-center justify-center rounded-[10px] bg-white text-[10px] font-semibold text-[#292925] shadow-sm"
                          : "flex min-h-10 cursor-pointer items-center justify-center rounded-[10px] text-[10px] font-medium text-[#777773]"
                      }
                    >
                      <input
                        type="radio"
                        name="credit-mode"
                        value={value}
                        checked={mode === value}
                        onChange={(event) => setMode(event.target.value)}
                        className="sr-only"
                      />
                      {t(`modes.${value}`)}
                    </label>
                  ))}
                </div>
              </fieldset>

              {mode === "partial" && (
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] leading-4 text-[#777773]">
                    {t("partialHelp")}
                  </p>
                  {lines.map((line) => {
                    const id = getLineId(line);
                    const remaining = getLineRemainingMinor(line);

                    return (
                      <label
                        key={id}
                        className="grid gap-2 rounded-[13px] border border-line p-3 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[10px] font-semibold text-[#353533]">
                            {line.description}
                          </span>
                          <span className="mt-1 block text-[10px] text-[#969691]">
                            {t("remaining", {
                              amount: formatMinorCurrencyAmount(
                                remaining,
                                currency,
                                locale,
                              ),
                            })}
                          </span>
                        </span>
                        <input
                          type="number"
                          min={
                            getStripeMinorUnitDigits(currency) === 0
                              ? "1"
                              : "0.01"
                          }
                          max={minorUnitsToMajor(remaining, currency)}
                          step={
                            getStripeMinorUnitDigits(currency) === 0
                              ? "1"
                              : "0.01"
                          }
                          value={amounts[id] ?? ""}
                          onChange={(event) =>
                            setAmounts((current) => ({
                              ...current,
                              [id]: event.target.value,
                            }))
                          }
                          placeholder={String(
                            minorUnitsToMajor(remaining, currency),
                          )}
                          className="h-10 rounded-[11px] border border-line px-3 text-[10px] outline-none focus:border-cobalt-500"
                          aria-label={t("lineAmount", {
                            description: line.description,
                          })}
                        />
                      </label>
                    );
                  })}
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold text-[#393936]">
                  {t("reason")}
                </span>
                <textarea
                  required
                  maxLength={1000}
                  rows={4}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="w-full rounded-[13px] border border-line px-3.5 py-3 text-[11px] outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                />
              </label>

              <label className="mt-4 flex items-start gap-3 rounded-[13px] bg-[#F7F5F1] p-3.5 text-[10px] leading-5 text-[#555553]">
                <input
                  type="checkbox"
                  checked={send}
                  onChange={(event) => setSend(event.target.checked)}
                  className="mt-0.5 rounded border-line text-cobalt-600"
                />
                {t("send")}
              </label>

              {error && (
                <p
                  className="mt-4 rounded-[12px] bg-danger-soft px-4 py-3 text-[11px] text-danger"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="min-h-11 rounded-[13px] border border-line px-5 text-[11px] font-semibold text-[#555553]"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !reason.trim()}
                  className="min-h-11 rounded-[13px] bg-terracotta-600 px-5 text-[11px] font-semibold text-white disabled:opacity-50"
                >
                  {isLoading ? t("creating") : t("confirm")}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
