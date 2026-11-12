import { apiSlice } from "@/lib/features/api/apiSlice";
import {
  normalizeRolloutEligibleLocaleCode,
  resolveRolloutEligibleLocaleCode,
} from "@/i18n/locales";
import { encodeTenantSlugPathSegment } from "@/utils/tenantRouting";

const BOOKING_INTENT_TOKEN_PATTERN = /^[A-Za-z0-9._~-]{8,2048}$/;

export const getSafeBookingIntentToken = (value) => {
  const token = String(value ?? "").trim();
  return BOOKING_INTENT_TOKEN_PATTERN.test(token) ? token : "";
};

const normalizePaymentOption = (value, fallbackMethod = "") => {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : { available: value === true };
  const method = String(
    source.method ?? source.id ?? source.type ?? fallbackMethod,
  )
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");

  if (!["card", "money_credits", "membership_credits"].includes(method)) {
    return null;
  }

  return {
    ...source,
    method,
    optionId: String(
      source.optionId ??
        `${method}:${
          source.benefitKey ?? source.id ?? fallbackMethod ?? "default"
        }`,
    ),
    available:
      source.available !== false &&
      source.enabled !== false &&
      source.eligible !== false,
    availableUnits:
      typeof source.available === "number" && Number.isFinite(source.available)
        ? source.available
        : (source.availableUnits ?? null),
    coversTotal:
      source.coversTotal === true ||
      source.fullCoverage === true ||
      source.canAfford === true,
    balanceMinor: Number.isFinite(
      Number(
        source.balanceMinor ??
          source.availableMinor ??
          source.remainingMinor ??
          (source.availableMajor !== undefined
            ? Number(source.availableMajor) * 100
            : undefined),
      ),
    )
      ? Math.max(
          0,
          Math.floor(
            Number(
              source.balanceMinor ??
                source.availableMinor ??
                source.remainingMinor ??
                Number(source.availableMajor) * 100,
            ),
          ),
        )
      : null,
    label: String(source.label ?? "").trim(),
  };
};

export const normalizeBookingPaymentOptions = (value) => {
  const source = value?.paymentOptions ?? value?.payments ?? value;
  const options = Array.isArray(source)
    ? source.map((option) => normalizePaymentOption(option))
    : source && typeof source === "object"
      ? Object.entries(source).map(([method, option]) =>
          normalizePaymentOption(option, method),
        )
      : [];

  return options.filter(Boolean);
};

export const bookingPaymentOptionCoversTotal = (option, totalMinor) => {
  if (!option || option.available === false) return false;
  if (option.method === "card") return true;

  if (option.method === "membership_credits") {
    return option.coversTotal === true;
  }

  if (option.method === "money_credits") {
    return (
      option.coversTotal === true ||
      (Number.isFinite(Number(option.balanceMinor)) &&
        Number(option.balanceMinor) >= Number(totalMinor || 0))
    );
  }

  return false;
};

const normalizeMoney = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
};

const normalizeQuote = (value = {}) => {
  const quote =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const totalMinor = normalizeMoney(
    quote.totalMinor ??
      quote.totalAmountMinor ??
      quote.finalAmountMinor ??
      quote.amountDueMinor ??
      quote.grossAmountMinor ??
      quote.amountMinor ??
      (quote.totalMajor !== undefined
        ? Number(quote.totalMajor) * 100
        : undefined),
  );

  return {
    ...quote,
    currency: String(quote.currency ?? "CZK")
      .trim()
      .toUpperCase(),
    subtotalMinor: normalizeMoney(
      quote.subtotalMinor ??
        quote.subtotalAmountMinor ??
        quote.originalAmountMinor ??
        (quote.subtotalMajor !== undefined
          ? Number(quote.subtotalMajor) * 100
          : totalMinor),
    ),
    discountMinor: normalizeMoney(
      quote.discountMinor ??
        quote.discountAmountMinor ??
        quote.membershipDiscountMinor ??
        (quote.discountMajor !== undefined
          ? Number(quote.discountMajor) * 100
          : undefined),
    ),
    totalMinor,
    lines: Array.isArray(quote.lines)
      ? quote.lines
      : Array.isArray(quote.lineItems)
        ? quote.lineItems
        : [],
  };
};

