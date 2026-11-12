// Finger and pen taps on a calendar column select a slot only once the
// browser has confirmed the tap with its synthesized click, the last event
// of a tap.
//
// Selecting earlier (on pointerup) renders the selection preview under the
// finger before that click is dispatched, so the click lands on whatever was
// just rendered there, such as the preview's confirm button. Browsers also
// suppress the click for touches that only stop a momentum scroll, long
// presses and pans, which keeps those gestures from selecting time.

export const TOUCH_TAP_SLOP = 10;

// A pen (Apple Pencil, S Pen) taps like a finger: the browser confirms it with
// a synthesized click, and a pen drag pans the page like a finger drag.
export const isTouchTapPointer = (event) =>
  event?.pointerType === "touch" || event?.pointerType === "pen";

// A tap's click normally follows pointerup within a frame. The window only
// guards against consuming a stale tap whose click the browser suppressed.
const TOUCH_TAP_CLICK_WINDOW_MS = 1000;

const now = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

export function startTouchTap(tapRef, event) {
  tapRef.current = isTouchTapPointer(event)
    ? {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        element: event.currentTarget,
        releasedAt: null,
      }
    : null;
}

export function moveTouchTap(tapRef, event) {
  const tap = tapRef.current;
  if (!isTouchTapPointer(event) || tap?.pointerId !== event.pointerId) {
    return false;
  }

  if (
    Math.hypot(event.clientX - tap.clientX, event.clientY - tap.clientY) >
    TOUCH_TAP_SLOP
  ) {
    tapRef.current = null;
  }
  return true;
}

// Browsers adjust the coordinates of the synthesized click towards nearby
// controls, so the tap keeps the point where the finger lifted.
export function releaseTouchTap(tapRef, event) {
  if (!isTouchTapPointer(event)) return false;

  const tap = tapRef.current;
  tapRef.current =
    tap && tap.pointerId === event.pointerId && tap.releasedAt === null
      ? {
          ...tap,
          clientX: event.clientX,
          clientY: event.clientY,
          releasedAt: now(),
        }
      : null;
  return true;
}

export function cancelTouchTap(tapRef, event) {
  if (!isTouchTapPointer(event)) return false;

  tapRef.current = null;
  return true;
}

export function takeTouchTap(tapRef, event) {
  const tap = tapRef.current;
  tapRef.current = null;

  if (
    !tap ||
    tap.releasedAt === null ||
    tap.element !== event.currentTarget ||
    now() - tap.releasedAt > TOUCH_TAP_CLICK_WINDOW_MS
  ) {
    return null;
  }
  return tap;
}
