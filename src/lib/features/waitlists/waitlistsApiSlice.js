import { apiSlice } from "@/lib/features/api/apiSlice";
import { isStudioCommerceCurrency } from "@/config/currencies";
import { resolveRolloutEligibleLocaleCode } from "@/i18n/locales";
import { minorUnitsToMajor } from "@/utils/money";
import { encodeTenantSlugPathSegment } from "@/utils/tenantRouting";

export const WAITLIST_STATES = Object.freeze({
  WAITING: "waiting",
  OFFERED: "offered",
  PAYMENT_PENDING: "payment_pending",
  CONFIRMED: "confirmed",
  DECLINED: "declined",
  EXPIRED: "expired",
  WITHDRAWN: "withdrawn",
  CANCELLED: "cancelled",
});

const WAITLIST_STATE_VALUES = new Set(Object.values(WAITLIST_STATES));
const TOKEN_PATTERN = /^[A-Za-z0-9._~-]{32,256}$/;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const PARTICIPANT_CANCELLATION_REASON_MAX_LENGTH = 500;

const asRecord = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const asString = (value) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";

const asWaitlistLocale = (value) =>
  resolveRolloutEligibleLocaleCode(asString(value));

const asIsoDate = (value) => {
  const candidate = asString(value);
  return candidate && Number.isFinite(new Date(candidate).getTime())
    ? candidate
    : null;
};

const asNonNegativeInteger = (value, fallback = null) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
};

const asBoundedInteger = (value, { minimum, maximum, fallback }) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;

  return Math.min(maximum, Math.max(minimum, Math.floor(number)));
};

export const getSafeWaitlistToken = (value) => {
  const token = asString(value);
  return TOKEN_PATTERN.test(token) ? token : "";
};

const normalizePriceSnapshot = (value) => {
  const snapshot = asRecord(value);
  const amount = Number(snapshot.amount);
  const currency = asString(snapshot.currency).toUpperCase();
  const version = asString(snapshot.version);

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !/^[A-Z]{3}$/.test(currency) ||
    !version
  ) {
    return null;
  }

  return { amount, currency, version };
};

export const normalizeWaitlistRefundSummary = (value) => {
  const refund = asRecord(value);
  const amount = refund.amount;
  const amountMinor = refund.amountMinor;
  const currency =
    typeof refund.currency === "string"
      ? refund.currency.trim().toUpperCase()
      : "";
  const refundedAt =
    typeof refund.refundedAt === "string" ? refund.refundedAt.trim() : "";
  const refundedDate = new Date(refundedAt);
  const validAmounts =
    typeof amount === "number" &&
    Number.isFinite(amount) &&
    amount >= 0 &&
    typeof amountMinor === "number" &&
    Number.isSafeInteger(amountMinor) &&
    amountMinor >= 0;
  const expectedAmount =
    validAmounts && isStudioCommerceCurrency(currency)
      ? minorUnitsToMajor(amountMinor, currency)
      : null;
  const amountTolerance =
    expectedAmount === null
      ? 0
      : Number.EPSILON *
        Math.max(1, Math.abs(amount), Math.abs(expectedAmount)) *
        4;

  if (
    !validAmounts ||
    !isStudioCommerceCurrency(currency) ||
    !refundedAt ||
    !Number.isFinite(refundedDate.getTime()) ||
    refundedDate.getTime() <= 0 ||
    expectedAmount === null ||
    Math.abs(amount - expectedAmount) > amountTolerance
  ) {
    return null;
  }

  return {
    amount,
    amountMinor,
    currency,
    refundedAt: refundedDate.toISOString(),
  };
};

const normalizeSessionSummary = (value) => {
  const session = asRecord(value);
  const id = asString(session.id ?? session._id ?? session.sessionId);

  if (!id) return null;

  return {
    id,
    title: asString(session.title ?? session.name ?? session.productName),
    start: asIsoDate(session.start),
    end: asIsoDate(session.end),
    locationName: asString(
      asRecord(session.location).name ?? session.locationName,
    ),
  };
};

