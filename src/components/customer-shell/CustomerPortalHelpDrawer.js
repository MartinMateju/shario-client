"use client";

import { useLegacyCopy } from "@/i18n/useLegacyCopy";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  GiftIcon,
  PencilSquareIcon,
  QuestionMarkCircleIcon,
  RocketLaunchIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useSelector } from "react-redux";
import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import {
  isCustomerPortalHrefEnabled,
  isCustomerPortalPageEnabled,
} from "./customerPortalVisibility";

import { SKAB_BRAND_COLORS } from "@/config/brandPalette";
import { Link } from "@/i18n/navigation";
import { retainCustomerPortalLocation } from "@/utils/customerPortalLocation";
import { customerPortalProfileThemeStyle } from "./CustomerPortalPrimitives";
import { CUSTOMER_PORTAL_HELP_TRIGGER_LABELS } from "./CustomerPortalHelpTrigger";

import { CUSTOMER_PORTAL_CONCIERGE_OPEN_EVENT } from "./customerPortalOverlayEvents";

const HELP_COPY = Object.freeze({
  en: Object.freeze({
    trigger: CUSTOMER_PORTAL_HELP_TRIGGER_LABELS.en,
    eyebrow: "Booking help",
    title: "Help and guides",
    description: "Bookings, vouchers, and studio credit.",
    introDescription:
      "Choose a topic for clear steps and a direct link to the right place.",
    close: "Close help",
    tour: Object.freeze({
      eyebrow: "Portal essentials",
      title: "Product tour",
      summary:
        "Learn the booking calendar and your account in about 60 seconds.",
      action: "Replay tour",
    }),
    note: "Availability and cancellation rules are set by the studio. If an action is unavailable, contact the studio directly.",
    topics: Object.freeze({
      createBooking: Object.freeze({
        title: "How to create a booking",
        summary: "Choose a studio time and complete your order.",
        action: "Create a booking",
        steps: Object.freeze([
          "Open Book a session and choose the studio location you want to visit.",
          "Select a product, an available day and time, then add the booking to your cart.",
          "Review the details, choose a payment method, and confirm your order.",
        ]),
      }),
      redeemVoucher: Object.freeze({
        title: "How to redeem a gift voucher",
        summary: "Turn the voucher value into studio credit.",
        action: "Redeem a voucher",
        steps: Object.freeze([
          "Open Gift vouchers in your portal.",
          "Enter the code in the format D4T-32S-053 and select Redeem voucher.",
          "The voucher value is added to your studio-credit balance for a future booking.",
        ]),
      }),
      cancelBooking: Object.freeze({
        title: "How to cancel a booking",
        summary: "Cancel an eligible booking before the access code is issued.",
        action: "Open my bookings",
        steps: Object.freeze([
          "Open My bookings and choose an upcoming booking.",
          "Select Edit, then Cancel booking, and confirm the cancellation.",
          "Paid amounts return as studio credit; membership credits are restored. Contact the studio about course registrations.",
        ]),
      }),
      editBooking: Object.freeze({
        title: "How to edit a booking",
        summary: "Move an eligible Open Studio booking to another time.",
        action: "Open my bookings",
        steps: Object.freeze([
          "Open My bookings and select Edit on the upcoming booking.",
          "Choose a new date and an available start time.",
          "Confirm the new time. The product, location, duration, and participant count stay unchanged.",
        ]),
      }),
      useCredits: Object.freeze({
        title: "How to use studio credits",
        summary: "Use your available balance to pay for a booking.",
        action: "Start a booking",
        steps: Object.freeze([
          "Add your booking to the cart and open the order summary.",
          "Under Payment method, choose Studio credits.",
          "Credits can be selected when your balance covers the full order. Otherwise, add credits or pay by card.",
        ]),
      }),
    }),
  }),
  cs: Object.freeze({
    trigger: CUSTOMER_PORTAL_HELP_TRIGGER_LABELS.cs,
    eyebrow: "Nápověda k rezervacím",
    title: "Nápověda a návody",
    description: "Rezervace, poukazy a kredit studia.",
    introDescription:
      "Vyberte téma a zobrazí se jasný postup i přímý odkaz na správné místo.",
    close: "Zavřít nápovědu",
    tour: Object.freeze({
      eyebrow: "Základy portálu",
      title: "Prohlídka portálu",
      summary:
        "Poznejte kalendář rezervací a svůj účet přibližně za 60 sekund.",
      action: "Přehrát prohlídku znovu",
    }),
    note: "Dostupnost a pravidla zrušení určuje studio. Pokud daná akce není k dispozici, obraťte se přímo na studio.",
    topics: Object.freeze({
      createBooking: Object.freeze({
        title: "Jak vytvořit rezervaci",
        summary: "Vyberte termín ve studiu a dokončete objednávku.",
        action: "Vytvořit rezervaci",
        steps: Object.freeze([
          "Otevřete Rezervovat návštěvu a zvolte provozovnu, kterou chcete navštívit.",
          "Vyberte produkt, volný den a čas a přidejte rezervaci do košíku.",
          "Zkontrolujte údaje, zvolte způsob platby a potvrďte objednávku.",
        ]),
      }),
      redeemVoucher: Object.freeze({
        title: "Jak uplatnit dárkový poukaz",
        summary: "Hodnota poukazu se připíše jako kredit studia.",
        action: "Uplatnit poukaz",
        steps: Object.freeze([
          "V portálu otevřete Dárkové poukazy.",
          "Zadejte kód ve formátu D4T-32S-053 a zvolte Uplatnit poukaz.",
          "Hodnota poukazu se připíše ke kreditům, které můžete použít při další rezervaci.",
        ]),
      }),
      cancelBooking: Object.freeze({
        title: "Jak zrušit rezervaci",
        summary: "Zrušte způsobilou rezervaci před odesláním vstupního kódu.",
        action: "Otevřít moje rezervace",
        steps: Object.freeze([
          "Otevřete Moje rezervace a vyberte nadcházející rezervaci.",
          "Zvolte Upravit, poté Zrušit rezervaci a zrušení potvrďte.",
          "Uhrazená částka se vrátí jako kredit studia; členský kredit se obnoví. U kurzů kontaktujte studio.",
        ]),
      }),
      editBooking: Object.freeze({
        title: "Jak upravit rezervaci",
        summary: "Přesuňte způsobilou rezervaci Open Studia na jiný termín.",
        action: "Otevřít moje rezervace",
        steps: Object.freeze([
          "Otevřete Moje rezervace a u nadcházející rezervace zvolte Upravit.",
          "Vyberte nové datum a dostupný čas začátku.",
          "Potvrďte nový termín. Produkt, provozovna, délka i počet osob zůstanou stejné.",
        ]),
      }),
      useCredits: Object.freeze({
        title: "Jak použít kredity studia",
        summary: "Zaplaťte rezervaci ze svého dostupného zůstatku.",
        action: "Začít rezervaci",
        steps: Object.freeze([
          "Přidejte rezervaci do košíku a otevřete souhrn objednávky.",
          "V části Způsob platby zvolte Kredity studia.",
          "Kredity lze vybrat, pokud pokryjí celou objednávku. Jinak kredity doplňte nebo zaplaťte kartou.",
        ]),
      }),
    }),
  }),
});

