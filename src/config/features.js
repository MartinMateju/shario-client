// Native Skab invoicing is paused for the MVP. Stripe payment receipts,
// membership billing documents, and the studio's Skab subscription are separate.
// Re-enabling requires this build-time flag AND NATIVE_INVOICES_ENABLED on the API.
export const NATIVE_INVOICES_ENABLED =
  process.env.NEXT_PUBLIC_NATIVE_INVOICES_ENABLED === "true";
