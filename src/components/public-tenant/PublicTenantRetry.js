"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function PublicTenantRetry() {
  const router = useRouter();
  const t = useTranslations("PublicTenant.unavailable");
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-current px-5 py-2 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? t("retrying") : t("retry")}
    </button>
  );
}
