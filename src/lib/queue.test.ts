import { describe, expect, it } from "vitest";

import {
  canAddQueueItems,
  canClearQueue,
  queueItemRemovalError,
} from "@/lib/queue";

describe("live queue editing", () => {
  it("allows tickets to be added to draft and live sessions", () => {
    expect(canAddQueueItems("draft")).toBe(true);
    expect(canAddQueueItems("live")).toBe(true);
    expect(canAddQueueItems("ended")).toBe(false);
  });

  it("only allows an entire agenda to be cleared while drafting", () => {
    expect(canClearQueue("draft")).toBe(true);
    expect(canClearQueue("live")).toBe(false);
    expect(canClearQueue("ended")).toBe(false);
  });

  it("allows pending and skipped tickets to be removed while live", () => {
    expect(queueItemRemovalError("live", "pending")).toBeNull();
    expect(queueItemRemovalError("live", "skipped")).toBeNull();
  });

  it("protects the active ticket and completed history", () => {
    expect(queueItemRemovalError("live", "active")).toBe(
      "The active ticket cannot be removed",
    );
    expect(queueItemRemovalError("live", "estimated")).toBe(
      "Completed tickets stay in the session history",
    );
  });

  it("does not allow ended sessions to change", () => {
    expect(queueItemRemovalError("ended", "pending")).toBe(
      "Ended sessions cannot be changed",
    );
  });
});
