"use client";

import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { isCustomerPortalHrefEnabled } from "@/components/customer-shell/customerPortalVisibility";
import {
  CUSTOMER_PORTAL_CONCIERGE_OPEN_EVENT,
  CUSTOMER_PORTAL_HELP_OPEN_EVENT,
  emitCustomerPortalOverlayEvent,
} from "@/components/customer-shell/customerPortalOverlayEvents";

import AiMessage from "./AiMessage";
import {
  createClientMessage,
  getConciergeSuggestionKeys,
  getAiErrorMessage,
  getEntityId,
  normalizeAssistantResponse,
} from "./ai.utils";

const COMPOSER_MIN_HEIGHT = 40;
const COMPOSER_MAX_HEIGHT = 56;
const CUSTOMER_LAUNCHER_CONTROL_SELECTORS = [
  "[data-calendar-command-bar]",
  "[data-customer-calendar-studio-selector]",
  "[data-calendar-filter-panel]",
];

const rectanglesIntersect = (left, right, gap = 0) =>
  left.right > right.left - gap &&
  left.left < right.right + gap &&
  left.bottom > right.top - gap &&
  left.top < right.bottom + gap;

const isRectVisible = (rect, viewportWidth, viewportHeight) =>
  rect.width > 0 &&
  rect.height > 0 &&
  rect.right > 0 &&
  rect.left < viewportWidth &&
  rect.bottom > 0 &&
  rect.top < viewportHeight;

const readStoredSession = (key) => {
  if (!key || typeof window === "undefined") {
    return { sessionToken: "", conversationId: "" };
  }

  const raw = window.sessionStorage.getItem(key);
  if (!raw) return { sessionToken: "", conversationId: "" };

  try {
    const stored = JSON.parse(raw);
    if (
      typeof stored?.sessionToken === "string" &&
      stored.sessionToken &&
      typeof stored?.conversationId === "string" &&
      stored.conversationId
    ) {
      return {
        sessionToken: stored.sessionToken,
        conversationId: stored.conversationId,
      };
    }
  } catch {
    // Old or corrupted public session data is discarded below.
  }

  window.sessionStorage.removeItem(key);
  return { sessionToken: "", conversationId: "" };
};

const getSafeHandoffHref = (handoff) => {
  const rawHref = String(handoff?.href ?? "").trim();
  if (rawHref.startsWith("/") && !rawHref.startsWith("//")) return rawHref;

  if (rawHref) {
    try {
      const url = new URL(rawHref);
      if (["https:", "mailto:", "tel:"].includes(url.protocol)) {
        return url.toString();
      }
    } catch {
      // Fall through to verified email or phone contact fields.
    }
  }

  const email = String(handoff?.email ?? "").trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return `mailto:${email}`;
  }

  const phone = String(handoff?.phone ?? "").trim();
  return phone && /^[+\d][\d ().-]+$/.test(phone) ? `tel:${phone}` : "";
};

