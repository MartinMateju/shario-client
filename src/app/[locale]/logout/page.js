"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useDispatch } from "react-redux";

import { useSendLogoutMutation } from "@/lib/features/auth/authApiSlice";
import { logOut } from "@/lib/features/auth/authSlice";
import { apiSlice } from "@/lib/features/api/apiSlice";
import { buildPlatformUrl } from "@/utils/tenantRouting";

export default function PlatformLogoutPage() {
  const locale = useLocale();
  const t = useTranslations("Common");
  const dispatch = useDispatch();
  const [sendLogout] = useSendLogoutMutation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;

    /*
     * This page runs on the central platform origin. It clears the separate
     * central Redux/localStorage context and revokes the shared refresh
     * session before exposing the login form again.
     */
    dispatch(logOut());
    dispatch(apiSlice.util.resetApiState());

    sendLogout()
      .unwrap()
      .catch(() => {
        // Client authentication is still cleared when the API is unavailable.
      })
      .finally(() => {
        window.location.replace(
          buildPlatformUrl({
            locale,
            pathname: "/login",
          }),
        );
      });
  }, [dispatch, locale, sendLogout]);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#FAF8F4] px-6 text-[#11110F]">
      <p aria-live="polite" className="text-sm text-[#62625D]">
        {t("signingOut")}
      </p>
    </main>
  );
}
