import { Suspense } from "react";

import CustomerBookingConfirmationPage from "@/components/bookings/CustomerBookingConfirmationPage";

export default function BookingConfirmationRoute() {
  return (
    <Suspense fallback={null}>
      <CustomerBookingConfirmationPage />
    </Suspense>
  );
}
