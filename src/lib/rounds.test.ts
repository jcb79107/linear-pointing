import { describe, expect, it } from "vitest";

import {
  canFacilitate,
  canVote,
  majorityVote,
  nextPendingItemId,
  publicVoteValue,
  shouldAutoReveal,
} from "@/lib/rounds";

describe("round behavior", () => {
  it("reveals only after every snapshotted voter submits", () => {
    expect(shouldAutoReveal(["a", "b"], ["a"])).toBe(false);
    expect(shouldAutoReveal(["a", "b"], ["b", "a", "late"])).toBe(true);
    expect(shouldAutoReveal([], [])).toBe(false);
  });

  it("does not expose a vote while the round is voting", () => {
    expect(publicVoteValue("voting", 8)).toBeNull();
    expect(publicVoteValue("revealed", 8)).toBe(8);
    expect(publicVoteValue("finalized", 4)).toBe(4);
  });

  it("enforces voter snapshots and facilitator permissions", () => {
    expect(canVote("member", ["member"], "voting")).toBe(true);
    expect(canVote("late", ["member"], "voting")).toBe(false);
    expect(canVote("member", ["member"], "revealed")).toBe(false);
    expect(canFacilitate("facilitator")).toBe(true);
    expect(canFacilitate("voter")).toBe(false);
  });

  it("recommends the most common vote and resolves ties upward", () => {
    expect(majorityVote([1, 2, 2, 3])).toBe(2);
    expect(majorityVote([1, 1, 3, 3])).toBe(3);
    expect(majorityVote([])).toBeNull();
  });

  it("advances by queue position and ignores skipped work", () => {
    const queue = [
      { id: "third", position: 2, status: "pending" as const },
      { id: "first", position: 0, status: "active" as const },
      { id: "second", position: 1, status: "skipped" as const },
    ];
    expect(nextPendingItemId(queue, "first")).toBe("third");
    expect(nextPendingItemId(queue, "third")).toBeNull();
  });
});
