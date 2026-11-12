import { getStripeMinorUnitDigits } from "@/utils/money";
import { PUBLIC_TENANT_FONT_PRESET_REGISTRY } from "@/components/public-tenant/publicTenantStylePresets";
import { isVoucherValidityValid } from "../voucherValidity.mjs";

export const VOUCHER_DESIGN_TEXT_LIMITS = Object.freeze({
  brandName: 60,
  title: 80,
  subtitle: 120,
  message: 400,
  footer: 160,
});

export const VOUCHER_DESIGN_ASSET_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const VOUCHER_DESIGN_MAX_ASSET_BYTES = 8 * 1024 * 1024;

const VOUCHER_DESIGN_FONTS = new Set([
  ...Object.keys(PUBLIC_TENANT_FONT_PRESET_REGISTRY),
  "sans",
  "serif",
  "mono",
]);

export const isVoucherDesignValid = (design) =>
  Boolean(
    design?.version === 1 &&
    design.layout === "split" &&
    ["background", "text", "accent"].every((field) =>
      /^#[0-9a-f]{6}$/i.test(design.colors?.[field]),
    ) &&
    (!Object.hasOwn(design.colors, "title") ||
      (typeof design.colors.title === "string" &&
        /^#[0-9a-f]{6}$/i.test(design.colors.title))) &&
    VOUCHER_DESIGN_FONTS.has(design.typography?.font) &&
    ["regular", "bold"].includes(design.typography?.titleWeight) &&
    ["cover", "contain"].includes(design.imageFit) &&
    design.content?.title?.trim() &&
    Object.entries(VOUCHER_DESIGN_TEXT_LIMITS).every(
      ([field, limit]) =>
        typeof design.content?.[field] === "string" &&
        design.content[field].length <= limit,
    ) &&
    ["logoKey", "imageKey"].every(
      (field) =>
        design.assets?.[field] === null ||
        typeof design.assets?.[field] === "string",
    ),
  );

export function buildVoucherPreviewPayload({
  design,
  productName,
  price,
  currency,
  validity,
  locale,
}) {
  if (!isVoucherDesignValid(design) || !isVoucherValidityValid(validity))
    return null;
  // An unfinished price is not a zero-value voucher.
  if (
    (typeof price !== "number" && typeof price !== "string") ||
    (typeof price === "string" && !price.trim())
  )
    return null;
  const majorAmount = Number(price);
  const amountMinor = Math.round(
    majorAmount * 10 ** getStripeMinorUnitDigits(currency),
  );
  if (
    !Number.isFinite(majorAmount) ||
    majorAmount < 0 ||
    !Number.isSafeInteger(amountMinor)
  )
    return null;
  return {
    design,
    productName: String(productName || "").slice(0, 160),
    amountMinor,
    currency,
    validity,
    locale:
      typeof locale === "string" ? locale.replaceAll("_", "-") : undefined,
  };
}

export function downloadVoucherPdf(base64) {
  const bytes = Uint8Array.from(atob(base64), (character) =>
    character.charCodeAt(0),
  );
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/pdf" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "voucher-sample.pdf";
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // Give the browser time to begin reading the object URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