const TOPIC_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "createBooking",
    href: "/portal?tab=studio-calendar",
    icon: CalendarDaysIcon,
  }),
  Object.freeze({
    id: "redeemVoucher",
    href: "/portal/vouchers",
    icon: GiftIcon,
  }),
  Object.freeze({
    id: "cancelBooking",
    href: "/portal/bookings",
    icon: ArrowPathIcon,
  }),
  Object.freeze({
    id: "editBooking",
    href: "/portal/bookings",
    icon: PencilSquareIcon,
  }),
  Object.freeze({
    id: "useCredits",
    href: "/portal?tab=studio-calendar",
    icon: BanknotesIcon,
  }),
]);

const normalizeLocale = (locale) => (locale === "cs" ? "cs" : "en");

export const getCustomerPortalHelpCopy = (locale) =>
  HELP_COPY[normalizeLocale(locale)];

export const getCustomerPortalHelpTopics = ({
  locale,
  locationReference = "",
  tenant,
  localizedCopy,
} = {}) => {
  const copy = localizedCopy || getCustomerPortalHelpCopy(locale);

  return TOPIC_DEFINITIONS.filter(
    (definition) =>
      isCustomerPortalHrefEnabled(tenant, definition.href) &&
      (definition.id !== "useCredits" ||
        isCustomerPortalPageEnabled(tenant, "credits")),
  ).map((definition) => ({
    ...definition,
    ...copy.topics[definition.id],
    href: retainCustomerPortalLocation(definition.href, locationReference),
  }));
};

export { CustomerPortalHelpTrigger } from "./CustomerPortalHelpTrigger";

