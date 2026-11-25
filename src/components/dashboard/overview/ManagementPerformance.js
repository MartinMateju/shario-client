"use client";

import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Link } from "@/i18n/navigation";
import { formatMinorCurrencyAmount } from "@/utils/money";
import { formatMakerId } from "@/utils/memberIdentity";

import {
  formatManagementDate,
  formatManagementPeriod,
  formatManagementValue,
  getManagementHours,
  hasMetricValue,
} from "./management.utils";
import styles from "./management.module.css";

export function ManagementKpi({
  label,
  metric,
  detail,
  unavailableDetail,
  money,
  currency,
  incomplete = false,
}) {
  const locale = useLocale();
  const t = useTranslations("StudioManagement");
  const available = hasMetricValue(metric);
  const previous =
    !incomplete && available && hasMetricValue({ value: metric.previous });

  return (
    <div className={styles.kpi}>
      <span className={styles.kpiLabel}>{label}</span>
      <strong className={styles.kpiValue}>
        {formatManagementValue(metric, { locale, money, currency })}
      </strong>
      {available && incomplete ? (
        <small className={styles.muted}>{t("knownPaymentsOnly")}</small>
      ) : null}
      {previous ? (
        <small className={styles.muted}>
          {t("previousValue", {
            value: formatManagementValue(
              { value: metric.previous },
              { locale, money, currency },
            ),
          })}
        </small>
      ) : null}
      <small className={styles.muted}>
        {available ? detail : unavailableDetail || t("unavailable")}
      </small>
    </div>
  );
}

function CustomerSummary({ customers, metadata, bookingEnabled }) {
  const t = useTranslations("StudioManagement");
  const locale = useLocale();
  const value = (metric) => formatManagementValue(metric, { locale });
  return (
    <section className={styles.kpi} aria-labelledby="management-customers">
      <h3 id="management-customers" className={styles.kpiLabel}>
        {t("totalCustomers")}
      </h3>
      <strong className={styles.kpiValue}>{value(customers?.total)}</strong>
      <small className={styles.muted}>
        {t("workspaceCustomersScope")} ·{" "}
        {t("asOfDate", {
          date: formatManagementDate(metadata?.period?.to, locale),
        })}
      </small>
      <dl className={styles.kpiDetails}>
        <div>
          <dt>{t("newRegisteredThisMonth")}</dt>
          <dd>{value(customers?.new)}</dd>
        </div>
        {bookingEnabled ? (
          <div>
            <dt>{t("activeCustomers")}</dt>
            <dd>{value(customers?.activeLast30Days)}</dd>
          </div>
        ) : null}
      </dl>
      {bookingEnabled ? (
        <small className={styles.muted}>
          {t("activeCustomersBasis")}
          <br />
          {formatManagementPeriod(
            metadata?.activeCustomerPeriod,
            locale,
          )} ·{" "}
          {t(
            customers?.activeScope === "workspace"
              ? "workspaceScope"
              : "selectedStudiosScope",
          )}
        </small>
      ) : null}
      {!hasMetricValue(customers?.total) ||
      !hasMetricValue(customers?.new) ||
      (bookingEnabled && !hasMetricValue(customers?.activeLast30Days)) ? (
        <small className={styles.muted}>{t("missingMetric")}</small>
      ) : null}
    </section>
  );
}

function SubscriberSummary({ summary, memberships, metadata }) {
  const t = useTranslations("StudioManagement");
  const locale = useLocale();
  // Older API versions counted membership contracts, not distinct people.
  const activeSubscribers = memberships?.newSubscribers
    ? summary?.activeMemberships
    : undefined;
  return (
    <section className={styles.kpi} aria-labelledby="management-subscribers">
      <h3 id="management-subscribers" className={styles.kpiLabel}>
        {t("activeSubscribers")}
      </h3>
      <strong className={styles.kpiValue}>
        {formatManagementValue(activeSubscribers, { locale })}
      </strong>
      <small className={styles.muted}>
        {t("asOfDate", {
          date: formatManagementDate(metadata?.period?.to, locale),
        })}{" "}
        ·{" "}
        {t(
          memberships?.scope === "workspace"
            ? "workspaceScope"
            : "subscriberSelectedScope",
        )}
      </small>
      <dl className={styles.kpiDetails}>
        <div>
          <dt>{t("newSubscribersThisMonth")}</dt>
          <dd>
            {formatManagementValue(memberships?.newSubscribers, { locale })}
          </dd>
        </div>
      </dl>
      <small className={styles.muted}>{t("subscriberBasis")}</small>
      {!hasMetricValue(activeSubscribers) ||
      !hasMetricValue(memberships?.newSubscribers) ? (
        <small className={styles.muted}>{t("missingMetric")}</small>
      ) : null}
    </section>
  );
}

