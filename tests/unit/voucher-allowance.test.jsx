import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VoucherAllowance from "@/components/vouchers/VoucherAllowance";

const query = vi.hoisted(() => vi.fn());
vi.mock("next-intl", () => ({
  useTranslations: () => (key, values) =>
    `${key}${values ? ` ${values.count}/${values.limit}` : ""}`,
}));
vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetVoucherAllowanceQuery: query,
}));

describe("published voucher allowance", () => {
  it("shows server usage and an archive or upgrade explanation when at the limit", () => {
    query.mockReturnValue({
      data: { activeCount: 3, maxActiveVoucherOfferings: 3, canPublish: false },
    });
    render(<VoucherAllowance />);
    expect(screen.getByRole("status")).toHaveTextContent("allowance.usage 3/3");
    expect(screen.getByRole("status")).toHaveTextContent("allowance.limitHelp");
  });
  it("keeps a historical unlimited allowance unbounded", () => {
    query.mockReturnValue({
      data: {
        activeCount: 40,
        maxActiveVoucherOfferings: null,
        canPublish: true,
        grandfathered: true,
      },
    });
    render(<VoucherAllowance />);
    expect(screen.getByRole("status")).toHaveTextContent("allowance.unlimited");
    expect(screen.queryByText("allowance.limitHelp")).not.toBeInTheDocument();
  });
});
