# Native invoicing availability

Native Skab invoice management is disabled by default for the MVP. The code,
translations, stored documents, tenant settings and role grants are retained.

The default client build hides invoice navigation, customer invoice pages,
invoicing settings, role permissions, order invoice actions and the invoice
practice step. Direct native invoice page URLs return not found.

Stripe payments, customer membership billing documents and the studio's Skab
subscription billing remain available. This change does not configure or verify
Stripe receipt emails; those still depend on the payment integration and Stripe
account settings.

Deploy the companion server change to disable native invoice APIs, background
generation and emails as well. Neither flag needs to be set to disable the
feature: missing, false or any value other than `true` keeps it disabled.

To restore native invoicing deliberately:

1. Set `NATIVE_INVOICES_ENABLED=true` on the server and restart/redeploy it.
2. Set `NEXT_PUBLIC_NATIVE_INVOICES_ENABLED=true` and rebuild/redeploy the client.

Review saved tenant automation settings before re-enabling. Existing paid orders
may again be eligible for automatic invoice generation on the server.
