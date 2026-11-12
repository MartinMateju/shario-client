import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  InformationCircleIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import { Fragment, useRef, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, openCart } from "@/lib/features/cart/cartSlice";
import translation from "@/translations/translation";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { selectIsAuthenticated } from "@/lib/features/auth/authSlice";
import { Link } from "@/i18n/navigation";
import { formatMajorCurrencyAmount } from "@/utils/money";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import {
  getDateAsString,
  getTimeRangeAsUTCString,
  getProductByBooking,
  getDateHourAsString,
} from "@/utils/utilityFunctions";
import DynamicUserSelect from "../selects/DynamicUserSelect";
import {
  getFollowUpCourses,
  getNumberOfParticipantsAsString,
  hasUserBookedCourse,
} from "@/utils/sidebarUtils";

const getCourseProduct = (selectedBooking, products) => {
  if (!selectedBooking || !Object.keys(products).length) {
    return null;
  }
  const primaryProduct = getProductByBooking(products, selectedBooking);
  if (!primaryProduct) {
    return null;
  }
  return primaryProduct;
};

export default function CourseModal({
  open,
  setOpen,
  booking,
  products,
  bookings,
}) {
  const dispatch = useDispatch();
  const cancelButtonRef = useRef(null);
  const language = useSelector(selectCurrentLanguage);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const { id } = { id: "" };
  const cartItems = useSelector((state) => state.cart);
  const product = getCourseProduct(booking, products);
  const followUpCourses = getFollowUpCourses(booking, bookings, products);

  const [guestsNumber, setNumberOfGuests] = useState(1);
  const [courseGuestsNames, setCourseGuestsNames] = useState([]);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Reset messages when modal opens/closes
  useEffect(() => {
    if (open) {
      setErrMsg("");
      setSuccessMsg("");
      setNumberOfGuests(1);
      setCourseGuestsNames([]);
    }
  }, [open]);

  // Check if course is already in cart (duplicate prevention)
  const isCourseInCart = () => {
    if (!booking?._id || !cartItems?.cart) return false;
    return cartItems.cart.some(
      (item) =>
        item.bookingCourse === booking._id ||
        (item.product?._id === product?._id &&
          new Date(item.start).getTime() === new Date(booking.start).getTime()),
    );
  };

  // Check available capacity
  const getAvailableCapacity = () => {
    if (!product?.maxNumberOfParticipants) return null;
    const currentParticipants = booking?.numberOfGuests || 0;
    const maxParticipants = product.maxNumberOfParticipants;
    return Math.max(0, maxParticipants - currentParticipants);
  };

  const isFormValid = () => {
    setErrMsg("");

    // Check if course is already in cart
    if (isCourseInCart()) {
      setErrMsg(
        translation["ERROR_MODAL_CART_DUPLICATE"]?.[language] ||
          "This course is already in your cart.",
      );
      return false;
    }

    // Check capacity
    const availableCapacity = getAvailableCapacity();
    if (availableCapacity !== null && availableCapacity <= 0) {
      setErrMsg(
        translation["ERROR_CAPACITY"]?.[language] ||
          "This course is full. Please select a different time slot.",
      );
      return false;
    }

    if (
      (!booking?.start || !booking?.end) &&
      product?.type.includes("workshop")
    ) {
      setErrMsg(
        translation["SELECT_TIME_FIRST"]?.[language] ||
          "Please select a time slot first.",
      );
      return false;
    }
    return true;
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    setErrMsg("");
    setSuccessMsg("");

    // Check if user is logged in
    if (!isAuthenticated) {
      setErrMsg(
        translation["LOGIN_REQUIRED"]?.[language] ||
          "Please log in to add items to your cart. You can also checkout as a guest.",
      );
      return;
    }

    if (!product || !booking) {
      setErrMsg(
        translation["PRODUCT_NOT_FOUND"]?.[language] ||
          "Product or booking information is missing.",
      );
      return;
    }

    if (!isFormValid() || !isGuestNameValid()) {
      return;
    }

    // Check for duplicates one more time before adding
    if (isCourseInCart()) {
      setErrMsg(
        translation["ERROR_MODAL_CART_DUPLICATE"]?.[language] ||
          "This course is already in your cart.",
      );
      return;
    }

    // Check capacity one more time
    const availableCapacity = getAvailableCapacity();
    if (availableCapacity !== null && availableCapacity <= 0) {
      console.error("Course capacity exceeded: ", availableCapacity);
      setErrMsg(
        translation["ERROR_CAPACITY"]?.[language] ||
          "This course is now full. Please select a different time slot.",
      );
      return;
    }

    try {
      const cartItem = {
        title: product.name,
        start: booking.start,
        end: booking.end,
        date: new Date().toString(),
        product: product,
        quantity: guestsNumber,
        numberOfGuests: guestsNumber,
        bookingCourse: product?.type.includes("course") ? booking._id : null,
        cartDate: getDateAsString(booking.start),
        cartTime: getTimeRangeAsUTCString(booking.start, booking.end),
        guests: courseGuestsNames,
        bookingRef: booking._id,
        bookingProduct: product._id,
        isCartItem: true,
      };

      dispatch(addToCart({ cartItem }));
      // setSuccessMsg(
      //   translation["COURSE_ADDED_TO_CART"]?.[language] ||
      //   "Course added to cart successfully!"
      // );

      // Close modal after a short delay to show success message
      setTimeout(() => {
        setOpen(false);
        dispatch(openCart()); // Optionally open cart to show the added item
      }, 1000);
    } catch (error) {
      console.error("Error adding course to cart:", error);
      setErrMsg(
        translation["ADD_TO_CART_ERROR"]?.[language] ||
          "Failed to add course to cart. Please try again.",
      );
    }
  };

  const isCourseCapacityFulfilled = () => {
    const availableCapacity = getAvailableCapacity();
    return availableCapacity !== null && availableCapacity <= 0;
  };

  const canAddToCart = () => {
    // Check all conditions for adding to cart
    if (!isAuthenticated) return false;
    if (isCourseInCart()) return false;
    if (isCourseCapacityFulfilled()) return false;
    if (!booking?.isRoot) return false;
    if (!product) return false;
    return true;
  };

  const addGuests = () => {
    try {
      if (
        product?.maxNumberOfParticipants - booking?.numberOfGuests ===
        guestsNumber
      ) {
        return;
      }
      if (!isFormValid()) {
        return;
      }
      const emptyGuestInfo = { firstname: "", lastname: "" };
      const updated = [...courseGuestsNames, { ...emptyGuestInfo }];
      setCourseGuestsNames(updated);
      setNumberOfGuests(updated.length + 1);
      setErrMsg("");
    } catch (error) {
      console.log("Failed to add course guest, error: ", error);
    }
  };

  const deleteGuest = (index) => {
    if (index !== -1) {
      const updatedList = courseGuestsNames
        .slice(0, index)
        .concat(courseGuestsNames.slice(index + 1));
      setCourseGuestsNames(updatedList);
      setNumberOfGuests(updatedList.length + 1);
    }
    setErrMsg("");
  };

  const isGuestNameValid = () => {
    if (guestsNumber > 1) {
      const emptyNames = courseGuestsNames.filter(
        (g) =>
          g?.firstname.replace(" ", "") === "" ||
          g?.lastname.replace(" ", "") === "",
      );
      if (emptyNames.length > 0) {
        setErrMsg("Jména všech osob musí být vyplněna");
        return false;
      }
    }
    return true;
  };

  const handleCourseGuestNamesChange = (e) => {
    let updatedNames = [...courseGuestsNames];
    updatedNames[e.target.dataset.idx][e.target.name] = e.target.value;
    setCourseGuestsNames(updatedNames);
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        initialFocus={cancelButtonRef}
        onClose={() => {
          setOpen(false);
        }}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            data-dialog-backdrop
            className="fixed inset-0 bg-[#171717]/35 backdrop-blur-[3px] transition-opacity motion-reduce:transition-none"
          />
        </TransitionChild>
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto text-gray-900">
          <div className="flex min-h-full items-end justify-center p-0 text-center sm:items-center sm:p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel
                data-dialog-layout="modal"
                data-dialog-tone="tenant"
                className="relative max-h-[calc(100dvh-0.75rem)] w-full overflow-y-auto rounded-t-[24px] border border-line bg-surface-raised px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 text-left text-ink shadow-floating transition-all motion-reduce:transform-none motion-reduce:transition-none sm:max-h-[calc(100dvh-3rem)] sm:max-w-lg sm:rounded-[24px] sm:p-6"
              >
                <div className="sm:flex  sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-none bg-cobalt-100 sm:mx-0 sm:h-10 sm:w-10">
                    <InformationCircleIcon
                      className="h-6 w-6 text-cobalt-800"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <DialogTitle className="pt-2 text-lg font-medium">
                      {!product ? "" : product.name}
                    </DialogTitle>
                    <p className="text-sm pb-2 border-b">
                      {!product ? "" : product.description}
                    </p>
                    {booking?.description != "" && (
                      <p className="text-sm pt-2">
                        <strong>{translation["NOTE"][language]}: </strong>{" "}
                        {booking?.description}
                      </p>
                    )}
                    {booking?.isRoot && (
                      <>
                        <p className="pt-2">
                          <span className="font-medium">
                            {translation["LECTURER"][language]}
                          </span>
                          : {booking?.lecturer}
                        </p>
                        <time className="" dateTime="2022-01-22T06:00">
                          <span className="font-medium">
                            {translation["DATE"][language]}
                          </span>
                          : {getDateAsString(booking.start)}
                        </time>
                        {followUpCourses?.length > 0 && (
                          <>
                            <br />
                            <span className="font-medium">
                              Navazujicí termíny:{" "}
                            </span>
                            <br />
                            <span className="text-sm">
                              {followUpCourses.map((b, bIdx) => (
                                <p key={bIdx}>
                                  {"-> "}
                                  {b.name} {getDateAsString(b.start)},{" "}
                                  {getDateHourAsString(b.start)}-
                                  {getDateHourAsString(b.end)}
                                </p>
                              ))}
                            </span>
                          </>
                        )}
                        <p>
                          <span className="font-medium">
                            {translation["PARTICIPANTS"][language]}
                          </span>
                          : {getNumberOfParticipantsAsString(booking, products)}
                        </p>
                        <time className="" dateTime="2022-01-22T06:00">
                          <span className="font-medium">
                            {translation["TIME"][language]}
                          </span>
                          :{" "}
                          {getTimeRangeAsUTCString(booking.start, booking.end)}
                        </time>
                        <p className="">
                          <span className="font-medium">
                            {translation["PRICE"][language]}
                          </span>
                          :{" "}
                          {formatMajorCurrencyAmount(
                            product.price,
                            product.currency ||
                              DEFAULT_STUDIO_COMMERCE_CURRENCY,
                            language === "CZ" ? "cs-CZ" : "en-GB",
                          )}
                        </p>
                        {/* <div className="">
                          <DynamicUserSelect
                            addUser={addGuests}
                            deleteUser={deleteGuest}
                            names={courseGuestsNames}
                            onChange={handleCourseGuestNamesChange}
                            label={"Rezervujete kurz pro více osob?"}
                            title={"+ Přidat další osoby"}
                          />
                        </div> */}
                      </>
                    )}
                    {/* Capacity Information */}
                    {product?.maxNumberOfParticipants && (
                      <div className="mt-3 p-2 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">
                            {translation["CAPACITY"]?.[language] || "Capacity"}
                            :{" "}
                          </span>
                          {booking?.numberOfGuests || 0} /{" "}
                          {product.maxNumberOfParticipants}
                          {getAvailableCapacity() !== null && (
                            <span className="ml-2 text-gray-600">
                              ({getAvailableCapacity()}{" "}
                              {translation["AVAILABLE"]?.[language] ||
                                "available"}
                              )
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Error Messages */}
                    {isCourseInCart() && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          {translation["ERROR_MODAL_CART_DUPLICATE"]?.[
                            language
                          ] || "This course is already in your cart."}
                        </p>
                      </div>
                    )}
                    {isCourseCapacityFulfilled() && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">
                          {translation["ERROR_CAPACITY"]?.[language] ||
                            "This course is full. Please select a different time slot."}
                        </p>
                      </div>
                    )}
                    {!isAuthenticated && (
                      <div className="mt-3 p-3 bg-cobalt-50 border border-cobalt-200 rounded-md">
                        <p className="text-sm text-cobalt-800 mb-2">
                          {translation["LOGIN_REQUIRED"]?.[language] ||
                            "Please log in to add courses to your cart."}
                        </p>
                        <Link
                          href="/login"
                          className="text-sm font-medium text-cobalt-600 hover:text-cobalt-800 underline"
                          onClick={() => setOpen(false)}
                        >
                          {translation["LOGIN"]?.[language] || "Log in"}
                        </Link>
                        <span className="text-sm text-cobalt-600 mx-2">or</span>
                        <Link
                          href="/courses"
                          className="text-sm font-medium text-cobalt-600 hover:text-cobalt-800 underline"
                          onClick={() => setOpen(false)}
                        >
                          {translation["BOOK_AS_GUEST"]?.[language] ||
                            "Book as guest"}
                        </Link>
                      </div>
                    )}
                    {errMsg && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">{errMsg}</p>
                      </div>
                    )}
                    {successMsg && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-800">{successMsg}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
                  {canAddToCart() && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 w-full justify-center bg-cobalt-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cobalt-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cobalt-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleAddToCart}
                    >
                      <ShoppingCartIcon className="h-5 w-5" />
                      {translation["ADD_TO_CART"]?.[language] || "Add to Cart"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={() => setOpen(false)}
                    ref={cancelButtonRef}
                  >
                    {translation["CLOSE"]?.[language] || "Close"}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
