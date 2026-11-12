"use client";

import {
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  SparklesIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import useGuidedSetupStep from "@/components/setup-center/useGuidedSetupStep";
import { ChoiceCard } from "@/components/ui/cards/ChoiceCard";
import FieldHelp from "@/components/ui/form/FieldHelp";
import { FormField, Input, Select } from "@/components/ui/form/FormField";
import { Link, useRouter } from "@/i18n/navigation";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import {
  useActivateLocationMutation,
  useCreateLocationMutation,
  useUpdateLocationMutation,
} from "@/lib/features/locations/locationApiSlice";
import {
  getLocationId,
  getTenantIdFromUser,
} from "@/lib/features/locations/location.utils";
import {
  ACTIVITY_OPTIONS,
  ACTIVITY_SELECTION_MODE,
  COUNTRY_OPTIONS,
  DURATION_OPTIONS,
  LOCATION_CLOSE_TIME_PATTERN,
  LOCATION_OPEN_TIME_PATTERN,
  SLOT_STEP_OPTIONS,
  WEEKDAYS,
  buildLocationForm,
  buildLocationPayload,
  formatDurationMinutes,
  getCountryDisplayName,
  isValidInternationalPhone,
  parseInternationalPhone,
  validateLocationOpeningHours,
} from "./locationForm.utils";
import { getLocationListHref } from "./locations.navigation";
const TIMEZONE_OPTIONS = Object.freeze([
  "Europe/Prague",
  "Europe/Bratislava",
  "Europe/Vienna",
  "Europe/Berlin",
  "Europe/Warsaw",
  "Europe/Budapest",
  "Europe/Copenhagen",
  "Europe/Stockholm",
  "Europe/Oslo",
  "Europe/Helsinki",
  "Europe/Amsterdam",
  "Europe/Paris",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Lisbon",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Brussels",
  "Europe/Luxembourg",
  "Europe/Dublin",
  "Europe/Sofia",
  "Europe/Ljubljana",
  "Europe/Zagreb",
  "Europe/Tallinn",
  "Europe/Riga",
  "Europe/Vilnius",
  "Europe/Vaduz",
  "Europe/Zurich",
  "Europe/Bucharest",
  "Europe/Nicosia",
  "Europe/Malta",
  "Europe/Reykjavik",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "Australia/Sydney",
  "Australia/Perth",
  "Pacific/Auckland",
]);
const DEFAULT_TIMEZONE_BY_COUNTRY = Object.freeze({
  CZ: "Europe/Prague",
  SK: "Europe/Bratislava",
  AT: "Europe/Vienna",
  DE: "Europe/Berlin",
  PL: "Europe/Warsaw",
  DK: "Europe/Copenhagen",
  SE: "Europe/Stockholm",
  NO: "Europe/Oslo",
  FI: "Europe/Helsinki",
  IS: "Europe/Reykjavik",
  FR: "Europe/Paris",
  ES: "Europe/Madrid",
  IT: "Europe/Rome",
  PT: "Europe/Lisbon",
  NL: "Europe/Amsterdam",
  BE: "Europe/Brussels",
  LU: "Europe/Luxembourg",
  IE: "Europe/Dublin",
  GR: "Europe/Athens",
  CY: "Europe/Nicosia",
  MT: "Europe/Malta",
  HU: "Europe/Budapest",
  RO: "Europe/Bucharest",
  BG: "Europe/Sofia",
  SI: "Europe/Ljubljana",
  HR: "Europe/Zagreb",
  EE: "Europe/Tallinn",
  LV: "Europe/Riga",
  LT: "Europe/Vilnius",
  LI: "Europe/Vaduz",
  CH: "Europe/Zurich",
  TR: "Europe/Istanbul",
  GB: "Europe/London",
  US: "America/New_York",
  CA: "America/Toronto",
  AU: "Australia/Sydney",
  NZ: "Pacific/Auckland",
});
const cx = (...values) => values.filter(Boolean).join(" ");
const LEGACY_GENERAL_ACTIVITY = Object.freeze({
  key: "GENERAL",
  labelKey: "general",
});
const getRequestError = (error, fallback) =>
  String(
    error?.data?.message ||
      error?.data?.error ||
      error?.error ||
      error?.message ||
      fallback,
  );
function SectionHeader({ help, hint, icon: Icon, tone = "cobalt", title }) {
  const toneClasses = {
    cobalt: "bg-cobalt-50 text-cobalt-600",
    coral: "bg-coral-100 text-terracotta-700",
    green: "bg-success-soft text-success",
    neutral: "bg-surface text-ink-muted",
  };
  return (
    <div className="flex items-start gap-3 border-b border-line pb-5">
      <span
        className={cx(
          "flex size-10 shrink-0 items-center justify-center rounded-[12px]",
          toneClasses[tone],
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <h2 className="text-[17px] font-semibold tracking-[-0.035em] text-ink">
            {title}
          </h2>
          {help ? (
            <FieldHelp label={help.label}>{help.content}</FieldHelp>
          ) : null}
        </div>
        <p className="mt-1 max-w-2xl text-[11px] leading-5 text-ink-muted">
          {hint}
        </p>
      </div>
    </div>
  );
}
function FormSection({ children, className, guideTarget, ...headerProps }) {
  return (
    <section
      data-contextual-guide-target={guideTarget}
      className={cx(
        "scroll-mt-28 rounded-[22px] border border-line bg-white p-5 shadow-card sm:p-6",
        className,
      )}
    >
      <SectionHeader {...headerProps} />
      <div className="mt-5">{children}</div>
    </section>
  );
}
function Switch({ checked, description, disabled, label, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[16px] border border-line bg-surface-muted px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        {description ? (
          <p className="mt-1 text-[11px] leading-5 text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
          checked ? "bg-cobalt-500" : "bg-skab-offset-300",
        )}
      >
        <span
          aria-hidden="true"
          data-switch-thumb
          className={cx(
            "block size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(31,31,31,0.24)] ring-1 ring-black/5 transition-transform duration-200 ease-out motion-reduce:transition-none",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
function ActivityCard({
  activity,
  capacity,
  capacityError,
  enabled,
  globalCapacity,
  onCapacityChange,
  onEnabledChange,
  onUsesOverallChange,
  t,
  usesOverall,
}) {
  const isLegacyGeneral = activity.key === LEGACY_GENERAL_ACTIVITY.key;
  const label = isLegacyGeneral
    ? t("form.activityGeneral")
    : t(`createPage.activities.${activity.labelKey}`);
  const description = isLegacyGeneral
    ? t("form.activityHelp")
    : t(`createPage.activities.${activity.labelKey}Description`);
  return (
    <article
      className={cx(
        "rounded-[18px] border p-4 transition sm:p-5",
        enabled
          ? "border-cobalt-200 bg-cobalt-50/30"
          : "border-line bg-surface-raised",
      )}
    >
      <Switch
        checked={enabled}
        label={label}
        description={description}
        onChange={onEnabledChange}
      />

      {enabled ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard
              compact
              label={t("createPage.activities.useOverall")}
              selected={usesOverall}
              onClick={() => onUsesOverallChange(true)}
            />
            <ChoiceCard
              compact
              label={t("createPage.activities.customLimit")}
              selected={!usesOverall}
              onClick={() => onUsesOverallChange(false)}
            />
          </div>

          {!usesOverall ? (
            <FormField
              name={`activity-capacity-${activity.key}`}
              label={t("createPage.fields.activityCapacity")}
              hint={t("createPage.activities.capacitySuffix")}
              error={capacityError}
              help={
                <FieldHelp label={t("createPage.tooltips.activityCapacity")}>
                  {t("createPage.tooltips.activityCapacity")}
                </FieldHelp>
              }
            >
              <Input
                type="number"
                min="1"
                max={Math.max(Number(globalCapacity) || 1, 1)}
                step="1"
                value={capacity}
                onChange={(event) => onCapacityChange(event.target.value)}
                required
              />
            </FormField>
          ) : (
            <p className="rounded-xl bg-white px-3.5 py-3 text-[11px] leading-5 text-ink-muted">
              {t("createPage.summary.capacity", {
                count: Number(globalCapacity) || 1,
              })}
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}
export default function StudioLocationCreatePage({
  location = null,
  requireBookingEnabled = false,
}) {
  const locale = useLocale();
  const t = useTranslations("Locations");
  const commonT = useTranslations("Common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const guidedSetup = useGuidedSetupStep("location");
  const isGuidedSetup = searchParams.get("setupStep") === "location";
  const locationId = getLocationId(location);
  const isEditing = Boolean(locationId);
  const currentUser = useSelector(selectCurrentUser);
  const tenantId = getTenantIdFromUser(currentUser);
  const [createLocation, createState] = useCreateLocationMutation();
  const [updateLocation, updateState] = useUpdateLocationMutation();
  const [activateLocation] = useActivateLocationMutation();
  const mutationState = isEditing ? updateState : createState;
  const initialForm = useMemo(() => {
    const defaults = buildLocationForm(location);
    if (!isEditing || requireBookingEnabled) defaults.booking.enabled = true;
    return defaults;
  }, [isEditing, location, requireBookingEnabled]);
  const activityOptions = useMemo(
    () =>
      isEditing && Number(initialForm.booking.activityCapacities.GENERAL) > 0
        ? [...ACTIVITY_OPTIONS, LEGACY_GENERAL_ACTIVITY]
        : ACTIVITY_OPTIONS,
    [initialForm, isEditing],
  );
  const [form, setForm] = useState(() => initialForm);
  const [activityUsesOverall, setActivityUsesOverall] = useState(() => {
    const globalCapacity = Number(form.booking.globalCapacity);
    return Object.fromEntries(
      activityOptions.map(({ key }) => {
        const capacity = Number(form.booking.activityCapacities[key]);
        return [key, capacity > 0 && capacity === globalCapacity];
      }),
    );
  });
  const [activityEnabled, setActivityEnabledState] = useState(() =>
    Object.fromEntries(
      activityOptions.map(({ key }) => [
        key,
        Number(form.booking.activityCapacities[key]) > 0,
      ]),
    ),
  );
  const [fieldErrors, setFieldErrors] = useState({});
  const [openingHourErrors, setOpeningHourErrors] = useState({});
  const [requestError, setRequestError] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const isSaving = mutationState.isLoading || isCompleting;
  const returnHref = useMemo(
    () =>
      getLocationListHref(searchParams, {
        clearSetupStep: isEditing,
      }),
    [isEditing, searchParams],
  );
  const guideHref = useMemo(() => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("guide", "studio_location_setup");
    return `/app/settings/locations/new?${query.toString()}`;
  }, [searchParams]);
  const normalizedPhone = form.contact.phone
    ? parseInternationalPhone(form.contact.phone, form.contact.phoneCountry)
        .e164
    : "";
  const enabledActivities = activityOptions.filter(
    ({ key }) => activityEnabled[key],
  );
  const slotStepOptions = useMemo(
    () =>
      [...new Set([...SLOT_STEP_OPTIONS, Number(form.booking.slotStepMinutes)])]
        .filter((minutes) => Number.isInteger(minutes) && minutes > 0)
        .sort((left, right) => left - right),
    [form.booking.slotStepMinutes],
  );
  const durationOptions = useMemo(
    () =>
      [
        ...new Set([
          ...DURATION_OPTIONS,
          Number(form.booking.minBookingMinutes),
          Number(form.booking.maxBookingMinutes),
        ]),
      ]
        .filter((minutes) => Number.isInteger(minutes) && minutes >= 15)
        .sort((left, right) => left - right),
    [form.booking.maxBookingMinutes, form.booking.minBookingMinutes],
  );
  const activitiesVisible =
    form.booking.activitySelectionMode !== ACTIVITY_SELECTION_MODE.HIDDEN;
  const summaryAddress = [
    form.address.line1.trim(),
    form.address.line2.trim(),
    [form.address.postalCode.trim(), form.address.city.trim()]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const updateAddress = (field, value) => {
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setForm((current) => {
      const previousCountry = current.address.country;
      const next = {
        ...current,
        address: {
          ...current.address,
          [field]: value,
        },
      };
      if (
        field === "country" &&
        (!current.contact.phone ||
          current.contact.phoneCountry === previousCountry)
      ) {
        next.contact = {
          ...current.contact,
          phoneCountry: value,
        };
      }
      if (
        field === "country" &&
        current.booking.timezone ===
          DEFAULT_TIMEZONE_BY_COUNTRY[previousCountry]
      ) {
        next.booking = {
          ...current.booking,
          timezone:
            DEFAULT_TIMEZONE_BY_COUNTRY[value] || current.booking.timezone,
        };
      }
      return next;
    });
  };
  const updateContact = (field, value) => {
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setForm((current) => ({
      ...current,
      contact: {
        ...current.contact,
        [field]: value,
      },
    }));
  };
  const updateBooking = (field, value) => {
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setForm((current) => ({
      ...current,
      booking: {
        ...current.booking,
        [field]: value,
      },
    }));
  };
  const updateGlobalCapacity = (value) => {
    const nextCapacity = Math.max(Number(value) || 0, 0);
    setFieldErrors((current) => ({
      ...current,
      globalCapacity: undefined,
    }));
    setForm((current) => ({
      ...current,
      booking: {
        ...current.booking,
        globalCapacity: value,
        activityCapacities: Object.fromEntries(
          Object.entries(current.booking.activityCapacities).map(
            ([activity, capacity]) => [
              activity,
              activityUsesOverall[activity] &&
              Number(capacity) > 0 &&
              nextCapacity > 0
                ? nextCapacity
                : capacity,
            ],
          ),
        ),
      },
    }));
  };
  const updateActivityCapacity = (activity, value) => {
    setFieldErrors((current) => ({
      ...current,
      [`activity-${activity}`]: undefined,
      activity: undefined,
    }));
    setForm((current) => ({
      ...current,
      booking: {
        ...current.booking,
        activityCapacities: {
          ...current.booking.activityCapacities,
          [activity]: value,
        },
      },
    }));
  };
  const setActivityEnabled = (activity, enabled) => {
    setActivityEnabledState((current) => ({
      ...current,
      [activity]: enabled,
    }));
    updateActivityCapacity(
      activity,
      enabled ? Math.max(Number(form.booking.globalCapacity) || 1, 1) : 0,
    );
    if (enabled) {
      setActivityUsesOverall((current) => ({
        ...current,
        [activity]: true,
      }));
    }
  };
  const setActivityCapacityMode = (activity, usesOverall) => {
    setActivityUsesOverall((current) => ({
      ...current,
      [activity]: usesOverall,
    }));
    updateActivityCapacity(
      activity,
      usesOverall
        ? Math.max(Number(form.booking.globalCapacity) || 1, 1)
        : Math.min(
            Math.max(Number(form.booking.activityCapacities[activity]) || 1, 1),
            Math.max(Number(form.booking.globalCapacity) || 1, 1),
          ),
    );
  };
  const setActivitySelectionMode = (mode) => {
    setFieldErrors((current) => ({
      ...current,
      activity: undefined,
    }));
    if (mode === ACTIVITY_SELECTION_MODE.HIDDEN) {
      setActivityEnabledState((current) =>
        Object.fromEntries(Object.keys(current).map((key) => [key, false])),
      );
    }
    setForm((current) => ({
      ...current,
      booking: {
        ...current.booking,
        activitySelectionMode: mode,
        activityCapacities:
          mode === ACTIVITY_SELECTION_MODE.HIDDEN
            ? Object.fromEntries(
                Object.keys(current.booking.activityCapacities).map((key) => [
                  key,
                  0,
                ]),
              )
            : current.booking.activityCapacities,
      },
    }));
  };
  const updateOpeningHours = (day, field, value) => {
    setOpeningHourErrors((current) => {
      if (!current[day]) return current;
      const next = {
        ...current,
      };
      delete next[day];
      return next;
    });
    setForm((current) => ({
      ...current,
      openingHours: {
        ...current.openingHours,
        [day]: {
          ...current.openingHours[day],
          [field]: value,
        },
      },
    }));
  };
  const normalizePhoneField = () => {
    if (!form.contact.phone) return;
    const parsed = parseInternationalPhone(
      form.contact.phone,
      form.contact.phoneCountry,
    );
    setForm((current) => ({
      ...current,
      contact: {
        ...current.contact,
        phoneCountry: parsed.countryCode,
        phone: parsed.nationalNumber,
      },
    }));
  };
  const validate = (formElement) => {
    const nextErrors = {};
    const requiredValues = {
      name: form.name,
      line1: form.address.line1,
      city: form.address.city,
      postalCode: form.address.postalCode,
      country: form.address.country,
      timezone: form.booking.timezone,
    };
    for (const [field, value] of Object.entries(requiredValues)) {
      if (!String(value || "").trim()) {
        nextErrors[field] = t("createPage.errors.required");
      }
    }
    if (
      form.contact.phone &&
      !isValidInternationalPhone(form.contact.phone, form.contact.phoneCountry)
    ) {
      nextErrors.phone = t("createPage.errors.phone");
    }
    if (activitiesVisible && enabledActivities.length === 0) {
      nextErrors.activity = t("createPage.errors.activityRequired");
    }
    if (Number(form.booking.globalCapacity) < 1) {
      nextErrors.globalCapacity = t("createPage.errors.required");
    }
    if (
      Number(form.booking.maxBookingMinutes) <
      Number(form.booking.minBookingMinutes)
    ) {
      nextErrors.maxBookingMinutes = t("createPage.errors.duration");
    }
    for (const { key } of enabledActivities) {
      const capacity = Number(form.booking.activityCapacities[key]);
      if (
        !activityUsesOverall[key] &&
        (capacity < 1 || capacity > Number(form.booking.globalCapacity))
      ) {
        nextErrors[`activity-${key}`] = t(
          "createPage.errors.activityCapacity",
          {
            max: Number(form.booking.globalCapacity) || 1,
          },
        );
      }
    }
    const hoursErrors = validateLocationOpeningHours(form.openingHours);
    setFieldErrors(nextErrors);
    setOpeningHourErrors(hoursErrors);
    if (!formElement.checkValidity()) {
      formElement.reportValidity();
    }
    return {
      valid:
        Object.keys(nextErrors).length === 0 &&
        Object.keys(hoursErrors).length === 0 &&
        formElement.checkValidity(),
      nextErrors,
      hoursErrors,
    };
  };
  const submit = async (event) => {
    event.preventDefault();
    setRequestError("");
    const formElement = event.currentTarget;
    const validation = validate(formElement);
    if (!validation.valid) {
      window.requestAnimationFrame(() => {
        formElement
          .querySelector(
            '[aria-invalid="true"], :invalid, [data-form-error-focus]',
          )
          ?.focus?.({
            preventScroll: true,
          });
        formElement
          .querySelector(
            '[aria-invalid="true"], :invalid, [data-form-error-focus]',
          )
          ?.scrollIntoView?.({
            behavior: "smooth",
            block: "center",
          });
      });
      return;
    }
    setIsCompleting(true);
    try {
      const payload = buildLocationPayload(form, {
        existingBooking: isEditing ? location?.booking : {},
        requireBookingEnabled,
      });
      const savedLocation = isEditing
        ? await updateLocation({
            id: locationId,
            ...payload,
          }).unwrap()
        : await createLocation(payload).unwrap();
      const savedLocationRecord = savedLocation?.location ?? savedLocation;
      if (isGuidedSetup) {
        if (
          isEditing &&
          (savedLocationRecord?.isActive ?? location?.isActive) === false
        ) {
          await activateLocation(locationId).unwrap();
        }
        await guidedSetup.refreshAndContinue({
          metadata: {
            form: "studio_location",
            locationId: savedLocationRecord?._id || savedLocationRecord?.id,
          },
        });
        return;
      }
      router.replace(returnHref);
    } catch (error) {
      setRequestError(
        getRequestError(
          error,
          isEditing ? t("form.requestError") : t("createPage.errors.request"),
        ),
      );
    } finally {
      setIsCompleting(false);
    }
  };
  return (
    <div className="mx-auto max-w-[1180px]">
      <Link
        href={returnHref}
        aria-disabled={isSaving}
        tabIndex={isSaving ? -1 : undefined}
        onClick={(event) => {
          if (isSaving) event.preventDefault();
        }}
        className={cx(
          "inline-flex items-center gap-2 text-[11px] font-semibold text-ink-muted transition hover:text-ink",
          isSaving && "pointer-events-none opacity-50",
        )}
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("createPage.back")}
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-cobalt-600">
            {t("createPage.eyebrow")}
          </p>
          <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.055em] text-ink sm:text-[36px]">
            {isEditing ? t("form.editTitle") : t("createPage.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-[12px] leading-6 text-ink-muted">
            {isEditing
              ? t("form.editDescription")
              : t("createPage.description")}
          </p>
          <p className="mt-1 text-[10px] text-ink-subtle">
            {t("createPage.requiredNote")}
          </p>
        </div>

        {!isEditing && !isGuidedSetup ? (
          <Link
            href={guideHref}
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-full border border-cobalt-200 bg-cobalt-50 px-4 text-[11px] font-semibold text-cobalt-700 transition hover:border-cobalt-300 hover:bg-cobalt-100"
          >
            <SparklesIcon aria-hidden="true" className="size-4" />
            {t("createPage.guide")}
          </Link>
        ) : null}
      </div>

      <form
        onSubmit={submit}
        noValidate
        data-guided-form={isEditing ? "location-edit" : "location-create"}
        className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
      >
        <div className="space-y-5">
          <FormSection
            guideTarget="location-identity"
            icon={BuildingOffice2Icon}
            tone="coral"
            title={t("createPage.sections.identity")}
            hint={t("createPage.sections.identityHint")}
          >
            <FormField
              name="name"
              label={`${t("createPage.fields.name")} *`}
              hint={t("createPage.hints.name")}
              error={fieldErrors.name}
            >
              <Input
                value={form.name}
                onChange={(event) => {
                  setFieldErrors((current) => ({
                    ...current,
                    name: undefined,
                  }));
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }));
                }}
                maxLength={160}
                autoComplete="organization"
                required
              />
            </FormField>
          </FormSection>

          <FormSection
            guideTarget="location-address"
            icon={MapPinIcon}
            title={t("createPage.sections.address")}
            hint={t("createPage.sections.addressHint")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                className="sm:col-span-2"
                name="line1"
                label={`${t("createPage.fields.addressLine1")} *`}
                error={fieldErrors.line1}
              >
                <Input
                  value={form.address.line1}
                  onChange={(event) =>
                    updateAddress("line1", event.target.value)
                  }
                  autoComplete="address-line1"
                  required
                />
              </FormField>
              <FormField
                className="sm:col-span-2"
                name="line2"
                label={t("createPage.fields.addressLine2")}
                optional
              >
                <Input
                  value={form.address.line2}
                  onChange={(event) =>
                    updateAddress("line2", event.target.value)
                  }
                  autoComplete="address-line2"
                />
              </FormField>
              <FormField
                name="city"
                label={`${t("createPage.fields.city")} *`}
                error={fieldErrors.city}
              >
                <Input
                  value={form.address.city}
                  onChange={(event) =>
                    updateAddress("city", event.target.value)
                  }
                  autoComplete="address-level2"
                  required
                />
              </FormField>
              <FormField
                name="postalCode"
                label={`${t("createPage.fields.postalCode")} *`}
                error={fieldErrors.postalCode}
              >
                <Input
                  value={form.address.postalCode}
                  onChange={(event) =>
                    updateAddress("postalCode", event.target.value)
                  }
                  autoComplete="postal-code"
                  required
                />
              </FormField>
              <FormField
                name="country"
                label={`${t("createPage.fields.country")} *`}
                error={fieldErrors.country}
              >
                <Select
                  value={form.address.country}
                  onChange={(event) =>
                    updateAddress("country", event.target.value)
                  }
                  autoComplete="country"
                  required
                >
                  {!COUNTRY_OPTIONS.some(
                    (country) => country.code === form.address.country,
                  ) ? (
                    <option value={form.address.country}>
                      {getCountryDisplayName(form.address.country, locale)}
                    </option>
                  ) : null}
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.code}>
                      {getCountryDisplayName(country.code, locale)}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                name="timezone"
                label={`${t("createPage.fields.timezone")} *`}
                hint={t("createPage.hints.timezone")}
                error={fieldErrors.timezone}
              >
                <Select
                  value={form.booking.timezone}
                  onChange={(event) =>
                    updateBooking("timezone", event.target.value)
                  }
                  required
                >
                  {!TIMEZONE_OPTIONS.includes(form.booking.timezone) ? (
                    <option value={form.booking.timezone}>
                      {form.booking.timezone.replaceAll("_", " ")}
                    </option>
                  ) : null}
                  {TIMEZONE_OPTIONS.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </FormSection>

          <FormSection
            guideTarget="location-contact"
            icon={PhoneIcon}
            tone="green"
            title={t("createPage.sections.contact")}
            hint={t("createPage.sections.contactHint")}
          >
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <FormField
                name="email"
                label={t("createPage.fields.email")}
                optional
              >
                <Input
                  type="email"
                  value={form.contact.email}
                  onChange={(event) =>
                    updateContact("email", event.target.value)
                  }
                  autoComplete="email"
                />
              </FormField>
              <div
                role="group"
                aria-labelledby="contact-phone-label"
                className="min-w-0"
              >
                <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
                  <p
                    id="contact-phone-label"
                    className="text-sm font-semibold text-[#1F1F1F]"
                  >
                    {t("createPage.fields.phone")}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-normal text-[#6F6F69]">
                      {commonT("optional")}
                    </span>
                    <FieldHelp label={t("createPage.tooltips.phone")}>
                      {t("createPage.tooltips.phone")}
                    </FieldHelp>
                  </div>
                </div>

                <div className="grid grid-cols-[minmax(116px,0.38fr)_minmax(0,1fr)] gap-2">
                  <div className="min-w-0">
                    <label className="sr-only" htmlFor="phoneCountry">
                      {t("createPage.fields.phoneCountry")}
                    </label>
                    <Select
                      id="phoneCountry"
                      name="phoneCountry"
                      aria-label={t("createPage.fields.phoneCountry")}
                      value={form.contact.phoneCountry}
                      onChange={(event) =>
                        updateContact("phoneCountry", event.target.value)
                      }
                      autoComplete="tel-country-code"
                    >
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.code} {country.dialCode}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="min-w-0">
                    <label className="sr-only" htmlFor="phone">
                      {t("createPage.fields.phone")}
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      aria-describedby="phone-description"
                      aria-invalid={fieldErrors.phone ? true : undefined}
                      value={form.contact.phone}
                      onChange={(event) =>
                        updateContact("phone", event.target.value)
                      }
                      onBlur={normalizePhoneField}
                      autoComplete="tel-national"
                      placeholder="605 989 401"
                    />
                  </div>
                </div>
                <p
                  id="phone-description"
                  className={cx(
                    "mt-2 text-xs leading-5",
                    fieldErrors.phone ? "text-danger" : "text-[#6F6F69]",
                  )}
                >
                  {fieldErrors.phone || t("createPage.hints.phone")}
                </p>
              </div>
            </div>
          </FormSection>

          <FormSection
            guideTarget="location-activity-choice"
            icon={WrenchScrewdriverIcon}
            tone="coral"
            title={t("createPage.sections.activityChoice")}
            hint={t("createPage.sections.activityChoiceHint")}
          >
            <div className="mb-4">
              <FieldHelp
                label={t("createPage.activityRationale.title")}
                triggerText={t("createPage.activityRationale.title")}
                panelClassName="w-[min(360px,calc(100vw-32px))]"
              >
                {t("createPage.activityRationale.description")}
              </FieldHelp>
            </div>
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-ink">
                {t("createPage.activityMode.label")}
              </legend>
              <div className="grid gap-3 lg:grid-cols-3">
                {[
                  ACTIVITY_SELECTION_MODE.REQUIRED,
                  ACTIVITY_SELECTION_MODE.OPTIONAL,
                  ACTIVITY_SELECTION_MODE.HIDDEN,
                ].map((mode) => {
                  const key = mode.toLowerCase();
                  return (
                    <ChoiceCard
                      key={mode}
                      label={t(`createPage.activityMode.${key}`)}
                      description={t(
                        `createPage.activityMode.${key}Description`,
                      )}
                      selected={form.booking.activitySelectionMode === mode}
                      onClick={() => setActivitySelectionMode(mode)}
                    />
                  );
                })}
              </div>
            </fieldset>
          </FormSection>

          <FormSection
            guideTarget="location-activity-capacity"
            icon={AdjustmentsHorizontalIcon}
            title={t("createPage.sections.activities")}
            hint={t("createPage.sections.activitiesHint")}
          >
            {activitiesVisible ? (
              <>
                {fieldErrors.activity ? (
                  <p
                    className="mb-4 rounded-[14px] border border-danger/20 bg-danger/5 px-4 py-3 text-xs leading-5 text-danger"
                    role="alert"
                    tabIndex="-1"
                    data-form-error-focus
                  >
                    {fieldErrors.activity}
                  </p>
                ) : null}
                <div className="grid gap-4">
                  {activityOptions.map((activity) => (
                    <ActivityCard
                      key={activity.key}
                      activity={activity}
                      capacity={
                        form.booking.activityCapacities[activity.key] ?? 0
                      }
                      capacityError={fieldErrors[`activity-${activity.key}`]}
                      enabled={activityEnabled[activity.key]}
                      globalCapacity={form.booking.globalCapacity}
                      usesOverall={activityUsesOverall[activity.key]}
                      onEnabledChange={(enabled) =>
                        setActivityEnabled(activity.key, enabled)
                      }
                      onUsesOverallChange={(usesOverall) =>
                        setActivityCapacityMode(activity.key, usesOverall)
                      }
                      onCapacityChange={(value) =>
                        updateActivityCapacity(activity.key, value)
                      }
                      t={t}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="rounded-[16px] border border-line bg-surface-muted px-4 py-4 text-sm leading-6 text-ink-muted">
                {t("createPage.activityMode.hiddenDescription")}
              </p>
            )}
          </FormSection>

          <FormSection
            guideTarget="location-capacity"
            icon={UsersIcon}
            tone="green"
            title={t("createPage.sections.capacity")}
            hint={t("createPage.sections.capacityHint")}
          >
            <div className="space-y-4">
              <Switch
                checked={form.booking.enabled}
                label={t("form.bookingEnabled")}
                description={
                  requireBookingEnabled
                    ? t("form.bookingRequiredForLaunch")
                    : form.booking.enabled
                      ? t("bookingEnabled")
                      : t("bookingDisabled")
                }
                disabled={requireBookingEnabled}
                onChange={(value) => updateBooking("enabled", value)}
              />
              <FormField
                name="globalCapacity"
                label={`${t("createPage.fields.globalCapacity")} *`}
                hint={t("createPage.hints.globalCapacity")}
                error={fieldErrors.globalCapacity}
                help={
                  <FieldHelp label={t("createPage.tooltips.globalCapacity")}>
                    {t("createPage.tooltips.globalCapacity")}
                  </FieldHelp>
                }
              >
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.booking.globalCapacity}
                  onChange={(event) => updateGlobalCapacity(event.target.value)}
                  required
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection
            guideTarget="location-timing"
            icon={ClockIcon}
            title={t("createPage.sections.timing")}
            hint={t("createPage.sections.timingHint")}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                name="slotStepMinutes"
                label={t("createPage.fields.slotStep")}
                hint={t("createPage.hints.slotStep")}
                help={
                  <FieldHelp label={t("createPage.tooltips.slotStep")}>
                    {t("createPage.tooltips.slotStep")}
                  </FieldHelp>
                }
              >
                <Select
                  value={form.booking.slotStepMinutes}
                  onChange={(event) =>
                    updateBooking("slotStepMinutes", Number(event.target.value))
                  }
                >
                  {slotStepOptions.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} {t("createPage.units.minutes")}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                name="minBookingMinutes"
                label={t("createPage.fields.minDuration")}
                hint={t("createPage.hints.duration")}
                help={
                  <FieldHelp label={t("createPage.tooltips.minDuration")}>
                    {t("createPage.tooltips.minDuration")}
                  </FieldHelp>
                }
              >
                <Select
                  value={form.booking.minBookingMinutes}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setForm((current) => ({
                      ...current,
                      booking: {
                        ...current.booking,
                        minBookingMinutes: value,
                        maxBookingMinutes: Math.max(
                          Number(current.booking.maxBookingMinutes),
                          value,
                        ),
                      },
                    }));
                    setFieldErrors((current) => ({
                      ...current,
                      maxBookingMinutes: undefined,
                    }));
                  }}
                >
                  {durationOptions.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {formatDurationMinutes(minutes, locale)}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                name="maxBookingMinutes"
                label={t("createPage.fields.maxDuration")}
                error={fieldErrors.maxBookingMinutes}
                help={
                  <FieldHelp label={t("createPage.tooltips.maxDuration")}>
                    {t("createPage.tooltips.maxDuration")}
                  </FieldHelp>
                }
              >
                <Select
                  value={form.booking.maxBookingMinutes}
                  onChange={(event) =>
                    updateBooking(
                      "maxBookingMinutes",
                      Number(event.target.value),
                    )
                  }
                >
                  {durationOptions
                    .filter(
                      (minutes) =>
                        minutes >= Number(form.booking.minBookingMinutes),
                    )
                    .map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {formatDurationMinutes(minutes, locale)}
                      </option>
                    ))}
                </Select>
              </FormField>
            </div>

            <section
              aria-labelledby="location-overlap-heading"
              className="mt-5 rounded-[16px] border border-line bg-surface-muted"
            >
              <div className="px-4 py-3.5">
                <h3
                  id="location-overlap-heading"
                  className="text-sm font-semibold text-ink"
                >
                  {t("form.overlapSection")}
                </h3>
                <p className="mt-1 text-xs font-normal leading-5 text-ink-muted">
                  {t("form.publicOverlapHelp")}
                </p>
              </div>
              <div className="space-y-3 border-t border-line p-4">
                <Switch
                  checked={form.booking.allowPublicSoloOverlap}
                  label={t("form.allowPublicOverlap")}
                  onChange={(value) =>
                    updateBooking("allowPublicSoloOverlap", value)
                  }
                />
                {form.booking.allowPublicSoloOverlap ? (
                  <FormField
                    name="maxPublicSoloOverlaps"
                    label={t("form.overlapLimit")}
                  >
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={form.booking.maxPublicSoloOverlaps}
                      onChange={(event) =>
                        updateBooking(
                          "maxPublicSoloOverlaps",
                          event.target.value,
                        )
                      }
                    />
                  </FormField>
                ) : null}
                <Switch
                  checked={form.booking.privateSessionBlocksAll}
                  label={t("form.privateBlocksAll")}
                  onChange={(value) =>
                    updateBooking("privateSessionBlocksAll", value)
                  }
                />
                <Switch
                  checked={form.booking.groupBookingBlocksAll}
                  label={t("form.groupBlocksAll")}
                  onChange={(value) =>
                    updateBooking("groupBookingBlocksAll", value)
                  }
                />
              </div>
            </section>
          </FormSection>

          <FormSection
            guideTarget="location-opening-hours"
            icon={CalendarDaysIcon}
            tone="coral"
            title={t("createPage.sections.hours")}
            hint={t("createPage.sections.hoursHint")}
          >
            <div className="overflow-hidden rounded-[16px] border border-line bg-white">
              {WEEKDAYS.map((day, index) => {
                const hours = form.openingHours[day];
                const error = openingHourErrors[day];
                const errorId = `opening-hours-${day}-error`;
                return (
                  <div
                    key={day}
                    className={cx(
                      "grid gap-3 px-4 py-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center",
                      index > 0 && "border-t border-line",
                      !hours.isOpen && "bg-surface-muted",
                    )}
                  >
                    <label className="flex min-w-0 items-center gap-2 text-xs font-semibold text-ink">
                      <input
                        type="checkbox"
                        checked={hours.isOpen}
                        onChange={(event) =>
                          updateOpeningHours(
                            day,
                            "isOpen",
                            event.target.checked,
                          )
                        }
                        className="size-4 shrink-0 rounded border-line text-cobalt-500 focus:ring-cobalt-500"
                      />
                      {t(`form.${day}`)}
                    </label>
                    <div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          aria-label={`${t(`form.${day}`)} – ${t("form.openTime")}`}
                          value={hours.openTime}
                          disabled={!hours.isOpen}
                          required={hours.isOpen}
                          pattern={LOCATION_OPEN_TIME_PATTERN.source}
                          maxLength={5}
                          placeholder="06:00"
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? errorId : undefined}
                          data-opening-hours-day={day}
                          onChange={(event) =>
                            updateOpeningHours(
                              day,
                              "openTime",
                              event.target.value,
                            )
                          }
                        />
                        <Input
                          aria-label={`${t(`form.${day}`)} – ${t("form.closeTime")}`}
                          value={hours.closeTime}
                          disabled={!hours.isOpen}
                          required={hours.isOpen}
                          pattern={LOCATION_CLOSE_TIME_PATTERN.source}
                          maxLength={5}
                          placeholder="24:00"
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? errorId : undefined}
                          onChange={(event) =>
                            updateOpeningHours(
                              day,
                              "closeTime",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                      {error ? (
                        <p
                          id={errorId}
                          className="mt-1.5 text-[11px] text-danger"
                          role="alert"
                        >
                          {t("form.openingHoursInvalid")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </FormSection>
        </div>

        <aside className="xl:sticky xl:top-[108px] xl:self-start">
          <section
            data-contextual-guide-target="location-review"
            className="rounded-[22px] border border-line bg-white p-5 shadow-card sm:p-6"
          >
            <div className="flex items-center gap-3 border-b border-line pb-5">
              <span className="flex size-10 items-center justify-center rounded-[12px] bg-success-soft text-success">
                <CheckCircleIcon aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.035em] text-ink">
                  {t("createPage.sections.review")}
                </h2>
                <p className="mt-1 text-[10px] leading-5 text-ink-muted">
                  {t("createPage.sections.reviewHint")}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
                  {t("createPage.fields.name")}
                </p>
                <p className="mt-1 text-base font-semibold text-ink">
                  {form.name.trim() || t("createPage.summary.emptyName")}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                  {summaryAddress || t("createPage.summary.addressMissing")}
                </p>
              </div>

              <div className="space-y-2 rounded-[16px] bg-surface-muted p-4 text-[11px] leading-5 text-ink-muted">
                <p>
                  {form.booking.activitySelectionMode ===
                  ACTIVITY_SELECTION_MODE.REQUIRED
                    ? t("createPage.summary.required")
                    : form.booking.activitySelectionMode ===
                        ACTIVITY_SELECTION_MODE.OPTIONAL
                      ? t("createPage.summary.optional")
                      : t("createPage.summary.hidden")}
                </p>
                {activitiesVisible ? (
                  <p>
                    {t("createPage.summary.activities", {
                      count: enabledActivities.length,
                    })}
                  </p>
                ) : null}
                <p>
                  {t("createPage.summary.capacity", {
                    count: Number(form.booking.globalCapacity) || 1,
                  })}
                </p>
                <p>
                  {t("createPage.summary.timing", {
                    step: Number(form.booking.slotStepMinutes),
                    min: formatDurationMinutes(
                      form.booking.minBookingMinutes,
                      locale,
                    ),
                    max: formatDurationMinutes(
                      form.booking.maxBookingMinutes,
                      locale,
                    ),
                  })}
                </p>
                <p>
                  {normalizedPhone
                    ? t("createPage.summary.phone", {
                        phone: normalizedPhone,
                      })
                    : t("createPage.summary.phoneMissing")}
                </p>
              </div>
            </div>

            {requestError ? (
              <p
                className="mt-4 rounded-[14px] border border-danger/20 bg-danger/5 px-4 py-3 text-xs leading-5 text-danger"
                role="alert"
              >
                {requestError}
              </p>
            ) : null}

            <div className="mt-5 grid gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-cobalt-500 px-5 text-[12px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600 disabled:cursor-wait disabled:opacity-60"
              >
                {isSaving
                  ? isEditing
                    ? t("form.saving")
                    : t("createPage.actions.creating")
                  : isEditing
                    ? isGuidedSetup
                      ? t("form.saveAndContinue")
                      : t("form.save")
                    : t("createPage.actions.create")}
              </button>
              <Link
                href={returnHref}
                aria-disabled={isSaving}
                tabIndex={isSaving ? -1 : undefined}
                onClick={(event) => {
                  if (isSaving) event.preventDefault();
                }}
                className={cx(
                  "inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-white px-5 text-[12px] font-semibold text-ink transition hover:border-line-strong hover:bg-surface-muted",
                  isSaving && "pointer-events-none opacity-50",
                )}
              >
                {t("createPage.actions.cancel")}
              </Link>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}
