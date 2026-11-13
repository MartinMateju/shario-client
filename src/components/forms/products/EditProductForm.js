import { useLegacyText } from "@/i18n/useLegacyCopy";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { PRODUCT_TYPES, LABEL_COLORS } from "@/config/constants";
import { useUpdateProductMutation } from "@/lib/features/products/productsApiSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import {
  selectCurrentTenant,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";
import Loader from "../../loaders/Loader";
import TextInput from "@/components/inputs/TextInput";
import TextArea from "@/components/textareas/TextArea";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";

function getProductName(product) {
  if (!product?.name) return "—";

  if (typeof product.name === "object") {
    return product.name.CZ || product.name.EN || "—";
  }

  return product.name;
}

function FieldLabel({ children }) {
  return (
    <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-black/55 font-medium">
      {children}
    </label>
  );
}

export default function EditProductForm({
  product = {},
  show = false,
  setShow,
  showConfirmModal,
}) {
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
  const [updateProduct, { isLoading, isSuccess }] = useUpdateProductMutation();

  const language = useSelector(selectCurrentLanguage);
  const { id, isAdmin } = useSelector(selectCurrentUser);
  const tenant = useSelector(selectCurrentTenant);
  const currency =
    tenant?.settings?.currency ||
    product?.currency ||
    DEFAULT_STUDIO_COMMERCE_CURRENCY;

  const [name, setName] = useState(product.name || "");
  const [type, setType] = useState(product?.type || "");
  const [price, setPrice] = useState(product.price ?? "");
  const [label, setLabel] = useState(product?.label || "");
  const [imageSrc, setImageSrc] = useState(product.imageSrc || "");
  const [description, setDescription] = useState(product?.description || "");
  const [maxNumberOfParticipants, setMaxNumberOfParticipants] = useState(
    product.maxNumberOfParticipants ?? "",
  );

  useEffect(() => {
    setName(product.name || "");
    setType(product?.type || "");
    setPrice(product.price ?? "");
    setImageSrc(product.imageSrc || "");
    setDescription(product?.description || "");
    setMaxNumberOfParticipants(product.maxNumberOfParticipants ?? "");
    setLabel(product?.label || "");
  }, [product]);

  useEffect(() => {
    if (isSuccess) {
      showConfirmModal(true);
      setShow(false);
    }
  }, [isSuccess, setShow, showConfirmModal]);

  const onCancelClicked = () => setShow(false);

  const onSubmitClicked = async (e) => {
    e.preventDefault();

    await updateProduct({
      id: product._id,
      name,
      type,
      price,
      currency,
      imageSrc,
      description,
      label,
      maxNumberOfParticipants,
      isAdmin,
      userId: id,
    });
  };

  if (!show) return null;

  if (isLoading) return <Loader />;

  return (
    <form
      onSubmit={onSubmitClicked}
      className="overflow-hidden border-t border-black/5 bg-white"
    >
      <div className="bg-[#FCFBF9] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--unnamed-color-b3a292)] font-medium">
            {legacyText("EditProductForm_Edit_product_fbeab")}{" "}
          </p>

          <h3 className="text-lg font-medium text-black sm:text-xl">
            {getProductName(product)}
          </h3>

          <p className="break-all text-xs text-black/45">
            {legacyText("EditProductForm_Product_ID_5d8ff")}{" "}
            {product._id || "—"}
          </p>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="min-w-0">
            <TextInput
              htmlFor="name"
              name="name"
              label={translation["NAME"][language]}
              id="name"
              data="name"
              value={name}
              callback={(e) => setName(e.target.value)}
              autoComplete="off"
              className="w-full"
              placeholder={legacyText(
                "EditProductForm_e_g_Introduction_to_photography_331c9",
              )}
            />
          </div>

          <div className="min-w-0">
            <FieldLabel>{translation["TYPE"][language]}</FieldLabel>
            <select
              id="type"
              name="type"
              onChange={(e) => setType(e.target.value)}
              value={type}
              className="
                block w-full rounded-[18px] border border-black/10 bg-white px-4 py-3
                text-sm text-black outline-none transition-all duration-200
                focus:border-[var(--unnamed-color-b3a292)]
                focus:ring-2 focus:ring-[var(--unnamed-color-b3a292)]/20
              "
            >
              {PRODUCT_TYPES.map((productType) => (
                <option key={productType} value={productType}>
                  {productType}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <TextInput
              htmlFor="price"
              name="price"
              label={translation["PRICE"][language]}
              id="price"
              data="price"
              value={price}
              callback={(e) => setPrice(e.target.value)}
              autoComplete="off"
              className="w-full"
              placeholder="e.g. 999, 1299"
            />
          </div>

          <div className="min-w-0">
            <TextInput
              htmlFor="participants"
              name="participants"
              label={translation["MAX_NO_PARTICIPANTS"][language]}
              id="participants"
              data="participants"
              value={maxNumberOfParticipants}
              callback={(e) => setMaxNumberOfParticipants(e.target.value)}
              autoComplete="off"
              className="w-full"
              placeholder="e.g. 1, 2, 3"
            />
          </div>

          <div className="min-w-0">
            <FieldLabel>{translation["BOOKING_COLOR"][language]}</FieldLabel>
            <select
              id="label"
              name="label"
              onChange={(e) => setLabel(e.target.value)}
              value={label}
              className="
                block w-full rounded-[18px] border border-black/10 bg-white px-4 py-3
                text-sm text-black outline-none transition-all duration-200
                focus:border-[var(--unnamed-color-b3a292)]
                focus:ring-2 focus:ring-[var(--unnamed-color-b3a292)]/20
              "
            >
              {LABEL_COLORS.map((labelColor) => (
                <option key={labelColor} value={labelColor}>
                  {labelColor}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <TextInput
              htmlFor="imgSource"
              name="imgSource"
              label={translation["IMAGE_SOURCE"][language]}
              id="imgSource"
              data="imgSource"
              value={imageSrc}
              callback={(e) => setImageSrc(e.target.value)}
              autoComplete="off"
              className="w-full"
              placeholder={legacyText("EditProductForm_Image_URL_35c80")}
            />
          </div>

          <div className="lg:col-span-2">
            <TextArea
              label={translation["DESCRIPTION"][language]}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={legacyText(
                "EditProductForm_Product_description_optional_9111f",
              )}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-black/5 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancelClicked}
            className="
              inline-flex min-h-[46px] items-center justify-center rounded-[16px]
              border border-black/10 bg-white px-5 py-2.5 text-sm font-medium text-black
              transition-all duration-200
              hover:border-[var(--unnamed-color-b3a292)] hover:text-[var(--unnamed-color-b3a292)]
            "
          >
            {translation["CANCEL"][language]}
          </button>

          <button
            type="submit"
            className="
              inline-flex min-h-[46px] items-center justify-center rounded-[16px]
              bg-black px-5 py-2.5 text-sm font-medium text-white
              transition-all duration-200
              hover:bg-[var(--unnamed-color-b3a292)]
            "
          >
            {translation["SAVE"][language]}
          </button>
        </div>
      </div>
    </form>
  );
}
