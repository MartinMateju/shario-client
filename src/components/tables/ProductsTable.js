import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import ConfirmationModal from "../modals/ConformationModal";
import AlertModal from "../modals/AlertModal";
import ErrorModal from "../modals/ErrorModal";
import Loader from "../loaders/Loader";
import { WorkspaceTable } from "@/components/dashboard/WorkspaceDataSurface";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import {
  isProductAvailableAtLocation,
  isLocationSpecificProduct,
} from "@/lib/features/products/products.contract.mjs";
import { formatMajorCurrencyAmount } from "@/utils/money";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import {
  useDeleteProductMutation,
  useGetProductsQuery,
} from "@/lib/features/products/productsApiSlice";
import NewProductForm from "../forms/products/NewProductForm";
import EditProductForm from "../forms/products/EditProductForm";
import { CubeIcon, PlusIcon } from "@heroicons/react/24/outline";

const confirmText = {
  title: "Update was successful!",
  text: "You have successfully updated product",
};

const newProductText = {
  title: "New product was created!",
  text: "You have successfully created a new product",
};

const newProductErrorText = {
  title: "Operation failed",
  text: "Failed to create a new product",
};

const alertText = {
  title: "Remove",
  text: "Are you sure you want to remove this product? All of your data related to the product will be permanently removed from our servers forever. This action cannot be undone.",
};

function getProductName(product) {
  if (!product?.name) return "—";

  if (typeof product.name === "object") {
    return product.name.CZ || product.name.EN || "—";
  }

  return product.name;
}

