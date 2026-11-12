"use client";

import { useState } from "react";
import {
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import {
  workspaceInputClass,
  workspaceSecondaryButtonClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import {
  useCreateProductClassCategoryMutation,
  useDeleteProductClassCategoryMutation,
  useGetProductClassCategoriesQuery,
} from "@/lib/features/products/productsApiSlice";

const getApiError = (error, fallback) =>
  error?.data?.message || error?.error || fallback;

const normalizedName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en");

function CategoryLoadError({ onRetry, t }) {
  return (
    <div
      className="mt-4 flex items-center justify-between gap-3 rounded-[12px] border border-error/20 bg-error-soft px-3 py-2.5"
      role="alert"
    >
      <p className="text-[10px] text-error">
        {t("form.classCategoryLoadError")}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-2 text-[10px] font-semibold text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/20"
      >
        <ArrowPathIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {t("form.classCategoryRetry")}
      </button>
    </div>
  );
}

export default function ClassCategoryField({
  value,
  onChange,
  disabled = false,
  t,
}) {
  const [isManaging, setIsManaging] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const categoriesQuery = useGetProductClassCategoriesQuery();
  const [createCategory, { isLoading: isCreating }] =
    useCreateProductClassCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] =
    useDeleteProductClassCategoryMutation();
  const categories = categoriesQuery.data || [];
  const selectedManagedCategory = categories.find(
    (category) => normalizedName(category.name) === normalizedName(value),
  );
  const selectedCategoryExists = !value || Boolean(selectedManagedCategory);

  const handleCreate = async (event) => {
    event?.preventDefault();
    const name = newName.trim().replace(/\s+/g, " ");
    if (!name) {
      setError(t("form.classCategoryNameRequired"));
      return;
    }

    try {
      const category = await createCategory({ name }).unwrap();
      setNewName("");
      setError("");
      onChange(category.name);
    } catch (requestError) {
      const code = requestError?.data?.code;
      setError(
        code === "PRODUCT_CLASS_CATEGORY_CONFLICT"
          ? t("form.classCategoryDuplicate")
          : getApiError(requestError, t("form.classCategoryRequestError")),
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteCategory(deleteTarget.id).unwrap();
      if (normalizedName(value) === normalizedName(deleteTarget.name)) {
        onChange("");
      }
      setDeleteTarget(null);
      setError("");
    } catch (requestError) {
      const code = requestError?.data?.code;
      setDeleteTarget(null);
      setError(
        code === "PRODUCT_CLASS_CATEGORY_IN_USE"
          ? t("form.classCategoryInUse")
          : getApiError(requestError, t("form.classCategoryRequestError")),
      );
    }
  };

  const busy = disabled || isCreating || isDeleting;
  const categoryControlsDisabled =
    busy || categoriesQuery.isLoading || categoriesQuery.isError;

  return (
    <section className="rounded-[15px] border border-line bg-sand-50/70 p-4 sm:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label
          htmlFor="product-class-category"
          className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#555553]"
        >
          {t("form.classCategory")}
          <select
            id="product-class-category"
            aria-label={t("form.classCategory")}
            value={selectedManagedCategory?.name || value}
            onChange={(event) => onChange(event.target.value)}
            disabled={categoryControlsDisabled}
            className={workspaceInputClass}
          >
            <option value="">{t("form.classCategoryNone")}</option>
            {!selectedCategoryExists ? (
              <option value={value}>
                {t("form.classCategoryLegacy", { name: value })}
              </option>
            ) : null}
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-[10px] normal-case leading-4 tracking-normal text-[#777773]">
            {t("form.classCategoryHelp")}
          </span>
        </label>

        <button
          type="button"
          onClick={() => {
            if (isManaging) setDeleteTarget(null);
            setIsManaging(!isManaging);
            setError("");
          }}
          className={workspaceSecondaryButtonClass}
          aria-expanded={isManaging}
          aria-controls="class-category-manager"
        >
          {isManaging
            ? t("form.classCategoryManageClose")
            : t("form.classCategoryManage")}
        </button>
      </div>

      {!isManaging && categoriesQuery.isError ? (
        <CategoryLoadError onRetry={categoriesQuery.refetch} t={t} />
      ) : null}

      {isManaging ? (
        <div
          id="class-category-manager"
          className="mt-4 border-t border-line pt-4"
        >
          <div>
            <p className="text-[11px] font-semibold text-[#353533]">
              {t("form.classCategoryManagerTitle")}
            </p>
            <p className="mt-1 text-[10px] leading-5 text-[#777773]">
              {t("form.classCategoryManagerHelp")}
            </p>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              aria-label={t("form.classCategoryNew")}
              value={newName}
              onChange={(event) => {
                setNewName(event.target.value);
                if (error) setError("");
              }}
              maxLength={120}
              disabled={categoryControlsDisabled}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleCreate(event);
              }}
              placeholder={t("form.classCategoryPlaceholder")}
              className={workspaceInputClass}
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={categoryControlsDisabled || !newName.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-600 px-5 text-[11px] font-semibold text-white transition hover:bg-cobalt-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              {isCreating
                ? t("form.classCategoryAdding")
                : t("form.classCategoryAdd")}
            </button>
          </div>

          {categoriesQuery.isLoading ? (
            <p className="mt-4 text-[10px] text-[#777773]" role="status">
              {t("form.classCategoryLoading")}
            </p>
          ) : categoriesQuery.isError ? (
            <CategoryLoadError onRetry={categoriesQuery.refetch} t={t} />
          ) : categories.length === 0 ? (
            <p className="mt-4 rounded-[12px] border border-dashed border-line px-3 py-4 text-center text-[10px] text-[#777773]">
              {t("form.classCategoryEmpty")}
            </p>
          ) : (
            <ul
              className="mt-4 grid gap-2"
              aria-label={t("form.classCategoryList")}
            >
              {categories.map((category) => {
                const inUse = Number(category.productCount || 0) > 0;
                const inUseReasonId = `class-category-in-use-${category.id}`;

                return (
                  <li
                    key={category.id}
                    className="flex items-center justify-between gap-3 rounded-[12px] border border-line bg-white px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-[#353533]">
                        {category.name}
                      </p>
                      <p className="mt-0.5 text-[9px] text-[#858580]">
                        {t("form.classCategoryProductCount", {
                          count: Number(category.productCount || 0),
                        })}
                      </p>
                      {inUse ? (
                        <p
                          id={inUseReasonId}
                          className="mt-1 text-[9px] font-medium text-error"
                        >
                          {t("form.classCategoryInUse")}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      aria-label={t("form.classCategoryDelete", {
                        name: category.name,
                      })}
                      aria-describedby={inUse ? inUseReasonId : undefined}
                      aria-disabled={inUse || undefined}
                      disabled={busy}
                      onClick={() => {
                        if (!inUse) setDeleteTarget(category);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-[#777773] transition hover:border-error/30 hover:bg-error-soft hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/20 disabled:cursor-not-allowed disabled:opacity-35 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {deleteTarget ? (
            <div
              role="alertdialog"
              aria-labelledby="class-category-delete-title"
              aria-describedby="class-category-delete-description"
              className="mt-4 rounded-[14px] border border-error/25 bg-error-soft p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-error ring-1 ring-inset ring-error/15">
                  <TrashIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p
                    id="class-category-delete-title"
                    className="text-[11px] font-semibold text-error"
                  >
                    {t("form.classCategoryDeleteTitle")}
                  </p>
                  <p
                    id="class-category-delete-description"
                    className="mt-1 text-[10px] leading-5 text-[#6F4137]"
                  >
                    {t("form.classCategoryDeleteMessage", {
                      name: deleteTarget.name,
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  autoFocus
                  className={workspaceSecondaryButtonClass}
                >
                  {t("form.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-error px-5 text-[11px] font-semibold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("form.classCategoryDeleteConfirm")}
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-3 text-[10px] font-medium text-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
