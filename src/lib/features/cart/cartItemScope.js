// A standalone Shario cart accepts shared-space commerce only. Ignore legacy
// specialist rows if an imported snapshot or old browser session supplies one.
export const isSupportedCartItem = (item) =>
  Boolean(item && typeof item === "object") &&
  !item.potteryPieceId &&
  item.type !== "pottery-piece" &&
  item.kind !== "pottery-piece";
