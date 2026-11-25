// The locale layout persists across navigation. Keep the namespaces used by
// public pages, authentication, marketing and their shared chrome here; private
// route layouts restore the complete catalogue with FullMessagesProvider.
// Server getTranslations() continues to use the complete request catalogue.
export const PUBLIC_CLIENT_MESSAGE_NAMESPACES = Object.freeze([
  "AI",
  "AccountSettings",
  "Calendar",
  "Common",
  "Communications",
  "CreditPurchaseStatus",
  "CustomerAuth",
  "CustomerCourses",
  "CustomerNotifications",
  "CustomerShell",
  "EmailVerification",
  "Header",
  "KnowledgeHub",
  "Legacy",
  "MarketingHome",
  "MarketingPages",
  "MarketingPlanComparison",
  "Memberships",
  "PaymentRefundResult",
  "PlatformAuth",
  "PricingDetails",
  "PublicSiteNotFound",
  "PublicTenant",
  "PublicTenantHome",
  "RefundReviews",
  "SharioMarketing",
  "StudioConcierge",
  "TeamInvitation",
  "TeamSettings",
  "UnifiedSettings",
  "VoucherPurchase",
  "VoucherShopping",
  "Waitlists",
]);

export function selectPublicClientMessages(messages) {
  return Object.fromEntries(
    PUBLIC_CLIENT_MESSAGE_NAMESPACES.map((namespace) => [
      namespace,
      messages[namespace],
    ]),
  );
}

export function selectPrivateClientMessages(messages) {
  return Object.fromEntries(
    Object.entries(messages).filter(
      ([namespace]) => !PUBLIC_CLIENT_MESSAGE_NAMESPACES.includes(namespace),
    ),
  );
}
