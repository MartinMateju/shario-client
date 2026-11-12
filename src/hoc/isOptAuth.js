"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import { useRouter } from "@/i18n/navigation";
import {
  selectCurrentOptToken,
  selectPasswordResetNextPath,
} from "@/lib/features/pass/passSlice";
import { getSafeTenantNextPath } from "@/utils/tenantAuthRouting";

const isOptAuth = (WrappedComponent) => {
  // eslint-disable-next-line react/display-name
  return (props) => {
    const token = useSelector(selectCurrentOptToken);
    const router = useRouter();
    const searchParams = useSearchParams();
    const source =
      searchParams.get("source") === "platform" ? "platform" : "customer";
    const nextPath = getSafeTenantNextPath(
      useSelector(selectPasswordResetNextPath),
      "/portal",
    );

    useEffect(() => {
      if (!token) {
        router.replace(
          source === "platform"
            ? "/password?source=platform"
            : `/password?next=${encodeURIComponent(nextPath)}`,
        );
      }
    }, [nextPath, router, source, token]);

    if (!token) return null;

    return <WrappedComponent {...props} />;
  };
};

export default isOptAuth;
