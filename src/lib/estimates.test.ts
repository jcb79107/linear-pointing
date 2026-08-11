import { describe, expect, it } from "vitest";

import {
  isFinalizableEstimate,
  POINTING_CARDS,
  voteLabel,
} from "@/lib/estimates";

describe("pointing scale", () => {
  it("uses the exact internal pointing scale", () => {
    expect(POINTING_CARDS).toEqual([
      { value: 0, label: "0" },
      { value: 1, label: "1" },
      { value: 2, label: "2" },
      { value: 3, label: "3" },
      { value: 4, label: "4" },
    ]);
    expect(isFinalizableEstimate(4, POINTING_CARDS)).toBe(true);
    expect(isFinalizableEstimate(5, POINTING_CARDS)).toBe(false);
    expect(voteLabel(0, POINTING_CARDS)).toBe("0");
  });
});
