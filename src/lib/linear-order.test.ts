import { describe, expect, it } from "vitest";

import {
  findUpcomingLinearCycle,
  sortByLinearManualOrder,
} from "@/lib/linear-order";

describe("Linear manual ordering", () => {
  it("returns issues in ascending Linear sort order without mutating input", () => {
    const issues = [
      { id: "third", sortOrder: 30 },
      { id: "first", sortOrder: 10 },
      { id: "second", sortOrder: 20 },
    ];

    expect(sortByLinearManualOrder(issues).map((issue) => issue.id)).toEqual([
      "first",
      "second",
      "third",
    ]);
    expect(issues.map((issue) => issue.id)).toEqual([
      "third",
      "first",
      "second",
    ]);
  });
});

describe("upcoming Linear cycle selection", () => {
  it("prefers the cycle explicitly marked next by Linear", () => {
    const upcoming = findUpcomingLinearCycle(
      [
        {
          id: "later",
          isNext: false,
          number: 9,
          startsAt: new Date("2026-09-01T00:00:00Z"),
        },
        {
          id: "next",
          isNext: true,
          name: "Cycle 8",
          number: 8,
          startsAt: new Date("2026-08-18T00:00:00Z"),
        },
      ],
      new Date("2026-08-11T00:00:00Z"),
    );

    expect(upcoming).toEqual({ id: "next", name: "Cycle 8", number: 8 });
  });

  it("falls back to the nearest future cycle when isNext is unavailable", () => {
    const upcoming = findUpcomingLinearCycle(
      [
        {
          id: "far",
          isNext: false,
          number: 10,
          startsAt: new Date("2026-09-15T00:00:00Z"),
        },
        {
          id: "near",
          isNext: false,
          number: 9,
          startsAt: new Date("2026-08-20T00:00:00Z"),
        },
      ],
      new Date("2026-08-11T00:00:00Z"),
    );

    expect(upcoming).toEqual({ id: "near", name: "Cycle 9", number: 9 });
  });

  it("returns null when there is no upcoming cycle", () => {
    expect(
      findUpcomingLinearCycle(
        [
          {
            id: "past",
            isNext: false,
            number: 7,
            startsAt: new Date("2026-07-01T00:00:00Z"),
          },
        ],
        new Date("2026-08-11T00:00:00Z"),
      ),
    ).toBeNull();
  });
});
