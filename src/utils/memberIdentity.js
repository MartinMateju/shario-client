const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

export const normalizeMemberNumber = (value) => {
  const candidate = String(value ?? "").trim();
  if (!POSITIVE_INTEGER_PATTERN.test(candidate)) return "";

  const memberNumber = Number(candidate);
  return Number.isSafeInteger(memberNumber) && memberNumber > 0
    ? String(memberNumber)
    : "";
};

export const resolveUserMemberId = (user) =>
  normalizeMemberNumber(user?.memberNumber);

export const resolvePieceMakerCode = (piece) =>
  String(piece?.makerCode ?? "").trim() || resolveUserMemberId(piece?.user);

export const formatMakerId = (value, fallback = "—") => {
  const memberNumber = normalizeMemberNumber(
    String(value ?? "")
      .trim()
      .replace(/^#/, ""),
  );

  return memberNumber ? `#${memberNumber}` : fallback;
};