export default function ProductsTable({ activeStudio }) {
  const t = useTranslations("Products");
  const { id, isAdmin } = useSelector(selectCurrentUser);
  const activeStudioId = useSelector(selectActiveStudioId);
  const locationId =
    activeStudio?.id || activeStudio?._id || activeStudioId || "";

  const { data: products, isLoading: isLoadingProducts } = useGetProductsQuery(
    { locationId },
    {
      refetchOnMountOrArgChange: true,
      skip: false,
    },
  );

  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  const [showEditForm, setShowEditForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [showModalConfirm, setShowModalConfirm] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [showErrorProductModal, setShowErrorProductModal] = useState(false);
  const [errorMsgModal, setErrorMsgModal] = useState("");
  const [showModalAlert, setShowModalAlert] = useState(false);

  const productList = useMemo(
    () =>
      (products || []).filter((product) =>
        isProductAvailableAtLocation(product, locationId),
      ),
    [products, locationId],
  );

  const onEditClicked = (product) => {
    setSelectedProduct(product);
    setShowEditForm(true);
  };

  const onAddProductClicked = () => {
    setShowCreateForm((prev) => !prev);
  };

  const onRemoveClicked = (product) => {
    setSelectedProduct(product);
    setShowModalAlert(true);
  };

  const onRemoveProductClicked = async () => {
    if (!selectedProduct?._id) return;

    try {
      setShowModalAlert(false);
      await deleteProduct({
        id: selectedProduct._id,
        isAdmin,
        userId: id,
      }).unwrap();

      setSelectedProduct(null);
    } catch (err) {
      console.error("Failed to delete product:", err);
    }
  };

  if (isLoadingProducts || isDeleting) {
    return <Loader />;
  }

  return (
    <>
      <ConfirmationModal
        open={showModalConfirm}
        setOpen={setShowModalConfirm}
        text={confirmText.text}
        title={confirmText.title}
      />

      <ConfirmationModal
        open={showNewProductModal}
        setOpen={setShowNewProductModal}
        text={newProductText.text}
        title={newProductText.title}
      />

      <ErrorModal
        open={showErrorProductModal}
        setOpen={setShowErrorProductModal}
        error={errorMsgModal}
        text={newProductErrorText.text}
        title={newProductErrorText.title}
      />

      {selectedProduct && (
        <AlertModal
          open={showModalAlert}
          setOpen={setShowModalAlert}
          onSubmitClicked={onRemoveProductClicked}
          text={
            isLocationSpecificProduct(selectedProduct)
              ? t("archive.message", { name: getProductName(selectedProduct) })
              : alertText.text
          }
          title={
            isLocationSpecificProduct(selectedProduct)
              ? t("archive.title")
              : `${alertText.title} ${getProductName(selectedProduct)}`
          }
        />
      )}

      <div className="space-y-4">
        <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <div className="border-b border-black/5 bg-[#FCFBF9] px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="mt-1 text-lg font-medium text-black sm:text-xl">
                  Správa produktů
                </h3>
                <p className="mt-1 text-sm text-black/45">
                  Přehled produktů, jejich cen a rychlá správa záznamů.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[16px] border border-[var(--unnamed-color-b3a292)]/20 bg-[var(--unnamed-color-b3a292)]/10 px-4 py-2 text-xs font-medium text-[var(--unnamed-color-b3a292)]">
                  <CubeIcon className="h-4 w-4" />
                  {productList.length} produktů
                </div>

                <button
                  type="button"
                  onClick={onAddProductClicked}
                  className={`
                    inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px]
                    px-5 py-3 text-sm font-medium text-white transition-all duration-200
                    ${
                      showCreateForm
                        ? "bg-[var(--unnamed-color-b3a292)] hover:opacity-90"
                        : "bg-black hover:bg-[var(--unnamed-color-b3a292)]"
                    }
                  `}
                >
                  <PlusIcon className="h-4 w-4" />
                  {showCreateForm ? "Zavřít formulář" : "Přidat produkt"}
                </button>
              </div>
            </div>
          </div>

          <NewProductForm
            locationId={locationId}
            key={showCreateForm ? "open" : "closed"}
            show={showCreateForm}
            setShow={setShowCreateForm}
            showConfirmModal={setShowNewProductModal}
            showErrModal={setShowErrorProductModal}
            setErrMsg={setErrorMsgModal}
          />
        </div>

        <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <div className="max-h-[60vh] divide-y divide-black/5 overflow-y-auto overscroll-contain sm:hidden">
            {productList.length > 0 ? (
              productList.map((product) => (
                <div key={product._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-black">
                        {getProductName(product)}
                      </p>

                      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--unnamed-color-b3a292)]">
                        {product?.type || "Bez typu"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 rounded-[20px] border border-black/5 bg-[#FCFBF9] p-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-black/45 font-medium">
                        ID produktu
                      </p>
                      <p className="mt-1 break-all text-sm text-black/70">
                        {product._id || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-black/45 font-medium">
                        Cena
                      </p>
                      <p className="mt-1 text-sm text-black/70">
                        {formatMajorCurrencyAmount(
                          product.price ?? 0,
                          product.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY,
                          "cs-CZ",
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => onEditClicked(product)}
                      className="font-medium text-sm text-black transition-colors duration-200 hover:text-[var(--unnamed-color-b3a292)]"
                    >
                      Upravit
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveClicked(product)}
                      disabled={isDeleting}
                      className="font-medium text-sm text-red-600 transition-colors duration-200 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isLocationSpecificProduct(product)
                        ? t("actions.archive")
                        : "Odstranit"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-black/45">
                Zatím nebyly nalezeny žádné produkty.
              </div>
            )}
          </div>

          <div className="hidden max-h-[60vh] overflow-y-auto sm:block">
            <WorkspaceTable className="min-w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#FCFBF9]">
                  <th className="border-b border-black/5 px-6 py-4 text-left text-xs uppercase tracking-[0.14em] text-black/55 font-medium">
                    Název
                  </th>
                  <th className="border-b border-black/5 px-6 py-4 text-left text-xs uppercase tracking-[0.14em] text-black/55 font-medium">
                    Typ
                  </th>
                  <th className="border-b border-black/5 px-6 py-4 text-left text-xs uppercase tracking-[0.14em] text-black/55 font-medium">
                    Cena
                  </th>
                  <th className="border-b border-black/5 px-6 py-4 text-left text-xs uppercase tracking-[0.14em] text-black/55 font-medium">
                    Akce
                  </th>
                </tr>
              </thead>

              <tbody>
                {productList.length > 0 ? (
                  productList.map((product) => (
                    <tr
                      key={product._id}
                      className="transition-colors duration-150 hover:bg-[#F7F5F2]"
                    >
                      <td className="border-b border-black/5 px-6 py-4 text-sm font-medium text-black">
                        {getProductName(product)}
                      </td>

                      <td className="border-b border-black/5 px-6 py-4 text-sm text-black/70">
                        {product?.type || "—"}
                      </td>

                      <td className="border-b border-black/5 px-6 py-4 text-sm text-black/70">
                        {formatMajorCurrencyAmount(
                          product.price ?? 0,
                          product.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY,
                          "cs-CZ",
                        )}
                      </td>

                      <td className="border-b border-black/5 px-6 py-4 text-sm">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => onEditClicked(product)}
                            className="font-medium text-black transition-colors duration-200 hover:text-[var(--unnamed-color-b3a292)]"
                          >
                            Upravit
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemoveClicked(product)}
                            disabled={isDeleting}
                            className="font-medium text-red-600 transition-colors duration-200 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isLocationSpecificProduct(product)
                              ? t("actions.archive")
                              : "Odstranit"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-sm text-black/45"
                    >
                      Zatím nebyly nalezeny žádné produkty.
                    </td>
                  </tr>
                )}
              </tbody>
            </WorkspaceTable>
          </div>

          {showEditForm && selectedProduct && (
            <EditProductForm
              key={selectedProduct._id}
              product={selectedProduct}
              showConfirmModal={setShowModalConfirm}
              show={showEditForm}
              setShow={setShowEditForm}
            />
          )}
        </div>
      </div>
    </>
  );
}
