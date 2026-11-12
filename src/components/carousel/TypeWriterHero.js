"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export default function TypeWriterHero({
  textList = ["Breaking news", "Another message"],
  speed = 60, // pixels per second
  gap = 80, // space between repetitions (px)
  className = "",
}) {
  const safeList = useMemo(
    () => (Array.isArray(textList) && textList.length ? textList : [""]),
    [textList],
  );

  const containerRef = useRef(null);
  const textRef = useRef(null);
  const animationRef = useRef(null);

  const [index, setIndex] = useState(0);

  const text = safeList[index];

  // Inject CSS once
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .tw-marquee {
        position: relative;
        overflow: hidden;
        width: 100%;
      }

      .tw-marquee-track {
        display: inline-flex;
        white-space: nowrap;
        will-change: transform;
      }

      .tw-marquee-text {
        padding-right: var(--gap);
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Animation loop
  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    cancelAnimationFrame(animationRef.current);

    let start = null;
    let x = container.offsetWidth;

    const textWidth = textEl.offsetWidth + gap;
    const totalDistance = container.offsetWidth + textWidth;
    const duration = (totalDistance / speed) * 1000;

    function animate(timestamp) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;

      const progress = elapsed / duration;
      x = container.offsetWidth - progress * totalDistance;

      textEl.style.transform = `translateX(${x}px)`;

      if (progress >= 1) {
        // Move to next text
        setIndex((i) => (i + 1) % safeList.length);
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [text, speed, gap, safeList.length]);

  return (
    <span
      ref={containerRef}
      className={`tw-marquee ${className}`}
      style={{ "--gap": `${gap}px` }}
    >
      <span className="tw-marquee-track">
        <span
          ref={textRef}
          className="tw-marquee-text uppercase font-customLight"
        >
          {text}
        </span>
      </span>
    </span>
  );
}
