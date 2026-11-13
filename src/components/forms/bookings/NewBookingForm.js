import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import { useLegacyText } from "@/i18n/useLegacyCopy";
import dayjs from "dayjs";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  useAddNewBookingMutation,
  useGetBookingsQuery,
} from "@/lib/features/bookings/bookingsApiSlice";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import { formatDateTime } from "@/utils/utilityFunctions";
import { dateKey, wallTimeMinutes } from "@/components/calendar/calendar.utils";

import { useGetAllLecturersQuery } from "@/lib/features/lecturers/lecturersApiSlice";
import { useGetProductsQuery } from "@/lib/features/products/productsApiSlice";
import { isProductAvailableAtLocation } from "@/lib/features/products/products.contract.mjs";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import { filterBookingsByProduct } from "@/utils/sidebarUtils";
import { times } from "@/utils/sidebarUtils";

import ComboBox from "@/components/comboboxes/ComboBox";
import DatePicker from "@/components/date-pickers/DatePicker";
import Loader from "../../loaders/Loader";
import MenuBox from "@/components/listboxes/MenuBox";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";
import PrimaryButton from "@/components/buttons/PrimaryButton";
import Checkbox from "@/components/checkboxes/Checkbox";
import SubmitButton from "@/components/buttons/SubmitButton";
import CancelButton from "@/components/buttons/CancelButton";
import TextArea from "@/components/textareas/TextArea";

const COURSE_LANGUAGE_OPTIONS = [
  { name: "Čeština (CZ)", value: "cz" },
  { name: "English (EN)", value: "en" },
];

const getTimeId = (time) => {
  const a = time.split(":")[0];
  const b = time.split(":")[1] !== "00" ? "5" : "0";
  return parseFloat(a + "." + b);
};

const getNewBookingQuantity = (startTime, endTime, product) => {
  if (!product) return 1;
  if (product?.type?.includes("course")) return 1;

  const timeDiff = getTimeId(endTime.name) - getTimeId(startTime.name);
  return timeDiff === 0 ? 1 : Math.ceil(timeDiff);
};

const getLocationId = (location) => {
  const id = location?._id || location?.id;

  return id ? String(id) : "";
};

const getLocationsFromResponse = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.locations)) return response.locations;

  return [];
};

