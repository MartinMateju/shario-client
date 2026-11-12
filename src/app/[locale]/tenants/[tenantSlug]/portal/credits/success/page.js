"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useRouter } from "@/i18n/navigation";

export default function LegacyCreditSuccessRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString();

  useEffect(() => {
    router.replace(
      queryString
        ? `/portal/credits/purchase-success?${queryString}`
        : "/portal/credits/purchase-success",
    );
  }, [queryString, router]);

  return (
    <main
      className="flex min-h-[72vh] items-center justify-center bg-[var(--tenant-background)] text-[var(--tenant-text)] px-4"
      role="status"
      aria-label="Verifying credit purchase"
    >
      <ArrowPathIcon
        className="h-7 w-7 animate-spin text-[var(--tenant-accent-link)]"
        aria-hidden="true"
      />
    </main>
  );
}
