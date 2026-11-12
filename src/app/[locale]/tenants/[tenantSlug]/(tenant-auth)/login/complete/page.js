import { Suspense } from "react";

import CustomerSocialAuthComplete from "@/components/auth/CustomerSocialAuthComplete";

export default function CustomerSocialAuthCompletePage() {
  return (
    <Suspense fallback={null}>
      <CustomerSocialAuthComplete />
    </Suspense>
  );
}
