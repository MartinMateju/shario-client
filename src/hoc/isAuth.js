"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";

import { Link, useRouter } from "@/i18n/navigation";
import { selectIsAuthenticated } from "@/lib/features/auth/authSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import translation from "@/translations/translation";

const isAuth = (WrappedComponent) => {
  return function WithAuth(props) {
    const router = useRouter();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const language = useSelector(selectCurrentLanguage);

    // If not authenticated, show the page and auto-redirect after a moment
    useEffect(() => {
      if (isAuthenticated) return;

      // const timer = setTimeout(() => {
      //   router.replace("/login");
      // }, 6000);

      // return () => clearTimeout(timer);
    }, [isAuthenticated, router]);

    if (!isAuthenticated) {
      return (
        <div className="flex h-screen items-center justify-center bg-[#F7F5F2] px-6">
          <div className="w-full max-w-md rounded-xl bg-[#F7F5F2] border border-[var(--unnamed-color-b3a192)] p-8 text-center shadow-sm">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-900">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v3.75m0 3h.007M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1 className="mb-2  text-2xl text-gray-900">
              {translation["LOGOUT_MSG_1"][language]}
            </h1>

            <p className="mb-4 text-base text-gray-600">
              {translation["LOGOUT_MSG_2"][language]}
            </p>

            <p className="mb-6 text-sm text-gray-500">
              {translation["LOGOUT_MSG_3"][language]}
            </p>

            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-full bg-gray-900 px-4 py-3  text-white transition hover:bg-gray-800"
            >
              Přihlásit se znovu
            </Link>

            <p className="mt-4 text-xs text-gray-400">
              Budete automaticky přesměrováni za několik sekund…
            </p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

export default isAuth;
