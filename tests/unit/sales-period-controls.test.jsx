import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SalesPeriodControls from "@/components/sales/SalesPeriodControls";
import messagesCs from "@/messages/cs.json";
import messagesEn from "@/messages/en.json";

const catalogs = [
  ["English", messagesEn.Sales],
  ["Czech", messagesCs.Sales],
];

const translator =
  (catalog) =>
  (key, values = {}) => {
    const message = key
      .split(".")
      .reduce((value, part) => value?.[part], catalog);
    if (typeof message !== "string") throw new Error(`Missing Sales.${key}`);
    return message.replace(
      /\{(\w+)\}/g,
      (match, name) => values[name] ?? match,
    );
  };

const initialFilters = {
  dateRange: "30",
  dateFrom: "",
  dateTo: "",
  userCustomId: "customer-1",
  userEmail: "",
  productType: "",
};

const initialProps = (catalog = messagesEn.Sales) => ({
  filters: initialFilters,
  dateFrom: "2026-09-20",
  dateTo: "2026-10-19",
  periodLabel: "20 Sep – 19 Oct 2026",
  onChange: vi.fn(),
  t: translator(catalog),
});

const chooseCustom = (catalog = messagesEn.Sales) => {
  fireEvent.change(
    screen.getByRole("combobox", { name: catalog.period.presetLabel }),
    { target: { value: "custom" } },
  );
};