export const normalizeWaitlistEntry = (
  value,
  { includePosition = false } = {},
) => {
  const entry = asRecord(value);
  const id = asString(entry.id ?? entry._id);
  const sessionId = asString(
    entry.sessionId ?? entry.courseSessionId ?? asRecord(entry.session).id,
  );
  const state = asString(entry.state ?? entry.status).toLowerCase();

  if (!id || !sessionId || !WAITLIST_STATE_VALUES.has(state)) return null;

  const refund = [WAITLIST_STATES.EXPIRED, WAITLIST_STATES.CANCELLED].includes(
    state,
  )
    ? normalizeWaitlistRefundSummary(entry.refund)
    : null;

  return {
    id,
    sessionId,
    state,
    // Exact queue order is intentionally omitted from customer/guest DTOs.
    ...(includePosition
      ? { position: asNonNegativeInteger(entry.position, null) }
      : {}),
    joinedAt: asIsoDate(entry.joinedAt ?? entry.createdAt),
    offerExpiresAt: asIsoDate(entry.offerExpiresAt),
    price: normalizePriceSnapshot(entry.price),
    session: normalizeSessionSummary(entry.session),
    ...(refund ? { refund } : {}),
  };
};

const normalizeCustomerIdentity = (value) => {
  const customer = asRecord(value);
  return {
    name: asString(
      customer.name ??
        customer.displayName ??
        [customer.firstName, customer.lastName].filter(Boolean).join(" "),
    ),
    email: asString(customer.email).toLowerCase(),
  };
};

export const normalizeAdminWaitlistEntry = (value) => {
  const entry = normalizeWaitlistEntry(value, { includePosition: true });
  if (!entry) return null;

  const source = asRecord(value);
  return {
    ...entry,
    customer: normalizeCustomerIdentity(
      source.customer ?? source.user ?? source.contact,
    ),
  };
};

export const normalizeMyWaitlistResponse = (response) => {
  const payload = asRecord(response?.data ?? response);
  const source = Array.isArray(payload.entries)
    ? payload.entries
    : payload.entry
      ? [payload.entry]
      : [];

  return {
    entries: source
      .map((entry) => normalizeWaitlistEntry(entry))
      .filter(Boolean),
  };
};

export const normalizeWaitlistMutationResponse = (response) => {
  const payload = asRecord(response?.data ?? response);
  return {
    entry: normalizeWaitlistEntry(payload.entry),
    verificationRequired: payload.verificationRequired === true,
    managementToken: getSafeWaitlistToken(payload.managementToken),
  };
};

export const normalizeWaitlistOffer = (response) => {
  const payload = asRecord(response?.data ?? response);
  const offer = asRecord(payload.offer);
  const entryId = asString(offer.entryId);
  const sessionId = asString(offer.sessionId);

  if (!entryId || !sessionId) return null;

  const state = [
    WAITLIST_STATES.OFFERED,
    WAITLIST_STATES.PAYMENT_PENDING,
  ].includes(asString(offer.state).toLowerCase())
    ? asString(offer.state).toLowerCase()
    : WAITLIST_STATES.OFFERED;

  return {
    entryId,
    sessionId,
    state,
    expiresAt: asIsoDate(offer.expiresAt),
    guestCheckoutAllowed: offer.guestCheckoutAllowed === true,
    requiresAuthentication: offer.requiresAuthentication !== false,
    price: normalizePriceSnapshot(offer.price),
    session: normalizeSessionSummary(offer.session ?? payload.session),
  };
};

export const normalizeAdminWaitlistRoster = (response) => {
  const payload = asRecord(response?.data ?? response);
  const summary = asRecord(payload.summary);

  return {
    entries: (Array.isArray(payload.entries) ? payload.entries : [])
      .map(normalizeAdminWaitlistEntry)
      .filter(Boolean)
      .sort((left, right) => {
        const leftPosition = left.position ?? Number.MAX_SAFE_INTEGER;
        const rightPosition = right.position ?? Number.MAX_SAFE_INTEGER;
        return leftPosition - rightPosition;
      }),
    summary: {
      booked: asNonNegativeInteger(summary.booked, 0),
      capacity: asNonNegativeInteger(summary.capacity, 0),
      waiting: asNonNegativeInteger(summary.waiting, 0),
      offered: asNonNegativeInteger(summary.offered, 0),
    },
  };
};

