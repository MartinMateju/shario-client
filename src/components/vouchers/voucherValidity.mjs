export const VOUCHER_MONTH_PRESETS = Object.freeze([3, 6, 8, 12]);

export function getVoucherValidityForm(settings) {
  const validity = settings?.validity || { mode: "months", months: 12 };
  return {
    voucherSettings: settings || { version: 1, type: "value" },
    voucherValidityChoice:
      validity.mode === "months"
        ? VOUCHER_MONTH_PRESETS.includes(validity.months)
          ? String(validity.months)
          : "custom"
        : validity.mode,
    voucherValidityMonths: String(validity.months ?? 12),
    voucherValidityDate: validity.date || "",
  };
}

export function buildVoucherSettings(form) {
  const choice = form.voucherValidityChoice;
  const validity =
    choice === "none"
      ? { mode: "none" }
      : choice === "date"
        ? { mode: "date", date: form.voucherValidityDate }
        : {
            mode: "months",
            months: Number(
              choice === "custom" ? form.voucherValidityMonths : choice,
            ),
          };

  return { ...form.voucherSettings, version: 1, validity };
}

export function isVoucherValidityValid(validity) {
  if (validity.mode === "none") return true;
  if (validity.mode === "months") {
    return (
      Number.isSafeInteger(validity.months) &&
      validity.months >= 1 &&
      validity.months <= 120
    );
  }
  if (validity.mode !== "date" || !/^\d{4}-\d{2}-\d{2}$/.test(validity.date)) {
    return false;
  }
  const parsed = new Date(`${validity.date}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === validity.date
  );
}
