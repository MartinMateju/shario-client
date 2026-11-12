"use client";

import { useEffect } from "react";

import { useRouter } from "@/i18n/navigation";

export default function CommercePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/app/finance");
  }, [router]);

  return null;
}
