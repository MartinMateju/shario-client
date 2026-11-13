import React, { useState } from "react";
import { XMarkIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { useSelector } from "react-redux";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { useGetProductsQuery } from "@/lib/features/products/productsApiSlice";
import { useGetAllLecturersQuery } from "@/lib/features/lecturers/lecturersApiSlice";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";

export default function AdvancedBookingsFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  products = [],
  lecturers = [],
}) {
  const translation = useLegacyTranslation();
  const language = useSelector(selectCurrentLanguage);
  const { id } = useSelector(selectCurrentUser);
  const [showFilters, setShowFilters] = useState(false);

  const { data: productsData } = useGetProductsQuery(undefined, {
    skip: products.length > 0,
  });
  const { data: lecturersData } = useGetAllLecturersQuery(
    { userId: id },
    {
      skip: lecturers.length > 0 || !id,
    },
  );

  const displayProducts = products.length > 0 ? products : productsData || [];
  const displayLecturers =
    lecturers.length > 0 ? lecturers : lecturersData || [];

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value,
      page: 1, // Reset to first page when filters change
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.dateFrom ||
      filters.dateTo ||
      filters.lecturer ||
      filters.productId ||
      filters.authorSearch ||
      filters.search
    );
  };

  const handleClearAll = () => {
    onClearFilters();
    setShowFilters(false);
  };

  return (
    <div className="mb-4">
      {/* Mobile: Collapsible filter button */}
      <div className="sm:hidden mb-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-none text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <span className="flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2" />
            {translation["FILTERS"]?.[language]}
            {hasActiveFilters() && (
              <span className="ml-2 px-2 py-0.5 bg-cobalt-600 text-white text-xs rounded-full">
                {
                  [
                    filters.dateFrom && 1,
                    filters.dateTo && 1,
                    filters.lecturer && 1,
                    filters.productId && 1,
                    filters.authorSearch && 1,
                    filters.search && 1,
                  ].filter(Boolean).length
                }
              </span>
            )}
          </span>
          {showFilters ? (
            <XMarkIcon className="h-5 w-5" />
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Desktop: Always visible, Mobile: Collapsible */}
      <div
        className={`${
          showFilters ? "block" : "hidden"
        } sm:block bg-white rounded-none shadow border border-gray-200 p-4 space-y-4`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {translation["ADVANCED_FILTERS"]?.[language]}
          </h3>
          {hasActiveFilters() && (
            <button
              onClick={handleClearAll}
              className="text-sm text-cobalt-600 hover:text-cobalt-800 font-medium"
            >
              {translation["CLEAR_FILTERS"]?.[language] || "Clear All"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Date Range - From */}
          <div>
            <label
              htmlFor="dateFrom"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {translation["DATE_FROM"]?.[language]}
            </label>
            <input
              type="date"
              id="dateFrom"
              value={filters.dateFrom || ""}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              className="block w-full rounded-none border-0 py-1.5 text-black shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm"
            />
          </div>

          {/* Date Range - To */}
          <div>
            <label
              htmlFor="dateTo"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {translation["DATE_TO"]?.[language]}
            </label>
            <input
              type="date"
              id="dateTo"
              value={filters.dateTo || ""}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              min={filters.dateFrom || ""}
              className="block w-full rounded-none border-0 py-1.5 text-black shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm"
            />
          </div>

          {/* Lecturer Filter */}
          <div>
            <label
              htmlFor="lecturer"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {translation["LECTURER"]?.[language]}
            </label>
            <select
              id="lecturer"
              value={filters.lecturer || ""}
              onChange={(e) => handleFilterChange("lecturer", e.target.value)}
              className="block w-full rounded-none border-0 py-1.5 text-black shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset sm:text-sm"
            >
              <option value="">
                {translation["ALL_LECTURERS"]?.[language]}
              </option>
              {displayLecturers.map((lecturer) => (
                <option
                  key={lecturer._id}
                  value={`${lecturer.firstname} ${lecturer.lastname}`}
                >
                  {lecturer.firstname} {lecturer.lastname}
                </option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label
              htmlFor="productId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {translation["PRODUCT"]?.[language]}
            </label>
            <select
              id="productId"
              value={filters.productId || ""}
              onChange={(e) => handleFilterChange("productId", e.target.value)}
              className="block w-full rounded-none border-0 py-1.5 text-black shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset sm:text-sm"
            >
              <option value="">
                {translation["ALL_PRODUCTS"]?.[language]}
              </option>
              {displayProducts.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {/* Author Search */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label
              htmlFor="authorSearch"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {translation["AUTHOR_SEARCH"]?.[language]}
            </label>
            <input
              type="text"
              id="authorSearch"
              value={filters.authorSearch || ""}
              onChange={(e) =>
                handleFilterChange("authorSearch", e.target.value)
              }
              placeholder={translation["SEARCH_BY_NAME_OR_ID"]?.[language]}
              className="block w-full rounded-none border-0 py-1.5 text-black shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
