import {
  BanknotesIcon,
  CreditCardIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";

const copy = {
  EN: {
    title: "Payment method",
    card: "Payment card",
    money_credits: "Studio credits",
    membership_credits: "Membership benefit",
    includedHours: "Included studio hours",
    available: "available",
    required: "used for this booking",
    addCredits: "Add credits",
    insufficientCredits: "Not enough studio credits to cover this order.",
    unavailable: "This payment method cannot cover this order.",
    reasons: {
      customer_booking_extension_card_window:
        "Card payment is unavailable this close to the booking end. Use studio credits to extend your visit.",
      membership_insufficient_hours:
        "Not enough included hours for this booking.",
      membership_member_only:
        "Included hours cover the member only. Book your visit separately from guests.",
      membership_outside_paid_period:
        "The visit must be within your paid membership period.",
      membership_product_ineligible:
        "This benefit does not cover the selected activity.",
      membership_location_ineligible:
        "This benefit is unavailable at the selected studio.",
      membership_location_not_allowed:
        "This benefit is unavailable at the selected studio.",
      membership_open_studio_only:
        "Included hours cover shared studio visits only.",
      membership_personal_booking_required:
        "Use included hours for one personal studio booking at a time.",
      membership_entitlement_currency_mismatch:
        "This benefit uses a different currency from your order.",
      private_booking_surcharge_requires_money:
        "A private booking requires payment by card or studio credits.",
    },
  },
  CZ: {
    title: "Způsob platby",
    card: "Platební karta",
    money_credits: "Kredity studia",
    membership_credits: "Výhoda členství",
    includedHours: "Hodiny zahrnuté v členství",
    available: "k dispozici",
    required: "čerpání za tuto rezervaci",
    addCredits: "Přidat kredity",
    insufficientCredits: "Na tuto objednávku nemáte dostatek kreditů studia.",
    unavailable: "Tímto způsobem nelze uhradit celou objednávku.",
    reasons: {
      customer_booking_extension_card_window:
        "Takto blízko konce rezervace už nelze platit kartou. Návštěvu prodlužte pomocí kreditů studia.",
      membership_insufficient_hours:
        "Na tuto rezervaci nemáte dostatek zahrnutých hodin.",
      membership_member_only:
        "Zahrnuté hodiny platí pouze pro člena. Svou návštěvu rezervujte odděleně od hostů.",
      membership_outside_paid_period:
        "Návštěva musí proběhnout v zaplaceném období členství.",
      membership_product_ineligible:
        "Tato výhoda neplatí pro vybranou aktivitu.",
      membership_location_ineligible: "Tato výhoda neplatí ve vybraném studiu.",
      membership_location_not_allowed:
        "Tato výhoda neplatí ve vybraném studiu.",
      membership_open_studio_only:
        "Zahrnuté hodiny platí pouze pro sdílené rezervace ateliéru.",
      membership_personal_booking_required:
        "Zahrnuté hodiny čerpejte na jednu vlastní rezervaci ateliéru najednou.",
      membership_entitlement_currency_mismatch:
        "Tato výhoda používá jinou měnu než vaše objednávka.",
      private_booking_surcharge_requires_money:
        "Soukromou rezervaci uhraďte kartou nebo kredity studia.",
    },
  },
};

export default function CartCheckoutPaymentOptions({
  options,
  selectedOptionId,
  onChange,
  onPurchaseCredits,
  language = "EN",
  disabled = false,
}) {
  const text = copy[language === "CZ" ? "CZ" : "EN"];
  const formatHours = (value, unit) => {
    const hours = Number(value) / (unit === "minute" ? 60 : 1);
    return `${new Intl.NumberFormat(language === "CZ" ? "cs-CZ" : "en-GB", {
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