function AttendanceChart({ attendance, metadata }) {
  const t = useTranslations("StudioManagement");
  const locale = useLocale();
  const hours = getManagementHours(attendance);
  const max = Math.max(1, ...hours.map((entry) => entry.count));
  const peak = hours.reduce(
    (best, entry) => (entry.count > (best?.count || 0) ? entry : best),
    null,
  );
  const recorded = attendance?.source === "recorded";

  return (
    <section className={styles.panel} aria-labelledby="management-attendance">
      <h3 id="management-attendance">
        {t(recorded ? "arrivalTitle" : "scheduledArrivalTitle")}
      </h3>
      <p className={styles.caption}>
        {formatManagementPeriod(metadata?.arrivalPeriod, locale)} ·{" "}
        {t("last30Days")}
      </p>
      {attendance?.available !== true ? (
        <p className={styles.empty}>{t("unavailable")}</p>
      ) : !attendance.sampleSize || !peak ? (
        <p className={styles.empty}>{t("noAttendance")}</p>
      ) : (
        <>
          <div className={styles.chart} aria-label={t("hourlyAttendance")}>
            <div className={styles.chartScale} aria-hidden="true">
              <span>{max}</span>
              <span>{Math.round(max / 2)}</span>
              <span>0</span>
            </div>
            <div className={styles.chartPlot}>
              {hours.map(({ hour, count }) => (
                <div className={styles.chartColumn} key={hour}>
                  <div
                    className={styles.chartBar}
                    style={{ height: `${(count / max) * 100}%` }}
                    role="img"
                    aria-label={t("hourCount", { hour, count })}
                    title={t("hourCount", { hour, count })}
                    data-peak={hour === peak.hour}
                  />
                  {hour % 4 === 0 ? (
                    <span className={styles.chartTick}>
                      {String(hour).padStart(2, "0")}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.chartFootnote}>
            <strong>
              {t(recorded ? "recordedBusiestHour" : "busiestHour", {
                from: peak.hour,
                to: peak.hour + 1,
              })}
            </strong>
            <span>
              {t(recorded ? "recordedSample" : "scheduledSample", {
                count: attendance.sampleSize,
              })}
            </span>
          </div>
          {!recorded ? (
            <p className={styles.caption}>{t("scheduledCaveat")}</p>
          ) : null}
        </>
      )}
    </section>
  );
}

function Rankings({
  topClients,
  topProducts,
  currency,
  period,
  showClients,
  showProducts,
}) {
  const t = useTranslations("StudioManagement");
  const locale = useLocale();
  const paymentRanking = topClients?.revenueBasis === "recorded_net_payments";
  const paidProducts = topProducts?.basis === "paid_purchases";
  const [selectedRanking, setRanking] = useState(
    paymentRanking ? "revenue" : "visits",
  );
  const ranking = showProducts ? selectedRanking : "visits";
  const clients =
    ranking === "visits" ? topClients?.byVisits : topClients?.byRevenue;
  const items = Array.isArray(clients) ? clients.slice(0, 5) : [];
  const products = Array.isArray(topProducts?.items)
    ? topProducts.items.slice(0, 3)
    : [];
  const renderMoney = (value) =>
    typeof value === "number" && Number.isFinite(value)
      ? formatMinorCurrencyAmount(value, currency, locale)
      : "—";
  const partialSpending =
    topClients?.spendingAvailable === true &&
    items.some(
      (item) =>
        !Number.isFinite(item.spentMonthMinor) ||
        !Number.isFinite(item.spentTotalMinor) ||
        item.spentMonthComplete === false,
    );

  return (
    <div className={styles.twoColumns}>
      {showClients ? (
        <section
          className={styles.panel}
          aria-labelledby="management-top-clients"
        >
          <div className={styles.panelHeader}>
            <h3 id="management-top-clients">{t("topClients")}</h3>
            <div
              className={styles.segment}
              role="group"
              aria-label={t("rankingBy")}
            >
              {(showProducts ? ["visits", "revenue"] : ["visits"]).map(
                (key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={ranking === key}
                    onClick={() => setRanking(key)}
                  >
                    {t(key === "revenue" && paymentRanking ? "spending" : key)}
                  </button>
                ),
              )}
            </div>
          </div>
          <p className={styles.caption}>
            {t(
              ranking === "visits"
                ? "clientVisitsBasis"
                : paymentRanking
                  ? "clientPaymentsBasis"
                  : "clientRevenueBasis",
            )}
          </p>
          {(
            ranking === "visits"
              ? topClients?.available !== true
              : topClients?.revenueAvailable !== true
          ) ? (
            <p className={styles.empty}>{t("unavailable")}</p>
          ) : !items.length ? (
            <p className={styles.empty}>
              {t(
                ranking === "revenue" && paymentRanking
                  ? "noCustomerPayments"
                  : "noClients",
              )}
            </p>
          ) : (
            <ol className={styles.rankingList} aria-live="polite">
              {items.map((item, index) => (
                <li key={item.id || index}>
                  <div className={styles.clientIdentity}>
                    <span className={styles.rank}>{index + 1}</span>
                    <span className={styles.initials} aria-hidden="true">
                      {String(item.name || "?")
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </span>
                    <span className={styles.rankName}>
                      <span>{item.name || t("unnamedClient")}</span>
                      <small>
                        {t("customerId", {
                          id: formatMakerId(item.memberNumber),
                        })}
                      </small>
                    </span>
                    <span className={styles.clientRankValue}>
                      <strong>
                        {ranking === "visits"
                          ? (item.visits ?? "—")
                          : renderMoney(item.revenueMinor)}
                      </strong>
                      <small>
                        {t(
                          ranking === "visits"
                            ? "visits"
                            : paymentRanking
                              ? "spending"
                              : "revenue",
                        )}
                      </small>
                      {ranking === "revenue" &&
                      paymentRanking &&
                      item.spentMonthComplete === false ? (
                        <small>{t("knownAmount")}</small>
                      ) : null}
                    </span>
                  </div>
                  {showProducts ? (
                    <dl className={styles.clientSpending}>
                      <div>
                        <dt>{t("spentMonth")}</dt>
                        <dd>
                          {renderMoney(
                            topClients.spendingAvailable === true
                              ? item.spentMonthMinor
                              : null,
                          )}
                          {topClients.spendingAvailable === true &&
                          item.spentMonthComplete === false &&
                          Number.isFinite(item.spentMonthMinor) ? (
                            <small> · {t("knownAmount")}</small>
                          ) : null}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("spentTotal")}</dt>
                        <dd>
                          {renderMoney(
                            topClients.spendingAvailable === true
                              ? item.spentTotalMinor
                              : null,
                          )}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
          {showProducts && items.length > 0 ? (
            <p className={styles.caption}>
              {t("clientSpendingBasis", {
                period: formatManagementPeriod(period, locale),
              })}
              {topClients?.spendingAvailable !== true
                ? ` ${t("spendingUnavailable")}`
                : partialSpending
                  ? ` ${t("spendingIncomplete")}`
                  : ""}
            </p>
          ) : null}
          {ranking === "revenue" &&
          topClients?.revenueAvailable &&
          topClients?.revenueComplete === false ? (
            <p className={styles.caption}>
              {t(paymentRanking ? "paymentRankingIncomplete" : "confirmedOnly")}
            </p>
          ) : null}
        </section>
      ) : null}
      {showProducts ? (
        <section
          className={styles.panel}
          aria-labelledby="management-top-products"
        >
          <div className={styles.panelHeader}>
            <h3 id="management-top-products">{t("topProducts")}</h3>
            <span className={styles.caption}>
              {t(paidProducts ? "byPurchases" : "byQuantity")}
            </span>
          </div>
          <p className={styles.caption}>
            {paidProducts
              ? t("purchasedProductsBasis", {
                  period: formatManagementPeriod(topProducts.period, locale),
                })
              : t("deliveredProductsBasis")}
            {paidProducts && topProducts.scope ? (
              <>
                {" "}
                ·{" "}
                {t(
                  topProducts.scope === "workspace"
                    ? "workspaceScope"
                    : "selectedStudiosScope",
                )}
              </>
            ) : null}
          </p>
          {topProducts?.available !== true ? (
            <p className={styles.empty}>{t("unavailable")}</p>
          ) : !products.length ? (
            <p className={styles.empty}>
              {t(paidProducts ? "noPurchasedProducts" : "noProducts")}
            </p>
          ) : (
            <ol className={styles.productList}>
              {products.map((item, index) => (
                <li key={item.id || index}>
                  <span className={styles.productRank}>{index + 1}</span>
                  <div>
                    <strong>{item.name || t("unnamedProduct")}</strong>
                    {!paidProducts || Number.isFinite(item.revenueMinor) ? (
                      <small>{renderMoney(item.revenueMinor)}</small>
                    ) : null}
                  </div>
                  <span className={styles.quantity}>
                    {(paidProducts ? item.purchaseCount : item.quantity) ?? "—"}
                    <small>{t(paidProducts ? "purchases" : "units")}</small>
                  </span>
                </li>
              ))}
            </ol>
          )}
          {topProducts?.complete === false ? (
            <p className={styles.caption}>
              {t(paidProducts ? "purchasesIncomplete" : "confirmedOnly")}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default function ManagementPerformance({ management, modules }) {
  const locale = useLocale();
  const t = useTranslations("StudioManagement");
  const metadata = management?.metadata || {};
  const summary = management?.summary || {};
  const currency = metadata.currency || "CZK";
  const recordedPayments = metadata.revenueBasis === "recorded_net_payments";
  const bookingEnabled =
    modules?.bookings !== false || modules?.courses !== false;
  return (
    <div className={styles.performance}>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>{t("performanceEyebrow")}</p>
          <h2>{t("monthTitle")}</h2>
        </div>
        <div className={styles.period}>
          {formatManagementPeriod(metadata.period, locale)}
          <small>
            {t("comparison", {
              period: formatManagementPeriod(metadata.comparisonPeriod, locale),
            })}
          </small>
        </div>
      </div>
      <div className={styles.kpiGrid}>
        {modules?.payments !== false ? (
          <ManagementKpi
            label={t(recordedPayments ? "recordedPayments" : "revenue")}
            metric={
              recordedPayments
                ? summary.recordedPaymentsMinor
                : summary.deliveredRevenueMinor
            }
            money
            currency={currency}
            incomplete={
              recordedPayments && summary.recordedPaymentsComplete === false
            }
            detail={
              recordedPayments
                ? `${t("recordedPaymentsBasis")} · ${t(metadata.revenueScope === "workspace" ? "workspaceScope" : "selectedStudiosScope")}`
                : t("revenueBasis")
            }
            unavailableDetail={t(
              recordedPayments
                ? "paymentsUnavailable"
                : "revenueUnavailableShort",
            )}
          />
        ) : null}
        {bookingEnabled ? (
          <ManagementKpi
            label={t("visits")}
            metric={summary.visits}
            detail={t("visitsBasis")}
          />
        ) : null}
        {modules?.customers !== false ? (
          <CustomerSummary
            customers={management?.customers}
            metadata={metadata}
            bookingEnabled={bookingEnabled}
          />
        ) : null}
        {modules?.memberships !== false ? (
          <SubscriberSummary
            summary={summary}
            memberships={management?.memberships}
            metadata={metadata}
          />
        ) : null}
      </div>
      {bookingEnabled ? (
        <AttendanceChart
          attendance={management?.attendance}
          metadata={metadata}
        />
      ) : null}
      {bookingEnabled || modules?.payments !== false ? (
        <Rankings
          topClients={management?.topClients}
          topProducts={management?.topProducts}
          currency={currency}
          period={metadata.period}
          showClients={bookingEnabled}
          showProducts={modules?.payments !== false}
        />
      ) : null}
      {management?.coverage?.complete === false ? (
        <details className={styles.coverage}>
          <summary>{t("coverageTitle")}</summary>
          <p>{t("coverageDescription")}</p>
          <p>{t("coverageReportDetails")}</p>
        </details>
      ) : null}
      <Link
        href="/app/operations?section=statistics"
        className={styles.textLink}
      >
        {t("openReports")}
        <ArrowUpRightIcon aria-hidden="true" />
      </Link>
    </div>
  );
}
