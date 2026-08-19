import { describe, expect, it } from "vitest";

import { accumulatedElapsedSeconds } from "@/lib/timing";

describe("grooming timers", () => {
  it("adds the current active interval to previously accumulated time", () => {
    expect(
      accumulatedElapsedSeconds(
        30,
        "2026-08-19T12:00:00.000Z",
        Date.parse("2026-08-19T12:01:15.000Z"),
      ),
    ).toBe(105);
  });

  it("keeps paused time stable and ignores invalid or future starts", () => {
    expect(accumulatedElapsedSeconds(42, null, Date.now())).toBe(42);
    expect(accumulatedElapsedSeconds(42, "invalid", Date.now())).toBe(42);
    expect(
      accumulatedElapsedSeconds(
        42,
        "2026-08-19T12:01:00.000Z",
        Date.parse("2026-08-19T12:00:00.000Z"),
      ),
    ).toBe(42);
  });
});
