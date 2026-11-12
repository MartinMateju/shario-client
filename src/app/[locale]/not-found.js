"use client";

import PrimaryButton from "@/components/buttons/PrimaryButton";
import translation from "@/translations/translation";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { useSelector } from "react-redux";
import Link from "next/link";

export default function Custom404() {
  const language = useSelector(selectCurrentLanguage);
  return (
    <main className="grid min-h-full place-items-center bg-[#F7F5F2] px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-medium text-gray-900">404</h1>
        <h1 className="mt-4 text-3xl  tracking-tight text-gray-900 sm:text-5xl">
          {translation["HEADER_404"][language]}
        </h1>
        <p className="mt-6 text-base leading-7 text-gray-600">
          {translation["DESCRIPTION_404"][language]}
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="/">
            <PrimaryButton text={translation["BUTTON_404"][language]} />
          </Link>
        </div>
      </div>
    </main>
  );
}