export const normalizeWaitlistSettings = (response) => {
  const payload = asRecord(response?.data ?? response);
  const settings = asRecord(payload.settings ?? payload);

  return {
    enabled: settings.enabled === true,
    autoPromote: settings.autoPromote !== false,
    offerWindowHours: asBoundedInteger(settings.offerWindowHours, {
      minimum: 1,
      maximum: 168,
      fallback: 24,
    }),
    cutoffHours: asBoundedInteger(settings.cutoffHours, {
      minimum: 0,
      maximum: 168,
      fallback: 2,
    }),
  };
};

const publicWaitlistBase = (tenantSlug) =>
  `/public/tenants/${encodeTenantSlugPathSegment(tenantSlug)}/waitlist`;

const entryPath = (entryId) =>
  `/waitlist/entries/${encodeURIComponent(asString(entryId))}`;

const adminWaitlistPath = (sessionId, entryId = "") => {
  const base = `/bookings/${encodeURIComponent(asString(sessionId))}/waitlist`;
  return entryId ? `${base}/${encodeURIComponent(asString(entryId))}` : base;
};

const courseParticipantCancellationPath = (sessionId, orderId) =>
  `/bookings/${encodeURIComponent(
    asString(sessionId),
  )}/participants/${encodeURIComponent(asString(orderId))}`;

export const buildCourseParticipantCancellationRequest = (value) => {
  const input = asRecord(value);
  const sessionId = asString(input.sessionId);
  const orderId = asString(input.orderId);
  const reason = asString(input.reason);

  if (!OBJECT_ID_PATTERN.test(sessionId)) {
    throw new TypeError("A valid course session ID is required.");
  }
  if (!OBJECT_ID_PATTERN.test(orderId)) {
    throw new TypeError("A valid course order ID is required.");
  }
  if (!reason || reason.length > PARTICIPANT_CANCELLATION_REASON_MAX_LENGTH) {
    throw new TypeError(
      "A cancellation reason of 1 to 500 characters is required.",
    );
  }

  return {
    url: courseParticipantCancellationPath(sessionId, orderId),
    method: "DELETE",
    body: { reason },
  };
};

export const normalizeCourseParticipantCancellationResponse = (response) => {
  const payload = asRecord(response?.data ?? response);
  const refund = asRecord(payload.refund);
  const amount = Number(refund.amount);
  const amountMinor = Number(refund.amountMinor);
  const currency = asString(refund.currency).toUpperCase();

  return {
    sessionId: asString(payload.sessionId),
    orderId: asString(payload.orderId),
    removedParticipants: asNonNegativeInteger(payload.removedParticipants, 0),
    idempotent: payload.idempotent === true,
    refund: {
      amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
      amountMinor:
        Number.isSafeInteger(amountMinor) && amountMinor >= 0 ? amountMinor : 0,
      currency: /^[A-Z]{3}$/.test(currency) ? currency : "",
      method: asString(refund.method),
      newBalance:
        Number.isFinite(Number(refund.newBalance)) &&
        Number(refund.newBalance) >= 0
          ? Number(refund.newBalance)
          : null,
    },
  };
};

