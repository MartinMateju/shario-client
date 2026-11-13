import React, { useState } from "react";
import { XMarkIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { useSelector } from "react-redux";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { useGetProductsQuery } from "@/lib/features/products/productsApiSlice";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";
import { getOrderProductTypeLabel } from "@/utils/productBookingLabels";

const PRODUCT_TYPES = [
  "public-course",
  "private-course",
  "public-workshop",
  "private-workshop",
  "prolong",
  "blocker",
  "credit-voucher",
  "guest-increase",
];

const ORDER_STATUSES = [
  "pending_order",
  "processing_order",
  "processed_order",
  "failed_order",
];

export default function AdvancedOrdersFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  products = [],
}) {
  const translation = useLegacyTranslation();
  const language = useSelector(selectCurrentLanguage);
  const [showFilters, setShowFilters] = useState(false);

  const { data: productsData } = useGetProductsQuery(undefined, {
    skip: products.length > 0,
  });

  const displayProducts = products.length > 0 ? products : productsData || [];

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
      filters.userSearch ||
      filters.productType ||
      filters.status
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
          onTouchStart={(e) => {
            e.currentTarget.style.opacity = "0.8";
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-none text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px] touch-manipulation"
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
                    filters.userSearch && 1,
                    filters.productType && 1,
                    filters.status && 1,
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
              onTouchStart={(e) => {
                e.currentTarget.style.opacity = "0.7";
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              className="text-sm text-cobalt-600 hover:text-cobalt-800 font-medium min-h-[44px] min-w-[80px] px-3 py-2 touch-manipulation"
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

          {/* User Search */}
          <div>
            <label
              htmlFor="userSearch"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {translation["USER_SEARCH"]?.[language]}
            </label>
            <input
              type="text"
              id="userSearch"
              value={filters.userSearch || ""}
              onChange={(e) => handleFilterChange("userSearch", e.target.value)}
              placeholder={
                translation["SEARCH_BY_CUSTOM_ID_OR_EMAIL"]?.[language]
              }
              className="block w-full rounded-none border-0 py-1.5 text-black shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm"
            />
          </div>

          {/* Product Type Filter */}
          <div>
            <label
              htmlFor="productType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {translation["PRODUCT_TYPE"]?.[language]}
            </label>
            <select
              id="productType"
              value={filters.productType || ""}
              onChange={(e) =>
                handleFilterChange("productType", e.target.value)
              }
              className="block w-full rounded-none border-0 py-1.5 text-black shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset sm:text-sm"
            >
              <option value="">
                {translation["ALL_PRODUCT_TYPES"]?.[language]}
              </option>
              {PRODUCT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getOrderProductTypeLabel(type, language)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {translation["STATUS"]?.[language]}
            </label>
            <select
              id="status"
              value={filters.status || ""}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="block w-full rounded-none border-0 py-1.5 text-black shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset sm:text-sm"
            >
              <option value="">
                {translation["ALL_STATUSES"]?.[language]}
              </option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