function HelpTopic({ onClose, onToggle, open, panelId, topic }) {
  const Icon = topic.icon;
  const buttonId = `${panelId}-trigger`;

  return (
    <article
      data-customer-portal-help-topic={topic.id}
      data-customer-portal-help-topic-open={open || undefined}
    >
      <div
        data-tenant-surface="card"
        className="overflow-hidden border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] transition-[border-color,box-shadow] duration-200 hover:border-[color-mix(in_srgb,var(--tenant-accent-on-surface)_35%,var(--tenant-border))]"
      >
        <button
          id={buttonId}
          type="button"
          aria-controls={panelId}
          aria-expanded={open}
          onClick={() => onToggle(topic.id)}
          data-customer-portal-help-toggle={topic.id}
          data-tenant-hover="preserve"
          className="group flex min-h-[66px] w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--tenant-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--tenant-accent-on-surface)]/30"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--tenant-radius-control)] border border-[var(--tenant-border)] bg-[var(--tenant-background)] text-[var(--tenant-accent-on-surface)] transition-colors duration-200">
            <Icon
              className="h-[18px] w-[18px] stroke-[1.65]"
              aria-hidden="true"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span
              data-tenant-interactive-label
              className="block text-[13px] font-semibold leading-[19px] tracking-[-0.01em] text-[var(--tenant-text-on-surface)]"
            >
              {topic.title}
            </span>
            <span className="mt-px block text-[11px] leading-4 text-[var(--tenant-muted-on-surface)]">
              {topic.summary}
            </span>
          </span>
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 text-[var(--tenant-muted-on-surface)] transition-[color,transform] duration-200 group-hover:text-[var(--tenant-accent-on-surface)] group-focus-visible:text-[var(--tenant-accent-on-surface)] motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          hidden={!open}
          data-customer-portal-help-article={topic.id}
          className="border-t border-[var(--tenant-border)] px-3.5 pb-3.5 pt-3"
        >
          <ol className="space-y-2.5">
            {topic.steps.map((step, index) => (
              <li
                key={step}
                className="flex gap-2.5 text-[11px] leading-[18px] text-[var(--tenant-muted-on-surface)]"
              >
                <span
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-background)] text-[9px] font-semibold text-[var(--tenant-text)]"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <Link
            href={topic.href}
            onClick={onClose}
            data-customer-portal-help-action={topic.id}
            data-tenant-button="primary"
            data-tenant-hover="preserve"
            className="group mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-[11px] font-semibold shadow-[0_8px_20px_color-mix(in_srgb,var(--tenant-portal-button)_18%,transparent)] transition-[transform,filter,box-shadow] duration-200 hover:-translate-y-0.5 hover:brightness-[0.97] hover:shadow-[0_12px_26px_color-mix(in_srgb,var(--tenant-portal-button)_22%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-portal-button)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-surface)] motion-reduce:transform-none motion-reduce:transition-none"
            style={{
              backgroundColor: "var(--tenant-portal-button)",
              color: "var(--tenant-portal-button-foreground)",
            }}
          >
            {topic.action}
            <ArrowRightIcon
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function CustomerPortalHelpDrawer({
  dialogId,
  locationReference = "",
  onClose,
  onStartTour,
  open,
  primaryColor = SKAB_BRAND_COLORS.primary,
  primaryForeground = "#FFFFFF",
  stylePresetId = "",
  themeStyle = {},
}) {
  const locale = useLocale();
  const currentTenant = useSelector(selectCurrentTenant);
  const tenant = useOptionalPublicTenant()?.tenant || currentTenant;
  const copy = useLegacyCopy("portalHelp");
  const [activeTopicId, setActiveTopicId] = useState(null);
  const topics = useMemo(
    () =>
      getCustomerPortalHelpTopics({
        locale,
        locationReference,
        tenant,
        localizedCopy: copy,
      }),
    [locale, locationReference, tenant, copy],
  );

  const closeDrawer = () => {
    setActiveTopicId(null);
    onClose?.();
  };

  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;

    const closeForConcierge = () => {
      setActiveTopicId(null);
      onClose?.();
    };
    window.addEventListener(
      CUSTOMER_PORTAL_CONCIERGE_OPEN_EVENT,
      closeForConcierge,
    );

    return () =>
      window.removeEventListener(
        CUSTOMER_PORTAL_CONCIERGE_OPEN_EVENT,
        closeForConcierge,
      );
  }, [onClose, open]);

  const toggleTopic = (topicId) => {
    setActiveTopicId((current) => (current === topicId ? null : topicId));
  };

  return (
    <Dialog
      open={open}
      onClose={closeDrawer}
      className="relative z-[110]"
      data-tenant-style={stylePresetId || undefined}
      style={{
        ...themeStyle,
        ...customerPortalProfileThemeStyle,
        "--tenant-interactive-hover": "var(--tenant-accent-on-surface)",
        "--tenant-interactive-hover-on-surface":
          "var(--tenant-accent-on-surface)",
        "--tenant-portal-button": primaryColor,
        "--tenant-portal-button-foreground": primaryForeground,
      }}
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-[#171715]/28 backdrop-blur-[2px] transition duration-300 data-closed:opacity-0 motion-reduce:transition-none"
      />
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 flex justify-end">
          <DialogPanel
            id={dialogId}
            transition
            data-customer-portal-help-drawer
            data-customer-portal-help-panel
            data-customer-portal-help-content="system"
            data-dialog-layout="drawer"
            data-tenant-surface="panel"
            className="flex h-full w-full max-w-[470px] transform flex-col border-l border-[var(--tenant-border)] bg-[var(--tenant-background)] text-[var(--tenant-text)] transition duration-300 ease-out data-closed:translate-x-full motion-reduce:transform-none motion-reduce:transition-none sm:rounded-l-[var(--tenant-radius-panel)]"
            style={{
              boxShadow: "var(--tenant-shadow-floating)",
              fontFamily: "var(--tenant-font-body)",
            }}
          >
            <header className="flex min-h-[72px] items-center gap-3 border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-4 pt-[env(safe-area-inset-top)] text-[var(--tenant-text-on-surface)] sm:px-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-background)] text-[var(--tenant-accent-on-surface)]">
                <QuestionMarkCircleIcon
                  className="h-[18px] w-[18px]"
                  aria-hidden="true"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-label-color)]"
                  data-tenant-type="eyebrow"
                >
                  {copy.eyebrow}
                </p>
                <DialogTitle
                  className="mt-px text-[13px] font-semibold tracking-[-0.015em] text-[var(--tenant-heading-color)]"
                  data-tenant-type="display"
                >
                  {copy.title}
                </DialogTitle>
                <p className="mt-px text-[10px] leading-4 text-[var(--tenant-muted-on-surface)]">
                  {copy.description}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label={copy.close}
                data-tenant-hover="preserve"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--tenant-muted-on-surface)] transition hover:bg-[var(--tenant-background)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 [scrollbar-color:rgba(100,95,87,0.12)_transparent] [scrollbar-width:thin] hover:[scrollbar-color:rgba(100,95,87,0.24)_transparent] sm:px-5">
              <p
                data-customer-portal-help-intro
                className="px-1 text-[11px] leading-[18px] text-[var(--tenant-muted-text)]"
              >
                {copy.introDescription}
              </p>

              {isCustomerPortalPageEnabled(tenant, "calendar") && (
                <button
                  type="button"
                  data-customer-portal-tour-replay
                  data-tenant-surface="card"
                  data-tenant-hover="preserve"
                  onClick={() => {
                    setActiveTopicId(null);
                    onClose?.();
                    onStartTour?.();
                  }}
                  className="group mt-3 flex min-h-[86px] w-full items-center gap-3 border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-3.5 py-3 text-left text-[var(--tenant-text-on-surface)] transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tenant-accent-on-surface)_38%,var(--tenant-border))] hover:shadow-[var(--tenant-shadow-xs)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--tenant-radius-control)] bg-[var(--tenant-portal-button)] text-[var(--tenant-portal-button-foreground)] shadow-[var(--tenant-shadow-xs)]">
                    <RocketLaunchIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--tenant-label-color)]"
                      data-tenant-type="eyebrow"
                    >
                      {copy.tour.eyebrow}
                    </span>
                    <span
                      className="mt-0.5 block text-[14px] font-semibold text-[var(--tenant-heading-color)]"
                      data-tenant-type="display"
                    >
                      {copy.tour.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-[var(--tenant-muted-on-surface)]">
                      {copy.tour.summary}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold text-[var(--tenant-accent-on-surface)]">
                    {copy.tour.action}
                  </span>
                </button>
              )}

              <div data-customer-portal-help-list className="mt-3 space-y-1.5">
                {topics.map((topic) => (
                  <HelpTopic
                    key={topic.id}
                    onClose={closeDrawer}
                    onToggle={toggleTopic}
                    open={activeTopicId === topic.id}
                    panelId={`${dialogId}-${topic.id}`}
                    topic={topic}
                  />
                ))}
              </div>

              <p className="mt-3 rounded-[var(--tenant-radius-control)] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-3 py-2.5 text-[10px] leading-4 text-[var(--tenant-muted-on-surface)]">
                {copy.note}
              </p>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
