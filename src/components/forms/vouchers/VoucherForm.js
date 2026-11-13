"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import { resolveIntlLocale } from "@/i18n/formatting";

import { useLegacyLocale } from "@/i18n/useLegacyCopy";
import { useLegacyText } from "@/i18n/useLegacyCopy";
import React, { useEffect, useMemo, useState } from "react";
import Loader from "../../loaders/Loader";
import ConfirmationModal from "../../modals/ConformationModal";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";
import { useSelector } from "react-redux";
import { useTranslations } from "next-intl";
import {
  formatVoucherCreditsReceived,
  getIssuedVoucherName,
} from "@/components/vouchers/voucherRecord";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import {
  selectCurrentTenant,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import { formatMajorCurrencyAmount } from "@/utils/money";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import {
  ArrowPathIcon,
  TicketIcon,
  CheckBadgeIcon,
} from "@heroicons/react/20/solid";
import {
  useRedeemPromoCodeMutation,
  useGetUserRedeemedCouponsQuery,
} from "@/lib/features/coupons/couponsApiSlice";

const PROMO_CODE_REGEX = /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/;

const classNames = (...classes) => classes.filter(Boolean).join(" ");

const TEXT_DARK = "text-[var(--unnamed-color-0f1113)]";
const TEXT_MUTED = "text-[#59524B]";
const ACCENT = "text-[var(--unnamed-color-b3a292)]";
const ACCENT_BORDER = "border-[var(--unnamed-color-b3a292)]";

const primaryButton =
  "inline-flex items-center justify-center rounded-full border " +
  "px-5 sm:px-6 py-3 " +
  " text-[11px] sm:text-xs uppercase tracking-[0.18em] " +
  "transition-all duration-200 ease-out active:scale-95 touch-manipulation " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--unnamed-color-b3a292)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F5F2] " +
  "border-[var(--unnamed-color-0f1113)] bg-[var(--unnamed-color-0f1113)] text-white " +
  "hover:bg-black hover:border-black shadow-[0_8px_24px_rgba(15,17,19,0.14)] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--unnamed-color-0f1113)] disabled:hover:border-[var(--unnamed-color-0f1113)]";

const secondaryButton =
  "inline-flex items-center justify-center rounded-full border " +
  "px-4 sm:px-5 py-2.5 " +
  " text-[11px] sm:text-xs uppercase tracking-[0.18em] " +
  "transition-all duration-200 ease-out active:scale-95 touch-manipulation " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--unnamed-color-b3a292)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F5F2] " +
  "border-[rgba(179,162,146,0.42)] bg-white/75 text-[var(--unnamed-color-0f1113)] " +
  "hover:bg-white hover:border-[var(--unnamed-color-0f1113)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.05)] " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const inputBase =
  "block w-full h-[56px] rounded-full border px-5 sm:px-6  " +
  "text-[var(--unnamed-color-0f1113)] placeholder:text-[#9B958F] bg-white/82 " +
  "focus:outline-none focus:ring-0 transition-colors";

const inputValid = `${ACCENT_BORDER} focus:${ACCENT_BORDER}`;
const inputInvalid = "border-red-500 focus:border-red-600";

