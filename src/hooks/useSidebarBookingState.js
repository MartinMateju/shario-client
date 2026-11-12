import { useCallback, useState } from "react";

export default function useSidebarBookingState({
  date,
  prefillSummaryRequestedRef,
}) {
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [checkoutTimes, setCheckoutTimes] = useState([]);
  const [quantity, setQuantity] = useState(0);
  const [booking, setBooking] = useState(null);
  const [guestsNumber, setNumberOfGuests] = useState(1);
  const [bookingDate, setBookingDate] = useState(
    date ? new Date(date) : new Date(),
  );
  const [errMsg, setErrMsg] = useState("");
  const [courseGuestsNames, setCourseGuestsNames] = useState([]);
  const [courseTerm, setCourseTerm] = useState(null);
  const [singleGuestBookingType, setSingleGuestBookingType] =
    useState("public");
  const [plannedActivity, setPlannedActivity] = useState(null);
  const [isHydratingPrefill, setIsHydratingPrefill] = useState(false);

  const resetSidebarState = useCallback(() => {
    setStartTime(null);
    setEndTime(null);
    setCheckoutTimes([]);
    setQuantity(0);
    setBooking(null);
    setBookingDate(date ? new Date(date) : new Date());
    setErrMsg("");
    setCourseGuestsNames([]);
    setCourseTerm(null);
    setSingleGuestBookingType("public");
    setPlannedActivity(null);
    setNumberOfGuests(1);
    setIsHydratingPrefill(false);

    if (prefillSummaryRequestedRef) {
      prefillSummaryRequestedRef.current = false;
    }
  }, [date, prefillSummaryRequestedRef]);

  return {
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    checkoutTimes,
    setCheckoutTimes,
    quantity,
    setQuantity,
    booking,
    setBooking,
    guestsNumber,
    setNumberOfGuests,
    bookingDate,
    setBookingDate,
    errMsg,
    setErrMsg,
    courseGuestsNames,
    setCourseGuestsNames,
    courseTerm,
    setCourseTerm,
    singleGuestBookingType,
    setSingleGuestBookingType,
    plannedActivity,
    setPlannedActivity,
    isHydratingPrefill,
    setIsHydratingPrefill,
    resetSidebarState,
  };
}