describe("Sales period controls", () => {
  it.each(catalogs)(
    "provides labelled controls and the applied period in %s",
    (_locale, catalog) => {
      const props = initialProps(catalog);
      render(<SalesPeriodControls {...props} />);

      expect(
        screen.getByRole("heading", { name: catalog.period.title }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: catalog.period.title }),
      ).toBeInTheDocument();
      const selector = screen.getByRole("combobox", {
        name: catalog.period.presetLabel,
      });
      expect(selector).toHaveValue("30");
      for (const value of ["7", "30", "90", "month", "all", "custom"]) {
        expect(
          within(selector).getByRole("option", {
            name: catalog.dateRanges[value],
          }),
        ).toHaveValue(value);
      }
      expect(
        screen.getByText(
          props.t("period.appliedRange", { period: props.periodLabel }),
        ),
      ).toBeInTheDocument();

      chooseCustom(catalog);
      expect(screen.getByLabelText(catalog.filters.dateFrom)).toHaveAttribute(
        "type",
        "date",
      );
      expect(screen.getByLabelText(catalog.filters.dateTo)).toHaveAttribute(
        "type",
        "date",
      );
      expect(
        screen.getByRole("button", { name: catalog.period.apply }),
      ).toBeInTheDocument();
      expect(props.onChange).not.toHaveBeenCalled();
    },
  );

  it.each(["7", "30", "90", "month", "all"])(
    "applies the %s preset immediately and clears custom bounds",
    (dateRange) => {
      const props = {
        ...initialProps(),
        filters: {
          ...initialFilters,
          dateRange: "custom",
          dateFrom: "2026-08-01",
          dateTo: "2026-08-31",
        },
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
        periodLabel: "1–31 Aug 2026",
      };
      render(<SalesPeriodControls {...props} />);

      fireEvent.change(
        screen.getByRole("combobox", {
          name: messagesEn.Sales.period.presetLabel,
        }),
        { target: { value: dateRange } },
      );

      expect(props.onChange).toHaveBeenCalledExactlyOnceWith({
        dateRange,
        dateFrom: "",
        dateTo: "",
      });
      expect(
        screen.queryByRole("button", { name: messagesEn.Sales.period.apply }),
      ).not.toBeInTheDocument();
    },
  );

  it("keeps custom edits separate from the applied label until Apply", () => {
    const props = initialProps();
    const { rerender } = render(<SalesPeriodControls {...props} />);
    chooseCustom();
    fireEvent.change(screen.getByLabelText(messagesEn.Sales.filters.dateFrom), {
      target: { value: "2026-10-01" },
    });
    fireEvent.change(screen.getByLabelText(messagesEn.Sales.filters.dateTo), {
      target: { value: "2026-10-15" },
    });

    expect(props.onChange).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        props.t("period.appliedRange", { period: props.periodLabel }),
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: messagesEn.Sales.period.apply }),
    );
    expect(props.onChange).toHaveBeenCalledExactlyOnceWith({
      dateRange: "custom",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-15",
    });

    const appliedProps = {
      ...props,
      filters: { ...initialFilters, ...props.onChange.mock.calls[0][0] },
      dateFrom: "2026-10-01",
      dateTo: "2026-10-15",
      periodLabel: "1–15 Oct 2026",
    };
    rerender(<SalesPeriodControls {...appliedProps} />);
    expect(
      screen.getByText(
        props.t("period.appliedRange", { period: appliedProps.periodLabel }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        props.t("period.appliedRange", { period: props.periodLabel }),
      ),
    ).not.toBeInTheDocument();
  });

  it.each(["dateFrom", "dateTo"])(
    "rejects an empty custom %s without changing the applied period",
    (field) => {
      const props = initialProps();
      render(<SalesPeriodControls {...props} />);
      chooseCustom();
      fireEvent.change(screen.getByLabelText(messagesEn.Sales.filters[field]), {
        target: { value: "" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: messagesEn.Sales.period.apply }),
      );

      expect(props.onChange).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(
        messagesEn.Sales.period.invalidDates,
      );
      expect(
        screen.getByLabelText(messagesEn.Sales.filters[field]),
      ).toHaveAttribute("aria-invalid", "true");
      expect(
        screen.getByLabelText(messagesEn.Sales.filters[field]),
      ).toHaveAccessibleDescription(messagesEn.Sales.period.invalidDates);
      expect(
        screen.getByText(
          props.t("period.appliedRange", { period: props.periodLabel }),
        ),
      ).toBeInTheDocument();
    },
  );

  it("rejects a reversed range and allows a corrected single-day range", () => {
    const props = initialProps();
    render(<SalesPeriodControls {...props} />);
    chooseCustom();
    const from = screen.getByLabelText(messagesEn.Sales.filters.dateFrom);
    const to = screen.getByLabelText(messagesEn.Sales.filters.dateTo);
    fireEvent.change(from, { target: { value: "2026-10-20" } });
    fireEvent.change(to, { target: { value: "2026-10-19" } });
    fireEvent.click(
      screen.getByRole("button", { name: messagesEn.Sales.period.apply }),
    );

    expect(props.onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      messagesEn.Sales.period.reversedDates,
    );

    fireEvent.change(to, { target: { value: "2026-10-20" } });
    fireEvent.click(
      screen.getByRole("button", { name: messagesEn.Sales.period.apply }),
    );
    expect(props.onChange).toHaveBeenCalledExactlyOnceWith({
      dateRange: "custom",
      dateFrom: "2026-10-20",
      dateTo: "2026-10-20",
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects an impossible calendar date submitted through the custom form", () => {
    const props = initialProps();
    render(<SalesPeriodControls {...props} />);
    chooseCustom();
    const from = screen.getByLabelText(messagesEn.Sales.filters.dateFrom);
    fireEvent.change(from, { target: { value: "2026-02-30" } });
    fireEvent.submit(from.closest("form"));

    expect(props.onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      messagesEn.Sales.period.invalidDates,
    );
  });

  it("initializes an All time custom draft without applying it", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 2, 30, 12));
    try {
      const props = {
        ...initialProps(),
        filters: { ...initialFilters, dateRange: "all" },
        dateFrom: undefined,
        dateTo: undefined,
        periodLabel: messagesEn.Sales.dateRanges.all,
      };
      render(<SalesPeriodControls {...props} />);
      chooseCustom();

      expect(
        screen.getByLabelText(messagesEn.Sales.filters.dateFrom),
      ).toHaveValue("2026-03-01");
      expect(
        screen.getByLabelText(messagesEn.Sales.filters.dateTo),
      ).toHaveValue("2026-03-30");
      expect(props.onChange).not.toHaveBeenCalled();
      expect(
        screen.getByText(
          props.t("period.appliedRange", { period: props.periodLabel }),
        ),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("discards unsaved custom dates and validation errors after an external filter reset", () => {
    const props = initialProps();
    const { rerender } = render(<SalesPeriodControls {...props} />);
    chooseCustom();
    fireEvent.change(screen.getByLabelText(messagesEn.Sales.filters.dateFrom), {
      target: { value: "2026-01-01" },
    });
    fireEvent.change(screen.getByLabelText(messagesEn.Sales.filters.dateTo), {
      target: { value: "" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: messagesEn.Sales.period.apply }),
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(
      <SalesPeriodControls
        {...props}
        filters={{ ...initialFilters, userCustomId: "" }}
      />,
    );

    expect(
      screen.getByRole("combobox", {
        name: messagesEn.Sales.period.presetLabel,
      }),
    ).toHaveValue("30");
    expect(
      screen.queryByRole("button", { name: messagesEn.Sales.period.apply }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    chooseCustom();
    expect(
      screen.getByLabelText(messagesEn.Sales.filters.dateFrom),
    ).toHaveValue(props.dateFrom);
    expect(screen.getByLabelText(messagesEn.Sales.filters.dateTo)).toHaveValue(
      props.dateTo,
    );
    expect(props.onChange).not.toHaveBeenCalled();
  });
});
