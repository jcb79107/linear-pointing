import { describe, expect, it } from "vitest";
import { DEFAULT_USER_SETTINGS, parseUserSettings } from "@/lib/preferences";
import { linearTeamEstimateCards } from "@/lib/estimates";
describe("MVP inherited settings", () => {
  it("normalizes obsolete saved deck overrides without losing voting preferences", () => {
    const result = parseUserSettings({ ...DEFAULT_USER_SETTINGS, pointingPreset: "custom", customPointValues: [0, 42], autoReveal: false, defaultSort: "custom" });
    expect(result.pointingPreset).toBe("linear-team"); expect(result.autoReveal).toBe(false); expect(result.defaultSort).toBe("linear");
    expect(DEFAULT_USER_SETTINGS.cycleScope).toBe("any");
  });
  it.each([
    ["linear", [1,2,3,4,5], [6,7]], ["fibonacci", [1,2,3,5,8], [13,21]], ["exponential", [1,2,4,8,16], [32,64]],
  ] as const)("inherits %s zero and extended settings", (type, base, extension) => {
    const team = { id: "team", key: "T", name: "Team", issueEstimationType: type, issueEstimationAllowZero: false, issueEstimationExtended: false };
    expect(linearTeamEstimateCards(team).map((card) => card.value)).toEqual(base);
    expect(linearTeamEstimateCards({ ...team, issueEstimationAllowZero: true, issueEstimationExtended: true }).map((card) => card.value)).toEqual([0, ...base, ...extension]);
  });
  it("preserves T-shirt labels and numeric Linear values", () => {
    expect(linearTeamEstimateCards({ id: "team", key: "T", name: "Team", issueEstimationType: "tShirt", issueEstimationAllowZero: true, issueEstimationExtended: true })).toEqual([
      { value: 0, label: "0" }, { value: 1, label: "XS" }, { value: 2, label: "S" }, { value: 3, label: "M" }, { value: 5, label: "L" }, { value: 8, label: "XL" }, { value: 13, label: "XXL" }, { value: 21, label: "XXXL" },
    ]);
  });
});
