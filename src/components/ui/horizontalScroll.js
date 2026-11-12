export function getHorizontalRevealScrollLeft({
  clientWidth,
  scrollWidth,
  scrollLeft,
  itemOffsetLeft,
  itemWidth,
  padding = 8,
}) {
  const maximumScrollLeft = Math.max(0, scrollWidth - clientWidth);

  if (!maximumScrollLeft) return scrollLeft;

  const visibleStart = scrollLeft + padding;
  const visibleEnd = scrollLeft + clientWidth - padding;
  const itemEnd = itemOffsetLeft + itemWidth;
  let nextScrollLeft = scrollLeft;

  if (itemOffsetLeft < visibleStart) {
    nextScrollLeft = itemOffsetLeft - padding;
  } else if (itemEnd > visibleEnd) {
    nextScrollLeft = itemEnd - clientWidth + padding;
  }

  return Math.min(maximumScrollLeft, Math.max(0, nextScrollLeft));
}

export function revealElementHorizontally(scroller, item, padding = 8) {
  if (!scroller || !item) return false;

  const scrollerRect = scroller.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();

  const nextScrollLeft = getHorizontalRevealScrollLeft({
    clientWidth: scroller.clientWidth,
    scrollWidth: scroller.scrollWidth,
    scrollLeft: scroller.scrollLeft,
    itemOffsetLeft: itemRect.left - scrollerRect.left + scroller.scrollLeft,
    itemWidth: itemRect.width || item.offsetWidth,
    padding,
  });

  if (nextScrollLeft === scroller.scrollLeft) return false;

  scroller.scrollLeft = nextScrollLeft;
  return true;
}