export default function NewBookingForm({
  show,
  setShow,
  initialValues = {},
  showConfirmModal,
  showErrModal,
  setErrMsg,
}) {
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
  const { id, isAdmin } = useSelector(selectCurrentUser);
  const language = useSelector(selectCurrentLanguage);
  const activeStudioId = useSelector(selectActiveStudioId);

  const { data: locationsResponse, isLoading: isLoadingLocations } =
    useGetLocationsQuery(
      { isActive: true, bookingEnabled: true, limit: 100 },
      { skip: !id },
    );

  const bookingLocations = useMemo(
    () => getLocationsFromResponse(locationsResponse),
    [locationsResponse],
  );

  const defaultLocationId = useMemo(() => {
    const initialLocationId = initialValues.locationId
      ? String(initialValues.locationId)
      : "";
    const initialLocationExists = bookingLocations.some(
      (location) => getLocationId(location) === initialLocationId,
    );

    if (initialLocationExists) return initialLocationId;

    const requestedId = activeStudioId ? String(activeStudioId) : "";
    const requestedLocationExists = bookingLocations.some(
      (location) => getLocationId(location) === requestedId,
    );

    return requestedLocationExists
      ? requestedId
      : getLocationId(bookingLocations[0]);
  }, [activeStudioId, bookingLocations, initialValues.locationId]);

  const [bookingLocation, setBookingLocation] = useState(null);
  const selectedLocationId =
    getLocationId(bookingLocation) || defaultLocationId;
  const { data: products, isLoading: isLoadingProducts } = useGetProductsQuery(
    { locationId: selectedLocationId },
    { skip: !selectedLocationId },
  );

  const { data: bookings, isLoading: isLoadingBookingsRecords } =
    useGetBookingsQuery(
      selectedLocationId ? { locationId: selectedLocationId } : undefined,
      { skip: !id || isLoadingLocations || !selectedLocationId },
    );

  const [
    addNewBooking,
    { isLoading: isLoadingNewBooking, isSuccess, isError, error },
  ] = useAddNewBookingMutation();

  const { data: lecturers, isLoading: isLoadingLecturers } =
    useGetAllLecturersQuery({ userId: id });

  const [product, setProduct] = useState(null);

  const [dates, setDates] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [lecturer, setLecturer] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");

  const [isRoot, setIsRoot] = useState(false);
  const [hasFollowUpTerms, setHasFollowUpTerms] = useState(false);
  const [hasLecturer, setHasLecturer] = useState(false);
  const [productFollowUp, setProductFollowUp] = useState(null);

  const [availableTerms, setAvailableTerms] = useState([]);

  const [checkoutTimes, setCheckouTimes] = useState([]);
  const [bookingRefs, setBookingRefs] = useState([]);

  const [quantity, setQuantity] = useState(0);
  const [tempBooking, setTempBooking] = useState(null);

  const [courseLanguage, setCourseLanguage] = useState("cz");

  const [courseDate, setCourseDate] = useState({
    startDate: null,
    endDate: null,
  });

  const isCourseProduct = product?.type?.includes("course");
  const appliedInitialValuesRef = useRef("");

  useEffect(() => {
    setBookingLocation((currentLocation) => {
      const currentLocationId = getLocationId(currentLocation);
      const currentLocationIsAvailable = bookingLocations.some(
        (location) => getLocationId(location) === currentLocationId,
      );

      if (currentLocationIsAvailable) return currentLocation;

      return (
        bookingLocations.find(
          (location) => getLocationId(location) === defaultLocationId,
        ) ||
        bookingLocations[0] ||
        null
      );
    });
  }, [bookingLocations, defaultLocationId]);

  useEffect(() => {
    if (!show || !bookingLocation || !initialValues.start) return;

    const initialKey = [
      initialValues.locationId,
      initialValues.start,
      initialValues.end,
      initialValues.activityId,
    ].join("|");

    if (!initialKey || appliedInitialValuesRef.current === initialKey) return;

    const start = new Date(initialValues.start);
    const end = new Date(initialValues.end || initialValues.start);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

    const timeZone =
      bookingLocation?.booking?.timezone ||
      bookingLocation?.timeZone ||
      "Europe/Prague";
    const selectedDate = dateKey(start, timeZone);
    const startMinutes = wallTimeMinutes(start, timeZone);
    const endMinutes = wallTimeMinutes(end, timeZone);
    const initialStartTime = times.find((item) => {
      const [hours, minutes] = item.name.split(":").map(Number);
      return hours * 60 + minutes === startMinutes;
    });
    const initialEndTime = times.find((item) => {
      const [hours, minutes] = item.name.split(":").map(Number);
      const itemMinutes = hours * 60 + minutes;
      return (
        itemMinutes === endMinutes || (endMinutes === 0 && itemMinutes === 0)
      );
    });

    if (selectedDate) {
      const [year, month, day] = selectedDate.split("-").map(Number);
      const calendarDate = new Date(year, month - 1, day, 12, 0, 0, 0);
      const nextCourseDate = {
        startDate: calendarDate,
        endDate: calendarDate,
      };
      setCourseDate(nextCourseDate);
      setDates([nextCourseDate]);
    }

    if (initialStartTime) {
      setStartTime(initialStartTime);
      setCheckouTimes(times.slice(initialStartTime.id, times.length));
    }

    if (initialEndTime) {
      setEndTime(initialEndTime);
      if (initialStartTime) {
        setQuantity(
          getNewBookingQuantity(initialStartTime, initialEndTime, product),
        );
      }
    }

    appliedInitialValuesRef.current = initialKey;
  }, [bookingLocation, initialValues, product, show]);

  useEffect(() => {
    if (isSuccess) {
      showConfirmModal(true);
      setShow(false);
    }

    if (isError) {
      setErrMsg(
        getLocalizedApiErrorMessage(error, legacyText("bookingCreateError")),
      );
      showErrModal(true);
    }
  }, [
    isSuccess,
    isError,
    error,
    setErrMsg,
    setShow,
    showConfirmModal,
    showErrModal,
    legacyText,
  ]);

  useEffect(() => {
    const terms = filterBookingsByProduct(bookings, productFollowUp);
    setAvailableTerms(terms);
  }, [bookings, productFollowUp]);

  useEffect(() => {
    if (isCourseProduct) {
      setCourseLanguage("cz");
    } else {
      setCourseLanguage("cz");
    }
  }, [isCourseProduct]);

  const onCourseDateChanged = (e) => setCourseDate(e);
  const onLecturerChanged = (e) => setLecturer(e.target.value);
  const onDescriptionChanged = (e) => setDescription(e.target.value);
  const onNoteChanged = (e) => setNote(e.target.value);
  const onIsRootChanged = () => setIsRoot(!isRoot);
  const onHasFollowUpTermsChanged = () =>
    setHasFollowUpTerms(!hasFollowUpTerms);

  const onHasLecturerChanged = () => {
    setHasLecturer(!hasLecturer);
    if (hasLecturer) {
      setLecturer("");
    }
  };

  const onCancelClicked = () => setShow(false);

  const onStartTimeChanged = (time) => {
    setStartTime(time);
    setEndTime(null);
    setQuantity(0);

    if (time) {
      const timesUpdated = times.slice(time?.id, times.length);
      setCheckouTimes(timesUpdated);
    } else {
      setCheckouTimes([]);
    }
  };

  const onEndTimeChanged = (time) => {
    setEndTime(time);
    if (startTime && time) {
      setQuantity(getNewBookingQuantity(startTime, time, product));
    }
  };

  const onSubmitClicked = async (e) => {
    try {
      e.preventDefault();
      setErrMsg("");

      if (
        !product ||
        !isProductAvailableAtLocation(product, selectedLocationId)
      ) {
        setErrMsg("Produkt rezervace není vybrán.");
        showErrModal(true);
        return;
      }

      if (!getLocationId(bookingLocation)) {
        setErrMsg("Místo rezervace není vybráno.");
        showErrModal(true);
        return;
      }

      if (!dates.length) {
        setErrMsg("Datum rezervace není vybráno.");
        showErrModal(true);
        return;
      }

      if (!startTime || !endTime) {
        setErrMsg("Čas rezervace není kompletně vyplněn.");
        showErrModal(true);
        return;
      }

      if (isCourseProduct && !courseLanguage) {
        setErrMsg("Jazyk kurzu není vybrán.");
        showErrModal(true);
        return;
      }

      const refsUpdated = bookingRefs.map((b) => ({
        idx: b.idx,
        booking: b.booking,
      }));

      const payload = {
        dates: dates.map((d) => dayjs(d.startDate).format("YYYY-MM-DD")),
        createdBy: id,
        createdAt: new Date(),
        startTime: startTime?.name,
        endTime: endTime?.name,
        bookingProduct: product?._id,
        locationId: getLocationId(bookingLocation),
        ...(initialValues.activityId
          ? { plannedActivity: initialValues.activityId }
          : {}),
        lecturer,
        isAdmin,
        note,
        description,
        bookingRefs: refsUpdated,
        isRoot,
        language: isCourseProduct ? courseLanguage : "cz",
      };

      await addNewBooking(payload);
    } catch (submitError) {
      console.log("Failed to create a new booking, error: ", submitError);
      setErrMsg(submitError?.message || "Failed to create booking.");
      showErrModal(true);
    }
  };

  const onAddDateClicked = (e) => {
    e?.preventDefault();

    if (!courseDate.startDate) return;

    const newDate = dayjs(courseDate.startDate).format("YYYY-MM-DD");
    const alreadyExists = dates.some(
      (d) => dayjs(d.startDate).format("YYYY-MM-DD") === newDate,
    );

    if (alreadyExists) return;

    setDates([...dates, courseDate]);
    setCourseDate({
      startDate: null,
      endDate: null,
    });
  };

  const onClearDateClicked = (e) => {
    e?.preventDefault();

    setDates([]);
    setCourseDate({
      startDate: null,
      endDate: null,
    });
  };

  const onRemoveDateClicked = (indexToRemove) => {
    setDates(dates.filter((_, index) => index !== indexToRemove));
  };

  const onAddBookingRefClicked = () => {
    if (!tempBooking?.id) return;

    setBookingRefs([
      ...bookingRefs,
      {
        idx: bookingRefs.length,
        booking: tempBooking.id,
        date: tempBooking.name,
      },
    ]);
  };

  const onFollowUpBookingChanged = (val) => {
    setTempBooking(val);
  };

  const bookingTypeOptions = useMemo(() => {
    return (
      products?.filter(
        (item) =>
          isProductAvailableAtLocation(item, selectedLocationId) &&
          (item.type.includes("course") || item.type.includes("blocker")),
      ) || []
    );
  }, [products, selectedLocationId]);

  const selectedDatesFormatted = useMemo(() => {
    return [...dates]
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      )
      .map((d) => dayjs(d.startDate).format("DD.MM.YYYY"));
  }, [dates]);

  const selectedCourseLanguageLabel = useMemo(() => {
    return (
      COURSE_LANGUAGE_OPTIONS.find((item) => item.value === courseLanguage)
        ?.name || "—"
    );
  }, [courseLanguage]);

  const summaryRows = [
    { label: "Produkt", value: product?.name || "—" },
    { label: "Místo", value: bookingLocation?.name || "—" },
    {
      label: "Termíny",
      value: selectedDatesFormatted.length
        ? `${selectedDatesFormatted.length}×`
        : "—",
    },
    { label: "Začátek", value: startTime?.name || "—" },
    { label: "Konec", value: endTime?.name || "—" },
    { label: "Délka", value: quantity ? `${quantity} h` : "—" },
    {
      label: "Jazyk",
      value: isCourseProduct ? selectedCourseLanguageLabel : "—",
    },
    {
      label: "Lektor",
      value: hasLecturer ? lecturer || "Nevybrán" : "Bez lektora",
    },
  ];

  const isLoadingData =
    isLoadingProducts ||
    isLoadingBookingsRecords ||
    isLoadingNewBooking ||
    isLoadingLecturers ||
    isLoadingLocations;

  if (isLoadingData) {
    return <Loader />;
  }

  if (!show) {
    return null;
  }

  return (
    <div className="mt-3 rounded-2xl border border-black/10 bg-[#FCFBF9] shadow-sm">
      <form
        onSubmit={onSubmitClicked}
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]"
      >
        <div className="min-w-0 border-b border-black/5 lg:border-b-0 lg:border-r">
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <div className="mb-6">
              <h1 className="text-lg font-medium text-black sm:text-xl">
                {translation["ADD_NEW_BOOKING"][language]}
              </h1>
              <p className="mt-1 text-sm text-black/55">
                {legacyText(
                  "NewBookingForm_Enter_the_booking_details_bdd5c",
                )}{" "}
              </p>
            </div>

            <div className="space-y-6">
              <section className="rounded-xl border border-black/8 bg-white p-4">
                <div className="mb-4">
                  <h2 className="text-sm font-medium text-black">
                    {legacyText("NewBookingForm_Basic_details_42450")}{" "}
                  </h2>
                  <p className="mt-1 text-xs text-black/50">
                    {legacyText(
                      "NewBookingForm_Choose_the_product_location_date_and_time_for_the_booki_2d948",
                    )}{" "}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:max-w-[640px]">
                  <div className="text-sm">
                    <MenuBox
                      title={"Produkt rezervace"}
                      defaultValue={product?.name}
                      options={bookingTypeOptions}
                      value={product?.name}
                      onChange={setProduct}
                      placeholder={"Kliknutím vyberete produkt"}
                      isMandatory={true}
                    />
                  </div>

                  <div className="text-sm">
                    <MenuBox
                      title={"Místo rezervace"}
                      options={bookingLocations}
                      value={bookingLocation}
                      onChange={(location) => {
                        setBookingLocation(location);
                        setProduct(null);
                        setProductFollowUp(null);
                        setBookingRefs([]);
                        setStartTime(null);
                        setEndTime(null);
                      }}
                      placeholder={"Kliknutím vyberete místo"}
                      emptyMessage="Nejsou dostupná žádná místa"
                      disabled={bookingLocations.length === 0}
                      isMandatory={true}
                    />
                  </div>

                  {isCourseProduct && (
                    <div className="text-sm">
                      <MenuBox
                        title={"Jazyk kurzu"}
                        defaultValue={selectedCourseLanguageLabel}
                        options={COURSE_LANGUAGE_OPTIONS}
                        value={selectedCourseLanguageLabel}
                        onChange={(val) =>
                          setCourseLanguage(val?.value || "cz")
                        }
                        placeholder={"Kliknutím vyberete jazyk"}
                        isMandatory={true}
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black">
                      {translation["DATE"][language]}{" "}
                      <span className="text-red-600">*</span>
                    </label>

                    <div className="rounded-xl border border-black/10 bg-[#FCFBF9] p-3">
                      <DatePicker
                        date={courseDate}
                        onDateChange={onCourseDateChanged}
                      />

                      <div className="mt-3 flex flex-wrap gap-2">
                        <PrimaryButton
                          type="button"
                          callback={onAddDateClicked}
                          text="Přidat termín"
                        />
                        <PrimaryButton
                          type="button"
                          callback={onClearDateClicked}
                          text={translation["CLEAR_ALL"][language]}
                        />
                      </div>

                      {selectedDatesFormatted.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-black/45">
                            {legacyText(
                              "NewBookingForm_Selected_times_da07f",
                            )}{" "}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {selectedDatesFormatted.map((date, index) => (
                              <button
                                key={`${date}-${index}`}
                                type="button"
                                onClick={() => onRemoveDateClicked(index)}
                                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-black transition hover:border-black/20 hover:bg-black/5"
                                title={legacyText(
                                  "NewBookingForm_Remove_time_2278a",
                                )}
                              >
                                {date}{" "}
                                <span className="ml-1 text-black/40">×</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="text-sm">
                      <ComboBox
                        title={translation["START_TIME"][language]}
                        options={times}
                        setSelected={onStartTimeChanged}
                        selected={startTime}
                        placeholder={"Vyberte začátek"}
                        isMandatory={true}
                      />
                    </div>

                    <div className="text-sm">
                      <ComboBox
                        title={translation["END_TIME"][language]}
                        options={checkoutTimes}
                        setSelected={onEndTimeChanged}
                        selected={endTime}
                        placeholder={"Vyberte konec"}
                        isMandatory={true}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-black/8 bg-white p-4">
                <div className="mb-4">
                  <h2 className="text-sm font-medium text-black">
                    {legacyText("NewBookingForm_Internal_details_125a9")}{" "}
                  </h2>
                  <p className="mt-1 text-xs text-black/50">
                    {legacyText(
                      "NewBookingForm_Optional_details_for_internal_booking_management_bee7c",
                    )}{" "}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:max-w-[640px]">
                  <TextArea
                    label={legacyText("NewBookingForm_Note_2c924")}
                    className="pt-0"
                    value={note}
                    onChange={onNoteChanged}
                    placeholder={legacyText(
                      "NewBookingForm_This_note_appears_in_the_calendar_for_staff_only_fbd41",
                    )}
                    id="booking-note"
                    name="booking-note"
                    rows={2}
                  />

                  <div className="rounded-xl border border-black/8 bg-[#FCFBF9] px-3 py-3">
                    <Checkbox
                      id="lecturer-checkbox"
                      name="lecturer-checkbox"
                      htmlFor="lecturer-checkbox"
                      label={"Přidat lektora"}
                      text="Rezervace bude obsahovat jméno lektora."
                      checked={hasLecturer}
                      onChange={onHasLecturerChanged}
                    />

                    {hasLecturer && (
                      <div className="mt-3 pl-7">
                        <label
                          htmlFor="lecturer"
                          className="mb-2 block text-sm font-medium text-black"
                        >
                          {translation["LECTURER"][language]}
                        </label>

                        <select
                          id="lecturer"
                          name="lecturer"
                          onChange={onLecturerChanged}
                          value={lecturer}
                          className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black/25"
                        >
                          <option value="">
                            {legacyText(
                              "NewBookingForm_Select_an_instructor_5faef",
                            )}{" "}
                          </option>
                          {lecturers?.length > 0 &&
                            lecturers.map((lecturerItem, index) => (
                              <option
                                key={index}
                                value={`${lecturerItem.firstname} ${lecturerItem.lastname}`}
                              >
                                {`${lecturerItem.firstname} ${lecturerItem.lastname}`}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        <aside className="bg-[#FAF8F4]">
          <div className="px-4 py-4 sm:px-5 sm:py-5 lg:sticky lg:top-0">
            <div className="rounded-xl border border-black/8 bg-white p-4">
              <h2 className="text-sm font-medium text-black">
                {legacyText("NewBookingForm_Booking_summary_e2a9a")}{" "}
              </h2>
              <p className="mt-1 text-xs text-black/50">
                {legacyText(
                  "NewBookingForm_Review_the_selected_details_before_saving_f6480",
                )}{" "}
              </p>

              <div className="mt-4 space-y-3">
                {summaryRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-3 border-b border-black/5 pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="text-sm text-black/55">{row.label}</span>
                    <span className="max-w-[150px] text-right text-sm font-medium text-black">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {!!note?.trim() && (
                <div className="mt-4 rounded-lg bg-[#FCFBF9] p-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-black/40">
                    {legacyText("NewBookingForm_Note_2c924")}{" "}
                  </p>
                  <p className="text-sm text-black/75">{note}</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <SubmitButton
                type="submit"
                text={
                  isLoadingNewBooking ? "Ukládání..." : "Vytvořit rezervaci"
                }
              />
              <CancelButton
                onClick={onCancelClicked}
                text={translation["CANCEL"][language]}
              />
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