export const waitlistsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyWaitlists: builder.query({
      query: ({ sessionId } = {}) => ({
        url: "/waitlist/mine",
        params: sessionId ? { sessionId } : undefined,
      }),
      transformResponse: normalizeMyWaitlistResponse,
      providesTags: (result) => [
        { type: "Waitlist", id: "MINE" },
        ...(result?.entries ?? []).map((entry) => ({
          type: "Waitlist",
          id: entry.id,
        })),
      ],
    }),

    joinWaitlist: builder.mutation({
      query: ({ sessionId, locale }) => ({
        url: "/waitlist/entries",
        method: "POST",
        body: { sessionId, locale: asWaitlistLocale(locale) },
      }),
      transformResponse: normalizeWaitlistMutationResponse,
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: "Waitlist", id: "MINE" },
        { type: "PublicBooking", id: `COURSE_SESSION:${sessionId}` },
      ],
    }),

    leaveWaitlist: builder.mutation({
      query: ({ entryId }) => ({
        url: entryPath(entryId),
        method: "DELETE",
      }),
      transformResponse: normalizeWaitlistMutationResponse,
      invalidatesTags: (result, _error, { entryId }) => [
        { type: "Waitlist", id: "MINE" },
        { type: "Waitlist", id: entryId },
        ...(result?.entry?.sessionId
          ? [
              {
                type: "PublicBooking",
                id: `COURSE_SESSION:${result.entry.sessionId}`,
              },
            ]
          : []),
      ],
    }),

    checkoutWaitlistOffer: builder.mutation({
      query: ({ entryId, sessionId: _sessionId, ...checkout }) => ({
        url: `${entryPath(entryId)}/checkout`,
        method: "POST",
        body: checkout,
      }),
      invalidatesTags: (result, _error, { entryId, sessionId }) => [
        { type: "Waitlist", id: "MINE" },
        { type: "Waitlist", id: entryId },
        { type: "Booking", id: "MINE" },
        ...(result?.entry?.sessionId || sessionId
          ? [
              {
                type: "PublicBooking",
                id: `COURSE_SESSION:${result?.entry?.sessionId || sessionId}`,
              },
            ]
          : []),
      ],
    }),

    requestGuestWaitlistVerification: builder.mutation({
      query: ({
        tenantSlug,
        sessionId,
        email,
        firstName,
        lastName,
        locale,
      }) => ({
        url: `${publicWaitlistBase(tenantSlug)}/entries`,
        method: "POST",
        credentials: "omit",
        body: {
          sessionId,
          email,
          firstName,
          lastName,
          locale: asWaitlistLocale(locale),
        },
      }),
      transformResponse: normalizeWaitlistMutationResponse,
    }),

    verifyGuestWaitlist: builder.mutation({
      query: ({ tenantSlug, token }) => ({
        url: `${publicWaitlistBase(tenantSlug)}/verify`,
        method: "POST",
        credentials: "omit",
        body: { token: getSafeWaitlistToken(token) },
      }),
      transformResponse: normalizeWaitlistMutationResponse,
    }),

    manageGuestWaitlist: builder.mutation({
      query: ({ tenantSlug, token }) => ({
        url: `${publicWaitlistBase(tenantSlug)}/manage`,
        method: "POST",
        credentials: "omit",
        body: { token: getSafeWaitlistToken(token) },
      }),
      transformResponse: normalizeWaitlistMutationResponse,
    }),

    withdrawGuestWaitlist: builder.mutation({
      query: ({ tenantSlug, token }) => ({
        url: `${publicWaitlistBase(tenantSlug)}/withdraw`,
        method: "POST",
        credentials: "omit",
        body: { token: getSafeWaitlistToken(token) },
      }),
      transformResponse: normalizeWaitlistMutationResponse,
      invalidatesTags: (result) =>
        result?.entry?.sessionId
          ? [
              {
                type: "PublicBooking",
                id: `COURSE_SESSION:${result.entry.sessionId}`,
              },
            ]
          : [],
    }),

    inspectWaitlistOffer: builder.mutation({
      query: ({ tenantSlug, token }) => ({
        url: `${publicWaitlistBase(tenantSlug)}/offers/inspect`,
        method: "POST",
        credentials: "omit",
        body: { token: getSafeWaitlistToken(token) },
      }),
      transformResponse: normalizeWaitlistOffer,
    }),

    checkoutGuestWaitlistOffer: builder.mutation({
      query: ({ tenantSlug, token, email, checkout }) => ({
        url: `${publicWaitlistBase(tenantSlug)}/offers/checkout`,
        method: "POST",
        credentials: "omit",
        body: { token: getSafeWaitlistToken(token), email, checkout },
      }),
    }),

    getAdminWaitlistRoster: builder.query({
      query: ({ sessionId }) => adminWaitlistPath(sessionId),
      transformResponse: normalizeAdminWaitlistRoster,
      providesTags: (_result, _error, { sessionId }) => [
        { type: "Waitlist", id: `ADMIN:${sessionId}` },
      ],
    }),

    getAdminWaitlistSettings: builder.query({
      query: ({ sessionId }) => `${adminWaitlistPath(sessionId)}/settings`,
      transformResponse: normalizeWaitlistSettings,
      providesTags: (_result, _error, { sessionId }) => [
        { type: "Waitlist", id: `SETTINGS:${sessionId}` },
      ],
    }),

    updateAdminWaitlistSettings: builder.mutation({
      query: ({ sessionId, settings }) => ({
        url: `${adminWaitlistPath(sessionId)}/settings`,
        method: "PATCH",
        body: settings,
      }),
      transformResponse: normalizeWaitlistSettings,
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: "Waitlist", id: `SETTINGS:${sessionId}` },
        { type: "Waitlist", id: `ADMIN:${sessionId}` },
        { type: "PublicBooking", id: `COURSE_SESSION:${sessionId}` },
      ],
    }),

    promoteAdminWaitlistEntry: builder.mutation({
      query: ({ sessionId, entryId, reason, overrideFifo = false }) => ({
        url: `${adminWaitlistPath(sessionId, entryId)}/promote`,
        method: "POST",
        body: { reason, overrideFifo },
      }),
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: "Waitlist", id: `ADMIN:${sessionId}` },
        { type: "PublicBooking", id: `COURSE_SESSION:${sessionId}` },
      ],
    }),

    resendAdminWaitlistOffer: builder.mutation({
      query: ({ sessionId, entryId, reason }) => ({
        url: `${adminWaitlistPath(sessionId, entryId)}/resend`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: "Waitlist", id: `ADMIN:${sessionId}` },
        { type: "PublicBooking", id: `COURSE_SESSION:${sessionId}` },
      ],
    }),

    removeAdminWaitlistEntry: builder.mutation({
      query: ({ sessionId, entryId, reason }) => ({
        url: adminWaitlistPath(sessionId, entryId),
        method: "DELETE",
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: "Waitlist", id: `ADMIN:${sessionId}` },
        { type: "PublicBooking", id: `COURSE_SESSION:${sessionId}` },
      ],
    }),

    cancelCourseOrderParticipants: builder.mutation({
      query: buildCourseParticipantCancellationRequest,
      transformResponse: normalizeCourseParticipantCancellationResponse,
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: "Booking", id: "LIST" },
        { type: "Booking", id: sessionId },
        { type: "Order", id: "LIST" },
        { type: "Waitlist", id: `ADMIN:${sessionId}` },
        { type: "PublicBooking", id: `COURSE_SESSION:${sessionId}` },
        "Credits",
        "CreditTransactions",
      ],
    }),
  }),
});

export const {
  useGetMyWaitlistsQuery,
  useJoinWaitlistMutation,
  useLeaveWaitlistMutation,
  useCheckoutWaitlistOfferMutation,
  useRequestGuestWaitlistVerificationMutation,
  useVerifyGuestWaitlistMutation,
  useManageGuestWaitlistMutation,
  useWithdrawGuestWaitlistMutation,
  useInspectWaitlistOfferMutation,
  useCheckoutGuestWaitlistOfferMutation,
  useGetAdminWaitlistRosterQuery,
  useGetAdminWaitlistSettingsQuery,
  useUpdateAdminWaitlistSettingsMutation,
  usePromoteAdminWaitlistEntryMutation,
  useResendAdminWaitlistOfferMutation,
  useRemoveAdminWaitlistEntryMutation,
  useCancelCourseOrderParticipantsMutation,
} = waitlistsApiSlice;