const formatDateByLanguage = (iso, language) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString(resolveIntlLocale(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function VoucherForm() {
  const activeLocale = useLegacyLocale();
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
  const t = useTranslations("VoucherFoundation");
  const language = useSelector(selectCurrentLanguage) || "CZ";
  const { id: userId } = useSelector(selectCurrentUser) || {};
  const tenant = useSelector(selectCurrentTenant);
  const tenantCurrency =
    tenant?.settings?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY;
  const moneyLocale = activeLocale;

  const [redeemPromoCode, redeemState] = useRedeemPromoCodeMutation();
  const { isLoading: isRedeeming } = redeemState;

  const {
    data: redeemedCoupons = [],
    isLoading: isLoadingRedeemed,
    isError: isRedeemedError,
    error: redeemedError,
    refetch: refetchRedeemed,
  } = useGetUserRedeemedCouponsQuery(undefined, {
    skip: !userId,
  });

  const [showModalConfirm, setShowModalConfirm] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [confirmText, setConfirmText] = useState(
    translation["VOUCHER_REDEEM_CONTENT"]?.[language],
  );

  useEffect(() => {
    setConfirmText(translation["VOUCHER_REDEEM_CONTENT"]?.[language]);
  }, [language, translation]);

  const formatPromoCode = (value) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const parts = cleaned.match(/.{1,3}/g) || [];
    return parts.slice(0, 3).join("-");
  };

  const normalizedCode = useMemo(
    () =>
      String(promoCode || "")
        .trim()
        .toUpperCase(),
    [promoCode],
  );

  const isValid = useMemo(
    () => PROMO_CODE_REGEX.test(normalizedCode),
    [normalizedCode],
  );

  const onRedeemClicked = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    setSubmitted(true);
    setErrorMsg("");

    if (!userId) {
      setErrorMsg(
        legacyText(
          "VoucherForm_You_need_to_be_signed_in_to_redeem_a_voucher_7fb72",
        ),
      );
      return;
    }

    if (!isValid) return;

    try {
      const resp = await redeemPromoCode({
        promoCode: normalizedCode,
      }).unwrap();

      if (
        typeof resp?.creditsAdded === "number" &&
        typeof resp?.newBalance === "number"
      ) {
        setConfirmText(
          legacyText(
            "VoucherForm_Voucher_redeemed_successfully_Added_value1_New_balance_1a0e9",
            {
              value1: formatMajorCurrencyAmount(
                resp.creditsAdded,
                resp.currency || tenantCurrency,
                moneyLocale,
              ),
              value2: formatMajorCurrencyAmount(
                resp.newBalance,
                resp.currency || tenantCurrency,
                moneyLocale,
              ),
            },
          ),
        );
      } else {
        setConfirmText(translation["VOUCHER_REDEEM_CONTENT"]?.[language]);
      }

      setShowModalConfirm(true);
      setPromoCode("");
      setSubmitted(false);
      refetchRedeemed();
    } catch (err) {
      const msg = getLocalizedApiErrorMessage(
        err,
        legacyText(
          "VoucherForm_The_voucher_could_not_be_redeemed_Please_try_again_1d1d3",
        ),
      );
      setErrorMsg(msg);
    }
  };

  const isLoading = isRedeeming || isLoadingRedeemed;
  if (isLoading) return <Loader />;

  const historyTitle = legacyText("VoucherForm_Redeemed_vouchers_1733e");

  return (
    <>
      <ConfirmationModal
        open={showModalConfirm}
        setOpen={setShowModalConfirm}
        text={confirmText}
        title={translation["VOUCHER_REDEEM_TITLE"]?.[language]}
      />

      <div className="mt-6 sm:mt-7">
        <div className="overflow-hidden rounded-[32px] border border-[rgba(179,162,146,0.48)] bg-white/50 backdrop-blur-sm shadow-[0_14px_40px_rgba(0,0,0,0.035)]">
          {/* Intro */}
          <div className="px-5 sm:px-6 lg:px-7 pt-6 lg:pt-7 xl:pt-8 pb-5">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[rgba(179,162,146,0.55)] bg-white/75">
                <TicketIcon className="h-6 w-6 text-[var(--unnamed-color-b3a292)]" />
              </div>

              <div className="min-w-0 max-w-4xl">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#8A7F74] ">
                  {legacyText("VoucherForm_Vouchers_credits_fd59d")}
                </div>

                <h2
                  className={classNames(
                    "mt-3 text-[30px] sm:text-[34px] lg:text-[38px] leading-[1.03] uppercase font-medium",
                    TEXT_DARK,
                  )}
                >
                  {legacyText("VoucherForm_My_vouchers_9cb49")}
                </h2>

                <p
                  className={classNames(
                    "mt-3 max-w-[58rem] text-[15px] sm:text-[16px] leading-[1.8] ",
                    TEXT_MUTED,
                  )}
                >
                  {t("walletConversion.help")}
                </p>

                <div className="mt-4 space-y-2 text-sm sm:text-[15px]">
                  <p className={classNames("", TEXT_MUTED)}>
                    {legacyText(
                      "VoucherForm__If_you_have_multiple_vouchers_you_can_redeem_them_one_8e5cf",
                    )}
                  </p>
                  <p className={classNames("", TEXT_MUTED)}>
                    {legacyText(
                      "VoucherForm__Voucher_values_are_added_together_automatically_a418b",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Redeem section */}
          <div className="border-t border-[rgba(179,162,146,0.18)] px-5 sm:px-6 lg:px-7 py-5 sm:py-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#8A7F74] ">
                  {legacyText("VoucherForm_Voucher_redemption_73a64")}
                </div>

                <label
                  htmlFor="promo-code"
                  className={classNames(
                    "mt-4 block text-sm sm:text-[15px] ",
                    TEXT_DARK,
                  )}
                >
                  {legacyText("VoucherForm_Voucher_code_eae7b")}
                  <span className={classNames("ml-2 text-xs", TEXT_MUTED)}>
                    {legacyText("VoucherForm__e_g_D4T_32S_053_d4e4b")}{" "}
                  </span>
                </label>

                <div className="mt-4">
                  <input
                    id="promo-code"
                    name="promo-code"
                    type="text"
                    autoComplete="off"
                    placeholder="D4T-32S-053"
                    value={promoCode}
                    onChange={(e) =>
                      setPromoCode(formatPromoCode(e.target.value))
                    }
                    maxLength={11}
                    className={classNames(
                      inputBase,
                      submitted && !isValid ? inputInvalid : inputValid,
                    )}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onRedeemClicked(e);
                    }}
                  />
                </div>

                {submitted && !isValid && (
                  <p className="mt-3 text-xs text-red-600">
                    {legacyText(
                      "VoucherForm_Invalid_format_Use_for_example_D4T_32S_053_16c67",
                    )}
                  </p>
                )}

                {errorMsg && (
                  <p
                    className="mt-3 text-sm text-red-600"
                    aria-live="assertive"
                  >
                    {errorMsg}
                  </p>
                )}
              </div>

              <div className="xl:pb-[1px]">
                <button
                  type="button"
                  disabled={!isValid || !userId}
                  onClick={onRedeemClicked}
                  className={classNames(
                    primaryButton,
                    "w-full xl:w-auto xl:min-w-[250px]",
                  )}
                  title={
                    !userId
                      ? legacyText(
                          "VoucherForm_You_need_to_be_signed_in_to_redeem_a_voucher_7fb72",
                        )
                      : ""
                  }
                >
                  {legacyText("VoucherForm_Redeem_voucher_4b8cd")}
                </button>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="border-t border-[rgba(179,162,146,0.18)] px-5 sm:px-6 lg:px-7 py-5 sm:py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#8A7F74] ">
                  {legacyText("VoucherForm_History_90ccd")}
                </div>

                <h3
                  className={classNames(
                    "mt-3 text-[24px] sm:text-[28px] uppercase font-medium leading-[1.05]",
                    TEXT_DARK,
                  )}
                >
                  {historyTitle}
                </h3>

                {!userId && (
                  <p className={classNames("mt-2 text-sm", TEXT_MUTED)}>
                    {legacyText(
                      "VoucherForm_You_need_to_be_signed_in_to_view_redeemed_vouchers_70781",
                    )}
                  </p>
                )}

                {isRedeemedError && (
                  <p className="mt-2 text-sm text-red-600">
                    {getLocalizedApiErrorMessage(
                      redeemedError,
                      legacyText(
                        "VoucherForm_Redeemed_vouchers_could_not_be_loaded_1c156",
                      ),
                    )}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => refetchRedeemed()}
                className={classNames(secondaryButton, "w-full sm:w-auto")}
                disabled={!userId}
              >
                <ArrowPathIcon className="mr-2 h-4 w-4" />
                {legacyText("VoucherForm_Refresh_56e3b")}
              </button>
            </div>

            {userId && !isRedeemedError && (
              <>
                {/* Mobile list */}
                <div className="mt-5 space-y-3 sm:hidden">
                  {Array.isArray(redeemedCoupons) &&
                  redeemedCoupons.length > 0 ? (
                    redeemedCoupons.map((c) => {
                      const productName = getIssuedVoucherName(c, moneyLocale);
                      const redeemedAt = formatDateByLanguage(
                        c?.redeemedAt,
                        activeLocale,
                      );
                      const amount = formatVoucherCreditsReceived(
                        c,
                        moneyLocale,
                      );

                      return (
                        <div
                          key={c?._id || c?.promoCode}
                          className="rounded-[24px] border border-[rgba(179,162,146,0.34)] bg-white/58 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.025)]"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(179,162,146,0.55)] bg-white">
                              <CheckBadgeIcon className="h-5 w-5 text-[var(--unnamed-color-b3a292)]" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p
                                className={classNames(
                                  "text-[15px] leading-6 ",
                                  TEXT_DARK,
                                )}
                              >
                                {productName}
                              </p>

                              <div className="mt-3 space-y-1.5 text-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <span className={classNames("", TEXT_DARK)}>
                                    {legacyText("VoucherForm_Date_eb9a4")}
                                  </span>
                                  <span
                                    className={classNames(
                                      "text-right",
                                      TEXT_MUTED,
                                    )}
                                  >
                                    {redeemedAt}
                                  </span>
                                </div>

                                <div className="flex items-start justify-between gap-3">
                                  <span className={classNames("", TEXT_DARK)}>
                                    {t("walletConversion.received")}
                                  </span>
                                  <span
                                    className={classNames(
                                      "text-right",
                                      TEXT_DARK,
                                    )}
                                  >
                                    {amount}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[24px] border border-[rgba(179,162,146,0.34)] bg-white/58 p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,0.02)]">
                      <p className={classNames("text-sm ", TEXT_MUTED)}>
                        {legacyText(
                          "VoucherForm_You_do_not_have_any_redeemed_vouchers_yet_46648",
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Desktop table */}
                <div className="mt-5 hidden sm:block">
                  <div className="overflow-hidden rounded-[28px] border border-[rgba(179,162,146,0.34)] bg-white/58">
                    <div className="max-h-[50vh] overflow-y-auto overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="sticky top-0 z-10 border-b border-[rgba(179,162,146,0.22)] bg-[#F7F5F2]/84 supports-[backdrop-filter]:bg-[#F7F5F2]/70 backdrop-blur-sm">
                          <tr>
                            <th className="px-5 py-4 text-left text-[11px] uppercase tracking-[0.16em]  text-[#8A7F74]">
                              {legacyText("VoucherForm_Name_709a2")}
                            </th>
                            <th className="px-5 py-4 text-left text-[11px] uppercase tracking-[0.16em]  text-[#8A7F74]">
                              {legacyText("VoucherForm_Redeemed_on_d5f93")}
                            </th>
                            <th className="px-5 py-4 text-left text-[11px] uppercase tracking-[0.16em]  text-[#8A7F74]">
                              {t("walletConversion.received")}
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-[rgba(179,162,146,0.16)]">
                          {Array.isArray(redeemedCoupons) &&
                          redeemedCoupons.length > 0 ? (
                            redeemedCoupons.map((c) => {
                              const productName = getIssuedVoucherName(
                                c,
                                moneyLocale,
                              );
                              const redeemedAt = formatDateByLanguage(
                                c?.redeemedAt,
                                activeLocale,
                              );
                              const amount = formatVoucherCreditsReceived(
                                c,
                                moneyLocale,
                              );

                              return (
                                <tr
                                  key={c?._id || c?.promoCode}
                                  className="transition-colors hover:bg-black/[0.018]"
                                >
                                  <td
                                    className={classNames(
                                      "px-5 py-4 text-sm",
                                      TEXT_DARK,
                                    )}
                                  >
                                    {productName}
                                  </td>
                                  <td
                                    className={classNames(
                                      "px-5 py-4 text-sm",
                                      TEXT_MUTED,
                                    )}
                                  >
                                    {redeemedAt}
                                  </td>
                                  <td
                                    className={classNames(
                                      "px-5 py-4 text-sm ",
                                      TEXT_DARK,
                                    )}
                                  >
                                    {amount}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={3} className="px-5 py-8">
                                <div className="text-center">
                                  <p
                                    className={classNames(
                                      "text-sm ",
                                      TEXT_MUTED,
                                    )}
                                  >
                                    {legacyText(
                                      "VoucherForm_You_do_not_have_any_redeemed_vouchers_yet_46648",
                                    )}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
