import { describe, expect, it } from "vitest";

import { readinessChecks, readinessScore } from "@/lib/readiness";

describe("grooming readiness", () => {
  it("recognizes the core context needed for a grooming discussion", () => {
    const item = {
      description:
        "Explain the behavior in enough detail.\n\n### Acceptance criteria\n- It works",
      assigneeName: "Ari",
      projectName: "Reliability",
    };
    expect(readinessScore(item)).toEqual({ ready: 4, total: 4 });
    expect(readinessChecks(item).every((check) => check.ready)).toBe(true);
  });

  it("surfaces missing details without blocking estimation", () => {
    const checks = readinessChecks({
      description: "Too short",
      assigneeName: null,
      projectName: null,
    });
    expect(checks.filter((check) => !check.ready).map((check) => check.id)).toEqual([
      "description",
      "acceptance-criteria",
      "owner",
      "project",
    ]);
  });
});
