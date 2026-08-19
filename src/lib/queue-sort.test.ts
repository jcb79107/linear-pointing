import { describe, expect, it } from "vitest";

import type { SessionQueueItem } from "@/lib/domain";
import { sortQueueItems } from "@/lib/queue-sort";

function item(
  identifier: string,
  overrides: Partial<SessionQueueItem> = {},
): SessionQueueItem {
  return {
    id: identifier,
    linearIssueId: identifier,
    identifier,
    title: identifier,
    description: null,
    url: "https://linear.app",
    priorityLabel: null,
    priority: 0,
    linearSortOrder: 0,
    stateName: "Todo",
    assigneeName: null,
    projectName: null,
    labels: [],
    subIssues: [],
    attachments: [],
    position: 0,
    status: "pending",
    currentEstimate: null,
    finalEstimate: null,
    groomingOutcome: null,
    groomingNote: null,
    decidedAt: null,
    activeStartedAt: null,
    elapsedSeconds: 0,
    linearCreatedAt: null,
    linearUpdatedAt: null,
    dueDate: null,
    ...overrides,
  };
}

describe("agenda sorting", () => {
  it("applies Linear and priority presets without mutating the queue", () => {
    const queue = [
      item("ENG-30", { priority: 0, linearSortOrder: 30 }),
      item("ENG-20", { priority: 2, linearSortOrder: 20 }),
      item("ENG-10", { priority: 1, linearSortOrder: 10 }),
    ];

    expect(sortQueueItems(queue, "linear").map((entry) => entry.identifier)).toEqual([
      "ENG-10",
      "ENG-20",
      "ENG-30",
    ]);
    expect(sortQueueItems(queue, "priority").map((entry) => entry.identifier)).toEqual([
      "ENG-10",
      "ENG-20",
      "ENG-30",
    ]);
    expect(queue[0].identifier).toBe("ENG-30");
  });

  it("uses custom rules as ordered tie-breakers", () => {
    const queue = [
      item("ENG-2", { title: "Beta", priority: 2 }),
      item("ENG-1", { title: "Alpha", priority: 2 }),
      item("ENG-3", { title: "Gamma", priority: 1 }),
    ];
    expect(
      sortQueueItems(queue, "custom", [
        { field: "priority", direction: "asc" },
        { field: "title", direction: "desc" },
      ]).map((entry) => entry.identifier),
    ).toEqual(["ENG-3", "ENG-2", "ENG-1"]);
  });

  it("keeps missing values last in either direction", () => {
    const queue = [
      item("ENG-1", { linearUpdatedAt: null }),
      item("ENG-2", { linearUpdatedAt: "2026-01-01T00:00:00.000Z" }),
      item("ENG-3", { linearUpdatedAt: "2026-02-01T00:00:00.000Z" }),
    ];
    expect(sortQueueItems(queue, "updated").map((entry) => entry.identifier)).toEqual([
      "ENG-3",
      "ENG-2",
      "ENG-1",
    ]);
  });
});
