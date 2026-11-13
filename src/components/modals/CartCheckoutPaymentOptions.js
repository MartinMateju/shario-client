import { useLegacyLocale } from "@/i18n/useLegacyCopy";
import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import {
  BanknotesIcon,
  CreditCardIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";

export default function CartCheckoutPaymentOptions({
  options,
  selectedOptionId,
  onChange,
  onPurchaseCredits,
  language = "EN",
  disabled = false,
}) {
  const activeLocale = useLegacyLocale();
  const text = useLegacyCopy("cartPayment");
  const formatHours = (value, unit) => {
    const hours = Number(value) / (unit === "minute" ? 60 : 1);
    return `${new Intl.NumberFormat(activeLocale, {
      maximumFractionDigits: 2,
    }).format(hours)} h`;
  };
  return (
    <fieldset
      disabled={disabled}
      className="space-y-2"
      data-cart-payment-options
    >
      <legend className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--tenant-muted-on-surface)]">
        {text.title}
      </legend>
      {options.map((option) => {
        const isHours =
          option.method === "membership_credits" &&
          ["minute", "hour"].includes(option.unit);
        const Icon =
          option.method === "membership_credits"
            ? IdentificationIcon
            : option.method === "money_credits"
              ? BanknotesIcon
              : CreditCardIcon;
        const selected = option.optionId === selectedOptionId;
        return (
          <label
            key={option.optionId}
            className={`flex items-start gap-2.5 rounded-[15px] border p-3 text-[11px] ${selected ? "border-[var(--tenant-accent-on-surface)] bg-[color-mix(in_srgb,var(--tenant-accent)_8%,var(--tenant-surface))]" : "border-[var(--tenant-border)]"} ${option.selectable ? "cursor-pointer" : "opacity-65"}`}
          >
            <input
              type="radio"
              name="cart-payment-option"
              value={option.optionId}
              checked={selected}
              disabled={!option.selectable}
              onChange={() => onChange(option.optionId)}
              className="mt-1 accent-[var(--tenant-accent)]"
            />
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="block font-semibold">
                {isHours
                  ? text.includedHours
                  : option.label || text[option.method]}
              </span>
              {isHours &&
              Number.isFinite(
                Number(option.availableUnits ?? option.available),
              ) &&
              Number.isFinite(Number(option.required)) ? (
                <span className="mt-1 block text-[10px] leading-4 text-[var(--tenant-muted-on-surface)]">
                  {formatHours(
                    option.availableUnits ?? option.available,
                    option.unit,
                  )}{" "}
                  {text.available} · {formatHours(option.required, option.unit)}{" "}
                  {text.required}
                </span>
              ) : null}
              {!option.selectable ? (
                <span className="mt-1 block text-[10px] leading-4">
                  {text.reasons[option.unavailableReason] ||
                    (option.method === "money_credits"
                      ? text.insufficientCredits
                      : text.unavailable)}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
      {onPurchaseCredits &&
      options.some(
        (option) => option.method === "money_credits" && !option.selectable,
      ) ? (
        <button
          type="button"
          onClick={onPurchaseCredits}
          className="min-h-10 w-full rounded-full border border-[var(--tenant-border)] px-3 text-[11px] font-semibold text-[var(--tenant-accent-on-surface)]"
        >
          {text.addCredits}
        </button>
      ) : null}
    </fieldset>
  );
}
