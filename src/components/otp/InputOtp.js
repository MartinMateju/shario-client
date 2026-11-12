"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const classNames = (...classes) => classes.filter(Boolean).join(" ");

export default function InputOTP({
  autoFocus = true,
  callback,
  descriptionId,
  digitLabel = (position) => `OTP digit ${position}`,
  length = 6,
}) {
  const [values, setValues] = useState(Array(length).fill(""));
  const inputRefs = useRef([]);

  const otpValue = useMemo(() => values.join(""), [values]);

  useEffect(() => {
    callback?.(otpValue);
  }, [otpValue, callback]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const focusInput = (index) => {
    if (index >= 0 && index < length && inputRefs.current[index]) {
      inputRefs.current[index].focus();
      inputRefs.current[index].select?.();
    }
  };

  const handleChange = (index, event) => {
    const rawValue = event.target.value;

    if (!rawValue) {
      const nextValues = [...values];
      nextValues[index] = "";
      setValues(nextValues);
      return;
    }

    const sanitized = rawValue.replace(/\D/g, "");

    if (!sanitized) return;

    const nextValues = [...values];
    let nextIndex = index;

    for (const character of sanitized) {
      if (nextIndex >= length) break;
      nextValues[nextIndex] = character;
      nextIndex += 1;
    }

    setValues(nextValues);
    focusInput(nextIndex < length ? nextIndex : length - 1);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      event.preventDefault();

      const nextValues = [...values];

      if (nextValues[index]) {
        nextValues[index] = "";
        setValues(nextValues);
        return;
      }

      if (index > 0) {
        nextValues[index - 1] = "";
        setValues(nextValues);
        focusInput(index - 1);
      }

      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusInput(index + 1);
      return;
    }

    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
    }
  };

  const handlePaste = (index, event) => {
    event.preventDefault();

    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;

    const nextValues = [...values];
    let nextIndex = index;

    for (const character of pasted) {
      if (nextIndex >= length) break;
      nextValues[nextIndex] = character;
      nextIndex += 1;
    }

    setValues(nextValues);
    focusInput(nextIndex < length ? nextIndex : length - 1);
  };

  return (
    <div className="w-full" data-password-reset-otp>
      <div className="grid grid-cols-6 gap-1 sm:gap-2">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            pattern="[0-9]*"
            maxLength={length}
            value={values[index]}
            onChange={(event) => handleChange(index, event)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            onFocus={(event) => event.target.select()}
            aria-describedby={descriptionId}
            aria-label={digitLabel(index + 1)}
            className={classNames(
              "h-12 min-w-0 w-full rounded-xl border text-center",
              "bg-[var(--tenant-auth-field-surface)] text-[var(--tenant-auth-field-text,var(--tenant-auth-form-text))]",
              "text-lg font-semibold tabular-nums sm:h-14 sm:text-xl",
              "border-[color-mix(in_srgb,var(--tenant-auth-field-text)_16%,transparent)] shadow-[0_8px_24px_rgba(25,26,24,0.035)]",
              "outline-none transition duration-200",
              "focus:border-[var(--tenant-auth-field-secondary,var(--tenant-interactive-hover))] focus:ring-4 focus:ring-[var(--tenant-auth-field-secondary,var(--tenant-interactive-hover))]/15",
            )}
          />
        ))}
      </div>

      <input type="hidden" name="otp" value={otpValue} readOnly />
    </div>
  );
}
