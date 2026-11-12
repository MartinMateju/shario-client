import Image from "next/image";

/** Compatibility export for the copied product. The artwork is Shario's master. */
export default function SkabLogo({
  variant = "full",
  size = "md",
  className = "",
}) {
  const compact = variant === "compact";
  const width = compact ? 32 : size === "sm" ? 120 : 146;

  return (
    <span
      aria-label="Shario"
      className={`inline-flex shrink-0 items-center ${className}`.trim()}
      data-skab-logo
      data-shario-logo
      data-variant={compact ? "compact" : "full"}
      role="img"
    >
      <Image
        src={
          compact ? "/brand/shario-app-icon.svg" : "/brand/shario-primary.svg"
        }
        alt=""
        aria-hidden="true"
        width={compact ? 32 : 450}
        height={compact ? 32 : 156}
        style={{ width, height: "auto" }}
        className="block h-auto"
        unoptimized
      />
    </span>
  );
}