export default function ConciergeWidget({
  surface,
  studioName,
  onSend,
  sessionStorageKey,
  tenantStylePresetId = null,
  tenantThemeStyle = null,
}) {
  const t = useTranslations("StudioConcierge");
  const tenant = useOptionalPublicTenant()?.tenant;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [initialSession] = useState(() => readStoredSession(sessionStorageKey));
  const [sessionToken, setSessionToken] = useState(initialSession.sessionToken);
  const [conversationId, setConversationId] = useState(
    initialSession.conversationId,
  );
  const [handoff, setHandoff] = useState(null);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const composerHintId = useId();
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const launcherRef = useRef(null);
  const [launcherAvoidance, setLauncherAvoidance] = useState({
    hidden: false,
    lift: 0,
    shift: 0,
  });
  const [calendarInView, setCalendarInView] = useState(false);
  const launcherAvoidanceRef = useRef(launcherAvoidance);
  const {
    hidden: launcherHidden,
    lift: launcherLift,
    shift: launcherShift,
  } = launcherAvoidance;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, isSending]);

  useEffect(() => {
    const composer = inputRef.current;
    if (!composer || !open) return;

    composer.style.height = "auto";
    const nextHeight = Math.min(
      Math.max(composer.scrollHeight, COMPOSER_MIN_HEIGHT),
      COMPOSER_MAX_HEIGHT,
    );
    composer.style.height = `${nextHeight}px`;
    composer.style.overflowY =
      composer.scrollHeight > COMPOSER_MAX_HEIGHT ? "auto" : "hidden";
  }, [input, open]);

  useEffect(() => {
    if (surface !== "customer" || typeof window === "undefined") {
      return undefined;
    }

    const closeForHelp = () => setOpen(false);
    window.addEventListener(CUSTOMER_PORTAL_HELP_OPEN_EVENT, closeForHelp);

    return () =>
      window.removeEventListener(CUSTOMER_PORTAL_HELP_OPEN_EVENT, closeForHelp);
  }, [surface]);

  useEffect(() => {
    launcherAvoidanceRef.current = launcherAvoidance;
  }, [launcherAvoidance]);

  useEffect(() => {
    if (launcherHidden && document.activeElement === launcherRef.current) {
      launcherRef.current.blur();
    }
  }, [launcherHidden]);

  useEffect(() => {
    if (surface !== "customer" || typeof window === "undefined") return;

    let frame = 0;
    let mutationObserver;
    let resizeObserver;

    const updateLauncherPosition = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const launcher = launcherRef.current;
        const calendarShell = document.querySelector(
          "[data-customer-calendar-shell]",
        );
        const calendarRect = calendarShell?.getBoundingClientRect();
        const nextCalendarInView = Boolean(
          calendarRect &&
          calendarRect.bottom > 0 &&
          calendarRect.top < window.innerHeight,
        );
        setCalendarInView((current) =>
          current === nextCalendarInView ? current : nextCalendarInView,
        );

        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const protectedControls = CUSTOMER_LAUNCHER_CONTROL_SELECTORS.map(
          (selector) => document.querySelector(selector),
        ).filter(Boolean);
        const protectedRects = protectedControls
          .map((control) => control.getBoundingClientRect())
          .filter((rect) => isRectVisible(rect, viewportWidth, viewportHeight));

        if (!launcher || protectedRects.length === 0) {
          setLauncherAvoidance((current) =>
            current.lift === 0 && current.shift === 0 && !current.hidden
              ? current
              : { hidden: false, lift: 0, shift: 0 },
          );
          return;
        }

        const launcherRect = launcher.getBoundingClientRect();
        const collisionGap = 12;
        const edgeGap = 12;
        const currentAvoidance = launcherAvoidanceRef.current;
        const baseRect = {
          bottom: launcherRect.bottom + currentAvoidance.lift,
          height: launcherRect.height,
          left: launcherRect.left + currentAvoidance.shift,
          right: launcherRect.right + currentAvoidance.shift,
          top: launcherRect.top + currentAvoidance.lift,
          width: launcherRect.width,
        };
        const liftOptions = [0];
        const shiftOptions = [0];

        for (const controlRect of protectedRects) {
          liftOptions.push(
            Math.max(0, baseRect.bottom - controlRect.top + collisionGap),
          );
          shiftOptions.push(
            Math.max(0, baseRect.right - controlRect.left + collisionGap),
          );
        }

        const candidates = [];
        for (const lift of [...new Set(liftOptions)]) {
          for (const shift of [...new Set(shiftOptions)]) {
            const candidate = {
              bottom: baseRect.bottom - lift,
              left: baseRect.left - shift,
              right: baseRect.right - shift,
              top: baseRect.top - lift,
            };
            const withinViewport =
              candidate.top >= edgeGap &&
              candidate.left >= edgeGap &&
              candidate.right <= viewportWidth - edgeGap &&
              candidate.bottom <= viewportHeight - edgeGap;
            const clearsControls = protectedRects.every(
              (controlRect) =>
                !rectanglesIntersect(candidate, controlRect, collisionGap),
            );

            if (withinViewport && clearsControls) {
              candidates.push({
                hidden: false,
                lift,
                shift,
                // A modest side dock is less disruptive than lifting the
                // launcher into the portal header; very large shifts still
                // lose to a nearby vertical position.
                score: lift + shift * 0.2,
              });
            }
          }
        }

        candidates.sort((left, right) => left.score - right.score);
        const next = candidates[0] || { hidden: true, lift: 0, shift: 0 };

        setLauncherAvoidance((current) =>
          Math.abs(current.lift - next.lift) < 1 &&
          Math.abs(current.shift - next.shift) < 1 &&
          current.hidden === next.hidden
            ? current
            : {
                hidden: next.hidden,
                lift: next.lift,
                shift: next.shift,
              },
        );
      });
    };

    updateLauncherPosition();
    window.addEventListener("resize", updateLauncherPosition);
    window.addEventListener("scroll", updateLauncherPosition, {
      passive: true,
    });

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateLauncherPosition);
      if (launcherRef.current) resizeObserver.observe(launcherRef.current);
      for (const selector of CUSTOMER_LAUNCHER_CONTROL_SELECTORS) {
        const control = document.querySelector(selector);
        if (control) resizeObserver.observe(control);
      }
      const calendarShell = document.querySelector(
        "[data-customer-calendar-shell]",
      );
      if (calendarShell) resizeObserver.observe(calendarShell);
    }

    if (typeof MutationObserver !== "undefined" && document.body) {
      mutationObserver = new MutationObserver(updateLauncherPosition);
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateLauncherPosition);
      window.removeEventListener("scroll", updateLauncherPosition);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
    };
  }, [surface]);

  const submit = async (value = input) => {
    const message = String(value || "").trim();
    if (!message || isSending) return;

    setInput("");
    setError("");
    setMessages((current) => [...current, createClientMessage(message)]);
    setIsSending(true);

    try {
      const sessionPayload = sessionStorageKey
        ? sessionToken && conversationId
          ? { sessionToken, conversationId }
          : {}
        : conversationId
          ? { conversationId }
          : {};
      let response;

      try {
        response = await onSend({ message, ...sessionPayload });
      } catch (firstError) {
        const invalidPublicSession =
          sessionStorageKey &&
          sessionToken &&
          conversationId &&
          [401, 404, 410].includes(Number(firstError?.status));

        if (!invalidPublicSession) throw firstError;

        setSessionToken("");
        setConversationId("");
        window.sessionStorage.removeItem(sessionStorageKey);
        response = await onSend({ message });
      }

      const assistantMessage = normalizeAssistantResponse(response);
      setMessages((current) => [...current, assistantMessage]);
      const nextToken =
        response?.sessionToken ??
        response?.token ??
        response?.session?.token ??
        response?.conversationToken;
      const nextConversationId = String(
        response?.conversationId ??
          response?.conversation?.id ??
          response?.conversation?._id ??
          conversationId ??
          "",
      );
      if (nextConversationId) setConversationId(nextConversationId);
      if (nextToken) setSessionToken(String(nextToken));
      if (
        sessionStorageKey &&
        nextToken &&
        nextConversationId &&
        typeof window !== "undefined"
      ) {
        window.sessionStorage.setItem(
          sessionStorageKey,
          JSON.stringify({
            sessionToken: String(nextToken),
            conversationId: nextConversationId,
          }),
        );
      }
      setHandoff(response?.handoff ?? null);
    } catch (requestError) {
      const rateLimited = requestError?.status === 429;
      setError(
        getAiErrorMessage(
          requestError,
          rateLimited ? t("errors.rateLimited") : t("errors.message"),
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  const safeHandoffHref = getSafeHandoffHref(handoff);
  const handoffHref = isCustomerPortalHrefEnabled(tenant, safeHandoffHref)
    ? safeHandoffHref
    : "";

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        disabled={surface === "customer" && launcherHidden}
        tabIndex={surface === "customer" && launcherHidden ? -1 : undefined}
        aria-hidden={
          surface === "customer" && launcherHidden ? "true" : undefined
        }
        onClick={() => {
          if (surface === "customer") {
            emitCustomerPortalOverlayEvent(
              CUSTOMER_PORTAL_CONCIERGE_OPEN_EVENT,
            );
          }
          setOpen(true);
        }}
        data-concierge-launcher
        data-customer-concierge-launcher={surface === "customer" || undefined}
        data-tenant-button-compact={surface === "customer" || undefined}
        data-tenant-button={surface === "customer" ? "secondary" : undefined}
        data-tenant-hover={surface === "customer" ? "preserve" : undefined}
        data-concierge-compact={
          surface === "customer" && calendarInView ? "true" : "false"
        }
        data-concierge-avoiding-controls={
          surface === "customer" &&
          (launcherLift > 0 || launcherShift > 0 || launcherHidden)
            ? "true"
            : "false"
        }
        data-concierge-shifted={
          surface === "customer" && launcherShift > 0 ? "true" : "false"
        }
        data-concierge-hidden={
          surface === "customer" && launcherHidden ? "true" : "false"
        }
        className={`fixed bottom-5 right-5 z-[65] inline-flex min-h-13 items-center rounded-full border border-cobalt-200 bg-white py-2.5 text-left shadow-floating transition-[opacity,transform,border-color] duration-200 hover:-translate-y-1 hover:border-cobalt-300 motion-reduce:transform-none motion-reduce:transition-none sm:bottom-7 sm:right-7 ${surface === "customer" && calendarInView ? "gap-0 px-2.5" : "gap-3 px-4"} ${surface === "customer" && launcherHidden ? "pointer-events-none invisible opacity-0" : ""}`}
        style={
          surface === "customer"
            ? {
                bottom:
                  launcherLift > 0
                    ? `calc(max(1rem, env(safe-area-inset-bottom)) + ${launcherLift}px)`
                    : "max(1rem, env(safe-area-inset-bottom))",
                right:
                  launcherShift > 0
                    ? `calc(max(1rem, env(safe-area-inset-right)) + ${launcherShift}px)`
                    : "max(1rem, env(safe-area-inset-right))",
                borderColor:
                  "color-mix(in srgb, var(--tenant-accent) 24%, transparent)",
              }
            : undefined
        }
        aria-label={t("open")}
      >
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-cobalt-500 text-white shadow-cobalt"
          style={
            surface === "customer"
              ? {
                  backgroundColor: "var(--tenant-accent)",
                  color: "var(--tenant-accent-foreground)",
                }
              : undefined
          }
        >
          <SparklesIcon className="h-4.5 w-4.5" />
        </span>
        <span
          className={
            surface === "customer" && calendarInView
              ? "hidden"
              : "hidden sm:block"
          }
        >
          <span
            className="block text-[12px] font-semibold text-ink"
            data-customer-concierge-title={surface === "customer" || undefined}
          >
            {t("launcher.title")}
          </span>
          <span
            className="mt-0.5 block text-[10px] text-[#666663]"
            data-customer-concierge-muted={surface === "customer" || undefined}
          >
            {t("launcher.description")}
          </span>
        </span>
      </button>

      <Dialog
        open={open}
        onClose={setOpen}
        className="relative z-[95]"
        data-tenant-style={
          surface === "customer" ? tenantStylePresetId || undefined : undefined
        }
        style={
          surface === "customer" ? tenantThemeStyle || undefined : undefined
        }
      >
        <DialogBackdrop className="fixed inset-0 bg-ink/20 backdrop-blur-[2px]" />
        <div className="fixed inset-0 flex items-end justify-end sm:p-5">
          <DialogPanel
            data-dialog-layout="drawer"
            data-concierge-panel
            data-customer-concierge-panel={surface === "customer" || undefined}
            data-tenant-surface={surface === "customer" ? "panel" : undefined}
            className="flex h-[100dvh] w-full flex-col overflow-hidden bg-canvas shadow-[0_18px_54px_rgb(31_31_31/0.10)] sm:h-[min(760px,calc(100dvh-2.5rem))] sm:max-w-[430px] sm:rounded-[24px] sm:border sm:border-line sm:shadow-[-12px_0_40px_rgb(31_31_31/0.08)]"
          >
            <header
              className="relative overflow-hidden border-b border-line bg-white px-4 py-3.5"
              data-customer-concierge-header={
                surface === "customer" || undefined
              }
            >
              <div
                className="pointer-events-none absolute -right-10 -top-14 h-28 w-28 rounded-full bg-cobalt-500/10"
                data-customer-concierge-decoration={
                  surface === "customer" || undefined
                }
              />
              <div className="relative flex items-center gap-3">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cobalt-50 text-cobalt-600"
                  data-customer-concierge-icon={
                    surface === "customer" || undefined
                  }
                >
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <DialogTitle
                    className="truncate text-sm font-semibold text-ink"
                    data-tenant-type={
                      surface === "customer" ? "display" : undefined
                    }
                  >
                    {t("title")}
                  </DialogTitle>
                  <p
                    className="mt-0.5 truncate text-[12px] text-ink-muted"
                    data-customer-concierge-muted={
                      surface === "customer" || undefined
                    }
                  >
                    {studioName
                      ? t("subtitleWithStudio", { studio: studioName })
                      : t("subtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink"
                  data-customer-concierge-close={
                    surface === "customer" || undefined
                  }
                  aria-label={t("close")}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div
              className="scrollbar-subtle min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-3.5"
              data-concierge-conversation-scroll
              aria-live="polite"
            >
              {!messages.length ? (
                <div className="flex min-h-[380px] flex-col items-center justify-center px-3 text-center">
                  <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-coral-100 text-terracotta-700"
                    data-customer-concierge-icon={
                      surface === "customer" || undefined
                    }
                  >
                    <SparklesIcon className="h-5 w-5" />
                  </span>
                  <h3
                    className="mt-4 text-base font-semibold text-ink"
                    data-tenant-type={
                      surface === "customer" ? "display" : undefined
                    }
                  >
                    {t(`welcome.${surface}.title`)}
                  </h3>
                  <p
                    className="mt-2 max-w-sm text-xs leading-5 text-ink-muted"
                    data-customer-concierge-muted={
                      surface === "customer" || undefined
                    }
                  >
                    {t(`welcome.${surface}.description`)}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {getConciergeSuggestionKeys(surface).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => submit(t(`suggestions.${key}`))}
                        data-tenant-button={
                          surface === "customer" ? "secondary" : undefined
                        }
                        className="min-h-11 rounded-full border border-line bg-white px-3.5 py-2 text-[12px] font-medium text-ink-soft transition hover:border-cobalt-200 hover:text-cobalt-700"
                      >
                        {t(`suggestions.${key}`)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <AiMessage
                    key={getEntityId(message) || `${message?.role}-${index}`}
                    message={message}
                    feedback={false}
                    compact
                    tenantThemed={surface === "customer"}
                  />
                ))
              )}
              {isSending ? (
                <div className="flex justify-start">
                  <span
                    className="rounded-full border border-line/80 bg-white px-4 py-2 text-xs text-ink-muted"
                    data-customer-concierge-muted={
                      surface === "customer" || undefined
                    }
                    data-tenant-surface={
                      surface === "customer" ? "card" : undefined
                    }
                  >
                    {t("thinking")}
                  </span>
                </div>
              ) : null}
              {error ? (
                <p className="rounded-[13px] border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              ) : null}
              {handoff ? (
                <div
                  className="rounded-[15px] border border-coral-200 bg-coral-50 p-3"
                  data-customer-concierge-handoff={
                    surface === "customer" || undefined
                  }
                  data-tenant-surface={
                    surface === "customer" ? "card" : undefined
                  }
                >
                  <p className="flex items-center gap-2 text-xs font-semibold text-terracotta-800">
                    <UserIcon className="h-4 w-4" />
                    {handoff.title ?? t("handoff.title")}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-terracotta-700">
                    {handoff.description ?? t("handoff.description")}
                  </p>
                  {handoffHref ? (
                    <a
                      href={handoffHref}
                      data-tenant-button={
                        surface === "customer" ? "primary" : undefined
                      }
                      className="mt-2 inline-flex min-h-11 items-center rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-terracotta-700 ring-1 ring-inset ring-coral-200"
                    >
                      {handoff.label ?? t("handoff.action")}
                    </a>
                  ) : null}
                </div>
              ) : null}
              <div ref={endRef} />
            </div>

            <form
              data-concierge-form
              data-ui-unstyled="true"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
              className="border-t border-line/80 bg-white p-2.5 sm:p-3"
              data-customer-concierge-form={surface === "customer" || undefined}
            >
              <div
                className="flex min-h-14 items-end gap-1.5 rounded-[16px] border border-line/80 bg-sand-50/60 p-1.5 transition focus-within:border-cobalt-300 focus-within:ring-[3px] focus-within:ring-cobalt-100/60"
                data-tenant-surface={
                  surface === "customer" ? "field" : undefined
                }
              >
                <label className="min-w-0 flex-1">
                  <span className="sr-only">{t("inputLabel")}</span>
                  <textarea
                    ref={inputRef}
                    data-concierge-input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        submit();
                      }
                    }}
                    rows={1}
                    maxLength={2000}
                    aria-describedby={composerHintId}
                    placeholder={t("placeholder")}
                    className="scrollbar-subtle block min-h-10 max-h-14 w-full resize-none border-0 bg-transparent px-2.5 py-2 text-base leading-6 text-ink placeholder:text-ink-subtle focus:ring-0 sm:text-sm"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!input.trim() || isSending}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cobalt-500 text-white transition hover:bg-cobalt-600 disabled:opacity-40"
                  data-concierge-send
                  data-customer-concierge-send={
                    surface === "customer" || undefined
                  }
                  aria-label={t("send")}
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </button>
              </div>
              <p
                id={composerHintId}
                className="mt-1.5 px-1 text-[10px] leading-4 text-ink-subtle/80"
                data-concierge-disclaimer
                data-customer-concierge-muted={
                  surface === "customer" || undefined
                }
              >
                {t("disclaimer")}
              </p>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
