"use client";

import {
  Dialog,
  DialogDescription,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { EnvelopeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useDispatch } from "react-redux";

import InputOTP from "@/components/otp/InputOtp";
import { usePublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";
import { PASSWORD_RESET_OTP_LENGTH } from "@/config/constants";
import { useRouter } from "@/i18n/navigation";
import {
  useRequestPassResetMutation,
  useVerifyOtpMutation,
} from "@/lib/features/pass/passApiSlice";
import { setTempCredentials } from "@/lib/features/pass/passSlice";
import { getSafeTenantNextPath } from "@/utils/tenantAuthRouting";

const classNames = (...classes) => classes.filter(Boolean).join(" ");

const COPY = {
  cs: {
    close: "Zavřít ověření",
    continue: "Pokračovat",
    description: "Zadejte šestimístný kód, který jsme poslali na váš e-mail.",
    digit: (position) => `Číslice ověřovacího kódu ${position}`,
    expired: "Kód je neplatný nebo jeho platnost vypršela. Pošlete si nový.",
    generic: "Kód se nepodařilo ověřit. Zkuste to prosím znovu.",
    rateLimited: "Proběhlo příliš mnoho pokusů. Zkuste to znovu později.",
    resend: "Poslat nový kód",
    resendCountdown: (seconds) => `Nový kód můžete poslat za ${seconds} s`,
    resendError: "Nový kód se nepodařilo poslat. Zkuste to prosím znovu.",
    resending: "Odesíláme…",
    resent: "Nový kód jsme poslali na váš e-mail.",
    title: "Zkontrolujte svůj e-mail",
    verifying: "Ověřujeme…",
  },
  en: {
    close: "Close verification",
    continue: "Continue",
    description: "Enter the six-digit code we sent to your email address.",
    digit: (position) => `Verification code digit ${position}`,
    expired: "This code is invalid or has expired. Request a new one.",
    generic: "We could not verify the code. Please try again.",
    rateLimited: "There have been too many attempts. Please try again later.",
    resend: "Send a new code",
    resendCountdown: (seconds) =>
      `You can send a new code in ${seconds} seconds`,
    resendError: "We could not send a new code. Please try again.",
    resending: "Sending…",
    resent: "We sent a new code to your email address.",
    title: "Check your email",
    verifying: "Verifying…",
  },
};

const getErrorMessage = (error, copy) => {
  if (
    !error?.status ||
    error.status === "FETCH_ERROR" ||
    error.status === "TIMEOUT_ERROR"
  ) {
    return copy.generic;
  }

  if (error.status === 401) return copy.expired;
  if (error.status === 429) return copy.rateLimited;
  return copy.generic;
};

export default function OTPModal({
  buttonText = "",
  contentText = "",
  email = "",
  headerText = "",
  nextPath = "/portal",
  onClose = () => {},
  resendCooldownSeconds = 30,
  source = "customer",
  tenantSlug = "",
}) {
  const locale = useLocale();
  const copy = COPY[locale === "cs" ? "cs" : "en"];
  const { tenant } = usePublicTenant();
  const tenantTheme = getPublicTenantTheme(tenant);
  const [verifyOtp, verifyState] = useVerifyOtpMutation();
  const [requestReset, resendState] = useRequestPassResetMutation();
  const router = useRouter();
  const dispatch = useDispatch();

  const [open, setOpen] = useState(true);
  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const cooldownSeconds = Math.max(
    0,
    Math.round(Number(resendCooldownSeconds) || 0),
  );
  const [resendCooldown, setResendCooldown] = useState(cooldownSeconds);
  const [resetKey, setResetKey] = useState(0);
  const safeNextPath = getSafeTenantNextPath(nextPath, "/portal");
  const isPlatformSource = source === "platform";
  const isBusy = verifyState.isLoading || resendState.isLoading;

  const isOtpReady = useMemo(() => {
    const cleanOtp = String(otp || "").replace(/\D/g, "");
    return cleanOtp.length === PASSWORD_RESET_OTP_LENGTH;
  }, [otp]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;

    const timeout = window.setTimeout(
      () => setResendCooldown((value) => Math.max(0, value - 1)),
      1000,
    );

    return () => window.clearTimeout(timeout);
  }, [resendCooldown]);

  const handleClose = () => {
    if (!isBusy) setOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isOtpReady || isBusy) return;

    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await verifyOtp({
        otp: String(otp || "").trim(),
        email,
        tenantSlug,
      }).unwrap();
      const resetToken = String(response?.resetToken || "").trim();

      if (!resetToken) {
        setErrorMessage(copy.generic);
        return;
      }

      dispatch(
        setTempCredentials({
          email,
          resetToken,
          nextPath: safeNextPath,
        }),
      );
      router.push(
        isPlatformSource
          ? "/password/reset?source=platform"
          : "/password/reset",
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, copy));
    }
  };

  const resend = async () => {
    if (resendCooldown > 0 || isBusy) return;

    setErrorMessage("");
    setStatusMessage("");

    try {
      await requestReset({
        tenantSlug,
        email,
        locale: locale === "cs" ? "cs" : "en",
      }).unwrap();
      setOtp("");
      setResetKey((value) => value + 1);
      setResendCooldown(cooldownSeconds);
      setStatusMessage(copy.resent);
    } catch (error) {
      setErrorMessage(
        error?.status === 429 ? copy.rateLimited : copy.resendError,
      );
    }
  };

  return (
    <Transition show={open} as={Fragment} afterLeave={onClose}>
      <Dialog
        as="div"
        className="relative z-[110]"
        data-tenant-style={tenantTheme.resolvedStylePresetId}
        onClose={handleClose}
        style={tenantTheme.style}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200 motion-reduce:duration-0"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200 motion-reduce:duration-0"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            data-dialog-backdrop
            className="fixed inset-0 bg-[#171717]/35 backdrop-blur-[3px]"
          />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto overscroll-contain">
          <div className="flex min-h-full items-end justify-center sm:items-center sm:p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200 motion-reduce:duration-0"
              enterFrom="translate-y-4 opacity-0 sm:translate-y-0 sm:scale-[0.985] motion-reduce:transform-none"
              enterTo="translate-y-0 opacity-100 sm:scale-100"
              leave="ease-in duration-200 motion-reduce:duration-0"
              leaveFrom="translate-y-0 opacity-100 sm:scale-100"
              leaveTo="translate-y-4 opacity-0 sm:translate-y-0 sm:scale-[0.985] motion-reduce:transform-none"
            >
              <DialogPanel
                data-dialog-layout="compact"
                data-password-recovery-dialog
                data-tenant-surface="panel"
                style={{
                  "--dialog-border":
                    "color-mix(in srgb, var(--tenant-auth-form-text) 12%, transparent)",
                  "--dialog-surface":
                    "var(--tenant-auth-form-surface, var(--tenant-surface, #fff))",
                  "--dialog-text":
                    "var(--tenant-auth-form-text, var(--tenant-text-on-surface, #1f1f1f))",
                }}
                className={classNames(
                  "relative flex w-full max-w-md flex-col overflow-hidden border",
                  "max-h-[85dvh] rounded-t-[24px] sm:rounded-[24px]",
                  "border-[color-mix(in_srgb,var(--tenant-auth-form-text)_12%,transparent)]",
                  "bg-[var(--tenant-auth-form-surface,var(--tenant-surface,#fff))]",
                  "text-[var(--tenant-auth-form-text,var(--tenant-text-on-surface,#1f1f1f))]",
                  "shadow-[0_24px_80px_rgba(25,26,24,0.2)]",
                )}
                aria-busy={isBusy}
              >
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isBusy}
                  className={classNames(
                    "absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full",
                    "border border-[color-mix(in_srgb,var(--tenant-auth-form-text)_12%,transparent)] bg-[var(--tenant-auth-field-surface)]",
                    "text-[var(--tenant-auth-form-muted)] transition hover:text-[var(--tenant-auth-form-text)]",
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tenant-page-label-color)]/15",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                  aria-label={copy.close}
                >
                  <XMarkIcon aria-hidden="true" className="h-5 w-5" />
                </button>

                <form
                  data-ui-unstyled="true"
                  className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 sm:px-8 sm:pb-8 sm:pt-9"
                  onSubmit={handleSubmit}
                >
                  <div className="mx-auto flex max-w-[28rem] flex-col items-center text-center">
                    <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--tenant-accent)]/20 bg-[var(--tenant-accent)]/[0.07]">
                      <EnvelopeIcon
                        className="h-7 w-7 text-[var(--tenant-accent-link)]"
                        aria-hidden="true"
                      />
                    </div>

                    <DialogTitle
                      as="h2"
                      className="text-[22px] font-semibold leading-tight tracking-[-0.04em]"
                    >
                      {headerText || copy.title}
                    </DialogTitle>

                    <DialogDescription
                      id="password-reset-otp-description"
                      className="mt-3 max-w-sm text-sm leading-6 text-[var(--tenant-auth-form-muted)]"
                    >
                      {contentText || copy.description}
                    </DialogDescription>

                    {email ? (
                      <p className="mt-2 max-w-full break-all text-sm font-semibold">
                        {email}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-7">
                    <InputOTP
                      key={resetKey}
                      callback={setOtp}
                      descriptionId="password-reset-otp-description"
                      digitLabel={copy.digit}
                      length={PASSWORD_RESET_OTP_LENGTH}
                    />
                  </div>

                  <div className="mt-4 min-h-6 text-center">
                    {errorMessage ? (
                      <p
                        className="text-sm text-[var(--tenant-auth-form-error,var(--tenant-auth-form-text))]"
                        role="alert"
                      >
                        {errorMessage}
                      </p>
                    ) : statusMessage ? (
                      <p
                        className="text-sm text-[var(--tenant-auth-form-muted)]"
                        role="status"
                      >
                        {statusMessage}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-5">
                    <button
                      type="submit"
                      disabled={!isOtpReady || isBusy}
                      data-tenant-button="primary"
                      className="inline-flex min-h-[54px] w-full items-center justify-center rounded-full border border-[var(--tenant-accent)] bg-[var(--tenant-accent)] px-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-accent-foreground)] shadow-[0_14px_34px_rgba(25,26,24,0.14)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tenant-page-label-color)]/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none"
                    >
                      {verifyState.isLoading
                        ? copy.verifying
                        : buttonText || copy.continue}
                    </button>

                    <button
                      type="button"
                      onClick={resend}
                      disabled={resendCooldown > 0 || isBusy}
                      className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full px-3 text-center text-sm font-semibold text-[var(--tenant-auth-form-link)] underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-page-label-color)]/20 disabled:no-underline disabled:opacity-55"
                    >
                      {resendState.isLoading
                        ? copy.resending
                        : resendCooldown > 0
                          ? copy.resendCountdown(resendCooldown)
                          : copy.resend}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
