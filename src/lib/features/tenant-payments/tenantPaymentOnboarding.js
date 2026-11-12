export const TENANT_PAYMENT_SETUP_STEP = "payments";

export const buildTenantPaymentOnboardingBody = ({
  locale,
  setupStep,
} = {}) => ({
  ...(locale ? { locale } : {}),
  ...(setupStep === TENANT_PAYMENT_SETUP_STEP
    ? { setupStep: TENANT_PAYMENT_SETUP_STEP }
    : {}),
});
