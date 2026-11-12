"use client";

import {
  BuildingStorefrontIcon,
  CameraIcon,
  EllipsisHorizontalIcon,
  PaintBrushIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { FormField, Input } from "@/components/ui/form/FormField";
import { OnboardingChoiceCard } from "../OnboardingChoiceCard";
import { STUDIO_TYPES } from "../onboarding.constants";
import styles from "../onboarding.module.css";

const studioIcons = {
  shared: BuildingStorefrontIcon,
  art: PaintBrushIcon,
  photography: CameraIcon,
  wellness: SparklesIcon,
  other: EllipsisHorizontalIcon,
};

export function StudioStep({ errors = {}, form, setField }) {
  const t = useTranslations("Onboarding");

  return (
    <div className="space-y-5 [@media(max-height:800px)]:space-y-3">
      <FormField
        className={styles.field}
        error={errors.studioName}
        label={t("studio.name")}
        name="studioName"
      >
        <Input
          className={styles.control}
          value={form.studioName}
          onChange={(event) => setField("studioName", event.target.value)}
          placeholder={t("studio.namePlaceholder")}
          autoComplete="organization"
          required
        />
      </FormField>

      <fieldset
        aria-describedby={
          errors.businessType ? "businessType-error" : undefined
        }
        aria-invalid={Boolean(errors.businessType)}
      >
        <legend className={`${styles.legend} mb-2 leading-5`}>
          {t("studio.typeQuestion")}
        </legend>
        <div className="flex flex-wrap gap-2 [@media(max-height:800px)]:gap-1.5">
          {STUDIO_TYPES.map(({ value, icon }) => {
            const Icon = studioIcons[icon];

            return (
              <OnboardingChoiceCard
                key={value}
                compact
                icon={<Icon className="size-4" />}
                label={t(`studio.types.${value}`)}
                selected={form.businessType === value}
                onClick={() => setField("businessType", value)}
              />
            );
          })}
        </div>
        {errors.businessType ? (
          <p
            className={`${styles.fieldError} mt-2 text-xs leading-5`}
            id="businessType-error"
          >
            {errors.businessType}
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}
