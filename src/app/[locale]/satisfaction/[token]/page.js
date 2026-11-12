"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

import { useSubmitCommunicationSatisfactionMutation } from "@/lib/features/communications/communicationsApiSlice";

export default function SatisfactionSurveyPage() {
  const t = useTranslations("Communications.survey");
  const params = useParams();
  const token = String(params?.token ?? "");
  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState("form");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitSurvey, { isLoading }] =
    useSubmitCommunicationSatisfactionMutation();

  const submit = async (event) => {
    event.preventDefault();
    if (!score) return;
    setErrorMessage("");

    try {
      await submitSurvey({ token, score, comment: comment.trim() }).unwrap();
      setState("success");
    } catch (error) {
      const status = error?.status ?? error?.originalStatus;
      if (status === 404 || status === 410) {
        setState("expired");
      } else {
        setErrorMessage(error?.data?.message ?? t("errorDescription"));
      }
    }
  };

  return (
    <main className="relative flex min-h-[calc(100dvh-var(--header-height))] items-center justify-center overflow-hidden bg-canvas px-4 py-12">
      <div className="pointer-events-none absolute -right-28 top-12 h-72 w-72 rounded-full bg-cobalt-500 opacity-[0.09]" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rotate-[-10deg] rounded-[45%] bg-[repeating-linear-gradient(12deg,rgba(245,185,170,0.8)_0_8px,rgb(var(--skab-coral-rgb)/0.45)_9px_13px,transparent_14px_21px)] opacity-65" />

      <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-[30px] border border-line bg-white shadow-floating">
        <div className="border-b border-line bg-sand-50 px-6 py-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cobalt-700">
            shario.io
          </p>
          <p className="mt-1 text-xs text-ink-muted">{t("privateHint")}</p>
        </div>

        {state === "success" ? (
          <div className="px-7 py-12 text-center sm:px-10">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
              <CheckCircleIcon className="h-7 w-7" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-ink">
              {t("successTitle")}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink-muted">
              {t("successDescription")}
            </p>
          </div>
        ) : state === "expired" ? (
          <div className="px-7 py-12 text-center sm:px-10">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-warning">
              <ClockIcon className="h-7 w-7" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-ink">
              {t("expiredTitle")}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink-muted">
              {t("expiredDescription")}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-8 sm:px-10 sm:py-10">
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
                {t("title")}
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-muted">
                {t("description")}
              </p>
            </div>

            <fieldset className="mt-8">
              <legend className="sr-only">{t("ratingLabel")}</legend>
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = value <= (hovered || score);
                  return (
                    <button
                      key={value}
                      type="button"
                      onMouseEnter={() => setHovered(value)}
                      onMouseLeave={() => setHovered(0)}
                      onFocus={() => setHovered(value)}
                      onBlur={() => setHovered(0)}
                      onClick={() => setScore(value)}
                      className="rounded-full p-1.5 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-300"
                      aria-label={t("score", { score: value })}
                      aria-pressed={score === value}
                    >
                      <StarIcon
                        className={`h-9 w-9 transition sm:h-10 sm:w-10 ${active ? "fill-warning text-warning" : "text-line-strong"}`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-center text-xs text-ink-muted">
                {score ? t("selected", { score }) : t("choose")}
              </p>
            </fieldset>

            <label className="mt-7 block text-xs font-medium text-ink-muted">
              {t("commentLabel")}
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                maxLength={2000}
                placeholder={t("commentPlaceholder")}
                className="mt-2 w-full rounded-[18px] border-line bg-sand-50 text-sm leading-6 focus:border-cobalt-300 focus:ring-cobalt-200"
              />
            </label>

            {errorMessage ? (
              <div className="mt-4 flex items-start gap-2 rounded-[14px] border border-danger/15 bg-danger-soft px-3 py-2.5 text-xs text-danger">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!score || isLoading}
              className="mt-6 w-full rounded-full bg-cobalt-500 px-5 py-3 text-sm font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? t("submitting") : t("submit")}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
