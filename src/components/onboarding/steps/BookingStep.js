"use client";

import { AcademicCapIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { OnboardingChoiceCard } from "../OnboardingChoiceCard";
import { BOOKING_OPTIONS, CONFIRMATION_OPTIONS } from "../onboarding.constants";
import styles from "../onboarding.module.css";

const bookingIcons = {
  openStudio: CalendarDaysIcon,
  classes: AcademicCapIcon,
};

export function BookingStep({ form, setField, toggleBooking }) {
  const t = useTranslations("Onboarding");

  return (
    <div className="space-y-7">
      <fieldset>
        <legend className={`${styles.legend} mb-2`}>
          {t("booking.question")}
        </legend>
        <p className={`${styles.muted} mb-4 text-sm leading-6`}>
          {t("booking.hint")}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {BOOKING_OPTIONS.map(({ value, icon }) => {
            const Icon = bookingIcons[icon];

            return (
              <OnboardingChoiceCard
                key={value}
                mode="checkbox"
                icon={<Icon className="size-4" />}
                label={t(`booking.types.${value}.label`)}
                description={t(`booking.types.${value}.description`)}
                selected={form.bookingTypes.includes(value)}
                onClick={() => toggleBooking(value)}
              />
            );
          })}
        </div>
      </fieldset>

      {form.bookingTypes.length > 0 && (
        <fieldset>
          <legend className={`${styles.legend} mb-2`}>
            {t("booking.confirmation")}
          </legend>
          <div className="space-y-2">
            {CONFIRMATION_OPTIONS.map(({ value }) => (
              <OnboardingChoiceCard
                key={value}
                label={t(`booking.confirmationModes.${value}.label`)}
                description={t(
                  `booking.confirmationModes.${value}.description`,
                )}
                selected={form.confirmationMode === value}
                onClick={() => setField("confirmationMode", value)}
              />
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
