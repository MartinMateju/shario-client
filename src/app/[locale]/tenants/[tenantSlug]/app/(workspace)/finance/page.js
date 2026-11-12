"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";

import { useRouter } from "@/i18n/navigation";
import { getDefaultFinanceHref } from "@/components/finance/FinanceShell";
import {
  selectCurrentWorkspaceAccess,
  selectIsWorkspaceAccessResolved,
} from "@/lib/features/auth/authSlice";

export default function FinanceIndexPage() {
  const router = useRouter();
  const access = useSelector(selectCurrentWorkspaceAccess);
  const accessResolved = useSelector(selectIsWorkspaceAccessResolved);

  useEffect(() => {
    if (!accessResolved) return;
    router.replace(getDefaultFinanceHref(access));
  }, [access, accessResolved, router]);

  return null;
}
