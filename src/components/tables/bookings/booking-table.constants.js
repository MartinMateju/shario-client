export const DEFAULT_PAGE_SIZE = 10;

export const PAGE_SIZE_OPTIONS = [10, 20, 50];

export const BOOKING_VIEWS = ["all", "today", "awaitingPayment", "cancelled"];

export const INITIAL_BOOKING_FILTERS = {
  futureOnly: true,
  search: "",
  dateFrom: "",
  dateTo: "",
  lecturerName: "",
  productId: "",
  authorId: "",
  locationId: "",
  paymentStatus: "",
  status: "",
};

// These are persisted Booking.paymentStatus values. Credits are a payment
// method, and refunds are recorded separately from this booking field.
export const PAYMENT_STATUS_OPTIONS = [
  { value: "PENDING_PAYMENT", labelKey: "payment.pending" },
  { value: "CONFIRMED", labelKey: "payment.paid" },
  { value: "FAILED", labelKey: "payment.failed" },
  { value: "EXPIRED", labelKey: "payment.expired" },
];

export const BOOKING_STATUS_OPTIONS = [
  { value: "pending", labelKey: "status.pending" },
  { value: "processed", labelKey: "status.processed" },
  { value: "delivered", labelKey: "status.delivered" },
  { value: "completed", labelKey: "status.completed" },
  { value: "cancelled", labelKey: "status.cancelled" },
];

export const ACTIVITY_TONES = [
  "bg-brand-accent",
  "bg-[#D7A94A]",
  "bg-brand-primary",
  "bg-[#E56691]",
  "bg-[#71805A]",
];
