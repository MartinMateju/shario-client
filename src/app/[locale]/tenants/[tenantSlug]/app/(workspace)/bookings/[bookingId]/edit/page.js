import PermissionBoundary from "@/components/auth/PermissionBoundary";
import BookingEditorPage from "@/components/bookings/BookingEditorPage";
import { PERMISSIONS } from "@/config/permissions";

export default async function EditTenantBookingPage({ params }) {
  const { bookingId } = await params;
  return (
    <PermissionBoundary permission={PERMISSIONS.BOOKINGS_UPDATE}>
      <BookingEditorPage bookingId={bookingId} />
    </PermissionBoundary>
  );
}
