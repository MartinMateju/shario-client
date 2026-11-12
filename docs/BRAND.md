# Shario brand implementation

The approved visual system is documented in the [27-page Shario brand manual](brand/Shario-Brand-Manual-v2.pdf). The application uses the approved blue S symbol, ink wordmark, local Manrope font and white canvas.

## Identity

- Name: **Shario**. Domain: **shario.io**.
- Primary line: **Make room for more.**
- Descriptor: **Bookings, memberships and websites for shared spaces.**
- Voice: warm, clear and useful. Explain what an operator or member can do. Keep examples generic across coworking spaces, creative studios, rehearsal spaces, workshops and community hubs.
- Treat the manual's example screens as design illustrations; implemented features and plan availability are defined by the application, not the mockups.

## Assets

| Use | File |
| --- | --- |
| Default logo on light backgrounds | `public/brand/shario-primary.svg` |
| Logo on dark backgrounds | `public/brand/shario-inverse.svg` |
| Symbol | `public/brand/shario-symbol-blue.svg` |
| App icon | `public/brand/shario-app-icon.svg` |
| Browser icons | `public/favicon.svg`, `public/favicon.ico` |
| Campaign artwork | `public/brand/campaign-hero.webp` |
| Quieter shared-space imagery | `public/brand/shared-space.webp` |
| Variable font and license | `src/fonts/Manrope-Variable.ttf`, `src/fonts/Manrope-OFL.txt` |

SVG logos contain outlined artwork. Preserve their proportions, padding and original colors. The shared `SkabLogo` compatibility export renders the Shario assets throughout the copied application, including compact sidebar and authentication variants.

The campaign and shared-space images depict fictional people and spaces from the approved brand kit. They are illustrative artwork, not customer endorsements. The sample website is labelled as an example.

## Color and typography

| Role | Value |
| --- | --- |
| Primary action / Blue | `#2563EB` |
| Ink | `#182333` |
| Canvas / White | `#FFFFFF` |
| Aqua | `#4DD7C5` |
| Coral | `#FF715B` |
| Sunshine | `#FFC857` |
| Lilac | `#C3ADFF` |

Use white text on Blue and ink text on the campaign accents. Keep accent colors separate from success, warning, payment and error meanings. White on Blue has 5.17:1 contrast; Ink on White has 15.82:1. Customer color overrides require their own contrast handling.

Manrope is served locally for platform UI and marketing. The customer website builder retains its additional typography/style choices. Preserve the included SIL Open Font License when redistributing the font.

`src/config/brandPalette.js` and `src/styles/globals.css` define the application palette and semantic aliases. Existing `SKAB_*`, `--color-skab-*` and `data-skab-*` identifiers are internal compatibility names, not visible branding. Customer branding remains independently customizable.

## Content and locales

The new `SharioMarketing` catalog is authored in English and Czech. Other enabled locales currently use the English marketing copy while preserving their existing translated product catalogs. Workstation, shared-table and generic business-type labels are localized across all catalog locales. Run `npm run i18n:check` to validate namespace, key and ICU argument parity.

Pricing continues to use the existing subscription catalog API. Do not hardcode prices or imply availability of integrations before they are configured. Generic product and customer features remain in the copied application; pottery marketing, production flows and tenant studio microsites have been removed.
