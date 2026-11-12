"use client";

import { useEffect } from "react";

import CustomerShellStatus from "./CustomerShellStatus";

export default function CustomerShellError({ error, reset }) {
  useEffect(() => {
    console.error("Customer shell route failed:", error);
  }, [error]);

  return <CustomerShellStatus kind="error" onRetry={reset} />;
}
