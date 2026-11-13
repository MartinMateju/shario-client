"use client";

import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  RocketLaunchIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { usePathname } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentUser,
  selectIsCustomerAuthenticated,
  selectIsSessionReadyForContext,
} from "@/lib/features/auth/authSlice";
import { AUTH_CONTEXTS } from "@/lib/features/auth/authContext";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";
import useWorkspaceTourLayout from "@/components/tours/useWorkspaceTourLayout";
import { workspaceTourPanelMaxHeight } from "@/components/tours/workspaceTourGeometry";

import { customerPortalProfileThemeStyle } from "./CustomerPortalPrimitives";
import { isCustomerPortalPageEnabled } from "./customerPortalVisibility";
import { CUSTOMER_PORTAL_TOUR_START_EVENT } from "./customerPortalOverlayEvents";
import {
  CUSTOMER_PORTAL_TOUR_STEPS,
  getCustomerPortalTourStorageKey,
  hasAcknowledgedCustomerPortalTour,
  readCustomerPortalTourAcknowledgement,
  writeCustomerPortalTourAcknowledgement,
} from "./customerPortalProductTour.config";

const COPY = {
  en: {
    welcome: {
      eyebrow: "Quick guide",
      title: "First time here?",
      description:
        "Take a short tour of your studio portal before making your first booking.",
      duration:
        "About 60 seconds. You can replay it anytime from Help and guides.",
      dismiss: "Not now",
      start: "Start tour",
      close: "Close tour",
    },
    progress: (current, total) => `Step ${current} of ${total}`,
    skip: "Skip tour",
    back: "Back",
    next: "Next",
    finish: "Start booking",
    final: {
      title: "You’re ready",
      description:
        "Choose a time in the calendar whenever you are ready. Help and guides can replay this tour.",
    },
    steps: {
      overview: {
        title: "Your portal at a glance",
        description:
          "See your next visit, member ID, and studio-credit balance in one place.",
      },
      studio: {
        title: "Choose your studio",
        description:
          "If the business has several locations, select the one you want to visit here.",
      },
      calendarControls: {
        title: "Move around the calendar",
        description:
          "Jump to today, change the date range, switch views, or open and close the legend.",
      },
      legend: {
        title: "Understand availability",
        description:
          "The legend explains the colors used for available times and your bookings.",
      },
      chooseTime: {
        title: "Pick an available time",
        description:
          "Select an open slot to review the activity, duration, participants, and price before checkout.",
      },
      help: {
        title: "Help is always nearby",
        description:
          "Open Help and guides for booking instructions or to replay this tour later.",
      },
    },
  },
  cs: {
    welcome: {
      eyebrow: "Rychlý průvodce",
      title: "Jste tu poprvé?",
      description:
        "Projděte si krátkou prohlídku portálu studia před první rezervací.",
      duration:
        "Zabere asi 60 sekund. Kdykoli ji spustíte znovu v Nápovědě a návodech.",
      dismiss: "Teď ne",
      start: "Spustit prohlídku",
      close: "Zavřít prohlídku",
    },
    progress: (current, total) => `Krok ${current} z ${total}`,
    skip: "Přeskočit prohlídku",
    back: "Zpět",
    next: "Další",
    finish: "Začít rezervaci",
    final: {
      title: "Vše je připraveno",
      description:
        "Až budete chtít, vyberte čas v kalendáři. Prohlídku lze znovu spustit v Nápovědě a návodech.",
    },
    steps: {
      overview: {
        title: "Přehled vašeho portálu",
        description:
          "Na jednom místě najdete příští návštěvu, členské ID a zůstatek kreditu.",
      },
      studio: {
        title: "Vyberte studio",
        description:
          "Pokud má podnik více provozoven, vyberte zde tu, kterou chcete navštívit.",
      },
      calendarControls: {
        title: "Pohyb v kalendáři",
        description:
          "Přejděte na dnešek, změňte období či zobrazení a otevřete nebo zavřete legendu.",
      },
      legend: {
        title: "Rozumějte dostupnosti",
        description:
          "Legenda vysvětluje barvy volných časů a vašich rezervací.",
      },
      chooseTime: {
        title: "Vyberte volný čas",
        description:
          "Zvolte volný termín a před objednávkou zkontrolujte aktivitu, délku, počet osob a cenu.",
      },
      help: {
        title: "Nápověda je vždy po ruce",
        description:
          "V Nápovědě a návodech najdete postupy rezervace i možnost znovu spustit tuto prohlídku.",
      },
    },
  },
  de: {
    welcome: {
      eyebrow: "Kurzanleitung",
      title: "Zum ersten Mal hier?",
      description:
        "Machen Sie vor Ihrer ersten Buchung eine kurze Tour durch das Studioportal.",
      duration:
        "Dauert etwa 60 Sekunden. Unter Hilfe und Anleitungen können Sie die Tour jederzeit wiederholen.",
      dismiss: "Nicht jetzt",
      start: "Tour starten",
      close: "Tour schließen",
    },
    progress: (current, total) => `Schritt ${current} von ${total}`,
    skip: "Tour überspringen",
    back: "Zurück",
    next: "Weiter",
    finish: "Buchung starten",
    final: {
      title: "Alles bereit",
      description:
        "Wählen Sie im Kalender einen Termin. Unter Hilfe und Anleitungen können Sie diese Tour erneut starten.",
    },
    steps: {
      overview: {
        title: "Ihr Portal im Überblick",
        description:
          "Sehen Sie den nächsten Besuch, Ihre Mitglieds-ID und Ihr Studioguthaben auf einen Blick.",
      },
      studio: {
        title: "Studio auswählen",
        description:
          "Wenn es mehrere Standorte gibt, wählen Sie hier das gewünschte Studio aus.",
      },
      calendarControls: {
        title: "Im Kalender navigieren",
        description:
          "Springen Sie zu heute, ändern Sie Zeitraum oder Ansicht und öffnen oder schließen Sie die Legende.",
      },
      legend: {
        title: "Verfügbarkeit verstehen",
        description:
          "Die Legende erklärt die Farben für freie Zeiten und Ihre Buchungen.",
      },
      chooseTime: {
        title: "Freie Zeit auswählen",
        description:
          "Wählen Sie einen freien Termin und prüfen Sie Aktivität, Dauer, Teilnehmer und Preis vor dem Abschluss.",
      },
      help: {
        title: "Hilfe ist immer erreichbar",
        description:
          "Unter Hilfe und Anleitungen finden Sie Buchungshinweise und können diese Tour wiederholen.",
      },
    },
  },
};

