import { Suspense } from "react";

import MembershipCheckoutSuccess from "@/components/memberships/MembershipCheckoutSuccess";

export default function MembershipCheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <MembershipCheckoutSuccess />
    </Suspense>
  );
}
