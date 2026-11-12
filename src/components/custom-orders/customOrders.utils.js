import { isValidMajorCurrencyPrecision } from "@/utils/money";

export const orderId = (item) => item?.id || item?._id || "";
export const orderStatus = (item) =>
  item.status === "closed" ? "closed" : item.isOverdue ? "overdue" : "active";

export function formatOrderDate(
  value,
  locale,
  timeZone = "UTC",
  withTime = false,
) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? "UTC" : timeZone,
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

export function createOrderDraft(item = {}, defaults = {}) {
  return {
    title: item.title || "",
    description: item.description || "",
    materials: item.materials || "",
    finish: item.finish || "",
    pieceCount: String(item.pieceCount ?? 1),
    startDate: item.startDate || "",
    deadline: item.deadline || "",
    locationId: item.locationId || defaults.locationId || "",
    customerId: item.customerId || null,
    customer: { name: "", email: "", phone: "", ...item.customer },
    assigneeId: item.assigneeId || "",
    quotedAmount: item.quotedAmount == null ? "" : String(item.quotedAmount),
    currency: item.currency || defaults.currency || "CZK",
  };
}

export function validateOrderDraft(draft) {
  const errors = {};
  for (const field of [
    "title",
    "description",
    "materials",
    "startDate",
    "deadline",
    "locationId",
  ])
    if (!String(draft[field] || "").trim()) errors[field] = "required";
  if (
    !Number.isInteger(Number(draft.pieceCount)) ||
    Number(draft.pieceCount) < 1 ||
    Number(draft.pieceCount) > 1000000
  )
    errors.pieceCount = "pieces";
  if (draft.startDate && draft.deadline && draft.deadline < draft.startDate)
    errors.deadline = "dates";
  if (
    draft.customer.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.customer.email.trim())
  )
    errors.email = "email";
  if (
    (draft.customer.email || draft.customer.phone) &&
    !draft.customer.name.trim()
  )
    errors.name = "required";
  if (
    draft.quotedAmount !== "" &&
    (!Number.isFinite(Number(draft.quotedAmount)) ||
      Number(draft.quotedAmount) < 0 ||
      Number(draft.quotedAmount) > 100000000)
  )
    errors.quotedAmount = "quote";
  if (
    draft.quotedAmount !== "" &&
    !errors.quotedAmount &&
    !isValidMajorCurrencyPrecision(draft.quotedAmount, draft.currency)
  )
    errors.quotedAmount = "quotePrecision";
  return errors;
}

export function orderPayload(draft) {
  return {
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim(),
    materials: draft.materials.trim(),
    finish: draft.finish.trim(),
    pieceCount: Number(draft.pieceCount),
    assigneeId: draft.assigneeId || null,
    quotedAmount: draft.quotedAmount === "" ? null : Number(draft.quotedAmount),
    customer: Object.fromEntries(
      Object.entries(draft.customer)
        .filter(([key]) => ["name", "email", "phone"].includes(key))
        .map(([key, value]) => [key, String(value || "").trim()]),
    ),
  };
}

export function validateOrderFiles(files, attachments = []) {
  if (files.reduce((total, file) => total + file.size, 0) > 40 * 1024 * 1024)
    return "uploadTotalSize";
  let images = attachments.filter((item) => item.kind === "image").length;
  let documents = attachments.filter((item) => item.kind === "document").length;
  for (const file of files) {
    const image = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    const pdf = file.type === "application/pdf";
    if (!image && !pdf) return "fileType";
    if (file.size === 0 || file.size > (image ? 8 : 15) * 1024 * 1024)
      return "fileSize";
    if (image) images += 1;
    else documents += 1;
  }
  return images > 5 ? "imageLimit" : documents > 10 ? "documentLimit" : null;
}

export function orderError(error, t) {
  const code = error?.data?.code ?? error?.data?.error?.code;
  const known = {
    CUSTOM_ORDER_UPLOAD_TOTAL_SIZE: "uploadTotalSize",
    CUSTOM_ORDER_ATTACHMENT_TYPE: "fileType",
    CUSTOM_ORDER_ATTACHMENT_SIZE: "fileSize",
    CUSTOM_ORDER_ATTACHMENT_INVALID: "attachmentInvalid",
    CUSTOM_ORDER_ATTACHMENT_LIMIT: "attachmentLimit",
    CUSTOM_ORDER_ASSIGNEE_INVALID: "assignee",
  };
  if (known[code]) return t(`errors.${known[code]}`);
  if (error?.status === 409) return t("errors.conflict");
  if (error?.status === 403) return t("errors.forbidden");
  if (error?.status === 404) return t("errors.notFound");
  if (error?.status === 413) return t("errors.fileSize");
  return t("errors.save");
}
