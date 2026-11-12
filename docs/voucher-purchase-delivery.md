# Voucher purchase and delivery

The public voucher catalog collects the buyer's email, quantity, and an optional
gift message (240 characters). It shows the order total and the offering's
validity before redirecting to Stripe. A gift message appears on designed PDFs
and in the email; uploaded PDF templates retain their layout and receive the
message in the email only. Stripe handles payment. Skab owns voucher issuance,
delivery status, downloads, and resends.

## Shop entry points

The portal's Gift vouchers navigation opens `/portal/vouchers`. Signed-in
customers can buy a voucher there and access their redemption tools. Guests
opening that link go to `/vouchers`, where checkout accepts a buyer email without
requiring an account. Both redirects retain the locale and any location query.
Vouchers are tenant-wide, so the shop does not require selecting a studio first.

Existing `/portal?tab=vouchers` links redirect before the booking dashboard mounts.
The portal page switch and vouchers module still control signed-in access; the
public page visibility and public vouchers capability control guest access.

## Designed voucher appearance

The split design uses two equal halves: studio branding, message, voucher code
and expiry on the left, and a full-height photo on the right. The amount is not
printed; the stored voucher value and redemption rules are unchanged. Preview
and sample PDF come from the same server renderer as the purchased PDF.

The editor's first design control uploads or changes the right-side photo.
Fill panel crops its edges; Show the whole photo preserves the image with space
around it. Existing fit choices and separate logo uploads remain supported.
Removing a photo saves an empty image key and restores the decorative panel.
Failed replacement leaves the previous image selected. Asset changes persist
with the offering when staff save, using the existing design-asset endpoint.

## Optional postal delivery

Each offering defaults to digital delivery. Staff can enable postal delivery and
set a postage fee in the offering currency. The fee is stored in minor units,
including zero-decimal currencies, and charged once per order. It does not
increase any voucher's face value. Checkout defaults to digital and requires a
complete recipient name, street, city, postal code and ISO country for postal
delivery. The server derives the fee from the offering, not the browser.

Postal orders still receive the same digital vouchers by email. Printed and
digital copies use the same codes and share the same balances. The private
purchase status page shows postal progress separately from payment and email;
it never exposes the delivery address.

Products & Classes → Vouchers → Orders & dispatch uses authenticated voucher
view permissions to show orders, recipient addresses and existing PDFs for
printing. Voucher management permission and the server's live eligibility check
are both required to mark an order as dispatched. Recording dispatch uses an
idempotency key and neither sends an email nor generates new codes. The studio
prints and posts the vouchers itself.

## Private order access

New purchases return to `/vouchers/success?couponOrderId=…#accessToken=…`.
The historical `/kurzy-keramiky-brno/success` route renders the same component.
Both routes use the customer transaction shell and remain available after an
offering is archived or the public voucher catalog is disabled. Cancellation
returns to `/vouchers/cancel` without claiming a payment succeeded or failed.

The 43-character opaque proof is captured from the URL fragment, removed from
browser history, and kept in session storage scoped to tenant and order. An
order ID alone never exposes order data. Private requests use a dedicated fetch
transport, not Redux query arguments, actions, or cache keys:

- `POST /public/tenants/:tenantSlug/vouchers/orders/:orderId/status`
- `POST /public/tenants/:tenantSlug/vouchers/orders/:orderId/download`
- `POST /public/tenants/:tenantSlug/vouchers/orders/:orderId/resend`

All three send `{ accessToken }` in JSON; download also sends a zero-based
`index`. Requests omit cookies, bypass browser caching, suppress referrers, and
time out after 20 seconds. Invalid access clears the saved proof. Order changes
abort requests and discard earlier status, download, and resend results.

## Customer behavior

The page distinguishes pending payment, confirmed payment being processed,
ready PDFs, checkout expiry, refunded purchases, revocation, payment review,
and a status request that could not be completed. A network error never means
the customer should pay again.

PDF downloads remain available when email delivery fails or its outcome is
uncertain. Explicit resends go to the original email address with the same
voucher codes; the server controls eligibility and cooldown. Expired vouchers
remain downloadable for historical reference, with their original value and
expiry, while email resending is disabled.

Status polling is bounded to two minutes and stops on a terminal result. A
scheduled automatic delivery retry continues polling within that window.
Polling pauses in hidden tabs and resumes when visible within the original
window. A manual check or explicit resend starts a fresh bounded check.

## Verification

Purchase tests cover fragment capture and storage isolation, credential-free
POST transport, PDF content types and timeouts, missing or invalid proof,
payment versus email failures, refund and revocation access, expired voucher
history, original-order resends, stale request isolation, aborted downloads,
private browsing with React StrictMode, and bounded/resumed polling. Public
catalog tests cover gift messages, quantity totals, legacy-template guidance,
and recoverable message rendering errors. These tests run in the critical CI
suite along with locale validation.
