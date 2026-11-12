const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

export function snapCalendarMinute(minute, stepMinutes = 30, mode = "nearest") {
  const step = Math.max(1, Number(stepMinutes) || 30);
  const value = Number(minute) || 0;
  const operation =
    mode === "floor" ? Math.floor : mode === "ceil" ? Math.ceil : Math.round;

  return operation(value / step) * step;
}

const getSelectionConstraints = ({
  stepMinutes,
  minimumMinutes,
  maximumMinutes,
  openMinute,
  closeMinute,
}) => {
  const step = Math.max(1, Number(stepMinutes) || 30);
  const minimum =
    Math.ceil(Math.max(step, Number(minimumMinutes) || step) / step) * step;
  const parsedOpen = Number(openMinute);
  const parsedClose = Number(closeMinute);
  const open = Number.isFinite(parsedOpen) ? parsedOpen : 0;
  const configuredClose = Number.isFinite(parsedClose) ? parsedClose : 24 * 60;
  const availableMinutes = snapCalendarMinute(
    configuredClose - open,
    step,
    "floor",
  );

  if (availableMinutes < minimum) return null;

  const configuredMaximum = Number(maximumMinutes) || availableMinutes;
  const maximum = Math.max(
    minimum,
    Math.min(
      availableMinutes,
      Math.max(step, Math.floor(configuredMaximum / step) * step),
    ),
  );

  return {
    step,
    minimum,
    maximum,
    open,
    close: open + availableMinutes,
  };
};

const snapFromOrigin = (minute, step, origin) =>
  origin + snapCalendarMinute(Number(minute) - origin, step);

export function getSlotSelectionRange({
  anchorMinute,
  pointerMinute,
  stepMinutes = 30,
  minimumMinutes = 60,
  maximumMinutes,
  openMinute = 0,
  closeMinute = 24 * 60,
}) {
  const constraints = getSelectionConstraints({
    stepMinutes,
    minimumMinutes,
    maximumMinutes,
    openMinute,
    closeMinute,
  });
  if (!constraints) return null;
  const { step, minimum, maximum, open, close } = constraints;

  const anchor = clamp(snapFromOrigin(anchorMinute, step, open), open, close);
  const pointer = clamp(snapFromOrigin(pointerMinute, step, open), open, close);
  const draggingBackward = pointer < anchor;

  let startMinute = Math.min(anchor, pointer);
  let endMinute = Math.max(anchor, pointer);

  if (endMinute - startMinute < minimum) {
    if (draggingBackward) {
      startMinute = Math.max(open, endMinute - minimum);
    } else {
      endMinute = Math.min(close, startMinute + minimum);
    }
  }

  if (endMinute - startMinute < minimum) {
    startMinute = Math.max(open, close - minimum);
    endMinute = close;
  }

  if (endMinute - startMinute > maximum) {
    if (draggingBackward) {
      startMinute = endMinute - maximum;
    } else {
      endMinute = startMinute + maximum;
    }
  }

  return { startMinute, endMinute };
}

export function getResizedSlotSelectionRange({
  startMinute,
  endMinute,
  edge,
  pointerMinute,
  deltaMinutes = 0,
  stepMinutes = 30,
  minimumMinutes = 60,
  maximumMinutes,
  openMinute = 0,
  closeMinute = 24 * 60,
}) {
  if (edge !== "start" && edge !== "end") return null;

  const parsedStart = Number(startMinute);
  const parsedEnd = Number(endMinute);

  if (!Number.isFinite(parsedStart) || !Number.isFinite(parsedEnd)) {
    return null;
  }

  const constraints = getSelectionConstraints({
    stepMinutes,
    minimumMinutes,
    maximumMinutes,
    openMinute,
    closeMinute,
  });
  if (!constraints) return null;
  const { step, minimum, maximum, open, close } = constraints;
  const parsedPointer = Number(pointerMinute);
  const hasPointer =
    pointerMinute !== null &&
    pointerMinute !== undefined &&
    Number.isFinite(parsedPointer);
  const parsedDelta = Number(deltaMinutes);
  const delta = Number.isFinite(parsedDelta) ? parsedDelta : 0;
  // Booking-card previews retain exact session times until edited. Normalize
  // both endpoints before resizing so an off-grid fixed edge remains editable.
  const snappedStart = snapFromOrigin(parsedStart, step, open);
  const snappedEnd = snapFromOrigin(parsedEnd, step, open);

  if (edge === "start") {
    const fixedEnd = snappedEnd;
    if (fixedEnd < open + minimum || fixedEnd > close) {
      return null;
    }

    const target = hasPointer ? parsedPointer : snappedStart + delta;
    const availableMaximum = Math.min(maximum, fixedEnd - open);
    const duration = clamp(
      snapCalendarMinute(fixedEnd - target, step),
      minimum,
      availableMaximum,
    );

    return { startMinute: fixedEnd - duration, endMinute: fixedEnd };
  }

  const fixedStart = snappedStart;
  if (fixedStart < open || fixedStart > close - minimum) {
    return null;
  }

  const target = hasPointer ? parsedPointer : snappedEnd + delta;
  const availableMaximum = Math.min(maximum, close - fixedStart);
  const duration = clamp(
    snapCalendarMinute(target - fixedStart, step),
    minimum,
    availableMaximum,
  );

  return { startMinute: fixedStart, endMinute: fixedStart + duration };
}

export function getInitialScrollMinute({
  isToday = false,
  nowMinute,
  eventMinutes = [],
  openingMinute = 0,
  closingMinute = 24 * 60,
  leadMinutes = 90,
}) {
  const firstEventMinute = [...eventMinutes]
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];
  const focusMinute =
    isToday && Number.isFinite(Number(nowMinute))
      ? Number(nowMinute)
      : (firstEventMinute ?? openingMinute);
  const maximum = Math.max(openingMinute, closingMinute);

  return clamp(
    focusMinute - Math.max(0, Number(leadMinutes) || 0),
    openingMinute,
    maximum,
  );
}