function SpotlightBackdrop({ rect }) {
  const paneClass =
    "fixed z-[120] bg-[#11110F]/55 backdrop-blur-[2px] motion-reduce:backdrop-blur-none";

  if (!rect) {
    return <div aria-hidden="true" className={`${paneClass} inset-0`} />;
  }

  return (
    <>
      <div
        aria-hidden="true"
        className={`${paneClass} left-0 right-0 top-0`}
        style={{ height: rect.top }}
      />
      <div
        aria-hidden="true"
        className={`${paneClass} left-0`}
        style={{ top: rect.top, width: rect.left, height: rect.height }}
      />
      <div
        aria-hidden="true"
        className={`${paneClass} right-0`}
        style={{ top: rect.top, left: rect.right, height: rect.height }}
      />
      <div
        aria-hidden="true"
        className={`${paneClass} bottom-0 left-0 right-0`}
        style={{ top: rect.bottom }}
      />
      <div
        aria-hidden="true"
        data-customer-portal-tour-spotlight
        className="pointer-events-none fixed z-[121] rounded-[var(--tenant-radius-control)] border-2 border-white/90 shadow-[0_0_0_3px_color-mix(in_srgb,var(--tenant-portal-button)_72%,transparent),0_18px_50px_rgba(17,17,15,0.2)] transition-[left,top,width,height] duration-200 motion-reduce:transition-none"
        style={rect}
      />
    </>
  );
}

