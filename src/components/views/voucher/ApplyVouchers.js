"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import { useLegacyLocale } from "@/i18n/useLegacyCopy";
import { useLegacyText } from "@/i18n/useLegacyCopy";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  formatVoucherCreditsReceived,
  formatIssuedVoucherDate,
  getIssuedVoucherName,
  getIssuedVoucherStatus,
} from "@/components/vouchers/voucherRecord";
import {
  ArrowPathIcon,
  CheckBadgeIcon,
  GiftIcon,
} from "@heroicons/react/20/solid";
import { useSelector } from "react-redux";

import {
  CustomerPortalEmptyState,
  CustomerPortalLoadingState,
  CustomerPortalPage,
  CustomerPortalPageHeader,
  CustomerPortalSurface,
  customerPortalPrimaryActionClass,
  customerPortalSecondaryActionClass,
  formatCustomerPortalCurrencyAmount,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import { getPublicTenantPortalTheme } from "@/components/public-tenant/publicTenantPortalTheme";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import {
  selectCurrentTenant,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import {
  useGetUserRedeemedCouponsQuery,
  useRedeemPromoCodeMutation,
} from "@/lib/features/coupons/couponsApiSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";

import ConfirmationModal from "../../modals/ConformationModal";

const PROMO_CODE_REGEX = /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/;

const classNames = (...classes) => classes.filter(Boolean).join(" ");

export default function VoucherForm({ embedded = false }) {
  const activeLocale = useLegacyLocale();
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
  const Container = embedded ? "section" : CustomerPortalPage;
  const locale = useLocale();
  const t = useTranslations("VoucherFoundation");
  const language = useSelector(selectCurrentLanguage) || "CZ";
  const { id: userId } = useSelector(selectCurrentUser) || {};
  const tenant = useSelector(selectCurrentTenant);
  const appearanceTenant = useOptionalPublicTenant()?.tenant || tenant;
  const formatVoucherDate = (iso) =>
    formatIssuedVoucherDate(iso, locale, tenant?.settings?.timezone || "UTC");
  const tenantTheme = useMemo(
    () => getPublicTenantPortalTheme(appearanceTenant, "light"),
    [appearanceTenant],
  );
  const tenantCurrency =
    tenant?.settings?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY;
  const moneyLocale = activeLocale;
  const defaultConfirmText = translation["VOUCHER_REDEEM_CONTENT"]?.[language];

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
  const [confirmText, setConfirmText] = useState("");

  const vouchers = useMemo(
    () => (Array.isArray(redeemedCoupons) ? redeemedCoupons : []),
    [redeemedCoupons],
  );
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

  const formatPromoCode = (value) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const parts = cleaned.match(/.{1,3}/g) || [];
    return parts.slice(0, 3).join("-");
  };

  const formatAmount = (coupon) =>
    formatVoucherCreditsReceived(coupon, moneyLocale);

  const onRedeemClicked = async (event) => {
    event?.preventDefault?.();
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
      const response = await redeemPromoCode({
        promoCode: normalizedCode,
      }).unwrap();

      if (
        typeof response?.creditsAdded === "number" &&
        typeof response?.newBalance === "number"
      ) {
        const currency = response.currency || tenantCurrency;
        const added = formatCustomerPortalCurrencyAmount(
          response.creditsAdded,
          currency,
          moneyLocale,
        );
        const balance = formatCustomerPortalCurrencyAmount(
          response.newBalance,
          currency,
          moneyLocale,
        );
        setConfirmText(
          legacyText(
            "VoucherForm_Voucher_redeemed_successfully_Added_value1_New_balance_1a0e9",
            { value1: added, value2: balance },
          ),
        );
      } else {
        setConfirmText(defaultConfirmText);
      }

      setShowModalConfirm(true);
      setPromoCode("");
      setSubmitted(false);
      refetchRedeemed();
    } catch (error) {
      setErrorMsg(
        getLocalizedApiErrorMessage(
          error,
          legacyText(
            "VoucherForm_The_voucher_could_not_be_redeemed_Please_try_again_1d1d3",
          ),
        ),
      );
    }
  };

  const signedOutMessage = legacyText(
    "VoucherForm_You_need_to_be_signed_in_to_manage_your_vouchers_b0465",
  );

  return (
    <>
      <ConfirmationModal
        open={showModalConfirm}
        setOpen={setShowModalConfirm}
        customerMode
        tenantStylePresetId={tenantTheme?.stylePresetId}
        tenantThemeStyle={tenantTheme?.style}
        text={confirmText || defaultConfirmText}
        title={translation["VOUCHER_REDEEM_TITLE"]?.[language]}
      />

      <Container>
        {!embedded && (
          <CustomerPortalPageHeader
            eyebrow={legacyText("VoucherForm_Studio_benefits_735a6")}
            title={legacyText("VoucherForm_Gift_vouchers_e8ee2")}
            description={legacyText(
              "VoucherForm_Redeem_a_gift_voucher_and_use_its_value_as_credit_towar_25234",
            )}
          />
        )}

        <div className="mt-7 grid items-start gap-5 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
          <CustomerPortalSurface className="p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[17px] bg-[color-mix(in_srgb,var(--tenant-secondary)_13%,transparent)] text-[var(--tenant-text-on-surface)]">
                <GiftIcon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--tenant-accent-on-surface)]">
                  {legacyText("VoucherForm_Redeem_a_voucher_69a95")}
                </p>
                <h2 className="mt-2 font-serif text-[28px] leading-tight tracking-[-0.035em] text-[var(--tenant-text-on-surface)] sm:text-[32px]">
                  {legacyText("VoucherForm_Add_studio_credit_080dc")}
                </h2>
                <p className="mt-2 max-w-xl text-[13px] leading-6 text-[var(--tenant-muted-on-surface)]">
                  {t("walletConversion.help")}
                </p>
              </div>
            </div>

            <form onSubmit={onRedeemClicked} className="mt-7">
              <label
                htmlFor="promo-code"
                className="block text-[12px] font-semibold text-[var(--tenant-text-on-surface)]"
              >
                {legacyText("VoucherForm_Voucher_code_eae7b")}
                <span className="ml-2 font-normal text-[var(--tenant-muted-on-surface)]">
                  {legacyText("VoucherForm__for_example_D4T_32S_053_b5110")}
                </span>
              </label>
              <input
                id="promo-code"
                name="promo-code"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck="false"
                placeholder="D4T-32S-053"
                value={promoCode}
                onChange={(event) =>
                  setPromoCode(formatPromoCode(event.target.value))
                }
                maxLength={11}
                aria-invalid={submitted && !isValid}
                aria-describedby={
                  submitted && !isValid ? "promo-code-error" : undefined
                }
                className={classNames(
                  "mt-2 h-12 w-full rounded-full border bg-[var(--tenant-surface)] px-5 font-mono text-[15px] tracking-[0.12em] text-[var(--tenant-text-on-surface)] outline-none transition-[border-color,box-shadow] placeholder:font-sans placeholder:tracking-normal placeholder:text-[var(--tenant-muted-on-surface)] focus:ring-2 focus:ring-[var(--tenant-accent-link)]/20",
                  submitted && !isValid
                    ? "border-red-500 focus:border-red-600"
                    : "border-[color-mix(in_srgb,var(--tenant-text)_16%,transparent)] focus:border-[var(--tenant-accent-link)]",
                )}
              />

              {submitted && !isValid ? (
                <p
                  id="promo-code-error"
                  className="mt-2 text-[12px] text-red-600"
                >
                  {legacyText("VoucherForm_Use_the_format_D4T_32S_053_fab4a")}
                </p>
              ) : null}
              {errorMsg ? (
                <p className="mt-2 text-[12px] text-red-600" role="alert">
                  {errorMsg}
                </p>
              ) : null}
              {!userId ? (
                <p className="mt-2 text-[12px] text-[var(--tenant-muted-on-surface)]">
                  {signedOutMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!isValid || !userId || isRedeeming}
                className={classNames(
                  customerPortalPrimaryActionClass,
                  "mt-5 w-full sm:w-auto",
                )}
              >
                {isRedeeming ? (
                  <ArrowPathIcon
                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <GiftIcon className="h-4 w-4" aria-hidden="true" />
                )}
                {isRedeeming
                  ? legacyText("VoucherForm_Redeeming_12d34")
                  : legacyText("VoucherForm_Redeem_voucher_4b8cd")}
              </button>
            </form>
          </CustomerPortalSurface>

          <CustomerPortalSurface>
            <div className="flex flex-col gap-4 border-b border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="font-serif text-[27px] leading-tight tracking-[-0.035em] text-[var(--tenant-text-on-surface)] sm:text-[30px]">
                    {legacyText("VoucherForm_Your_vouchers_bbc3d")}
                  </h2>
                  <span className="rounded-full border border-[color-mix(in_srgb,var(--tenant-text)_12%,transparent)] px-2.5 py-1 text-[10px] font-semibold text-[var(--tenant-muted-on-surface)]">
                    {vouchers.length}
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-5 text-[var(--tenant-muted-on-surface)]">
                  {legacyText(
                    "VoucherForm_A_history_of_vouchers_added_to_your_account_2773c",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => refetchRedeemed()}
                className={classNames(
                  customerPortalSecondaryActionClass,
                  "w-full sm:w-auto",
                )}
                disabled={!userId || isLoadingRedeemed}
              >
                <ArrowPathIcon
                  className={classNames(
                    "h-4 w-4",
                    isLoadingRedeemed &&
                      "animate-spin motion-reduce:animate-none",
                  )}
                  aria-hidden="true"
                />
                {legacyText("VoucherForm_Refresh_56e3b")}
              </button>
            </div>

            <div className="p-3 sm:p-4">
              {isLoadingRedeemed ? (
                <CustomerPortalLoadingState
                  label={legacyText("VoucherForm_Loading_vouchers_eec52")}
                />
              ) : isRedeemedError ? (
                <CustomerPortalEmptyState
                  icon={GiftIcon}
                  title={legacyText(
                    "VoucherForm_Vouchers_could_not_be_loaded_3d2e9",
                  )}
                  description={getLocalizedApiErrorMessage(
                    redeemedError,
                    legacyText(
                      "VoucherForm_Check_your_connection_and_try_again_56386",
                    ),
                  )}
                  action={
                    <button
                      type="button"
                      onClick={() => refetchRedeemed()}
                      className={customerPortalSecondaryActionClass}
                    >
                      <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                      {legacyText("VoucherForm_Try_again_042c8")}
                    </button>
                  }
                />
              ) : !userId || vouchers.length === 0 ? (
                <CustomerPortalEmptyState
                  icon={GiftIcon}
                  title={
                    !userId
                      ? legacyText(
                          "VoucherForm_Sign_in_to_see_your_vouchers_e24c2",
                        )
                      : legacyText("VoucherForm_No_redeemed_vouchers_yet_18387")
                  }
                  description={
                    !userId
                      ? signedOutMessage
                      : legacyText(
                          "VoucherForm_Your_first_redeemed_code_will_appear_here_with_its_valu_e69ea",
                        )
                  }
                />
              ) : (
                <>
                  <div className="space-y-3 sm:hidden">
                    {vouchers.map((coupon) => (
                      <article
                        key={coupon?._id || coupon?.promoCode}
                        className="rounded-[20px] border border-[color-mix(in_srgb,var(--tenant-text)_11%,transparent)] bg-[var(--tenant-background)] p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[var(--tenant-surface)] text-[var(--tenant-accent-on-surface)] shadow-sm">
                            <CheckBadgeIcon
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[var(--tenant-text)]">
                              {getIssuedVoucherName(coupon, locale)}
                            </p>
                            <p className="mt-1 text-xs text-[var(--tenant-muted-text)]">
                              {t(`status.${getIssuedVoucherStatus(coupon)}`)}
                            </p>
                            <dl className="mt-3 grid gap-2 text-[12px]">
                              <div className="flex justify-between gap-4">
                                <dt className="text-[var(--tenant-muted-text)]">
                                  {legacyText("VoucherForm_Redeemed_35cc3")}
                                </dt>
                                <dd className="text-right text-[var(--tenant-text)]">
                                  {formatVoucherDate(coupon?.redeemedAt)}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-4">
                                <dt className="text-[var(--tenant-muted-text)]">
                                  {t("expiryLabel")}
                                </dt>
                                <dd className="text-right text-[var(--tenant-text)]">
                                  {coupon.expiresAt
                                    ? formatVoucherDate(coupon.expiresAt)
                                    : t("noExpiry")}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-4">
                                <dt className="text-[var(--tenant-muted-text)]">
                                  {t("walletConversion.received")}
                                </dt>
                                <dd className="text-right font-semibold text-[var(--tenant-text)]">
                                  {formatAmount(coupon)}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto sm:block">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-left">
                          <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--tenant-muted-on-surface)]">
                            {legacyText("VoucherForm_Voucher_409ca")}
                          </th>
                          <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--tenant-muted-on-surface)]">
                            {legacyText("VoucherForm_Redeemed_35cc3")}
                          </th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--tenant-muted-on-surface)]">
                            {t("walletConversion.received")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color-mix(in_srgb,var(--tenant-text)_9%,transparent)]">
                        {vouchers.map((coupon) => (
                          <tr
                            key={coupon?._id || coupon?.promoCode}
                            className="transition-colors hover:bg-[color-mix(in_srgb,var(--tenant-text-on-surface)_5%,var(--tenant-surface))]"
                          >
                            <td className="px-4 py-4 text-[13px] font-semibold text-[var(--tenant-text-on-surface)]">
                              {getIssuedVoucherName(coupon, locale)}
                              <p className="mt-1 text-xs font-normal text-[var(--tenant-muted-on-surface)]">
                                {t(`status.${getIssuedVoucherStatus(coupon)}`)}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-[13px] text-[var(--tenant-muted-on-surface)]">
                              {formatVoucherDate(coupon?.redeemedAt)}
                              <p className="mt-1 text-xs">
                                {t("expiryLabel")}:{" "}
                                {coupon.expiresAt
                                  ? formatVoucherDate(coupon.expiresAt)
                                  : t("noExpiry")}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-right text-[13px] font-semibold text-[var(--tenant-text-on-surface)]">
                              {formatAmount(coupon)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </CustomerPortalSurface>
        </div>
      </Container>
    </>
  );
}
