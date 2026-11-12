import {
  cx,
  getAvatarTone,
  getAvatarUrl,
  getInitials,
} from "./people-table.utils";

export default function PersonAvatar({ person, size = "md" }) {
  const avatarUrl = getAvatarUrl(person);
  const dimensions =
    size === "sm" ? "h-8 w-8 text-[10px]" : "h-9 w-9 text-[10px]";

  if (avatarUrl) {
    return (
      // A plain image keeps this component compatible with remote and data URLs.
      // Add the host to next/image remotePatterns if you switch this to Image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={cx(dimensions, "shrink-0 rounded-full object-cover")}
      />
    );
  }

  return (
    <span
      className={cx(
        dimensions,
        "flex shrink-0 items-center justify-center rounded-full font-semibold uppercase tracking-[0.04em]",
        getAvatarTone(person),
      )}
      aria-hidden="true"
    >
      {getInitials(person)}
    </span>
  );
}