export default function CustomerPortalProductTour({ enabled = true }) {
  const locale = useLocale();
  const pathname = usePathname();
  const currentTenant = useSelector(selectCurrentTenant);
  const currentUser = useSelector(selectCurrentUser);
  const customerAuthenticated = useSelector(selectIsCustomerAuthenticated);
  const sessionReady = useSelector(
    selectIsSessionReadyForContext(AUTH_CONTEXTS.CUSTOMER),
  );
  const publicTenant = useOptionalPublicTenant()?.tenant;
  const copy = useLegacyCopy("portalTour");
  const tenantTheme = useMemo(
    () =>
      getPublicTenantTheme(publicTenant || currentTenant || {}, {
        surface: "portal",
      }),
    [currentTenant, publicTenant],
  );
  const tenantKey =
    currentTenant?.id ||
    currentTenant?._id ||
    currentTenant?.slug ||
    publicTenant?.id ||
    publicTenant?._id ||
    publicTenant?.slug;
  const customerKey = currentUser?.id || currentUser?._id;
  const storageKey = useMemo(
    () =>
      tenantKey && customerKey
        ? getCustomerPortalTourStorageKey({ tenantKey, customerKey })
        : "",
    [customerKey, tenantKey],
  );
  const eligible = Boolean(
    enabled &&
    isCustomerPortalPageEnabled(publicTenant || currentTenant, "calendar") &&
    customerAuthenticated &&
    sessionReady &&
    storageKey,
  );
  const normalizedPathname =
    pathname?.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const automaticKeyRef = useRef("");
  const showCompletion = stepIndex === CUSTOMER_PORTAL_TOUR_STEPS.length;
  const currentStep = showCompletion
    ? null
    : CUSTOMER_PORTAL_TOUR_STEPS[stepIndex];
  const { panelRef, panelStyle, targetRect } = useWorkspaceTourLayout({
    active: open,
    selectors: [],
    step: currentStep,
  });
  const themedStyle = {
    ...tenantTheme.style,
    ...customerPortalProfileThemeStyle,
    "--tenant-interactive-hover": "var(--tenant-accent-on-surface)",
    "--tenant-interactive-hover-on-surface": "var(--tenant-accent-on-surface)",
  };

  const persist = useCallback(
    (status, lastStep) =>
      writeCustomerPortalTourAcknowledgement(storageKey, status, lastStep),
    [storageKey],
  );

  const beginTour = useCallback(() => {
    setWelcomeOpen(false);
    setStepIndex(0);
    setOpen(true);
  }, []);

  const hideTour = useCallback(() => {
    setWelcomeOpen(false);
    setOpen(false);
  }, []);

  const showWelcome = useCallback(() => setWelcomeOpen(true), []);

  useEffect(() => {
    const schedule =
      window.requestAnimationFrame?.bind(window) ??
      ((callback) => window.setTimeout(callback, 0));
    const cancel =
      window.cancelAnimationFrame?.bind(window) ??
      window.clearTimeout.bind(window);

    if (!eligible) {
      automaticKeyRef.current = "";
      const frame = schedule(hideTour);
      return () => cancel(frame);
    }

    if (normalizedPathname !== "/portal") return undefined;
    if (automaticKeyRef.current === storageKey) return undefined;

    automaticKeyRef.current = storageKey;
    const saved = readCustomerPortalTourAcknowledgement(storageKey);
    if (!hasAcknowledgedCustomerPortalTour(saved)) {
      const frame = schedule(showWelcome);
      return () => cancel(frame);
    }

    return undefined;
  }, [eligible, hideTour, normalizedPathname, showWelcome, storageKey]);

  useEffect(() => {
    if (!eligible || typeof window === "undefined") return undefined;

    const replay = () => beginTour();
    window.addEventListener(CUSTOMER_PORTAL_TOUR_START_EVENT, replay);
    return () =>
      window.removeEventListener(CUSTOMER_PORTAL_TOUR_START_EVENT, replay);
  }, [beginTour, eligible]);

  const dismissWelcome = useCallback(() => {
    if (!welcomeOpen) return;
    setWelcomeOpen(false);
    persist("skipped", CUSTOMER_PORTAL_TOUR_STEPS[0].key);
  }, [persist, welcomeOpen]);

  const skipTour = useCallback(() => {
    if (!open || showCompletion) {
      setOpen(false);
      return;
    }
    persist("skipped", currentStep?.key || CUSTOMER_PORTAL_TOUR_STEPS[0].key);
    setOpen(false);
  }, [currentStep?.key, open, persist, showCompletion]);

  const next = () => {
    if (stepIndex === CUSTOMER_PORTAL_TOUR_STEPS.length - 1) {
      persist("completed", CUSTOMER_PORTAL_TOUR_STEPS.at(-1).key);
    }
    setStepIndex((value) =>
      Math.min(CUSTOMER_PORTAL_TOUR_STEPS.length, value + 1),
    );
  };

  const finish = () => {
    setOpen(false);
    const calendar = document.querySelector(
      "[data-customer-calendar-studio-selector]",
    );
    calendar?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    window.setTimeout(
      () =>
        document.querySelector("[data-calendar-command-bar] button")?.focus?.(),
      250,
    );
  };

  return (
    <div
      data-customer-portal-product-tour-root
      data-tenant-style={tenantTheme.stylePresetId || undefined}
      style={themedStyle}
    >
      <Dialog
        open={welcomeOpen}
        onClose={dismissWelcome}
        className="relative z-[115]"
        data-customer-portal-tour-welcome
        data-tenant-style={tenantTheme.stylePresetId || undefined}
        style={themedStyle}
      >
        <DialogBackdrop className="fixed inset-0 bg-[#11110F]/35 backdrop-blur-[2px]" />
        <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
          <DialogPanel
            data-dialog-layout="modal"
            data-tenant-surface="panel"
            className="w-full max-w-md border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-5 text-[var(--tenant-text-on-surface)] focus:outline-none sm:p-6"
            style={{
              borderRadius: "var(--tenant-radius-panel)",
              boxShadow: "var(--tenant-shadow-floating)",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-label-color)]"
                  data-tenant-type="eyebrow"
                >
                  {copy.welcome.eyebrow}
                </p>
                <DialogTitle
                  className="mt-2 text-[25px] font-semibold tracking-[-0.035em] text-[var(--tenant-heading-color)]"
                  data-tenant-type="display"
                >
                  {copy.welcome.title}
                </DialogTitle>
              </div>
              <button
                type="button"
                onClick={dismissWelcome}
                aria-label={copy.welcome.close}
                data-customer-portal-tour-close
                data-tenant-hover="preserve"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--tenant-muted-on-surface)] transition hover:bg-[var(--tenant-background)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <DialogDescription className="mt-3 text-[13px] leading-6 text-[var(--tenant-muted-on-surface)]">
              {copy.welcome.description}
            </DialogDescription>
            <div className="mt-5 flex items-center gap-3 rounded-[var(--tenant-radius-card)] border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-4 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--tenant-portal-button)] text-[var(--tenant-portal-button-foreground)]">
                <RocketLaunchIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-[12px] font-semibold leading-5">
                {copy.welcome.duration}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={dismissWelcome}
                data-customer-portal-tour-dismiss
                data-tenant-hover="preserve"
                className="min-h-11 rounded-full border border-[var(--tenant-border)] px-5 text-[12px] font-semibold transition hover:border-[var(--tenant-accent-on-surface)] hover:bg-[var(--tenant-background)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30"
              >
                {copy.welcome.dismiss}
              </button>
              <button
                type="button"
                data-autofocus
                data-customer-portal-tour-start
                data-tenant-hover="preserve"
                onClick={beginTour}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--tenant-portal-button)] px-5 text-[12px] font-semibold text-[var(--tenant-portal-button-foreground)] shadow-[0_10px_24px_color-mix(in_srgb,var(--tenant-portal-button)_24%,transparent)] transition hover:-translate-y-0.5 hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-portal-button)]/35 motion-reduce:transform-none"
              >
                <RocketLaunchIcon className="h-4 w-4" aria-hidden="true" />
                {copy.welcome.start}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog
        open={open}
        onClose={skipTour}
        className="relative z-[120]"
        data-customer-portal-product-tour
        data-tenant-style={tenantTheme.stylePresetId || undefined}
        style={themedStyle}
        data-customer-portal-tour-step={
          showCompletion ? "complete" : currentStep?.key
        }
      >
        <SpotlightBackdrop rect={showCompletion ? null : targetRect} />
        <DialogPanel
          ref={panelRef}
          data-dialog-layout="popover"
          data-tenant-surface="panel"
          className="fixed z-[122] overflow-y-auto overscroll-contain border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-[var(--tenant-text-on-surface)] focus:outline-none sm:p-6"
          style={{
            ...panelStyle,
            borderRadius: "var(--tenant-radius-panel)",
            boxShadow: "var(--tenant-shadow-floating)",
            maxHeight: workspaceTourPanelMaxHeight,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-label-color)]"
                aria-live="polite"
                data-tenant-type="eyebrow"
              >
                {copy.progress(
                  Math.min(stepIndex + 1, CUSTOMER_PORTAL_TOUR_STEPS.length),
                  CUSTOMER_PORTAL_TOUR_STEPS.length,
                )}
              </p>
              <DialogTitle
                className="mt-2 text-[21px] font-semibold tracking-[-0.03em] text-[var(--tenant-heading-color)]"
                data-tenant-type="display"
              >
                {showCompletion
                  ? copy.final.title
                  : copy.steps[currentStep.key].title}
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={skipTour}
              aria-label={showCompletion ? copy.welcome.close : copy.skip}
              data-tenant-hover="preserve"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--tenant-muted-on-surface)] transition hover:bg-[var(--tenant-background)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <DialogDescription className="mt-3 text-[13px] leading-6 text-[var(--tenant-muted-on-surface)]">
            {showCompletion
              ? copy.final.description
              : copy.steps[currentStep.key].description}
          </DialogDescription>
          <div
            className="mt-5 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--tenant-text-on-surface)_12%,var(--tenant-background))]"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-[var(--tenant-portal-button)] transition-[width] duration-200 motion-reduce:transition-none"
              style={{
                width: `${
                  (Math.min(stepIndex + 1, CUSTOMER_PORTAL_TOUR_STEPS.length) /
                    CUSTOMER_PORTAL_TOUR_STEPS.length) *
                  100
                }%`,
              }}
            />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {showCompletion ? (
              <span aria-hidden="true" />
            ) : (
              <button
                type="button"
                onClick={skipTour}
                data-tenant-hover="preserve"
                className="min-h-11 px-1 text-[12px] font-semibold text-[var(--tenant-muted-on-surface)] underline-offset-4 hover:text-[var(--tenant-accent-on-surface)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30"
              >
                {copy.skip}
              </button>
            )}
            <div className="flex items-center gap-2">
              {!showCompletion && stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    setStepIndex((value) => Math.max(0, value - 1))
                  }
                  data-tenant-hover="preserve"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--tenant-border)] px-4 text-[12px] font-semibold transition hover:border-[var(--tenant-accent-on-surface)] hover:bg-[var(--tenant-background)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)]/30"
                >
                  <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                  {copy.back}
                </button>
              ) : null}
              {showCompletion ? (
                <button
                  type="button"
                  data-autofocus
                  data-tenant-hover="preserve"
                  onClick={finish}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--tenant-portal-button)] px-5 text-[12px] font-semibold text-[var(--tenant-portal-button-foreground)] shadow-[0_10px_24px_color-mix(in_srgb,var(--tenant-portal-button)_24%,transparent)] hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-portal-button)]/35"
                >
                  <RocketLaunchIcon className="h-4 w-4" aria-hidden="true" />
                  {copy.finish}
                </button>
              ) : (
                <button
                  type="button"
                  data-autofocus
                  data-tenant-hover="preserve"
                  onClick={next}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--tenant-portal-button)] px-5 text-[12px] font-semibold text-[var(--tenant-portal-button-foreground)] shadow-[0_10px_24px_color-mix(in_srgb,var(--tenant-portal-button)_24%,transparent)] hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-portal-button)]/35"
                >
                  {copy.next}
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </div>
  );
}
