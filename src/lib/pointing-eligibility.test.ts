import { describe, expect, it } from "vitest";

import {
  isPointableLinearIssue,
  pointingEligibilityError,
} from "@/lib/pointing-eligibility";

describe("pointing eligibility", () => {
  it("includes unestimated Todo issues", () => {
    expect(
      isPointableLinearIssue({ estimate: null, stateType: "unstarted" }),
    ).toBe(true);
  });

  it("excludes backlog issues", () => {
    expect(
      isPointableLinearIssue({ estimate: null, stateType: "backlog" }),
    ).toBe(false);
  });

  it("excludes Todo issues that already have an estimate, including zero", () => {
    expect(
      isPointableLinearIssue({ estimate: 0, stateType: "unstarted" }),
    ).toBe(false);
    expect(
      isPointableLinearIssue({ estimate: 3, stateType: "unstarted" }),
    ).toBe(false);
  });

  it("excludes issues in active or completed workflow categories", () => {
    expect(
      isPointableLinearIssue({ estimate: null, stateType: "started" }),
    ).toBe(false);
    expect(
      isPointableLinearIssue({ estimate: null, stateType: "completed" }),
    ).toBe(false);
  });

  it("explains why a ticket cannot be pointed", () => {
    expect(
      pointingEligibilityError(
        { estimate: null, stateType: "backlog" },
        "KEY-123",
      ),
    ).toBe("KEY-123 is not in one of the selected Linear statuses");
    expect(
      pointingEligibilityError(
        { estimate: 2, stateType: "unstarted" },
        "KEY-456",
      ),
    ).toBe("KEY-456 already has points in Linear");
  });

  it("supports broader saved intake policies", () => {
    expect(
      isPointableLinearIssue(
        { estimate: 3, stateType: "started" },
        { stateTypes: ["unstarted", "started"], estimateScope: "any" },
      ),
    ).toBe(true);
    expect(
      isPointableLinearIssue(
        { estimate: null, stateType: "backlog" },
        { stateTypes: ["backlog"], estimateScope: "estimated" },
      ),
    ).toBe(false);
  });
});
