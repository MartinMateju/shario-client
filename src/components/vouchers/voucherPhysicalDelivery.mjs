import {
  getStripeMinorUnitDigits,
  isValidMajorCurrencyPrecision,
  minorUnitsToMajor,
} from "@/utils/money";

export const MAX_VOUCHER_POSTAGE_MINOR = 100_000_000;

export const getVoucherPhysicalDeliveryForm = (settings, currency) => ({
  voucherPhysicalDeliveryEnabled: settings?.physicalDelivery?.enabled === true,
  voucherPostageFee: String(
    minorUnitsToMajor(
      settings?.physicalDelivery?.postageFeeMinor ?? 0,
      currency,
    ) ?? 0,
  ),
});

export const isVoucherPostageValid = (form) => {
  if (!form.voucherPhysicalDeliveryEnabled) return true;
  const input = String(form.voucherPostageFee ?? "").trim();
  const amount = Number(input);
  const minor = Math.round(
    amount * 10 ** getStripeMinorUnitDigits(form.currency),
  );
  return (
    input !== "" &&
    Number.isFinite(amount) &&
    amount >= 0 &&
    isValidMajorCurrencyPrecision(amount, form.currency) &&
    Number.isSafeInteger(minor) &&
    minor <= MAX_VOUCHER_POSTAGE_MINOR
  );
};

export const buildVoucherPhysicalDelivery = (form) => ({
  enabled: form.voucherPhysicalDeliveryEnabled === true,
  postageFeeMinor: form.voucherPhysicalDeliveryEnabled
    ? Math.round(
        Number(form.voucherPostageFee) *
          10 ** getStripeMinorUnitDigits(form.currency),
      )
    : 0,
});
