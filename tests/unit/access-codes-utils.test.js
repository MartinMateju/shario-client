import { parseAccessCodeCsv } from "@/components/views/access-codes/accessCodes.utils";

describe("access-code CSV parsing", () => {
  it("preserves leading zeroes while parsing a header row", () => {
    const result = parseAccessCodeCsv(`
code,label,type,valid_until,programmed_and_tested
001234,Front door,SINGLE_BOOKING,2026-09-01T08:00:00.000Z,true
000007,Emergency reserve,EMERGENCY_RESERVE,,false
`);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        code: "001234",
        label: "Front door",
        type: "single_booking",
        validUntil: "2026-09-01T08:00:00.000Z",
        programmedAndTested: true,
      }),
      expect.objectContaining({
        code: "000007",
        label: "Emergency reserve",
        type: "emergency_reserve",
        validUntil: "",
        programmedAndTested: false,
      }),
    ]);
  });

  it("ignores blank lines and accepts a headerless list of codes", () => {
    const result = parseAccessCodeCsv("  001234  \n\n000007\n   \n");

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({ code: "001234" }),
      expect.objectContaining({ code: "000007" }),
    ]);
  });

  it("recognizes normalized code headers instead of importing the header", () => {
    const result = parseAccessCodeCsv("Door Code,Notes\n009900,After-hours");

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        code: "009900",
        notes: "After-hours",
      }),
    ]);
  });

  it("supports semicolon-delimited European CSV and entry-code aliases", () => {
    const result = parseAccessCodeCsv(
      "Entry Code;Status;Starts At\n001234;AVAILABLE;2026-09-01T08:00",
    );

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        code: "001234",
        status: "available",
        validFrom: "2026-09-01T08:00",
      }),
    ]);
  });
});
