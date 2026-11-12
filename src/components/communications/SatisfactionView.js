"use client";

import {
  ChatBubbleBottomCenterTextIcon,
  FaceSmileIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import { useGetCommunicationSatisfactionQuery } from "@/lib/features/communications/communicationsApiSlice";

import {
  ChannelBadge,
  EmptyState,
  ErrorState,
  LoadingState,
} from "./CommunicationsPrimitives";
import {
  formatDateTime,
  getResourceId,
  unwrapCollection,
} from "./communications.utils";

function Metric({ label, value, detail }) {
  return (
    <div className="rounded-[20px] border border-line bg-white p-5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{detail}</p>
    </div>
  );
}

export default function SatisfactionView({ locationId }) {
  const t = useTranslations("Communications");
  const locale = useLocale();
  const { data, isLoading, isError, refetch } =
    useGetCommunicationSatisfactionQuery({
      ...(locationId ? { locationId } : {}),
      limit: 100,
    });
  const payload = data?.data ?? data ?? {};
  const analytics = payload.summary ?? payload.analytics ?? {};
  const responses = unwrapCollection(payload, "responses");
  const distribution = analytics.distribution ?? {};

  const values = {
    total: Number(
      analytics.responses ??
        analytics.totalResponses ??
        analytics.total ??
        responses.length,
    ),
    average: Number(analytics.averageRating ?? analytics.average ?? 0),
    positive: (() => {
      const value = Number(
        analytics.positiveRate ?? analytics.satisfiedPercentage ?? 0,
      );
      return value <= 1 ? value * 100 : value;
    })(),
    responseRate:
      analytics.responseRate == null ? null : Number(analytics.responseRate),
  };

  if (isLoading)
    return (
      <div className="rounded-[26px] border border-line bg-white shadow-card">
        <LoadingState label={t("loading.satisfaction")} />
      </div>
    );
  if (isError)
    return (
      <div className="rounded-[26px] border border-line bg-white shadow-card">
        <ErrorState
          title={t("errors.satisfactionTitle")}
          description={t("errors.satisfactionDescription")}
          actionLabel={t("actions.retry")}
          onRetry={refetch}
        />
      </div>
    );

  return (
    <div className="space-y-5">
      <section className="rounded-[26px] border border-line bg-white shadow-card">
        <header className="border-b border-line p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <FaceSmileIcon className="h-5 w-5 text-cobalt-600" />
            <h2 className="text-base font-semibold text-ink">
              {t("satisfaction.title")}
            </h2>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-muted">
            {t("satisfaction.description")}
          </p>
        </header>
        <div className="grid gap-4 bg-sand-50/50 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
          <Metric
            label={t("satisfaction.metrics.average")}
            value={values.average ? values.average.toFixed(1) : "—"}
            detail={t("satisfaction.outOfFive")}
          />
          <Metric
            label={t("satisfaction.metrics.positive")}
            value={`${Math.round(values.positive)}%`}
            detail={t("satisfaction.positiveHint")}
          />
          <Metric
            label={t("satisfaction.metrics.responses")}
            value={values.total}
            detail={t("satisfaction.responsesHint")}
          />
          <Metric
            label={t("satisfaction.metrics.rate")}
            value={
              values.responseRate == null
                ? "—"
                : `${Math.round(values.responseRate <= 1 ? values.responseRate * 100 : values.responseRate)}%`
            }
            detail={t("satisfaction.rateHint")}
          />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <section className="rounded-[24px] border border-line bg-white p-5 shadow-card sm:p-6">
          <h3 className="text-sm font-semibold text-ink">
            {t("satisfaction.distribution")}
          </h3>
          <div className="mt-5 space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = Number(
                distribution[rating] ??
                  distribution[String(rating)] ??
                  responses.filter(
                    (response) =>
                      Number(response.rating ?? response.score) === rating,
                  ).length,
              );
              const percentage = values.total
                ? Math.round((count / values.total) * 100)
                : 0;
              return (
                <div
                  key={rating}
                  className="grid grid-cols-[30px_1fr_38px] items-center gap-3"
                >
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-ink">
                    {rating}
                    <StarIcon className="h-3 w-3 fill-warning text-warning" />
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-sand-100">
                    <span
                      className="block h-full rounded-full bg-cobalt-400"
                      style={{ width: `${percentage}%` }}
                    />
                  </span>
                  <span className="text-right text-[10px] text-ink-muted">
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-6 rounded-[16px] bg-cobalt-50 p-4 text-xs leading-5 text-cobalt-800 ring-1 ring-inset ring-cobalt-200">
            {t("satisfaction.safeguard")}
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-line bg-white shadow-card">
          <header className="border-b border-line p-5">
            <h3 className="text-sm font-semibold text-ink">
              {t("satisfaction.recent")}
            </h3>
          </header>
          {!responses.length ? (
            <EmptyState
              icon={ChatBubbleBottomCenterTextIcon}
              title={t("empty.satisfactionTitle")}
              description={t("empty.satisfactionDescription")}
            />
          ) : (
            <div className="divide-y divide-line">
              {responses.map((response, index) => {
                const rating = Number(response.rating ?? response.score ?? 0);
                return (
                  <article
                    key={getResourceId(response) || index}
                    className="p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className="flex items-center gap-0.5"
                        aria-label={t("satisfaction.ratingLabel", { rating })}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarIcon
                            key={star}
                            className={`h-4 w-4 ${star <= rating ? "fill-warning text-warning" : "text-line-strong"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-ink">
                        {response.customer?.name ??
                          response.customerName ??
                          t("satisfaction.anonymous")}
                      </span>
                      {response.channel ? (
                        <ChannelBadge channel={response.channel} />
                      ) : null}
                      <span className="ml-auto text-[10px] text-ink-subtle">
                        {formatDateTime(
                          response.respondedAt ?? response.createdAt,
                          locale,
                        )}
                      </span>
                    </div>
                    {response.comment ? (
                      <p className="mt-3 text-sm leading-6 text-ink-muted">
                        “{response.comment}”
                      </p>
                    ) : (
                      <p className="mt-3 text-xs italic text-ink-subtle">
                        {t("satisfaction.noComment")}
                      </p>
                    )}
                    {response.category ? (
                      <span className="mt-3 inline-flex rounded-full bg-sand-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-sand-800">
                        {t(`categories.${response.category}`)}
                      </span>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