export const normalizeBookingIntentResponse = (response) => {
  const payload = response?.data ?? response ?? {};
  const intent =
    payload.intent ?? payload.bookingIntent ?? payload.selection ?? {};
  const quoteSource = payload.quote ?? payload.pricing ?? intent.quote ?? {};
  const availability = payload.availability ?? intent.availability ?? {};
  const conflict =
    payload.conflict ??
    availability.conflict ??
    (availability.available === false
      ? {
          code: availability.code ?? payload.code ?? "BOOKING_UNAVAILABLE",
          message: availability.message ?? payload.message ?? "",
        }
      : null);

  return {
    token: getSafeBookingIntentToken(
      payload.token ??
        payload.intentToken ??
        payload.bookingIntentToken ??
        intent.token,
    ),
    expiresAt: payload.expiresAt ?? intent.expiresAt ?? null,
    intent: {
      ...intent,
      product: intent.product ?? payload.product ?? quoteSource.product ?? null,
      location:
        intent.location ?? payload.location ?? quoteSource.location ?? null,
      productId: String(
        intent.productId ??
          intent.product?.id ??
          intent.product?._id ??
          payload.productId ??
          "",
      ).trim(),
      locationId: String(
        intent.locationId ??
          intent.location?.id ??
          intent.location?._id ??
          payload.locationId ??
          "",
      ).trim(),
      courseSessionId: String(
        intent.courseSessionId ??
          intent.courseSlotId ??
          intent.sessionId ??
          payload.courseSlotId ??
          payload.courseSessionId ??
          "",
      ).trim(),
      start: intent.start ?? payload.start ?? "",
      end: intent.end ?? payload.end ?? "",
      quantity: Math.max(
        1,
        Number(intent.quantity ?? intent.numberOfGuests ?? payload.quantity) ||
          1,
      ),
      numberOfGuests: Math.max(
        1,
        Number(
          intent.numberOfGuests ??
            payload.numberOfGuests ??
            intent.quantity ??
            payload.quantity,
        ) || 1,
      ),
    },
    quote: normalizeQuote(quoteSource),
    availability: {
      ...availability,
      available:
        availability.available !== false &&
        payload.available !== false &&
        !conflict,
      alternatives: Array.isArray(availability.alternatives)
        ? availability.alternatives
        : Array.isArray(payload.alternatives)
          ? payload.alternatives
          : [],
    },
    conflict,
    terms: String(
      payload.terms?.text ??
        payload.terms ??
        intent.terms?.text ??
        intent.terms ??
        "",
    ).trim(),
    termsRequired:
      payload.termsRequired === true ||
      payload.terms?.required === true ||
      intent.termsRequired === true,
    paymentOptions: normalizeBookingPaymentOptions(payload),
  };
};

export const normalizeCreatedBookingIntent = (response) => {
  const normalized = normalizeBookingIntentResponse(response);
  return {
    ...normalized,
    token: getSafeBookingIntentToken(
      normalized.token ??
        response?.data?.token ??
        response?.token ??
        response?.intentToken,
    ),
  };
};

const publicBookingIntentsUrl = (tenantSlug) =>
  `/public/tenants/${encodeTenantSlugPathSegment(tenantSlug)}/booking-intents`;

const authenticatedBookingIntentUrl = (token) =>
  `/booking-intents/${encodeURIComponent(getSafeBookingIntentToken(token))}`;

const withBookingIntentLocale = (body, { required = false } = {}) => {
  const { locale: inputLocale, ...rest } = body;
  const locale = required
    ? resolveRolloutEligibleLocaleCode(inputLocale)
    : normalizeRolloutEligibleLocaleCode(inputLocale);

  return locale ? { ...rest, locale } : rest;
};

export const bookingIntentsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createPublicBookingIntent: builder.mutation({
      query: ({ tenantSlug, ...body }) => ({
        url: publicBookingIntentsUrl(tenantSlug),
        method: "POST",
        body: withBookingIntentLocale(body, { required: true }),
      }),
      transformResponse: normalizeCreatedBookingIntent,
    }),

    getBookingIntent: builder.query({
      query: ({ token }) => authenticatedBookingIntentUrl(token),
      transformResponse: normalizeBookingIntentResponse,
      providesTags: (_result, _error, { token }) => [
        { type: "BookingIntent", id: String(token) },
      ],
    }),

    checkoutBookingIntent: builder.mutation({
      query: ({
        token,
        idempotencyKey,
        paymentMethod,
        termsAccepted,
        locale,
        origin,
        membershipBenefitKey,
      }) => ({
        url: `${authenticatedBookingIntentUrl(token)}/checkout`,
        method: "POST",
        headers: idempotencyKey
          ? { "Idempotency-Key": idempotencyKey }
          : undefined,
        body: withBookingIntentLocale({
          paymentMethod,
          termsAccepted,
          locale,
          origin,
          ...(membershipBenefitKey ? { membershipBenefitKey } : {}),
        }),
      }),
      invalidatesTags: (_result, _error, { token }) => [
        { type: "BookingIntent", id: String(token) },
        { type: "Booking", id: "MINE" },
        { type: "Booking", id: "LIST" },
        "Credits",
        { type: "Membership", id: "MINE" },
        { type: "MembershipLedger", id: "MINE" },
      ],
    }),
  }),
});

export const {
  useCreatePublicBookingIntentMutation,
  useGetBookingIntentQuery,
  useCheckoutBookingIntentMutation,
} = bookingIntentsApiSlice;
