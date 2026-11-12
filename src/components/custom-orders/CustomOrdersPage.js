"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Link } from "@/i18n/navigation";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import {
  useGetCustomOrdersQuery,
  useGetCustomOrderOptionsQuery,
} from "@/lib/features/customOrders/customOrdersApiSlice";
import WorkspaceSectionHeader from "@/components/dashboard/WorkspaceSectionHeader";
import {
  WorkspaceTableFrame,
  WorkspaceTableScroller,
  WorkspaceTable,
  WorkspaceTableHeader,
  WorkspaceTableHeadCell,
  WorkspaceTableBody,
  WorkspaceTableRow,
  WorkspaceTableCell,
  WorkspaceEmptyState,
  WorkspacePagination,
} from "@/components/dashboard/WorkspaceDataSurface";
import { formatOrderDate, orderId } from "./customOrders.utils";
import {
  inputClass,
  primaryClass,
  secondaryClass,
  OrderStatus,
  OrderLoading,
} from "./CustomOrderShared";

export default function CustomOrdersPage() {
  const t = useTranslations("CustomOrders");
  const locale = useLocale();
  const activeLocation = useSelector(selectActiveStudioId);
  const access = useSelector(selectCurrentWorkspaceAccess);
  const canManage = hasPermission(access, PERMISSIONS.ORDERS_MANAGE);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [status, setStatus] = useState("active");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ scope: "", page: 1 });
  const locationId = selectedLocation ?? activeLocation ?? "";
  const options = useGetCustomOrderOptionsQuery();
  const scope = `${locationId}|${status}|${search}`;
  const page = pagination.scope === scope ? pagination.page : 1;
  const setPage = (next) =>
    setPagination({
      scope,
      page: typeof next === "function" ? next(page) : next,
    });
  const query = useGetCustomOrdersQuery(
    { ...(locationId ? { locationId } : {}), status, search, page, limit: 20 },
    { skip: !options.data },
  );
  const items = query.data?.items || [];
  const addLink = (
    <Link
      href={`/app/custom-orders/new${locationId ? `?locationId=${locationId}` : ""}`}
      className={primaryClass}
    >
      <PlusIcon className="h-4 w-4" aria-hidden="true" />
      {t("new")}
    </Link>
  );

  return (
    <div className="space-y-6">
      <WorkspaceSectionHeader
        eyebrow={t("sales")}
        title={t("title")}
        description={t("description")}
        actions={canManage ? addLink : null}
      />
      <div className="rounded-[24px] border border-line bg-white p-4 shadow-card sm:p-5">
        <form
          className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_minmax(180px,260px)]"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchText.trim());
            setPage(1);
          }}
        >
          <div>
            <label
              htmlFor="custom-order-search"
              className="text-xs font-medium text-ink-muted"
            >
              {t("search")}
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="custom-order-search"
                className={`${inputClass} !mt-0 min-w-0`}
                value={searchText}
                maxLength={160}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={t("searchHint")}
              />
              <button className={secondaryClass} aria-label={t("search")}>
                <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div>
            <label
              htmlFor="custom-order-location"
              className="text-xs font-medium text-ink-muted"
            >
              {t("fields.locationId")}
            </label>
            <select
              id="custom-order-location"
              className={inputClass}
              value={locationId}
              onChange={(event) => {
                setSelectedLocation(event.target.value);
                setPage(1);
              }}
            >
              <option value="">{t("allLocations")}</option>
              {(options.data?.locations || []).map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </form>
        <div
          className="mt-5 flex flex-wrap gap-2"
          role="group"
          aria-label={t("filterStatus")}
        >
          {["all", "active", "overdue", "closed"].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
              className={`min-h-10 rounded-full px-4 text-sm font-medium transition ${status === value ? "bg-cobalt-500 text-white" : "bg-sand-50 text-ink-muted hover:bg-sand-100"}`}
            >
              {t(`statuses.${value}`)}
            </button>
          ))}
        </div>
      </div>
      {options.isLoading ||
      options.isError ||
      query.isLoading ||
      query.isError ? (
        <OrderLoading
          error={options.isError || query.isError}
          retry={() => {
            options.refetch();
            if (options.data) query.refetch();
          }}
        />
      ) : (
        <WorkspaceTableFrame aria-busy={query.isFetching}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="text-sm text-ink-muted">
              {t("total", { count: query.data?.total || 0 })}
            </p>
            {query.isFetching ? (
              <span role="status" className="text-xs text-ink-muted">
                {t("loading")}
              </span>
            ) : null}
          </div>
          {!items.length ? (
            <WorkspaceEmptyState
              contained
              icon={ClipboardDocumentListIcon}
              title={t("empty")}
              description={t("emptyDescription")}
              action={canManage ? addLink : null}
            />
          ) : (
            <>
              <div className="hidden lg:block">
                <WorkspaceTableScroller ariaLabel={t("title")}>
                  <WorkspaceTable>
                    <WorkspaceTableHeader>
                      <tr>
                        {[
                          "title",
                          "customer",
                          "locationId",
                          "startDate",
                          "deadline",
                          "assigneeId",
                          "status",
                        ].map((field) => (
                          <WorkspaceTableHeadCell key={field}>
                            {t(`fields.${field}`)}
                          </WorkspaceTableHeadCell>
                        ))}
                      </tr>
                    </WorkspaceTableHeader>
                    <WorkspaceTableBody>
                      {items.map((item) => (
                        <WorkspaceTableRow key={orderId(item)}>
                          <WorkspaceTableCell>
                            <Link
                              href={`/app/custom-orders/${orderId(item)}`}
                              className="block max-w-[260px] break-words font-semibold text-cobalt-600 hover:underline"
                            >
                              {item.title}
                            </Link>
                            <p className="mt-1 text-xs text-ink-muted">
                              {item.reference} ·{" "}
                              {t("pieces", { count: item.pieceCount })}
                            </p>
                          </WorkspaceTableCell>
                          <WorkspaceTableCell>
                            {item.customer?.name || "—"}
                          </WorkspaceTableCell>
                          <WorkspaceTableCell>
                            {item.location?.name || "—"}
                          </WorkspaceTableCell>
                          <WorkspaceTableCell>
                            {formatOrderDate(item.startDate, locale)}
                          </WorkspaceTableCell>
                          <WorkspaceTableCell>
                            <span
                              className={
                                item.isOverdue
                                  ? "font-semibold text-red-700"
                                  : ""
                              }
                            >
                              {formatOrderDate(item.deadline, locale)}
                            </span>
                          </WorkspaceTableCell>
                          <WorkspaceTableCell>
                            {item.assignee?.name || t("unassigned")}
                          </WorkspaceTableCell>
                          <WorkspaceTableCell>
                            <OrderStatus item={item} />
                          </WorkspaceTableCell>
                        </WorkspaceTableRow>
                      ))}
                    </WorkspaceTableBody>
                  </WorkspaceTable>
                </WorkspaceTableScroller>
              </div>
              <div className="divide-y divide-line lg:hidden">
                {items.map((item) => (
                  <article key={orderId(item)} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-ink-muted">
                          {item.reference}
                        </p>
                        <Link
                          href={`/app/custom-orders/${orderId(item)}`}
                          className="mt-1 block break-words font-semibold text-cobalt-600 hover:underline"
                        >
                          {item.title}
                        </Link>
                      </div>
                      <OrderStatus item={item} />
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        ["customer", item.customer?.name],
                        ["locationId", item.location?.name],
                        ["startDate", formatOrderDate(item.startDate, locale)],
                        ["deadline", formatOrderDate(item.deadline, locale)],
                        ["pieceCount", item.pieceCount],
                        ["assigneeId", item.assignee?.name || t("unassigned")],
                      ].map(([field, value]) => (
                        <div key={field}>
                          <dt className="text-xs text-ink-muted">
                            {t(`fields.${field}`)}
                          </dt>
                          <dd className="mt-1 break-words text-ink">
                            {value || "—"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
            </>
          )}
          <WorkspacePagination
            page={query.data?.page || page}
            pageCount={query.data?.pages || 1}
            onPrevious={() => setPage((value) => Math.max(1, value - 1))}
            onNext={() => setPage((value) => value + 1)}
            previousLabel={t("previous")}
            nextLabel={t("next")}
            pageLabel={t("pagination")}
          />
        </WorkspaceTableFrame>
      )}
    </div>
  );
}
