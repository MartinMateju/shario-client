"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getBookingEditorHref } from "@/components/bookings/bookingEditor.utils";

// Retained for older consumers: all editing now uses the dedicated workflow.
export default function EditBookingForm({ booking = {} }) {
  const t = useTranslations("BookingEditor");
  const id = booking.id || booking._id;
  if (!id) return null;
  return <Link href={getBookingEditorHref(id)}>{t("title")}</Link>;
}
