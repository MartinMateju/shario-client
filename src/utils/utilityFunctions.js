import dayjs from "dayjs";
import { useEffect } from "react";

const getMonth = (month = dayjs().month()) => {
  month = Math.floor(month);
  const year = dayjs().year();

  // dayjs().day(): 0=Sun, 1=Mon, ... 6=Sat
  // Convert to Monday-first index: 0=Mon, ... 5=Sat, 6=Sun
  const firstDayOfTheMonth = dayjs(new Date(year, month, 1)).day();
  const mondayFirstOffset = (firstDayOfTheMonth + 6) % 7;

  let currentMonthCount = 0 - mondayFirstOffset;

  const daysMatrix = new Array(6).fill([]).map(() => {
    return new Array(7).fill(null).map(() => {
      currentMonthCount++;
      return dayjs(new Date(year, month, currentMonthCount));
    });
  });

  return daysMatrix;
};

export const useClickOutside = (ref, handleOnClickOutside) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handleOnClickOutside(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handleOnClickOutside]);
};

const getDate = (date = new Date()) => {
  return dayjs(date).get("date");
};

const calculateBookingPrice = (price, quantity, numberOfGuests) => {
  const safePrice = Number(price) || 0;
  const safeQuantity = Number(quantity) || 0;
  const safeGuests = Number(numberOfGuests) || 1;

  if (!safePrice || !safeQuantity) return 0;

  return safePrice * safeQuantity * safeGuests;
};

const getComparableDateAsString = (paramDate) => {
  if (!paramDate) {
    return "NaN";
  }
  try {
    const targetDate = new Date(paramDate);
    return (
      targetDate.getFullYear() +
      "/" +
      (targetDate.getMonth() + 1) +
      "/" +
      targetDate.getDate() +
      "/" +
      targetDate.getHours() +
      "/" +
      targetDate.getMinutes()
    );
  } catch (error) {
    console.log("Comp data as string error: ", paramDate);
    console.log("Error: ", error);
    return "NA";
  }
};

const formatMinutesToDoubleDigitString = (paramMins) => {
  try {
    return Number(paramMins).toString().padStart(2, "0");
  } catch (error) {
    console.log("Mins error: ", paramMins);
    console.log("Error time string format: ", error);
    return paramMins;
  }
};

const getDateHourAsString = (paramDate) => {
  if (!paramDate) {
    return "NaN";
  }
  try {
    const targetDate = new Date(paramDate);
    return `${new Date(
      targetDate,
    ).getHours()}:${formatMinutesToDoubleDigitString(
      new Date(targetDate).getMinutes(),
    )}`;
  } catch (error) {
    console.log("Date hour error: ", paramDate);
    console.log("Error when paring date hour as string: ", error);
    return "NA";
  }
};

const getDateHourAsUTCString = (paramDate) => {
  if (!paramDate) {
    return "NaN";
  }
  try {
    const targetDate = new Date(paramDate);
    return `${new Date(
      targetDate,
    ).getUTCHours()}:${formatMinutesToDoubleDigitString(
      new Date(targetDate).getUTCMinutes(),
    )}`;
  } catch (error) {
    console.log("Date hour utc error: ", paramDate);
    console.log("Error when paring date hour as string: ", error);
    return "NA";
  }
};

const getTimeRangeAsString = (dateA, dateB) => {
  if (!dateA || !dateB) {
    return "NaN";
  }
  try {
    const targetDateA = new Date(dateA);
    const targetDateB = new Date(dateB);
    return `${getDateHourAsString(targetDateA)}-${getDateHourAsString(
      targetDateB,
    )}`;
  } catch (error) {
    console.log("Time-range error: ", dateA);
    console.log("Error parsing time-range as string: ", error);
    return "NA";
  }
};

const getTimeRangeAsUTCString = (dateA, dateB) => {
  if (!dateA || !dateB) {
    return "NaN";
  }
  try {
    const targetDateA = new Date(dateA);
    const targetDateB = new Date(dateB);
    return `${getDateHourAsUTCString(targetDateA)}-${getDateHourAsUTCString(
      targetDateB,
    )}`;
  } catch (error) {
    console.log("Time-range utc error: ", dateA);
    console.log("Error parsing time-range as string: ", error);
    return "NA";
  }
};

const getBookingTermAsString = (paramDate) => {
  if (!paramDate) {
    return "NaN";
  }
  try {
    const targetDate = new Date(paramDate);
    return `${targetDate.getDate()}.${
      targetDate.getMonth() + 1
    }.${targetDate.getFullYear()}, ${getDateHourAsString(targetDate)}`;
  } catch (error) {
    console.log("Booking term error: ", paramDate);
    console.log("Error parsing booking term as string: ", error);
    return "NA";
  }
};

const getDateAsString = (paramDate) => {
  if (!paramDate) return "NaN";

  try {
    const targetDate = new Date(paramDate);

    if (Number.isNaN(targetDate.getTime())) return "NA";

    const day = String(targetDate.getDate()).padStart(2, "0");
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const year = targetDate.getFullYear();

    return `${day}.${month}.${year}`;
  } catch (error) {
    console.log("Parsing date as string error: ", paramDate);
    console.log("Error when parsing date as string: ", error);
    return "NA";
  }
};

const getProductByBooking = (products, booking) => {
  if (!booking) return undefined;

  const embeddedProduct =
    booking.product && typeof booking.product === "object"
      ? booking.product
      : undefined;
  const bookingProduct = booking.bookingProduct || embeddedProduct;
  const bookingProductId = String(
    typeof bookingProduct === "object"
      ? bookingProduct?.id || bookingProduct?._id || ""
      : bookingProduct || "",
  ).trim();

  if (!bookingProductId || !Array.isArray(products)) return embeddedProduct;

  return (
    products.find(
      (product) =>
        String(product?.id || product?._id || "").trim() === bookingProductId,
    ) || embeddedProduct
  );
};

const formatDateTime = (time, date) => {
  if (!time || !date) return null;

  const base =
    date instanceof Date ? date : new Date(String(date).replace(/-/g, "/"));

  if (!Number.isFinite(base.getTime())) return null;

  const [hh, mm] = String(time).split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  // Build a local Date reliably (no parsing of "YYYY/MM/DD HH:mm:ss")
  const d = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    hh,
    mm,
    0,
    0,
  );

  const t = d.getTime();
  return Number.isFinite(t) ? t : null; // ✅ serializable
};

const getPlannedActivityLabel = (activity, language) => {
  const normalized = String(activity || "").toUpperCase();

  const labels = {
    WORKSTATION: {
      CZ: "Pracovní místo",
      EN: "Workstation",
    },
    SHARED_TABLE: {
      CZ: "Práce u stolu",
      EN: "Work at the table",
    },
  };

  return labels[normalized]?.[language] || activity || "—";
};

const formatDateToYYYYMMDD = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based, so add 1
  const day = String(date.getDate()).padStart(2, "0"); // Pad single-digit days with leading zero
  return `${year}-${month}-${day}`;
};

const toLocalDateTimeString = (value) => {
  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export {
  getMonth,
  getDate,
  calculateBookingPrice,
  getComparableDateAsString,
  formatMinutesToDoubleDigitString,
  getDateHourAsString,
  getBookingTermAsString,
  getDateAsString,
  getTimeRangeAsString,
  getProductByBooking,
  getDateHourAsUTCString,
  getTimeRangeAsUTCString,
  formatDateTime,
  formatDateToYYYYMMDD,
  toLocalDateTimeString,
  getPlannedActivityLabel,
};
