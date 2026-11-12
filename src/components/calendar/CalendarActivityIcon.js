import {
  ComputerDesktopIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/outline";

export default function CalendarActivityIcon({
  activity,
  className = "h-3.5 w-3.5",
}) {
  if (!activity) return null;
  const Icon =
    activity.id === "SHARED_TABLE" ? RectangleGroupIcon : ComputerDesktopIcon;
  return (
    <span
      data-calendar-activity-icon={activity.id}
      title={activity.label}
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
    >
      <Icon className="h-full w-full" />
    </span>
  );
}
