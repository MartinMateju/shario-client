import { describe, expect, it } from "vitest";

const loadInteractions = () =>
  import("../../src/components/calendar/calendar.interactions.js");

describe("calendar interaction contracts", () => {
  it("snaps a pointer minute to the nearest configured interval", async () => {
    const { snapCalendarMinute } = await loadInteractions();

    expect(snapCalendarMinute(9 * 60 + 14, 30)).toBe(9 * 60);
    expect(snapCalendarMinute(9 * 60 + 16, 30)).toBe(9 * 60 + 30);
    expect(snapCalendarMinute(9 * 60 + 8, 15)).toBe(9 * 60 + 15);
  });

  it("builds a minimum-duration range inside the opening window", async () => {
    const { getSlotSelectionRange } = await loadInteractions();

    expect(
      getSlotSelectionRange({
        anchorMinute: 9 * 60 + 16,
        pointerMinute: 9 * 60 + 16,
        stepMinutes: 30,
        minimumMinutes: 60,
        openMinute: 9 * 60,
        closeMinute: 17 * 60,
      }),
    ).toEqual({
      startMinute: 9 * 60 + 30,
      endMinute: 10 * 60 + 30,
    });

    expect(
      getSlotSelectionRange({
        anchorMinute: 16 * 60,
        pointerMinute: 16 * 60,
        stepMinutes: 30,
        minimumMinutes: 60,
        openMinute: 9 * 60,
        closeMinute: 17 * 60,
      }),
    ).toEqual({ startMinute: 16 * 60, endMinute: 17 * 60 });
  });

  it("uses a non-midnight opening time as the creation snapping origin", async () => {
    const { getSlotSelectionRange } = await loadInteractions();
    const bounds = {
      stepMinutes: 30,
      minimumMinutes: 60,
      openMinute: 8 * 60 + 15,
      closeMinute: 19 * 60 + 45,
    };

    expect(
      getSlotSelectionRange({
        ...bounds,
        anchorMinute: 8 * 60 + 19,
        pointerMinute: 9 * 60 + 38,
      }),
    ).toEqual({ startMinute: 8 * 60 + 15, endMinute: 9 * 60 + 45 });

    expect(
      getSlotSelectionRange({
        ...bounds,
        anchorMinute: 19 * 60 + 38,
        pointerMinute: 19 * 60 + 44,
      }),
    ).toEqual({ startMinute: 18 * 60 + 45, endMinute: 19 * 60 + 45 });
  });

  it("preserves direction when a short drag expands to the minimum duration", async () => {
    const { getSlotSelectionRange } = await loadInteractions();

    expect(
      getSlotSelectionRange({
        anchorMinute: 10 * 60,
        pointerMinute: 9 * 60 + 30,
        stepMinutes: 30,
        minimumMinutes: 60,
        openMinute: 8 * 60,
        closeMinute: 20 * 60,
      }),
    ).toEqual({ startMinute: 9 * 60, endMinute: 10 * 60 });
  });

  it("limits long forward and backward drags to the configured maximum", async () => {
    const { getSlotSelectionRange } = await loadInteractions();
    const bounds = {
      stepMinutes: 30,
      minimumMinutes: 60,
      maximumMinutes: 180,
      openMinute: 8 * 60,
      closeMinute: 20 * 60,
    };

    expect(
      getSlotSelectionRange({
        ...bounds,
        anchorMinute: 9 * 60,
        pointerMinute: 16 * 60,
      }),
    ).toEqual({ startMinute: 9 * 60, endMinute: 12 * 60 });

    expect(
      getSlotSelectionRange({
        ...bounds,
        anchorMinute: 16 * 60,
        pointerMinute: 9 * 60,
      }),
    ).toEqual({ startMinute: 13 * 60, endMinute: 16 * 60 });
  });

  it("rejects windows shorter than the minimum and clamps a range to closing", async () => {
    const { getSlotSelectionRange } = await loadInteractions();

    expect(
      getSlotSelectionRange({
        anchorMinute: 10 * 60,
        pointerMinute: 10 * 60,
        stepMinutes: 30,
        minimumMinutes: 60,
        openMinute: 10 * 60,
        closeMinute: 10 * 60 + 30,
      }),
    ).toBeNull();

    expect(
      getSlotSelectionRange({
        anchorMinute: 0,
        pointerMinute: 0,
        stepMinutes: 30,
        minimumMinutes: 60,
        openMinute: 0,
        closeMinute: 0,
      }),
    ).toBeNull();

    expect(
      getSlotSelectionRange({
        anchorMinute: 16 * 60 + 31,
        pointerMinute: 18 * 60,
        stepMinutes: 30,
        minimumMinutes: 60,
        openMinute: 9 * 60,
        closeMinute: 17 * 60,
      }),
    ).toEqual({ startMinute: 16 * 60, endMinute: 17 * 60 });
  });

  it("resizes either edge to an absolute snapped pointer minute", async () => {
    const { getResizedSlotSelectionRange } = await loadInteractions();
    const bounds = {
      stepMinutes: 30,
      minimumMinutes: 60,
      openMinute: 8 * 60,
      closeMinute: 20 * 60,
    };

    expect(
      getResizedSlotSelectionRange({
        ...bounds,
        startMinute: 9 * 60,
        endMinute: 11 * 60,
        edge: "start",
        pointerMinute: 9 * 60 + 46,
      }),
    ).toEqual({ startMinute: 10 * 60, endMinute: 11 * 60 });

    expect(
      getResizedSlotSelectionRange({
        ...bounds,
        startMinute: 9 * 60,
        endMinute: 11 * 60,
        edge: "end",
        pointerMinute: 12 * 60 + 44,
      }),
    ).toEqual({ startMinute: 9 * 60, endMinute: 12 * 60 + 30 });
  });

  it("applies relative deltas for keyboard resizing", async () => {
    const { getResizedSlotSelectionRange } = await loadInteractions();
    const range = {
      startMinute: 9 * 60,
      endMinute: 11 * 60,
      stepMinutes: 30,
      minimumMinutes: 60,
      openMinute: 8 * 60,
      closeMinute: 20 * 60,
    };

    expect(
      getResizedSlotSelectionRange({
        ...range,
        edge: "start",
        deltaMinutes: -30,
      }),
    ).toEqual({ startMinute: 8 * 60 + 30, endMinute: 11 * 60 });

    expect(
      getResizedSlotSelectionRange({
        ...range,
        edge: "end",
        deltaMinutes: 30,
      }),
    ).toEqual({ startMinute: 9 * 60, endMinute: 11 * 60 + 30 });
  });

  it.each([
    {
      edge: "start",
      deltaMinutes: -30,
      expected: { startMinute: 9 * 60, endMinute: 11 * 60 },
    },
    {
      edge: "end",
      deltaMinutes: 30,
      expected: { startMinute: 9 * 60 + 30, endMinute: 11 * 60 + 30 },
    },
  ])(
    "normalizes an off-grid booking before a relative $edge resize",
    async ({ edge, deltaMinutes, expected }) => {
      const { getResizedSlotSelectionRange } = await loadInteractions();

      expect(
        getResizedSlotSelectionRange({
          startMinute: 9 * 60 + 15,
          endMinute: 10 * 60 + 45,
          stepMinutes: 30,
          minimumMinutes: 60,
          openMinute: 6 * 60,
          closeMinute: 20 * 60,
          edge,
          deltaMinutes,
        }),
      ).toEqual(expected);
    },
  );

  it.each([
    {
      edge: "start",
      pointerMinute: 8 * 60 + 44,
      expected: { startMinute: 8 * 60 + 30, endMinute: 11 * 60 },
    },
    {
      edge: "end",
      pointerMinute: 11 * 60 + 16,
      expected: { startMinute: 9 * 60 + 30, endMinute: 11 * 60 + 30 },
    },
  ])(
    "normalizes the opposite endpoint of an off-grid booking for a pointer $edge resize",
    async ({ edge, pointerMinute, expected }) => {
      const { getResizedSlotSelectionRange } = await loadInteractions();

      expect(
        getResizedSlotSelectionRange({
          startMinute: 9 * 60 + 15,
          endMinute: 10 * 60 + 45,
          stepMinutes: 30,
          minimumMinutes: 60,
          openMinute: 6 * 60,
          closeMinute: 20 * 60,
          edge,
          pointerMinute,
        }),
      ).toEqual(expected);
    },
  );

  it.each([
    {
      edge: "start",
      input: "relative",
      deltaMinutes: -30,
      expected: { startMinute: 9 * 60 + 15, endMinute: 11 * 60 + 15 },
    },
    {
      edge: "end",
      input: "relative",
      deltaMinutes: 30,
      expected: { startMinute: 9 * 60 + 45, endMinute: 11 * 60 + 45 },
    },
    {
      edge: "start",
      input: "pointer",
      pointerMinute: 8 * 60 + 49,
      expected: { startMinute: 8 * 60 + 45, endMinute: 11 * 60 + 15 },
    },
    {
      edge: "end",
      input: "pointer",
      pointerMinute: 11 * 60 + 49,
      expected: { startMinute: 9 * 60 + 45, endMinute: 11 * 60 + 45 },
    },
  ])(
    "uses the opening-relative grid for an off-grid $input $edge resize",
    async ({ edge, deltaMinutes, pointerMinute, expected }) => {
      const { getResizedSlotSelectionRange } = await loadInteractions();

      expect(
        getResizedSlotSelectionRange({
          startMinute: 9 * 60 + 30,
          endMinute: 11 * 60,
          stepMinutes: 30,
          minimumMinutes: 60,
          openMinute: 8 * 60 + 15,
          closeMinute: 19 * 60 + 45,
          edge,
          deltaMinutes,
          pointerMinute,
        }),
      ).toEqual(expected);
    },
  );

  it.each([
    {
      edge: "start",
      limit: "opening",
      pointerMinute: 6 * 60,
      expected: { startMinute: 8 * 60, endMinute: 11 * 60 },
    },
    {
      edge: "end",
      limit: "closing",
      pointerMinute: 14 * 60,
      expected: { startMinute: 9 * 60 + 30, endMinute: 12 * 60 },
    },
    {
      edge: "start",
      limit: "minimum",
      pointerMinute: 12 * 60,
      expected: { startMinute: 10 * 60, endMinute: 11 * 60 },
    },
    {
      edge: "end",
      limit: "minimum",
      pointerMinute: 8 * 60,
      expected: { startMinute: 9 * 60 + 30, endMinute: 10 * 60 + 30 },
    },
    {
      edge: "start",
      limit: "maximum",
      pointerMinute: 6 * 60,
      maximumMinutes: 120,
      expected: { startMinute: 9 * 60, endMinute: 11 * 60 },
    },
    {
      edge: "end",
      limit: "maximum",
      pointerMinute: 14 * 60,
      maximumMinutes: 120,
      expected: { startMinute: 9 * 60 + 30, endMinute: 11 * 60 + 30 },
    },
  ])(
    "respects the $limit limit when normalizing an off-grid $edge resize",
    async ({ edge, pointerMinute, maximumMinutes, expected }) => {
      const { getResizedSlotSelectionRange } = await loadInteractions();

      expect(
        getResizedSlotSelectionRange({
          startMinute: 9 * 60 + 15,
          endMinute: 10 * 60 + 45,
          stepMinutes: 30,
          minimumMinutes: 60,
          openMinute: 8 * 60,
          closeMinute: 12 * 60,
          edge,
          pointerMinute,
          maximumMinutes,
        }),
      ).toEqual(expected);
    },
  );

  it("resizes both edges by pointer on an opening-relative grid", async () => {
    const { getResizedSlotSelectionRange } = await loadInteractions();
    const bounds = {
      stepMinutes: 30,
      minimumMinutes: 60,
      openMinute: 8 * 60 + 15,
      closeMinute: 19 * 60 + 45,
    };

    expect(
      getResizedSlotSelectionRange({
        ...bounds,
        startMinute: 9 * 60 + 15,
        endMinute: 10 * 60 + 45,
        edge: "start",
        pointerMinute: 8 * 60 + 18,
      }),
    ).toEqual({
      startMinute: 8 * 60 + 15,
      endMinute: 10 * 60 + 45,
    });

    expect(
      getResizedSlotSelectionRange({
        ...bounds,
        startMinute: 17 * 60 + 15,
        endMinute: 18 * 60 + 15,
        edge: "end",
        pointerMinute: 19 * 60 + 42,
      }),
    ).toEqual({
      startMinute: 17 * 60 + 15,
      endMinute: 19 * 60 + 45,
    });
  });

  it("repeatedly resizes both edges by keyboard near offset boundaries", async () => {
    const { getResizedSlotSelectionRange } = await loadInteractions();
    const bounds = {
      stepMinutes: 30,
      minimumMinutes: 60,
      openMinute: 8 * 60 + 15,
      closeMinute: 19 * 60 + 45,
    };

    const startExpanded = getResizedSlotSelectionRange({
      ...bounds,
      startMinute: 8 * 60 + 45,
      endMinute: 10 * 60 + 15,
      edge: "start",
      deltaMinutes: -30,
    });
    expect(startExpanded).toEqual({
      startMinute: 8 * 60 + 15,
      endMinute: 10 * 60 + 15,
    });
    expect(
      getResizedSlotSelectionRange({
        ...bounds,
        ...startExpanded,
        edge: "start",
        deltaMinutes: -30,
      }),
    ).toEqual(startExpanded);

    const endExpanded = getResizedSlotSelectionRange({
      ...bounds,
      startMinute: 17 * 60 + 45,
      endMinute: 19 * 60 + 15,
      edge: "end",
      deltaMinutes: 30,
    });
    expect(endExpanded).toEqual({
      startMinute: 17 * 60 + 45,
      endMinute: 19 * 60 + 45,
    });
    expect(
      getResizedSlotSelectionRange({
        ...bounds,
        ...endExpanded,
        edge: "end",
        deltaMinutes: 30,
      }),
    ).toEqual(endExpanded);
  });

  it("clamps resized edges to opening, closing, minimum, and maximum limits", async () => {
    const { getResizedSlotSelectionRange } = await loadInteractions();
    const bounds = {
      startMinute: 9 * 60,
      endMinute: 11 * 60,
      stepMinutes: 30,
      minimumMinutes: 60,
      maximumMinutes: 180,
      openMinute: 8 * 60,
      closeMinute: 12 * 60,
    };

    expect(
      getResizedSlotSelectionRange({
        ...bounds,
        edge: "start",
        pointerMinute: 6 * 60,
      }),
    ).toEqual({ startMinute: 8 * 60, endMinute: 11 * 60 });
    expect(
      getResizedSlotSelectionRange({
        ...bounds,
        edge: "start",
        pointerMinute: 10 * 60 + 50,
      }),
    ).toEqual({ startMinute: 10 * 60, endMinute: 11 * 60 });
    expect(
      getResizedSlotSelectionRange({
        ...bounds,
        edge: "end",
        pointerMinute: 15 * 60,
      }),
    ).toEqual({ startMinute: 9 * 60, endMinute: 12 * 60 });
    expect(
      getResizedSlotSelectionRange({
        ...bounds,
        edge: "end",
        pointerMinute: 9 * 60 + 10,
      }),
    ).toEqual({ startMinute: 9 * 60, endMinute: 10 * 60 });
  });

  it("normalizes resize limits to the configured step", async () => {
    const { getResizedSlotSelectionRange } = await loadInteractions();
    const range = {
      startMinute: 9 * 60,
      endMinute: 10 * 60,
      stepMinutes: 15,
      minimumMinutes: 50,
      maximumMinutes: 100,
      openMinute: 8 * 60,
      closeMinute: 20 * 60,
      edge: "end",
    };

    expect(
      getResizedSlotSelectionRange({
        ...range,
        pointerMinute: 9 * 60 + 20,
      }),
    ).toEqual({ startMinute: 9 * 60, endMinute: 10 * 60 });
    expect(
      getResizedSlotSelectionRange({
        ...range,
        pointerMinute: 14 * 60,
      }),
    ).toEqual({ startMinute: 9 * 60, endMinute: 10 * 60 + 30 });
  });

  it("rejects invalid resize edges and opening windows", async () => {
    const { getResizedSlotSelectionRange } = await loadInteractions();
    const range = {
      startMinute: 9 * 60,
      endMinute: 10 * 60,
      stepMinutes: 30,
      minimumMinutes: 60,
      openMinute: 9 * 60,
      closeMinute: 17 * 60,
    };

    expect(
      getResizedSlotSelectionRange({ ...range, edge: "middle" }),
    ).toBeNull();
    expect(
      getResizedSlotSelectionRange({
        ...range,
        edge: "end",
        openMinute: 9 * 60,
        closeMinute: 9 * 60 + 30,
      }),
    ).toBeNull();
  });

  it("prefers now on today and the first event on other dates", async () => {
    const { getInitialScrollMinute } = await loadInteractions();
    const calendarBounds = {
      openingMinute: 8 * 60,
      closingMinute: 20 * 60,
    };

    expect(
      getInitialScrollMinute({
        ...calendarBounds,
        isToday: true,
        nowMinute: 10 * 60 + 30,
        eventMinutes: [14 * 60],
        leadMinutes: 90,
      }),
    ).toBe(9 * 60);

    expect(
      getInitialScrollMinute({
        ...calendarBounds,
        isToday: false,
        nowMinute: 10 * 60 + 30,
        eventMinutes: [10 * 60],
        leadMinutes: 60,
      }),
    ).toBe(9 * 60);
  });

  it("falls back to and clamps within the calendar start and end", async () => {
    const { getInitialScrollMinute } = await loadInteractions();
    const calendarBounds = {
      openingMinute: 8 * 60,
      closingMinute: 20 * 60,
      isToday: false,
      nowMinute: null,
      leadMinutes: 60,
    };

    expect(
      getInitialScrollMinute({
        ...calendarBounds,
        eventMinutes: [],
      }),
    ).toBe(8 * 60);
    expect(
      getInitialScrollMinute({
        ...calendarBounds,
        eventMinutes: [8 * 60 + 15],
      }),
    ).toBe(8 * 60);
    expect(
      getInitialScrollMinute({
        ...calendarBounds,
        eventMinutes: [22 * 60],
      }),
    ).toBe(20 * 60);
  });
});
