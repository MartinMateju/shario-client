import PermissionBoundary from "@/components/auth/PermissionBoundary";
import BookingSessionComposer from "@/components/bookings/BookingSessionComposer";
import { PERMISSIONS } from "@/config/permissions";

export default function NewTenantBookingPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.BOOKINGS_CREATE}>
      <BookingSessionComposer />
    </PermissionBoundary>
  );
}
