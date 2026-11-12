import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useAddNewProductMutation } from "@/lib/features/products/productsApiSlice";
import Loader from "../../loaders/Loader";
import { PRODUCT_TYPES, LABEL_COLORS } from "@/config/constants";
import {
  selectCurrentTenant,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import translation from "@/translations/translation";
import TextInput from "@/components/inputs/TextInput";
import CancelButton from "@/components/buttons/CancelButton";
import SubmitButton from "@/components/buttons/SubmitButton";
import TextArea from "@/components/textareas/TextArea";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import { isLocationSpecificProduct } from "@/lib/features/products/products.contract.mjs";

export default function NewProductForm({
  show,
  setShow,
  showConfirmModal,
  showErrModal,
  setErrMsg,
  locationId,
}) {
  const [addNewProduct, { isLoading, isSuccess, isError, error }] =
    useAddNewProductMutation();

  const { id, isAdmin } = useSelector(selectCurrentUser);
  const tenant = useSelector(selectCurrentTenant);
  const currency =
    tenant?.settings?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY;
  const language = useSelector(selectCurrentLanguage);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("1");
  const [imgSrc, setImgSrc] = useState("");
  const [type, setType] = useState(PRODUCT_TYPES[0]);
  const [desc, setDesc] = useState("");
  const [label, setLabel] = useState(LABEL_COLORS[0]);
  const [maxNumberOfParticipants, setMaxNumberOfParticipants] = useState("4");

  // PDF file (coupon template)
  const [templatePdf, setTemplatePdf] = useState(null);

  useEffect(() => {
    if (isSuccess) {
      setShow(false);
      showConfirmModal(true);
    }
    if (isError || error != null) {
      setShow(false);
      setErrMsg(error?.data?.message || "Request failed");
      showErrModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, isError]);

  // Reset coupon-only fields when switching away from coupon
  useEffect(() => {
    if (type !== "coupon") {
      setTemplatePdf(null);
    }
  }, [type]);

  const onCancelClicked = () => setShow(false);

  const onSubmitClicked = async (e) => {
    try {
      e.preventDefault();

      // Guard: coupon requires template
      if (type === "coupon" && !templatePdf) {
        setErrMsg("Coupon product requires a PDF template.");
        showErrModal(true);
        return;
      }

      // Build FormData (multipart)
      const fd = new FormData();
      fd.append("name", name);
      fd.append("type", type);
      if (isLocationSpecificProduct({ type }))
        fd.append("locationId", locationId || "");
      fd.append("price", String(price));
      fd.append("currency", currency);
      fd.append("label", label);
      fd.append("imageSrc", imgSrc);
      fd.append("description", desc);
      fd.append("userId", id);
      fd.append("maxNumberOfParticipants", String(maxNumberOfParticipants));

      // ✅ IMPORTANT: backend expects field name "file"
      if (type === "coupon" && templatePdf) {
        fd.append("file", templatePdf);
      }

      await addNewProduct(fd);
    } catch (err) {
      console.log("Failed to add new product, error: ", err);
      setErrMsg("Failed to add new product.");
      showErrModal(true);
    }
  };

  const onNameChanged = (e) => setName(e.target.value);
  const onPriceChanged = (e) => setPrice(e.target.value);
  const onMaxNumberOfParticipantsChanged = (e) =>
    setMaxNumberOfParticipants(e.target.value);
  const onTypeChanged = (e) => setType(e.target.value);
  const onImageSrcChanged = (e) => setImgSrc(e.target.value);
  const onDescriptionChanged = (e) => setDesc(e.target.value);
  const onLabelChanged = (e) => setLabel(e.target.value);

  const onTemplatePdfChanged = (e) => {
    const file = e.target?.files?.[0] || null;
    if (!file) {
      setTemplatePdf(null);
      return;
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setTemplatePdf(null);
      e.target.value = "";
      setErrMsg("Please upload a PDF file.");
      showErrModal(true);
      return;
    }

    const maxMb = 10;
    if (file.size > maxMb * 1024 * 1024) {
      setTemplatePdf(null);
      e.target.value = "";
      setErrMsg(`PDF is too large. Max ${maxMb} MB.`);
      showErrModal(true);
      return;
    }

    setTemplatePdf(file);
  };

  if (isLoading) return <Loader />;

  return (
    <>
      {show && (
        <div className="overflow-hidden mt-2 rounded-none bg-white shadow grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <div className="pl-4 mt-2 grid grid-cols-1 gap-4 lg:col-span-2">
            <h1 className="text-xl text-left font-medium leading-7 mt-4 max-w-4xl pt-0-5 text-gray-600">
              {translation["NEW_PRODUCT"][language]}
            </h1>

            <div className="mt-2 space-y-2 sm:col-span-2 sm:mt-0">
              <label
                htmlFor="type"
                className="text-left pt-2 block text-sm font-medium leading-6 text-gray-900"
              >
                {translation["TYPE"][language]}{" "}
                <span className="text-red-600"> *</span>
              </label>

              <div className="flex rounded-none shadow-sm ring-1 ring-gray-300 focus-within:ring-1 focus-within:ring-inset sm:max-w-md">
                <select
                  id="type"
                  name="type"
                  value={type}
                  onChange={onTypeChanged}
                  className="block w-full rounded-none border-0 py-2 px-2 text-gray-900 ring-inset ring-gray-300 focus:ring-2 sm:text-sm sm:leading-6"
                >
                  {PRODUCT_TYPES.map((t, index) => (
                    <option key={index} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <TextInput
                htmlFor={"name"}
                key={"name"}
                name={"name"}
                label={translation["NAME"][language]}
                id={"name"}
                data={"name"}
                value={name}
                callback={onNameChanged}
                autoComplete="off"
                className={"max-w-md pt-4"}
                placeholder="e.g. Introduction to photography"
                isMandatory={true}
              />

              <TextInput
                htmlFor={"price"}
                key={"price"}
                name={"price"}
                label={translation["PRICE"][language]}
                id={"price"}
                data={"price"}
                value={price}
                callback={onPriceChanged}
                autoComplete="off"
                className={"max-w-md pt-2"}
                placeholder="e.g. 999, 1299"
                isMandatory={true}
              />

              {type !== "coupon" && (
                <TextInput
                  htmlFor={"participants"}
                  key={"participants"}
                  name={"participants"}
                  label={translation["MAX_NO_PARTICIPANTS"][language]}
                  id={"participants"}
                  data={"participants"}
                  value={maxNumberOfParticipants}
                  callback={onMaxNumberOfParticipantsChanged}
                  autoComplete="off"
                  className={"max-w-md pt-2"}
                  placeholder="e.g. 1, 2, 3"
                  isMandatory={true}
                />
              )}

              <TextInput
                htmlFor={"imgSource"}
                key={"imgSource"}
                name={"imgSource"}
                label={translation["IMAGE_SOURCE"][language]}
                id={"imgSource"}
                data={"imgSource"}
                value={imgSrc}
                callback={onImageSrcChanged}
                autoComplete="off"
                className={"max-w-md pt-2"}
                placeholder="e.g. URL source to Cloudinary"
                isMandatory={true}
              />

              {/* Coupon template */}
              {type === "coupon" && (
                <>
                  <label className="text-left block pt-3 text-sm font-medium leading-6 text-gray-900">
                    PDF template <span className="text-red-600">*</span>
                  </label>
                  <div className="sm:max-w-md">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={onTemplatePdfChanged}
                      className="block w-full text-sm text-gray-700
                      file:mr-4 file:rounded-none file:border-0
                      file:bg-gray-100 file:px-4 file:py-2
                      file:text-sm file:font-medium file:text-gray-800
                      hover:file:bg-gray-200"
                    />
                    {templatePdf ? (
                      <p className="mt-2 text-xs text-gray-500">
                        Selected:{" "}
                        <span className="font-medium">{templatePdf.name}</span>
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-gray-500">
                        Upload a .pdf template for the coupon.
                      </p>
                    )}
                  </div>
                </>
              )}

              {type !== "coupon" && (
                <>
                  <label
                    htmlFor="labelColor"
                    className="text-left block pt-2 text-sm font-medium leading-6 text-gray-900"
                  >
                    {translation["BOOKING_COLOR"][language]}{" "}
                    <span className="text-red-600"> *</span>
                  </label>
                  <div className="flex rounded-none shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset sm:max-w-md">
                    <select
                      id="label"
                      name="label"
                      value={label}
                      onChange={onLabelChanged}
                      className="block w-full rounded-none border-0 py-2 px-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 sm:text-sm sm:leading-6"
                    >
                      {LABEL_COLORS.map((c, index) => (
                        <option key={index} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <TextArea
                label={translation["DESCRIPTION"][language]}
                className="sm:max-w-md pt-2"
                value={desc}
                onChange={onDescriptionChanged}
                placeholder="Popis produktu (volitelné)"
              />

              <div className="mb-3 pt-7 py-6 flex items-center justify-end gap-x-6 max-w-md">
                <CancelButton
                  onClick={onCancelClicked}
                  text={translation["CANCEL"][language]}
                />
                <SubmitButton
                  onClick={onSubmitClicked}
                  text={translation["ADD"][language]}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
