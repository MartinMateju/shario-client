// Public metadata is briefly reusable; live availability/session endpoints are
// deliberately never hydrated. Focus and manual refresh still revalidate it.
// A server snapshot must be <30s old to seed RTK. RTK assigns its own cache
// timestamp, so the additional mount freshness below bounds metadata reuse
// to <60s from the original read; this is not a booking availability cache.
export const PUBLIC_COURSE_FRESHNESS_SECONDS = 30;

export function isFreshPublicCourseSnapshot(snapshot, now = Date.now()) {
  const age = now - snapshot?.fetchedAt;
  return (
    typeof snapshot?.tenantSlug === "string" &&
    Number.isFinite(snapshot?.fetchedAt) &&
    age >= 0 &&
    age < PUBLIC_COURSE_FRESHNESS_SECONDS * 1_000
  );
}
